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
