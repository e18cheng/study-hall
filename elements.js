// ---------------------------------------------------------------------------
// Periodic table
// ---------------------------------------------------------------------------
// The table is a CSS grid, not SVG: every tile is a real button, so the same
// markup works for study, "find the element", and result dots. Element data
// comes from elements-data.js (Periodic-Table-JSON, CC BY-SA 3.0).
const ELEMENTS = Array.isArray(window.ELEMENTS) ? window.ELEMENTS : [];
const ELEMENT_BY_NUMBER = new Map(ELEMENTS.map(e => [e.n, e]));

// Twenty familiar elements beyond the first twenty, for a manageable quiz pool.
const ELEM_COMMON = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  22, 24, 25, 26, 27, 28, 29, 30, 35, 47, 50, 53, 54, 56, 74, 78, 79, 80, 82, 92,
]);

const ELEM_POOLS = {
  all: { label: 'All', test: () => true },
  first20: { label: 'First 20', test: e => e.n <= 20 },
  common40: { label: 'Common 40', test: e => ELEM_COMMON.has(e.n) },
  metals: {
    label: 'Metals',
    test: e => ['alkali', 'alkaline', 'transition', 'post', 'lanthanide', 'actinide'].includes(e.cat) ||
      (e.cat === 'unknown' && /(transition|post-transition) metal/i.test(e.catName)),
  },
  nonmetals: {
    label: 'Nonmetals',
    test: e => e.cat === 'nonmetal' || (e.cat === 'unknown' && /nonmetal/i.test(e.catName)),
  },
  noble: {
    label: 'Noble gases',
    test: e => e.cat === 'noble' || /noble gas/i.test(e.catName),
  },
  metalloids: {
    label: 'Metalloids',
    test: e => e.cat === 'metalloid' || (e.cat === 'unknown' && /metalloid/i.test(e.catName)),
  },
};

const ELEM_TASKS = {
  sym: { label: 'Symbol → name', short: 'Symbol→name' },
  name: { label: 'Name → symbol', short: 'Name→symbol' },
  find: { label: 'Find the element', short: 'Find' },
};

// Dataset spellings are British; accept the common American forms too.
const ELEM_ALIASES = {
  aluminium: ['aluminum'], aluminum: ['aluminium'],
  caesium: ['cesium'], cesium: ['caesium'],
  sulfur: ['sulphur'], sulphur: ['sulfur'],
};
for (const e of ELEMENTS) e.forms = [norm(e.name), ...(ELEM_ALIASES[norm(e.name)] || [])];

// Repair older saved stores and keep the selected element valid.
if (!ELEM_POOLS[store.elemPool]) store.elemPool = 'all';
if (!ELEMENT_BY_NUMBER.has(store.elemSelected)) {
  store.elemSelected = ELEMENT_BY_NUMBER.has(26) ? 26 : (ELEMENTS[0]?.n || 1);
}
store.elemStats = store.elemStats && typeof store.elemStats === 'object' ? store.elemStats : {};
store.elemBest = store.elemBest && typeof store.elemBest === 'object' ? store.elemBest : {};
if (typeof store.elemNames !== 'boolean') store.elemNames = true;
if (typeof store.elemColors !== 'boolean') store.elemColors = true;

const elem = { view: 'home', qz: null, timer: null };

function elemPoolNumbers(poolId = store.elemPool) {
  const p = ELEM_POOLS[poolId] || ELEM_POOLS.all;
  return ELEMENTS.filter(p.test).map(e => e.n);
}
const elemPoolLabel = (poolId = store.elemPool) => (ELEM_POOLS[poolId] || ELEM_POOLS.all).label;

function elemHomeProgress() {
  if (!ELEMENTS.length) return 'Element data unavailable';
  const seen = ELEMENTS.filter(e => store.elemStats[e.n]).length;
  const best = Object.values(store.elemBest).reduce((m, b) => Math.max(m, b?.pct || 0), 0);
  return `${seen} / ${ELEMENTS.length} studied${best ? ` · best ${best}%` : ''}`;
}

function elemBestLine() {
  const parts = Object.keys(ELEM_TASKS).map(task => {
    const b = store.elemBest[`${task}:${store.elemPool}`];
    return b ? `${ELEM_TASKS[task].short} ${b.pct}%` : null;
  }).filter(Boolean);
  return parts.length ? `Best in this pool: ${parts.join(' · ')}` : '';
}

const fmtMass = m => m == null ? '—' : String(Number(m.toFixed(3)));
const fmtConfig = cfg => cfg ? esc(cfg).replace(/([spdfg])(\d+)/g, '$1<sup>$2</sup>') : '—';

function elemCardHtml(n) {
  const e = ELEMENT_BY_NUMBER.get(n) || ELEMENTS[0];
  if (!e) return '';
  return `<div class="erow"><span class="ebig">${e.n}</span><div>
      <div class="esym">${esc(e.symbol)} · ${esc(e.name)}</div>
      <div class="ecat">${esc(e.catName)}</div>
    </div></div>
    <dl>
      <dt>Mass</dt><dd>${fmtMass(e.mass)} u</dd>
      <dt>Period</dt><dd>${e.period}</dd>
      <dt>Group</dt><dd>${e.block === 'f' ? '—' : e.group}</dd>
      <dt>Block</dt><dd>${esc(e.block)}</dd>
      <dt>Config</dt><dd class="ecfg">${fmtConfig(e.config)}</dd>
    </dl>`;
}

function elemTableHtml() {
  const qz = elem.view === 'quiz' ? elem.qz : null;
  const find = qz && qz.task === 'find';
  const active = find ? new Set(qz.queue) : null;
  const showNames = store.elemNames && !find;
  const selected = elem.view === 'home' ? store.elemSelected : null;
  const tiles = ELEMENTS.map(e => {
    const cls = ['eel', e.cat];
    if (selected === e.n) cls.push('selected');
    if (active && !active.has(e.n)) cls.push('off');
    const res = store.elemStats[e.n]?.last;
    const dot = res ? `<i class="dot ${resCls(res)}"></i>` : '';
    const name = showNames ? `<span class="ename">${esc(e.name)}</span>` : '';
    return `<button type="button" class="${cls.join(' ')}" data-el="${e.n}" style="grid-column:${e.x + 1};grid-row:${e.y + 1}" title="${esc(e.name)}">
      <span class="enum">${e.n}</span>${dot}<span class="esym">${esc(e.symbol)}</span>${name}</button>`;
  }).join('');
  const groupLabels = Array.from({ length: 18 }, (_, i) =>
    `<span class="eghead" style="grid-column:${i + 2};grid-row:1">${i + 1}</span>`).join('');
  const periodLabels = Array.from({ length: 7 }, (_, i) =>
    `<span class="eperiod" style="grid-column:1;grid-row:${i + 2}">${i + 1}</span>`).join('');
  const stars = `<span class="estar" style="grid-row:10">*</span><span class="estar" style="grid-row:11">**</span>`;
  const ph = `<span class="eph" style="grid-column:4;grid-row:7">57–71</span>
    <span class="eph" style="grid-column:4;grid-row:8">89–103</span>`;
  return `<div class="etable${store.elemColors ? '' : ' nocolor'}" role="grid" aria-label="Periodic table of the elements">
    ${groupLabels}${periodLabels}${stars}${ph}${tiles}</div>`;
}

function elemLegendHtml() {
  if (!store.elemColors) return `<div class="elegend"><span class="fbl">* Lanthanides &nbsp; ** Actinides</span></div>`;
  const items = [
    ['alkali', 'Alkali metal'], ['alkaline', 'Alkaline earth'], ['transition', 'Transition'],
    ['post', 'Post-transition'], ['metalloid', 'Metalloid'], ['nonmetal', 'Nonmetal'],
    ['noble', 'Noble gas'], ['lanthanide', 'Lanthanide'], ['actinide', 'Actinide'],
    ['unknown', 'Unknown / predicted'],
  ];
  return `<div class="elegend">${items.map(([c, n]) => `<span><i class="esw ${c}"></i>${n}</span>`).join('')}
    <span class="fbl">* Lanthanides &nbsp; ** Actinides</span></div>`;
}

const elemMainHtml = () => `<div class="emain"><div class="etablewrap">${elemTableHtml()}</div>${elemLegendHtml()}</div>`;
const elemResultsMainHtml = () => `<div class="emain"><div class="etablewrap">${elemTableHtml()}</div>${elemLegendHtml()}</div>`;

function elemQuizMainHtml() {
  const qz = elem.qz;
  if (!qz) return '';
  if (qz.task === 'find') return `<div class="emain"><div class="etablewrap">${elemTableHtml()}</div></div>`;
  if (!qz.target) return '';
  const big = qz.task === 'sym' ? qz.target.symbol : qz.target.name;
  return `<div class="emain"><div class="estage">
    <div class="ekicker">${esc(ELEM_TASKS[qz.task].label)}</div>
    <div class="ebig${qz.task === 'name' ? ' name' : ''}">${esc(big)}</div>
    <div class="esub">${qz.task === 'sym' ? 'Type the element name' : 'Type the chemical symbol'}</div>
  </div></div>`;
}

function elemHomePanelHtml() {
  const n = elemPoolNumbers().length;
  const best = elemBestLine();
  return `<div class="pscroll"><div class="ptitle">
    <h1>Periodic Table</h1>
    <p class="muted small">${ELEMENTS.length} elements. Tap a tile to study it; dots show your last result.</p>
  </div><div class="pbody">
    <h3>Pool</h3>
    <div class="quick epools">${Object.entries(ELEM_POOLS).map(([id, p]) =>
      `<button class="chip${store.elemPool === id ? ' on' : ''}" data-epool="${id}">${esc(p.label)}</button>`).join('')}</div>
    <p class="muted small">${n} element${n === 1 ? '' : 's'} in this pool.${best ? `<br>${esc(best)}` : ''}</p>
    <h3>Study</h3>
    <label class="tog"><input type="checkbox" data-enames ${store.elemNames ? 'checked' : ''}> Show names on tiles</label>
    <p class="muted small">Names appear when the table is wide enough; narrow screens show symbols only.</p>
    <label class="tog"><input type="checkbox" data-ecolors ${store.elemColors ? 'checked' : ''}> Color by category</label>
    <h3>Selected element</h3>
    <div class="ecard" id="ecard">${elemCardHtml(store.elemSelected)}</div>
  </div></div><div class="pfoot"><div class="btns">
    <button class="btn primary wide" data-eact="sym">Symbol → name</button>
    <button class="btn" data-eact="name">Name → symbol</button>
    <button class="btn" data-eact="find">Find the element</button>
  </div></div>`;
}

function elemQuizPanelHtml() {
  const qz = elem.qz;
  if (!qz) return '';
  const typing = qz.task !== 'find';
  return `<div class="pscroll"><div class="pbody">
    <div class="qbar"><button class="back" data-eact="quit">✕ Quit</button><span id="eprog"></span><span id="etime">0:00</span></div>
    <div class="bar"><i id="ebar"></i></div>
    <div class="prompt" id="eprompt"></div>
    <div class="fb" id="efb"></div>
  </div></div><div class="pfoot">
    ${typing ? `<form class="qform" id="eform" autocomplete="off">
      <input id="ein" name="answer" autocomplete="off" autocapitalize="${qz.task === 'sym' ? 'words' : 'off'}" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="${qz.task === 'sym' ? 'Type the element name…' : 'Type the symbol…'}">
      <button class="btn primary">Check</button></form>` : ''}
    <div class="qrow"><div class="tally" id="etally"></div><button class="btn ghost" data-eact="reveal">Reveal</button></div>
  </div>`;
}

function elemResultsPanelHtml() {
  const qz = elem.qz;
  if (!qz) return '';
  const total = qz.queue.length;
  const first = qz.queue.filter(n => qz.res[n] === 1).length;
  const pct = Math.round(100 * first / total);
  const missed = qz.queue.filter(n => qz.res[n] !== 1)
    .sort((a, b) => (qz.res[a] === 'x' ? 0 : 1) - (qz.res[b] === 'x' ? 0 : 1) || a - b);
  const rows = missed.map(n => {
    const e = ELEMENT_BY_NUMBER.get(n);
    return `<li><span class="enum">${e.n}</span><span class="esym">${esc(e.symbol)}</span>
      <span class="ename">${esc(e.name)}</span><i class="dot ${resCls(qz.res[n])}"></i></li>`;
  }).join('');
  return `<div class="pscroll"><div class="ptitle"><button class="back" data-eact="home">← Table</button>
    <h2>${esc(ELEM_TASKS[qz.task].label)} · ${esc(qz.poolName)}</h2></div><div class="pbody">
    <div class="score">${pct}%${qz.newBest ? '<span class="newbest">New best</span>' : ''}</div>
    <p class="muted">${first} of ${total} on the first try · ${fmtTime(qz.elapsed)}</p>
    <div class="tally">${tallyHtml(qz.res)}</div>
    ${missed.length ? `<h3>Review (${missed.length})</h3><ul class="emissed">${rows}</ul>`
      : '<p>Perfect run. Every element on the first try.</p>'}
  </div></div><div class="pfoot"><div class="btns">
    ${missed.length ? `<button class="btn primary full" data-eact="retry">Retry the ${missed.length} I missed</button>` : ''}
    <button class="btn" data-eact="again">Same quiz again</button>
    <button class="btn" data-eact="other">${elemOtherLabel(qz.task)}</button>
    <button class="btn ghost full" data-eact="home">Back to table</button>
  </div></div>`;
}

function renderElem() {
  if (!ELEMENTS.length) {
    document.body.dataset.lview = 'home';
    document.body.classList.remove('quizzing');
    panel.innerHTML = navHeadHtml() + `<div class="pscroll"><div class="pbody"><p class="muted">Element data did not load. Check that <code>elements-data.js</code> is next to this page.</p></div></div>`;
    listmain.innerHTML = '';
    return;
  }
  document.body.dataset.lview = elem.view === 'quiz' ? 'quiz' : 'home';
  document.body.classList.toggle('quizzing', app === 'elements' && elem.view === 'quiz');
  const pscroll = $('.pscroll', panel)?.scrollTop || 0;
  const tscroll = $('.etablewrap')?.scrollLeft || 0;
  const head = navHeadHtml();
  if (elem.view === 'quiz') {
    panel.innerHTML = head + elemQuizPanelHtml();
    listmain.innerHTML = elemQuizMainHtml();
    updateElemUI();
  } else if (elem.view === 'results') {
    panel.innerHTML = head + elemResultsPanelHtml();
    listmain.innerHTML = elemResultsMainHtml();
  } else {
    panel.innerHTML = head + elemHomePanelHtml();
    listmain.innerHTML = elemMainHtml();
  }
  if (elem.view === 'home') {
    const ps = $('.pscroll', panel);
    if (ps) ps.scrollTop = pscroll;
  }
  const tw = $('.etablewrap');
  if (tw) tw.scrollLeft = tscroll;
  if (elem.view === 'quiz' && elem.qz?.task !== 'find') $('#ein')?.focus();
}

function updateElemUI() {
  const qz = elem.qz;
  if (!qz) return;
  const done = Object.keys(qz.res).length, total = qz.queue.length;
  const set = (id, txt) => { const el = $('#' + id); if (el) el.textContent = txt; };
  set('eprog', `${Math.min(done + 1, total)} / ${total}`);
  const bar = $('#ebar'); if (bar) bar.style.width = (100 * done / total) + '%';
  const tally = $('#etally'); if (tally) tally.innerHTML = tallyHtml(qz.res);
  const prompt = $('#eprompt');
  if (prompt) prompt.innerHTML = !qz.target ? ''
    : qz.task === 'find' ? `Click <b>${esc(qz.target.name)}</b>`
    : qz.task === 'sym' ? `What element is <b class="esym">${esc(qz.target.symbol)}</b>?`
    : `What is the symbol for <b>${esc(qz.target.name)}</b>?`;
}

function elemFb(html, cls) { const el = $('#efb'); if (el) { el.innerHTML = html; el.className = 'fb ' + cls; } }

function flashElem(n, kind = 'bad') {
  const el = listmain.querySelector(`[data-el="${n}"]`);
  if (!el) return;
  el.classList.remove('flash', 'flashgood');
  void el.offsetWidth;
  el.classList.add(kind === 'good' ? 'flashgood' : 'flash');
}

function elemSelect(n) {
  if (!ELEMENT_BY_NUMBER.has(n)) return;
  store.elemSelected = n;
  save();
  const card = $('#ecard');
  if (card) card.innerHTML = elemCardHtml(n);
  for (const el of listmain.querySelectorAll('.eel.selected')) el.classList.remove('selected');
  listmain.querySelector(`[data-el="${n}"]`)?.classList.add('selected');
}

const elemOther = task => task === 'sym' ? 'name' : task === 'name' ? 'find' : 'sym';
const elemOtherLabel = task => task === 'sym' ? 'Try name → symbol'
  : task === 'name' ? 'Try find the element' : 'Try symbol → name';

function elemStart(task, nums) {
  if (!ELEM_TASKS[task] || !ELEMENTS.length) return;
  const full = elemPoolNumbers();
  const queue = nums ? nums.slice() : full;
  if (!queue.length) return;
  const review = !!nums && (queue.length !== full.length || queue.some(n => !full.includes(n)));
  clearInterval(elem.timer);
  elem.qz = {
    task, queue: shuffle(queue), i: -1, tries: 0, res: {}, start: Date.now(), elapsed: 0,
    bestKey: review ? null : `${task}:${store.elemPool}`,
    poolName: review ? `Review · ${queue.length}` : elemPoolLabel(),
    target: null, locked: false, newBest: false,
  };
  elem.view = 'quiz';
  elemNext();
  listmain.scrollTop = 0;
  const tw = $('.etablewrap');
  if (tw) tw.scrollLeft = 0;
  elem.timer = setInterval(() => {
    const el = $('#etime');
    if (el && elem.qz) el.textContent = fmtTime(Date.now() - elem.qz.start);
  }, 500);
}

function elemNext() {
  const qz = elem.qz;
  if (!qz) return;
  qz.tries = 0;
  qz.locked = false;
  qz.i++;
  if (qz.i >= qz.queue.length) return elemFinish();
  qz.target = ELEMENT_BY_NUMBER.get(qz.queue[qz.i]);
  renderElem();
  if (qz.task !== 'find') $('#ein')?.focus();
}

function elemSetRes(n, r) {
  const qz = elem.qz;
  if (!qz) return;
  qz.res[n] = r;
  const st = store.elemStats[n] || (store.elemStats[n] = { n: 0, ok: 0 });
  st.n++; if (r === 1) st.ok++; st.last = r;
  save();
}

function elemNameMatch(guess, e) {
  if (e.forms.includes(guess)) return true;
  // An exact name of another element is wrong, even if it is one typo away.
  if (ELEMENTS.some(x => x.n !== e.n && x.forms.includes(guess))) return false;
  return e.forms.some(f => lev(guess, f) <= fuzzyLimit(f));
}

function elemSubmit() {
  const qz = elem.qz;
  if (!qz || qz.locked || qz.task === 'find') return;
  const inp = $('#ein');
  if (!inp) return;
  const guess = norm(inp.value);
  if (!guess) return;
  const ok = qz.task === 'sym' ? elemNameMatch(guess, qz.target) : guess === qz.target.symbol.toLowerCase();
  if (ok) {
    elemSetRes(qz.target.n, qz.tries + 1);
    elemFb(`✓ ${esc(qz.task === 'sym' ? qz.target.name : qz.target.symbol)}`, 'good');
    elemNext();
    return;
  }
  qz.tries++;
  inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
  inp.select();
  if (qz.tries >= 3) return elemFail();
  const hint = qz.task === 'sym'
    ? `starts with “${esc(qz.target.name[0])}”, ${qz.target.name.replace(/[^A-Za-z]/g, '').length} letters`
    : `starts with “${esc(qz.target.symbol[0])}”`;
  elemFb(qz.tries === 2 ? `✗ Hint: ${hint}` : '✗ Not quite — try again', 'bad');
}

function elemFail() {
  const qz = elem.qz;
  if (!qz || qz.locked || !qz.target) return;
  qz.locked = true;
  elemSetRes(qz.target.n, 'x');
  if (qz.task === 'find') flashElem(qz.target.n, 'good');
  elemFb(`It was <b>${esc(qz.task === 'sym' ? qz.target.name : qz.task === 'name' ? qz.target.symbol : qz.target.name)}</b>`, 'bad');
  updateElemUI();
  setTimeout(() => { if (elem.view === 'quiz' && elem.qz === qz) elemNext(); }, qz.task === 'find' ? 1400 : 1800);
}

function elemOnTile(n) {
  const qz = elem.qz;
  if (!qz || elem.view !== 'quiz' || qz.task !== 'find') { elemSelect(n); return; }
  if (qz.locked || !qz.queue.includes(n)) return;
  if (n === qz.target.n) {
    elemSetRes(n, qz.tries + 1);
    elemFb(`✓ ${esc(qz.target.name)}`, 'good');
    flashElem(n, 'good');
    elemNext();
  } else {
    qz.tries++;
    flashElem(n);
    elemFb(`✗ That's ${esc(ELEMENT_BY_NUMBER.get(n).name)}`, 'bad');
    if (qz.tries >= 3) elemFail();
  }
}

function elemFinish() {
  const qz = elem.qz;
  if (!qz) return;
  clearInterval(elem.timer);
  qz.elapsed = Date.now() - qz.start;
  qz.target = null;
  const first = qz.queue.filter(n => qz.res[n] === 1).length;
  const pct = Math.round(100 * first / qz.queue.length);
  if (qz.bestKey) {
    const b = store.elemBest[qz.bestKey];
    if (!b || pct > b.pct || (pct === b.pct && qz.elapsed < b.ms)) {
      store.elemBest[qz.bestKey] = { pct, ms: qz.elapsed };
      qz.newBest = !!b;
      save();
    }
  }
  elem.view = 'results';
  renderElem();
  listmain.scrollTop = 0;
}

const ELEM_ACTIONS = {
  sym: () => elemStart('sym'),
  name: () => elemStart('name'),
  find: () => elemStart('find'),
  quit: () => { clearInterval(elem.timer); elem.qz = null; elem.view = 'home'; renderElem(); listmain.scrollTop = 0; },
  reveal: () => elemFail(),
  retry: () => {
    const qz = elem.qz;
    if (qz) elemStart(qz.task, qz.queue.filter(n => qz.res[n] !== 1));
  },
  again: () => { const qz = elem.qz; if (qz) elemStart(qz.task, qz.queue); },
  other: () => { const qz = elem.qz; if (qz) elemStart(elemOther(qz.task), qz.queue); },
  home: () => { clearInterval(elem.timer); elem.qz = null; elem.view = 'home'; renderElem(); listmain.scrollTop = 0; },
};

panel.addEventListener('click', e => {
  const b = e.target.closest('[data-eact]');
  if (b && !b.disabled) { ELEM_ACTIONS[b.dataset.eact](b, e); return; }
  const p = e.target.closest('[data-epool]');
  if (p && !p.disabled) {
    store.elemPool = p.dataset.epool;
    save();
    renderElem();
  }
});
panel.addEventListener('change', e => {
  const t = e.target;
  if ('enames' in t.dataset) { store.elemNames = t.checked; save(); renderElem(); }
  else if ('ecolors' in t.dataset) { store.elemColors = t.checked; save(); renderElem(); }
});
listmain.addEventListener('click', e => {
  if (app !== 'elements') return;
  const el = e.target.closest('[data-el]');
  if (el) elemOnTile(+el.dataset.el);
});


SH.register('elements', {
  kind: 'elements',
  render: renderElem,
  enter() {
    clearInterval(elem.timer);
    elem.qz = null;
    elem.view = 'home';
    renderElem();
    listmain.scrollTop = 0;
    window.scrollTo(0, 0);
  },
  leave() {
    clearInterval(elem.timer);
    elem.qz = null;
    elem.view = 'home';
  },
  submit: elemSubmit,
  escape() { if (elem.view === 'quiz') elemFail(); },
  homeProgress: elemHomeProgress,
});
