/* 레벨 / 타입 / 유닛 데이터 테이블  (스탯 출처: 랜덤 피라미드 디펜스 3.3 표)
 *  유닛 필드
 *   id, name(표시명), short(원 안 2글자), grade(레벨 0~8), cat(none|warrior|archer|wizard)
 *   dmg(기본 공격력), coef(타입 강화 1단계당 공격력 증가량 = dmg/5, Lv.0 은 0), spd(공격 간격 초), range(px), fx(공격 연출)
 *   조합 규칙 (일반 조합: 같은 유닛 3개)
 *     LvN ×3 → Lv.N+1 중 무작위 (모든 레벨에서 타입도 무작위: 워리어/아처/위저드 각 1/3). Lv.5 가 일반 유닛의 최고 레벨
 *   히든 유닛 (hidden: true, Lv.5~8): RD.RECIPES 의 정해진 재료 3개로만 만든다 (아래 '레거시 레시피')
 *     cat 은 주 타입(그 타입 강화 적용), 여기에 히든 강화 배율(RD.BAL.hiddenMult)이 추가로 곱해짐
 *   선택: sfx(공격 효과음 묶음 이름, 생략 시 fx 로 결정: src/core/sfx.js SETS), splash(광역 반경), slow(감속 비율 0~1), slowDur, stun(기절 확률), stunDur
 *         color(몸통색), pcolor(투사체/이펙트 색)
 *   fx: slash(근접, 즉시) | beam(레이저, 즉시) | lightning(번개, 즉시)
 *       arrow | bullet | orb | fire | holy | missile (투사체)
 */
window.RD = window.RD || {};

// sellRate: 판매 시 투자 골드 대비 환급 비율 (레벨이 높을수록 손해가 큼) → RD.sellPrice
//  Lv.6~8 은 히든 유닛 전용 레벨. 히든 유닛은 레벨과 관계없이 히든 색(무지개)으로 표시
RD.GRADES = [
  { name: 'Lv.0', color: '#c8c8c8', sellRate: 0.5 },
  { name: 'Lv.1', color: '#42a5f5', sellRate: 0.5 },
  { name: 'Lv.2', color: '#b05cff', sellRate: 0.5 },
  { name: 'Lv.3', color: '#ffa726', sellRate: 0.35 },
  { name: 'Lv.4', color: '#ff4d6d', sellRate: 0.25 },
  { name: 'Lv.5', color: '#2bffc6', sellRate: 0.18 },
  { name: 'Lv.6', color: '#ff6bf0', sellRate: 0.15 },
  { name: 'Lv.7', color: '#ff6bf0', sellRate: 0.15 },
  { name: 'Lv.8', color: '#ff6bf0', sellRate: 0.15 },
];
RD.MAX_NORMAL_GRADE = 5;          // 일반 조합으로 만들 수 있는 최고 레벨
RD.TYPE_CHANGE_MIN_GRADE = 2;     // 타입 변경이 가능한 최저 레벨
// 레거시(히든) 유닛을 그 레벨에서 이번 다이브 처음 얻을 때의 연출 (레벨별 슬롯, Lv.6·7 곡은 추후 추가)
//  bgm 한 번 재생 후 원래 곡으로 복귀 · 화면 진동 · theme 맵으로 바뀌었다가 곡이 끝나면 원래 맵 · 상단 멘트
RD.LEGACY_EVENTS = {
  5: { bgm: 'assets/audio/legacy5_jeonyul.mp3', theme: 'legacy5', maxSec: 200,
       title: '봉인 해제 · 인류의 레거시 각성', sub: '그랜드 아카이브 심층 기억이 전장을 다시 씁니다' },
};
RD.HIDDEN_COLOR = '#ff6bf0';      // 히든 유닛 대표 색 (글자 등 고정 색이 필요한 곳). 테두리·마법진은 무지개

RD.CATEGORIES = {
  none:    { name: '타입 없음', color: '#b0a8bd' },
  warrior: { name: '워리어', color: '#e8834a' },
  archer:  { name: '아처',   color: '#6cc04a' },
  wizard:  { name: '위저드', color: '#8c7bff' },
};
RD.CAT_KEYS = ['warrior', 'archer', 'wizard'];   // 강화 가능한 타입
// 자동 조합 버튼 순서 (UI 하단 열과 맞춤: 워리어/아처/위저드 강화 위, Lv.0 은 채굴 위)
RD.AUTO_KEYS = ['warrior', 'archer', 'wizard', 'none'];
RD.AUTO_CATS = {
  warrior: { name: '워리어' }, archer: { name: '아처' }, wizard: { name: '위저드' },
  none:    { name: 'Lv.0' },
};

// 공격 속도 표기 → 공격 간격(초)
RD.ATK_SPEED = { 매우느림: 2.2, 느림: 1.5, 보통: 1.0, 빠름: 0.65, 매우빠름: 0.4 };
const SP = RD.ATK_SPEED;

RD.UNITS = [
  // ── Lv.0 (타입 없음, 강화 영향 없음) ──
  { id:'recruit',  name:'훈련병',     short:'훈련', grade:0, cat:'none', dmg:12, coef:0, spd:SP.느림,  range:180, fx:'slash',  color:'#8d6e63' },
  { id:'militia',  name:'민병대',     short:'민병', grade:0, cat:'none', dmg:5,  coef:0, spd:SP.보통,  range:300, fx:'bullet', sfx:'sword', color:'#3949ab' },
  { id:'wisp',     name:'꼬마정령',   short:'정령', grade:0, cat:'none', dmg:4,  coef:0, spd:SP.빠름,  range:260, fx:'orb',    color:'#5e35b1', pcolor:'#b388ff' },

  // ── Lv.1 워리어 ──
  { id:'knight',     name:'기사',     short:'기사', grade:1, cat:'warrior', dmg:50, coef:10, spd:SP.느림, range:190, fx:'slash', color:'#78909c' },
  { id:'mercenary',  name:'용병',     short:'용병', grade:1, cat:'warrior', dmg:35, coef:7,  spd:SP.느림, range:190, fx:'slash', color:'#6d4c41' },
  { id:'berserker',  name:'광전사',   short:'광전', grade:1, cat:'warrior', dmg:25, coef:5,  spd:SP.보통, range:190, fx:'slash', color:'#a1452b' },
  // ── Lv.1 아처 ──
  { id:'archer',     name:'궁수',     short:'궁수', grade:1, cat:'archer', dmg:50, coef:10, spd:SP.느림, range:380, fx:'arrow',  color:'#5b7d2e' },
  { id:'gunner',     name:'총잡이',   short:'총잡', grade:1, cat:'archer', dmg:20, coef:4,  spd:SP.보통, range:360, fx:'bullet', color:'#455a64' },
  { id:'hunter',     name:'사냥꾼',   short:'사냥', grade:1, cat:'archer', dmg:20, coef:4,  spd:SP.보통, range:360, fx:'arrow',  color:'#7a8b3a' },
  // ── Lv.1 위저드 ──
  { id:'mage',       name:'마법사',   short:'마법', grade:1, cat:'wizard', dmg:20, coef:4,  spd:SP.보통, range:320, fx:'orb',  color:'#4527a0', pcolor:'#7c4dff' },
  { id:'hacker',     name:'해커',     short:'해커', grade:1, cat:'wizard', dmg:10, coef:2,  spd:SP.빠름, range:320, fx:'beam', color:'#2e7d32', pcolor:'#69f0ae' },
  { id:'shaman',     name:'주술사',   short:'주술', grade:1, cat:'wizard', dmg:25, coef:5,  spd:SP.느림, range:320, fx:'holy', color:'#00695c' },

  // ── Lv.2 워리어 ──
  { id:'assassin',   name:'암살자',   short:'암살', grade:2, cat:'warrior', dmg:175, coef:35, spd:SP.느림,     range:210, fx:'slash', color:'#263238' },
  { id:'templar',    name:'성전사',   short:'성전', grade:2, cat:'warrior',     dmg:75,  coef:15, spd:SP.보통,     range:210, fx:'slash', color:'#c79100' },
  { id:'gladiator',  name:'검투사',   short:'검투', grade:2, cat:'warrior',   dmg:145, coef:29, spd:SP.느림,     range:210, fx:'slash', color:'#8d4a2f' },
  { id:'flamer',     name:'화염전사', short:'화전', grade:2, cat:'warrior',   dmg:50,  coef:10, spd:SP.보통,     range:210, fx:'fire',  color:'#d84315', splash:100 },
  { id:'juggernaut', name:'거신병',   short:'거신', grade:2, cat:'warrior',      dmg:85,  coef:17, spd:SP.보통,     range:210, fx:'slash', color:'#5d6b74' },
  { id:'duelist',    name:'쌍검사',   short:'쌍검', grade:2, cat:'warrior', dmg:35,  coef:7,  spd:SP.매우빠름, range:210, fx:'slash', color:'#880e4f' },
  // ── Lv.2 아처 ──
  { id:'sniper',     name:'저격수',   short:'저격', grade:2, cat:'archer',    dmg:180, coef:36, spd:SP.느림, range:520, fx:'beam',    color:'#37474f', pcolor:'#fff59d' },
  { id:'ranger',     name:'레인저',   short:'레인', grade:2, cat:'archer', dmg:80,  coef:16, spd:SP.보통, range:400, fx:'arrow',   color:'#33691e' },
  { id:'cannoneer',  name:'포병',     short:'포병', grade:2, cat:'archer',  dmg:150, coef:30, spd:SP.느림, range:420, fx:'missile', color:'#546e7a' },
  { id:'scout',      name:'정찰병',   short:'정찰', grade:2, cat:'archer',    dmg:45,  coef:9,  spd:SP.빠름, range:380, fx:'bullet',  color:'#827717' },
  { id:'crossbow',   name:'석궁병',   short:'석궁', grade:2, cat:'archer',  dmg:40,  coef:8,  spd:SP.빠름, range:380, fx:'arrow',   color:'#6d5a3a' },
  { id:'stalker',    name:'추적자',   short:'추적', grade:2, cat:'archer', dmg:75, coef:15, spd:SP.보통, range:400, fx:'arrow', color:'#3e2723' },
  // ── Lv.2 위저드 ──
  { id:'frostmage',  name:'빙결술사', short:'빙결', grade:2, cat:'wizard',   dmg:75,  coef:15, spd:SP.보통, range:340, fx:'orb',       color:'#0277bd', pcolor:'#80d8ff' },
  { id:'technomancer', name:'기계술사', short:'기계', grade:2, cat:'wizard', dmg:50,  coef:10, spd:SP.빠름, range:340, fx:'beam',      color:'#00838f', pcolor:'#18ffff' },
  { id:'summoner',   name:'소환사',   short:'소환', grade:2, cat:'wizard',  dmg:45,  coef:9,  spd:SP.빠름, range:340, fx:'holy',      color:'#6a1b9a' },
  { id:'warlock',    name:'흑마법사', short:'흑마', grade:2, cat:'wizard',     dmg:100, coef:20, spd:SP.느림, range:340, fx:'orb',       color:'#311b92', pcolor:'#ea80fc' },
  { id:'pyromancer', name:'화염술사', short:'화염', grade:2, cat:'wizard',       dmg:85,  coef:17, spd:SP.보통, range:340, fx:'fire',      color:'#bf360c' },
  { id:'stormcaller',name:'뇌전술사', short:'뇌전', grade:2, cat:'wizard',  dmg:45,  coef:9,  spd:SP.빠름, range:340, fx:'lightning', color:'#283593', pcolor:'#82b1ff' },

  // ── Lv.3 워리어 ──
  { id:'shadowlord', name:'그림자군주', short:'그림', grade:3, cat:'warrior', dmg:900,  coef:180, spd:SP.느림, range:230, fx:'slash', color:'#1a1a2e' },
  { id:'archon',     name:'대성전사',   short:'대성', grade:3, cat:'warrior', dmg:600,  coef:120, spd:SP.느림, range:230, fx:'holy',  color:'#fff3c4', splash:150 },
  { id:'infernal',   name:'업화기사',   short:'업화', grade:3, cat:'warrior', dmg:250,  coef:50,  spd:SP.보통, range:230, fx:'fire',  color:'#b71c1c', splash:120 },
  { id:'champion',   name:'투기왕',     short:'투기', grade:3, cat:'warrior', dmg:700,  coef:140, spd:SP.느림, range:230, fx:'slash', color:'#bf360c' },
  { id:'titan',      name:'타이탄',     short:'거인', grade:3, cat:'warrior', dmg:450,  coef:90,  spd:SP.보통, range:230, fx:'slash', color:'#4e5b63' },
  { id:'swordsaint', name:'검성',       short:'검성', grade:3, cat:'warrior', dmg:1000, coef:200, spd:SP.느림, range:230, fx:'slash', color:'#b0bec5' },
  // ── Lv.3 아처 ──
  { id:'deadeye',    name:'명사수',     short:'명사', grade:3, cat:'archer', dmg:480, coef:96,  spd:SP.보통,     range:560, fx:'beam',    color:'#1565c0', pcolor:'#82b1ff' },
  { id:'windranger', name:'바람궁수',   short:'바람', grade:3, cat:'archer', dmg:400, coef:80,  spd:SP.보통,     range:440, fx:'arrow',   color:'#2e7d32' },
  { id:'gatling',    name:'연사수',     short:'연사', grade:3, cat:'archer', dmg:180, coef:36,  spd:SP.매우빠름, range:400, fx:'bullet',  color:'#5d4037' },
  { id:'artillery',  name:'공성포병',   short:'공성', grade:3, cat:'archer', dmg:550, coef:110, spd:SP.느림,     range:480, fx:'missile', color:'#37474f', splash:160 },
  { id:'plaguebow',  name:'역병궁수',   short:'역병', grade:3, cat:'archer', dmg:300, coef:60,  spd:SP.보통,     range:420, fx:'arrow',   color:'#558b2f', slow:0.35, slowDur:2 },
  { id:'nightstalker', name:'밤사냥꾼', short:'밤사', grade:3, cat:'archer', dmg:250, coef:50,  spd:SP.느림,     range:440, fx:'missile', color:'#212121', splash:120 },
  // ── Lv.3 위저드 ──
  { id:'meteor',     name:'운석술사',   short:'운석', grade:3, cat:'wizard', dmg:350,  coef:70,  spd:SP.느림,     range:380, fx:'fire',      color:'#e65100', splash:140 },
  { id:'thunderlord',name:'뇌제',       short:'뇌제', grade:3, cat:'wizard', dmg:800,  coef:160, spd:SP.느림,     range:380, fx:'lightning', color:'#1a237e', pcolor:'#82b1ff' },
  { id:'dronelord',  name:'기계군주',   short:'군주', grade:3, cat:'wizard', dmg:150,  coef:30,  spd:SP.빠름,     range:380, fx:'beam',      color:'#006064', pcolor:'#18ffff', splash:110 },
  { id:'frostqueen', name:'빙결여왕',   short:'빙여', grade:3, cat:'wizard', dmg:250,  coef:50,  spd:SP.빠름,     range:380, fx:'orb',       color:'#01579b', pcolor:'#80d8ff' },
  { id:'necromancer',name:'사령술사',   short:'사령', grade:3, cat:'wizard', dmg:250,  coef:50,  spd:SP.보통,     range:380, fx:'holy',      color:'#4a148c' },
  { id:'voidlord',   name:'공허군주',   short:'공허', grade:3, cat:'wizard', dmg:1300, coef:260, spd:SP.매우느림, range:400, fx:'orb',       color:'#12005e', pcolor:'#ea80fc' },

  // ── Lv.4 ──
  { id:'warlord',     name:'전쟁군주',   short:'전쟁', grade:4, cat:'warrior',     dmg:3000, coef:600, spd:SP.느림,     range:240, fx:'slash',     color:'#7f1d1d' },
  { id:'bladestorm',  name:'칼바람검객', short:'칼바', grade:4, cat:'warrior',      dmg:700,  coef:140, spd:SP.매우빠름, range:240, fx:'slash',     color:'#ad1457', splash:90 },
  { id:'dragonknight',name:'용기사',     short:'용기', grade:4, cat:'warrior',      dmg:1400, coef:280, spd:SP.보통,     range:240, fx:'fire',      color:'#e65100', splash:150 },
  { id:'stormarcher', name:'폭풍궁수',   short:'폭궁', grade:4, cat:'archer',     dmg:1200, coef:240, spd:SP.빠름,     range:460, fx:'arrow',     color:'#00838f' },
  { id:'railgunner',  name:'레일건사수', short:'레일', grade:4, cat:'archer',  dmg:3000, coef:600, spd:SP.느림,     range:600, fx:'beam',      color:'#880e4f', pcolor:'#ff80ab' },
  { id:'mortar',      name:'박격포대',   short:'박격', grade:4, cat:'archer',      dmg:2000, coef:400, spd:SP.느림,     range:500, fx:'missile',   color:'#4e342e', splash:170 },
  { id:'archmage',    name:'대마도사',   short:'대마', grade:4, cat:'wizard',           dmg:1800, coef:360, spd:SP.보통,     range:400, fx:'orb',       color:'#f9a825', pcolor:'#ffe57f', splash:100 },
  { id:'cryolord',    name:'혹한군주',   short:'혹한', grade:4, cat:'wizard',      dmg:1300, coef:260, spd:SP.보통,     range:400, fx:'orb',       color:'#1565c0', pcolor:'#b3e5fc', slow:0.45, slowDur:2 },
  { id:'stormlord',   name:'폭풍군주',   short:'폭군', grade:4, cat:'wizard',     dmg:1100, coef:220, spd:SP.빠름,     range:400, fx:'lightning', color:'#283593', pcolor:'#8c9eff' },
  // ── Lv.5 (일반 유닛 최고 레벨) ──
  { id:'conqueror',   name:'정복왕', short:'정복', grade:5, cat:'warrior', dmg:10500, coef:2100, spd:SP.느림,     range:250, fx:'slash',     color:'#b71c1c', stun:0.15, stunDur:0.6 },
  { id:'swordgod',    name:'검신',   short:'검신', grade:5, cat:'warrior', dmg:2400,  coef:480,  spd:SP.매우빠름, range:250, fx:'slash',     color:'#f8bbd0', splash:110 },
  { id:'wyrmking',    name:'용왕',   short:'용왕', grade:5, cat:'warrior', dmg:5000,  coef:1000, spd:SP.보통,     range:250, fx:'fire',      color:'#ff3d00', splash:180 },
  { id:'skypiercer',  name:'천궁',   short:'천궁', grade:5, cat:'archer',  dmg:4200,  coef:840,  spd:SP.빠름,     range:480, fx:'arrow',     color:'#00bcd4' },
  { id:'orbitalcannon', name:'궤도포', short:'궤도', grade:5, cat:'archer', dmg:10500, coef:2100, spd:SP.느림,    range:700, fx:'beam',      color:'#c2185b', pcolor:'#ff4081' },
  { id:'siegeking',   name:'공성왕', short:'공왕', grade:5, cat:'archer',  dmg:7000,  coef:1400, spd:SP.느림,     range:520, fx:'missile',   color:'#6d4c41', splash:200 },
  { id:'sage',        name:'현자',   short:'현자', grade:5, cat:'wizard',  dmg:6300,  coef:1260, spd:SP.보통,     range:420, fx:'orb',       color:'#fff176', pcolor:'#fff59d', splash:120 },
  { id:'wintergod',   name:'겨울신', short:'겨울', grade:5, cat:'wizard',  dmg:4600,  coef:920,  spd:SP.보통,     range:420, fx:'orb',       color:'#4fc3f7', pcolor:'#e1f5fe', splash:100, slow:0.55, slowDur:2.5 },
  { id:'thundergod',  name:'뇌신',   short:'뇌신', grade:5, cat:'wizard',  dmg:3900,  coef:780,  spd:SP.빠름,     range:420, fx:'lightning', color:'#3949ab', pcolor:'#b388ff' },

  // ── 히든 유닛 (RD.RECIPES 로만 획득) ──
  // 히든 Lv.5: 서로 다른 타입의 Lv.4 + Lv.4 + Lv.3
  { id:'chronoknight',  name:'시간기사',   short:'시간', grade:5, hidden:true, cat:'warrior', dmg:13000, coef:2600, spd:1.2,     range:260, fx:'slash',   color:'#7c4dff', stun:0.25, stunDur:0.8 },
  { id:'phoenixarcher', name:'불사조궁수', short:'불사', grade:5, hidden:true, cat:'archer',  dmg:5600,  coef:1120, spd:SP.빠름, range:500, fx:'fire',    color:'#ff6d00', splash:140 },
  { id:'voidwalker',    name:'공허보행자', short:'공보', grade:5, hidden:true, cat:'wizard',  dmg:8000,  coef:1600, spd:0.8,     range:440, fx:'orb',     color:'#4a148c', pcolor:'#e040fb', splash:120 },
  { id:'mechaseraph',   name:'기계세라핌', short:'세라', grade:5, hidden:true, cat:'wizard',  dmg:8500,  coef:1700, spd:SP.보통, range:440, fx:'holy',    color:'#fafafa', splash:150, slow:0.3, slowDur:1.5 },
  { id:'ghostsniper',   name:'유령저격수', short:'유령', grade:5, hidden:true, cat:'archer',  dmg:18000, coef:3600, spd:SP.느림, range:760, fx:'beam',    color:'#80deea', pcolor:'#e0f7fa' },
  { id:'titanmech',     name:'거신기갑',   short:'기갑', grade:5, hidden:true, cat:'warrior', dmg:11000, coef:2200, spd:1.2,     range:300, fx:'missile', color:'#455a64', splash:160 },
  // 히든 Lv.6: 서로 다른 타입의 일반 Lv.5 ×3
  { id:'archangel',     name:'대천사',       short:'천사', grade:6, hidden:true, cat:'wizard',  dmg:30000, coef:6000, spd:SP.보통, range:460, fx:'holy',      color:'#fff8e1', splash:180 },
  { id:'worldserpent',  name:'세계뱀',       short:'세뱀', grade:6, hidden:true, cat:'warrior', dmg:42000, coef:8400, spd:SP.느림, range:300, fx:'fire',      color:'#1b5e20', splash:200, slow:0.4, slowDur:2 },
  { id:'starcaller',    name:'별을부르는자', short:'별부', grade:6, hidden:true, cat:'archer',  dmg:20000, coef:4000, spd:SP.빠름, range:560, fx:'lightning', color:'#ffd600', pcolor:'#fff59d', splash:110 },
  // 히든 Lv.7: 히든 Lv.6 + 히든 Lv.5 + 일반 Lv.5
  { id:'nemesisbane',   name:'네메시스파쇄자', short:'파쇄', grade:7, hidden:true, cat:'warrior', dmg:95000,  coef:19000, spd:SP.느림, range:320, fx:'slash', color:'#d50000', splash:160, stun:0.3, stunDur:1 },
  { id:'archivist',     name:'아카이브수호자', short:'수호', grade:7, hidden:true, cat:'wizard',  dmg:70000,  coef:14000, spd:1.1,     range:480, fx:'orb',   color:'#00e5ff', pcolor:'#84ffff', splash:200, slow:0.4, slowDur:2 },
  { id:'eventhorizon',  name:'사건의지평선',   short:'지평', grade:7, hidden:true, cat:'archer',  dmg:120000, coef:24000, spd:SP.느림, range:800, fx:'beam',  color:'#311b92', pcolor:'#b388ff', splash:140 },
  // 히든 Lv.8: 히든 Lv.7 ×3 (최종)
  { id:'genesis',       name:'제네시스코어', short:'창세', grade:8, hidden:true, cat:'wizard', dmg:420000, coef:84000, spd:SP.보통, range:560, fx:'lightning', color:'#ffffff', pcolor:'#ffffff', splash:240, stun:0.2, stunDur:0.8 },
];
RD.UNIT_BY_ID = Object.fromEntries(RD.UNITS.map(u => [u.id, u]));
// 일반 유닛만 (소환·일반 조합·타입 변경 후보). 히든은 RD.HIDDEN_UNITS
RD.UNITS_BY_GRADE = RD.GRADES.map((_, g) => RD.UNITS.filter(u => u.grade === g && !u.hidden));
RD.HIDDEN_UNITS = RD.UNITS.filter(u => u.hidden);

/* ── 히든 레시피: 정해진 재료 3개를 한 번에 소모 → 히든 유닛
 *  레시피 도감(UIScene)에서 발견 전 결과는 ???, 가져본 적 없는 재료는 '??? (Lv.4 아처)' 처럼 힌트만 표시 */
RD.RECIPES = [
  // 히든 Lv.5 ← Lv.4 + Lv.4 + Lv.3 (세 타입이 모두 다름)
  { out: 'chronoknight',  needs: ['warlord', 'railgunner', 'thunderlord'] },
  { out: 'phoenixarcher', needs: ['stormarcher', 'dragonknight', 'meteor'] },
  { out: 'voidwalker',    needs: ['archmage', 'bladestorm', 'shadowlord'] },
  { out: 'mechaseraph',   needs: ['cryolord', 'mortar', 'archon'] },
  { out: 'ghostsniper',   needs: ['railgunner', 'stormlord', 'swordsaint'] },
  { out: 'titanmech',     needs: ['bladestorm', 'mortar', 'dronelord'] },
  // 히든 Lv.6 ← 일반 Lv.5 ×3 (세 타입이 모두 다름)
  { out: 'archangel',     needs: ['conqueror', 'skypiercer', 'sage'] },
  { out: 'worldserpent',  needs: ['wyrmking', 'siegeking', 'wintergod'] },
  { out: 'starcaller',    needs: ['swordgod', 'orbitalcannon', 'thundergod'] },
  // 히든 Lv.7 ← 히든 Lv.6 + 히든 Lv.5 + 일반 Lv.5
  { out: 'nemesisbane',   needs: ['archangel', 'chronoknight', 'conqueror'] },
  { out: 'archivist',     needs: ['worldserpent', 'voidwalker', 'sage'] },
  { out: 'eventhorizon',  needs: ['starcaller', 'phoenixarcher', 'skypiercer'] },
  // 히든 Lv.8 ← 히든 Lv.7 ×3 (최종)
  { out: 'genesis',       needs: ['nemesisbane', 'archivist', 'eventhorizon'] },
];
RD.RECIPE_BY_OUT = Object.fromEntries(RD.RECIPES.map(r => [r.out, r]));

// 유닛 가치 (Lv.0 몇 마리분인지): 일반 LvN = 3^N, 히든 = 레시피 재료 가치의 합
RD.unitValue = t => {
  if (t._value) return t._value;
  const r = RD.RECIPE_BY_OUT[t.id];
  return (t._value = r ? r.needs.reduce((s, id) => s + RD.unitValue(RD.UNIT_BY_ID[id]), 0) : Math.pow(3, t.grade));
};
// 판매가 = 투자 골드(가치 × 소환 비용) × 레벨별 환급 비율, 10 단위 내림
RD.sellPrice = t => Math.max(10, Math.floor(RD.unitValue(t) * RD.CONFIG.summonCost * RD.GRADES[t.grade].sellRate / 10) * 10);
// 타입 변경 비용 = 판매가의 절반 (판매 후 다시 뽑는 것보다 항상 쌈), 10 단위 올림
RD.typeChangeCost = t => Math.ceil(RD.sellPrice(t) * 0.5 / 10) * 10;
RD.canTypeChange = t => !t.hidden && t.grade >= RD.TYPE_CHANGE_MIN_GRADE;
// 타입 변경: 같은 레벨에서 타입을 1/3 씩 무작위로 고른 뒤 그 타입의 유닛 중 무작위 (지금과 똑같은 유닛만 제외)
RD.typeChangeTargets = t => (RD.UNITS_BY_GRADE[t.grade] || []).filter(u => u.id !== t.id);
RD.pickTypeChange = t => {
  const cat = RD.CAT_KEYS[Math.floor(Math.random() * RD.CAT_KEYS.length)];
  const c = RD.typeChangeTargets(t).filter(u => u.cat === cat);
  return c[Math.floor(Math.random() * c.length)];
};
// 같은 유닛 3개로 일반 조합이 가능한 유닛인지
RD.canMerge = t => !t.hidden && t.grade < RD.MAX_NORMAL_GRADE;
// 표시 색: 히든은 무지개(글자 등 고정 색은 HIDDEN_COLOR), 그 외는 레벨 색
RD.unitColorStr = t => t.hidden ? 'rainbow' : RD.GRADES[t.grade].color;
RD.unitTextColor = t => t.hidden ? RD.HIDDEN_COLOR : RD.GRADES[t.grade].color;
RD.unitLevelName = t => (t.hidden ? '레거시 ' : '') + RD.GRADES[t.grade].name;
// 이 유닛이 재료로 들어가는 히든 레시피들
RD.recipesUsing = t => RD.RECIPES.filter(r => r.needs.includes(t.id));

/* 도감 기록 (판을 넘어 유지, RD.Save 의 codex): seen = 가져본 적 있는 유닛, made = 만들어 본 히든 유닛
 *  저장소가 막힌 환경(시크릿 모드 등)에서도 그 판 안에서는 동작 */
RD.Codex = (() => {
  const cx = () => RD.Save.data.codex;
  const add = (list, id) => { const a = cx()[list]; if (!a.includes(id)) { a.push(id); RD.Save.save(); } };
  return {
    seen: id => cx().seen.includes(id),
    made: id => cx().made.includes(id),
    see(id) { add('seen', id); },
    make(id) { add('made', id); },
  };
})();

// 조합 결과 후보 (logic.combine 에서 사용)
//  모든 레벨에서 결과 타입은 무작위 (레벨마다 타입별 유닛 수가 같으므로 워리어/아처/위저드 각 1/3)
RD.combineTargets = t => RD.UNITS_BY_GRADE[t.grade + 1] || [];
