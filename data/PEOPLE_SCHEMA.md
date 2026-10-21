# People dataset schema

Each section file `data/people/<section>.json` is a JSON array of person objects.

```jsonc
{
  "id": "abraham",                 // kebab-case, unique. Use ANCHOR ids below for shared figures.
  "name": "Abraham",               // display name
  "aliases": ["Abram"],            // other names used IN THE TEXT (used for passage search)
  "gender": "m",                   // "m" | "f" | "u"
  "role": "Patriarch",             // short label: Patriarch, King of Judah, Prophet, Apostle, Judge, Priest, Matriarch...
  "era": "Patriarchs",             // one of ERAS below
  "summary": "2-4 sentences: who they are and what happens in their story.",
  "catholic": "3-6 sentences on how the Catholic Church reads this person: typology (how they prefigure Christ/Mary/the Church/sacraments), Catechism teaching, liturgical use, saints' feast if any. Cite CCC paragraph numbers ONLY when you are certain (e.g. 'CCC 145-146').",
  "know": ["3-5 short bullet facts a learner should know"],
  "feast": "October 9",            // optional: Roman Martyrology / calendar feast if they have one
  "keyPassages": ["gen 12:1-9", "gen 22:1-19", "heb 11:8-19"],   // 2-8 refs, book ids below, "c:v" or "c:v-v" or "c:v-c:v"
  "father": "terah",               // id or null
  "mother": null,                  // id or null
  "spouses": ["sarah", "hagar", "keturah"],
  "children": ["isaac", "ishmael"],
  "relations": [                   // non-family links, especially ones crossing books
    {"to": "melchizedek", "type": "blessed by", "ref": "gen 14:18-20"},
    {"to": "jesus", "type": "ancestor of", "ref": "mat 1:1"}
  ],
  "search": {                      // how to auto-find every verse that mentions them
    "names": ["Abraham", "Abram"], // exact whole-word strings to match (case-sensitive)
    "exclude": ["act 13:21"],      // optional verse refs to skip (a namesake in a scoped chapter)
    "books": null                  // null = whole Bible; or list of book ids / "book:c-c" chapter ranges
                                   // REQUIRED for ambiguous names (Joseph, Mary, John, Judas, James,
                                   // Simon, Zechariah, Azariah, Eleazar, Jonathan...) so mentions
                                   // of namesakes are not counted. e.g. ["gen:30-50","exo:1","exo:13","jos:24","act:7","heb:11"]
  }
}
```

Rules
- `father`/`mother`/`spouses`/`children` must reference ids. If the relative is not otherwise notable,
  STILL create a minimal entry for them (summary 1 sentence, catholic may be "").
- Relationships must be symmetric where you control both ends (if A lists B as child, B's father/mother is A).
- Include EVERY named person with a family link or a speaking/acting role in your books. Pure
  genealogy-list names: include them when they chain a lineage that matters (e.g. line of Seth → Noah,
  line of David → Jesus, Levites/priests line of Aaron → Zadok). Use judgement; aim high on coverage.
- Use the Catholic canon and Catholic naming (e.g. "Song of Songs", "Sirach", "Tobit"); the text
  is the World English Bible Catholic Edition — check names as they appear in it with the grep helper.
- Every ref in `keyPassages`/`relations` must exist; verify with the helper.
- Accuracy over volume. Do not invent CCC numbers, feasts, or relationships. Where tradition (not
  Scripture) supplies a fact (e.g. Joachim & Anne as Mary's parents), say "Tradition holds..." in text
  and you MAY add them as relatives with a relation `{"type":"by Tradition"}` note in `know`.

Book ids
gen exo lev num deu jos jdg rut 1sa 2sa 1ki 2ki 1ch 2ch ezr neh tob jdt est 1ma 2ma job psa pro ecc sng wis sir
isa jer lam bar ezk dan hos jol amo oba jon mic nam hab zep hag zec mal
mat mrk luk jhn act rom 1co 2co gal eph php col 1th 2th 1ti 2ti tit phm heb jas 1pe 2pe 1jn 2jn 3jn jud rev

ERAS
"Primeval" (Adam→Babel), "Patriarchs", "Exodus & Wilderness", "Conquest & Judges", "United Monarchy",
"Divided Kingdom", "Exile", "Return & Restoration", "Maccabean", "Life of Christ", "Apostolic Church"

Helper
`python3 /home/user/bible-project/scripts/grep_bible.py 'Melchizedek' [book ids...]` → prints matching refs + text.
`python3 /home/user/bible-project/scripts/grep_bible.py --ref 'gen 14:18-20'` → prints the passage (validates ref).
