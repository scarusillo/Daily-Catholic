# The Daily Catholic

Live site: https://scarusillo.github.io/Daily-Catholic/

Interactive map of every person in the Catholic Bible (73 books): family ties,
cross-book connections, every verse that names them, and Catholic teaching notes.
Website first; the static site is built to be wrapped as a mobile app later.

## Layout
- `data/raw/` — source texts: World English Bible, Catholic Edition (public domain) + WEB JSON used for validation
- `data/people/*.json` — curated people data, one file per section of the canon (schema: `data/PEOPLE_SCHEMA.md`, shared ids: `data/ANCHORS.md`)
- `scripts/parse_bible.py` — raw text → `public/data/bible.json` (35,413 verses, validated against reference verse counts)
- `scripts/build_people.py` — merges sections, dedupes ids, makes family links symmetric, finds every verse mentioning each person → `public/data/people.json`, `mentions.json`
- `scripts/grep_bible.py` — search / ref-validation helper
- `site/` — the website (vanilla JS + d3); `site/data` links to `public/data`

## Rebuild
    python3 scripts/parse_bible.py
    python3 scripts/build_people.py
    cd site && python3 -m http.server 8765

## v0.2 additions
- Today: liturgical day (General Roman Calendar, US), Sunday/holy-day readings with the people in them, biblical saints of the day, person of the day
- Play: Threads (word-path search), Lineage Links (four groups of four), Hidden Name (acrostic), Holy Land Tap (map), Daily Quiz (3 levels); streaks, share results, badges
- Journeys: 8 guided reading plans with progress
- Listen (text-to-speech), Suggest a correction (owner-only inbox), 1 Chronicles genealogies (1,811 people)
- `scripts/build_calendar.mjs`, `scripts/build_geo.mjs`, `scripts/build_web.py` (installable PWA in dist/), `app/` (Capacitor iOS/Android wrapper)
- Content review log: `data/REVIEW_LOG.md`

## v0.3 additions
- Daily Mass readings for every day 2026–2028 (Sundays, feasts and weekdays): `data/liturgy/*.json`, merged by `scripts/merge_readings.py`
- Saint of the Day (291 celebrations, English/Spanish): `data/saints.json`
- Pray: prayers (`scripts/build_prayers.mjs` from `data/vendor/`), guided Rosary and Divine Mercy Chaplet, Confession guide (`data/confession.json`), the Mass explained (`data/mass.json`)
- Five Loaves word game (`scripts/build_wordle.py`), Music, Sacraments, Find a Mass
- English/Spanish toggle (`site/i18n.js`); Scripture text and person profiles remain in English
- Daily reminder: calendar file on the web, local notification in the app build

## v0.4 additions
- Pilgrimage (original daily game); games restyled away from the NYT look
- Find Confession; My Parish pilot (`public/data/parishes/`, see `docs/` and the example parish)
- Our Promise, Privacy policy, Credits & licenses (About page); `site/config.js` for site URL, donation link, contact, reviewer
- Full Easter Vigil readings (`scripts/add_triduum.py`); offline-safe (d3 bundled in `site/vendor/`)
- Spanish: 517 Bible people (`scripts/merge_people_es.py`), quiz, Five Loaves (200 Spanish words)
- Five Loaves: 354 English answers
- AWS: `infra/` (Terraform: S3 + CloudFront + ACM + Route 53 + GitHub deploy role) and `.github/workflows/aws.yml`; steps in `DEPLOY.md`
- `docs/REVIEW_PACKET.md` (for the priest's review) and `docs/APP_STORE.md` (store listing)
