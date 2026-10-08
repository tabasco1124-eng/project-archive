/* GameOverScene: 결과 + 다시 하기 (GameScene/UIScene 위에 겹쳐서 실행) */
window.RD = window.RD || {};

RD.GameOverScene = class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
  create() {
    const W = RD.W, H = RD.H, S = RD.util.textStyle, fmt = RD.util.fmt;
    const G = this.scene.get('GameScene').logic.G;
    const g = this.add.graphics();
    g.fillStyle(0x05030a, 0.72).fillRect(0, 0, W, H);
    g.fillStyle(0x1f1530, 1).fillRoundedRect(80, 520, W - 160, 880, 44);
    g.lineStyle(6, 0x8a6a3a, 1).strokeRoundedRect(80, 520, W - 160, 880, 44);
    this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();   // 아래 화면 터치 차단용

    this.add.text(W / 2, 660, '게임 오버', S(92, '#ff5252', 10)).setOrigin(0.5);
    this.add.text(W / 2, 784, G.overReason, S(32, '#f0e6ff', 0, 'normal')).setOrigin(0.5);
    this.add.text(W / 2, 900, `도달 라운드  ${G.round}`, S(48, '#ffe082')).setOrigin(0.5);
    this.add.text(W / 2, 984, `처치 ${fmt(G.kills)}   ·   보유 유닛 ${G.units.length}`, S(34, '#c9bde0', 0, 'normal')).setOrigin(0.5);
    const best = G.units.reduce((m, u) => (!m || u.type.grade > m.grade || (u.type.grade === m.grade && u.type.hidden) ? u.type : m), null);
    if (best) this.add.text(W / 2, 1056, `최고 등급: ${RD.unitLevelName(best)}  ${best.name}`, S(34, RD.unitTextColor(best))).setOrigin(0.5);

    const restart = () => { if (!this.done) { this.done = true; this.scene.start('GameScene'); } };
    const btn = new RD.UIButton(this, RD.UI.btnRestart, { scheme: 'gold', labelSize: 52, onClick: restart });
    btn.set('다시 하기', '', true);
    this.input.keyboard && this.input.keyboard.on('keydown', e => { if (e.key === 'Enter') restart(); });
  }
};
