/* 맵 / 화면 레이아웃 상수 (1080x1920 논리 좌표) */
window.RD = window.RD || {};

RD.PATH = { l: 90, t: 250, r: 990, b: 1270, w: 88 };     // 적 이동 경로(중심선 사각형)
RD.PW = RD.PATH.r - RD.PATH.l;
RD.PH = RD.PATH.b - RD.PATH.t;
RD.PERIM = 2 * (RD.PW + RD.PH);
RD.GRID = { x: 140, y: 310, cols: 8, rows: 9, cell: 100 };  // 유닛 배치 칸
RD.UNIT_CAP = RD.GRID.cols * RD.GRID.rows;

RD.UI = {
  hudH: 200,
  panelY: 1320,
  info:       { x: 20,  y: 1332, w: 1040, h: 172 },
  auto: [                                   // 타입별 자동 조합 + 레벨별 보유 수 (RD.AUTO_KEYS 순서)
    { x: 20,  y: 1516, w: 248, h: 112 },
    { x: 284, y: 1516, w: 248, h: 112 },
    { x: 548, y: 1516, w: 248, h: 112 },
    { x: 812, y: 1516, w: 248, h: 112 },
  ],
  btnCombine: { x: 20,  y: 1640, w: 330, h: 136 },
  btnSell:    { x: 374, y: 1640, w: 330, h: 136 },
  btnSummon:  { x: 728, y: 1640, w: 332, h: 136 },
  upg: [                                    // 계열 강화 (광물)
    { x: 20,  y: 1788, w: 248, h: 116 },
    { x: 284, y: 1788, w: 248, h: 116 },
    { x: 548, y: 1788, w: 248, h: 116 },
  ],
  btnMine:    { x: 812, y: 1788, w: 248, h: 116 },   // 채굴 강화 (골드)
  btnPause:   { x: 784, y: 20, w: 120, h: 80 },
  btnSpeed:   { x: 924, y: 20, w: 132, h: 80 },
  btnRestart: { x: 300, y: 1180, w: 480, h: 144 },
};

RD.FX_SPEED = { arrow: 1300, bullet: 1900, orb: 860, fire: 800, holy: 960, missile: 1040 };
RD.INSTANT_FX = { slash: 1, beam: 1, lightning: 1 };
