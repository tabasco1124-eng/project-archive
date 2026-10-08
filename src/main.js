/* 진입점: Phaser 게임 생성 */
window.RD = window.RD || {};

// 테스트/디버그 훅 (콘솔에서 RD.debug.G 등으로 접근)
RD.debug = {
  scene: null,
  attach(s) { this.scene = s; },
  get logic() { return this.scene && this.scene.logic; },
  get G() { return this.logic && this.logic.G; },
  step(sec, dt) { dt = dt || 1 / 30; const L = this.logic; for (let t = 0; t < sec && L.G.mode === 'playing'; t += dt) L.update(dt); },
};

RD.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#050409',
  pixelArt: false,                  // 텍스트·도형은 부드럽게 (픽셀아트 스프라이트만 PreloadScene 에서 NEAREST 처리)
  antialias: true,
  banner: false,
  audio: { noAudio: true },          // 아직 사운드 없음 (추가 시 제거)
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: RD.W,
    height: RD.H,
  },
  input: { activePointers: 3 },
  scene: [RD.BootScene, RD.PreloadScene, RD.TitleScene, RD.LobbyScene, RD.GalleryScene, RD.CapsuleScene, RD.GameScene, RD.UIScene, RD.GameOverScene],
});
