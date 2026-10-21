# People data accuracy review

**Scope:** 183 entries: the top 150 people by mention count in `public/data/people.json`, plus the 33 other people whose `feast` field is filled in (53 entries have a feast in total).
**Fields checked:** `summary`, `catholic`, `know`, `feast`, `father`, `mother`, `spouses`, `children` and `relations`.
**Method:** Each entry was checked against the Bible text with `scripts/grep_bible.py`. This was done for every disputed or deuterocanonical verse reference: Esther additions, Tobit, Daniel 3, 2 Maccabees 12, Judith 15, Sirach 49 and others. CCC paragraphs, feast dates, lectionary assignments and doctrinal wording were checked against the reviewer's knowledge of the Catechism, the General Roman Calendar and the Roman Martyrology (2004).

## Results by category

| Category | Checked | Changed | Notes |
|---|---|---|---|
| CCC paragraph citations | 85 citations in 49 entries | 0 | Every cited paragraph matches its topic (for example 312 Joseph/providence, 1032 2 Macc 12, 2102 vows, 448 Thomas, 992 Maccabees, 1014 St Joseph/happy death). None were removed. |
| Feast dates (`feast` field) | 53 | 0 | All agree with the GRC or US calendar, or are correctly labelled as Roman Martyrology commemorations. |
| Feast/liturgy wording in prose | all | 3 | Elijah, Lazarus, Joachim |
| Doctrinal statements | all | 2 | James "brother of the Lord" (Council of Jerusalem), Mary Magdalene (who used the title) |
| Biblical facts | all | 4 | St Joseph's dreams, Abner, Cyrus, Asaph (psalm numbering) |
| Family links | all | 0 | No link contradicts Scripture. See the items for human confirmation below. |

**Total: 9 edits in 9 entries** (gospels.json 5, kingdoms.json 2, restoration.json 2). No edits were made to `genealogies.json` or `genealogy_links.json`. `public/data/people.json` was **not** rebuilt and needs `scripts/build_people.py` to be re-run.

## Change log

| Person (file) | Field | Before | After | Reason |
|---|---|---|---|---|
| James, "brother of the Lord" (gospels) | know | "...and presided at the Council of Jerusalem (Acts 15)." | "...and, after Peter spoke, gave the decisive judgment at the Council of Jerusalem (Acts 15:7-21)." | Acts 15 does not say James presided. Peter speaks first (15:7) and James gives the closing judgment (15:13-21). Calling it "presided" is an ecclesiologically loaded overstatement. |
| Mary Magdalene (gospels) | catholic | "the Fathers and St Thomas Aquinas call her 'Apostle of the Apostles'" | "Christian tradition - St Hippolytus called the myrrh-bearing women 'apostles to the apostles', and St Thomas Aquinas uses the title - honours her as 'Apostle of the Apostles'" | "The Fathers" overstated the patristic evidence. Hippolytus applies the phrase to the women as a group. The singular title is medieval (Rabanus Maurus, Aquinas), as noted in the 2016 CDW decree. |
| Joseph, husband of Mary (gospels) | know | "Receives four angelic messages in dreams in Matthew 1-2." | "Guided by four dreams in Matthew 1-2, three of them through an angel (Mt 1:20; 2:13, 19, 22)." | Mt 2:22 ("being warned in a dream") mentions no angel. |
| Lazarus (gospels) | catholic | "It is read on the Fifth Sunday of Lent for the scrutinies..." | "It is the Gospel of the Fifth Sunday of Lent in Year A, used for the third scrutiny..." | John 11 is the Year A Gospel, and in other years it is used where scrutinies are celebrated. The old wording implied every year. |
| Joachim (gospels) | catholic | "Pope Francis tied the World Day for Grandparents and the Elderly to their feast" | "Pope Francis instituted (2021) the World Day for Grandparents and the Elderly on the fourth Sunday of July, close to their feast" | The World Day falls on the 4th Sunday of July, not on July 26 itself. |
| Elijah (kingdoms) | catholic | "...his feast is July 20." | "...the Roman Martyrology commemorates him on July 20, which Carmelites keep as his feast." | July 20 is not in the General Roman Calendar. It is a Martyrology commemoration and a feast in the Carmelite proper. The `feast` field was kept. |
| Abner (kingdoms) | summary | "Abner son of Ner, Saul's cousin," | "Abner son of Ner, Saul's kinsman (his cousin according to 1 Sam 14:50-51)," | The texts disagree: 1 Sam 14:50-51 makes him Saul's cousin, but 1 Chr 9:36-39 can be read as making him Saul's uncle. The claim is now attributed to its source. |
| Cyrus (restoration) | catholic | "Cyrus is the only Gentile in Scripture called God's 'anointed'" | "Cyrus is the only Gentile ruler whom Scripture calls the LORD's 'anointed'" | Tightened, because Hazael is a Gentile whom Elijah is told to anoint (1 Kgs 19:15). Cyrus is the only one given the title "his anointed" (Isa 45:1). |
| Asaph (restoration) | catholic | "(one lower for Ps 10-147)" | "(for most psalms from 10 to 147, one number lower)" | The Greek/Latin numbering does not run uniformly one lower: Pss 114-116 and 147 split or merge differently. |

## Items for a priest or catechist to confirm

1. **Roman Martyrology dates.** These are believed to match the 2004 *Martyrologium Romanum* but could not be checked against the book itself: Abraham Oct 9; Moses Sept 4; Aaron July 1; Joshua **and Gideon** Sept 1 (Gideon is the least certain); Samuel Aug 20; David Dec 29; Elijah July 20; Elisha June 14; Daniel July 21; Job May 10; Zechariah and Elizabeth Sept 23; Joseph of Arimathea and Nicodemus Aug 31; Aquila and Priscilla July 8; Linus Sept 23; Holy Maccabees Aug 1.
2. **Salome as the mother of James and John** (the `mother` field of `james-son-of-zebedee` and `john-apostle`). This identification comes from comparing Mk 15:40 with Mt 27:56. It is traditional but not stated in Scripture. Consider labelling it "traditionally identified".
3. **Mary of Clopas as the mother of James "brother of the Lord"** (the `mother` field). This follows St Jerome's identification of "Mary the mother of James and Joses" (Mk 15:40) with "Mary of Clopas" (Jn 19:25). It is consistent with CCC 500 but is tradition, not an explicit text. Also confirm the wording that "the Church... generally identifies" James the brother of the Lord with James son of Alphaeus. That identification is the Western liturgical tradition, which gives them one feast on May 3, but it is not defined.
4. **Zeruiah's father is given as Jesse.** 1 Chr 2:16 calls Zeruiah and Abigail sisters of Jesse's sons. 2 Sam 17:25 calls Abigail "daughter of Nahash". The link is not contradicted outright, but it is uncertain.
5. **Joachim and Anne as Mary's parents.** These names come from Tradition (Protoevangelium of James), not Scripture, and the entries say so. Confirm that showing them as hard `father`/`mother` links in the family tree is acceptable.
6. **Typological claims attributed to "the Fathers".** Examples: Gideon's fleece and Ambrose; Samson as a type of Christ; Naboth as a type of Christ; Benjamin's "ravenous wolf" read as Paul (Tertullian); Esther and the Vulgate "non pro te" applied to the Immaculate Conception. These are believed to be correctly attributed but may need a patristics check if the site cites them as authorities.
7. **Pious traditions given as "Tradition holds".** Examples: Andrew's X-shaped cross; Luke painting icons of Mary; Bartholomew in India and Armenia; Thomas martyred near Chennai; Lazarus as bishop of Kition; the relics of the Holy Maccabees at San Pietro in Vincoli. They are worded as tradition, not fact. Confirm that this level of hedging is enough.
