# Study Hall

A quiet place to memorize the facts that trivia nights and quiz bowls ask for. Study a topic, then quiz yourself until it sticks.

Live: https://e18cheng.github.io/study-hall/

A single static page (`index.html`). Progress is saved in your browser's localStorage.

## Install and offline

Study Hall is a PWA. On iOS, open the site in Safari and choose **Share → Add to Home Screen**. On Chrome/Android, use the install prompt. The first visit caches the page, map data, libraries, and icons, so the app keeps working offline; progress stays in localStorage.

The libraries (`d3.min.js`, `topojson-client.min.js`) are checked in rather than loaded from a CDN so the app has no network dependency. The service worker lives in `sw.js`; bump `CACHE` there whenever a release changes any cached file, since an old worker keeps serving its cache until every tab using it is closed.

## Home page

Opening the bare URL shows a home page with a card for each topic, its one-line description, and any progress saved on this device. Choosing a topic writes its hash (`#world`, `#presidents`, or `#shakespeare`) to the URL, so a refresh keeps you on that topic; choosing **Home** in the menu (or the Study Hall brand in the header) removes the hash and returns to the picker. Deep links can be shared.

## Topics

The menu on the left switches between study topics:

- **World Geography** — study every country region by region: quiz it by clicking the map or typing the name, mark it as learned, then quiz all your learned regions together. Regions and territories are defined in `REGION_DEFS` / `TERR_DEFS` at the top of the script.
- **US Presidents** — type all 47 presidents in order, Sporcle-style. Surnames, full names, and common nicknames (`JFK`, `Ike`, `FDR`) all count, and near-miss typos are accepted. The list is defined in `PRESIDENT_DEFS`, where order in the array is the answer order. A study list shows every president with term years and party; best time is saved in localStorage.
- **Shakespeare** — a study guide for all 39 plays, plus typed-recall flashcards. Each play has its first performance, a handful of important characters, and a full plot summary. Mark plays as **memorized** in the guide to build a smaller quiz pool; the Play pool selector switches between all plays and memorized plays. Flashcards come in four modes: character → play, play → character, synopsis → play, and a balanced mix; a full round is 20 cards and accepts short forms and near-miss typos. Best scores are saved per mode and per pool, and only full 20-card rounds set a best. Missed cards can be reviewed. The canon is the 36 plays in the First Folio plus *Pericles*, *The Two Noble Kinsmen*, and *Edward III*. Guide content lives in `PLAY_GUIDE`, and the list itself in `PLAY_DEFS`. There is also a Sporcle-style drill: type all 39 plays in any order, with best time saved in localStorage.

Presidents and Shakespeare share one list-quiz engine. `LIST_MODULES` holds each module's items and labels, and `ordered: true` (presidents) advances one item at a time while unordered modules (Shakespeare) accept any remaining item. Adding another list topic means adding a definition and a `LIST_MODULES` entry, not another quiz implementation.

## Map data

`map-data.js` is generated from [Natural Earth](https://www.naturalearthdata.com/) 1:50m Admin 0 countries (public domain), currently v5.1.2. It uses internationally recognized borders rather than Natural Earth's de facto defaults: Crimea is part of Ukraine, and Western Sahara is shown in full.

To rebuild it (for example, after a new Natural Earth release), run the script with the release tag, then check the map and push:

```bash
scripts/build-map.sh v5.1.2
```

It needs `curl` and Node (`npx` fetches mapshaper on the fly; nothing is installed in the repo). After a new release, check that the overseas-territory splits (`SPLITS` in `index.html`) still pick up the right islands.
