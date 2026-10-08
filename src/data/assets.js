/* =====================================================================
 * 에셋 매니페스트 — 픽셀아트 스프라이트 연결
 *
 * 여기에 유닛/적 id 를 이미지나 스프라이트시트에 연결하면, PreloadScene 이
 * 불러와서 자동 생성된 플레이스홀더 대신 사용합니다. (없으면 플레이스홀더)
 *
 *  type: 'image'        → 한 장짜리 이미지
 *  type: 'spritesheet'  → frameWidth / frameHeight 로 잘라 쓰는 시트
 *  scale (선택)         → 표시 배율. 생략하면 칸 크기(유닛 약 88px, 적은 크기*2.4)에 맞춤
 *  anims (선택)         → 애니메이션. frames 는 시트의 프레임 번호 배열
 *      유닛: idle(반복), attack(공격할 때 1회 재생 후 idle 로 복귀)
 *      적:   walk(반복)
 *
 * 예)
 *  units: {
 *    archer: { type:'spritesheet', url:'assets/units/archer.png', frameWidth:16, frameHeight:16,
 *              anims:{ idle:{ frames:[0,1], frameRate:3 }, attack:{ frames:[2,3,4], frameRate:12, repeat:0 } } },
 *    knight: { type:'image', url:'assets/units/knight.png' },
 *  },
 *  enemies: {
 *    slime:  { type:'spritesheet', url:'assets/enemies/slime.png', frameWidth:16, frameHeight:16,
 *              anims:{ walk:{ frames:[0,1,2,3], frameRate:8 } } },
 *    ogre:   { type:'image', url:'assets/enemies/ogre.png', scale:6 },   // 보스도 id 로 지정
 *  },
 *
 * ※ 여러 파일 버전(index.html)은 file:// 로 열면 브라우저가 이미지 로딩을 막으므로
 *   로컬 서버(npx http-server 등)로 실행하세요. `node tools/build.js` 로 만든
 *   dist/random-defense.html 에는 이미지가 base64 로 들어가서 더블클릭으로도 동작합니다.
 * ===================================================================== */
window.RD = window.RD || {};

RD.ASSETS = {
  units: {
  },
  enemies: {
  },
  // 공격 효과음 (src/core/sfx.js 가 사용, 출처는 assets/audio/sfx/CREDITS.txt). 빌드 시 dist 에 내장됨
  sfx: {},
};
['sword1', 'sword2', 'sword3', 'heavy1', 'heavy2', 'bow1', 'bow2', 'bow3', 'gun1', 'gun2', 'cannon1',
 'orb1', 'orb2', 'beam1', 'beam2', 'bolt1', 'fire1', 'fire2']
  .forEach(k => { RD.ASSETS.sfx[k] = { url: `assets/audio/sfx/${k}.wav` }; });

/* ── 소환 유닛 캐릭터 (gameasset 팩에서 추출: tools/extract_sprites.py → assets/units/, src/data/sprites_gen.js) ──
 *  유닛 id: [캐릭터 시트, 색조(tint, 생략 가능)]
 *  같은 캐릭터를 여러 유닛이 쓰면 색조로 구분. 레벨이 높을수록 크기·오라·발광 이펙트가 커진다 (GameScene).
 *  시트는 SE(오른쪽 아래) 방향이고, 왼쪽 적을 공격할 때 좌우 반전한다. */
RD.UNIT_CHARS = {
  // Lv.0
  recruit: ['l0_knight'], militia: ['l0_archer'], wisp: ['l0_firemage'],
  // Lv.1 워리어 / 아처 / 위저드
  knight: ['knight'], mercenary: ['footsoldier'], berserker: ['hammer'],
  archer: ['archer'], gunner: ['shooter'], hunter: ['camoarcher'],
  mage: ['wizard'], hacker: ['caster', 0xa0ffb8], shaman: ['u_wizard', 0xa8ffd8],
  // Lv.2 워리어
  assassin: ['assassin'], templar: ['paladin'], gladiator: ['bruiser'],
  flamer: ['crusader', 0xffa080], juggernaut: ['brawler'], duelist: ['u_berserker'],
  // Lv.2 아처
  sniper: ['sniper'], ranger: ['longbow'], cannoneer: ['shooter', 0xffc890],
  scout: ['archer', 0xd8e890], crossbow: ['u_archer'], stalker: ['u_darkarcher'],
  // Lv.2 위저드
  frostmage: ['wizard', 0xb0e4ff], technomancer: ['caster', 0x80ffff], summoner: ['commander'],
  warlock: ['u_necromancer'], pyromancer: ['darklord', 0xffa070], stormcaller: ['mage', 0xa8b8ff],
  // Lv.3 워리어
  shadowlord: ['deathlord'], archon: ['paladin', 0xfff0a0], infernal: ['deathknight', 0xff9080],
  champion: ['darkknight', 0xffd8a8], titan: ['brute'], swordsaint: ['guard', 0xe8f4ff],
  // Lv.3 아처
  deadeye: ['sniper', 0x9fc8ff], windranger: ['longbow', 0xb0ffb0], gatling: ['shooter', 0xc8a888],
  artillery: ['brawler', 0xc8d0d8], plaguebow: ['u_darkarcher', 0xa8ff88], nightstalker: ['u_archer', 0xb898ff],
  // Lv.3 위저드
  meteor: ['u_wizard', 0xffb070], thunderlord: ['arcane', 0x8fb0ff], dronelord: ['caster', 0x40ffff],
  frostqueen: ['mage', 0xc8f4ff], necromancer: ['u_necromancer', 0xc898ff], voidlord: ['arcane'],
};
RD.UNIT_SPRITE_H = [76, 84, 94, 108];   // 레벨별 표시 키(px, 필드 기준)
for (const id in RD.UNIT_CHARS) {
  const [sheet, tint] = RD.UNIT_CHARS[id], s = RD.SPRITE_SHEETS && RD.SPRITE_SHEETS[sheet];
  if (!s) continue;
  RD.ASSETS.units[id] = {
    type: 'spritesheet', sheet, url: s.url, frameWidth: s.fw, frameHeight: s.fh, smooth: true,
    tint, bodyH: s.bodyH, originY: s.oy,
    anims: { idle: { frames: s.idle, frameRate: 7 }, attack: { frames: s.attack, frameRate: 26, repeat: 0 } },
  };
}

// 데모 스프라이트: 주소 끝에 ?demo=1 을 붙이면 슬라임 적에 예제 픽셀아트가 적용됩니다.
if (typeof location !== 'undefined' && /[?&]demo=1/.test(location.search)) {
  RD.ASSETS.enemies.slime = { type: 'spritesheet', url: 'assets/demo/slime.png', frameWidth: 16, frameHeight: 16, scale: 3.5,
    anims: { walk: { frames: [0, 1, 2, 3], frameRate: 8 } } };
}

// 단일 파일 빌드에서는 tools/build.js 가 RD.ASSET_DATA (경로 → dataURL) 를 채워 넣습니다.
RD.assetUrl = url => (RD.ASSET_DATA && RD.ASSET_DATA[url]) || url;
// 텍스처 키: 같은 캐릭터 시트(sheet)를 쓰는 유닛들은 텍스처·애니메이션을 공유
RD.assetKey = (prefix, id, a) => a && a.sheet ? 'spr_sheet_' + a.sheet : prefix + id;
