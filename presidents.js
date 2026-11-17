// US Presidents: derived items and the list module definition.

const PRES = PRESIDENT_DEFS.map(([name, years, party, aliases], i) => ({
  n: i + 1, name, meta: years, tip: party,
  cls: 'pty-' + party.toLowerCase().replace(/[^a-z]+/g, '-'),
  forms: [name, ...aliases.split('|')].filter(Boolean).map(norm),
}));
const PARTIES = [...new Set(PRES.map(p => p.tip))].map(name => ({
  name, cls: 'pty-' + name.toLowerCase().replace(/[^a-z]+/g, '-'),
}));

addListModule({
    id: 'presidents', label: 'Presidents', title: 'US Presidents', noun: 'president',
    ordered: true, items: PRES, bestKey: 'presBest',
    blurb: `Type all ${PRES.length} presidents in order. A surname is enough; full names and common nicknames work too.`,
    legendTitle: 'Party key', legend: PARTIES,
    notesHtml: `<h3>Good to know</h3><p class="muted small">${PRES.length} presidencies, ${new Set(PRES.map(p => p.name)).size} people — Cleveland and Trump each served two non-consecutive terms.</p>`,
    promptHtml: (cfg, st) => st.qz.i < cfg.items.length ? `Type president <b>#${cfg.items[st.qz.i].n}</b>` : 'All of them!',
    studyHeading: 'Study list', resultsHeading: 'All presidents',
});
