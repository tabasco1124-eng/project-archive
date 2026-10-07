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
};

// 데모 스프라이트: 주소 끝에 ?demo=1 을 붙이면 궁수/슬라임에 예제 픽셀아트가 적용됩니다.
if (typeof location !== 'undefined' && /[?&]demo=1/.test(location.search)) {
  RD.ASSETS.units.archer = { type: 'spritesheet', url: 'assets/demo/archer.png', frameWidth: 16, frameHeight: 16, scale: 5,
    anims: { idle: { frames: [0, 1], frameRate: 3 }, attack: { frames: [2, 3, 4], frameRate: 14, repeat: 0 } } };
  RD.ASSETS.enemies.slime = { type: 'spritesheet', url: 'assets/demo/slime.png', frameWidth: 16, frameHeight: 16, scale: 3.5,
    anims: { walk: { frames: [0, 1, 2, 3], frameRate: 8 } } };
}

// 단일 파일 빌드에서는 tools/build.js 가 RD.ASSET_DATA (경로 → dataURL) 를 채워 넣습니다.
RD.assetUrl = url => (RD.ASSET_DATA && RD.ASSET_DATA[url]) || url;
