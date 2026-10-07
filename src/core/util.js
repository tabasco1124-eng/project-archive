/* 공용 유틸 */
window.RD = window.RD || {};

RD.util = (() => {
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  // 한국식 큰 수 표기: 12,345 → 1.2만, 3억
  function trim1(v) { return v >= 100 ? Math.floor(v).toString() : v.toFixed(1).replace(/\.0$/, ''); }
  function fmt(n) {
    n = Math.floor(n);
    if (n >= 1e8) return trim1(n / 1e8) + '억';
    if (n >= 1e4) return trim1(n / 1e4) + '만';
    return n.toLocaleString('ko-KR');
  }
  // 소수 한 자리 (2 → '2', 3.5 → '3.5')
  const fmt1 = v => (Math.round(v * 10) / 10).toString();
  function isLight(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150;
  }
  // '#rrggbb' | 'rainbow' → 0xRRGGBB
  const colorCache = {};
  function colorInt(c) {
    if (c === 'rainbow') return rainbowInt();
    let v = colorCache[c];
    if (v === undefined) v = colorCache[c] = parseInt(c.slice(1), 16);
    return v;
  }
  function hsvToInt(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) { case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; default: r = v; g = p; b = q; }
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
  }
  function rainbowInt() { return hsvToInt(((performance.now() / 8) % 360) / 360, 0.7, 1); }
  // 등급 색 (히든은 무지개)
  function gradeColorStr(g) { return RD.GRADES[g].rainbow ? 'rainbow' : RD.GRADES[g].color; }
  function gradeColorInt(g) { return colorInt(gradeColorStr(g)); }

  // 경로 위 거리 s → 좌표 (off: 경로 바깥쪽 오프셋)
  function pathPos(s, off, out) {
    const P = RD.PATH, PW = RD.PW, PH = RD.PH, PERIM = RD.PERIM;
    s = ((s % PERIM) + PERIM) % PERIM;
    if (s < PW) { out.x = P.l + s; out.y = P.t - off; return out; }
    s -= PW;
    if (s < PH) { out.x = P.r + off; out.y = P.t + s; return out; }
    s -= PH;
    if (s < PW) { out.x = P.r - s; out.y = P.b + off; return out; }
    s -= PW;
    out.x = P.l - off; out.y = P.b - s; return out;
  }
  function cellCenter(col, row) {
    const G = RD.GRID;
    return { x: G.x + col * G.cell + G.cell / 2, y: G.y + row * G.cell + G.cell / 2 };
  }
  function cellAt(p) {
    const G = RD.GRID;
    const col = Math.floor((p.x - G.x) / G.cell), row = Math.floor((p.y - G.y) / G.cell);
    if (col < 0 || row < 0 || col >= G.cols || row >= G.rows) return null;
    return { col, row };
  }
  function specialText(t) {
    const a = [];
    if (t.splash) a.push(`광역 ${t.splash}`);
    if (t.slow) a.push(`감속 ${Math.round(t.slow * 100)}%`);
    if (t.stun) a.push(`기절 ${Math.round(t.stun * 100)}%`);
    if (t.spd <= 0.35) a.push('고속 공격');
    if (!a.length) a.push('단일 공격');
    return a.join(' · ');
  }
  // Phaser 텍스트 스타일
  function textStyle(size, color, stroke, weight) {
    return { fontFamily: RD.FONT, fontSize: size + 'px', fontStyle: weight || 'bold', color: color || '#ffffff',
      stroke: '#000000', strokeThickness: stroke || 0, resolution: RD.TEXT_RES };
  }
  // 바뀐 경우에만 텍스트 갱신 (텍스처 재생성 비용 절약)
  function setText(t, s, color) {
    if (t.text !== s) t.setText(s);
    if (color && t._rdColor !== color) { t.setColor(color); t._rdColor = color; }
  }

  return { TAU, rand, pick, clamp, inRect, fmt, fmt1, isLight, colorInt, hsvToInt, gradeColorStr, gradeColorInt,
    pathPos, cellCenter, cellAt, specialText, textStyle, setText };
})();
