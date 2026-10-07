/* =====================================================================
 * 플레이스홀더 텍스처 생성 (부팅 시 1회)
 *  - 적 / 투사체 / 작은 아이콘 : Phaser Graphics.generateTexture
 *  - 유닛(한글 이름 포함), 배경, 버튼(그라데이션) : CanvasTexture (2D 캔버스)
 *  - 에셋 매니페스트에 스프라이트가 있으면 그 텍스처(spr_unit_<id>, spr_enemy_<id>)가 우선
 * ===================================================================== */
window.RD = window.RD || {};

RD.Textures = (() => {
  const { TAU, isLight, pathPos } = RD.util;
  const UNIT_R = 38, UNIT_RL = 66;          // 필드 / 정보창 유닛 반지름

  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function canvasTex(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return key;
    const tex = scene.textures.createCanvas(key, w, h);
    draw(tex.getContext(), w, h);
    tex.refresh();
    return key;
  }
  function gfxTex(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return key;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
    return key;
  }
  const hex = c => parseInt(c.slice(1), 16);

  // ── 맵 배경 (바닐라 버전 buildBackground 와 동일) ──
  function makeBackground(scene) {
    const W = RD.W, H = RD.H, P = RD.PATH, PW = RD.PW, PH = RD.PH, UI = RD.UI, GRID = RD.GRID;
    canvasTex(scene, 'bg_map', W, H, c => {
      let g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1a1124'); g.addColorStop(0.6, '#110c19'); g.addColorStop(1, '#08060d');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      let seed = 1337;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(200,180,255,' + (0.03 + rnd() * 0.06) + ')'; c.fillRect(rnd() * W, rnd() * H, 4, 4); }
      const hw = P.w / 2;
      c.fillStyle = '#2d2336'; c.fillRect(P.l - hw, P.t - hw, PW + P.w, PH + P.w);
      const tmp = { x: 0, y: 0 };
      for (let i = 0; i < 260; i++) {
        pathPos(rnd() * RD.PERIM, (rnd() - 0.5) * (P.w - 20), tmp);
        c.fillStyle = 'rgba(255,240,220,' + (0.025 + rnd() * 0.04) + ')';
        rrect(c, tmp.x - 8, tmp.y - 6, 12 + rnd() * 12, 8 + rnd() * 8, 4); c.fill();
      }
      g = c.createRadialGradient(W / 2, (P.t + P.b) / 2, 80, W / 2, (P.t + P.b) / 2, 640);
      g.addColorStop(0, '#1f1a2b'); g.addColorStop(1, '#130f1b');
      c.fillStyle = g; c.fillRect(P.l + hw, P.t + hw, PW - P.w, PH - P.w);
      c.lineWidth = 4; c.strokeStyle = '#4c3b5c'; c.strokeRect(P.l - hw, P.t - hw, PW + P.w, PH + P.w);
      c.strokeStyle = '#3b2e48'; c.strokeRect(P.l + hw, P.t + hw, PW - P.w, PH - P.w);
      c.setLineDash([20, 24]); c.strokeStyle = 'rgba(255,210,150,0.10)'; c.strokeRect(P.l, P.t, PW, PH); c.setLineDash([]);
      c.fillStyle = 'rgba(255,210,150,0.18)';
      for (const [x, y, a] of [[W / 2, P.t, 0], [P.r, (P.t + P.b) / 2, Math.PI / 2], [W / 2, P.b, Math.PI], [P.l, (P.t + P.b) / 2, -Math.PI / 2]]) {
        c.save(); c.translate(x, y); c.rotate(a);
        c.beginPath(); c.moveTo(18, 0); c.lineTo(-12, -16); c.lineTo(-12, 16); c.closePath(); c.fill(); c.restore();
      }
      for (let r = 0; r < GRID.rows; r++) for (let col = 0; col < GRID.cols; col++) {
        const x = GRID.x + col * GRID.cell, y = GRID.y + r * GRID.cell;
        rrect(c, x + 6, y + 6, GRID.cell - 12, GRID.cell - 12, 16);
        c.fillStyle = 'rgba(255,255,255,0.025)'; c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.045)'; c.lineWidth = 2; c.stroke();
      }
      g = c.createLinearGradient(0, 0, 0, UI.hudH);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.15)');
      c.fillStyle = g; c.fillRect(0, 0, W, UI.hudH);
      g = c.createLinearGradient(0, UI.panelY, 0, H);
      g.addColorStop(0, '#1b1426'); g.addColorStop(1, '#0c0912');
      c.fillStyle = g; c.fillRect(0, UI.panelY, W, H - UI.panelY);
      c.fillStyle = '#6b4f2a'; c.fillRect(0, UI.panelY, W, 4);
      c.fillStyle = 'rgba(255,200,120,0.12)'; c.fillRect(0, UI.panelY + 4, W, 2);
    });
  }

  // ── 유닛 몸통 (원 + 한글 2글자) ──
  function makeUnit(scene, t, key, R) {
    const S = 2 * (R + 16);
    canvasTex(scene, key, S, S, c => {
      const x = S / 2, y = S / 2;
      c.beginPath(); c.arc(x, y, R, 0, TAU); c.fillStyle = t.color; c.fill();
      c.beginPath(); c.arc(x - R * 0.3, y - R * 0.35, R * 0.45, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.16)'; c.fill();
      const light = isLight(t.color), size = Math.round(26 * R / UNIT_R);
      c.font = `bold ${size}px ${RD.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (!light) { c.lineWidth = 6 * R / UNIT_R; c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(t.short, x, y + 2); }
      c.fillStyle = light ? '#2a2030' : '#ffffff'; c.fillText(t.short, x, y + 2);
    });
  }
  // ── 등급 테두리 + 등급 점 (흰색 → 등급 색으로 tint) ──
  function makeFrame(scene, key, R, grade) {
    const S = 2 * (R + 16), k = R / UNIT_R;
    canvasTex(scene, key, S, S, c => {
      const x = S / 2, y = S / 2;
      c.beginPath(); c.arc(x, y, R, 0, TAU); c.lineWidth = 6 * k; c.strokeStyle = '#ffffff'; c.stroke();
      c.fillStyle = '#ffffff';
      for (let i = 0; i < grade; i++) {
        c.beginPath(); c.arc(x + (i - (grade - 1) / 2) * 10 * k, y + R + 6 * k, 3.6 * k, 0, TAU); c.fill();
      }
    });
  }

  // ── 적 (Graphics) ──
  function shapePoints(shape, cx, cy, s) {
    if (shape === 'diamond') return [{ x: cx, y: cy - s * 1.1 }, { x: cx + s, y: cy }, { x: cx, y: cy + s * 1.1 }, { x: cx - s, y: cy }];
    if (shape === 'hex') { const pts = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; pts.push({ x: cx + Math.cos(a) * s, y: cy + Math.sin(a) * s }); } return pts; }
    if (shape === 'triangle') return [{ x: cx, y: cy - s * 1.1 }, { x: cx + s, y: cy + s * 0.75 }, { x: cx - s, y: cy + s * 0.75 }];
    return null;
  }
  function makeEnemy(scene, type, boss) {
    const s = type.size, S = Math.ceil(s * 2.5 + 12);
    gfxTex(scene, 'enemy_' + type.id, S, S, g => {
      const cx = S / 2, cy = S / 2;
      g.fillStyle(hex(type.color), 1);
      g.lineStyle(boss ? 6 : 3, boss ? 0xff1744 : 0x000000, boss ? 1 : 0.6);
      if (type.shape === 'circle') { g.fillCircle(cx, cy, s); g.strokeCircle(cx, cy, s); }
      else if (type.shape === 'square') { g.fillRect(cx - s * 0.85, cy - s * 0.85, s * 1.7, s * 1.7); g.strokeRect(cx - s * 0.85, cy - s * 0.85, s * 1.7, s * 1.7); }
      else { const pts = shapePoints(type.shape, cx, cy, s); g.fillPoints(pts, true); g.strokePoints(pts, true); }
      g.fillStyle(boss ? 0xff1744 : 0x1a1a1a, 1);
      const ey = cy - s * 0.15, ex = s * 0.32, er = Math.max(3.2, s * 0.13);
      g.fillCircle(cx - ex, ey, er); g.fillCircle(cx + ex, ey, er);
    });
  }

  // ── 투사체 (Graphics) ──
  function makeProjectiles(scene) {
    gfxTex(scene, 'p_arrow', 40, 16, g => {
      g.lineStyle(4, 0xe6d8a8, 1); g.lineBetween(2, 8, 30, 8);
      g.fillStyle(0xe6d8a8, 1); g.fillTriangle(38, 8, 26, 1, 26, 15);
    });
    gfxTex(scene, 'p_bullet', 16, 6, g => { g.fillStyle(0xffee58, 1); g.fillRect(0, 0, 16, 6); });
    gfxTex(scene, 'p_missile', 48, 20, g => {
      g.fillStyle(0xffab40, 0.6); g.fillCircle(10, 10, 9);
      g.fillStyle(0xcfd8dc, 1); g.fillRect(12, 4, 24, 12);
      g.fillStyle(0xff5252, 1); g.fillTriangle(44, 10, 36, 4, 36, 16);
    });
  }
  // 마법구/화염/신성탄: 색별로 필요할 때 생성 (반지름 20 기준, 스프라이트 scale 로 크기 조절)
  function orb(scene, color) {
    return gfxTex(scene, 'orb_' + color, 80, 80, g => {
      const c = hex(color);
      g.fillStyle(c, 0.35); g.fillCircle(34, 40, 36);
      g.fillStyle(c, 1); g.fillCircle(40, 40, 20);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(40, 40, 8);
    });
  }

  // ── 작은 공용 아이콘 ──
  function makeMisc(scene) {
    canvasTex(scene, 'shadow', 72, 28, c => { c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(36, 14, 32, 12, 0, 0, TAU); c.fill(); });
    gfxTex(scene, 'halo', 100, 100, g => { g.fillStyle(0xffffff, 1); g.fillCircle(50, 50, UNIT_R + 10); });
    gfxTex(scene, 'badge', 32, 32, g => {
      g.fillStyle(0x43a047, 1); g.fillCircle(16, 16, 13); g.lineStyle(3, 0x0b2e0d, 1); g.strokeCircle(16, 16, 13);
      g.fillStyle(0xffffff, 1); g.fillTriangle(16, 8.4, 23.2, 20.8, 8.8, 20.8);
    });
    canvasTex(scene, 'coin', 48, 48, c => {
      c.beginPath(); c.arc(24, 24, 20, 0, TAU); c.fillStyle = '#ffc107'; c.fill();
      c.lineWidth = 4; c.strokeStyle = '#8a5a00'; c.stroke();
      c.font = `bold 22px ${RD.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#6d4300'; c.fillText('G', 24, 26);
    });
    canvasTex(scene, 'mineral', 48, 48, c => {   // 광물: 육각 크리스탈
      const pts = [[24, 3], [40, 16], [36, 42], [12, 42], [8, 16]];
      c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
      const g = c.createLinearGradient(8, 3, 40, 42); g.addColorStop(0, '#e1f8ff'); g.addColorStop(0.5, '#4fc3f7'); g.addColorStop(1, '#1565c0');
      c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = '#0b2f5c'; c.stroke();
      c.beginPath(); c.moveTo(24, 3); c.lineTo(20, 18); c.lineTo(24, 42); c.moveTo(20, 18); c.lineTo(8, 16); c.moveTo(20, 18); c.lineTo(40, 16);
      c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.stroke();
    });
  }

  // ── 버튼 배경 (둥근 사각형 + 그라데이션) ──
  const SCHEMES = {
    gold:  ['#ffca28', '#e65100', '#3e2000'],
    green: ['#66bb6a', '#1b5e20', '#ffffff'],
    red:   ['#ef5350', '#8e1b1b', '#ffffff'],
    warrior: ['#e0874f', '#7a3410', '#ffffff'],
    archer:  ['#6cc04a', '#25601a', '#ffffff'],
    wizard:  ['#8c7bff', '#3b23a8', '#ffffff'],
    mine:  ['#4f8cff', '#1a3590', '#ffffff'],
    dark:  ['#3a3150', '#1d1729', '#ffffff'],
  };
  function button(scene, scheme, w, h, enabled) {
    const key = `btn_${scheme}_${w}x${h}_${enabled ? 1 : 0}`;
    return canvasTex(scene, key, w + 8, h + 8, c => {
      rrect(c, 4, 4, w, h - 2, 28);
      if (enabled) { const g = c.createLinearGradient(0, 4, 0, 4 + h); g.addColorStop(0, SCHEMES[scheme][0]); g.addColorStop(1, SCHEMES[scheme][1]); c.fillStyle = g; }
      else c.fillStyle = '#2a2433';
      c.fill();
      c.lineWidth = 4; c.strokeStyle = enabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'; c.stroke();
    });
  }
  function buttonShadow(scene, w, h) {
    return canvasTex(scene, `btnsh_${w}x${h}`, w + 8, h + 8, c => { rrect(c, 4, 4, w, h, 28); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fill(); });
  }

  function generateAll(scene) {
    makeBackground(scene);
    for (const t of RD.UNITS) { makeUnit(scene, t, 'unit_' + t.id, UNIT_R); makeUnit(scene, t, 'unitL_' + t.id, UNIT_RL); }
    for (let g = 0; g < RD.GRADES.length; g++) { makeFrame(scene, 'frame_' + g, UNIT_R, g); makeFrame(scene, 'frameL_' + g, UNIT_RL, g); }
    for (const e of RD.ENEMIES) makeEnemy(scene, e, false);
    for (const b of RD.BOSSES) makeEnemy(scene, b, true);
    makeProjectiles(scene);
    makeMisc(scene);
  }

  // ── 스프라이트 오버라이드 헬퍼 ──
  // 유닛 몸통 GameObject 생성: 매니페스트 스프라이트가 있으면 Sprite(+idle 애니), 없으면 플레이스홀더 Image
  function unitBody(scene, t, large) {
    const key = 'spr_unit_' + t.id, a = RD.ASSETS.units[t.id];
    if (a && scene.textures.exists(key)) {
      const spr = scene.add.sprite(0, 0, key);
      const fh = spr.frame.realHeight || spr.height;
      spr.setScale((a.scale || (UNIT_R * 2.3) / fh) * (large ? UNIT_RL / UNIT_R : 1));
      if (scene.anims.exists(key + '_idle')) spr.play(key + '_idle');
      spr.rdSprite = { key, attack: scene.anims.exists(key + '_attack') ? key + '_attack' : null, idle: scene.anims.exists(key + '_idle') ? key + '_idle' : null };
      return spr;
    }
    return scene.add.image(0, 0, (large ? 'unitL_' : 'unit_') + t.id);
  }
  function enemySprite(scene, type) {
    const key = 'spr_enemy_' + type.id, a = RD.ASSETS.enemies[type.id];
    if (a && scene.textures.exists(key)) {
      const spr = scene.add.sprite(0, 0, key);
      const fh = spr.frame.realHeight || spr.height;
      spr.setScale(a.scale || (type.size * 2.4) / fh);
      if (scene.anims.exists(key + '_walk')) spr.play(key + '_walk');
      spr.rdSprite = { key };
      return spr;
    }
    return scene.add.sprite(0, 0, 'enemy_' + type.id);
  }

  return { UNIT_R, UNIT_RL, generateAll, orb, button, buttonShadow, unitBody, enemySprite, SCHEMES };
})();
