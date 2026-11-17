# Study Hall

A quiet place to memorize the facts that trivia nights and quiz bowls ask for. Study a topic, then quiz yourself until it sticks.

Live: https://e18cheng.github.io/study-hall/

A static, no-build site: `index.html` is a thin shell, `app.js` owns the router, shared state lives in `core.js`, and each topic lives in its own script. Progress is saved in your browser's localStorage.

## Install and offline

Study Hall is a PWA. On iOS, open the site in Safari and choose **Share → Add to Home Screen**. On Chrome/Android, use the install prompt. The first visit caches the page, data files, libraries, and icons, so the app keeps working offline; progress stays in localStorage.

The libraries (`d3.min.js`, `topojson-client.min.js`) are checked in rather than loaded from a CDN so the app has no network dependency. The service worker lives in `sw.js`; bump `CACHE` there whenever a release changes any cached file, since an old worker keeps serving its cache until every tab using it is closed.

## Files

- `index.html` — the shell: header, nav, map container, and script tags.
- `styles.css` — all styles.
- `core.js` — shared state, persistence, the `SH` registry, and small helpers.
- `map.js` — World Geography: map setup, study list, and map/capital quizzes.
- `list.js` — the generic fixed-answer list engine.
- `presidents.js`, `shakespeare.js` — list topics, plus Shakespeare's guide and flashcards.
- `elements.js`, `wars.js` — topic modules that register themselves with `SH`.
- `app.js` — router, topic picker, navigation, boot, and the service-worker hook.
- `countries-data.js`, `presidents-data.js`, `shakespeare-data.js`, `elements-data.js`, `wars-data.js`, `map-data.js` — datasets loaded before the code.
- `sw.js`, `manifest.webmanifest` — offline support and install metadata.

Scripts are classic (non-module) and share the global scope; load order matters: data files, then `core.js`, then topic files, then `app.js` last.

## Home page

Opening the bare URL shows a home page with a card for each topic, its one-line description, and any progress saved on this device. Choosing a topic writes its hash (`#world`, `#presidents`, `#shakespeare`, `#elements`, or `#wars`) to the URL, so a refresh keeps you on that topic; choosing **Home** in the menu (or the Study Hall brand in the header) removes the hash and returns to the picker. Deep links can be shared.

## Topics

The menu on the left switches between study topics:

- **World Geography** — study every country region by region: quiz it by clicking the map or typing the name, mark it as learned, then quiz all your learned regions together. Study mode can also show each country's capital, and two typing quizzes cover **country → capital** and **capital → country**. Capitals cover sovereign countries only (territories are excluded) and live in `CAPITAL_DEFS`, keyed by ISO code; the first form is the answer shown and every form is accepted. Capital progress is saved separately from country progress. Regions and territories are defined in `REGION_DEFS` / `TERR_DEFS` at the top of `countries-data.js`.
- **US Presidents** — four quiz modes on one topic. **Presidents in order** asks for all 47 presidencies Sporcle-style; surnames, full names, and common nicknames (`JFK`, `Ike`, `FDR`) all count, and near-miss typos are accepted. **President → VP** asks for the vice president of each presidency (the four with no vice president are skipped), and **VP → President** asks which president each of the 50 vice presidents served under. When a president had several vice presidents, or a vice president served several presidents, any valid answer counts. **VPs in order** asks for all 50 vice presidents in order. The study list shows presidents with their vice presidents, or vice presidents with their presidents, and each mode keeps its own best time. The list is defined in `PRESIDENT_DEFS`, where order in the array is the answer order and the fifth field lists each presidency's vice presidents; `VICE_PRESIDENT_DEFS` holds the canonical vice presidential order.
- **Shakespeare** — a study guide for all 39 plays, plus typed-recall flashcards. Each play has its first performance, a handful of important characters, and a full plot summary. Mark plays as **memorized** in the guide to build a smaller quiz pool; the Play pool selector switches between all plays and memorized plays. Flashcards come in four modes: character → play, play → character, synopsis → play, and a balanced mix; a full round is 20 cards and accepts short forms and near-miss typos. Best scores are saved per mode and per pool, and only full 20-card rounds set a best. Missed cards can be reviewed. The canon is the 36 plays in the First Folio plus *Pericles*, *The Two Noble Kinsmen*, and *Edward III*. Guide content lives in `PLAY_GUIDE`, and the list itself in `PLAY_DEFS`. There is also a Sporcle-style drill: type all 39 plays in any order, with best time saved in localStorage.
- **Periodic Table** — all 118 elements laid out as a real 18-column table, with the lanthanides and actinides on their own rows below. Tiles are colored by category and show the atomic number, symbol, and (when the table is wide enough) the name; tapping a tile opens a study card with mass, period, group, block, and electron configuration. Three quizzes cover **symbol → name**, **name → symbol**, and **find the element** (click it on the table). Pools are All, First 20, Common 40, Metals, Nonmetals, Noble gases, and Metalloids. The quiz engine reuses the three-try, hint, reveal, retry-missed, and best-score patterns from the other topics, with progress saved separately from countries, presidents, and Shakespeare. The dataset is `elements-data.js`; table colors and layout live in the elements CSS and `elemTableHtml` in `elements.js`.
- **US Wars** — a study timeline of America's major conflicts, grouped by era. Each card shows the years, opponent, president(s), outcome, and a short summary. Pools are **Core 12** (the major wars) and **All conflicts** (Core 12 plus the French and Indian, Northwest Indian, Barbary, Philippine–American, and Cold War). Four quizzes cover **war → years**, **years → war**, **war → president**, and **war → opponent**; the president quiz accepts any president who served during that war, not just the first, and the opponent quiz accepts aliases. The quiz engine reuses the three-try, hint, reveal, retry-missed, and best-score patterns, with progress saved separately from every other topic. The dataset is `wars-data.js`; the timeline and quiz engine live in `wars.js`.

Presidents and Shakespeare share one list-quiz engine. `LIST_MODULES` holds each module's items and labels, and `ordered: true` advances one item at a time while unordered modules accept any remaining item. A module can also define `modes` (Presidents has four); the engine resolves the selected mode into a normal config, so each mode supplies its own items, prompt, study heading, and best-score key without a separate quiz implementation. Adding another list topic means adding a definition and a `LIST_MODULES` entry.

## Map data

`map-data.js` is generated from [Natural Earth](https://www.naturalearthdata.com/) 1:50m Admin 0 countries (public domain), currently v5.1.2. It uses internationally recognized borders rather than Natural Earth's de facto defaults: Crimea is part of Ukraine, and Western Sahara is shown in full.

To rebuild it (for example, after a new Natural Earth release), run the script with the release tag, then check the map and push:

```bash
scripts/build-map.sh v5.1.2
```

It needs `curl` and Node (`npx` fetches mapshaper on the fly; nothing is installed in the repo). After a new release, check that the overseas-territory splits (`SPLITS` in `countries-data.js`) still pick up the right islands.

## Element data

`elements-data.js` is derived from [Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON) by Bowserinator, licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). It is trimmed to elements 1–118 and reduced to the fields Study Hall uses: number, symbol, name, mass, category, period, group, grid position, block, and electron configuration. Element names use the dataset's spellings (for example *aluminium*, *caesium*, *sulfur*); the quizzes also accept the common variants *aluminum*, *cesium*, and *sulphur*.

## War data

`wars-data.js` is a small curated dataset, not a generated one. Dates are years of US involvement rather than the full span of each conflict; Vietnam, for example, is labeled **1965–1973** with a note that the wider war ran 1955–1975. `presidents` lists everyone who served during that involvement, and the president quiz accepts any of them. The Cold War appears only in the **All conflicts** pool and is labeled a strategic conflict rather than a shooting war. `core: true` marks the Core 12; the remaining entries join them in All conflicts.
