# Country Drill

Learn every country region by region: study a region, quiz it (click on the map or type the name), mark it as learned, then quiz all your learned regions together.

Live: https://e18cheng.github.io/country-drill/

A single static page (`index.html`). Progress is saved in your browser's localStorage. Regions and territories are defined in `REGION_DEFS` / `TERR_DEFS` at the top of the script.

## Presidents

The switcher on the left opens a second study app: type all 47 US presidents in order, Sporcle-style. Surnames, full names, and common nicknames (`JFK`, `Ike`, `FDR`) all count, and near-miss typos are accepted. The list is defined in `PRESIDENT_DEFS`, where order in the array is the answer order. A study list shows every president with term years and party; best time is saved in localStorage.

## Map data

`map-data.js` is generated from [Natural Earth](https://www.naturalearthdata.com/) 1:50m Admin 0 countries (public domain), currently v5.1.2. It uses internationally recognized borders rather than Natural Earth's de facto defaults: Crimea is part of Ukraine, and Western Sahara is shown in full.

To rebuild it (for example, after a new Natural Earth release), run the script with the release tag, then check the map and push:

```bash
scripts/build-map.sh v5.1.2
```

It needs `curl` and Node (`npx` fetches mapshaper on the fly; nothing is installed in the repo). After a new release, check that the overseas-territory splits (`SPLITS` in `index.html`) still pick up the right islands.
