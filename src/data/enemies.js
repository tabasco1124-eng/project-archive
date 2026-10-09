/* 적 / 보스 데이터 테이블
 *  일반 적은 라운드마다 순환. shape: circle | square | triangle | diamond | hex
 *  hp / spd 는 기본값(RD.BAL.enemyHp, CONFIG.enemyBaseSpeed)에 곱하는 배율
 */
window.RD = window.RD || {};

/* ── 적 타입 (상성) ──
 *  라운드마다 한 타입만 나옴: 1R 장갑형 → 2R 기동형 → 3R 데이터형 → 4R 장갑형 … (보스도 같은 순환)
 *  유닛 타입별 배율 RD.TYPE_MULT: 각 유닛 타입은 한 적 타입에 강함(×1.6), 하나에 보통(×1.0), 하나에 약함(×0.5)
 *   워리어: 기동형 강 · 데이터형 보통 · 장갑형 약
 *   아처:   장갑형 강 · 기동형 보통 · 데이터형 약
 *   위저드: 데이터형 강 · 장갑형 보통 · 기동형 약
 *  Lv.0(타입 없음)과 히든 유닛은 모든 적에게 ×1.0 (히든은 여러 타입을 섞은 유닛이라 상성을 타지 않음)
 *  세 타입을 고르게 키우면 평균 배율 ≈ 1.03 ((1.6+1+0.5)/3) → 기준 DPS(config.js) 그대로 유지. tools/balance_sim.js 로 검증 */
RD.ENEMY_TYPES = {
  armor: { name: '장갑형',   short: '장갑', color: '#ff7043' },   // 방화벽 장갑 데이터
  swift: { name: '기동형',   short: '기동', color: '#ffee58' },   // 고속 침투 드론
  data:  { name: '데이터형', short: '데이터', color: '#40c4ff' }, // 바이러스 코드체
};
RD.ETYPE_KEYS = ['armor', 'swift', 'data'];
RD.roundEnemyType = r => RD.ETYPE_KEYS[(Math.max(1, r) - 1) % RD.ETYPE_KEYS.length];
RD.TYPE_MULT = {
  warrior: { swift: 1.6, data: 1.0, armor: 0.5 },
  archer:  { armor: 1.6, swift: 1.0, data: 0.5 },
  wizard:  { data: 1.6, armor: 1.0, swift: 0.5 },
};
// 유닛 타입 t 가 적 타입 et 에게 주는 데미지 배율
RD.typeMult = (t, et) => (t.hidden || !RD.TYPE_MULT[t.cat] || !et) ? 1 : RD.TYPE_MULT[t.cat][et];
// 이 유닛 타입이 강한 / 약한 적 타입
RD.strongVs = cat => RD.TYPE_MULT[cat] && RD.ETYPE_KEYS.find(k => RD.TYPE_MULT[cat][k] > 1);
RD.weakVs = cat => RD.TYPE_MULT[cat] && RD.ETYPE_KEYS.find(k => RD.TYPE_MULT[cat][k] < 1);

RD.ENEMIES = [
  { id:'slime',   name:'슬라임',   shape:'circle',   color:'#8bc34a', size:22, hp:1.0,  spd:1.0  },
  { id:'goblin',  name:'고블린',   shape:'triangle', color:'#cddc39', size:24, hp:0.9,  spd:1.15 },
  { id:'zombie',  name:'좀비',     shape:'square',   color:'#689f38', size:24, hp:1.2,  spd:0.85 },
  { id:'drone',   name:'정찰드론', shape:'diamond',  color:'#90a4ae', size:22, hp:0.8,  spd:1.35 },
  { id:'skeleton',name:'해골병사', shape:'circle',   color:'#e0e0e0', size:24, hp:1.0,  spd:1.0  },
  { id:'golem',   name:'돌골렘',   shape:'square',   color:'#8d6e63', size:28, hp:1.6,  spd:0.7  },
  { id:'bat',     name:'흡혈박쥐', shape:'triangle', color:'#9575cd', size:22, hp:0.75, spd:1.45 },
  { id:'robot',   name:'전투로봇', shape:'hex',      color:'#78909c', size:26, hp:1.3,  spd:0.9  },
  { id:'wisp',    name:'불꽃정령', shape:'diamond',  color:'#ff7043', size:24, hp:1.0,  spd:1.1  },
];

/* ── 이벤트 몬스터: 패킷 ──
 *  every 라운드마다(50, 100, 150 …) 그 라운드 웨이브와 함께 등장. 제한 시간 안에 처치하면 히든 유닛 지급
 *  - 적 수(패배 기준)에 안 들어가고, 못 잡아도 사라질 뿐 게임은 계속됨 ("패킷 전송 실패")
 *  - 타입 없음(모든 유닛 ×1.0), 감속·기절은 보스처럼 절반
 *  - 보상: 처치 순서대로 히든 Lv.5 → Lv.6 → Lv.7 (이후 계속 Lv.7), 그 레벨의 히든 유닛 중 무작위 + 골드
 *  - 체력 = 그 라운드 적 체력 × hpMul × 난이도 배율 (tools/balance_sim.js 로 처치율 검증) */
RD.PACKET = {
  every: 50, timeLimit: 300, hpMul: 40, speedMul: 1.7, rewardGrades: [5, 6, 7],
  goldMul: 3,   // 처치 골드 = 보스 골드 × goldMul
  type: { id: 'packet', name: '패킷', shape: 'hex', color: '#ff2bd6', size: 46 },
};

// 특별 보스: 라운드 번호 → 강화 설정 (그 라운드 보스에만 적용, 다른 보스는 그대로)
//  hpMul 체력 배율, extraTime 제한 시간 추가(초), bgm 등장~처치까지 나오는 곡,
//  rewardGrade 처치 보상 랜덤 유닛 레벨 (칸이 없으면 패킷 보상처럼 대기), lines 등장 멘트
RD.SPECIAL_BOSSES = {
  60: {
    hpMul: 1.2, extraTime: 10, bgm: 'assets/audio/boss60_jeonyul.mp3', rewardGrade: 4,
    lines: ['경고: 네메시스 방화벽 심층부 개방', '네메시스가 수문장을 직접 깨웠습니다. 전력을 다해 막으세요!'],
  },
};

RD.BOSSES = [
  { id:'ogre',      name:'오우거 족장', shape:'circle',   color:'#a1887f', size:48 },
  { id:'titan',     name:'기계 거신',   shape:'hex',      color:'#607d8b', size:48 },
  { id:'lich',      name:'리치 왕',     shape:'diamond',  color:'#b39ddb', size:50 },
  { id:'dragonlord',name:'드래곤 로드', shape:'triangle', color:'#e53935', size:52 },
  { id:'demon',     name:'개념 마왕',   shape:'square',   color:'#3a3a3a', size:48 },
];
