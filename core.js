// Shared state, persistence, the topic registry, and small helpers.
// Loaded after the data files and before every topic file.

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/\bst\.?\s+/g, 'saint ')
  .replace(/\b(the|and|of)\b/g, '').replace(/[^a-z0-9]/g, '');

// ---------------------------------------------------------------------------
// Persistence (per browser)
// ---------------------------------------------------------------------------
const STORE_KEY = 'countrydrill.v1';
const store = { selected: [], learned: [], best: {}, stats: {}, labels: true, terrRegions: [], hard: false, capStats: {}, capBest: {}, showCapitals: true, shakesMemorized: [], shakesPool: 'all', elemStats: {}, elemBest: {}, elemPool: 'all', elemNames: true, elemColors: true, elemSelected: 26, warStats: {}, warBest: {}, warPool: 'core', presMode: 'order' };
try { Object.assign(store, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch (e) {}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let view = 'home';     // home | study | quiz | results
let app = 'countries'; // countries | presidents | shakespeare
let activeList = null; // list module currently on screen ('presidents' | 'shakespeare')
let pool = [];         // country codes for study/quiz/results
let active = new Set();
let q = null;          // current quiz
let projKey = null;
let k = 1;             // zoom scale
let path;

const $ = (s, r = document) => r.querySelector(s);
const panel = $('#panel'), listmain = $('#listmain');

// Topic modules register themselves here. The shell owns the router, the map, and
// the shared helpers; a module only supplies its own render and lifecycle hooks.
const SH = window.SH = {
  modules: {},
  register(id, mod) { this.modules[id] = mod; return mod; },
  get(id) { return this.modules[id]; },
  homeProgress(id) { return this.modules[id]?.homeProgress?.() || ''; },
  enter(id) { this.modules[id]?.enter?.(); },
  leave(id) { this.modules[id]?.leave?.(); },
  submit(id) { const m = this.modules[id]; if (!m?.submit) return false; m.submit(); return true; },
  escape(id) { this.modules[id]?.escape?.(); },
};

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------
const resCls = r => r ? 'r' + r : '';
const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtTime = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function tallyHtml(res = q.res) {
  const n = { 1: 0, 2: 0, 3: 0, x: 0 };
  for (const r of Object.values(res)) n[r]++;
  return `<span title="First try"><i class="dot r1"></i>${n[1]}</span><span title="Second try"><i class="dot r2"></i>${n[2]}</span>
    <span title="Third try"><i class="dot r3"></i>${n[3]}</span><span title="Missed"><i class="dot rx"></i>${n.x}</span>`;
}


function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

const fuzzyLimit = f => f.length >= 9 ? 2 : f.length >= 5 ? 1 : 0;
