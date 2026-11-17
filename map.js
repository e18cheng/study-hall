// World Geography: map setup, study list, and map/capital quizzes.

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

// Drop saved region ids that no longer exist (for example after a region edit).
if ('terr' in store) { // older versions had a single global toggle
  if (store.terr) store.terrRegions = Object.keys(REGIONS).filter(id => REGIONS[id].terr.length);
  delete store.terr;
}
store.selected = store.selected.filter(id => REGIONS[id]);
store.learned = store.learned.filter(id => REGIONS[id]);
store.terrRegions = store.terrRegions.filter(id => REGIONS[id]);

// ---------------------------------------------------------------------------
// Map state and colors
// ---------------------------------------------------------------------------
const FEATS = new Map(); // code -> feature record
let SOV = [];            // records for sovereign countries
const tip = $('#tip'), mapwrap = $('#mapwrap');
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
const nameOf = code => COUNTRY[code] ? COUNTRY[code].name : (EXTRA_NAMES[code] || FEATS.get(code)?.neName || '');
// Whether a country/territory can be selected and quizzed right now.
const terrOn = rid => store.terrRegions.includes(rid);
const inPlay = code => !!COUNTRY[code] && (!COUNTRY[code].terr || terrOn(COUNTRY[code].region));
const regionCodes = r => terrOn(r.id) ? [...r.codes, ...r.terr] : r.codes;

// ---------------------------------------------------------------------------
// Map setup
// ---------------------------------------------------------------------------
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


// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

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
