const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/\bst\.?\s+/g, 'saint ')
  .replace(/\b(the|and|of)\b/g, '').replace(/[^a-z0-9]/g, '');

const CONTINENTS = [], REGIONS = {}, COUNTRY = {};
let regionIdx = 0;
function addItems(r, list, into) {
  for (const item of list.split(';').map(s => s.trim()).filter(Boolean)) {
    const sp = item.indexOf(' ');
    const code = item.slice(0, sp);
    const [names, terr] = item.slice(sp + 1).split('^');
    const [nm, ...aliases] = names.split('|');
    COUNTRY[code] = { code, name: nm, region: r.id, idx: r.codes.length + r.terr.length, terr, forms: [nm, ...aliases].map(norm) };
    into.push(code);
  }
}
for (const [cont, regs] of REGION_DEFS) {
  const c = { name: cont, regions: [] };
  for (const [id, name, list] of regs) {
    const r = { id, name, cont, codes: [], terr: [], hue: (regionIdx++ * 137.5 + 20) % 360 };
    addItems(r, list, r.codes);
    addItems(r, TERR_DEFS[id] || '', r.terr);
    REGIONS[id] = r; c.regions.push(r);
  }
  CONTINENTS.push(c);
}

for (const [code, forms] of Object.entries(CAPITAL_DEFS)) {
  const c = COUNTRY[code];
  if (!c || !forms.length) continue;
  c.capital = forms[0];
  c.capForms = forms.map(norm);
}
const missingCapitals = Object.values(COUNTRY).filter(c => !c.terr && !c.capital).map(c => c.name);
if (missingCapitals.length) console.warn('Missing capitals:', missingCapitals);

// ---------------------------------------------------------------------------
// Persistence (per browser)
// ---------------------------------------------------------------------------
const STORE_KEY = 'countrydrill.v1';
const store = { selected: [], learned: [], best: {}, stats: {}, labels: true, terrRegions: [], hard: false, capStats: {}, capBest: {}, showCapitals: true, shakesMemorized: [], shakesPool: 'all', elemStats: {}, elemBest: {}, elemPool: 'all', elemNames: true, elemColors: true, elemSelected: 26, warStats: {}, warBest: {}, warPool: 'core' };
try { Object.assign(store, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch (e) {}
if ('terr' in store) { // older versions had a single global toggle
  if (store.terr) store.terrRegions = Object.keys(REGIONS).filter(id => REGIONS[id].terr.length);
  delete store.terr;
}
store.selected = store.selected.filter(id => REGIONS[id]);
store.learned = store.learned.filter(id => REGIONS[id]);
store.terrRegions = store.terrRegions.filter(id => REGIONS[id]);
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
const FEATS = new Map(); // code -> feature record
let SOV = [];            // records for sovereign countries

const $ = (s, r = document) => r.querySelector(s);
const panel = $('#panel'), listmain = $('#listmain'), tip = $('#tip'), mapwrap = $('#mapwrap');

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
const svg = d3.select('#map'), sv = svg.node();
const zl = svg.append('g');
const gC = zl.append('g'), gM = zl.append('g'), gL = zl.append('g'), gFx = zl.append('g');
const zoom = d3.zoom().scaleExtent([1, 80]).clickDistance(6)
  .on('zoom', e => { zl.attr('transform', e.transform); k = e.transform.k; rescale(); });
svg.call(zoom).on('dblclick.zoom', null);
$('#zin').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.8);
$('#zout').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.8);
$('#zreset').onclick = () => svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity);

const darkMQ = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : darkMQ.matches;
darkMQ.addEventListener?.('change', () => paintAll());

function regionColor(rid, i = 0) {
  const h = REGIONS[rid].hue, j = i % 3;
  return isDark() ? `hsl(${h} 30% ${36 + j * 6}%)` : `hsl(${h} 52% ${76 - j * 7}%)`;
}
const RES_FILL = { 1: 'var(--good)', 2: 'var(--ok)', 3: 'var(--meh)', x: 'var(--bad)' };
const resCls = r => r ? 'r' + r : '';
const nameOf = code => COUNTRY[code] ? COUNTRY[code].name : (EXTRA_NAMES[code] || FEATS.get(code)?.neName || '');
// Whether a country/territory can be selected and quizzed right now.
const terrOn = rid => store.terrRegions.includes(rid);
const inPlay = code => !!COUNTRY[code] && (!COUNTRY[code].terr || terrOn(COUNTRY[code].region));
const regionCodes = r => terrOn(r.id) ? [...r.codes, ...r.terr] : r.codes;
const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtTime = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// ---------------------------------------------------------------------------
// Map setup
// ---------------------------------------------------------------------------
function init() {
  const topo = window.COUNTRIES_TOPO;
  if (!topo || !window.d3 || !window.topojson) { $('#loading').textContent = 'Could not load the map — check your internet connection and that map-data.js is next to this page.'; return; }

  const groups = new Map();
  for (const g of topo.objects.countries.geometries) {
    const nm = g.properties.name;
    if (nm === 'Antarctica') continue;
    const code = NAME_TO_CODE[nm] || g.id || ('x-' + nm);
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(g);
  }
  const shapes = new Map();
  for (const [code, gs] of groups) {
    const geometry = gs.length === 1 ? topojson.feature(topo, gs[0]).geometry : topojson.merge(topo, gs);
    const own = gs.find(g => g.id === code) || gs[0];
    shapes.set(code, { geometry, neName: own.properties.name });
  }
  for (const [from, to, test] of SPLITS) {
    const src = shapes.get(from);
    if (!src || src.geometry.type !== 'MultiPolygon') continue;
    const take = [], keep = [];
    for (const p of src.geometry.coordinates) {
      const [x, y] = d3.geoCentroid({ type: 'Polygon', coordinates: p });
      (test(x, y) ? take : keep).push(p);
    }
    if (!take.length) continue;
    src.geometry = { type: 'MultiPolygon', coordinates: keep };
    if (shapes.has(to)) shapes.get(to).geometry.coordinates.push(...take);
    else shapes.set(to, { geometry: { type: 'MultiPolygon', coordinates: take }, neName: COUNTRY[to]?.name || to });
  }
  for (const [code, s] of shapes) FEATS.set(code, makeFeat(code, { type: 'Feature', geometry: s.geometry }, s.neName));

  for (const f of FEATS.values()) {
    if (f.geo.geometry.type !== 'Point') f.el = gC.append('path').attr('class', 'c').attr('data-code', f.code).node();
  }
  for (const code of Object.keys(COUNTRY)) {
    const f = FEATS.get(code);
    if (!f) { console.warn('missing map shape for', code, COUNTRY[code].name); continue; }
    f.country = COUNTRY[code];
    f.mk = gM.append('circle').attr('class', 'mk').attr('data-code', code).node();
    f.lb = gL.append('text').attr('class', 'lb').text(f.country.name).node();
    SOV.push(f);
  }
  $('#loading').remove();
  setView('home');
}

function makeFeat(code, geo, neName) {
  const polys = geo.geometry.type === 'Polygon' ? [geo.geometry.coordinates]
    : geo.geometry.type === 'MultiPolygon' ? geo.geometry.coordinates : [];
  let main = geo.geometry, fit = geo;
  if (polys.length) {
    const asPoly = p => ({ type: 'Polygon', coordinates: p });
    const mainP = polys.reduce((a, b) => d3.geoArea(asPoly(b)) > d3.geoArea(asPoly(a)) ? b : a);
    main = asPoly(mainP);
    // Fit the view to the "home" part of a country only (so France's overseas
    // departments don't drag a Western Europe view across the world).
    const mc = d3.geoCentroid(main);
    const near = polys.filter(p => d3.geoDistance(d3.geoCentroid(asPoly(p)), mc) < 25 * Math.PI / 180);
    fit = { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: near } };
  }
  if (code === '643') fit = { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[20, 42], [60, 42], [60, 70], [20, 70]] } };
  return { code, geo, neName, main, fit };
}

function mapSize() { return [sv.clientWidth || 800, sv.clientHeight || 500]; }

function project(codes) {
  const [W, H] = mapSize(), pad = Math.min(28, W * .04);
  const ext = [[pad, pad], [W - pad, H - pad]];
  let proj;
  if (!codes.length) {
    proj = d3.geoNaturalEarth1().fitExtent(ext, { type: 'Sphere' });
  } else {
    // Try several central meridians and keep the one that lets us zoom in most
    // (handles the Pacific / antimeridian nicely).
    const fc = { type: 'FeatureCollection', features: codes.map(c => FEATS.get(c)?.fit).filter(Boolean) };
    let best = null;
    for (let lam = -180; lam < 180; lam += 15) {
      const p = d3.geoNaturalEarth1().rotate([lam, 0]).fitExtent(ext, fc);
      const score = p.scale() * (lam === 0 ? 1.08 : 1);
      if (!best || score > best.score) best = { p, score };
    }
    proj = best.p;
    // Don't zoom in absurdly far on a handful of tiny islands.
    const maxScale = Math.min(W, H) * 6;
    if (proj.scale() > maxScale) {
      const [cx, cy] = d3.geoPath(proj).centroid(fc);
      const s = maxScale / proj.scale(), t = proj.translate();
      proj.scale(maxScale).translate([W / 2 + (t[0] - cx) * s, H / 2 + (t[1] - cy) * s]);
    }
  }
  path = d3.geoPath(proj);
  for (const f of FEATS.values()) {
    if (f.el) f.el.setAttribute('d', path(f.geo) || '');
    const [[x0, y0], [x1, y1]] = path.bounds(f.main);
    f.s = Math.max(x1 - x0, y1 - y0) || 0;
    f.pt = path.centroid(f.main);
    if (!isFinite(f.pt[0])) f.pt = [(x0 + x1) / 2, (y0 + y1) / 2];
    if (f.mk) { f.mk.setAttribute('cx', f.pt[0]); f.mk.setAttribute('cy', f.pt[1]); }
    if (f.lb) { f.lb.setAttribute('x', f.pt[0]); f.lb.setAttribute('y', f.pt[1]); }
  }
  gFx.selectAll('*').remove();
  svg.call(zoom.transform, d3.zoomIdentity);
}

function fillOf(code) {
  const c = COUNTRY[code];
  if (view === 'home') {
    if (!inPlay(code)) return 'var(--land-off)';
    return store.selected.includes(c.region) ? regionColor(c.region, c.idx) : 'var(--land)';
  }
  if (!active.has(code)) return 'var(--land-off)';
  if (view === 'study') return regionColor(c.region, c.idx);
  const r = q && q.res[code];
  // Hard mode: answers don't stay colored during the quiz (only a just-missed target, briefly).
  if (r && (view === 'results' || !q.hard || (q.locked && code === q.target))) return RES_FILL[r];
  if (view === 'quiz' && q.mode === 'type' && !isCapitalTask(q.task) && code === q.target) return 'var(--accent)';
  return 'var(--land)';
}

function clickable(code) {
  if (view === 'home') return inPlay(code);
  if (view === 'quiz') return q.mode === 'find' && active.has(code);
  return active.has(code);
}

function paintAll() {
  for (const f of FEATS.values()) {
    const fill = fillOf(f.code), cl = clickable(f.code);
    if (f.el) { f.el.style.fill = fill; f.el.classList.toggle('click', cl); }
    if (f.mk) { f.mk.style.fill = fill; f.mk.classList.toggle('click', cl); }
  }
  rescale();
}

function labelWanted(f) {
  if (view === 'study') return store.labels && active.has(f.code);
  if (view === 'results') return active.has(f.code) && q.res[f.code] && q.res[f.code] !== 1;
  return false;
}

function rescale() {
  gL.attr('font-size', 11.5 / k).attr('stroke-width', 3 / k);
  for (const f of SOV) {
    const show = view === 'home' ? inPlay(f.code) : active.has(f.code);
    const mk = show && f.s * k < 7;
    f.mk.style.display = mk ? '' : 'none';
    if (mk) f.mk.setAttribute('r', 4.5 / k);
    const lb = labelWanted(f) && (f.s * k >= 18 || (mk && k >= 1.8) || view === 'results');
    f.lb.style.display = lb ? '' : 'none';
    if (lb) { f.lb.setAttribute('text-anchor', mk ? 'start' : 'middle'); f.lb.setAttribute('dx', mk ? '0.7em' : 0); }
  }
  gFx.selectAll('circle').attr('r', 12 / k);
}

function ring(code, cls = '', ms = 0) {
  const f = FEATS.get(code);
  const c = gFx.append('circle').attr('class', 'ring ' + cls).attr('cx', f.pt[0]).attr('cy', f.pt[1]).attr('r', 12 / k);
  if (ms) setTimeout(() => c.remove(), ms);
  return c;
}

function flash(code, kind = 'bad') {
  const f = FEATS.get(code), cls = kind === 'good' ? 'flash-good' : 'flash';
  for (const el of [f.el, f.mk]) {
    if (!el) continue;
    el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 800);
  }
}

function zoomTo(code, ms = 650) {
  const f = FEATS.get(code);
  const [[x0, y0], [x1, y1]] = path.bounds(f.fit);
  const [W, H] = mapSize();
  const kk = Math.max(1, Math.min(12, 0.4 * Math.min(W / Math.max(x1 - x0, 1), H / Math.max(y1 - y0, 1))));
  const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(kk).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  if (ms) svg.transition().duration(ms).call(zoom.transform, t);
  else svg.call(zoom.transform, t);
}

// In type mode the highlighted country is the question, so centre it in the map. On iOS
// the keyboard changes the visual viewport after focus; pass ms = 0 when the map has just
// resized so the target lands in the new visible area in one frame instead of animating
// from the old centre.
function centerQuizTarget(ms = 450) {
  if (view === 'quiz' && q && q.mode === 'type' && !isCapitalTask(q.task) && q.target) zoomTo(q.target, ms);
}
const keyboardOpen = () => !!window.visualViewport && window.visualViewport.height < window.innerHeight - 120;

// hover + tooltip
let hovCode = null;
function setHover(code, on) {
  const f = FEATS.get(code); if (!f) return;
  if (f.el) { f.el.classList.toggle('hov', on); if (on) gC.node().appendChild(f.el); }
  if (f.mk) f.mk.classList.toggle('hov', on);
}
function tipHtml(code) {
  const c = COUNTRY[code];
  const terr = c && c.terr ? `Territory · ${esc(c.terr)}` : '';
  if (view === 'home') {
    if (inPlay(code)) return `${esc(c.name)}<div class="sub">${terr ? terr + ' · ' : ''}${esc(REGIONS[c.region].name)} · click to ${store.selected.includes(c.region) ? 'remove' : 'add'}</div>`;
    return `${esc(nameOf(code))}${terr ? `<div class="sub">${terr} · turn on territories for ${esc(REGIONS[c.region].name)} to quiz</div>` : ''}`;
  }
  if (view === 'quiz') {
    if (!active.has(code) || q.hard) return null;
    return q.res[code] ? esc(c.name) : null;
  }
  if (c && active.has(code)) {
    const cap = c.capital && store.showCapitals ? ` · Capital: ${esc(c.capital)}` : '';
    return `${esc(c.name)}<div class="sub">${terr ? terr + ' · ' : ''}${esc(REGIONS[c.region].name)}${cap}</div>`;
  }
  return `<span class="muted">${esc(nameOf(code))}</span>${terr ? `<div class="sub">${terr}</div>` : ''}`;
}
function showTip(html, x, y) {
  tip.innerHTML = html; tip.style.display = 'block';
  const r = mapwrap.getBoundingClientRect();
  let tx = x - r.left + 14, ty = y - r.top + 14;
  if (tx + tip.offsetWidth > r.width - 4) tx = x - r.left - tip.offsetWidth - 10;
  if (ty + tip.offsetHeight > r.height - 4) ty = y - r.top - tip.offsetHeight - 10;
  tip.style.transform = `translate(${Math.max(4, tx)}px, ${Math.max(4, ty)}px)`;
}
function hideTip() { tip.style.display = 'none'; }
const codeAt = el => el && el.closest && el.closest('[data-code]')?.dataset.code;

sv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const code = codeAt(e.target);
  if (code !== hovCode) {
    if (hovCode) setHover(hovCode, false);
    hovCode = code && clickable(code) ? code : null;
    if (hovCode) setHover(hovCode, true);
  }
  const h = code && tipHtml(code);
  h ? showTip(h, e.clientX, e.clientY) : hideTip();
});
sv.addEventListener('pointerleave', () => { if (hovCode) setHover(hovCode, false); hovCode = null; hideTip(); });
let tipTimer, tap = null, lastTap = 0;
function onMapTap(code, x, y, touch) {
  if (view === 'home') {
    if (inPlay(code)) toggleRegion(COUNTRY[code].region);
  } else if (view === 'quiz') {
    if (q.mode === 'find') onFindClick(code);
  }
  const h = tipHtml(code);
  clearTimeout(tipTimer);
  if (h && (touch || view === 'home')) { showTip(h, x, y); if (touch) tipTimer = setTimeout(hideTip, 1800); }
}
// The closest visible small-country dot within r screen px (fingers are bigger than the dots).
function nearestMarker(x, y, r) {
  let best = null, bd = r;
  for (const f of SOV) {
    if (f.mk.style.display === 'none' || !clickable(f.code)) continue;
    const b = f.mk.getBoundingClientRect();
    const d = Math.hypot(b.x + b.width / 2 - x, b.y + b.height / 2 - y);
    if (d < bd) { bd = d; best = f.code; }
  }
  return best;
}
// Touch taps are detected from pointer events rather than 'click': the zoom behavior
// cancels the click whenever a finger drifts even a pixel, so taps often didn't register.
sv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  // A second finger means a pinch, not a tap.
  tap = e.isPrimary ? { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, el: e.target } : null;
});
sv.addEventListener('pointercancel', () => { tap = null; });
sv.addEventListener('pointerup', e => {
  if (e.pointerType === 'mouse' || !tap || e.pointerId !== tap.id) return;
  const s = tap; tap = null;
  if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12 || e.timeStamp - s.t > 700) return;
  lastTap = Date.now();
  const hit = codeAt(s.el);
  // Right on top of a dot wins over the country underneath; in open sea, snap to a nearby dot.
  const code = nearestMarker(s.x, s.y, hit ? 7 : 22) || hit;
  if (code) onMapTap(code, s.x, s.y, true);
});
sv.addEventListener('click', e => {
  if (Date.now() - lastTap < 800) return; // already handled as a touch tap
  const code = codeAt(e.target);
  if (code) onMapTap(code, e.clientX, e.clientY, false);
});

let resizeT;
new ResizeObserver(() => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (!path) return;
    project(view === 'home' ? [] : pool);
    if (view === 'quiz' && q.mode === 'type' && !isCapitalTask(q.task) && q.target) {
      q.ringEl = ring(q.target);
      centerQuizTarget(0);
    }
    paintAll();
  }, 120);
}).observe(sv);

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
function setView(v) {
  const prev = view;
  view = v;
  document.body.classList.toggle('quizzing', v === 'quiz');
  document.body.dataset.view = v;
  window.scrollTo(0, 0);
  active = v === 'home' ? new Set() : new Set(pool);
  const key = v === 'home' ? 'home' : pool.join(',');
  if (key !== projKey) { project(v === 'home' ? [] : pool); projKey = key; }
  // The projection is shared by study/quiz/results, but a type quiz zooms to its target.
  // Leaving the quiz must restore the pool view, so reset the zoom on any view change.
  if (v !== prev) svg.call(zoom.transform, d3.zoomIdentity);
  if (hovCode) setHover(hovCode, false); hovCode = null; hideTip();
  paintAll();
  render();
}

function render() {
  if (app === 'home') { activeList = null; return renderHome(); }
  if (app === 'shakespeare') { activeList = null; return renderShakes(); }
  if (SH.modules[app]) { activeList = null; return SH.modules[app].render(); }
  if (LIST_MODULES[app]) { activeList = app; return renderList(LIST_MODULES[app]); }
  const scroll = $('.pscroll', panel)?.scrollTop || 0;
  panel.innerHTML = navHeadHtml() + (view === 'home' ? homeHtml() : view === 'study' ? studyHtml() : view === 'quiz' ? quizHtml() : resultsHtml());
  if (view === 'home') {
    panel.querySelectorAll('[data-ind]').forEach(el => el.indeterminate = true);
    $('.pscroll', panel).scrollTop = scroll;
  }
  if (view === 'quiz') updateQuizUI();
}

function selectionPool() {
  const sel = new Set(store.selected);
  return CONTINENTS.flatMap(c => c.regions).filter(r => sel.has(r.id)).flatMap(regionCodes).filter(c => FEATS.has(c));
}
function poolInfo(codes) {
  const regs = [...new Set(codes.map(c => COUNTRY[c].region))];
  const set = new Set(codes);
  // "Full" = every region is complete, either countries only or countries + all its territories.
  const parts = regs.map(rid => {
    const r = REGIONS[rid], t = r.terr.filter(c => set.has(c)).length;
    const ok = r.codes.every(c => set.has(c)) && (t === 0 || t === r.terr.length);
    return ok ? rid + (t ? '+t' : '') : null;
  });
  const full = parts.every(Boolean);
  const withTerr = codes.some(c => COUNTRY[c].terr);
  const title = !full ? `${codes.length} places`
    : (regs.length <= 3 ? regs.map(r => REGIONS[r].name).join(' + ') : `${regs.length} regions · ${codes.length} places`) + (withTerr ? ' (with territories)' : '');
  return { regs, full, title, key: full ? parts.sort().join(',') : null };
}
const weakOf = codes => codes.filter(c => store.stats[c] && store.stats[c].last !== 1);

function homeHtml() {
  const sel = new Set(store.selected), learned = new Set(store.learned);
  const p = selectionPool(), weak = weakOf(p), dis = p.length ? '' : 'disabled';
  const capPool = p.filter(c => COUNTRY[c].capital), capDis = capPool.length ? '' : 'disabled';
  let h = `<div class="pscroll"><div class="ptitle">
    <h1>World Geography</h1>
    <p class="muted small">Pick regions to study or quiz (or click the map). Mark regions as <b>learned</b> as you go, then quiz all of them together.</p>
  </div><div class="pbody">
    <div class="quick">
      <button class="chip" data-act="selLearned" ${learned.size ? '' : 'disabled'}>Select learned (${learned.size})</button>
      <button class="chip" data-act="selAll">All</button>
      <button class="chip" data-act="selNone">None</button>
      <button class="chip" data-act="terrAll">${allTerrOn() ? 'Remove' : 'Add'} all territories</button>
    </div>
    <p class="muted small">Tap <b>+N terr.</b> on a region to also quiz its territories (Greenland, Puerto Rico, French Guiana…). Capitals cover sovereign countries.</p>`;
  for (const c of CONTINENTS) {
    const on = c.regions.filter(r => sel.has(r.id)).length;
    const n = c.regions.reduce((a, r) => a + regionCodes(r).length, 0);
    h += `<div class="cont"><label class="cont-h"><input type="checkbox" data-cont="${c.name}" ${on === c.regions.length ? 'checked' : ''} ${on && on < c.regions.length ? 'data-ind' : ''}>
      <span>${c.name}</span><span class="n">${n}</span></label>`;
    for (const r of c.regions) {
      const bk = r.id + (terrOn(r.id) ? '+t' : '');
      const best = store.best['find:' + bk], hard = store.best['find!:' + bk];
      const n = r.codes.length;
      h += `<div class="reg"><label><input type="checkbox" data-reg="${r.id}" ${sel.has(r.id) ? 'checked' : ''}>
        <span class="sw" style="background:${regionColor(r.id, 1)}"></span><span class="rn">${esc(r.name)}</span><span class="n">${n}</span></label>
        ${best || hard ? `<span class="best" title="Best first-try score, find on map (H = hard mode)">${best ? best.pct + '%' : ''}${best && hard ? ' · ' : ''}${hard ? 'H ' + hard.pct + '%' : ''}</span>` : ''}
        ${r.terr.length ? `<button class="learn terr ${terrOn(r.id) ? 'on' : ''}" data-act="terr" data-id="${r.id}" title="Territories: ${esc(r.terr.map(nameOf).join(', '))}">+${r.terr.length} terr.</button>` : ''}
        <button class="learn ${learned.has(r.id) ? 'on' : ''}" data-act="learn" data-id="${r.id}">${learned.has(r.id) ? '✓ Learned' : 'Learned?'}</button></div>`;
    }
    h += `</div>`;
  }
  h += `</div></div><div class="pfoot">
    <div class="small">${p.length ? `<b>${p.length}</b> ${p.some(c => COUNTRY[c].terr) ? 'places' : 'countries'} · ${esc(poolInfo(p).title)}` : '<span class="muted">Select at least one region</span>'}</div>
    ${hardToggle()}
    <div class="btns">
      <button class="btn wide" data-act="study" ${dis}>Study</button>
      <button class="btn primary" data-act="quizFind" ${dis}><span class="hide-sm">Quiz: </span>Find on map</button>
      <button class="btn primary" data-act="quizType" ${dis}><span class="hide-sm">Quiz: </span>Type names</button>
      ${weak.length ? `<button class="btn ghost full" data-act="quizWeak">Quiz weak spots (${weak.length})</button>` : ''}
    </div>
    <div class="btns">
      <button class="btn" data-act="quizCapital" ${capDis}><span class="hide-sm">Quiz: </span>Country → capital</button>
      <button class="btn" data-act="quizCapitalReverse" ${capDis}><span class="hide-sm">Quiz: </span>Capital → country</button>
    </div></div>`;
  return h;
}

function studyHtml() {
  const info = poolInfo(pool);
  const capDis = pool.some(c => COUNTRY[c].capital) ? '' : 'disabled';
  let h = `<div class="pscroll"><div class="ptitle"><button class="back" data-act="home">← Regions</button>
    <h2>Study</h2><p class="muted">${esc(info.title)}</p></div><div class="pbody">
    <label class="tog"><input type="checkbox" data-labels ${store.labels ? 'checked' : ''}> Show labels on map</label>
    <label class="tog"><input type="checkbox" data-capitals ${store.showCapitals ? 'checked' : ''}> Show capitals in this list</label>
    <p class="muted small">Hover or tap the map to see names; scroll / pinch to zoom. Click a name below to find it. Dots show your last quiz result.</p>`;
  for (const rid of info.regs) {
    h += `<h3>${esc(REGIONS[rid].name)}</h3><ul class="clist${store.showCapitals ? ' caps' : ''}">`;
    for (const c of pool.filter(c => COUNTRY[c].region === rid).sort((a, b) => nameOf(a).localeCompare(nameOf(b)))) {
      const t = COUNTRY[c].terr ? ` <span class="muted small">(${esc(COUNTRY[c].terr.replace(/ \(.*\)/, ''))})</span>` : '';
      const cap = COUNTRY[c].capital;
      const capHtml = cap ? ` <span class="cap"${store.showCapitals ? '' : ' hidden'}>${esc(cap)}</span>` : '';
      h += `<li><button data-act="locate" data-code="${c}"><span class="dot ${resCls(store.stats[c]?.last)}"></span><span class="nm">${esc(nameOf(c))}${t}</span>${capHtml}</button></li>`;
    }
    h += `</ul>`;
  }
  h += `</div></div><div class="pfoot">${hardToggle()}<div class="btns">
    <button class="btn primary" data-act="quizFind"><span class="hide-sm">Quiz: </span>Find on map</button>
    <button class="btn primary" data-act="quizType"><span class="hide-sm">Quiz: </span>Type names</button></div>
    <div class="btns">
      <button class="btn" data-act="quizCapital" ${capDis}><span class="hide-sm">Quiz: </span>Country → capital</button>
      <button class="btn" data-act="quizCapitalReverse" ${capDis}><span class="hide-sm">Quiz: </span>Capital → country</button>
    </div></div>`;
  return h;
}

function quizHtml() {
  const type = q.mode === 'type';
  return `<div class="pscroll"><div class="pbody">
    <div class="qbar"><button class="back" data-act="quit">✕ Quit</button><span id="qprog"></span>${q.hard ? '<span class="hardtag">Hard</span>' : ''}<span id="qtime">0:00</span></div>
    <div class="bar"><i id="qbar"></i></div>
    <div class="prompt" id="qprompt"></div>
    ${type ? `<form class="qform" id="qform" autocomplete="off"><input id="qin" name="answer" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="${quizPlaceholder(q.task)}"><button class="btn primary">Check</button></form>` : ''}
    <div class="fb" id="qfb"></div>
    <div class="qrow"><div class="tally" id="qtally"></div><button class="btn ghost" data-act="reveal">${type ? 'Reveal' : 'Skip'}</button></div>
  </div></div>`;
}

function tallyHtml(res = q.res) {
  const n = { 1: 0, 2: 0, 3: 0, x: 0 };
  for (const r of Object.values(res)) n[r]++;
  return `<span title="First try"><i class="dot r1"></i>${n[1]}</span><span title="Second try"><i class="dot r2"></i>${n[2]}</span>
    <span title="Third try"><i class="dot r3"></i>${n[3]}</span><span title="Missed"><i class="dot rx"></i>${n.x}</span>`;
}

function updateQuizUI() {
  const done = Object.keys(q.res).length, total = q.queue.length;
  $('#qprog').textContent = `${Math.min(done + 1, total)} / ${total}`;
  $('#qbar').style.width = (100 * done / total) + '%';
  $('#qtally').innerHTML = tallyHtml();
  $('#qprompt').innerHTML = !q.target ? ''
    : q.task === 'find' ? `Click <b>${esc(nameOf(q.target))}</b>`
    : q.task === 'cap' ? `What is the capital of <b>${esc(nameOf(q.target))}</b>?`
    : q.task === 'caprev' ? `<b>${esc(COUNTRY[q.target].capital)}</b> is the capital of…`
    : `Name the <span style="color:var(--accent);font-weight:700">highlighted</span> country`;
}
function fb(html, cls) { const el = $('#qfb'); if (el) { el.innerHTML = html; el.className = 'fb ' + cls; } }

// Quiz task: 'find' and 'type' quiz country locations/names; 'cap' and 'caprev' are
// typing-only capital quizzes and ignore hard mode.
function isCapitalTask(task) { return task === 'cap' || task === 'caprev'; }
function otherTask(task) { return task === 'find' ? 'type' : task === 'type' ? 'find' : task === 'cap' ? 'caprev' : 'cap'; }
function quizTitle(task) {
  return task === 'find' ? 'Find on map' : task === 'type' ? 'Type names'
    : task === 'cap' ? 'Country → capital' : 'Capital → country';
}
function quizPlaceholder(task) {
  return task === 'cap' ? 'Type the capital…' : task === 'caprev' ? 'Type the country…' : 'Type your answer…';
}
function quizOtherLabel(task) {
  return task === 'find' ? 'Try typing mode' : task === 'type' ? 'Try find mode'
    : task === 'cap' ? 'Try capital → country' : 'Try country → capital';
}
const qAnswer = code => q.task === 'cap' ? COUNTRY[code].capital : nameOf(code);

function resultsHtml() {
  const total = q.queue.length, first = q.queue.filter(c => q.res[c] === 1).length;
  const pct = Math.round(100 * first / total);
  const missed = q.queue.filter(c => q.res[c] !== 1).sort((a, b) => (q.res[a] === 'x' ? 0 : 1) - (q.res[b] === 'x' ? 0 : 1) || nameOf(a).localeCompare(nameOf(b)));
  const cap = isCapitalTask(q.task);
  const missedLabel = c => q.task === 'cap' ? `${nameOf(c)} — ${COUNTRY[c].capital}`
    : q.task === 'caprev' ? `${COUNTRY[c].capital} — ${nameOf(c)}` : nameOf(c);
  let h = `<div class="pscroll"><div class="ptitle"><button class="back" data-act="home">← Regions</button>
    <h2>${quizTitle(q.task)}${q.hard ? ' <span class="hardtag">Hard</span>' : ''} · ${esc(poolInfo(q.queue).title)}</h2></div><div class="pbody">
    <div class="score">${pct}%${q.newBest ? '<span class="newbest">New best</span>' : ''}</div>
    <p class="muted">${first} of ${total} on the first try · ${fmtTime(q.elapsed)}</p>
    <div class="tally">${tallyHtml()}</div>`;
  if (missed.length) {
    h += `<h3>Review (${missed.length}) — labeled on the map</h3><ul class="clist">`;
    for (const c of missed) h += `<li><button data-act="locate" data-code="${c}"><span class="dot ${resCls(q.res[c])}"></span>${esc(missedLabel(c))}</button></li>`;
    h += `</ul>`;
  } else {
    h += `<p>Perfect run. Mark ${poolInfo(q.queue).regs.length > 1 ? 'these regions' : 'this region'} as learned and move on.</p>`;
  }
  const info = poolInfo(q.queue);
  const canLearn = info.full && info.regs.some(r => !store.learned.includes(r));
  h += `</div></div><div class="pfoot">${cap ? '' : hardToggle()}<div class="btns">
    ${missed.length ? `<button class="btn primary full" data-act="retryMissed">Retry the ${missed.length} I missed</button>` : ''}
    <button class="btn" data-act="again">Same quiz again</button>
    <button class="btn" data-act="otherMode">${quizOtherLabel(q.task)}</button>
    ${missed.length ? `<button class="btn ghost" data-act="studyMissed">Study missed</button>` : ''}
    ${canLearn && pct >= 90 ? `<button class="btn ghost" data-act="markLearned">Mark learned</button>` : ''}
  </div></div>`;
  return h;
}

// ---------------------------------------------------------------------------
// Panel actions
// ---------------------------------------------------------------------------
function hardToggle() {
  return `<label class="tog small"><input type="checkbox" data-hard ${store.hard ? 'checked' : ''}><span>Hard mode <span class="muted">— answers don't stay colored</span></span></label>`;
}
const TERR_REGIONS = Object.keys(REGIONS).filter(id => REGIONS[id].terr.length);
const allTerrOn = () => TERR_REGIONS.every(terrOn);

function toggleRegion(id) {
  const s = new Set(store.selected);
  s.has(id) ? s.delete(id) : s.add(id);
  store.selected = [...s]; save(); paintAll(); render();
}

const ACTIONS = {
  home: () => setView('home'),
  selLearned: () => { store.selected = store.learned.slice(); save(); paintAll(); render(); },
  selAll: () => { store.selected = Object.keys(REGIONS); save(); paintAll(); render(); },
  selNone: () => { store.selected = []; save(); paintAll(); render(); },
  learn: b => {
    const s = new Set(store.learned), id = b.dataset.id;
    s.has(id) ? s.delete(id) : s.add(id);
    store.learned = [...s]; save(); render();
  },
  terr: b => {
    const s = new Set(store.terrRegions), id = b.dataset.id;
    s.has(id) ? s.delete(id) : s.add(id);
    store.terrRegions = [...s]; save(); paintAll(); render();
  },
  terrAll: () => { store.terrRegions = allTerrOn() ? [] : TERR_REGIONS.slice(); save(); paintAll(); render(); },
  study: () => { pool = selectionPool(); setView('study'); },
  quizFind: () => startQuiz('find', view === 'study' ? pool : selectionPool()),
  quizType: () => startQuiz('type', view === 'study' ? pool : selectionPool()),
  quizCapital: () => startQuiz('cap', view === 'study' ? pool : selectionPool()),
  quizCapitalReverse: () => startQuiz('caprev', view === 'study' ? pool : selectionPool()),
  quizWeak: () => startQuiz('find', weakOf(selectionPool())),
  locate: b => { const c = b.dataset.code; zoomTo(c); ring(c, '', 2400); },
  quit: () => { stopTimer(); q = null; setView('home'); },
  reveal: () => failTarget(),
  retryMissed: () => startQuiz(q.task, q.queue.filter(c => q.res[c] !== 1)),
  again: () => startQuiz(q.task, q.queue),
  otherMode: () => startQuiz(otherTask(q.task), q.queue),
  studyMissed: () => { pool = q.queue.filter(c => q.res[c] !== 1); setView('study'); },
  markLearned: () => { store.learned = [...new Set([...store.learned, ...poolInfo(q.queue).regs])]; save(); render(); },
};
panel.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && !b.disabled) ACTIONS[b.dataset.act](b, e);
});
panel.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.reg) toggleRegion(t.dataset.reg);
  else if (t.dataset.cont) {
    const ids = CONTINENTS.find(c => c.name === t.dataset.cont).regions.map(r => r.id);
    const s = new Set(store.selected);
    ids.forEach(id => t.checked ? s.add(id) : s.delete(id));
    store.selected = [...s]; save(); paintAll(); render();
  } else if ('labels' in t.dataset) { store.labels = t.checked; save(); rescale(); }
  else if ('capitals' in t.dataset) {
    store.showCapitals = t.checked; save();
    for (const el of document.querySelectorAll('.clist')) el.classList.toggle('caps', t.checked);
    for (const el of document.querySelectorAll('.clist .cap')) el.hidden = !t.checked;
  }
  else if ('hard' in t.dataset) { store.hard = t.checked; save(); }
});
panel.addEventListener('submit', e => {
  e.preventDefault();
  if (app === 'shakespeare') {
    if (listDrill) submitList(LIST_MODULES.shakespeare);
    else if (shakes.view === 'cards') submitCard();
    return;
  }
  if (SH.submit(app)) return;
  if (LIST_MODULES[app]) submitList(LIST_MODULES[app]);
  else submitGuess();
});
panel.addEventListener('pointerover', e => {
  const b = e.target.closest('[data-act=locate]');
  if (hovCode) setHover(hovCode, false);
  hovCode = b ? b.dataset.code : null;
  if (hovCode) setHover(hovCode, true);
});

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------
let timer;
function stopTimer() { clearInterval(timer); }

function startQuiz(task, codes) {
  // Capital quizzes only cover sovereign countries that have a capital.
  if (isCapitalTask(task)) codes = codes.filter(c => COUNTRY[c].capital);
  if (!codes.length) return;
  stopTimer();
  pool = codes.slice();
  const info = poolInfo(pool);
  const hard = isCapitalTask(task) ? false : store.hard;
  const mode = isCapitalTask(task) ? 'type' : task;
  const bestTask = isCapitalTask(task) ? task : mode;
  q = { task, mode, hard, queue: shuffle(pool), i: -1, tries: 0, res: {}, start: Date.now(), bestKey: info.key ? `${bestTask}${hard ? '!' : ''}:${info.key}` : null };
  // Start every run from a fresh pool view; type mode then centres the first target.
  projKey = null;
  setView('quiz');
  timer = setInterval(() => { const el = $('#qtime'); if (el) el.textContent = fmtTime(Date.now() - q.start); }, 500);
  next();
}

function next() {
  q.ringEl?.remove(); q.ringEl = null;
  q.tries = 0; q.locked = false;
  q.i++;
  if (q.i >= q.queue.length) return finish();
  q.target = q.queue[q.i];
  paintAll();
  if (q.mode === 'type') {
    if (!isCapitalTask(q.task)) {
      q.ringEl = ring(q.target);
      // Before the keyboard opens there is no visible map to centre in; snap once it has.
      centerQuizTarget(keyboardOpen() ? 450 : 0);
    }
    const inp = $('#qin'); inp.value = ''; inp.focus();
  }
  updateQuizUI();
}

function setRes(code, r) {
  q.res[code] = r;
  const stats = isCapitalTask(q.task) ? store.capStats : store.stats;
  const st = stats[code] || (stats[code] = { n: 0, ok: 0 });
  st.n++; if (r === 1) st.ok++; st.last = r;
  save();
}

function onFindClick(code) {
  if (q.locked || !active.has(code)) return;
  // In hard mode answered countries look unanswered, so clicking one is just a wrong guess.
  if (q.res[code] && !q.hard) { fb(`That's ${esc(nameOf(code))}`, 'info'); return; }
  if (code === q.target) {
    setRes(code, q.tries + 1);
    fb(`✓ ${esc(nameOf(code))}`, 'good');
    if (q.hard) flash(code, 'good');
    next();
  } else {
    q.tries++;
    flash(code);
    fb(`✗ That's ${esc(nameOf(code))}`, 'bad');
    if (q.tries >= 3) failTarget();
  }
}

function submitGuess() {
  if (q.locked) return;
  const inp = $('#qin'), guess = norm(inp.value);
  if (!guess) return;
  const ok = q.task === 'cap' ? isCapitalMatch(guess, q.target) : isMatch(guess, q.target);
  if (ok) {
    setRes(q.target, q.tries + 1);
    fb(`✓ ${esc(qAnswer(q.target))}`, 'good');
    next();
    return;
  }
  q.tries++;
  inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
  inp.select();
  if (q.tries >= 3) return failTarget();
  const nm = qAnswer(q.target);
  fb(q.tries === 2 ? `✗ Hint: starts with “${esc(nm[0])}”, ${nm.replace(/[^A-Za-zÀ-ÿ]/g, '').length} letters` : '✗ Not quite — try again', 'bad');
}

function failTarget() {
  if (q.locked || !q.target) return;
  q.locked = true;
  setRes(q.target, 'x');
  q.ringEl?.remove();
  q.ringEl = ring(q.target, 'bad');
  fb(`It was <b>${esc(qAnswer(q.target))}</b>`, 'bad');
  paintAll(); updateQuizUI();
  setTimeout(() => { if (view === 'quiz') next(); }, q.mode === 'type' ? 1800 : 1500);
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
function isMatch(guess, code) {
  const forms = COUNTRY[code].forms;
  if (forms.includes(guess)) return true;
  // An exact match for a different country is wrong (Niger ≠ Nigeria).
  if (Object.values(COUNTRY).some(c => c.code !== code && c.forms.includes(guess))) return false;
  return forms.some(f => lev(guess, f) <= (f.length >= 9 ? 2 : f.length >= 5 ? 1 : 0));
}
function isCapitalMatch(guess, code) {
  const forms = COUNTRY[code].capForms || [];
  if (forms.includes(guess)) return true;
  // An exact match for another country's capital is wrong (Kingston ≠ Kingstown).
  if (Object.values(COUNTRY).some(c => c.code !== code && (c.capForms || []).includes(guess))) return false;
  return forms.some(f => lev(guess, f) <= (f.length >= 9 ? 2 : f.length >= 5 ? 1 : 0));
}

function finish() {
  stopTimer();
  q.elapsed = Date.now() - q.start;
  q.target = null;
  const first = q.queue.filter(c => q.res[c] === 1).length;
  const pct = Math.round(100 * first / q.queue.length);
  if (q.bestKey) {
    const bestStore = isCapitalTask(q.task) ? store.capBest : store.best;
    const b = bestStore[q.bestKey];
    if (!b || pct > b.pct || (pct === b.pct && q.elapsed < b.ms)) { bestStore[q.bestKey] = { pct, ms: q.elapsed }; q.newBest = !!b; }
    save();
  }
  gFx.selectAll('*').remove();
  setView('results');
}

// ---------------------------------------------------------------------------
// Home (topic picker)
// ---------------------------------------------------------------------------
function homePanelHtml() {
  return `<div class="pscroll"><div class="ptitle">
    <h1>Study Hall</h1>
    <p class="muted small">Pick a topic, study it, then quiz yourself until it sticks. Progress is saved on this device, and the app works offline once installed.</p>
  </div></div>`;
}

function homeMainHtml() {
  const learned = store.learned.length;
  const regionCount = Object.keys(REGIONS).length;
  const world = learned
    ? `${learned} / ${regionCount} regions learned`
    : `${regionCount} regions · ${Object.keys(COUNTRY).length} places`;
  const pres = store.presBest
    ? `Best ${fmtTime(store.presBest.ms)}${store.presBest.miss ? ` · ${store.presBest.miss} revealed` : ' · clean run'}`
    : `${PRES.length} presidents in order`;
  const bests = [];
  for (const [id, m] of Object.entries(CARD_MODES)) {
    const all = cardBest(id, 'all');
    const mem = cardBest(id, 'memorized');
    if (all) bests.push({ n: all, label: m.label, mem: false });
    if (mem) bests.push({ n: mem, label: m.label, mem: true });
  }
  const best = bests.sort((a, b) => b.n - a.n)[0];
  const bits = [];
  if (best) bits.push(`Cards ${best.n}/${CARD_LEN} · ${best.label}${best.mem ? ' · memorized' : ''}`);
  if (store.shakesBest) bits.push(`List drill ${fmtTime(store.shakesBest.ms)}`);
  const shakes = bits.length ? bits.join(' · ') : `${PLAYS.length} plays · ${CARD_LEN}-card rounds`;
  const card = (id, icon, name, desc, prog) => `<button class="topic" data-app="${id}">
    <span class="ticon" aria-hidden="true">${icon}</span>
    <span class="tbody"><span class="tname">${name}</span><span class="tdesc">${desc}</span><span class="tprog">${prog}</span></span>
  </button>`;
  return `<div class="lmain home-main">
    <h2>Choose a topic</h2>
    <div class="topics">
      ${card('countries', '🌍', 'World Geography', 'Countries, regions, and territories on the map.', world)}
      ${card('presidents', '🏛️', 'US Presidents', 'Every president, in order, with terms and parties.', pres)}
      ${card('shakespeare', '🎭', 'Shakespeare', 'Characters, plots, and titles for all 39 plays.', shakes)}
      ${card('elements', '⚛️', 'Periodic Table', '118 elements, their symbols, and the shape of the table.', SH.homeProgress('elements'))}
      ${card('wars', '⚔️', 'US Wars', 'The major wars, their dates, presidents, and opponents.', SH.homeProgress('wars'))}
    </div>
  </div>`;
}

function renderHome() {
  activeList = null;
  document.body.dataset.lview = 'home';
  panel.innerHTML = navHeadHtml() + homePanelHtml();
  listmain.innerHTML = homeMainHtml();
  window.scrollTo(0, 0);
  listmain.scrollTop = 0;
}

// ---------------------------------------------------------------------------
// App switcher (Home / World / Presidents / Shakespeare)
// ---------------------------------------------------------------------------
function navHeadHtml() {
  const open = document.body.classList.contains('nav-open');
  return `<div class="phead"><button class="navbtn" data-nav-toggle aria-label="Open menu" aria-expanded="${open}"><svg class="navicon" viewBox="0 0 16 12" aria-hidden="true" focusable="false"><rect x="0" y="0" width="16" height="2" rx="1"/><rect x="0" y="5" width="16" height="2" rx="1"/><rect x="0" y="10" width="16" height="2" rx="1"/></svg></button><button class="brand" data-home aria-label="Study Hall home"><img src="favicon.svg" alt="" draggable="false"><span>Study Hall</span></button></div>`;
}

function setNav(open) {
  document.body.classList.toggle('nav-open', open);
  for (const b of document.querySelectorAll('[data-nav-toggle]')) b.setAttribute('aria-expanded', String(open));
  const target = open ? $('#navClose') : $('[data-nav-toggle]');
  target?.focus({ preventScroll: true });
}

$('#navScrim').addEventListener('click', () => setNav(false));
$('#navClose').addEventListener('click', () => setNav(false));
panel.addEventListener('click', e => {
  if (e.target.closest('[data-nav-toggle]')) setNav(true);
  else if (e.target.closest('[data-home]')) setApp('home');
});
listmain.addEventListener('click', e => {
  const b = e.target.closest('[data-app]');
  if (b) setApp(b.dataset.app);
});

// Deep links: #world, #presidents and #shakespeare survive a refresh and can be shared.
// A bare URL is the home page; choosing Home removes the hash again.
const APP_SLUG = { home: '', countries: 'world', presidents: 'presidents', shakespeare: 'shakespeare', elements: 'elements', wars: 'wars' };
const appFromHash = () => {
  const h = location.hash.replace(/^#\/?/, '');
  return Object.keys(APP_SLUG).find(k => h && APP_SLUG[k] === h) || 'home';
};
function syncHash(a) {
  const slug = APP_SLUG[a];
  if (!slug) {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    return;
  }
  const h = '#' + slug;
  if (location.hash !== h) history.replaceState(null, '', h);
}

function setApp(a) {
  if (!a) a = 'home';
  if (a === app) { syncHash(app); return; }
  // Leaving a topic module abandons its quiz: stop the timer and clear the round.
  if (SH.modules[app] && a !== app) SH.leave(app);
  app = a;
  document.body.dataset.app = a;
  document.body.dataset.module = a === 'home' ? 'home' : SH.modules[a]?.kind || (LIST_MODULES[a] ? 'list' : 'map');
  syncHash(a);
  // A quiz keeps running in the background while another topic is on screen.
  document.body.classList.toggle('quizzing', a === 'countries' && view === 'quiz');
  for (const b of document.querySelectorAll('#nav [data-app]')) b.classList.toggle('on', b.dataset.app === a);
  hideTip();
  if (a === 'home') {
    activeList = null;
    renderHome();
  } else if (a === 'shakespeare') {
    const st = listState.shakespeare;
    clearInterval(st.timer);
    st.qz = null;
    st.view = 'home';
    activeList = null;
    listDrill = false;
    renderShakes();
  } else if (SH.modules[a]) {
    activeList = null;
    SH.enter(a);
  } else if (LIST_MODULES[a]) {
    activeList = a;
    renderList(LIST_MODULES[a]);
  } else {
    activeList = null;
    render();
    // The map had zero size while hidden, so re-project once it is visible again.
    requestAnimationFrame(() => {
      if (!path) return;
      project(view === 'home' ? [] : pool);
      if (view === 'quiz' && q && q.mode === 'type' && !isCapitalTask(q.task) && q.target) {
        q.ringEl = ring(q.target);
        centerQuizTarget(0);
      }
      paintAll();
    });
  }
}
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('[data-app]');
  if (!b) return;
  setApp(b.dataset.app);
  setNav(false);
});
window.addEventListener('hashchange', () => setApp(appFromHash()));

// ---------------------------------------------------------------------------
// List quizzes (presidents, Shakespeare)
// ---------------------------------------------------------------------------
// One engine for fixed-answer lists. A module supplies the items and a few labels.
// Ordered modules advance one item at a time (presidents); unordered modules accept
// any remaining item (plays).

const PRES = PRESIDENT_DEFS.map(([name, years, party, aliases], i) => ({
  n: i + 1, name, meta: years, tip: party,
  cls: 'pty-' + party.toLowerCase().replace(/[^a-z]+/g, '-'),
  forms: [name, ...aliases.split('|')].filter(Boolean).map(norm),
}));
const PARTIES = [...new Set(PRES.map(p => p.tip))].map(name => ({
  name, cls: 'pty-' + name.toLowerCase().replace(/[^a-z]+/g, '-'),
}));

const PLAYS = PLAY_DEFS.map(([name, years, type, aliases], i) => {
  const g = PLAY_GUIDE[name] || { chars: [], teaser: '', summary: '' };
  return {
    n: i + 1, idx: i, name, meta: years, tip: type,
    cls: 'cat-' + type.toLowerCase().replace(/[^a-z]+/g, '-'),
    forms: [name, ...aliases.split('|')].filter(Boolean).map(norm),
    chars: g.chars, teaser: g.teaser, summary: g.summary,
  };
});
const PLAY_TYPES = [...new Set(PLAYS.map(p => p.tip))].map(name => ({
  name, cls: 'cat-' + name.toLowerCase().replace(/[^a-z]+/g, '-'),
}));

// Drop memorized names that no longer exist (for example after a canon edit).
const PLAY_NAMES = new Set(PLAYS.map(p => p.name));
store.shakesMemorized = (Array.isArray(store.shakesMemorized) ? store.shakesMemorized : [])
  .filter(name => PLAY_NAMES.has(name));

const LIST_MODULES = {
  presidents: {
    id: 'presidents', label: 'Presidents', title: 'US Presidents', noun: 'president',
    ordered: true, items: PRES, bestKey: 'presBest',
    blurb: `Type all ${PRES.length} presidents in order. A surname is enough; full names and common nicknames work too.`,
    legendTitle: 'Party key', legend: PARTIES,
    notesHtml: `<h3>Good to know</h3><p class="muted small">${PRES.length} presidencies, ${new Set(PRES.map(p => p.name)).size} people — Cleveland and Trump each served two non-consecutive terms.</p>`,
    promptHtml: (cfg, st) => st.qz.i < cfg.items.length ? `Type president <b>#${cfg.items[st.qz.i].n}</b>` : 'All of them!',
    studyHeading: 'Study list', resultsHeading: 'All presidents',
  },
  shakespeare: {
    id: 'shakespeare', label: 'Shakespeare', title: 'Shakespeare', noun: 'play',
    ordered: false, items: PLAYS, bestKey: 'shakesBest',
    blurb: `Type all ${PLAYS.length} plays in any order. Short forms work: “Midsummer”, “Much Ado”, “Henry 5”.`,
    legendTitle: 'Play types', legend: PLAY_TYPES,
    notesHtml: `<h3>Good to know</h3><p class="muted small">The canon is 39 plays: the 36 in the First Folio, plus Pericles, The Two Noble Kinsmen, and Edward III. Play types are approximate — the late romances are often grouped with the comedies.</p>`,
    promptHtml: (cfg, st) => st.qz.found.size < cfg.items.length ? 'Type any Shakespeare play' : 'All of them!',
    studyHeading: 'Study list', resultsHeading: 'All plays',
  },
};

const listState = {};
for (const id of Object.keys(LIST_MODULES)) listState[id] = { view: 'home', qz: null, timer: null };

const listSt = cfg => listState[cfg.id];
const fuzzyLimit = f => f.length >= 9 ? 2 : f.length >= 5 ? 1 : 0;

function listLegendHtml(cfg) {
  return `<h3>${esc(cfg.legendTitle)}</h3><ul class="llegend">${cfg.legend.map(g =>
    `<li><span class="ldot ${g.cls}"></span>${esc(g.name)}</li>`).join('')}</ul>`;
}

function listRow(cfg, item, i) {
  const st = listSt(cfg), qz = st.qz;
  const quiz = st.view === 'quiz' && qz;
  if (!quiz) {
    return `<li class="lrow done" title="${esc(item.tip)}"><span class="ln">${item.n}</span>
      <span class="ldot ${item.cls}"></span><span class="lname">${esc(item.name)}</span><span class="lmeta">${esc(item.meta)}</span></li>`;
  }
  const done = cfg.ordered ? i < qz.i : qz.found.has(i);
  const cur = cfg.ordered && i === qz.i;
  if (!done) {
    return `<li class="lrow todo${cur ? ' cur' : ''}"><span class="ln">${item.n}</span><span class="lline"></span></li>`;
  }
  const miss = qz.revealed.has(i);
  return `<li class="lrow done${cur ? ' cur' : ''}${miss ? ' miss' : ''}" title="${esc(item.tip)}">
    <span class="ln">${item.n}</span><span class="ldot ${item.cls}"></span>
    <span class="lname">${esc(item.name)}</span><span class="lmeta">${esc(item.meta)}</span></li>`;
}
const listRowsHtml = cfg => cfg.items.map((it, i) => listRow(cfg, it, i)).join('');

function listFb(html, cls) { const el = $('#lfb'); if (el) { el.innerHTML = html; el.className = 'fb ' + cls; } }
function shakeEl(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

function listHomeHtml(cfg) {
  const best = store[cfg.bestKey];
  return `<div class="pscroll"><div class="ptitle">
    <h1>${esc(cfg.title)}</h1>
    <p class="muted small">${cfg.blurb}</p>
    ${best ? `<p class="small">Your best: <b>${fmtTime(best.ms)}</b> · ${best.miss} revealed</p>` : ''}
  </div><div class="pbody">
    ${listLegendHtml(cfg)}
    ${cfg.notesHtml || ''}
  </div></div><div class="pfoot"><div class="btns">
    <button class="btn primary full" data-pact="start">Start typing quiz</button>
  </div></div>`;
}

function listHomeMainHtml(cfg) {
  return `<div class="lmain"><h3>${esc(cfg.studyHeading)}</h3><ul class="lrows">${listRowsHtml(cfg)}</ul></div>`;
}

function listQuizHtml(cfg) {
  return `<div class="pscroll"><div class="pbody">
    <div class="qbar"><button class="back" data-pact="quit">✕ Quit</button><span id="lprog"></span><span id="ltime">0:00</span></div>
    <div class="bar"><i id="lbar"></i></div>
    <div class="prompt" id="lprompt"></div>
    <div class="fb" id="lfb"></div>
  </div></div><div class="pfoot">
    <form class="qform" autocomplete="off"><input id="lin" name="answer" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Type your answer…"><button class="btn primary">Check</button></form>
    <div class="qrow"><div class="tally" id="ltally"></div><button class="btn ghost" data-pact="reveal">Reveal</button></div>
  </div>`;
}

function listQuizMainHtml(cfg) {
  return `<div class="lmain"><ul class="lrows" id="llist">${listRowsHtml(cfg)}</ul></div>`;
}

function listResultsHtml(cfg) {
  const qz = listSt(cfg).qz, miss = qz.revealed.size, total = cfg.items.length;
  return `<div class="pscroll"><div class="ptitle">
    <h1>All ${total} — done</h1>
    <div class="score">${fmtTime(qz.elapsed)}${qz.newBest ? '<span class="newbest">New best</span>' : ''}</div>
    <p class="muted">${total - miss} of ${total} typed without revealing${miss ? ` · ${miss} revealed` : ' · clean run'}</p>
  </div><div class="pbody">
    ${listLegendHtml(cfg)}
  </div></div><div class="pfoot"><div class="btns">
    <button class="btn primary full" data-pact="start">Play again</button>
    <button class="btn ghost full" data-pact="list">Back to study list</button>
  </div></div>`;
}

function listResultsMainHtml(cfg) {
  return `<div class="lmain"><h3>${esc(cfg.resultsHeading)}</h3><ul class="lrows">${listRowsHtml(cfg)}</ul></div>`;
}

function renderList(cfg) {
  const st = listSt(cfg);
  document.body.dataset.lview = st.view;
  const head = navHeadHtml();
  if (st.view === 'quiz') {
    panel.innerHTML = head + listQuizHtml(cfg);
    listmain.innerHTML = listQuizMainHtml(cfg);
  } else if (st.view === 'home') {
    panel.innerHTML = head + listHomeHtml(cfg);
    listmain.innerHTML = listHomeMainHtml(cfg);
  } else {
    panel.innerHTML = head + listResultsHtml(cfg);
    listmain.innerHTML = listResultsMainHtml(cfg);
  }
  window.scrollTo(0, 0);
  listmain.scrollTop = 0;
  if (st.view === 'quiz') { updateListUI(cfg); $('#lin')?.focus(); }
}

function updateListUI(cfg) {
  const st = listSt(cfg), qz = st.qz;
  if (!qz) return;
  const total = cfg.items.length;
  const found = cfg.ordered ? Math.min(qz.i, total) : qz.found.size;
  const set = (id, txt) => { const el = $('#' + id); if (el) el.textContent = txt; };
  set('lprog', `${cfg.ordered ? Math.min(found + 1, total) : found} / ${total}`);
  const bar = $('#lbar'); if (bar) bar.style.width = (100 * found / total) + '%';
  const prompt = $('#lprompt');
  if (prompt) prompt.innerHTML = cfg.promptHtml(cfg, st);
  const tally = $('#ltally');
  if (tally) tally.innerHTML = `<span title="Revealed"><i class="dot rx"></i>${qz.revealed.size}</span><span title="Wrong guesses"><i class="dot r3"></i>${qz.wrong}</span>`;
  const list = $('#llist');
  if (list) {
    list.innerHTML = listRowsHtml(cfg);
    // The list may be its own scroller (narrow screens) or sit inside #listmain (wide ones).
    const scroller = list.closest('#listmain') || list;
    if (scroller.scrollHeight > scroller.clientHeight + 1) {
      const sr = scroller.getBoundingClientRect(), cur = list.querySelector('.cur');
      if (cur) {
        const cr = cur.getBoundingClientRect();
        // Leave a little air so the highlighted row isn't flush with the edges.
        if (cr.top < sr.top + 10) scroller.scrollTop += cr.top - sr.top - 10;
        else if (cr.bottom > sr.bottom - 10) scroller.scrollTop += cr.bottom - sr.bottom + 10;
      }
    }
  }
}

function listMatchOrdered(cfg, guess, idx) {
  const item = cfg.items[idx];
  if (item.forms.includes(guess)) return { idx };
  // An exact name of some other item is wrong, no fuzzy credit (Adams ≠ Adams' typo).
  if (cfg.items.some((x, j) => j !== idx && x.forms.includes(guess))) return { wrong: true };
  if (item.forms.some(f => lev(guess, f) <= fuzzyLimit(f))) return { idx };
  return { wrong: true };
}

function listMatchUnordered(cfg, guess, found) {
  const exact = [];
  cfg.items.forEach((it, i) => { if (it.forms.includes(guess)) exact.push(i); });
  if (exact.length) {
    const i = exact.find(i => !found.has(i));
    return i === undefined ? { already: exact[0] } : { idx: i };
  }
  // A partial title shared by several items (Henry IV, Henry VI, Richard) is ambiguous.
  if (guess.length >= 4) {
    const pref = new Set();
    cfg.items.forEach((it, i) => {
      if (it.forms.some(f => f.length > guess.length && f.startsWith(guess))) pref.add(i);
    });
    if (pref.size > 1) return { ambiguous: true };
  }
  // Fuzzy only for typos, and only when one item is clearly the closest.
  let best = null;
  cfg.items.forEach((it, i) => {
    for (const f of it.forms) {
      const d = lev(guess, f);
      if (d > fuzzyLimit(f)) continue;
      if (!best || d < best.d) best = { idx: i, d, amb: false };
      else if (d === best.d && i !== best.idx) best.amb = true;
    }
  });
  if (!best) return { wrong: true };
  if (best.amb) return { ambiguous: true };
  return found.has(best.idx) ? { already: best.idx } : { idx: best.idx };
}

function startList(cfg) {
  const st = listSt(cfg);
  activeList = cfg.id;
  clearInterval(st.timer);
  st.qz = { i: 0, wrong: 0, revealed: new Set(), found: new Set(), t0: Date.now(), elapsed: 0, done: false, newBest: false };
  st.view = 'quiz';
  renderList(cfg);
  st.timer = setInterval(() => {
    if (activeList !== cfg.id) return;
    const el = $('#ltime'); if (el) el.textContent = fmtTime(Date.now() - st.qz.t0);
  }, 500);
  $('#lin')?.focus();
}

function submitList(cfg) {
  const st = listSt(cfg), qz = st.qz;
  if (!qz || qz.done) return;
  const inp = $('#lin'); if (!inp) return;
  const guess = norm(inp.value);
  if (!guess) return;

  if (cfg.ordered) {
    const r = listMatchOrdered(cfg, guess, qz.i);
    if (r.idx !== undefined) {
      const item = cfg.items[r.idx];
      inp.value = '';
      qz.i++;
      listFb(`✓ ${esc(item.name)}`, 'good');
      if (qz.i >= cfg.items.length) return finishList(cfg);
      updateListUI(cfg);
      inp.focus();
    } else {
      qz.wrong++;
      shakeEl(inp);
      inp.select();
      listFb(qz.wrong > 1 ? `✗ Still not #${cfg.items[qz.i].n}` : `✗ Not #${cfg.items[qz.i].n} — try again`, 'bad');
      updateListUI(cfg);
    }
    return;
  }

  const r = listMatchUnordered(cfg, guess, qz.found);
  if (r.idx !== undefined) {
    qz.found.add(r.idx);
    inp.value = '';
    listFb(`✓ ${esc(cfg.items[r.idx].name)}`, 'good');
    if (qz.found.size >= cfg.items.length) return finishList(cfg);
    updateListUI(cfg);
    inp.focus();
  } else if (r.already !== undefined) {
    listFb(`Already got <b>${esc(cfg.items[r.already].name)}</b>`, 'info');
    inp.select();
  } else if (r.ambiguous) {
    listFb('More than one play fits — be more specific.', 'info');
    inp.select();
  } else {
    qz.wrong++;
    shakeEl(inp);
    inp.select();
    listFb(qz.wrong > 1 ? '✗ Still not one of them' : '✗ Not one of them — try again', 'bad');
    updateListUI(cfg);
  }
}

function revealList(cfg) {
  const st = listSt(cfg), qz = st.qz;
  if (!qz || qz.done) return;
  let idx;
  if (cfg.ordered) idx = qz.i;
  else {
    const left = cfg.items.map((_, i) => i).filter(i => !qz.found.has(i));
    if (!left.length) return finishList(cfg);
    idx = left[Math.floor(Math.random() * left.length)];
  }
  const item = cfg.items[idx];
  qz.revealed.add(idx);
  if (cfg.ordered) qz.i++;
  else qz.found.add(idx);
  listFb(cfg.ordered ? `#${item.n} was <b>${esc(item.name)}</b>` : `<b>${esc(item.name)}</b>`, 'bad');
  if ((cfg.ordered ? qz.i : qz.found.size) >= cfg.items.length) return finishList(cfg);
  updateListUI(cfg);
  $('#lin')?.focus();
}

function finishList(cfg) {
  const st = listSt(cfg), qz = st.qz;
  clearInterval(st.timer);
  qz.elapsed = Date.now() - qz.t0;
  qz.done = true;
  const prev = store[cfg.bestKey];
  const better = !prev || qz.revealed.size < prev.miss ||
    (qz.revealed.size === prev.miss && qz.elapsed < prev.ms);
  if (better) { store[cfg.bestKey] = { miss: qz.revealed.size, ms: qz.elapsed }; qz.newBest = !!prev; save(); }
  st.view = 'results';
  renderList(cfg);
}

function quitList(cfg) {
  const st = listSt(cfg);
  clearInterval(st.timer);
  st.qz = null;
  st.view = 'home';
  renderList(cfg);
}

const PACTIONS = {
  start: () => startList(LIST_MODULES[activeList]),
  reveal: () => revealList(LIST_MODULES[activeList]),
  quit: () => activeList === 'shakespeare' ? exitListDrill() : quitList(LIST_MODULES[activeList]),
  list: () => {
    if (activeList === 'shakespeare') return exitListDrill();
    const cfg = LIST_MODULES[activeList], st = listSt(cfg); st.qz = null; st.view = 'home'; renderList(cfg);
  },
};
panel.addEventListener('click', e => {
  const b = e.target.closest('[data-pact]');
  if (b && !b.disabled) PACTIONS[b.dataset.pact](b, e);
});

// ---------------------------------------------------------------------------
// Shakespeare: study guide and flashcards
// ---------------------------------------------------------------------------
// Cards come in three kinds: a character -> play, a play -> any character, and a
// plot teaser -> play. The study guide uses the full summary; the cards use the
// one-line teaser so a card stays readable.
const CARD_MODES = {
  characters: { label: 'Characters → plays', blurb: 'A character is shown; name the play.' },
  plays: { label: 'Plays → characters', blurb: 'A play is shown; name any character.' },
  synopsis: { label: 'Synopses → plays', blurb: 'A short plot is shown; name the play.' },
  mixed: { label: 'Mixed', blurb: 'A balanced mix of all three.' },
};
const CARD_LEN = 20;
// Characters that are famous in more than one play, so a character card would be
// ambiguous even though the name appears only once in this app's data.
const CARD_SKIP = new Set([
  'paris', 'gloucester', 'clarence', 'montague', 'shallow', 'ventidius', 'gower',
  'ferdinand', 'lucius', 'katherine', 'helena', 'claudio', 'escalus', 'bianca',
  'emilia', 'sebastian',
  // Names that are famous in another play but appear in only one play's list here.
  'kingfrance', 'kingjohnfrance', 'princessfrance', 'kingferdinand', 'pistol',
  'warwick', 'edwardiv', 'ladygrey', 'buckingham', 'bolingbroke', 'portia',
  'antonio', 'octaviuscaesar', 'valentine', 'flavius',
]);
let listDrill = false;

const shakes = {
  view: 'home',
  mode: CARD_MODES[store.shakesMode] ? store.shakesMode : 'mixed',
  pool: store.shakesPool === 'memorized' ? 'memorized' : 'all',
  deck: [], i: 0, correct: 0, missed: [], review: false, newBest: false,
};

// A character answer may be the full name, a significant word ("Belch", "Macduff"),
// or the name with its title stripped ("Macbeth" for Lady Macbeth).
function charForms(name) {
  const STOP = new Set(['sir', 'lady', 'lord', 'king', 'queen', 'duke', 'duchess', 'earl',
    'count', 'countess', 'mistress', 'master', 'doctor', 'friar', 'prince', 'princess',
    'cardinal', 'archbishop', 'bishop', 'general', 'captain', 'lieutenant', 'old', 'young']);
  const forms = new Set([norm(name)]);
  const words = name.split(/\s+/);
  for (const w of words) {
    const nw = norm(w);
    if (nw.length >= 4 && !STOP.has(nw)) forms.add(nw);
  }
  const stripped = words.filter(w => !STOP.has(norm(w))).join(' ');
  if (stripped) forms.add(norm(stripped));
  return [...forms].filter(Boolean);
}

function matchPlayCharacter(p, guess) {
  return p.chars.some(c => charForms(c).some(f => f === guess || lev(guess, f) <= fuzzyLimit(f)));
}

function cardBest(mode, pool = shakes.pool) {
  const map = pool === 'memorized' ? store.shakesCardsMem : store.shakesCards;
  return (map && map[mode]) || 0;
}

function poolPlays(pool = shakes.pool) {
  return pool === 'memorized'
    ? PLAYS.filter(p => store.shakesMemorized.includes(p.name))
    : PLAYS;
}

function allCardDecks(pool = shakes.pool) {
  const source = poolPlays(pool);
  const chars = [], plays = [], syn = [];
  const where = new Map();
  for (const p of source) for (const c of p.chars) {
    const k = norm(c);
    if (!where.has(k)) where.set(k, new Set());
    where.get(k).add(p.idx);
  }
  for (const p of source) {
    for (const c of p.chars) {
      const k = norm(c);
      if (where.get(k).size !== 1) continue; // shared across plays
      if (CARD_SKIP.has(k)) continue;        // ambiguous outside this deck
      if (norm(p.name).includes(k)) continue; // name is in the play title
      chars.push({ kind: 'character', play: p, prompt: c, answer: p.name });
    }
    plays.push({ kind: 'play', play: p, prompt: p.name, answer: p.chars.join(' · ') });
    if (p.teaser) syn.push({ kind: 'synopsis', play: p, prompt: p.teaser, answer: p.name });
  }
  return { chars, plays, syn };
}

function drawDeck(mode, pool = shakes.pool) {
  const { chars, plays, syn } = allCardDecks(pool);
  if (mode === 'characters') return shuffle(chars.slice()).slice(0, CARD_LEN);
  if (mode === 'plays') return shuffle(plays.slice()).slice(0, CARD_LEN);
  if (mode === 'synopsis') return shuffle(syn.slice()).slice(0, CARD_LEN);
  return shuffle([
    ...shuffle(chars.slice()).slice(0, 8),
    ...shuffle(plays.slice()).slice(0, 6),
    ...shuffle(syn.slice()).slice(0, 6),
  ]);
}

// How many cards a round can actually show for the selected mode and pool.
function availableCards(mode = shakes.mode, pool = shakes.pool) {
  const { chars, plays, syn } = allCardDecks(pool);
  if (mode === 'characters') return Math.min(CARD_LEN, chars.length);
  if (mode === 'plays') return Math.min(CARD_LEN, plays.length);
  if (mode === 'synopsis') return Math.min(CARD_LEN, syn.length);
  return Math.min(8, chars.length) + Math.min(6, plays.length) + Math.min(6, syn.length);
}

function startCards(mode = shakes.mode, deck) {
  if (!CARD_MODES[mode]) mode = 'mixed';
  shakes.mode = mode;
  shakes.deck = (deck && deck.length) ? deck : drawDeck(mode);
  shakes.i = 0;
  shakes.correct = 0;
  shakes.missed = [];
  shakes.review = !!(deck && deck.length);
  shakes.newBest = false;
  shakes.view = 'cards';
  renderShakes();
}

function finishCards() {
  const st = shakes;
  st.view = 'results';
  // Only a full, non-review round sets a best; short memorized-pool rounds are practice.
  if (!st.review && st.deck.length >= CARD_LEN) {
    const prev = cardBest(st.mode, st.pool);
    st.newBest = st.correct > prev;
    if (st.newBest) {
      const key = st.pool === 'memorized' ? 'shakesCardsMem' : 'shakesCards';
      store[key] = store[key] || {};
      store[key][st.mode] = st.correct;
      save();
    }
  }
  renderShakes();
}

function renderShakes() {
  activeList = null;
  document.body.dataset.lview = shakes.view === 'cards' ? 'quiz' : 'home';
  const head = navHeadHtml();
  if (shakes.view === 'cards') {
    panel.innerHTML = head + cardsPanelHtml();
    listmain.innerHTML = cardsMainHtml();
    updateCardsUI();
    $('#cin')?.focus();
  } else if (shakes.view === 'results') {
    panel.innerHTML = head + cardsResultsPanelHtml();
    listmain.innerHTML = cardsResultsMainHtml();
  } else {
    panel.innerHTML = head + shakesHomePanelHtml();
    listmain.innerHTML = shakesGuideHtml();
  }
  window.scrollTo(0, 0);
  listmain.scrollTop = 0;
}

// Repaint only the quiz panel, so marking a play does not reset the guide's scroll.
function refreshShakesHome() {
  if (app !== 'shakespeare' || shakes.view !== 'home' || listDrill) return;
  panel.innerHTML = navHeadHtml() + shakesHomePanelHtml();
}

function toggleMemorized(name) {
  if (!PLAY_NAMES.has(name)) return;
  const set = new Set(store.shakesMemorized);
  if (set.has(name)) set.delete(name); else set.add(name);
  store.shakesMemorized = [...set];
  if (!store.shakesMemorized.length && shakes.pool === 'memorized') {
    shakes.pool = 'all';
    store.shakesPool = 'all';
  }
  save();
  const btn = [...listmain.querySelectorAll('[data-smem]')].find(b => b.dataset.smem === name);
  if (btn) {
    const on = set.has(name);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Marked as memorized' : 'Mark this play as memorized';
    btn.textContent = on ? '★ Memorized' : '☆ Memorized';
  }
  refreshShakesHome();
}

function shakesHomePanelHtml() {
  const mem = store.shakesMemorized.length;
  const avail = availableCards(shakes.mode);
  const round = Math.min(avail, CARD_LEN);
  const best = cardBest(shakes.mode);
  const poolName = shakes.pool === 'memorized' ? 'memorized plays' : 'all plays';
  return `<div class="pscroll"><div class="ptitle">
    <h1>Shakespeare</h1>
    <p class="muted small">Learn the plays by their people and plots, then test yourself with flashcards.</p>
    ${best ? `<p class="small">Best: <b>${best} / ${CARD_LEN}</b> · ${esc(CARD_MODES[shakes.mode].label)} · ${poolName}</p>` : ''}
  </div><div class="pbody">
    <h3>Play pool</h3>
    <div class="modes">
      <button class="mode${shakes.pool === 'all' ? ' on' : ''}" data-spool="all">All plays</button>
      <button class="mode${shakes.pool === 'memorized' ? ' on' : ''}" data-spool="memorized"${mem ? '' : ' disabled'}>Memorized (${mem})</button>
    </div>
    <p class="muted small">${mem ? 'Quiz only the plays you mark as memorized in the study guide.' : 'Mark plays as memorized in the study guide to build a smaller quiz pool.'}</p>
    <h3>Quiz mode</h3>
    <div class="modes">${Object.entries(CARD_MODES).map(([id, m]) =>
      `<button class="mode${id === shakes.mode ? ' on' : ''}" data-smode="${id}">${esc(m.label)}</button>`).join('')}</div>
    <p class="muted small">${esc(CARD_MODES[shakes.mode].blurb)} ${round ? `${round} card${round === 1 ? '' : 's'} per round.` : 'No cards available in this pool.'}</p>
    <h3>The canon</h3>
    <p class="muted small">The 36 plays in the First Folio, plus <i>Pericles</i>, <i>The Two Noble Kinsmen</i>, and <i>Edward III</i>. Play types are approximate.</p>
    <p class="muted small">The full list drill always covers all ${PLAYS.length} plays.</p>
    ${store.shakesBest ? `<p class="small muted">List drill best: <b>${fmtTime(store.shakesBest.ms)}</b> · ${store.shakesBest.miss} revealed</p>` : ''}
  </div></div><div class="pfoot"><div class="btns">
    <button class="btn primary full" data-cact="start"${avail ? '' : ' disabled'}>${avail ? `Start ${round} cards` : 'No cards available'}</button>
    <button class="btn ghost full" data-cact="list">Full list drill</button>
  </div></div>`;
}

function playArticleHtml(p) {
  const hay = [p.forms.join(''), norm(p.meta), norm(p.chars.join('')), norm(p.summary)].join('');
  const mem = store.shakesMemorized.includes(p.name);
  return `<article class="play" data-search="${hay}">
    <h3>${esc(p.name)} <span class="date">(${esc(p.meta)})</span><button class="mem${mem ? ' on' : ''}" data-smem="${esc(p.name)}" aria-pressed="${mem}" title="${mem ? 'Marked as memorized' : 'Mark this play as memorized'}">${mem ? '★ Memorized' : '☆ Memorized'}</button></h3>
    <p class="chars"><span>Characters</span> ${p.chars.map(esc).join(' · ')}</p>
    <p class="syn">${esc(p.summary)}</p>
  </article>`;
}

function shakesGuideHtml() {
  const types = ['Comedy', 'History', 'Tragedy', 'Romance'];
  return `<div class="lmain guide">
    <div class="guidebar">
      <input id="gsearch" type="search" placeholder="Search plays, characters, or plots…" autocomplete="off" aria-label="Search the study guide">
      <div class="jump">${types.map(t => `<button class="chip" data-jump="${t}">${t}</button>`).join('')}</div>
    </div>
    ${types.map(t => `<section class="gtype" id="g-${t}">
      <h2>${t}</h2>
      ${PLAYS.filter(p => p.tip === t).map(playArticleHtml).join('')}
    </section>`).join('')}
  </div>`;
}

function filterGuide(q) {
  const needle = norm(q);
  for (const sec of listmain.querySelectorAll('.gtype')) {
    let shown = 0;
    for (const art of sec.querySelectorAll('.play')) {
      const hit = !needle || art.dataset.search.includes(needle);
      art.hidden = !hit;
      if (hit) shown++;
    }
    sec.hidden = !shown;
  }
}

function cardHint(card) {
  return card.kind === 'character' ? 'Which play is this character from?' :
    card.kind === 'play' ? 'Name a character from this play.' : 'Which play is this?';
}
function cardPlaceholder(card) { return card.kind === 'play' ? 'Type a character…' : 'Type the play…'; }

function cardsPanelHtml() {
  const st = shakes, card = st.deck[st.i], n = st.deck.length;
  return `<div class="pscroll"><div class="pbody">
    <div class="qbar"><button class="back" data-cact="quit">✕ Quit</button><span id="cprog">Card ${st.i + 1} / ${n}</span></div>
    <div class="bar"><i id="cbar" style="width:${100 * st.i / n}%"></i></div>
    <div class="prompt" id="chint">${cardHint(card)}</div>
  </div></div><div class="pfoot">
    <div class="fb" id="cfb"></div>
    <form class="qform" id="cform" autocomplete="off">
      <input id="cin" name="answer" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="${cardPlaceholder(card)}">
      <button class="btn primary">Check</button>
    </form>
    <div class="qrow"><span class="small muted" id="cscore">${st.correct} correct</span><button class="btn ghost" data-cact="next" id="cnext" hidden>Next</button></div>
  </div>`;
}

function cardsMainHtml() {
  const card = shakes.deck[shakes.i];
  const kicker = { character: 'Character', play: 'Play', synopsis: 'Synopsis' }[card.kind];
  return `<div class="lmain cards"><div class="fcard">
    <div class="kicker">${kicker}</div>
    <div class="ctext${card.kind === 'synopsis' ? ' syn' : ''}">${esc(card.prompt)}</div>
  </div></div>`;
}

function updateCardsUI() {
  const st = shakes;
  const prog = $('#cprog'); if (prog) prog.textContent = `Card ${st.i + 1} / ${st.deck.length}`;
  const bar = $('#cbar'); if (bar) bar.style.width = (100 * st.i / st.deck.length) + '%';
  const score = $('#cscore'); if (score) score.textContent = `${st.correct} correct`;
}

function cardFb(html, cls) { const el = $('#cfb'); if (el) { el.innerHTML = html; el.className = 'fb ' + cls; } }

function submitCard() {
  const st = shakes;
  if (st.view !== 'cards') return;
  const card = st.deck[st.i];
  const inp = $('#cin'); if (!inp || inp.disabled) return;
  const guess = norm(inp.value);
  if (!guess) return;

  let ok = false, ambiguous = false;
  if (card.kind === 'play') {
    ok = matchPlayCharacter(card.play, guess);
  } else {
    const r = listMatchUnordered(LIST_MODULES.shakespeare, guess, new Set());
    if (r.ambiguous) ambiguous = true;
    else if (r.idx !== undefined) ok = r.idx === card.play.idx;
  }
  if (ambiguous) {
    cardFb('More than one play fits — be more specific.', 'info');
    inp.select();
    return;
  }

  inp.disabled = true;
  const btn = $('#cform button'); if (btn) btn.disabled = true;
  if (ok) {
    st.correct++;
    cardFb(card.kind === 'play'
      ? `✓ ${esc(card.play.chars[0])} is in ${esc(card.play.name)}`
      : `✓ ${esc(card.play.name)}`, 'good');
    updateCardsUI();
    const at = st.i;
    setTimeout(() => { if (shakes.view === 'cards' && shakes.i === at) nextCard(); }, 750);
  } else {
    st.missed.push(card);
    cardFb(card.kind === 'play'
      ? `✗ Characters include: ${esc(card.play.chars.slice(0, 4).join(', '))}`
      : `✗ That's <b>${esc(card.play.name)}</b> (${esc(card.play.meta)})`, 'bad');
    const next = $('#cnext'); if (next) next.hidden = false;
    updateCardsUI();
  }
}

function nextCard() {
  const st = shakes;
  if (st.view !== 'cards') return;
  st.i++;
  if (st.i >= st.deck.length) return finishCards();
  renderShakes();
}

function cardsResultsPanelHtml() {
  const st = shakes, total = st.deck.length;
  const poolName = st.pool === 'memorized' ? 'memorized plays' : 'all plays';
  return `<div class="pscroll"><div class="ptitle">
    <h1>Round complete</h1>
    <div class="score">${st.correct} / ${total}${st.newBest ? '<span class="newbest">New best</span>' : ''}</div>
    <p class="muted">${esc(CARD_MODES[st.mode].label)} · ${poolName}${st.review ? ' · review round' : ''}</p>
  </div><div class="pbody">
    <p class="small muted">${st.missed.length ? `${st.missed.length} card${st.missed.length === 1 ? '' : 's'} to review.` : 'Clean sweep — nothing missed.'}</p>
    ${!st.review && total < CARD_LEN ? `<p class="small muted">Practice round — bests are recorded only for full ${CARD_LEN}-card rounds.</p>` : ''}
  </div></div><div class="pfoot"><div class="btns">
    <button class="btn primary full" data-cact="again">New round</button>
    ${st.missed.length ? '<button class="btn ghost full" data-cact="review">Review missed</button>' : ''}
    <button class="btn ghost full" data-cact="home">Back to study guide</button>
  </div></div>`;
}

function cardsResultsMainHtml() {
  const st = shakes;
  if (!st.missed.length) return `<div class="lmain cards"><div class="empty">No missed cards. Try another mode or a fresh round.</div></div>`;
  return `<div class="lmain cards"><h3>Missed cards</h3><ul class="missed">${st.missed.map(c => `
    <li><div class="kicker">${c.kind === 'character' ? 'Character' : c.kind === 'play' ? 'Play' : 'Synopsis'}</div>
    <div class="mprompt">${esc(c.prompt)}</div>
    <div class="manswer">${c.kind === 'play' ? esc(c.play.chars.slice(0, 5).join(' · ')) : esc(c.play.name)}</div></li>`).join('')}</ul></div>`;
}

function startListDrill() {
  listDrill = true;
  shakes.view = 'home';
  startList(LIST_MODULES.shakespeare);
}

function exitListDrill() {
  const st = listSt(LIST_MODULES.shakespeare);
  clearInterval(st.timer);
  st.qz = null;
  st.view = 'home';
  listDrill = false;
  activeList = null;
  shakes.view = 'home';
  renderShakes();
}

const CACTS = {
  start: () => startCards(shakes.mode),
  list: startListDrill,
  quit: () => { shakes.view = 'home'; renderShakes(); },
  next: nextCard,
  again: () => startCards(shakes.mode),
  review: () => { const missed = shakes.missed.slice(); startCards(shakes.mode, shuffle(missed)); },
  home: () => { shakes.view = 'home'; renderShakes(); },
};

panel.addEventListener('click', e => {
  const b = e.target.closest('[data-cact]');
  if (b && !b.disabled) CACTS[b.dataset.cact]();
});
panel.addEventListener('click', e => {
  const m = e.target.closest('[data-smode]');
  if (m) {
    shakes.mode = m.dataset.smode;
    store.shakesMode = shakes.mode;
    save();
    refreshShakesHome();
    return;
  }
  const p = e.target.closest('[data-spool]');
  if (!p || p.disabled) return;
  shakes.pool = p.dataset.spool;
  store.shakesPool = shakes.pool;
  save();
  refreshShakesHome();
});
listmain.addEventListener('input', e => {
  if (e.target.id === 'gsearch') filterGuide(e.target.value);
});
listmain.addEventListener('click', e => {
  const mem = e.target.closest('[data-smem]');
  if (mem) { toggleMemorized(mem.dataset.smem); return; }
  const b = e.target.closest('[data-jump]');
  if (!b) return;
  const gs = $('#gsearch');
  if (gs && gs.value) { gs.value = ''; filterGuide(''); }
  $('#g-' + b.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.body.classList.contains('nav-open')) { setNav(false); return; }
  if (app === 'countries' && view === 'quiz') failTarget();
  else SH.escape(app);
});

// iOS Safari does not resize the layout viewport when the keyboard opens: only the visual
// viewport shrinks, and Safari pans the page to reveal the focused input. Sizing the
// presidents quiz shell to the visual viewport keeps the input anchored above the keyboard
// and leaves the list as the only thing that scrolls.
const keepQuizAnchored = () => {
  const d = document.body.dataset;
  const quizzing = (d.module === 'list' && d.lview === 'quiz') ||
    (d.app === 'countries' && d.view === 'quiz') ||
    document.body.classList.contains('quizzing');
  if (quizzing && window.scrollY) window.scrollTo(0, 0);
};
if (window.visualViewport) {
  const vv = window.visualViewport;
  const syncAppVh = () => {
    document.documentElement.style.setProperty('--app-vh', vv.height + 'px');
    keepQuizAnchored();
  };
  vv.addEventListener('resize', syncAppVh);
  vv.addEventListener('scroll', syncAppVh);
  syncAppVh();
}
// Safari also scrolls the document itself to reveal the focused input; undo that so the
// header stays at the top of the shell.
window.addEventListener('scroll', keepQuizAnchored, { passive: true });

// Wait for the module scripts that follow app.js to register before routing.
document.addEventListener('DOMContentLoaded', () => {
  init();
  // Restore the topic from the URL; a bare URL opens the home page.
  setApp(appFromHash());
});

// Offline support. The first visit installs the worker; a later release waits until the
// banner is used or every tab is closed, so an update never interrupts a quiz.
if ('serviceWorker' in navigator) {
  let reloadRequested = false;
  const showUpdate = () => { const b = $('#updateBanner'); if (b) b.hidden = false; };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadRequested) location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      // Ask for durable storage so the browser is less likely to evict saved progress.
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate();
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
        });
      });
      $('#updateReload')?.addEventListener('click', () => {
        reloadRequested = true;
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        else location.reload();
      });
    } catch (e) {
      // Offline support is a progressive enhancement; the app still works online.
    }
  });
}
