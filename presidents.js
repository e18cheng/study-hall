// US Presidents: derived items, vice presidents, and list quiz modes.

const VP_BY_NAME = new Map(VICE_PRESIDENT_DEFS.map(([name, years, party, aliases], i) => [name, {
  n: i + 1, name, meta: years, tip: party,
  cls: 'pty-' + party.toLowerCase().replace(/[^a-z]+/g, '-'),
  forms: [name, ...aliases.split('|')].filter(Boolean).map(norm),
  presidents: [],
}]));

const PRES = PRESIDENT_DEFS.map(([name, years, party, aliases, vps = []], i) => {
  const item = {
    n: i + 1, name, meta: years, tip: party,
    cls: 'pty-' + party.toLowerCase().replace(/[^a-z]+/g, '-'),
    forms: [name, ...aliases.split('|')].filter(Boolean).map(norm),
    vps: [],
  };
  for (const vpName of vps) {
    const vp = VP_BY_NAME.get(vpName);
    if (!vp) { console.warn('Unknown vice president:', vpName); continue; }
    if (!vp.presidents.includes(name)) vp.presidents.push(name);
    item.vps.push(vp);
  }
  item.sub = item.vps.length ? `VP: ${item.vps.map(v => v.name).join(' / ')}` : 'VP: office vacant';
  return item;
});

const VPS = [...VP_BY_NAME.values()];
for (const vp of VPS) vp.sub = `President: ${vp.presidents.join(' / ') || 'unknown'}`;

const missingVps = VPS.filter(vp => !vp.presidents.length).map(vp => vp.name);
if (missingVps.length) console.warn('Vice presidents with no president:', missingVps);

const PARTIES = [...new Set([...PRES, ...VPS].map(p => p.tip))].map(name => ({
  name, cls: 'pty-' + name.toLowerCase().replace(/[^a-z]+/g, '-'),
}));

const unionForms = items => [...new Set(items.flatMap(x => x.forms))];
const vpNames = item => item.vps.map(v => v.name).join(' / ');
const presNames = vp => vp.presidents.join(' / ');
// Cleveland and Trump each appear twice; add the term so their VP prompts differ.
const PRES_TERMS = PRES.reduce((m, p) => m.set(p.name, (m.get(p.name) || 0) + 1), new Map());
const presLabel = p => PRES_TERMS.get(p.name) > 1 ? `${p.name} (${p.meta})` : p.name;

// President -> vice president: accept any VP who served under that president.
const PRES_VP = PRES.filter(p => p.vps.length).map(p => ({
  ...p,
  forms: unionForms(p.vps),
  answer: vpNames(p),
}));

// Vice president -> president: accept any president that VP served under.
const VP_PRES = VPS.map(vp => ({
  ...vp,
  forms: unionForms(vp.presidents.map(name => PRES.find(p => p.name === name)).filter(Boolean)),
  answer: presNames(vp),
}));

const VP_NOTES = `<h3>Good to know</h3><p class="muted small">${PRES.length} presidencies and ${VPS.length} vice presidents. Cleveland and Trump each had different vice presidents in their two terms; Lincoln and FDR had more than one. Presidencies with no vice president are marked in the president list and skipped in the president → VP quiz. Parties are approximate.</p>`;

addListModule({
  id: 'presidents',
  label: 'Presidents',
  defaultMode: 'order',
  modeStoreKey: 'presMode',
  modes: {
    order: {
      label: 'Presidents in order',
      title: 'US Presidents',
      noun: 'president',
      items: PRES,
      ordered: true,
      bestKey: 'presBest',
      blurb: `Type all ${PRES.length} presidents in order. A surname is enough; full names and common nicknames work too.`,
      legendTitle: 'Party key', legend: PARTIES,
      notesHtml: VP_NOTES,
      promptHtml: (cfg, st) => st.qz.i < cfg.items.length ? `Type president <b>#${cfg.items[st.qz.i].n}</b>` : 'All of them!',
      placeholder: 'Type a president…',
      studyHeading: 'Presidents and vice presidents',
      resultsHeading: 'All presidents',
    },
    presVp: {
      label: 'President → VP',
      title: 'Presidents → Vice Presidents',
      noun: 'vice president',
      items: PRES_VP,
      ordered: true,
      bestKey: 'presVpBest',
      allowSharedForms: true,
      blurb: 'Type the vice president for each presidency in order. If a president had more than one, any of them counts.',
      legendTitle: 'Party key', legend: PARTIES,
      notesHtml: VP_NOTES,
      promptHtml: (cfg, st) => st.qz.i < cfg.items.length ? `Who was vice president under <b>${esc(presLabel(cfg.items[st.qz.i]))}</b>?` : 'All of them!',
      wrongHtml: item => `✗ Not the vice president for <b>${esc(presLabel(item))}</b> — try again`,
      revealHtml: item => `The vice president for <b>${esc(presLabel(item))}</b> was <b>${esc(itemAnswer(item))}</b>`,
      placeholder: 'Type a vice president…',
      studyHeading: 'Presidents and their vice presidents',
      resultsHeading: 'All presidencies',
      doneLabel: 'presidencies',
    },
    vpPres: {
      label: 'VP → President',
      title: 'Vice Presidents → Presidents',
      noun: 'president',
      items: VP_PRES,
      ordered: true,
      bestKey: 'vpPresBest',
      allowSharedForms: true,
      blurb: 'Type a president each vice president served under. If they served more than one, any of them counts.',
      legendTitle: 'Party key', legend: PARTIES,
      notesHtml: VP_NOTES,
      promptHtml: (cfg, st) => st.qz.i < cfg.items.length ? `Which president did <b>${esc(cfg.items[st.qz.i].name)}</b> serve under?` : 'All of them!',
      wrongHtml: item => `✗ Not a president <b>${esc(item.name)}</b> served under — try again`,
      revealHtml: item => `<b>${esc(item.name)}</b> served under <b>${esc(itemAnswer(item))}</b>`,
      placeholder: 'Type a president…',
      studyHeading: 'Vice presidents and their presidents',
      resultsHeading: 'All vice presidents',
      doneLabel: 'vice presidents',
    },
    vpOrder: {
      label: 'VPs in order',
      title: 'US Vice Presidents',
      noun: 'vice president',
      items: VPS,
      ordered: true,
      bestKey: 'vpBest',
      blurb: `Type all ${VPS.length} vice presidents in order. A surname is enough; full names work too.`,
      legendTitle: 'Party key', legend: PARTIES,
      notesHtml: VP_NOTES,
      promptHtml: (cfg, st) => st.qz.i < cfg.items.length ? `Type vice president <b>#${cfg.items[st.qz.i].n}</b>` : 'All of them!',
      placeholder: 'Type a vice president…',
      studyHeading: 'Vice presidents and their presidents',
      resultsHeading: 'All vice presidents',
      doneLabel: 'vice presidents',
    },
  },
});
