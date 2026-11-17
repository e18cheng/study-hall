// App shell: router, topic picker, navigation, and boot.

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

