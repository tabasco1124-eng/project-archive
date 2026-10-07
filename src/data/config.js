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

// 밸런스 공식 (라운드 r 기준)
RD.BAL = {
  enemyHp:    r => Math.floor(24 * Math.pow(1.25, r - 1) + 12 * r),
  spawnCount: r => 20 + Math.min(20, Math.floor(r / 2)),
  bossHp:     r => RD.BAL.enemyHp(r) * 15,
  killGold:   r => 1 + Math.floor(r / 5),
  roundGold:  r => 20 + 4 * r,
  bossGold:   r => 100 + 20 * r,
  upgradeCost: lv => 50 + 10 * lv,          // 타입 강화 비용 (광물) 50, 60, 70 …
  mineRate:    lv => 2 + 1.5 * lv,          // 초당 광물 채굴량
  mineCost:    lv => 40 + 40 * lv,          // 채굴 강화 비용 (골드)
};

/* 자원 종류. 재화가 늘어나면 여기에 추가하고 GameLogic.canAfford / spend 로 다룬다.
 *  gold    : 적 처치·라운드 보상으로 획득 → 유닛 소환, 채굴 강화
 *  mineral : 시간에 따라 자동 채굴 → 타입(워리어/아처/위저드) 강화 */
RD.CURRENCIES = {
  gold:    { name: '골드', josa: '가', color: '#ffd54f', icon: 'coin' },
  mineral: { name: '광물', josa: '이', color: '#80d8ff', icon: 'mineral' },
};
// 행동별 사용 자원 (밸런스 조정 시 여기만 바꾸면 됨)
RD.COST_CURRENCY = { summon: 'gold', unitUpgrade: 'mineral', mineUpgrade: 'gold' };
