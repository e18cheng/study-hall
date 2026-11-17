// Shakespeare: canon, study guide, flashcards, and list module definition.

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

addListModule({
    id: 'shakespeare', label: 'Shakespeare', title: 'Shakespeare', noun: 'play',
    ordered: false, items: PLAYS, bestKey: 'shakesBest',
    blurb: `Type all ${PLAYS.length} plays in any order. Short forms work: “Midsummer”, “Much Ado”, “Henry 5”.`,
    legendTitle: 'Play types', legend: PLAY_TYPES,
    notesHtml: `<h3>Good to know</h3><p class="muted small">The canon is 39 plays: the 36 in the First Folio, plus Pericles, The Two Noble Kinsmen, and Edward III. Play types are approximate — the late romances are often grouped with the comedies.</p>`,
    promptHtml: (cfg, st) => st.qz.found.size < cfg.items.length ? 'Type any Shakespeare play' : 'All of them!',
    studyHeading: 'Study list', resultsHeading: 'All plays',
});

// ---------------------------------------------------------------------------
// Study guide and flashcards
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
