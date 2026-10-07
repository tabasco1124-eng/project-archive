/* 적 / 보스 데이터 테이블
 *  일반 적은 라운드마다 순환. shape: circle | square | triangle | diamond | hex
 *  hp / spd 는 기본값(RD.BAL.enemyHp, CONFIG.enemyBaseSpeed)에 곱하는 배율
 */
window.RD = window.RD || {};

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

RD.BOSSES = [
  { id:'ogre',      name:'오우거 족장', shape:'circle',   color:'#a1887f', size:48 },
  { id:'titan',     name:'기계 거신',   shape:'hex',      color:'#607d8b', size:48 },
  { id:'lich',      name:'리치 왕',     shape:'diamond',  color:'#b39ddb', size:50 },
  { id:'dragonlord',name:'드래곤 로드', shape:'triangle', color:'#e53935', size:52 },
  { id:'demon',     name:'개념 마왕',   shape:'square',   color:'#3a3a3a', size:48 },
];
