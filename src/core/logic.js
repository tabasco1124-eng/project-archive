/* =====================================================================
 * 게임 로직 (렌더링과 분리된 순수 상태/규칙). 바닐라 버전 로직을 그대로 옮김.
 * GameScene 이 매 프레임 update(dt) 를 호출하고, 상태(G)를 읽어 화면에 반영한다.
 * ===================================================================== */
window.RD = window.RD || {};

RD.GameLogic = (() => {
  const { TAU, rand, pick, fmt, pathPos, cellCenter, gradeColorStr } = RD.util;

  class GameLogic {
    constructor(opts) {
      opts = opts || {};
      const CONFIG = RD.CONFIG;
      const grid = [];
      for (let r = 0; r < RD.GRID.rows; r++) grid.push(new Array(RD.GRID.cols).fill(null));
      this.G = {
        mode: 'playing',            // playing | paused | over
        time: 0,
        round: 0,
        roundTimer: CONFIG.firstRoundDelay,
        spawnLeft: 0, spawnTimer: 0,
        enemyType: RD.ENEMIES[0],
        gold: CONFIG.startGold,     // 처치 자원
        mineral: CONFIG.startMineral, // 채굴 자원 (소수점 누적, 표시 시 내림)
        mineLv: 0,                  // 채굴 강화 레벨
        kills: 0,
        speed: opts.speed || 1,
        upg: { warrior: 0, archer: 0, wizard: 0 },   // 타입 강화 레벨
        units: [], enemies: [], projectiles: [], effects: [], floats: [],
        grid,
        selected: null,
        boss: null, bossTimer: 0,
        overReason: '',
        uid: 1,
      };
      this.toastQueue = [];          // UIScene 이 꺼내서 표시
      this.onGameOver = opts.onGameOver || null;
      this.toast('소환 버튼으로 유닛을 뽑으세요!', '#ffe082');
    }

    // ── 자원 ──
    canAfford(cur, amt) { return this.G[cur] >= amt; }
    spend(cur, amt) {
      if (this.G[cur] < amt) { const c = RD.CURRENCIES[cur]; this.toast(`${c.name}${c.josa} 부족합니다`, '#ff8a80'); return false; }
      this.G[cur] -= amt;
      return true;
    }
    mineRate() { return RD.BAL.mineRate(this.G.mineLv); }

    // ── 알림 / 연출 데이터 ──
    toast(text, color) { this.toastQueue.push({ text, color: color || '#ffffff' }); }
    addFloat(x, y, text, color, size) {
      const F = this.G.floats;
      F.push({ x, y, text, color, size: size || 28, t: 0, life: 0.8 });
      if (F.length > RD.CONFIG.maxFloats) F.shift().dead = true;
    }
    addFx(o) { o.t = 0; this.G.effects.push(o); }

    // ── 라운드 ──
    startNextRound() {
      const G = this.G, CONFIG = RD.CONFIG;
      G.round++;
      const r = G.round;
      G.roundTimer = CONFIG.roundTime;
      if (r > 1) {
        const bonus = RD.BAL.roundGold(r);
        G.gold += bonus;
        this.toast(`라운드 ${r}  ·  +${bonus} 골드`, '#ffe082');
      } else {
        this.toast('라운드 1 시작!', '#ffe082');
      }
      if (r % CONFIG.bossEvery === 0) {
        G.spawnLeft = 0;
        this.spawnBoss(r);
      } else {
        G.enemyType = RD.ENEMIES[(r - 1) % RD.ENEMIES.length];
        G.spawnLeft = RD.BAL.spawnCount(r);
        G.spawnTimer = 0;
      }
    }
    makeEnemy(type, hp, speed, size, boss) {
      const e = { type, hp, maxHp: hp, s: 0, off: boss ? 0 : rand(-14, 14), speed, size, boss,
        slowT: 0, slowAmt: 0, stunT: 0, hitT: 0, dead: false, x: RD.PATH.l, y: RD.PATH.t, wob: rand(0, TAU) };
      pathPos(0, e.off, e);
      this.G.enemies.push(e);
      return e;
    }
    spawnEnemy() {
      const G = this.G, et = G.enemyType;
      this.makeEnemy(et, Math.ceil(RD.BAL.enemyHp(G.round) * et.hp), RD.CONFIG.enemyBaseSpeed * et.spd, et.size, false);
    }
    spawnBoss(r) {
      const G = this.G, CONFIG = RD.CONFIG;
      const bt = RD.BOSSES[(r / CONFIG.bossEvery - 1) % RD.BOSSES.length];
      G.boss = this.makeEnemy(bt, RD.BAL.bossHp(r), CONFIG.enemyBaseSpeed * 0.55, bt.size, true);
      G.bossTimer = CONFIG.bossTime;
      this.toast(`보스 등장! ${bt.name}  (${CONFIG.bossTime}초 안에 처치)`, '#ff6b6b');
    }

    // ── 유닛 ──
    countType(id) { let c = 0; for (const u of this.G.units) if (u.type.id === id) c++; return c; }
    // 공격력 = 기본 공격력 + 공격력 계수 × 타입 강화 레벨 (Lv.0 은 타입이 없어 강화 영향 없음)
    unitDmg(t) { return t.dmg + (t.coef || 0) * (this.G.upg[t.cat] || 0); }
    freeCells() {
      const out = [], grid = this.G.grid;
      for (let r = 0; r < RD.GRID.rows; r++) for (let c = 0; c < RD.GRID.cols; c++) if (!grid[r][c]) out.push({ col: c, row: r });
      return out;
    }
    // 경로에 가까운 바깥쪽 칸부터 채움
    findFreeCell() {
      const cells = this.freeCells();
      if (!cells.length) return null;
      const GR = RD.GRID;
      let best = Infinity, cand = [];
      for (const c of cells) {
        const ring = Math.min(c.col, c.row, GR.cols - 1 - c.col, GR.rows - 1 - c.row);
        if (ring < best) { best = ring; cand = [c]; } else if (ring === best) cand.push(c);
      }
      return pick(cand);
    }
    addUnit(type, col, row) {
      const G = this.G, p = cellCenter(col, row);
      const u = { uid: G.uid++, type, col, row, x: p.x, y: p.y, cd: rand(0, 0.4), anim: 0, born: 0, atk: 0, removed: false };
      G.grid[row][col] = u;
      G.units.push(u);
      return u;
    }
    removeUnit(u) {
      const G = this.G;
      if (G.grid[u.row][u.col] === u) G.grid[u.row][u.col] = null;
      const i = G.units.indexOf(u);
      if (i >= 0) G.units.splice(i, 1);
      if (G.selected === u) G.selected = null;
      u.removed = true;
    }
    moveUnit(u, col, row) {
      const G = this.G;
      if (G.grid[u.row][u.col] === u) G.grid[u.row][u.col] = null;
      u.col = col; u.row = row;
      const p = cellCenter(col, row); u.x = p.x; u.y = p.y;
      G.grid[row][col] = u;
    }
    // 드래그 드롭: 빈 칸이면 이동, 다른 유닛이 있으면 자리 교환
    moveOrSwap(u, col, row) {
      const other = this.G.grid[row][col];
      if (other === u) return;
      const oc = u.col, or = u.row;
      this.moveUnit(u, col, row);
      if (other) this.moveUnit(other, oc, or);
    }

    // ── 플레이어 행동 ──
    summon() {
      const G = this.G, cost = RD.CONFIG.summonCost, cur = RD.COST_CURRENCY.summon;
      const cell = this.findFreeCell();
      if (!cell) return this.toast('빈 자리가 없습니다', '#ff8a80');
      if (!this.spend(cur, cost)) return;
      const t = pick(RD.UNITS_BY_GRADE[0]);
      const u = this.addUnit(t, cell.col, cell.row);
      this.addFloat(u.x, u.y - 52, t.name, '#ffffff', 26);
      this.addFx({ k: 'ring', x: u.x, y: u.y, r: 52, color: gradeColorStr(t.grade), life: 0.4 });
      return u;
    }
    combine(u) {
      const G = this.G;
      if (!u) return this.toast('유닛을 먼저 선택하세요', '#ff8a80');
      const t = u.type;
      if (t.grade >= RD.GRADES.length - 1) return this.toast('이미 최고 등급입니다', '#ff8a80');
      const same = G.units.filter(o => o !== u && o.type.id === t.id);
      if (same.length < 2) return this.toast(`같은 ${t.name} 3개가 필요합니다`, '#ff8a80');
      const { col, row } = u;
      this.removeUnit(u); this.removeUnit(same[0]); this.removeUnit(same[1]);
      const nt = pick(RD.combineTargets(t));
      const nu = this.addUnit(nt, col, row);
      G.selected = nu;
      this.addFx({ k: 'combine', x: nu.x, y: nu.y, r: 92, color: gradeColorStr(nt.grade), life: 0.7 });
      this.toast(`조합 성공!  [${RD.GRADES[nt.grade].name}] ${nt.name}`, RD.GRADES[nt.grade].color);
      return nu;
    }
    // 타입별 레벨 보유 수: { none:[n0], warrior:[n0,n1,n2,n3], ... }
    levelCounts() {
      const out = {}, n = RD.GRADES.length;
      for (const k of RD.AUTO_KEYS) out[k] = new Array(n).fill(0);
      for (const u of this.G.units) out[u.type.cat][u.type.grade]++;
      return out;
    }
    // 해당 타입에서 지금 조합 가능한 유닛 묶음 (낮은 레벨 우선) → 같은 유닛 배열 또는 null
    findMergeable(cat) {
      const maxG = RD.GRADES.length - 1, groups = {};
      for (const u of this.G.units) {
        const t = u.type;
        if (t.cat !== cat || t.grade >= maxG) continue;
        (groups[t.id] = groups[t.id] || []).push(u);
      }
      let best = null;
      for (const id in groups) {
        const g = groups[id];
        if (g.length >= 3 && (!best || g[0].type.grade < best[0].type.grade)) best = g;
      }
      return best;
    }
    // 자동 조합: 낮은 레벨부터 더 이상 조합할 수 없을 때까지 반복
    //  Lv.0(무타입) 은 조합하면 다른 타입 Lv.1 이 되므로 'none' 버튼에서는 Lv.0 만 처리
    autoCombine(cat) {
      const G = this.G, made = [];
      let g;
      while ((g = this.findMergeable(cat))) {
        const t = g[0].type;
        const { col, row } = g[0];
        this.removeUnit(g[0]); this.removeUnit(g[1]); this.removeUnit(g[2]);
        const nt = pick(RD.combineTargets(t));
        const nu = this.addUnit(nt, col, row);
        this.addFx({ k: 'combine', x: nu.x, y: nu.y, r: 92, color: gradeColorStr(nt.grade), life: 0.7 });
        made.push(nt);
      }
      const name = RD.AUTO_CATS[cat].name;
      if (!made.length) return this.toast(`${name}: 조합할 유닛이 없습니다`, '#ff8a80');
      G.selected = null;
      const top = made.reduce((a, b) => (b.grade > a.grade ? b : a));
      this.toast(`${name} 자동 조합 ${made.length}회  ·  최고 [${RD.GRADES[top.grade].name}] ${top.name}`, RD.GRADES[top.grade].color);
      return made;
    }
    sell(u) {
      if (!u) return this.toast('유닛을 먼저 선택하세요', '#ff8a80');
      const g = RD.GRADES[u.type.grade].sell;
      this.G.gold += g;
      this.addFloat(u.x, u.y - 40, `+${g}`, '#ffd54f', 30);
      this.removeUnit(u);
    }
    upgrade(cat) {
      const G = this.G, lv = G.upg[cat], cost = RD.BAL.upgradeCost(lv);
      if (!this.spend(RD.COST_CURRENCY.unitUpgrade, cost)) return;
      G.upg[cat]++;
      this.toast(`${RD.CATEGORIES[cat].name} 강화 Lv.${G.upg[cat]}  (${RD.CATEGORIES[cat].name} 유닛 공격력 상승)`, RD.CATEGORIES[cat].color);
    }
    upgradeMine() {
      const G = this.G;
      if (G.mineLv >= RD.CONFIG.mineMaxLevel) return this.toast('채굴 강화가 최대 레벨입니다', '#ff8a80');
      if (!this.spend(RD.COST_CURRENCY.mineUpgrade, RD.BAL.mineCost(G.mineLv))) return;
      G.mineLv++;
      this.toast(`채굴 강화 Lv.${G.mineLv}  (광물 +${RD.util.fmt1(this.mineRate())}/초)`, RD.CURRENCIES.mineral.color);
    }
    togglePause() {
      const G = this.G;
      if (G.mode === 'playing') G.mode = 'paused';
      else if (G.mode === 'paused') G.mode = 'playing';
    }
    toggleSpeed() { this.G.speed = this.G.speed === 1 ? 2 : 1; }
    gameOver(reason) {
      const G = this.G;
      if (G.mode === 'over') return;
      G.mode = 'over';
      G.overReason = reason;
      G.selected = null;
      if (this.onGameOver) this.onGameOver(reason);
    }

    // ── 전투 ──
    damage(e, dmg, show) {
      if (e.dead) return;
      e.hp -= dmg;
      e.hitT = 0.08;
      if (show && RD.CONFIG.showDamage) this.addFloat(e.x + rand(-12, 12), e.y - e.size - 12, fmt(dmg), e.boss ? '#ffcdd2' : '#ffffff', e.boss ? 30 : 24);
      if (e.hp <= 0) this.killEnemy(e);
    }
    killEnemy(e) {
      const G = this.G;
      e.dead = true;
      G.kills++;
      const g = e.boss ? RD.BAL.bossGold(G.round) : RD.BAL.killGold(G.round);
      G.gold += g;
      this.addFx({ k: 'pop', x: e.x, y: e.y, r: e.size * 1.8, color: e.type.color, life: 0.3 });
      if (e.boss) {
        this.addFx({ k: 'combine', x: e.x, y: e.y, r: 160, color: '#ffd54f', life: 0.9 });
        this.toast(`보스 처치!  +${g} 골드`, '#ffd54f');
        G.boss = null;
      } else {
        this.addFloat(e.x, e.y - 8, '+' + g, '#ffd54f', 22);
      }
    }
    applyStatus(t, e) {
      if (t.slow) {
        const amt = e.boss ? t.slow * 0.5 : t.slow;
        e.slowAmt = e.slowT > 0 ? Math.max(e.slowAmt, amt) : amt;
        e.slowT = Math.max(e.slowT, t.slowDur);
      }
      if (t.stun && Math.random() < t.stun) {
        e.stunT = Math.max(e.stunT, e.boss ? t.stunDur * 0.3 : t.stunDur);
      }
    }
    hit(t, x, y, target, dmg) {
      if (t.splash) {
        const r = t.splash;
        for (const e of this.G.enemies) {
          if (e.dead) continue;
          const dx = e.x - x, dy = e.y - y, rr = r + e.size;
          if (dx * dx + dy * dy <= rr * rr) { this.applyStatus(t, e); this.damage(e, dmg, e === target); }
        }
        this.addFx({ k: 'boom', x, y, r, color: t.pcolor || GameLogic.fxColor(t), life: 0.28 });
      } else if (target && !target.dead) {
        this.applyStatus(t, target);
        this.damage(target, dmg, true);
        this.addFx({ k: 'spark', x, y, r: 12, color: t.pcolor || GameLogic.fxColor(t), life: 0.15 });
      }
    }
    static fxColor(t) {
      switch (t.fx) {
        case 'fire': return '#ff7043';
        case 'holy': return '#ffe082';
        case 'missile': return '#ffab40';
        case 'bullet': return '#ffee58';
        case 'arrow': return '#e6d8a8';
        case 'slash': return '#ffffff';
        default: return RD.GRADES[t.grade].color;
      }
    }
    attack(u, e) {
      const t = u.type, dmg = this.unitDmg(t);
      u.anim = 1;
      u.atk++;
      u.face = e.x < u.x - 4 ? -1 : e.x > u.x + 4 ? 1 : u.face || 1;
      // 레벨이 높을수록 공격 순간 섬광이 크고, Lv.3 은 적 위치에 충격파 추가
      if (t.grade >= 1) this.addFx({ k: 'flash', x: u.x, y: u.y - 8, r: 12 + t.grade * 10, color: gradeColorStr(t.grade), life: 0.14 + t.grade * 0.04 });
      if (t.grade >= 3) this.addFx({ k: 'ring', x: e.x, y: e.y, r: 34, color: gradeColorStr(t.grade), life: 0.3 });
      if (RD.INSTANT_FX[t.fx]) {
        if (t.fx === 'slash') this.addFx({ k: 'slash', x: e.x, y: e.y, a: rand(0, TAU), r: 28 + t.grade * 6, color: t.grade >= 3 ? RD.GRADES[t.grade].color : '#ffffff', life: 0.18 });
        else if (t.fx === 'beam') this.addFx({ k: 'beam', x: u.x, y: u.y, x2: e.x, y2: e.y, w: 4 + t.grade * 2, color: t.pcolor || '#ffffff', life: 0.14 });
        else this.addFx({ k: 'lightning', pts: GameLogic.zigzag(u.x, u.y, e.x, e.y), color: t.pcolor || '#ffffff', life: 0.18 });
        this.hit(t, e.x, e.y, e, dmg);
      } else {
        this.G.projectiles.push({ x: u.x, y: u.y, tx: e.x, ty: e.y, target: e, t, dmg, spd: RD.FX_SPEED[t.fx] || 1000, ang: 0, done: false });
      }
    }
    static zigzag(x1, y1, x2, y2) {
      const pts = [{ x: x1, y: y1 }], n = 6, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for (let i = 1; i < n; i++) { const k = i / n, j = rand(-20, 20); pts.push({ x: x1 + dx * k + nx * j, y: y1 + dy * k + ny * j }); }
      pts.push({ x: x2, y: y2 });
      return pts;
    }

    // ── 업데이트 (게임 시간 dt 초) ──
    update(dt) {
      const G = this.G, CONFIG = RD.CONFIG;
      G.time += dt;

      // 광물 자동 채굴
      G.mineral += this.mineRate() * dt;

      G.roundTimer -= dt;
      if (G.roundTimer <= 0) this.startNextRound();

      if (G.spawnLeft > 0) {
        G.spawnTimer -= dt;
        while (G.spawnTimer <= 0 && G.spawnLeft > 0) {
          this.spawnEnemy(); G.spawnLeft--; G.spawnTimer += CONFIG.spawnInterval;
        }
      }

      if (G.boss) {
        G.bossTimer -= dt;
        if (G.bossTimer <= 0 && !G.boss.dead) { this.gameOver('보스를 제한 시간 안에 처치하지 못했습니다'); return; }
      }

      // 적 이동
      for (const e of G.enemies) {
        if (e.hitT > 0) e.hitT -= dt;
        if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
        if (e.stunT > 0) { e.stunT -= dt; continue; }
        e.s += e.speed * (1 - e.slowAmt) * dt;
        pathPos(e.s, e.off, e);
      }

      // 유닛 공격: 사거리 안 가장 가까운 적
      const enemies = G.enemies;
      for (const u of G.units) {
        if (u.anim > 0) u.anim = Math.max(0, u.anim - dt * 6);
        if (u.born < 1) u.born = Math.min(1, u.born + dt * 4);
        u.cd -= dt;
        if (u.cd > 0) continue;
        const r2 = u.type.range * u.type.range;
        let best = null, bd = Infinity;
        for (const e of enemies) {
          if (e.dead) continue;
          const dx = e.x - u.x, dy = e.y - u.y, d = dx * dx + dy * dy;
          if (d <= r2 && d < bd) { bd = d; best = e; }
        }
        if (best) { this.attack(u, best); u.cd = u.type.spd; }
        else u.cd = 0.05;
      }

      // 투사체 (유도)
      for (const p of G.projectiles) {
        if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = p.spd * dt;
        p.ang = Math.atan2(dy, dx);
        if (d <= step + 4) {
          p.done = true;
          const tgt = p.target && !p.target.dead ? p.target : null;
          if (tgt || p.t.splash) this.hit(p.t, p.tx, p.ty, tgt, p.dmg);
        } else { p.x += dx / d * step; p.y += dy / d * step; }
      }
      G.projectiles = G.projectiles.filter(p => !p.done);

      // 이펙트 / 데미지 숫자 수명
      for (const f of G.effects) f.t += dt;
      G.effects = G.effects.filter(f => f.t < f.life);
      for (const f of G.floats) { f.t += dt; f.y -= 56 * dt; if (f.t >= f.life) f.dead = true; }
      G.floats = G.floats.filter(f => !f.dead);

      G.enemies = G.enemies.filter(e => !e.dead);
      if (G.enemies.length >= CONFIG.enemyLimit) this.gameOver(`필드의 적이 ${CONFIG.enemyLimit}마리에 도달했습니다`);
    }
  }
  return GameLogic;
})();
