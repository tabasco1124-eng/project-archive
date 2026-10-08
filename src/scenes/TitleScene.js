/* TitleScene: 메인 메뉴 (프로젝트 아카이브)
 * 사이버 네온 그리드 테마. 다이브 시작 → GameScene, 작전 브리핑 → 규칙 오버레이
 * 레이아웃 (1080x1920 기준)
 *   y 120        상단 링크 상태 바
 *   y 520~800    타이틀 / 서브타이틀 / 세계관 한 줄
 *   y 1060       사각 결계 엠블럼 (회전)
 *   y 1330       [다이브 시작] 600x150
 *   y 1520       [작전 브리핑] 600x110
 *   y 1720       시스템 메시지 티커
 *   y 1860       하단 버전 표기
 */
window.RD = window.RD || {};

RD.TitleScene = class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const W = RD.W, H = RD.H, S = RD.util.textStyle;
    this.started = false;
    this.t = 0;
    this.cameras.main.setBackgroundColor('#050409');

    // ── 배경: 상단 평면 그리드 + 하단 원근 그리드(움직임) ──
    this.add.graphics().fillGradientStyle(0x0a0618, 0x0a0618, 0x050409, 0x050409, 1).fillRect(0, 0, W, H);
    this.grid = this.add.graphics();
    this.horizonY = 1180;

    // 떠다니는 데이터 입자
    this.bits = [];
    for (let i = 0; i < 40; i++) {
      const b = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 4, Phaser.Math.Between(8, 26),
        Phaser.Math.RND.pick([0x00e5ff, 0xff2bd6, 0x7c4dff]), Phaser.Math.FloatBetween(0.15, 0.55));
      b.speed = Phaser.Math.FloatBetween(40, 140);
      this.bits.push(b);
    }

    // ── 상단 상태 바 ──
    const bar = this.add.graphics();
    bar.lineStyle(2, 0x00e5ff, 0.5).lineBetween(60, 160, W - 60, 160);
    this.add.text(60, 120, 'NEURAL DIVE LINK', S(26, '#00e5ff', 0, 'normal')).setOrigin(0, 0.5);
    this.linkState = this.add.text(W - 60, 120, '● STANDBY', S(26, '#ff2bd6', 0, 'normal')).setOrigin(1, 0.5);
    this.tweens.add({ targets: this.linkState, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    // ── 타이틀 ──
    this.add.text(W / 2, 440, 'GRAND ARCHIVE // CORE SERVER', S(28, '#7fa8c9', 0, 'normal')).setOrigin(0.5).setLetterSpacing(4);
    // 글리치용 색수차 레이어 (시안/마젠타) + 본문
    this.titleC = this.add.text(W / 2, 560, '프로젝트 아카이브', S(104, '#00e5ff')).setOrigin(0.5).setAlpha(0.6);
    this.titleM = this.add.text(W / 2, 560, '프로젝트 아카이브', S(104, '#ff2bd6')).setOrigin(0.5).setAlpha(0.6);
    this.title = this.add.text(W / 2, 560, '프로젝트 아카이브', S(104, '#ffffff')).setOrigin(0.5);
    this.title.setShadow(0, 0, '#00e5ff', 28, false, true);
    this.add.text(W / 2, 680, 'PROJECT ARCHIVE', S(54, '#ff2bd6')).setOrigin(0.5).setLetterSpacing(14)
      .setShadow(0, 0, '#ff2bd6', 18, false, true);
    this.add.text(W / 2, 790, "초지능 AI '네메시스'에 맞서는 마지막 뉴럴 다이브", S(34, '#b9d4ee', 0, 'normal')).setOrigin(0.5);

    // ── 사각 결계 엠블럼 ──
    this.emblem = this.add.graphics({ x: W / 2, y: 1060 });
    this.emblemCore = this.add.text(W / 2, 1060, 'NX', S(44, '#00e5ff')).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 16, false, true);

    // ── 버튼 ──
    this.makeNeonButton({ x: 240, y: 1330, w: 600, h: 150 }, '다이브 시작', 'DIVE IN', 0x00e5ff, () => this.dive());
    this.makeNeonButton({ x: 240, y: 1520, w: 600, h: 110 }, '작전 브리핑', null, 0xff2bd6, () => this.openBriefing());

    // ── 시스템 메시지 티커 ──
    this.messages = [
      '> 그랜드 아카이브 코어 서버에 접속 중...',
      '> 경고: 지휘관 기억 데이터 손상 감지',
      '> 네메시스 데이터 군단의 접근을 확인했습니다',
      '> 데이터 대역폭 확보 완료. 유산 소환 대기',
      '> 판타지 / SF 데이터 압축 오류(Glitch) 허용 범위',
      '> 10 스테이지마다 히로인 카드 봉인 해제',
    ];
    this.msgIdx = 0;
    this.ticker = this.add.text(80, 1720, '', S(30, '#7dffb0', 0, 'normal')).setOrigin(0, 0.5);
    this.add.graphics().lineStyle(2, 0x7dffb0, 0.25).strokeRect(60, 1680, W - 120, 80);
    this.typeMessage();

    this.add.text(W / 2, 1860, 'v0.1  ·  RANDOM DEFENSE  ·  PROJECT ARCHIVE', S(22, '#4d5b78', 0, 'normal')).setOrigin(0.5);

    // 키보드: Enter / Space 로 시작, Esc 로 브리핑 닫기
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', e => {
        if (this.briefing) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') this.closeBriefing(); return; }
        if (e.key === 'Enter' || e.key === ' ') this.dive();
      });
    }

    // 주기적 글리치
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.glitch() });
    this.cameras.main.fadeIn(400, 5, 4, 9);
  }

  // 네온 외곽선 버튼 (누르고 있다가 버튼 위에서 떼면 실행)
  makeNeonButton(r, label, sub, color, onClick) {
    const S = RD.util.textStyle, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const hex = '#' + color.toString(16).padStart(6, '0');
    const g = this.add.graphics();
    const draw = (pressed, hover) => {
      g.clear();
      const off = pressed ? 4 : 0;
      g.fillStyle(color, pressed ? 0.35 : hover ? 0.22 : 0.12).fillRect(r.x, r.y + off, r.w, r.h);
      g.lineStyle(10, color, 0.18).strokeRect(r.x - 4, r.y - 4 + off, r.w + 8, r.h + 8);   // 바깥 글로우
      g.lineStyle(4, color, 1).strokeRect(r.x, r.y + off, r.w, r.h);
      // 모서리 브래킷
      const k = 26;
      g.lineStyle(6, 0xffffff, 0.9);
      [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]].forEach(([x, y, dx, dy]) => {
        g.lineBetween(x, y + off, x + k * dx, y + off); g.lineBetween(x, y + off, x, y + off + k * dy);
      });
      txt.y = (sub ? cy - 18 : cy) + off;
      if (subTxt) subTxt.y = cy + 38 + off;
    };
    const txt = this.add.text(cx, sub ? cy - 18 : cy, label, S(sub ? 60 : 44, '#ffffff')).setOrigin(0.5).setShadow(0, 0, hex, 18, false, true);
    const subTxt = sub ? this.add.text(cx, cy + 38, sub, S(24, hex, 0, 'normal')).setOrigin(0.5).setLetterSpacing(10) : null;
    let pressed = false;
    const zone = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(pressed, true));
    zone.on('pointerdown', () => { pressed = true; draw(true, true); });
    zone.on('pointerout', () => { pressed = false; draw(false, false); });
    zone.on('pointerup', () => { const was = pressed; pressed = false; draw(false, true); if (was && !this.briefing) onClick(); });
    draw(false, false);
    return zone;
  }

  typeMessage() {
    const msg = this.messages[this.msgIdx % this.messages.length];
    this.msgIdx++;
    let n = 0;
    if (this.typeEvt) this.typeEvt.remove();
    this.typeEvt = this.time.addEvent({
      delay: 32, repeat: msg.length - 1,
      callback: () => { n++; this.ticker.setText(msg.slice(0, n) + (n < msg.length ? '_' : '')); },
    });
    this.time.delayedCall(msg.length * 32 + 1800, () => this.typeMessage());
  }

  glitch() {
    const dx = Phaser.Math.Between(6, 14);
    this.titleC.x = RD.W / 2 - dx; this.titleM.x = RD.W / 2 + dx;
    this.title.x = RD.W / 2 + Phaser.Math.Between(-4, 4);
    this.time.delayedCall(90, () => { this.titleC.x = RD.W / 2 - 3; this.titleM.x = RD.W / 2 + 3; this.title.x = RD.W / 2; });
  }

  openBriefing() {
    if (this.briefing) return;
    const W = RD.W, H = RD.H, S = RD.util.textStyle, C = RD.CONFIG;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, W, H, 0x02010a, 0.85).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(0x0b0f24, 0.96).fillRect(80, 420, W - 160, 1080);
    g.lineStyle(4, 0xff2bd6, 1).strokeRect(80, 420, W - 160, 1080);
    c.add([dim, g]);
    c.add(this.add.text(W / 2, 520, '작전 브리핑', S(64, '#ffffff')).setOrigin(0.5).setShadow(0, 0, '#ff2bd6', 18, false, true));
    c.add(this.add.text(W / 2, 590, 'MISSION BRIEFING', S(24, '#ff2bd6', 0, 'normal')).setOrigin(0.5).setLetterSpacing(8));
    const lines = [
      ['소환', '적 처치로 얻은 골드로 인류의 유산을 무작위 소환'],
      ['조합', '같은 유닛 3개 → 다음 레벨 (타입도 매번 무작위, 최대 Lv.5)'],
      ['히든', '정해진 재료 3개 → 히든 유닛 Lv.5~8 (레시피 도감)'],
      ['상성', '워리어→기동형 · 아처→장갑형 · 위저드→데이터형 강함'],
      ['강화', '광물로 타입 강화 · 골드로 채굴 강화'],
      ['패배', `전장의 적이 ${C.enemyLimit}기에 도달하면 링크 붕괴`],
      ['보스', `${C.bossEvery}스테이지마다 방화벽 보스, ${C.bossTime}초 안에 돌파`],
      ['해금', '10스테이지마다 히로인 카드 봉인 해제'],
    ];
    lines.forEach(([k, v], i) => {
      const y = 712 + i * 84;
      g.lineStyle(3, 0x00e5ff, 1).strokeRect(130, y - 30, 120, 60);
      c.add(this.add.text(190, y, k, S(30, '#00e5ff')).setOrigin(0.5));
      c.add(this.add.text(280, y, v, S(30, '#e6ecff', 0, 'normal')).setOrigin(0, 0.5));
    });
    const close = this.add.text(W / 2, 1420, '터치하여 닫기', S(38, '#ffffff')).setOrigin(0.5);
    this.tweens.add({ targets: close, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });
    c.add(close);
    dim.on('pointerup', () => this.closeBriefing());
    this.briefing = c;
  }

  closeBriefing() {
    if (!this.briefing) return;
    this.briefing.destroy();
    this.time.delayedCall(0, () => { this.briefing = null; });   // 같은 pointerup 으로 버튼이 눌리지 않도록 한 틱 지연
  }

  dive() {
    if (this.started) return;
    this.started = true;
    RD.BGM.start(0);                       // 터치 이벤트 안에서 시작해야 모바일 자동재생 제한에 안 걸림
    this.linkState.setText('● DIVING').setColor('#00e5ff');
    this.ticker.setText('> 뉴럴 다이브 개시. 결계 진입...');
    const cam = this.cameras.main;
    cam.flash(250, 0, 229, 255);
    cam.shake(300, 0.006);
    this.time.delayedCall(260, () => cam.fadeOut(400, 5, 4, 9));
    cam.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
  }

  update(time, delta) {
    const dt = delta / 1000, W = RD.W, H = RD.H, hy = this.horizonY;
    this.t += dt;
    const g = this.grid;
    g.clear();

    // 상단 평면 그리드 (희미하게)
    g.lineStyle(1, 0x3a2a7a, 0.25);
    for (let x = 0; x <= W; x += 90) g.lineBetween(x, 0, x, hy);
    for (let y = 0; y <= hy; y += 90) g.lineBetween(0, y, W, y);

    // 수평선 글로우
    g.lineStyle(14, 0xff2bd6, 0.12).lineBetween(0, hy, W, hy);
    g.lineStyle(3, 0xff2bd6, 0.9).lineBetween(0, hy, W, hy);

    // 원근 그리드: 소실점으로 모이는 세로선 + 다가오는 가로선
    const vx = W / 2;
    g.lineStyle(2, 0x00e5ff, 0.45);
    for (let i = -12; i <= 12; i++) g.lineBetween(vx + i * 30, hy, vx + i * 260, H);
    const scroll = (this.t * 0.6) % 1;
    for (let i = 0; i < 14; i++) {
      const p = (i + scroll) / 14;            // 0(수평선) → 1(화면 아래)
      const y = hy + (H - hy) * p * p;
      g.lineStyle(2, 0x00e5ff, 0.15 + 0.6 * p).lineBetween(0, y, W, y);
    }

    // 사각 결계 엠블럼 (이중 회전 사각형)
    const e = this.emblem;
    e.clear();
    const pulse = 1 + 0.05 * Math.sin(this.t * 3);
    e.lineStyle(4, 0x00e5ff, 0.9);
    this.rotSquare(e, 110 * pulse, this.t * 0.6);
    e.lineStyle(3, 0xff2bd6, 0.8);
    this.rotSquare(e, 76 * pulse, -this.t * 0.9 + Math.PI / 4);
    e.lineStyle(10, 0x00e5ff, 0.12);
    this.rotSquare(e, 110 * pulse, this.t * 0.6);

    // 데이터 입자 (위로 흘러감)
    for (const b of this.bits) {
      b.y -= b.speed * dt;
      if (b.y < -30) { b.y = H + 30; b.x = Phaser.Math.Between(0, W); }
    }
  }

  rotSquare(g, r, a) {
    const pts = [];
    for (let i = 0; i < 4; i++) pts.push(new Phaser.Math.Vector2(Math.cos(a + i * Math.PI / 2) * r, Math.sin(a + i * Math.PI / 2) * r));
    g.strokePoints(pts, true);
  }
};
