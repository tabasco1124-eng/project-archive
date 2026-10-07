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
  info:       { x: 20,  y: 1336, w: 1040, h: 200 },
  btnCombine: { x: 20,  y: 1552, w: 330, h: 168 },
  btnSell:    { x: 374, y: 1552, w: 330, h: 168 },
  btnSummon:  { x: 728, y: 1552, w: 332, h: 168 },
  upg: [                                    // 계열 강화 (광물)
    { x: 20,  y: 1736, w: 248, h: 164 },
    { x: 284, y: 1736, w: 248, h: 164 },
    { x: 548, y: 1736, w: 248, h: 164 },
  ],
  btnMine:    { x: 812, y: 1736, w: 248, h: 164 },   // 채굴 강화 (골드)
  btnPause:   { x: 784, y: 20, w: 120, h: 80 },
  btnSpeed:   { x: 924, y: 20, w: 132, h: 80 },
  btnRestart: { x: 300, y: 1180, w: 480, h: 144 },
};

RD.FX_SPEED = { arrow: 1300, bullet: 1900, orb: 860, fire: 800, holy: 960, missile: 1040 };
RD.INSTANT_FX = { slash: 1, beam: 1, lightning: 1 };
