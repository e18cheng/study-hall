// One engine for fixed-answer lists. A topic supplies items and a few labels;
// ordered modules advance one item at a time, unordered modules accept any
// remaining item.

const LIST_MODULES = {};
const listState = {};

function addListModule(cfg) {
  LIST_MODULES[cfg.id] = cfg;
  const st = listState[cfg.id] = listState[cfg.id] || { view: 'home', qz: null, timer: null };
  if (cfg.modes) {
    const saved = cfg.modeStoreKey ? store[cfg.modeStoreKey] : null;
    st.mode = cfg.modes[saved] ? saved : cfg.defaultMode;
  }
  return cfg;
}

const listSt = cfg => listState[cfg.id];

// A module may offer several quiz modes over the same topic. Resolve the active
// mode into a normal config so the rest of the engine does not need to know.
function listCfg(base) {
  if (base.__resolved) return base;
  if (!base.modes) return base;
  const st = listState[base.id];
  const modeId = base.modes[st.mode] ? st.mode : base.defaultMode;
  return { ...base, ...base.modes[modeId], id: base.id, modeId, modes: base.modes, __resolved: true };
}

function listModeHtml(cfg) {
  if (!cfg.modes) return '';
  return `<h3>Quiz mode</h3><div class="modes">${Object.entries(cfg.modes).map(([id, m]) =>
    `<button class="mode${id === cfg.modeId ? ' on' : ''}" data-lmode="${id}">${esc(m.label)}</button>`).join('')}</div>`;
}

function listLegendHtml(cfg) {
  return `<h3>${esc(cfg.legendTitle)}</h3><ul class="llegend">${cfg.legend.map(g =>
    `<li><span class="ldot ${g.cls}"></span>${esc(g.name)}</li>`).join('')}</ul>`;
}

function listRow(cfg, item, i) {
  const st = listSt(cfg), qz = st.qz;
  const quiz = st.view === 'quiz' && qz;
  const sub = item.sub ? `<span class="lsub">${esc(item.sub)}</span>` : '';
  const extra = item.sub ? ' has-sub' : '';
  if (!quiz) {
    return `<li class="lrow done${extra}" title="${esc(item.tip)}"><span class="ln">${item.n}</span>
      <span class="ldot ${item.cls}"></span><span class="lname">${esc(item.name)}</span><span class="lmeta">${esc(item.meta)}</span>${sub}</li>`;
  }
  const done = cfg.ordered ? i < qz.i : qz.found.has(i);
  const cur = cfg.ordered && i === qz.i;
  if (!done) {
    return `<li class="lrow todo${cur ? ' cur' : ''}"><span class="ln">${item.n}</span><span class="lline"></span></li>`;
  }
  const miss = qz.revealed.has(i);
  return `<li class="lrow done${extra}${cur ? ' cur' : ''}${miss ? ' miss' : ''}" title="${esc(item.tip)}">
    <span class="ln">${item.n}</span><span class="ldot ${item.cls}"></span>
    <span class="lname">${esc(item.name)}</span><span class="lmeta">${esc(item.meta)}</span>${sub}</li>`;
}
const listRowsHtml = cfg => cfg.items.map((it, i) => listRow(cfg, it, i)).join('');
const itemAnswer = item => item.answer || item.name;

function listFb(html, cls) { const el = $('#lfb'); if (el) { el.innerHTML = html; el.className = 'fb ' + cls; } }
function shakeEl(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

function listHomeHtml(cfg) {
  const best = store[cfg.bestKey];
  return `<div class="pscroll"><div class="ptitle">
    <h1>${esc(cfg.title)}</h1>
    <p class="muted small">${cfg.blurb}</p>
    ${best ? `<p class="small">Your best: <b>${fmtTime(best.ms)}</b> · ${best.miss} revealed</p>` : ''}
  </div><div class="pbody">
    ${listModeHtml(cfg)}
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
    <form class="qform" autocomplete="off"><input id="lin" name="answer" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="${esc(cfg.placeholder || 'Type your answer…')}"><button class="btn primary">Check</button></form>
    <div class="qrow"><div class="tally" id="ltally"></div><button class="btn ghost" data-pact="reveal">Reveal</button></div>
  </div>`;
}

function listQuizMainHtml(cfg) {
  return `<div class="lmain"><ul class="lrows" id="llist">${listRowsHtml(cfg)}</ul></div>`;
}

function listResultsHtml(cfg) {
  const qz = listSt(cfg).qz, miss = qz.revealed.size, total = cfg.items.length;
  const done = cfg.doneLabel ? `All ${total} ${cfg.doneLabel} — done` : `All ${total} — done`;
  return `<div class="pscroll"><div class="ptitle">
    <h1>${done}</h1>
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

function renderList(base) {
  const cfg = listCfg(base);
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
  // Cross-quizzes opt out: a shared surname is fine when it is unique to this prompt.
  if (!cfg.allowSharedForms && cfg.items.some((x, j) => j !== idx && x.forms.includes(guess))) return { wrong: true };
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

function startList(base) {
  const cfg = listCfg(base);
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

function submitList(base) {
  const cfg = listCfg(base);
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
      listFb(`✓ ${esc(itemAnswer(item))}`, 'good');
      if (qz.i >= cfg.items.length) return finishList(cfg);
      updateListUI(cfg);
      inp.focus();
    } else {
      qz.wrong++;
      shakeEl(inp);
      inp.select();
      const item = cfg.items[qz.i], noun = cfg.noun || 'item';
      listFb(cfg.wrongHtml ? cfg.wrongHtml(item)
        : qz.wrong > 1 ? `✗ Still not ${noun} #${item.n}` : `✗ Not ${noun} #${item.n} — try again`, 'bad');
      updateListUI(cfg);
    }
    return;
  }

  const r = listMatchUnordered(cfg, guess, qz.found);
  if (r.idx !== undefined) {
    qz.found.add(r.idx);
    inp.value = '';
    listFb(`✓ ${esc(itemAnswer(cfg.items[r.idx]))}`, 'good');
    if (qz.found.size >= cfg.items.length) return finishList(cfg);
    updateListUI(cfg);
    inp.focus();
  } else if (r.already !== undefined) {
    listFb(`Already got <b>${esc(itemAnswer(cfg.items[r.already]))}</b>`, 'info');
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

function revealList(base) {
  const cfg = listCfg(base);
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
  listFb(cfg.revealHtml ? cfg.revealHtml(item)
    : cfg.ordered ? `#${item.n} was <b>${esc(itemAnswer(item))}</b>` : `<b>${esc(itemAnswer(item))}</b>`, 'bad');
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

function quitList(base) {
  const cfg = listCfg(base);
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
panel.addEventListener('click', e => {
  const b = e.target.closest('[data-lmode]');
  if (!b) return;
  const base = LIST_MODULES[activeList] || LIST_MODULES[document.body.dataset.app];
  if (!base?.modes) return;
  const st = listState[base.id];
  if (st.view !== 'home') return;
  const modeId = b.dataset.lmode;
  if (!base.modes[modeId] || st.mode === modeId) return;
  st.mode = modeId;
  st.qz = null;
  clearInterval(st.timer);
  if (base.modeStoreKey) { store[base.modeStoreKey] = modeId; save(); }
  renderList(base);
});
