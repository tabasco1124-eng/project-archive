/* 터치/마우스 버튼 (누르고 있다가 버튼 위에서 떼면 실행) */
window.RD = window.RD || {};

RD.UIButton = class UIButton {
  constructor(scene, r, opts) {
    this.scene = scene; this.r = r;
    this.scheme = opts.scheme; this.big = !!opts.big; this.onClick = opts.onClick;
    this.enabled = true; this.pressed = false;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, S = RD.util.textStyle;
    this.shadow = scene.add.image(r.x - 4, r.y + 4, RD.Textures.buttonShadow(scene, r.w, r.h)).setOrigin(0);
    this.bg = scene.add.image(r.x - 4, r.y - 4, RD.Textures.button(scene, this.scheme, r.w, r.h, true)).setOrigin(0);
    const tc = RD.Textures.SCHEMES[this.scheme][2];
    this.tc = tc;
    this.label = scene.add.text(cx, cy, '', S(opts.labelSize || (this.big ? 60 : 48), tc, tc === '#ffffff' ? 6 : 0)).setOrigin(0.5);
    this.sub = scene.add.text(cx, cy + 40, '', S(28, tc === '#ffffff' ? '#ffffffd9' : '#4a2600')).setOrigin(0.5);
    this.icon = scene.add.graphics();
    this.zone = scene.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', () => { this.pressed = true; this.layout(); });
    this.zone.on('pointerout', () => { this.pressed = false; this.layout(); });
    this.zone.on('pointerup', () => {
      const was = this.pressed; this.pressed = false; this.layout();
      if (was && this.onClick) this.onClick();
    });
    this.parts = [this.shadow, this.bg, this.label, this.sub, this.icon, this.zone];
    this.iconName = null;
    this.layout();
  }
  set(label, sub, enabled, iconName) {
    const S = RD.util.setText;
    S(this.label, label || '');
    S(this.sub, sub || '');
    if (enabled !== this.enabled || iconName !== this.iconName) {
      this.enabled = enabled; this.iconName = iconName;
      this.bg.setTexture(RD.Textures.button(this.scene, this.scheme, this.r.w, this.r.h, enabled));
      this.label.setColor(enabled ? this.tc : '#6f6680');
      this.label.setStroke('#000000', enabled && this.tc === '#ffffff' ? 6 : 0);
      this.sub.setColor(enabled ? (this.tc === '#ffffff' ? '#ffffffd9' : '#4a2600') : '#5d5570');
      this.layout();
    }
  }
  layout() {
    const r = this.r, off = this.pressed ? 6 : 0, cx = r.x + r.w / 2, cy = r.y + r.h / 2 + off;
    this.bg.y = r.y - 4 + off;
    const hasSub = this.sub.text !== '';
    this.label.setPosition(cx, hasSub ? cy - 24 : cy + 2);
    this.sub.setPosition(cx, cy + 40);
    const g = this.icon; g.clear();
    if (this.iconName) {
      g.fillStyle(this.enabled ? 0xffffff : 0x6f6680, 1);
      if (this.iconName === 'pause') { g.fillRect(cx - 16, cy - 18, 10, 36); g.fillRect(cx + 6, cy - 18, 10, 36); }
      else g.fillTriangle(cx - 12, cy - 20, cx + 20, cy, cx - 12, cy + 20);
    }
  }
  setDepth(d) { this.parts.forEach(p => p.setDepth(d)); return this; }
};
