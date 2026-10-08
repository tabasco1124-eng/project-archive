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
    const sc = RD.Textures.SCHEMES[this.scheme][2], tc = opts.labelColor || sc;
    this.tc = tc; this.light = sc === '#ffffff';      // 밝은 글자(외곽선 있음) 스킴인지
    this.dimSub = opts.dimSubColor || '#5d5570';      // 비활성 시 보조 글자 색
    this.label = scene.add.text(cx, cy, '', S(opts.labelSize || (this.big ? 60 : 48), tc, this.light ? 6 : 0)).setOrigin(0.5);
    this.sub = scene.add.text(cx, cy + 40, '', S(opts.subSize || 28, this.light ? '#ffffffd9' : '#4a2600')).setOrigin(0.5);
    this.icon = scene.add.graphics();
    this.zone = scene.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
    // opts.repeat = { delay, interval } (ms): 꾹 누르고 있으면 delay 뒤부터 interval마다 반복 실행.
    // onClick이 거짓 값을 돌려주면(골드 부족, 자리 없음 등) 반복을 멈춤. 짧게 누르면 기존처럼 한 번만 실행.
    this.repeat = opts.repeat || null; this.holdTimer = null; this.repeated = false;
    this.zone.on('pointerdown', () => {
      this.pressed = true; this.layout();
      if (this.repeat) this.startHold();
    });
    this.zone.on('pointerout', () => { this.pressed = false; this.stopHold(); this.layout(); });
    this.zone.on('pointerup', () => {
      const was = this.pressed, repeated = this.repeated;
      this.pressed = false; this.stopHold(); this.layout();
      if (was && !repeated && this.onClick) this.onClick();
    });
    // 버튼 밖(캔버스 밖 포함)에서 손을 떼도 반복을 멈춤
    if (this.repeat) {
      const end = (p, over) => {
        if (Array.isArray(over) && over.includes(this.zone)) return;   // 버튼 위에서 뗀 경우는 zone의 pointerup이 처리
        if (this.holdTimer) { this.pressed = false; this.stopHold(); this.layout(); } };
      scene.input.on('pointerup', end); scene.input.on('pointerupoutside', end); scene.input.on('gameout', end);
      scene.events.once('shutdown', () => this.stopHold());
    }
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
      this.label.setStroke('#000000', enabled && this.light ? 6 : 0);
      this.sub.setColor(enabled ? (this.light ? '#ffffffd9' : '#4a2600') : this.dimSub);
      this.layout();
    }
  }
  layout() {
    const r = this.r, off = this.pressed ? 6 : 0, cx = r.x + r.w / 2, cy = r.y + r.h / 2 + off;
    this.bg.y = r.y - 4 + off;
    const hasSub = this.sub.text !== '', k = Math.min(1, r.h / 168);   // 낮은 버튼은 글자 간격을 줄임
    this.label.setPosition(cx, hasSub ? cy - 24 * k : cy + 2);
    this.sub.setPosition(cx, cy + 40 * k);
    const g = this.icon; g.clear();
    if (this.iconName) {
      g.fillStyle(this.enabled ? 0xffffff : 0x6f6680, 1);
      if (this.iconName === 'pause') { g.fillRect(cx - 16, cy - 18, 10, 36); g.fillRect(cx + 6, cy - 18, 10, 36); }
      else g.fillTriangle(cx - 12, cy - 20, cx + 20, cy, cx - 12, cy + 20);
    }
  }
  // 실제 시간 기준 타이머: 프레임이 떨어져도(폰 과부하) 일정한 속도로 반복
  startHold() {
    this.stopHold(); this.repeated = false;
    const tick = () => {
      this.holdTimer = null;
      if (!this.pressed || !this.onClick) return;
      this.repeated = true;
      if (!this.onClick()) return;
      this.holdTimer = setTimeout(tick, this.repeat.interval);
    };
    this.holdTimer = setTimeout(tick, this.repeat.delay);
  }
  stopHold() { if (this.holdTimer) { clearTimeout(this.holdTimer); this.holdTimer = null; } }
  setDepth(d) { this.parts.forEach(p => p.setDepth(d)); return this; }
  // 숨기면 터치도 받지 않음
  setVisible(v) {
    if (this.visible === v) return this;
    this.visible = v;
    this.parts.forEach(p => p.setVisible(v));
    if (this.zone.input) this.zone.input.enabled = v;
    if (!v) { this.pressed = false; this.stopHold(); }
    return this;
  }
};
