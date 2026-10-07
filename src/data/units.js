/* 레벨 / 타입 / 유닛 데이터 테이블  (스탯 출처: 랜덤 피라미드 디펜스 3.3 표)
 *  유닛 필드
 *   id, name(표시명), short(원 안 2글자), grade(레벨 0~3), cat(none|warrior|archer|wizard)
 *   dmg(기본 공격력), coef(타입 강화 1단계당 공격력 증가량, Lv.0 은 0), spd(공격 간격 초), range(px), fx(공격 연출)
 *   조합 규칙
 *     Lv.0 ×3 → 같은 line 의 Lv.1 중 랜덤 타입
 *     Lv.1 ×3 → 같은 타입의 Lv.2 중 랜덤
 *     Lv.2 ×3 → next 로 정해진 Lv.3 (고정 조합)
 *   선택: line(Lv.0/1 계열 번호), next(Lv.2 → Lv.3 id), splash(광역 반경), slow(감속 비율 0~1), slowDur, stun(기절 확률), stunDur
 *         color(몸통색), pcolor(투사체/이펙트 색)
 *   fx: slash(근접, 즉시) | beam(레이저, 즉시) | lightning(번개, 즉시)
 *       arrow | bullet | orb | fire | holy | missile (투사체)
 */
window.RD = window.RD || {};

RD.GRADES = [
  { name: 'Lv.0', color: '#c8c8c8', sell: 10 },
  { name: 'Lv.1', color: '#42a5f5', sell: 30 },
  { name: 'Lv.2', color: '#b05cff', sell: 100 },
  { name: 'Lv.3', color: '#ffa726', sell: 300 },
];

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
  { id:'recruit',  name:'훈련병',     short:'훈련', grade:0, cat:'none', line:0, dmg:12, coef:0, spd:SP.느림,  range:180, fx:'slash',  color:'#8d6e63' },
  { id:'militia',  name:'민병대',     short:'민병', grade:0, cat:'none', line:1, dmg:5,  coef:0, spd:SP.보통,  range:300, fx:'bullet', color:'#3949ab' },
  { id:'wisp',     name:'꼬마정령',   short:'정령', grade:0, cat:'none', line:2, dmg:4,  coef:0, spd:SP.빠름,  range:260, fx:'orb',    color:'#5e35b1', pcolor:'#b388ff' },

  // ── Lv.1 워리어 ──
  { id:'knight',     name:'기사',     short:'기사', grade:1, cat:'warrior', line:0, dmg:50, coef:10, spd:SP.느림, range:190, fx:'slash', color:'#78909c' },
  { id:'mercenary',  name:'용병',     short:'용병', grade:1, cat:'warrior', line:1, dmg:35, coef:7,  spd:SP.느림, range:190, fx:'slash', color:'#6d4c41' },
  { id:'berserker',  name:'광전사',   short:'광전', grade:1, cat:'warrior', line:2, dmg:25, coef:5,  spd:SP.보통, range:190, fx:'slash', color:'#a1452b' },
  // ── Lv.1 아처 ──
  { id:'archer',     name:'궁수',     short:'궁수', grade:1, cat:'archer', line:0, dmg:50, coef:10, spd:SP.느림, range:380, fx:'arrow',  color:'#5b7d2e' },
  { id:'gunner',     name:'총잡이',   short:'총잡', grade:1, cat:'archer', line:1, dmg:20, coef:4,  spd:SP.보통, range:360, fx:'bullet', color:'#455a64' },
  { id:'hunter',     name:'사냥꾼',   short:'사냥', grade:1, cat:'archer', line:2, dmg:20, coef:4,  spd:SP.보통, range:360, fx:'arrow',  color:'#7a8b3a' },
  // ── Lv.1 위저드 ──
  { id:'mage',       name:'마법사',   short:'마법', grade:1, cat:'wizard', line:0, dmg:20, coef:4,  spd:SP.보통, range:320, fx:'orb',  color:'#4527a0', pcolor:'#7c4dff' },
  { id:'hacker',     name:'해커',     short:'해커', grade:1, cat:'wizard', line:1, dmg:10, coef:2,  spd:SP.빠름, range:320, fx:'beam', color:'#2e7d32', pcolor:'#69f0ae' },
  { id:'shaman',     name:'주술사',   short:'주술', grade:1, cat:'wizard', line:2, dmg:25, coef:5,  spd:SP.느림, range:320, fx:'holy', color:'#00695c' },

  // ── Lv.2 워리어 ──
  { id:'assassin',   name:'암살자',   short:'암살', grade:2, cat:'warrior', next:'shadowlord', dmg:175, coef:35, spd:SP.느림,     range:210, fx:'slash', color:'#263238' },
  { id:'templar',    name:'성전사',   short:'성전', grade:2, cat:'warrior', next:'archon',     dmg:75,  coef:15, spd:SP.보통,     range:210, fx:'slash', color:'#c79100' },
  { id:'gladiator',  name:'검투사',   short:'검투', grade:2, cat:'warrior', next:'champion',   dmg:145, coef:29, spd:SP.느림,     range:210, fx:'slash', color:'#8d4a2f' },
  { id:'flamer',     name:'화염전사', short:'화전', grade:2, cat:'warrior', next:'infernal',   dmg:50,  coef:10, spd:SP.보통,     range:210, fx:'fire',  color:'#d84315', splash:100 },
  { id:'juggernaut', name:'거신병',   short:'거신', grade:2, cat:'warrior', next:'titan',      dmg:85,  coef:17, spd:SP.보통,     range:210, fx:'slash', color:'#5d6b74' },
  { id:'duelist',    name:'쌍검사',   short:'쌍검', grade:2, cat:'warrior', next:'swordsaint', dmg:35,  coef:7,  spd:SP.매우빠름, range:210, fx:'slash', color:'#880e4f' },
  // ── Lv.2 아처 ──
  { id:'sniper',     name:'저격수',   short:'저격', grade:2, cat:'archer', next:'deadeye',    dmg:180, coef:36, spd:SP.느림, range:520, fx:'beam',    color:'#37474f', pcolor:'#fff59d' },
  { id:'ranger',     name:'레인저',   short:'레인', grade:2, cat:'archer', next:'windranger', dmg:80,  coef:16, spd:SP.보통, range:400, fx:'arrow',   color:'#33691e' },
  { id:'cannoneer',  name:'포병',     short:'포병', grade:2, cat:'archer', next:'artillery',  dmg:150, coef:30, spd:SP.느림, range:420, fx:'missile', color:'#546e7a' },
  { id:'scout',      name:'정찰병',   short:'정찰', grade:2, cat:'archer', next:'gatling',    dmg:45,  coef:9,  spd:SP.빠름, range:380, fx:'bullet',  color:'#827717' },
  { id:'crossbow',   name:'석궁병',   short:'석궁', grade:2, cat:'archer', next:'plaguebow',  dmg:40,  coef:8,  spd:SP.빠름, range:380, fx:'arrow',   color:'#6d5a3a' },
  { id:'stalker',    name:'추적자',   short:'추적', grade:2, cat:'archer', next:'nightstalker', dmg:75, coef:15, spd:SP.보통, range:400, fx:'arrow', color:'#3e2723' },
  // ── Lv.2 위저드 ──
  { id:'frostmage',  name:'빙결술사', short:'빙결', grade:2, cat:'wizard', next:'frostqueen',   dmg:75,  coef:15, spd:SP.보통, range:340, fx:'orb',       color:'#0277bd', pcolor:'#80d8ff' },
  { id:'technomancer', name:'기계술사', short:'기계', grade:2, cat:'wizard', next:'dronelord', dmg:50,  coef:10, spd:SP.빠름, range:340, fx:'beam',      color:'#00838f', pcolor:'#18ffff' },
  { id:'summoner',   name:'소환사',   short:'소환', grade:2, cat:'wizard', next:'necromancer',  dmg:45,  coef:9,  spd:SP.빠름, range:340, fx:'holy',      color:'#6a1b9a' },
  { id:'warlock',    name:'흑마법사', short:'흑마', grade:2, cat:'wizard', next:'voidlord',     dmg:100, coef:20, spd:SP.느림, range:340, fx:'orb',       color:'#311b92', pcolor:'#ea80fc' },
  { id:'pyromancer', name:'화염술사', short:'화염', grade:2, cat:'wizard', next:'meteor',       dmg:85,  coef:17, spd:SP.보통, range:340, fx:'fire',      color:'#bf360c' },
  { id:'stormcaller',name:'뇌전술사', short:'뇌전', grade:2, cat:'wizard', next:'thunderlord',  dmg:45,  coef:9,  spd:SP.빠름, range:340, fx:'lightning', color:'#283593', pcolor:'#82b1ff' },

  // ── Lv.3 워리어 (Lv.2 ×3 고정 조합) ──
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
];
RD.UNIT_BY_ID = Object.fromEntries(RD.UNITS.map(u => [u.id, u]));
RD.UNITS_BY_GRADE = RD.GRADES.map((_, g) => RD.UNITS.filter(u => u.grade === g));

// 조합 결과 후보 (logic.combine 에서 사용)
RD.combineTargets = t => {
  if (t.next) return [RD.UNIT_BY_ID[t.next]];
  const up = RD.UNITS_BY_GRADE[t.grade + 1] || [];
  if (t.grade === 0) return up.filter(u => u.line === t.line);
  return up.filter(u => u.cat === t.cat);
};
