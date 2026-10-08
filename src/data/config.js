/* 게임 설정 & 밸런스 공식 (바닐라 버전과 동일한 수치) */
window.RD = window.RD || {};

RD.W = 1080;                // 논리 해상도 (9:16 세로)
RD.H = 1920;
RD.TEXT_RES = Math.min(2, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));  // 텍스트 렌더 해상도 (선명도)
RD.FONT = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR','Noto Sans CJK KR','Gothic A1','Nanum Gothic',sans-serif";

RD.CONFIG = {
  enemyLimit: 80,        // 필드 위 적이 이 수에 도달하면 패배
  roundTime: 35,         // 라운드 길이(초)
  firstRoundDelay: 6,    // 게임 시작 후 1라운드까지 대기(초)
  bossEvery: 10,         // N 라운드마다 보스
  bossTime: 90,          // 보스 제한 시간(초)
  startGold: 100,       // 시작 골드 (처치 자원)
  startMineral: 0,      // 시작 광물 (채굴 자원)
  summonCost: 20,       // 소환 비용 (골드)
  spawnInterval: 0.6,    // 적 생성 간격(초)
  enemyBaseSpeed: 140,   // px/s
  mineMaxLevel: 30,      // 채굴 강화 최대 레벨
  showDamage: true,      // 데미지 숫자 표시
  maxFloats: 70,
};

// 배경 음악: 라운드(스테이지) 구간별 트랙. 구간 밖(46 라운드~)은 음악 없음 (추후 추가 예정)
//  라운드 0(시작 대기)은 첫 구간 음악을 사용. base 는 build.js 가 dist 용으로 '../' 를 붙임
RD.BGM_BASE = RD.BGM_BASE || '';
RD.BGM_TRACKS = [
  { from: 1,  to: 15, url: 'assets/audio/bgm1_neon_velocity.mp3' },
  { from: 16, to: 30, url: 'assets/audio/bgm2_neon_velocity2.mp3' },
  { from: 31, to: 45, url: 'assets/audio/bgm3_last_hope.mp3' },
];
RD.BGM_VOLUME = 0.5;
// 공격 효과음 전체 볼륨 (Web Audio, 0~1). 배경 음악이 잘 들리도록 낮게 유지
RD.SFX_VOLUME = 0.35;

/* ── 밸런스 공식 (라운드 r 기준) ─────────────────────────────────────────
 *  목표: 숙련 플레이어가 약 200 라운드까지 갈 수 있게. 숫자는 tools/balance_sim.js (실제 로직 + 숙련 봇)로 검증
 *   (봇 10판: 197~253R, 중앙값 약 220R → 사람은 200R 전후)
 *  1) 유닛 가치: Lv.0 = 소환 1회 = summonCost(20) 골드. 일반 LvN = Lv.0 3^N 개 (Lv.3 = 540골드, Lv.5 = 4,860골드)
 *     히든 = 레시피 재료 가치의 합 (RD.unitValue). 판매 = 가치 × 20 × 환급률(Lv.0~2 50%, Lv.3 35%, Lv.4 25%, Lv.5 18%, 히든 Lv.6+ 15%)
 *     타입 변경 = 판매가의 절반 (Lv.2 50, Lv.3 90, Lv.4 200, Lv.5 440 골드)
 *  2) 골드 수입: 라운드당 약 60 + 20r (처치 40마리 × (1 + r/4) + 라운드 보상 20 + 10r)
 *     → 누적 약 10r² 골드 (100R ≈ 10만 = Lv.5 20개분, 200R ≈ 40만). 72칸이 Lv.5·히든으로 차는 시점이 200R 전후
 *  3) 적 체력: 그 라운드 숙련 봇의 총 DPS(기준 DPS) × 압박도 × 라운드 시간 ÷ 마릿수
 *     → 플레이어가 강해지는 속도(소환·조합·강화)와 같은 속도로 적이 단단해지고, 150R 이후 압박도가 올라가 200R 전후에서 막힘
 *  기준 DPS: 숙련 봇이 라운드 r 에 갖는 총 DPS (적 체력 1 로 6판 평균, 유효숫자 2자리) [라운드, DPS]
 *   사이 라운드는 로그 보간, 마지막 기준점(230R) 이후는 마지막 구간의 증가율로 연장 */
RD.DPS_REF = [[1, 34], [5, 170], [10, 750], [15, 2200], [20, 4800], [25, 11000], [30, 17000], [35, 29000], [40, 50000],
  [45, 100000], [50, 190000], [55, 400000], [60, 730000], [65, 1.2e6], [70, 1.8e6], [80, 3.2e6], [90, 5.5e6], [100, 8.3e6],
  [110, 1.2e7], [120, 1.7e7], [130, 2.1e7], [140, 2.7e7], [150, 3.5e7], [160, 4.3e7], [170, 4.8e7], [180, 6.2e7],
  [190, 6.8e7], [200, 7.4e7], [210, 8.0e7], [220, 8.6e7], [230, 9.2e7]];
RD.dpsRef = r => {
  const T = RD.DPS_REF, n = T.length;
  let i = 1;
  while (i < n - 1 && T[i][0] < r) i++;
  const [r0, d0] = T[i - 1], [r1, d1] = T[i];
  return d0 * Math.pow(d1 / d0, (r - r0) / (r1 - r0));
};
RD.BAL = {
  // 적 체력: 라운드 r 의 적 전체 체력(마릿수 × 체력)을 roundTime 초에 녹이려면 기준 DPS × 압박도가 필요하도록 맞춤
  enemyHp:    r => Math.max(10, Math.floor(RD.BAL.pressure(r) * RD.dpsRef(r) * RD.CONFIG.roundTime / RD.BAL.spawnCount(r))),
  // 압박도: 기준 DPS 대비 요구 DPS 비율. 0.35(~20R, 초반은 여유) → 0.8(35R) 유지 → 1.2(150R) → 이후 라운드당 ×1.012 (200R ≈ 2.2)
  //  봇은 압박도 약 1.3(초중반)~2(200R 전후)까지 버팀 → 사람 숙련자는 200R 전후에서 막히도록
  pressure:   r => (Math.min(0.8, Math.max(0.35, 0.35 + 0.03 * (r - 20))) + 0.4 * Math.min(1, Math.max(0, (r - 60) / 90))) * Math.pow(1.012, Math.max(0, r - 150)),
  spawnCount: r => 20 + Math.min(20, Math.floor(r / 2)),
  bossHp:     r => RD.BAL.enemyHp(r) * 3,      // 보스는 단일 대상 + 90초 제한이라 일반 적 3마리분 (시뮬레이션상 일반 웨이브와 비슷한 난이도)
  killGold:   r => 1 + Math.floor(r / 4),
  roundGold:  r => 20 + 10 * r,
  bossGold:   r => 100 + 40 * r,
  upgradeCost: lv => 50 + 10 * lv,          // 타입 강화 비용 (광물) 50, 60, 70 …
  mineRate:    lv => 2 + 1.5 * lv,          // 초당 광물 채굴량
  mineCost:    lv => 40 + 40 * lv,          // 채굴 강화 비용 (골드)
  // 히든 강화 (광물): 300, 390, 510 … 레벨마다 ×1.3 으로 가파르게 오르는 대신 히든 유닛 공격력 +25%/레벨
  hiddenUpgradeCost: lv => Math.round(300 * Math.pow(1.3, lv) / 10) * 10,
  hiddenMult:  lv => 1 + 0.25 * lv,         // 히든 유닛 공격력 배율 (타입 강화와 별도로 곱해짐)
};

/* 자원 종류. 재화가 늘어나면 여기에 추가하고 GameLogic.canAfford / spend 로 다룬다.
 *  gold    : 적 처치·라운드 보상으로 획득 → 유닛 소환, 채굴 강화, 타입 변경
 *  mineral : 시간에 따라 자동 채굴 → 타입(워리어/아처/위저드) 강화, 히든 강화 */
RD.CURRENCIES = {
  gold:    { name: '골드', josa: '가', color: '#ffd54f', icon: 'coin' },
  mineral: { name: '광물', josa: '이', color: '#80d8ff', icon: 'mineral' },
};
// 행동별 사용 자원 (밸런스 조정 시 여기만 바꾸면 됨)
RD.COST_CURRENCY = { summon: 'gold', unitUpgrade: 'mineral', mineUpgrade: 'gold', typeChange: 'gold', hiddenUpgrade: 'mineral' };
