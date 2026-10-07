/* =====================================================================
 * 공격 효과음 (Web Audio).  음원 파일 없이 시작 시 코드로 합성해 버퍼로 만들어 둔다.
 *  - 공격 연출(fx)별 소리: 워리어 slash, 아처 arrow/bullet/missile, 위저드 orb/beam/lightning/fire/holy
 *  - 배경 음악이 묻히지 않도록: 효과음 전체 볼륨을 낮게(RD.SFX_VOLUME) + 고음 컷 + 컴프레서
 *  - 유닛이 많아도 시끄럽지 않게: 같은 소리 최소 간격(GAP), 동시 재생 수 제한(MAX_VOICES),
 *    최근 재생이 몰리면 한 번당 볼륨을 줄임
 *  - 모바일 자동재생 제한: 첫 터치/키 입력 때 AudioContext 를 만들고 resume
 * ===================================================================== */
window.RD = window.RD || {};

RD.SFX = (() => {
  const MAX_VOICES = 6;           // 동시에 울리는 효과음 수 상한
  const GAP = 0.08;               // 같은 소리의 최소 간격(초)
  const GAP_ALL = 0.035;          // 아무 소리든 연달아 낼 때 최소 간격(초)
  const GAIN = { slash: 0.55, slashH: 0.6, arrow: 0.5, bullet: 0.38, missile: 0.6, orb: 0.42, beam: 0.3, lightning: 0.45, fire: 0.5, holy: 0.38 };
  let ctx = null, bus = null, bufs = null, voices = 0, muted = false;
  const last = {};                // 소리별 마지막 재생 시각
  let lastAny = -1;
  let recent = 0, recentAt = 0;   // 최근 재생 밀도 (볼륨 자동 감소용)

  // ── 합성 도우미 ──
  function render(sr, dur, fn) {
    const n = Math.floor(sr * dur), d = new Float32Array(n);
    fn(d, sr, n);
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < n; i++) d[i] /= peak;
    const fade = Math.min(n, Math.floor(sr * 0.004));            // 끝 클릭 방지
    for (let i = 0; i < fade; i++) d[n - 1 - i] *= i / fade;
    return d;
  }
  const env = (t, a, dec) => (t < a ? t / a : Math.exp(-(t - a) / dec));
  // 상태 변수 필터 (cutoff 를 시간에 따라 바꿀 수 있음). mode: lp | bp | hp
  function svf(mode, q) {
    let low = 0, band = 0;
    return (x, fc, sr) => {
      const f = 2 * Math.sin(Math.PI * Math.min(fc, sr / 6) / sr);
      low += f * band;
      const high = x - low - q * band;
      band += f * high;
      return mode === 'lp' ? low : mode === 'bp' ? band : high;
    };
  }
  const noise = () => Math.random() * 2 - 1;

  const GEN = {
    // 칼 휘두르는 소리: 대역 필터가 높은 음에서 낮은 음으로 쓸려 내려가는 노이즈
    slash: (d, sr, n) => {
      const f = svf('bp', 0.7);
      for (let i = 0; i < n; i++) { const t = i / sr; d[i] = f(noise(), 3800 * Math.exp(-t * 14) + 700, sr) * env(t, 0.008, 0.05); }
    },
    // 상위 워리어: 휘두름 + 묵직한 타격음
    slashH: (d, sr, n) => {
      const f = svf('bp', 0.7);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (110 * Math.exp(-t * 8) + 45) / sr;
        d[i] = f(noise(), 3200 * Math.exp(-t * 12) + 600, sr) * env(t, 0.006, 0.06) + Math.sin(ph) * env(t, 0.004, 0.07) * 0.9;
      }
    },
    // 활시위 튕기는 소리 + 화살 바람 소리
    arrow: (d, sr, n) => {
      const h = svf('hp', 1.2);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (210 - 60 * Math.min(1, t * 20)) / sr;
        const tw = (Math.sin(ph) + 0.3 * Math.sin(ph * 2)) * env(t, 0.002, 0.035);
        d[i] = tw + 0.5 * h(noise(), 4000, sr) * env(t, 0.02, 0.04);
      }
    },
    // 짧은 총성
    bullet: (d, sr, n) => {
      const f = svf('lp', 0.9);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (500 * Math.exp(-t * 60) + 120) / sr;
        d[i] = f(noise(), 2600, sr) * env(t, 0.001, 0.018) + 0.6 * Math.sin(ph) * env(t, 0.001, 0.025);
      }
    },
    // 포탄 발사: 낮게 떨어지는 쿵 + 거친 노이즈
    missile: (d, sr, n) => {
      const f = svf('lp', 0.8);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (150 * Math.exp(-t * 14) + 40) / sr;
        d[i] = Math.sin(ph) * env(t, 0.003, 0.09) + 0.7 * f(noise(), 1400 * Math.exp(-t * 6) + 200, sr) * env(t, 0.005, 0.07);
      }
    },
    // 마법 구체: 위로 올라가는 부드러운 음 (살짝 떨림)
    orb: (d, sr, n) => {
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (380 + 520 * Math.min(1, t / 0.12)) * (1 + 0.02 * Math.sin(t * 2 * Math.PI * 28)) / sr;
        d[i] = (Math.sin(ph) + 0.25 * Math.sin(ph * 2.01)) * env(t, 0.01, 0.06);
      }
    },
    // 레이저 "퓨": 빠르게 내려가는 음 (고음은 필터로 깎음)
    beam: (d, sr, n) => {
      const f = svf('lp', 0.8);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (1500 * Math.exp(-t * 22) + 220) / sr;
        const sq = Math.sin(ph) + Math.sin(ph * 3) / 3 + Math.sin(ph * 5) / 5;
        d[i] = f(sq, 3000, sr) * env(t, 0.002, 0.045);
      }
    },
    // 번개: 지직거리는 노이즈 + 낮은 울림
    lightning: (d, sr, n) => {
      const f = svf('bp', 0.5);
      let gate = 1, ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        if (i % Math.floor(sr * 0.006) === 0) gate = Math.random() < 0.55 ? 1 : 0.15;
        ph += 2 * Math.PI * 55 / sr;
        d[i] = f(noise(), 2400, sr) * gate * env(t, 0.002, 0.07) + 0.5 * Math.sin(ph) * env(t, 0.005, 0.1);
      }
    },
    // 불꽃: 낮게 깔린 "화륵" 노이즈
    fire: (d, sr, n) => {
      const f = svf('lp', 0.6);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const flick = 0.75 + 0.25 * Math.sin(t * 2 * Math.PI * 23 + Math.sin(t * 61) * 2);
        d[i] = f(noise(), 700 + 900 * Math.exp(-t * 10), sr) * flick * env(t, 0.025, 0.09);
      }
    },
    // 신성 마법: 맑은 종소리
    holy: (d, sr, n) => {
      const parts = [[880, 1, 0.16], [1320, 0.5, 0.11], [2210, 0.25, 0.07]];
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        let s = 0;
        for (const [hz, a, dec] of parts) s += a * Math.sin(2 * Math.PI * hz * t) * env(t, 0.003, dec);
        d[i] = s;
      }
    },
  };
  const DUR = { slash: 0.16, slashH: 0.22, arrow: 0.14, bullet: 0.09, missile: 0.28, orb: 0.22, beam: 0.16, lightning: 0.24, fire: 0.3, holy: 0.42 };

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    // 효과음 버스: 볼륨 → 고음 컷(귀 아프지 않게) → 컴프레서(몰릴 때 뭉개지지 않게) → 출력
    bus = ctx.createGain();
    bus.gain.value = muted ? 0 : RD.SFX_VOLUME;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 7000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 8; comp.ratio.value = 6;
    comp.attack.value = 0.003; comp.release.value = 0.15;
    bus.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
    bufs = {};
    const sr = ctx.sampleRate;
    for (const k in GEN) {
      const data = render(sr, DUR[k], GEN[k]);
      const b = ctx.createBuffer(1, data.length, sr);
      b.getChannelData(0).set(data);
      bufs[k] = b;
    }
  }

  // 첫 사용자 입력에서 생성/재개 (모바일 자동재생 제한)
  const unlock = () => { init(); if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume(); };
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, true));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  function play(key, vol, force) {
    if (!ctx || ctx.state !== 'running' || muted || !bufs[key]) return false;
    const now = ctx.currentTime;
    if (!force && (now - (last[key] || -1) < GAP || now - lastAny < GAP_ALL)) return false;
    if (voices >= MAX_VOICES) return false;
    last[key] = lastAny = now;
    // 최근 0.25초 동안 많이 울렸으면 한 번당 볼륨을 낮춤
    recent = recent * Math.exp(-(now - recentAt) / 0.25) + 1; recentAt = now;
    const g = ctx.createGain();
    g.gain.value = (GAIN[key] || 0.4) * vol / Math.sqrt(Math.max(1, recent / 2));
    const src = ctx.createBufferSource();
    src.buffer = bufs[key];
    src.playbackRate.value = 0.92 + Math.random() * 0.16;      // 매번 살짝 다른 음높이
    src.connect(g); g.connect(bus);
    voices++;
    src.onended = () => { voices--; g.disconnect(); };
    src.start();
    return true;
  }

  return {
    // 유닛 공격 시 호출 (t = 유닛 타입 데이터)
    attack(t) {
      let key = t.fx;
      if (key === 'slash' && t.grade >= 2) key = 'slashH';
      // 레벨이 높을수록 조금 크게, Lv.3 은 간격 제한을 무시 (동시 재생 수 제한은 적용)
      play(key, 0.75 + 0.1 * t.grade, t.grade >= 3);
    },
    play,
    setMuted(m) { muted = !!m; if (bus) bus.gain.value = muted ? 0 : RD.SFX_VOLUME; },
    get muted() { return muted; },
    get ready() { return !!ctx && ctx.state === 'running'; },
  };
})();
