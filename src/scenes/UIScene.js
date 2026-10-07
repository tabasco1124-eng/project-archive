/* =====================================================================
 * UIScene: GameScene 위에서 병렬 실행. HUD(라운드/타이머/골드/적 수/보스),
 * 하단 패널(유닛 정보, 조합/판매/소환, 강화), 알림, 일시정지 오버레이, 단축키.
 * ===================================================================== */
window.RD = window.RD || {};

RD.UIScene = class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  get L() { return this.scene.get('GameScene').logic; }

  create() {
    const W = RD.W, UI = RD.UI, S = RD.util.textStyle;
    // ── HUD ──
    this.hudG = this.add.graphics();
    this.tRound = this.add.text(28, 60, '', S(42, '#ffe082', 6)).setOrigin(0, 0.5);
    this.tTimer = this.add.text(228, 62, '', S(26, '#d4c8ea')).setOrigin(0, 0.5);
    // 자원: 골드(처치 보상) / 광물(자동 채굴)
    this.add.image(470, 60, RD.CURRENCIES.gold.icon).setScale(0.85);
    this.tGold = this.add.text(494, 62, '', S(36, RD.CURRENCIES.gold.color, 6)).setOrigin(0, 0.5);
    this.add.image(634, 60, RD.CURRENCIES.mineral.icon).setScale(0.85);
    this.tMineral = this.add.text(658, 62, '', S(36, RD.CURRENCIES.mineral.color, 6)).setOrigin(0, 0.5);
    this.tEnemy = this.add.text(0, 150, '', S(38, '#ffffff', 6)).setOrigin(0.5);
    this.tBoss = this.add.text(548 + 250, 150, '', S(32, '#ffffff', 6)).setOrigin(0.5);

    // ── 정보 패널 ──
    const r = UI.info;
    const ig = this.add.graphics();
    ig.fillStyle(0x1e162a, 0.9).fillRoundedRect(r.x, r.y, r.w, r.h, 28);
    ig.lineStyle(3, 0xffc878, 0.18).strokeRoundedRect(r.x, r.y, r.w, r.h, 28);
    this.idle = [
      this.add.text(W / 2, r.y + 46, '유닛을 터치하면 정보가 표시됩니다', S(34, '#e6dcf5')).setOrigin(0.5),
      this.add.text(W / 2, r.y + 96, '드래그로 위치 이동  ·  같은 유닛 3개 → 다음 레벨 조합', S(26, '#a99bc0', 0, 'normal')).setOrigin(0.5),
      this.add.text(W / 2, r.y + 138, '', S(26, '#8f82a6', 0, 'normal')).setOrigin(0.5),
    ];
    const tx = r.x + 200;
    this.sel = {
      tagG: this.add.graphics(),
      tag: this.add.text(tx + 48, r.y + 44, '', S(28, '#1a1022')).setOrigin(0.5),
      name: this.add.text(tx + 116, r.y + 44, '', S(42, '#ffffff')).setOrigin(0, 0.5),
      count: this.add.text(r.x + r.w - 28, r.y + 44, '', S(28, '#b9aecb')).setOrigin(1, 0.5),
      stats: this.add.text(tx, r.y + 94, '', S(28, '#e6dcf5', 0, 'normal')).setOrigin(0, 0.5),
      special: this.add.text(tx, r.y + 138, '', S(28, '#ffffff')).setOrigin(0, 0.5),
      dps: this.add.text(r.x + r.w - 28, r.y + 138, '', S(28, '#ffd54f')).setOrigin(1, 0.5),
    };
    this.preview = null; this.previewType = null;

    // ── 버튼 ──
    const act = (fn, sys) => () => {
      const L = this.L, G = L.G;
      if (G.mode === 'over') return;
      if (!sys && G.mode !== 'playing') return;
      fn(L, G);
    };
    this.btn = {
      combine: new RD.UIButton(this, UI.btnCombine, { scheme: 'green', onClick: act((L, G) => L.combine(G.selected)) }),
      sell:    new RD.UIButton(this, UI.btnSell,    { scheme: 'red',   onClick: act((L, G) => L.sell(G.selected)) }),
      summon:  new RD.UIButton(this, UI.btnSummon,  { scheme: 'gold', big: true, onClick: act(L => L.summon()) }),
      pause:   new RD.UIButton(this, UI.btnPause,   { scheme: 'dark', onClick: act(L => L.togglePause(), true) }),
      speed:   new RD.UIButton(this, UI.btnSpeed,   { scheme: 'dark', labelSize: 40, onClick: act(L => { L.toggleSpeed(); this.registry.set('speed', L.G.speed); }, true) }),
    };
    this.upgBtns = RD.CAT_KEYS.map((k, i) => new RD.UIButton(this, UI.upg[i], { scheme: k, labelSize: 40, onClick: act(L => L.upgrade(k)) }));
    this.btn.mine = new RD.UIButton(this, UI.btnMine, { scheme: 'mine', labelSize: 40, onClick: act(L => L.upgradeMine()) });
    // 타입별 자동 조합 (버튼 아래 줄에 레벨별 보유 수 표시)
    this.autoBtns = RD.AUTO_KEYS.map((k, i) => new RD.UIButton(this, UI.auto[i], {
      scheme: 'dark', labelSize: 34, subSize: 24, labelColor: RD.CATEGORIES[k].color, dimSubColor: '#8a8199',
      onClick: act(L => L.autoCombine(k)) }));
    // 레벨별 보유 수 칩 (레벨 색 = 유닛 머리 위 레벨 표시 색)
    this.autoChips = RD.AUTO_KEYS.map((k, i) => {
      const b = UI.auto[i], grades = k === 'none' ? [0] : [1, 2, 3], cw = k === 'none' ? 120 : 76, gap = 6;
      const x0 = b.x + b.w / 2 - (grades.length * cw + (grades.length - 1) * gap) / 2, cy = b.y + b.h - 30;
      const g = this.add.graphics();
      const chips = grades.map((gr, j) => ({ gr, x: x0 + j * (cw + gap), w: cw,
        t: this.add.text(x0 + j * (cw + gap) + cw / 2, cy + 1, '', S(21, '#140c1c', 0)).setOrigin(0.5) }));
      return { g, chips, cy, last: '' };
    });

    // ── 일시정지 오버레이 ──
    this.pauseLayer = this.add.container(0, 0).setDepth(40).setVisible(false);
    const pg = this.add.graphics(); pg.fillStyle(0x000000, 0.5).fillRect(0, UI.hudH, W, UI.panelY - UI.hudH);
    this.pauseLayer.add([pg,
      this.add.text(W / 2, 720, '일시정지', S(80, '#ffffff', 10)).setOrigin(0.5),
      this.add.text(W / 2, 820, '화면을 터치하면 계속합니다', S(32, '#d4c8ea', 0, 'normal')).setOrigin(0.5)]);
    this.pauseZone = this.add.zone(0, UI.hudH, W, UI.panelY - UI.hudH).setOrigin(0).setInteractive();
    this.pauseZone.on('pointerup', () => { if (this.L.G.mode === 'paused') this.L.togglePause(); });

    // ── 알림 ──
    this.toasts = [];

    // ── PC 단축키: S 소환, D 조합, F 판매, 1/2/3 강화, 4 채굴 강화, Q/W/E/R 자동 조합, Space 배속, P/Esc 일시정지 ──
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', e => {
        const L = this.L, G = L.G;
        if (G.mode === 'over') return;
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') return L.togglePause();
        if (e.key === ' ') { e.preventDefault && e.preventDefault(); L.toggleSpeed(); this.registry.set('speed', G.speed); return; }
        if (G.mode !== 'playing') return;
        const k = e.key.toLowerCase();
        if (k === 's') L.summon();
        else if (k === 'd') L.combine(G.selected);
        else if (k === 'f') L.sell(G.selected);
        else if (k === '1' || k === '2' || k === '3') L.upgrade(RD.CAT_KEYS[+k - 1]);
        else if (k === '4') L.upgradeMine();
        else if ('qwer'.includes(k) && k.length === 1) L.autoCombine(RD.AUTO_KEYS['qwer'.indexOf(k)]);
      });
    }
  }

  showToast(text, color) {
    const S = RD.util.textStyle;
    const t = this.add.text(RD.W / 2, 0, text, S(34, color)).setOrigin(0.5);
    const w = Math.min(1000, t.width + 72);
    const g = this.add.graphics();
    g.fillStyle(0x0a0612, 0.82).fillRoundedRect(-w / 2, -34, w, 68, 34);
    g.lineStyle(3, RD.util.colorInt(color), 1).strokeRoundedRect(-w / 2, -34, w, 68, 34);
    t.setPosition(0, 2);
    const c = this.add.container(RD.W / 2, 600, [g, t]).setDepth(30);
    this.toasts.push({ c, t: 0 });
    if (this.toasts.length > 3) this.toasts.shift().c.destroy();
  }

  update(time, delta) {
    const L = this.L; if (!L) return;
    const G = L.G, UI = RD.UI, C = RD.CONFIG, U = RD.util, setText = U.setText, fmt = U.fmt;
    const realDt = Math.min(0.05, delta / 1000);

    // HUD 텍스트
    setText(this.tRound, `라운드 ${G.round}`);
    const tl = Math.max(0, Math.ceil(G.roundTimer));
    setText(this.tTimer, G.round === 0 ? `시작까지 ${tl}초` : `다음 라운드 ${tl}초`);
    const money = v => v >= 1e5 ? fmt(v) : Math.floor(v).toLocaleString('ko-KR');
    setText(this.tGold, money(G.gold));
    setText(this.tMineral, money(G.mineral));

    // 적 수 바 / 보스 바
    const g = this.hudG; g.clear();
    const n = G.enemies.length, lim = C.enemyLimit, ratio = U.clamp(n / lim, 0, 1);
    const bx = 32, by = 116, bh = 64, bw = G.boss ? 500 : 1016;
    g.fillStyle(0x000000, 0.6).fillRoundedRect(bx, by, bw, bh, 18);
    if (ratio > 0) {
      let col = ratio < 0.5 ? 0x2e7d32 : ratio < 0.75 ? 0xef6c00 : 0xc62828;
      if (ratio >= 0.85 && Math.floor(time / 250) % 2) col = 0xff5252;
      const fw = bw * ratio;
      g.fillStyle(col, 1).fillRoundedRect(bx, by, fw, bh, Math.min(18, fw / 2));
    }
    g.lineStyle(4, 0xffffff, 0.35).strokeRoundedRect(bx, by, bw, bh, 18);
    this.tEnemy.x = bx + bw / 2;
    setText(this.tEnemy, `적 ${n} / ${lim}`);
    if (G.boss) {
      const x = 548, w = 500, b = G.boss, fw = w * U.clamp(b.hp / b.maxHp, 0, 1);
      g.fillStyle(0x3c0000, 0.75).fillRoundedRect(x, by, w, bh, 18);
      if (fw > 2) g.fillStyle(0xb71c1c, 1).fillRoundedRect(x, by, fw, bh, Math.min(18, fw / 2));
      g.lineStyle(4, G.bossTimer < 20 && Math.floor(time / 300) % 2 ? 0xffeb3b : 0xff5252, 1).strokeRoundedRect(x, by, w, bh, 18);
      setText(this.tBoss, `${b.type.name}  ${Math.ceil(G.bossTimer)}초`);
      this.tBoss.setVisible(true);
    } else this.tBoss.setVisible(false);

    // 정보 패널
    const sel = G.selected && !G.selected.removed ? G.selected : null;
    this.idle.forEach(t => t.setVisible(!sel));
    Object.values(this.sel).forEach(o => o.setVisible(!!sel));
    if (!sel) {
      setText(this.idle[2], `보유 유닛 ${G.units.length} / ${RD.UNIT_CAP}      처치 ${fmt(G.kills)}`);
      if (this.preview) { this.preview.destroy(); this.preview = null; this.previewType = null; }
    } else {
      const t = sel.type, r = UI.info, maxG = RD.GRADES.length - 1;
      if (this.previewType !== t) {
        if (this.preview) this.preview.destroy();
        const body = RD.Textures.unitBody(this, t, true);
        const frame = this.add.image(0, 0, 'frameL_' + t.grade);
        this.preview = this.add.container(r.x + 100, r.y + 86, [body, frame]).setScale(0.94);
        this.preview.frameImg = frame;
        this.previewType = t;
        const tg = this.sel.tagG; tg.clear();
        this.tagColor = null;
      }
      const gc = U.gradeColorInt(t.grade);
      this.preview.frameImg.setTint(gc);
      if (this.tagColor !== gc) { this.tagColor = gc; this.sel.tagG.clear().fillStyle(gc, 1).fillRoundedRect(r.x + 200, r.y + 20, 96, 48, 14); }
      setText(this.sel.tag, RD.GRADES[t.grade].name);
      setText(this.sel.name, t.name);
      const cnt = L.countType(t.id);
      setText(this.sel.count, `보유 ${cnt}개`, cnt >= 3 && t.grade < maxG ? '#69f0ae' : '#b9aecb');
      const dmg = L.unitDmg(t), lv = G.upg[t.cat] || 0;
      setText(this.sel.stats, `공격력 ${fmt(dmg)}${t.coef ? ` (강화당 +${t.coef}${lv ? `, Lv.${lv}` : ''})` : ''}   공속 ${t.spd}초   사거리 ${t.range}`);
      setText(this.sel.special, `[${RD.CATEGORIES[t.cat].name}] ${U.specialText(t)}`, RD.CATEGORIES[t.cat].color);
      setText(this.sel.dps, `DPS ${fmt(dmg / t.spd)}`);
    }

    // 버튼 상태
    const maxG = RD.GRADES.length - 1, cnt = sel ? L.countType(sel.type.id) : 0;
    this.btn.combine.set('조합', sel ? (sel.type.grade >= maxG ? '최고 등급' : `${Math.min(cnt, 3)} / 3 보유`) : '유닛 선택',
      !!sel && sel.type.grade < maxG && cnt >= 3);
    this.btn.sell.set('판매', sel ? `+${RD.GRADES[sel.type.grade].sell} 골드` : '유닛 선택', !!sel);
    const CC = RD.COST_CURRENCY, CUR = RD.CURRENCIES;
    this.btn.summon.set('소환', `${C.summonCost} ${CUR[CC.summon].name}`, L.canAfford(CC.summon, C.summonCost) && G.units.length < RD.UNIT_CAP);
    RD.CAT_KEYS.forEach((k, i) => {
      const lv = G.upg[k], cost = RD.BAL.upgradeCost(lv);
      this.upgBtns[i].set(`${RD.CATEGORIES[k].name} 강화`, `Lv.${lv} · ${fmt(cost)}${CUR[CC.unitUpgrade].name}`, L.canAfford(CC.unitUpgrade, cost));
    });
    const mMax = G.mineLv >= C.mineMaxLevel, mCost = RD.BAL.mineCost(G.mineLv);
    this.btn.mine.set(`채굴 +${U.fmt1(L.mineRate())}/초`, mMax ? `Lv.${G.mineLv} · 최대` : `Lv.${G.mineLv} · ${fmt(mCost)}${CUR[CC.mineUpgrade].name}`,
      !mMax && L.canAfford(CC.mineUpgrade, mCost));
    const lc = L.levelCounts();
    RD.AUTO_KEYS.forEach((k, i) => {
      const n = lc[k], ok = !!L.findMergeable(k), ch = this.autoChips[i];
      this.autoBtns[i].set(`${RD.AUTO_CATS[k].name} 조합`, ' ', ok);
      const key = n.join(',') + ok;
      if (ch.last !== key) {
        ch.last = key; ch.g.clear();
        for (const c of ch.chips) {
          const v = n[c.gr];
          ch.g.fillStyle(U.gradeColorInt(c.gr), v ? 1 : 0.35).fillRoundedRect(c.x, ch.cy - 16, c.w, 32, 10);
          setText(c.t, `${RD.GRADES[c.gr].name.replace('.', '')} ×${v}`, v ? '#140c1c' : '#3a3046');
        }
      }
    });
    this.btn.pause.set('', '', true, G.mode === 'paused' ? 'play' : 'pause');
    this.btn.speed.set(G.speed + 'x', '', true);

    // 일시정지
    this.pauseLayer.setVisible(G.mode === 'paused');

    // 알림
    while (L.toastQueue.length) { const q = L.toastQueue.shift(); this.showToast(q.text, q.color); }
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i]; t.t += realDt;
      if (t.t > 2.2) { t.c.destroy(); this.toasts.splice(i, 1); }
    }
    this.toasts.forEach((t, i) => { t.c.y = 600 + i * 84; t.c.setAlpha(U.clamp(t.t < 1.8 ? 1 : 1 - (t.t - 1.8) / 0.4, 0, 1)); });
  }
};
