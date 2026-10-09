/* =====================================================================
 * 배경 음악 (HTML5 Audio 1개를 재사용).  Phaser 오디오는 꺼져 있음(main.js noAudio).
 *  - 라운드 구간(RD.BGM_TRACKS)에 맞는 트랙을 반복 재생, 구간이 바뀌면 페이드 전환
 *  - 일시정지 / 게임 오버 / 탭 숨김 시 멈춤
 *  - 모바일 자동재생 제한: 첫 터치(다이브 버튼 등) 안에서 play() 해야 하므로
 *    play 가 거부되면 다음 터치 때 다시 시도
 *  - 웹 주소로 열었을 때는 효과음과 같은 Web Audio 마스터(리미터)로 보내 볼륨을 GainNode 로 조절
 *    (아이폰은 audio.volume 을 무시해서 항상 최대 음량으로 나오고, 효과음과 따로 나가면 겹칠 때 찢어짐)
 *    파일로 직접 연 빌드(file://)는 Web Audio 로 보내면 무음이 되므로 예전처럼 audio.volume 사용
 * ===================================================================== */
window.RD = window.RD || {};

RD.BGM = (() => {
  const FADE = 0.8;                 // 페이드 시간(초)
  let el = null, cur = null, want = null, paused = false, vol = 0, fadeTimer = null, blocked = false;
  let gain = null;                  // Web Audio 경로일 때 볼륨 노드

  function audio() {
    if (!el) {
      el = new Audio();
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      routeToMaster();
    }
    return el;
  }
  function routeToMaster() {
    if (!/^https?:$/.test(location.protocol) || !RD.SFX || !RD.SFX.musicBus) return;
    try {
      const bus = RD.SFX.musicBus();
      if (!bus) return;
      const ctx = bus.context;
      const g = ctx.createGain();
      g.gain.value = 0;
      ctx.createMediaElementSource(el).connect(g);
      g.connect(bus);
      gain = g;
      el.volume = 1;
    } catch (e) { gain = null; el.volume = 0; console.warn('[RD] 배경 음악을 Web Audio 로 연결하지 못해 기본 재생을 씁니다:', e); }
  }
  function setVol(v) {
    v = Math.max(0, Math.min(1, v));
    if (gain) gain.gain.setTargetAtTime(v, gain.context.currentTime, 0.015);
    else el.volume = v;
  }
  function trackFor(round) {
    const r = Math.max(1, round);
    return RD.BGM_TRACKS.find(t => r >= t.from && r <= t.to) || null;
  }
  function tryPlay() {
    const a = audio();
    if (gain && gain.context.state !== 'running' && !document.hidden) gain.context.resume().catch(() => {});
    const p = a.play();
    if (p && p.catch) p.then(() => { blocked = false; }, () => { blocked = true; });
  }
  // 목표 볼륨으로 서서히 (to=0 이면 끝난 뒤 done 호출)
  function fadeTo(to, done) {
    clearInterval(fadeTimer);
    const a = audio(), from = vol, steps = Math.max(1, Math.round(FADE * 20));
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      vol = from + (to - from) * (i / steps);
      setVol(vol);
      if (i >= steps) { clearInterval(fadeTimer); fadeTimer = null; if (done) done(); }
    }, 50);
  }
  function apply() {
    const a = audio();
    if (want !== cur) {
      const next = want;
      const swap = () => {
        cur = next;
        if (!next) { a.pause(); return; }
        a.src = (RD.BGM_BASE || '') + next.url;
        a.currentTime = 0;
        if (!paused) { tryPlay(); fadeTo(RD.BGM_VOLUME); }
        if (want !== cur) apply();          // 페이드 도중 목표가 또 바뀐 경우
      };
      if (cur && !a.paused && vol > 0) fadeTo(0, swap); else { vol = 0; setVol(0); swap(); }
      return;
    }
    if (!cur) return;
    if (paused) { if (!a.paused) a.pause(); }
    else if (a.paused) { tryPlay(); fadeTo(RD.BGM_VOLUME); }
  }

  // 막혔던 재생을 다음 사용자 입력에서 재시도
  const unlock = () => { if (blocked && cur && !paused) tryPlay(); };
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, true));
  document.addEventListener('visibilitychange', () => {
    if (!el || !cur) return;
    if (document.hidden) el.pause(); else if (!paused) tryPlay();
  });

  return {
    // 라운드에 맞는 트랙으로 (같은 트랙이면 그대로 이어서 재생)
    setRound(round) {
      const t = trackFor(round);
      if (t !== want) { want = t; apply(); }
    },
    setPaused(p) { if (p !== paused) { paused = p; apply(); } },
    // 다이브 버튼처럼 사용자 입력 안에서 호출 → 모바일에서도 재생 허용
    start(round) { paused = false; want = trackFor(round || 0); apply(); },
    stop() { want = null; apply(); },
    get trackUrl() { return cur ? cur.url : null; },
    get playing() { return !!el && !el.paused; },
  };
})();
