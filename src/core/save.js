/* =====================================================================
 * 저장 시스템 (localStorage 한 키에 JSON 하나)
 *  - 버전이 붙은 저장 객체: 구조를 바꿀 때는 VERSION 을 올리고 MIGRATE 에 이전 버전 → 다음 버전 변환을 추가
 *    (100+ 스테이지 체크포인트, 추가 영구 강화 등은 새 필드를 넣고 fresh() 에 기본값만 추가하면 됨: load 시 기본값과 병합)
 *  - 저장이 막힌 환경(시크릿 모드, node 시뮬레이터)에서는 메모리에만 두고 그 세션 동안 동작
 *  - 이전 버전의 개별 키(rd_difficulty_v1, rd_codex_v1)는 처음 불러올 때 가져옴
 * ===================================================================== */
window.RD = window.RD || {};

RD.Save = (() => {
  const KEY = 'pa_save', VERSION = 1;
  const store = (() => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } })();

  const fresh = () => ({
    v: VERSION,
    difficulty: 'normal',
    codex: { seen: [], made: [] },       // 레시피 도감 (유닛 id)
    meta: {
      fragments: 0,                      // 보유 기억 파편
      totalFragments: 0,                 // 누적 획득
      opened: 0,                         // 연 메모리 캡슐 수
      pity: 0,                           // 유니크 이상이 안 나온 연속 횟수
      cards: {},                         // { 카드 id: 획득 장수 }
      equip: [null, null, null],         // 싱크 슬롯 (카드 id)
    },
    // 기록 (best: { 난이도 키: 최고 라운드 }). 업적 진행도는 여기서 계산 (src/data/achievements.js)
    stats: { runs: 0, best: {}, last: null, kills: 0, bossKills: 0, bestKills: 0, playTime: 0, topGrade: 0 },
    ach: { claimed: [], seen: [] },      // 업적: 보상 받은 id / 달성 알림을 띄운 id
  });

  // 기본값 위에 저장값을 덮어씀 (새 필드가 추가돼도 옛 저장이 깨지지 않게)
  function merge(base, saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(base)) return saved === undefined ? base : saved;
    const out = Object.assign({}, base);
    for (const k in saved) out[k] = (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) ? merge(base[k], saved[k]) : saved[k];
    return out;
  }

  // 버전별 변환: MIGRATE[n] = n → n+1
  const MIGRATE = {
    0: d => {                            // 개별 키 시절 → v1
      const out = fresh();
      try {
        const diff = store && store.getItem('rd_difficulty_v1');
        if (diff) out.difficulty = diff;
        const cx = JSON.parse((store && store.getItem('rd_codex_v1')) || '{}');
        out.codex = { seen: cx.seen || [], made: cx.made || [] };
      } catch (e) { /* 무시 */ }
      return out;
    },
  };

  let data = null;
  function load() {
    let d = null;
    try { d = store && JSON.parse(store.getItem(KEY) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = { v: 0 };
    for (let v = d.v || 0; v < VERSION; v++) if (MIGRATE[v]) d = MIGRATE[v](d);
    d.v = VERSION;
    data = merge(fresh(), d);
    if (!Array.isArray(data.meta.equip)) data.meta.equip = [];
    while (data.meta.equip.length < (RD.META ? RD.META.slots : 3)) data.meta.equip.push(null);
    return data;
  }
  function save() {
    if (!store || !data) return false;
    try { store.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  }
  load();

  return {
    get data() { return data; },
    save,
    load,
    // 모든 진행 초기화 (디버그용: 콘솔에서 RD.Save.reset())
    reset() { data = fresh(); save(); return data; },
    // 백업 문자열 (나중에 '데이터 이전' 기능에 사용)
    exportString() { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); },
    importString(s) {
      const d = JSON.parse(decodeURIComponent(escape(atob(s))));
      if (!d || typeof d !== 'object') throw new Error('잘못된 저장 데이터');
      if (store) store.setItem(KEY, JSON.stringify(d));
      return load();
    },
    VERSION,
  };
})();
