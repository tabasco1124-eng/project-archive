/* =====================================================================
 * GameScene: 맵 / 적 / 유닛 / 투사체 / 이펙트 렌더링 + 필드 입력(선택, 드래그 이동/교환)
 * 규칙과 상태는 RD.GameLogic 이 담당하고, 이 씬은 상태를 화면 오브젝트와 동기화한다.
 * HUD 와 버튼은 병렬 실행되는 UIScene 이 담당.
 * ===================================================================== */
window.RD = window.RD || {};

RD.GameScene = class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this.logic = new RD.GameLogic({ speed: this.registry.get('speed') || 1, onGameOver: () => this.onGameOver() });
    RD.debug.attach(this);

    this.add.image(0, 0, 'bg_map').setOrigin(0).setDepth(0);
    this.gUnder = this.add.graphics().setDepth(1);     // 포탈, 사거리, 그림자
    this.gOver = this.add.graphics().setDepth(6);      // 체력바, 이펙트, 드래그 표시

    this.unitViews = new Map();    // unit → Container
    this.enemyViews = new Map();   // enemy → Sprite
    this.projViews = new Map();    // projectile → Image
    this.floatViews = new Map();   // float → Text
    this.projPool = [];
    this.floatPool = [];
    this.drag = null;
    this.dragGhost = null;

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    this.events.once('shutdown', () => {
      this.registry.set('speed', this.logic.G.speed);
      this.input.off('pointerdown', this.onPointerDown, this);
      this.input.off('pointermove', this.onPointerMove, this);
      this.input.off('pointerup', this.onPointerUp, this);
      this.input.off('pointerupoutside', this.onPointerUp, this);
      this.scene.stop('UIScene');
      this.scene.stop('GameOverScene');
    });
    this.scene.launch('UIScene');
  }

  onGameOver() {
    this.registry.set('speed', this.logic.G.speed);
    this.endDrag();
    this.scene.launch('GameOverScene');
  }

  // ── 입력: 필드 영역만 처리 (HUD / 패널은 UIScene) ──
  inField(p) { return p.y > RD.UI.hudH && p.y < RD.UI.panelY; }
  onPointerDown(p) {
    const G = this.logic.G;
    if (G.mode !== 'playing' || this.drag || !this.inField(p)) return;
    const c = RD.util.cellAt(p);
    const u = c ? G.grid[c.row][c.col] : null;
    this.drag = { pid: p.id, unit: u, sx: p.x, sy: p.y, x: p.x, y: p.y, dragging: false };
  }
  onPointerMove(p) {
    const d = this.drag;
    if (!d || p.id !== d.pid) return;
    d.x = p.x; d.y = p.y;
    if (d.unit && !d.dragging && Math.hypot(p.x - d.sx, p.y - d.sy) > 20) {
      d.dragging = true;
      this.logic.G.selected = d.unit;
    }
  }
  onPointerUp(p) {
    const d = this.drag;
    if (!d || p.id !== d.pid) return;
    d.x = p.x; d.y = p.y;
    this.finishDrag();
  }
  finishDrag() {
    const d = this.drag, L = this.logic, G = L.G;
    if (!d) return;
    if (G.mode === 'playing') {
      if (d.unit && !d.unit.removed) {
        if (d.dragging) {
          const c = RD.util.cellAt(d);
          if (c) L.moveOrSwap(d.unit, c.col, c.row);
        }
        G.selected = d.unit;
      } else if (!d.unit) {
        G.selected = null;
      }
    }
    this.endDrag();
  }
  endDrag() {
    this.drag = null;
    if (this.dragGhost) { this.dragGhost.destroy(); this.dragGhost = null; }
  }

  // ── 메인 루프 ──
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000), L = this.logic, G = L.G;
    if (G.mode === 'playing') for (let i = 0; i < G.speed && G.mode === 'playing'; i++) L.update(dt);

    // 포인터가 다른 씬 위에서 떼어져 up 이벤트를 놓친 경우 대비
    if (this.drag) {
      const pt = this.input.manager.pointers.find(q => q.id === this.drag.pid);
      if (!pt || !pt.isDown) this.finishDrag();
      else if (this.drag.unit && this.drag.unit.removed) this.endDrag();
    }

    this.syncUnits(time);
    this.syncEnemies(time);
    this.syncProjectiles();
    this.syncFloats();
    this.drawUnder(time);
    this.drawOver(time);
    this.syncDragGhost();
  }

  // ── 유닛 ──
  createUnitView(t) {
    const c = this.add.container(0, 0).setDepth(3);
    c.shadowImg = this.add.image(0, 32, 'shadow');
    c.add(c.shadowImg);
    if (t.grade >= 3) { c.halo = this.add.image(0, 0, 'halo').setAlpha(0.22); c.add(c.halo); }
    c.body = RD.Textures.unitBody(this, t, false);
    c.add(c.body);
    c.frameImg = this.add.image(0, 0, 'frame_' + t.grade);
    c.add(c.frameImg);
    c.badge = this.add.image(30, -30, 'badge').setVisible(false);
    c.add(c.badge);
    c.grade = t.grade; c.lastAtk = 0;
    this.tintUnitView(c, time0());
    return c;
  }
  tintUnitView(c, time) {
    const col = RD.util.gradeColorInt(c.grade);
    c.frameImg.setTint(col);
    if (c.halo) { c.halo.setTint(col); c.halo.setScale(1 + Math.sin(time / 200) * 0.03); }
  }
  syncUnits(time) {
    const G = this.logic.G, counts = {};
    for (const u of G.units) counts[u.type.id] = (counts[u.type.id] || 0) + 1;
    const dragU = this.drag && this.drag.dragging ? this.drag.unit : null;
    for (const u of G.units) {
      let v = this.unitViews.get(u);
      if (!v) { v = this.createUnitView(u.type); this.unitViews.set(u, v); }
      v.setPosition(u.x, u.y);
      const pop = u.born < 1 ? 0.4 + 0.6 * u.born : 1;
      v.setScale(pop * (1 + 0.1 * u.anim));
      v.setAlpha(u === dragU ? 0.3 : 1);
      v.badge.setVisible(u !== dragU && counts[u.type.id] >= 3 && u.type.grade < RD.GRADES.length - 1);
      if (u.type.grade >= 3) this.tintUnitView(v, time);
      // 스프라이트시트 공격 애니메이션
      if (v.lastAtk !== u.atk) {
        v.lastAtk = u.atk;
        const rs = v.body.rdSprite;
        if (rs && rs.attack) {
          const cur = v.body.anims.currentAnim;
          if (!(cur && cur.key === rs.attack && v.body.anims.isPlaying)) {
            v.body.play(rs.attack);
            if (rs.idle) v.body.chain(rs.idle);
          }
        }
      }
    }
    for (const [u, v] of this.unitViews) if (u.removed) { v.destroy(); this.unitViews.delete(u); }
  }

  // ── 적 ──
  syncEnemies(time) {
    const G = this.logic.G;
    for (const e of G.enemies) {
      let v = this.enemyViews.get(e);
      if (!v) { v = RD.Textures.enemySprite(this, e.type).setDepth(e.boss ? 2.5 : 2); this.enemyViews.set(e, v); v.prevX = e.x; }
      const bob = e.stunT > 0 ? 0 : Math.sin(time / 120 + e.wob) * 2.4;
      if (v.rdSprite) { const dx = e.x - v.prevX; if (dx < -0.02) v.setFlipX(true); else if (dx > 0.02) v.setFlipX(false); }
      v.prevX = e.x;
      v.setPosition(e.x, e.y + bob);
      if (e.hitT > 0) v.setTintFill(0xffffff); else if (v.isTinted) v.clearTint();
    }
    for (const [e, v] of this.enemyViews) if (e.dead) { v.destroy(); this.enemyViews.delete(e); }
  }

  // ── 투사체 (오브젝트 풀) ──
  projTexture(t) {
    switch (t.fx) {
      case 'arrow': return 'p_arrow';
      case 'bullet': return 'p_bullet';
      case 'missile': return 'p_missile';
      default: return RD.Textures.orb(this, t.pcolor || RD.GameLogic.fxColor(t));
    }
  }
  syncProjectiles() {
    const G = this.logic.G;
    for (const p of G.projectiles) {
      let v = this.projViews.get(p);
      if (!v) {
        v = this.projPool.pop() || this.add.image(0, 0, 'p_bullet').setDepth(4);
        v.setTexture(this.projTexture(p.t)).setVisible(true);
        const fx = p.t.fx;
        v.setScale(fx === 'fire' ? 0.7 : (fx === 'orb' || fx === 'holy') ? (5 + p.t.grade * 0.6) / 10 : 1);
        this.projViews.set(p, v);
      }
      v.setPosition(p.x, p.y).setRotation(p.ang);
    }
    for (const [p, v] of this.projViews) if (p.done) { v.setVisible(false); this.projPool.push(v); this.projViews.delete(p); }
  }

  // ── 데미지 숫자 (텍스트 풀) ──
  syncFloats() {
    const G = this.logic.G;
    for (const f of G.floats) {
      let v = this.floatViews.get(f);
      if (!v) {
        v = this.floatPool.pop() || this.add.text(0, 0, '', RD.util.textStyle(24, '#ffffff', 6)).setOrigin(0.5).setDepth(7);
        if (v._rdSize !== f.size) { v.setFontSize(f.size); v._rdSize = f.size; }
        RD.util.setText(v, f.text, f.color);
        v.setVisible(true);
        this.floatViews.set(f, v);
      }
      v.setPosition(f.x, f.y).setAlpha(1 - f.t / f.life);
    }
    for (const [f, v] of this.floatViews) if (f.dead) { v.setVisible(false); this.floatPool.push(v); this.floatViews.delete(f); }
  }

  // ── 아래층 그래픽: 포탈, 선택 사거리, 같은 유닛 표시, 적 그림자 ──
  drawUnder(time) {
    const g = this.gUnder, G = this.logic.G, P = RD.PATH, cInt = RD.util.colorInt;
    g.clear();
    const pr = 32 + Math.sin(time / 250) * 4;
    g.fillStyle(0xaa00ff, 0.18).fillCircle(P.l, P.t, pr + 12);
    g.lineStyle(6, 0xc158ff, 1).strokeCircle(P.l, P.t, pr);
    g.lineStyle(4, 0xea80fc, 1); g.beginPath(); g.arc(P.l, P.t, pr * 0.5, time / 200, time / 200 + 4); g.strokePath();

    const sel = G.selected;
    if (sel && !sel.removed) {
      const r = sel.type.range;
      g.fillStyle(0xffffff, 0.05).fillCircle(sel.x, sel.y, r);
      g.lineStyle(3, RD.util.gradeColorInt(sel.type.grade), 1);
      const n = Math.max(12, Math.floor(Math.PI * 2 * r / 24));
      for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2; g.beginPath(); g.arc(sel.x, sel.y, r, a0, a0 + Math.PI / n); g.strokePath(); }
      for (const u of G.units) if (u.type.id === sel.type.id) {
        g.lineStyle(u === sel ? 6 : 4, 0xffffff, u === sel ? 1 : 0.45).strokeCircle(u.x, u.y, 48);
      }
    }
    g.fillStyle(0x000000, 0.35);
    for (const e of G.enemies) g.fillEllipse(e.x, e.y + e.size * 0.9, e.size * 1.8, e.size * 0.7);
  }

  // ── 위층 그래픽: 체력바, 상태이상, 공격 이펙트, 드래그 목표 칸 ──
  drawOver(time) {
    const g = this.gOver, G = this.logic.G, cInt = RD.util.colorInt, clamp = RD.util.clamp, TAU = Math.PI * 2;
    g.clear();
    for (const e of G.enemies) {
      const s = e.size;
      if (e.slowT > 0) g.lineStyle(4, 0x64c8ff, 0.8).strokeCircle(e.x, e.y, s + 6);
      if (e.stunT > 0) {
        g.fillStyle(0xffeb3b, 1);
        for (let i = 0; i < 3; i++) { const a = time / 150 + i * TAU / 3; g.fillCircle(e.x + Math.cos(a) * s, e.y - s - 8 + Math.sin(a) * 6, 4.4); }
      }
      if (e.hp < e.maxHp || e.boss) {
        const bw = e.boss ? 112 : s * 2 + 12, bh = e.boss ? 12 : 8, bx = e.x - bw / 2, by = e.y - s - (e.boss ? 28 : 18);
        g.fillStyle(0x000000, 0.7).fillRect(bx - 2, by - 2, bw + 4, bh + 4);
        const r = clamp(e.hp / e.maxHp, 0, 1);
        g.fillStyle(e.boss ? 0xff1744 : (r > 0.5 ? 0x66bb6a : r > 0.25 ? 0xffca28 : 0xef5350), 1).fillRect(bx, by, bw * r, bh);
      }
    }
    for (const f of G.effects) {
      const p = f.t / f.life, a = 1 - p, c = cInt(f.color);
      switch (f.k) {
        case 'boom':
          g.fillStyle(c, a * 0.25).fillCircle(f.x, f.y, f.r * (0.4 + 0.6 * p));
          g.lineStyle(4, c, a).strokeCircle(f.x, f.y, f.r * (0.4 + 0.6 * p));
          break;
        case 'slash':
          g.lineStyle(6, c, a); g.beginPath(); g.arc(f.x, f.y, f.r, f.a, f.a + 2.4 * (0.4 + p)); g.strokePath();
          break;
        case 'beam':
          g.lineStyle(f.w * (1.6 - p), c, a).lineBetween(f.x, f.y, f.x2, f.y2);
          g.lineStyle(Math.max(2, f.w * 0.4), 0xffffff, a).lineBetween(f.x, f.y, f.x2, f.y2);
          break;
        case 'lightning':
          g.lineStyle(6, c, a).strokePoints(f.pts, false);
          g.lineStyle(2, 0xffffff, a).strokePoints(f.pts, false);
          break;
        case 'spark':
          g.fillStyle(c, a).fillCircle(f.x, f.y, f.r * (1 + p)); break;
        case 'pop': case 'ring':
          g.lineStyle(5, c, a).strokeCircle(f.x, f.y, f.r * (0.5 + p)); break;
        case 'combine':
          g.lineStyle(8, c, a).strokeCircle(f.x, f.y, f.r * (0.3 + p));
          g.lineStyle(4, c, a);
          for (let i = 0; i < 10; i++) {
            const an = i * TAU / 10 + p, r1 = f.r * 0.4 * (1 + p), r2 = r1 + 20;
            g.lineBetween(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1, f.x + Math.cos(an) * r2, f.y + Math.sin(an) * r2);
          }
          break;
      }
    }
    const d = this.drag;
    if (d && d.dragging && d.unit) {
      const c = RD.util.cellAt(d);
      if (c) {
        const p = RD.util.cellCenter(c.col, c.row), other = G.grid[c.row][c.col];
        g.lineStyle(4, other && other !== d.unit ? 0xffca28 : 0x69f0ae, 1).strokeRoundedRect(p.x - 46, p.y - 46, 92, 92, 18);
      }
    }
  }

  syncDragGhost() {
    const d = this.drag;
    if (d && d.dragging && d.unit) {
      if (!this.dragGhost) {
        this.dragGhost = this.createUnitView(d.unit.type).setDepth(9).setAlpha(0.9).setScale(1.15);
      }
      this.dragGhost.setPosition(d.x, d.y - 20);
      if (d.unit.type.grade >= 3) this.tintUnitView(this.dragGhost, performance.now());
    } else if (this.dragGhost) { this.dragGhost.destroy(); this.dragGhost = null; }
  }
};

function time0() { return performance.now(); }
