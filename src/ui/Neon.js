/* =====================================================================
 * 네온 UI 공용 부품 (타이틀 / 로비 / 갤러리 / 캡슐 씬)
 *  RD.Neon.button(scene, rect, label, sub, color, onClick) : 네온 외곽선 버튼
 *  RD.Neon.background(scene, horizonY)                     : 원근 그리드 + 데이터 입자 배경 (update(dt) 호출)
 *  RD.Neon.header(scene, title, en, onBack)                 : 상단 제목 바 + [◀ 로비] 버튼
 *  씬에 scene.modal 이 켜져 있으면(팝업 열림) 버튼이 눌리지 않음 (팝업 안의 버튼은 opts.modal = true)
 *  GPU 부담을 줄이려고 postFX 없이 Graphics 선과 반투명 채우기만 사용
 * ===================================================================== */
window.RD = window.RD || {};

RD.Neon = (() => {
  const hexStr = c => '#' + c.toString(16).padStart(6, '0');

  // 네온 외곽선 버튼 (누르고 있다가 버튼 위에서 떼면 실행). 반환: { zone, setLabel(label, sub), setEnabled(on), destroy() }
  function button(scene, r, label, sub, color, onClick, opts) {
    opts = opts || {};
    const S = RD.util.textStyle, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const parts = [];
    const g = scene.add.graphics();
    let enabled = true, pressed = false, hover = false, col = color;
    const big = opts.size || (sub ? 60 : 44);
    const txt = scene.add.text(cx, cy, label, S(big, '#ffffff')).setOrigin(0.5).setShadow(0, 0, hexStr(col), 18, false, true);
    const subTxt = scene.add.text(cx, cy, sub || '', S(opts.subSize || 24, hexStr(col), 0, 'normal')).setOrigin(0.5).setLetterSpacing(opts.subSpacing === undefined ? 10 : opts.subSpacing);
    const draw = () => {
      g.clear();
      const off = pressed ? 4 : 0, c = enabled ? col : 0x4d5b78;
      if (opts.backing) g.fillStyle(0x07060f, 0.88).fillRect(r.x, r.y + off, r.w, r.h);   // 배경 그리드 위에서 글자가 잘 보이게
      g.fillStyle(c, pressed ? 0.35 : hover ? 0.22 : 0.12).fillRect(r.x, r.y + off, r.w, r.h);
      g.lineStyle(10, c, enabled ? 0.18 : 0.08).strokeRect(r.x - 4, r.y - 4 + off, r.w + 8, r.h + 8);
      g.lineStyle(4, c, 1).strokeRect(r.x, r.y + off, r.w, r.h);
      const k = Math.min(26, r.h / 4);
      g.lineStyle(6, 0xffffff, enabled ? 0.9 : 0.3);
      [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]].forEach(([x, y, dx, dy]) => {
        g.lineBetween(x, y + off, x + k * dx, y + off); g.lineBetween(x, y + off, x, y + off + k * dy);
      });
      const hasSub = subTxt.text !== '';
      txt.y = (hasSub ? cy - r.h * 0.13 : cy) + off;
      subTxt.y = cy + r.h * 0.25 + off;
      txt.setAlpha(enabled ? 1 : 0.45); subTxt.setAlpha(enabled ? 1 : 0.45);
    };
    const zone = scene.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { hover = true; draw(); });
    zone.on('pointerdown', () => { pressed = true; draw(); });
    zone.on('pointerout', () => { pressed = false; hover = false; draw(); });
    zone.on('pointerup', () => {
      const was = pressed; pressed = false; draw();
      if (was && enabled && (opts.modal || !scene.modal)) onClick();
    });
    parts.push(g, txt, subTxt, zone);
    draw();
    const api = {
      zone, parts,
      setLabel(l, s) { if (l !== undefined) txt.setText(l); if (s !== undefined) subTxt.setText(s); draw(); return api; },
      setEnabled(on) { if (enabled !== on) { enabled = on; draw(); } return api; },
      setColor(c) { col = c; txt.setShadow(0, 0, hexStr(c), 18, false, true); subTxt.setColor(hexStr(c)); draw(); return api; },
      setDepth(d) { parts.forEach(p => p.setDepth(d)); return api; },
      addTo(container) { container.add(parts); return api; },
      destroy() { parts.forEach(p => p.destroy()); },
    };
    return api;
  }

  // 원근 네온 그리드 + 흘러가는 데이터 입자. 반환 객체의 update(dt) 를 씬 update 에서 호출
  function background(scene, horizonY, opts) {
    opts = opts || {};
    const W = RD.W, H = RD.H, hy = horizonY;
    scene.cameras.main.setBackgroundColor('#050409');
    scene.add.graphics().fillGradientStyle(0x0a0618, 0x0a0618, 0x050409, 0x050409, 1).fillRect(0, 0, W, H);
    const grid = scene.add.graphics();
    const bits = [];
    for (let i = 0; i < (opts.bits || 40); i++) {
      const b = scene.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 4, Phaser.Math.Between(8, 26),
        Phaser.Math.RND.pick([0x00e5ff, 0xff2bd6, 0x7c4dff]), Phaser.Math.FloatBetween(0.12, opts.bitAlpha || 0.5));
      b.speed = Phaser.Math.FloatBetween(40, 140);
      bits.push(b);
    }
    let t = 0;
    const dim = opts.dim || 1;
    return {
      update(dt) {
        t += dt;
        const g = grid;
        g.clear();
        g.lineStyle(1, 0x3a2a7a, 0.25 * dim);
        for (let x = 0; x <= W; x += 90) g.lineBetween(x, 0, x, hy);
        for (let y = 0; y <= hy; y += 90) g.lineBetween(0, y, W, y);
        g.lineStyle(14, 0xff2bd6, 0.12 * dim).lineBetween(0, hy, W, hy);
        g.lineStyle(3, 0xff2bd6, 0.9 * dim).lineBetween(0, hy, W, hy);
        const vx = W / 2;
        g.lineStyle(2, 0x00e5ff, 0.45 * dim);
        for (let i = -12; i <= 12; i++) g.lineBetween(vx + i * 30, hy, vx + i * 260, H);
        const scroll = (t * 0.6) % 1;
        for (let i = 0; i < 14; i++) {
          const p = (i + scroll) / 14, y = hy + (H - hy) * p * p;
          g.lineStyle(2, 0x00e5ff, (0.15 + 0.6 * p) * dim).lineBetween(0, y, W, y);
        }
        for (const b of bits) {
          b.y -= b.speed * dt;
          if (b.y < -30) { b.y = H + 30; b.x = Phaser.Math.Between(0, W); }
        }
      },
    };
  }

  // 상단 제목 바 (높이 200): 왼쪽 [◀] 뒤로 버튼, 가운데 제목. 반환 { g, back }
  function header(scene, title, en, onBack) {
    const W = RD.W, S = RD.util.textStyle;
    const g = scene.add.graphics().setDepth(50);
    g.fillStyle(0x07060f, 0.96).fillRect(0, 0, W, 200);
    g.lineStyle(2, 0x00e5ff, 0.6).lineBetween(0, 200, W, 200);
    g.lineStyle(8, 0x00e5ff, 0.12).lineBetween(0, 202, W, 202);
    const t1 = scene.add.text(W / 2, 92, title, S(56, '#ffffff')).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 16, false, true).setDepth(51);
    const t2 = scene.add.text(W / 2, 152, en, S(22, '#00e5ff', 0, 'normal')).setOrigin(0.5).setLetterSpacing(8).setDepth(51);
    const back = button(scene, { x: 30, y: 50, w: 150, h: 100 }, '◀', '', 0x00e5ff, onBack, { size: 44 }).setDepth(52);
    return { g, t1, t2, back };
  }

  // 화면 아래에서 떠올랐다 사라지는 짧은 알림
  function toast(scene, text, color, y) {
    const S = RD.util.textStyle;
    const t = scene.add.text(RD.W / 2, y || 1700, text, S(34, color || '#ffffff', 6)).setOrigin(0.5).setDepth(300);
    scene.tweens.add({ targets: t, y: t.y - 60, alpha: 0, delay: 1100, duration: 500, onComplete: () => t.destroy() });
    return t;
  }

  return { button, background, header, toast, hexStr };
})();

/* 백업 코드 UI (타이틀 메뉴 · 로비 [백업] 공용). 저장 형식은 RD.Save.exportString / importString
 *  copy: 클립보드에 복사 (막히면 코드가 적힌 입력창을 띄워 직접 복사)
 *  load: 코드 입력 → 덮어쓰기 확인 → 복원. 성공하면 true (실패 사유는 toast) */
RD.BackupUI = {
  copy(scene, y) {
    const code = RD.Save.exportString();
    const fallback = () => window.prompt('아래 코드를 전체 선택해 복사하세요', code);
    const ok = () => RD.Neon.toast(scene, '복사 완료! 메모장 등에 붙여넣어 보관하세요', '#7dffb0', y);
    try {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(ok, fallback);
      else fallback();
    } catch (e) { fallback(); }
  },
  load(scene, y, skipConfirm) {
    const code = window.prompt('게임 코드를 붙여넣으세요 (PA1- 로 시작)');
    if (!code) return false;
    if (!skipConfirm && !window.confirm('지금 데이터를 코드의 데이터로 덮어씁니다. 계속할까요?')) return false;
    try { RD.Save.importString(code); } catch (e) { RD.Neon.toast(scene, `불러오기 실패: ${e.message}`, '#ff8a80', y); return false; }
    return true;
  },
  // 진행한 기록이 있는지 (새 게임 시 덮어쓰기 경고용)
  hasProgress() {
    const d = RD.Save.data;
    return d.stats.runs > 0 || d.meta.opened > 0 || d.meta.fragments > 0 || d.codex.seen.length > 0;
  },
};
