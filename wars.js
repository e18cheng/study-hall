// ---------------------------------------------------------------------------
// US Wars
// ---------------------------------------------------------------------------
const WARS = Array.isArray(window.WARS) ? window.WARS : [];
const WAR_BY_ID = new Map(WARS.map(w => [w.id, w]));

const WAR_POOLS = {
  core: { label: 'Core 12', test: w => w.core },
  all: { label: 'All conflicts', test: () => true },
};

const WAR_TASKS = {
  years: { label: 'War → years', short: 'War→years', type: 'choice' },
  name: { label: 'Years → war', short: 'Years→war', type: 'choice' },
  president: { label: 'War → president', short: 'War→president', type: 'type' },
  opponent: { label: 'War → opponent', short: 'War→opponent', type: 'type' },
};
const WAR_TASK_ORDER = ['years', 'name', 'president', 'opponent'];

const WAR_ERAS = [
  { id: 'founding', label: 'Founding era', range: '1754–1815' },
  { id: 'expansion', label: 'Expansion and union', range: '1846–1902' },
  { id: 'worldwars', label: 'World wars', range: '1917–1945' },
  { id: 'coldwar', label: 'Cold War', range: '1947–1991' },
  { id: 'postcold', label: 'Post-Cold War', range: '1990–present' },
];

// Common short forms for presidents whose full name is a mouthful.
const PRESIDENT_ALIASES = {
  'Franklin D. Roosevelt': ['fdr'],
  'John F. Kennedy': ['jfk'],
  'Lyndon B. Johnson': ['lbj'],
  'Dwight D. Eisenhower': ['ike'],
  'Theodore Roosevelt': ['teddy'],
  'George H. W. Bush': ['george bush', 'bush sr', 'bush 41'],
  'George W. Bush': ['george bush', 'bush jr', 'bush 43'],
  'Joe Biden': ['joseph biden'],
};
const presidentForms = p => [norm(p), norm(p.split(' ').pop()), ...(PRESIDENT_ALIASES[p] || []).map(norm)];

for (const w of WARS) {
  w.opponentForms = (w.opponentForms || [w.opponent]).map(norm);
}

// Repair older saved stores and keep the pool valid.
if (!WAR_POOLS[store.warPool]) store.warPool = 'core';
store.warStats = store.warStats && typeof store.warStats === 'object' ? store.warStats : {};
store.warBest = store.warBest && typeof store.warBest === 'object' ? store.warBest : {};

const war = { view: 'home', qz: null, timer: null };

function warPoolWars(poolId = store.warPool) {
  const p = WAR_POOLS[poolId] || WAR_POOLS.core;
  return WARS.filter(p.test);
}
const warPoolIds = (poolId = store.warPool) => warPoolWars(poolId).map(w => w.id);
const warPoolLabel = (poolId = store.warPool) => (WAR_POOLS[poolId] || WAR_POOLS.core).label;

function warHomeProgress() {
  if (!WARS.length) return 'War data unavailable';
  const seen = WARS.filter(w => store.warStats[w.id]).length;
  const best = Object.values(store.warBest).reduce((m, b) => Math.max(m, b?.pct || 0), 0);
  return `${seen} / ${WARS.length} studied${best ? ` · best ${best}%` : ''}`;
}

function warBestLine() {
  const parts = Object.keys(WAR_TASKS).map(task => {
    const b = store.warBest[`${task}:${store.warPool}`];
    return b ? `${WAR_TASKS[task].short} ${b.pct}%` : null;
  }).filter(Boolean);
  return parts.length ? `Best in this pool: ${parts.join(' · ')}` : '';
}

const warPresidentText = w => w.presidents.length ? w.presidents.join(', ') : w.presidentNote;
const warPresidentShort = w => {
  if (!w.presidents.length) return w.presidentNote;
  if (w.presidents.length <= 2) return w.presidents.join(' / ');
  return `${w.presidents[0]} + ${w.presidents.length - 1} more`;
};

function warCardHtml(w) {
  const res = store.warStats[w.id]?.last;
  const cls = ['wcard'];
  if (res === 'x') cls.push('missed');
  else if (res === 1) cls.push('perfect');
  return `<article class="${cls.join(' ')}" data-war="${w.id}">
    <div class="whead">
      <span class="wyears">${esc(w.years)}</span>
      <h4 class="wname">${esc(w.name)}</h4>
      ${res ? `<i class="dot ${resCls(res)}"></i>` : ''}
    </div>
    <div class="wmeta">Opponent: ${esc(w.opponent)} · President: ${esc(warPresidentText(w))}</div>
    <p class="wsummary">${esc(w.summary)}</p>
    <div class="woutcome">Outcome: ${esc(w.outcome)}</div>
    ${w.note ? `<div class="wnote">${esc(w.note)}</div>` : ''}
  </article>`;
}

function warTimelineHtml() {
  const ids = new Set(warPoolIds());
  const eras = WAR_ERAS.map(era => ({
    ...era,
    wars: WARS.filter(w => w.era === era.id && ids.has(w.id))
      .sort((a, b) => a.start - b.start || a.end - b.end),
  })).filter(era => era.wars.length);
  return `<div class="wmain"><div class="wtimeline">
    ${eras.map(era => `<section class="wera">
      <div class="werahead"><h3>${esc(era.label)}</h3><span>${esc(era.range)}</span></div>
      <div class="wlist">${era.wars.map(warCardHtml).join('')}</div>
    </section>`).join('')}
  </div></div>`;
}

const warMainHtml = () => warTimelineHtml();
const warResultsMainHtml = () => warTimelineHtml();

function warQuizMainHtml() {
  const qz = war.qz;
  if (!qz || !qz.target) return '';
  if (WAR_TASKS[qz.task].type === 'choice') {
    return `<div class="wmain"><div class="woptions">
      ${qz.options.map((o, i) => `<button class="woption" data-wopt="${i}">${esc(o.text)}</button>`).join('')}
    </div></div>`;
  }
  const w = qz.target;
  const context = qz.task === 'president'
    ? `${esc(w.years)} · Opponent: ${esc(w.opponent)}`
    : `${esc(w.years)} · President: ${esc(w.presidents[0] || w.presidentNote)}`;
  return `<div class="wmain"><div class="wcontext">${context}</div></div>`;
}

function warHomePanelHtml() {
  const n = warPoolWars().length;
  const best = warBestLine();
  return `<div class="pscroll"><div class="ptitle">
    <h1>US Wars</h1>
    <p class="muted small">Study the timeline, then quiz yourself on dates, presidents, and opponents.</p>
  </div><div class="pbody">
    <h3>Pool</h3>
    <div class="quick wpools">${Object.entries(WAR_POOLS).map(([id, p]) =>
      `<button class="chip${store.warPool === id ? ' on' : ''}" data-wpool="${id}">${esc(p.label)}</button>`).join('')}</div>
    <p class="muted small">${n} war${n === 1 ? '' : 's'} in this pool.${best ? `<br>${esc(best)}` : ''}</p>
    <h3>Study</h3>
    <p class="muted small">The timeline is grouped by era. Dots show your last result. The president quiz covers wars with a US president.</p>
  </div></div><div class="pfoot"><div class="btns">
    <button class="btn primary wide" data-wact="years">War → years</button>
    <button class="btn" data-wact="name">Years → war</button>
    <button class="btn" data-wact="president">War → president</button>
    <button class="btn" data-wact="opponent">War → opponent</button>
  </div></div>`;
}

function warQuizPanelHtml() {
  const qz = war.qz;
  if (!qz) return '';
  const typing = WAR_TASKS[qz.task].type === 'type';
  const placeholder = qz.task === 'president' ? 'Type a president…' : 'Type the opponent…';
  return `<div class="pscroll"><div class="pbody">
    <div class="qbar"><button class="back" data-wact="quit">✕ Quit</button><span id="wprog"></span><span id="wtime">0:00</span></div>
    <div class="bar"><i id="wbar"></i></div>
    <div class="prompt" id="wprompt"></div>
    <div class="fb" id="wfb"></div>
  </div></div><div class="pfoot">
    ${typing ? `<form class="qform" id="wform" autocomplete="off">
      <input id="win" name="answer" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="${placeholder}">
      <button class="btn primary">Check</button></form>` : ''}
    <div class="qrow"><div class="tally" id="wtally"></div><button class="btn ghost" data-wact="reveal">Reveal</button></div>
  </div>`;
}

function warResultsPanelHtml() {
  const qz = war.qz;
  if (!qz) return '';
  const total = qz.queue.length;
  const first = qz.queue.filter(id => qz.res[id] === 1).length;
  const pct = Math.round(100 * first / total);
  const missed = qz.queue.filter(id => qz.res[id] !== 1)
    .sort((a, b) => (qz.res[a] === 'x' ? 0 : 1) - (qz.res[b] === 'x' ? 0 : 1) || WAR_BY_ID.get(a).start - WAR_BY_ID.get(b).start);
  const rows = missed.map(id => {
    const w = WAR_BY_ID.get(id);
    const ans = qz.task === 'president' ? warPresidentText(w)
      : qz.task === 'opponent' ? w.opponent : '';
    return `<li><span class="wyears">${esc(w.years)}</span><span class="wname">${esc(w.name)}</span>
      ${ans ? `<span class="wans">${esc(ans)}</span>` : ''}<i class="dot ${resCls(qz.res[id])}"></i></li>`;
  }).join('');
  return `<div class="pscroll"><div class="ptitle"><button class="back" data-wact="home">← Timeline</button>
    <h2>${esc(WAR_TASKS[qz.task].label)} · ${esc(qz.poolName)}</h2></div><div class="pbody">
    <div class="score">${pct}%${qz.newBest ? '<span class="newbest">New best</span>' : ''}</div>
    <p class="muted">${first} of ${total} on the first try · ${fmtTime(qz.elapsed)}</p>
    <div class="tally">${tallyHtml(qz.res)}</div>
    ${missed.length ? `<h3>Review (${missed.length})</h3><ul class="wmissed">${rows}</ul>`
      : '<p>Perfect run. Every war on the first try.</p>'}
  </div></div><div class="pfoot"><div class="btns">
    ${missed.length ? `<button class="btn primary full" data-wact="retry">Retry the ${missed.length} I missed</button>` : ''}
    <button class="btn" data-wact="again">Same quiz again</button>
    <button class="btn" data-wact="other">${warOtherLabel(qz.task)}</button>
    <button class="btn ghost full" data-wact="home">Back to timeline</button>
  </div></div>`;
}

function renderWar() {
  if (!WARS.length) {
    document.body.dataset.lview = 'home';
    document.body.classList.remove('quizzing');
    panel.innerHTML = navHeadHtml() + `<div class="pscroll"><div class="pbody"><p class="muted">War data did not load. Check that <code>wars-data.js</code> is next to this page.</p></div></div>`;
    listmain.innerHTML = '';
    return;
  }
  document.body.dataset.lview = war.view === 'quiz' ? 'quiz' : 'home';
  document.body.classList.toggle('quizzing', app === 'wars' && war.view === 'quiz');
  const pscroll = $('.pscroll', panel)?.scrollTop || 0;
  const head = navHeadHtml();
  if (war.view === 'quiz') {
    panel.innerHTML = head + warQuizPanelHtml();
    listmain.innerHTML = warQuizMainHtml();
    updateWarUI();
  } else if (war.view === 'results') {
    panel.innerHTML = head + warResultsPanelHtml();
    listmain.innerHTML = warResultsMainHtml();
  } else {
    panel.innerHTML = head + warHomePanelHtml();
    listmain.innerHTML = warMainHtml();
  }
  if (war.view === 'home') {
    const ps = $('.pscroll', panel);
    if (ps) ps.scrollTop = pscroll;
  }
  if (war.view === 'quiz' && WAR_TASKS[war.qz?.task]?.type === 'type') $('#win')?.focus();
}

function updateWarUI() {
  const qz = war.qz;
  if (!qz) return;
  const done = Object.keys(qz.res).length, total = qz.queue.length;
  const set = (id, txt) => { const el = $('#' + id); if (el) el.textContent = txt; };
  set('wprog', `${Math.min(done + 1, total)} / ${total}`);
  const bar = $('#wbar'); if (bar) bar.style.width = (100 * done / total) + '%';
  const tally = $('#wtally'); if (tally) tally.innerHTML = tallyHtml(qz.res);
  const prompt = $('#wprompt');
  if (!prompt) return;
  const w = qz.target;
  prompt.innerHTML = !w ? ''
    : qz.task === 'years' ? `Which years did the US fight the <b>${esc(w.name)}</b>?`
    : qz.task === 'name' ? `Which war was fought in <b>${esc(w.years)}</b>?`
    : qz.task === 'president' ? `Name a president who served during the <b>${esc(w.name)}</b>.`
    : `Who did the US fight in the <b>${esc(w.name)}</b>?`;
}

function warFb(html, cls) { const el = $('#wfb'); if (el) { el.innerHTML = html; el.className = 'fb ' + cls; } }

function warOptions(qz, target) {
  const key = qz.task === 'years' ? 'years' : 'name';
  const value = w => w[key];
  const seen = new Set([value(target)]);
  const others = [];
  // Prefer distractors from this quiz's pool, then fall back to every war.
  for (const source of [WARS.filter(w => qz.queue.includes(w.id)), WARS]) {
    for (const w of shuffle(source)) {
      if (others.length >= 3) break;
      if (w.id === target.id) continue;
      const v = value(w);
      if (seen.has(v)) continue;
      seen.add(v);
      others.push(w);
    }
    if (others.length >= 3) break;
  }
  return shuffle([target, ...others]).map(w => ({ text: value(w), correct: w.id === target.id }));
}

function warSetRes(id, r) {
  const qz = war.qz;
  if (!qz) return;
  qz.res[id] = r;
  const st = store.warStats[id] || (store.warStats[id] = { n: 0, ok: 0 });
  st.n++; if (r === 1) st.ok++; st.last = r;
  save();
}

function warPresidentMatch(guess, w) {
  for (const p of w.presidents) {
    const forms = presidentForms(p);
    if (forms.some(f => guess === f || lev(guess, f) <= fuzzyLimit(f))) return p;
  }
  return null;
}

function warOpponentMatch(guess, w) {
  return w.opponentForms.some(f => guess === f || lev(guess, f) <= fuzzyLimit(f));
}

function warNext() {
  const qz = war.qz;
  if (!qz) return;
  qz.tries = 0;
  qz.locked = false;
  qz.i++;
  if (qz.i >= qz.queue.length) return warFinish();
  qz.target = WAR_BY_ID.get(qz.queue[qz.i]);
  qz.options = WAR_TASKS[qz.task].type === 'choice' ? warOptions(qz, qz.target) : null;
  renderWar();
  if (WAR_TASKS[qz.task].type === 'type') $('#win')?.focus();
}

function warSubmit() {
  const qz = war.qz;
  if (!qz || qz.locked || WAR_TASKS[qz.task].type !== 'type') return;
  const inp = $('#win');
  if (!inp) return;
  const guess = norm(inp.value);
  if (!guess) return;
  const w = qz.target;
  const matched = qz.task === 'president' ? warPresidentMatch(guess, w) : null;
  const ok = qz.task === 'president' ? !!matched : warOpponentMatch(guess, w);
  if (ok) {
    warSetRes(w.id, qz.tries + 1);
    warFb(`✓ ${esc(qz.task === 'president' ? matched : w.opponent)}`, 'good');
    warNext();
    return;
  }
  qz.tries++;
  inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
  inp.select();
  if (qz.tries >= 3) return warFail();
  const hint = qz.task === 'president'
    ? (w.presidents.length ? `one answer starts with “${esc(w.presidents[0][0])}”` : 'no US president')
    : `starts with “${esc(w.opponent[0])}”`;
  warFb(qz.tries === 2 ? `✗ Hint: ${hint}` : '✗ Not quite — try again', 'bad');
}

function warChoose(i) {
  const qz = war.qz;
  if (!qz || qz.locked || WAR_TASKS[qz.task].type !== 'choice') return;
  const opt = qz.options?.[i];
  if (!opt) return;
  const btn = listmain.querySelector(`[data-wopt="${i}"]`);
  if (opt.correct) {
    qz.locked = true;
    btn?.classList.add('correct');
    warSetRes(qz.target.id, qz.tries + 1);
    warFb('✓ Correct', 'good');
    setTimeout(() => { if (war.view === 'quiz' && war.qz === qz) warNext(); }, 420);
    return;
  }
  qz.tries++;
  btn?.classList.add('wrong');
  btn?.setAttribute('disabled', '');
  warFb(`✗ That's ${esc(opt.text)}`, 'bad');
  if (qz.tries >= 3) return warFail();
}

function warFail() {
  const qz = war.qz;
  if (!qz || qz.locked || !qz.target) return;
  qz.locked = true;
  const w = qz.target;
  warSetRes(w.id, 'x');
  if (WAR_TASKS[qz.task].type === 'choice') {
    const correct = qz.options.findIndex(o => o.correct);
    listmain.querySelector(`[data-wopt="${correct}"]`)?.classList.add('correct');
    for (const b of listmain.querySelectorAll('.woption')) b.disabled = true;
  }
  const answer = qz.task === 'years' ? w.years
    : qz.task === 'name' ? w.name
    : qz.task === 'president' ? warPresidentShort(w)
    : w.opponent;
  warFb(`It was <b>${esc(answer)}</b>`, 'bad');
  updateWarUI();
  setTimeout(() => { if (war.view === 'quiz' && war.qz === qz) warNext(); }, 1600);
}

function warFinish() {
  const qz = war.qz;
  if (!qz) return;
  clearInterval(war.timer);
  qz.elapsed = Date.now() - qz.start;
  qz.target = null;
  qz.options = null;
  const first = qz.queue.filter(id => qz.res[id] === 1).length;
  const pct = Math.round(100 * first / qz.queue.length);
  if (qz.bestKey) {
    const b = store.warBest[qz.bestKey];
    if (!b || pct > b.pct || (pct === b.pct && qz.elapsed < b.ms)) {
      store.warBest[qz.bestKey] = { pct, ms: qz.elapsed };
      qz.newBest = !!b;
      save();
    }
  }
  war.view = 'results';
  renderWar();
  listmain.scrollTop = 0;
}

const warOther = task => WAR_TASK_ORDER[(WAR_TASK_ORDER.indexOf(task) + 1) % WAR_TASK_ORDER.length];
const warOtherLabel = task => `Try ${WAR_TASKS[warOther(task)].label.toLowerCase()}`;

function warStart(task, ids) {
  if (!WAR_TASKS[task] || !WARS.length) return;
  let full = warPoolIds();
  if (task === 'president') full = full.filter(id => WAR_BY_ID.get(id).presidents.length);
  let queue = ids ? ids.slice() : full;
  if (task === 'president') queue = queue.filter(id => WAR_BY_ID.get(id)?.presidents.length);
  if (!queue.length) return;
  const review = !!ids && (queue.length !== full.length || queue.some(id => !full.includes(id)));
  clearInterval(war.timer);
  const label = warPoolLabel();
  war.qz = {
    task, queue: shuffle(queue), i: -1, tries: 0, res: {}, start: Date.now(), elapsed: 0,
    bestKey: review ? null : `${task}:${store.warPool}`,
    poolName: review ? `Review · ${queue.length}`
      : task === 'president' ? `${label} · ${queue.length} with a president` : label,
    target: null, options: null, locked: false, newBest: false,
  };
  war.view = 'quiz';
  warNext();
  listmain.scrollTop = 0;
  war.timer = setInterval(() => {
    const el = $('#wtime');
    if (el && war.qz) el.textContent = fmtTime(Date.now() - war.qz.start);
  }, 500);
}

const WAR_ACTIONS = {
  years: () => warStart('years'),
  name: () => warStart('name'),
  president: () => warStart('president'),
  opponent: () => warStart('opponent'),
  quit: () => { clearInterval(war.timer); war.qz = null; war.view = 'home'; renderWar(); listmain.scrollTop = 0; },
  reveal: () => warFail(),
  retry: () => {
    const qz = war.qz;
    if (qz) warStart(qz.task, qz.queue.filter(id => qz.res[id] !== 1));
  },
  again: () => { const qz = war.qz; if (qz) warStart(qz.task, qz.queue); },
  other: () => { const qz = war.qz; if (qz) warStart(warOther(qz.task)); },
  home: () => { clearInterval(war.timer); war.qz = null; war.view = 'home'; renderWar(); listmain.scrollTop = 0; },
};

panel.addEventListener('click', e => {
  const b = e.target.closest('[data-wact]');
  if (b && !b.disabled) { WAR_ACTIONS[b.dataset.wact](b, e); return; }
  const p = e.target.closest('[data-wpool]');
  if (p && !p.disabled) {
    store.warPool = p.dataset.wpool;
    save();
    renderWar();
  }
});
listmain.addEventListener('click', e => {
  if (app !== 'wars') return;
  const b = e.target.closest('[data-wopt]');
  if (b) warChoose(+b.dataset.wopt);
});


SH.register('wars', {
  kind: 'wars',
  render: renderWar,
  enter() {
    clearInterval(war.timer);
    war.qz = null;
    war.view = 'home';
    renderWar();
    listmain.scrollTop = 0;
    window.scrollTo(0, 0);
  },
  leave() {
    clearInterval(war.timer);
    war.qz = null;
    war.view = 'home';
  },
  submit: warSubmit,
  escape() { if (war.view === 'quiz') warFail(); },
  homeProgress: warHomeProgress,
});
