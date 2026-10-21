# Canonical ids for figures that cross sections

Use EXACTLY these ids when referring to these people. Only the "owner" section writes the full entry;
other sections just reference the id (in father/children/relations). If you need to add a family
link to an anchor you don't own, put it in your own person's entry (e.g. your person's `father`),
the merge step makes it symmetric.

| id | who | owner section |
|---|---|---|
| god | (not a person entry — do not reference) | — |
| adam, eve, cain, abel, seth, enoch, methuselah, lamech-sethite, noah, shem, ham, japheth | primeval | genesis |
| terah, abraham, sarah, hagar, ishmael, keturah, lot, melchizedek, isaac, rebekah, laban, esau, jacob, leah, rachel, bilhah, zilpah | patriarchs | genesis |
| reuben, simeon-son-of-jacob, levi, judah, dan, naphtali, gad, asher, issachar, zebulun, joseph-son-of-jacob, benjamin, dinah, tamar-wife-of-er, perez, zerah-son-of-judah, ephraim, manasseh-son-of-joseph, asenath | Jacob's family | genesis |
| amram, jochebed, moses, aaron, miriam, zipporah, jethro, joshua, caleb, eleazar-son-of-aaron, phinehas-son-of-eleazar, nadab-son-of-aaron, abihu, ithamar, korah, balaam, rahab, boaz, ruth, naomi, obed, jesse, gideon, deborah, samson, jephthah, othniel, ehud | exodus–ruth | torah-judges |
| hannah, elkanah, eli, samuel, saul, jonathan-son-of-saul, michal, david, bathsheba, uriah, nathan-prophet, nathan-son-of-david, solomon, absalom, amnon, tamar-daughter-of-david, adonijah, joab, abner, zadok, abiathar, rehoboam, jeroboam-i, elijah, elisha, ahab, jezebel, hezekiah, josiah, manasseh-king-of-judah, jehoiachin, zedekiah-king-of-judah, nebuchadnezzar, all kings of Israel & Judah | monarchy | kingdoms |
| zerubbabel, shealtiel, ezra, nehemiah, cyrus, tobit, tobias, sarah-wife-of-tobias, raphael-archangel, judith, holofernes, esther, mordecai, haman, ahasuerus, mattathias, judas-maccabeus, jonathan-maccabeus, simon-maccabeus, antiochus-iv, eleazar-scribe, maccabean-mother, job | return/deutero/wisdom | restoration |
| isaiah, jeremiah, baruch, ezekiel, daniel, susanna, shadrach, meshach, abednego, hosea, gomer, joel, amos, obadiah-prophet, jonah, micah, nahum, habakkuk, zephaniah, haggai, zechariah-prophet, malachi, gabriel-archangel, michael-archangel | prophets | prophets |
| jesus, mary-mother-of-jesus, joseph-husband-of-mary, joachim, anne-mother-of-mary, john-the-baptist, zechariah-father-of-john, elizabeth, peter, andrew, james-son-of-zebedee, john-apostle, zebedee, salome, philip-apostle, bartholomew, matthew, thomas, james-son-of-alphaeus, alphaeus, jude-thaddeus, simon-the-zealot, judas-iscariot, mary-magdalene, martha, mary-of-bethany, lazarus, nicodemus, joseph-of-arimathea, herod-the-great, herod-antipas, herodias, salome-daughter-of-herodias, pontius-pilate, caiaphas, annas, simeon-of-jerusalem, anna-prophetess, james-brother-of-the-lord, mary-of-clopas, clopas, cleopas | gospels | gospels |
| paul, barnabas, stephen, philip-the-evangelist, mark, luke, timothy, titus, silas, priscilla, aquila, apollos, cornelius, lydia, onesimus, philemon, gamaliel, ananias-of-damascus, ananias-and-sapphira→ ananias-husband-of-sapphira & sapphira, herod-agrippa-i, herod-agrippa-ii, felix, festus, lois, eunice, matthias | apostolic | apostolic |

Note: "jesus" entry is owned by gospels; every lineage section should link its people to `jesus`
with a relation `{"to":"jesus","type":"ancestor of","ref":"mat 1:..."}` where Matthew 1 / Luke 3 list them.
