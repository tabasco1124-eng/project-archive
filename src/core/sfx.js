/* =====================================================================
 * 공격 효과음 (Web Audio).  CC0(저작권 없음) 녹음 효과음을 잘라 쓴다 → assets/audio/sfx/CREDITS.txt
 *  - 공격 연출(fx)별 소리 묶음, 매번 그중 하나를 골라 반복감을 줄임
 *      워리어 slash: 칼 휘두름 (Lv.2 이상은 도끼 휘두름 + 타격음)
 *      아처 arrow: 활/석궁 발사, bullet: 총성, missile: 포격
 *      위저드 orb: 마법 시전, beam: 레이저 (Lv.2 이상은 큰 레이저), lightning: 천둥, fire: 화염, holy: 낮은 마법 시전음
 *  - 유닛 데이터에 sfx(소리 묶음 이름)가 있으면 fx 대신 그 소리를 씀 (예: 민병대 → 휘두름)
 *  - 배경 음악이 묻히지 않도록: 효과음 전체 볼륨을 낮게(RD.SFX_VOLUME) + 고음 살짝 컷 + 컴프레서
 *  - 유닛이 많아도 시끄럽지 않게: 같은 소리 최소 간격(GAP), 동시 재생 수 제한(MAX_VOICES),
 *    최근 재생이 몰리면 한 번당 볼륨을 줄임
 *  - 모바일 자동재생 제한: 첫 터치/키 입력 때 AudioContext 를 만들고 resume
 * ===================================================================== */
window.RD = window.RD || {};

RD.SFX = (() => {
  const MAX_VOICES = 6;           // 동시에 울리는 효과음 수 상한
  const GAP = 0.08;               // 같은 소리 묶음의 최소 간격(초)
  const GAP_ALL = 0.035;          // 아무 소리든 연달아 낼 때 최소 간격(초)
  // 소리 묶음: 파일 목록 + 기본 볼륨 (파일마다 음량 차이를 맞춘 값)
  const SETS = {
    sword:  { files: ['sword1', 'sword2', 'sword3'], gain: 0.5 },
    heavy:  { files: ['heavy1', 'heavy2'], gain: 0.55 },
    bow:    { files: ['bow1', 'bow2', 'bow3'], gain: 0.85 },
    gun:    { files: ['gun1', 'gun2'], gain: 0.6 },
    cannon: { files: ['cannon1'], gain: 0.42 },
    orb:    { files: ['orb1', 'orb2'], gain: 0.5 },
    beam:   { files: ['beam1'], gain: 0.38 },
    beamH:  { files: ['beam2'], gain: 0.35 },
    bolt:   { files: ['bolt1'], gain: 0.5 },
    fire:   { files: ['fire1', 'fire2'], gain: 0.7 },
    holy:   { files: ['orb1', 'orb2'], gain: 0.5, rate: 0.8 },   // 신성 마법: 마법 시전음을 낮은 음으로
  };
  // 공격 연출(fx) → 소리 묶음 [Lv.0~1, Lv.2 이상]
  const FX = {
    slash: ['sword', 'heavy'], arrow: ['bow', 'bow'], bullet: ['gun', 'gun'], missile: ['cannon', 'cannon'],
    orb: ['orb', 'orb'], beam: ['beam', 'beamH'], lightning: ['bolt', 'bolt'], fire: ['fire', 'fire'], holy: ['holy', 'holy'],
  };
  let ctx = null, bus = null, voices = 0, muted = false;
  const bufs = {};                // 파일 이름 → AudioBuffer (불러오기 끝난 것만)
  const last = {};                // 소리 묶음별 마지막 재생 시각
  let lastAny = -1;
  let recent = 0, recentAt = 0;   // 최근 재생 밀도 (볼륨 자동 감소용)

  function decode(ab) {
    return new Promise((ok, fail) => {
      const p = ctx.decodeAudioData(ab, ok, fail);   // 구형 Safari 는 콜백 방식만 지원
      if (p && p.then) p.then(ok, fail);
    });
  }
  function loadAll() {
    const list = (RD.ASSETS && RD.ASSETS.sfx) || {};
    for (const k in list) {
      fetch(RD.assetUrl(list[k].url))
        .then(r => r.arrayBuffer()).then(decode)
        .then(b => { bufs[k] = b; }, e => console.warn('[RD] 효과음을 불러오지 못했습니다:', k, e));
    }
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    // 효과음 버스: 볼륨 → 고음 살짝 컷(귀 아프지 않게) → 컴프레서(몰릴 때 뭉개지지 않게) → 출력
    bus = ctx.createGain();
    bus.gain.value = muted ? 0 : RD.SFX_VOLUME;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 8; comp.ratio.value = 6;
    comp.attack.value = 0.003; comp.release.value = 0.15;
    bus.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
    loadAll();
  }

  // 첫 사용자 입력에서 생성/재개 (모바일 자동재생 제한)
  const unlock = () => { init(); if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume(); };
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, true));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  function play(set, vol, force) {
    const S = SETS[set];
    if (!ctx || ctx.state !== 'running' || muted || !S) return false;
    const ready = S.files.filter(f => bufs[f]);
    if (!ready.length) return false;
    const now = ctx.currentTime;
    if (!force && (now - (last[set] || -1) < GAP || now - lastAny < GAP_ALL)) return false;
    if (voices >= MAX_VOICES) return false;
    last[set] = lastAny = now;
    // 최근 0.25초 동안 많이 울렸으면 한 번당 볼륨을 낮춤
    recent = recent * Math.exp(-(now - recentAt) / 0.25) + 1; recentAt = now;
    const g = ctx.createGain();
    g.gain.value = S.gain * (vol || 1) / Math.sqrt(Math.max(1, recent / 2));
    const src = ctx.createBufferSource();
    src.buffer = bufs[ready[Math.floor(Math.random() * ready.length)]];
    src.playbackRate.value = (S.rate || 1) * (0.95 + Math.random() * 0.1);   // 매번 살짝 다른 음높이
    src.connect(g); g.connect(bus);
    voices++;
    src.onended = () => { voices--; g.disconnect(); };
    src.start();
    return true;
  }

  return {
    // 유닛 공격 시 호출 (t = 유닛 타입 데이터)
    attack(t) {
      const sets = t.sfx ? [t.sfx, t.sfx] : FX[t.fx];
      if (!sets) return;
      // 레벨이 높을수록 조금 크게, Lv.3 은 간격 제한을 무시 (동시 재생 수 제한은 적용)
      play(sets[t.grade >= 2 ? 1 : 0], 0.8 + 0.08 * Math.min(t.grade, 4), t.grade >= 3);
    },
    play,
    setMuted(m) { muted = !!m; if (bus) bus.gain.value = muted ? 0 : RD.SFX_VOLUME; },
    get muted() { return muted; },
    get ready() { return !!ctx && ctx.state === 'running'; },
    get loaded() { return Object.keys(bufs).length; },
  };
})();
