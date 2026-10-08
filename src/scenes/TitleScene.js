/* TitleScene: 시작 화면 (프로젝트 아카이브). 화면을 터치하면 지휘관 로비(LobbyScene)로
 * 사이버 네온 그리드 테마
 * 레이아웃 (1080x1920 기준)
 *   y 120        상단 링크 상태 바
 *   y 440~790    타이틀 / 서브타이틀 / 세계관 한 줄
 *   y 1060       사각 결계 엠블럼 (회전)
 *   y 1400       '화면을 터치하여 접속' (깜빡임)
 *   y 1720       시스템 메시지 티커
 *   y 1860       하단 버전 표기
 */
window.RD = window.RD || {};

RD.TitleScene = class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const W = RD.W, S = RD.util.textStyle;
    this.started = false;
    this.t = 0;
    this.bg = RD.Neon.background(this, 1180);

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
    this.add.text(W / 2, 1060, 'NX', S(44, '#00e5ff')).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 16, false, true);

    // ── 접속 안내 ──
    this.touch = this.add.text(W / 2, 1400, '화면을 터치하여 접속', S(48, '#ffffff')).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 18, false, true);
    this.add.text(W / 2, 1462, 'TOUCH TO CONNECT', S(24, '#00e5ff', 0, 'normal')).setOrigin(0.5).setLetterSpacing(10);
    this.tweens.add({ targets: this.touch, alpha: 0.35, duration: 800, yoyo: true, repeat: -1 });

    // ── 시스템 메시지 티커 ──
    this.messages = [
      '> 그랜드 아카이브 코어 서버에 접속 중...',
      '> 경고: 지휘관 기억 데이터 손상 감지',
      '> 네메시스 데이터 군단의 접근을 확인했습니다',
      '> 데이터 대역폭 확보 완료. 유산 소환 대기',
      '> 판타지 / SF 데이터 압축 오류(Glitch) 허용 범위',
      '> 기억 파편을 회수해 히로인 카드의 봉인을 해제하십시오',
    ];
    this.msgIdx = 0;
    this.ticker = this.add.text(80, 1720, '', S(30, '#7dffb0', 0, 'normal')).setOrigin(0, 0.5);
    this.add.graphics().lineStyle(2, 0x7dffb0, 0.25).strokeRect(60, 1680, W - 120, 80);
    this.typeMessage();

    this.add.text(W / 2, 1860, 'v0.2  ·  RANDOM DEFENSE  ·  PROJECT ARCHIVE', S(22, '#4d5b78', 0, 'normal')).setOrigin(0.5);

    // 아무 곳이나 터치 / Enter / Space → 로비
    this.input.once('pointerup', () => this.connect());
    if (this.input.keyboard) this.input.keyboard.on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this.connect(); });

    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.glitch() });
    this.cameras.main.fadeIn(400, 5, 4, 9);
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

  connect() {
    if (this.started) return;
    this.started = true;
    this.linkState.setText('● LINKED').setColor('#00e5ff');
    this.ticker.setText('> 지휘관 인증 완료. 로비로 이동합니다...');
    const cam = this.cameras.main;
    cam.flash(200, 0, 229, 255);
    this.time.delayedCall(200, () => cam.fadeOut(300, 5, 4, 9));
    cam.once('camerafadeoutcomplete', () => this.scene.start('LobbyScene'));
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.t += dt;
    this.bg.update(dt);
    // 사각 결계 엠블럼 (이중 회전 사각형)
    const e = this.emblem;
    e.clear();
    const pulse = 1 + 0.05 * Math.sin(this.t * 3);
    e.lineStyle(4, 0x00e5ff, 0.9);
    RD.TitleScene.rotSquare(e, 110 * pulse, this.t * 0.6);
    e.lineStyle(3, 0xff2bd6, 0.8);
    RD.TitleScene.rotSquare(e, 76 * pulse, -this.t * 0.9 + Math.PI / 4);
    e.lineStyle(10, 0x00e5ff, 0.12);
    RD.TitleScene.rotSquare(e, 110 * pulse, this.t * 0.6);
  }

  static rotSquare(g, r, a) {
    const pts = [];
    for (let i = 0; i < 4; i++) pts.push(new Phaser.Math.Vector2(Math.cos(a + i * Math.PI / 2) * r, Math.sin(a + i * Math.PI / 2) * r));
    g.strokePoints(pts, true);
  }
};
