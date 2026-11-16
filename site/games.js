/* Daily games: Threads (word-path search), Lineage Links (group four), Hidden Name (acrostic),
   Holy Land Tap (map). Everything is seeded by the local date so everyone gets the same puzzle. */
(() => {
  "use strict";
  const C = () => window.BPM; // shared context from app.js
  const SITE = window.BPM_CONFIG?.siteUrl || "https://scarusillo.github.io/Daily-Catholic/";
  const X = (en, es) => (window.I18N?.lang === "es" ? es : en);
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- seeded helpers ---------- */
  function seedOf(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  // compare names without accents or case: "Moises" matches "Moisés"
  const plain = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  function shuffle(R, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dayIndex = (dk) => Math.floor((Date.parse(dk) - Date.parse("2026-10-20")) / 864e5);
  const dayNumber = () => dayIndex(dayKey()) + 1;
  // whole-name match that also works for accented names, where \b fails ("Moisés", "José"),
  // and whether or not the text carries the accents ("Simon" also finds "Simón")
  const LET = "A-Za-zÀ-ÖØ-öø-ÿ";
  const ACC = { a: "[aáàâä]", e: "[eéèêë]", i: "[iíìîï]", o: "[oóòôö]", u: "[uúùûü]", n: "[nñ]" };
  const nameRe = (n) => new RegExp(`(^|[^${LET}])${plain(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[aeioun]/g, (c) => ACC[c])}(?![${LET}])`, "gi");
  const maskNames = (names, t) => names.filter(Boolean).sort((a, b) => b.length - a.length).reduce((acc, n) => acc.replace(nameRe(n), "$1▢▢▢"), String(t ?? ""));

  /* ---------- stats / streaks ---------- */
  function stats(game) { const s = C().store.get(`bpm.g.${game}`, null); return s && s.days && typeof s.days === "object" ? s : { days: {} }; }
  // a result belongs to the day of the puzzle it was earned on (dk), and is written once
  function record(game, result, dk = dayKey()) {
    const s = stats(game);
    if (s.days[dk]) return;
    s.days[dk] = result;
    C().store.set(`bpm.g.${game}`, s);
    window.BPM_HABIT?.mark("game", dk); // any finished game also earns the day in the app-wide streak
  }
  // a streak stays alive until a whole day is missed, so before today's game it still counts through yesterday
  function streak(game) {
    const s = stats(game), d = new Date();
    let n = 0;
    if (!s.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    for (; s.days[dayKey(d)]; d.setDate(d.getDate() - 1)) n++;
    return n;
  }
  const playedToday = (game) => !!stats(game).days[dayKey()];
  const streakText = (game) => { const n = streak(game); return `${X("Streak", "Racha")}: ${n} ${X(n === 1 ? "day" : "days", n === 1 ? "día" : "días")}`; };
  // one day's saved progress; a damaged save starts fresh instead of breaking the game
  function load(key, fresh) { const v = C().store.get(key, null); return v && typeof v === "object" && !Array.isArray(v) ? { ...fresh, ...v } : fresh; }
  // per-day progress is only needed for a short while; old days are cleared so storage never fills up
  function prune() {
    try {
      const cut = new Date(); cut.setDate(cut.getDate() - 14);
      for (const k of Object.keys(localStorage)) { const m = /^bpm\.(threads|links|acrostic|tap|loaves|pilgrim)\.(?:es\.)?(\d{4}-\d\d-\d\d)$/.exec(k); if (m && m[2] < dayKey(cut)) localStorage.removeItem(k); }
    } catch { /* storage unavailable */ }
  }

  // a picture card through the phone's share sheet where it can take one; otherwise the text, copied as before
  const share = (text, btn, card) => window.BPM_HABIT.share(text, btn, card);
  const cardSub = (dk) => `#${dayIndex(dk) + 1} · ${new Date(dk + "T12:00").toLocaleDateString(window.I18N?.locale(), { month: "long", day: "numeric", year: "numeric" })}`;

  let THEMES = null, PLACES = null, PLACES_ES = null, GEO = null, threadsAbort = null;
  let THEMES_ES = null;
  // Spanish place names, notes and questions (places_es.json) are laid over the English data for display only,
  // field by field; which place and which event is picked never depends on the language
  const esPlace = (pl) => { const o = window.I18N?.lang === "es" && PLACES_ES?.[pl.id]; return o ? { ...pl, name: o.name || pl.name, note: o.note || pl.note } : pl; };
  const esEvent = (pl, ev) => { const q = window.I18N?.lang === "es" && PLACES_ES?.[pl.id]?.events?.[pl.events.indexOf(ev)]; return q ? { ...ev, q } : ev; };
  async function places() {
    [PLACES, GEO] = await Promise.all([PLACES || C().getJSON("data/places.json"), GEO || C().getJSON("data/geo.json")]);
    if (window.I18N?.lang === "es") PLACES_ES ??= await C().getJSON("data/places_es.json").catch(() => ({}));
  }
  async function themes() {
    THEMES ??= await C().getJSON("data/themes.json");
    if (window.I18N?.lang === "es") THEMES_ES ??= await C().getJSON("data/themes_es.json").catch(() => ({}));
    return THEMES;
  }
  // theme text in the current language (the hidden words themselves stay as in the English Bible text)
  const tx = (t, f) => (window.I18N?.lang === "es" && THEMES_ES?.[t.id]?.[f]) || t[f] || "";

  /* =====================================================================
     THREADS — find the theme words hidden as letter paths; the golden thread
     names the theme and touches two opposite sides of the grid.
     ===================================================================== */
  // boards the theme words may fill, roomiest first: [rows, columns]
  const SHAPES = [[7, 7], [6, 7], [8, 6], [6, 6], [5, 7], [5, 6], [8, 5]];
  function hamiltonPath(R, rows, cols) {
    // random Hamiltonian path on a rows×cols grid via backbite moves, worked in place
    const N = rows * cols, path = new Array(N), pos = new Array(N);
    for (let r = 0, k = 0; r < rows; r++) for (let c = 0; c < cols; c++, k++) { const x = r * cols + (r % 2 ? cols - 1 - c : c); path[k] = x; pos[x] = k; }
    const flip = (a, b) => { for (; a < b; a++, b--) { const t = path[a]; path[a] = path[b]; path[b] = t; pos[path[a]] = a; pos[path[b]] = b; } };
    const nb = [];
    for (let it = 0; it < N * 24; it++) {
      const head = R() < 0.5, end = path[head ? 0 : N - 1], prev = path[head ? 1 : N - 2];
      const r = Math.floor(end / cols), c = end % cols;
      nb.length = 0;
      if (r && end - cols !== prev) nb.push(end - cols);
      if (r < rows - 1 && end + cols !== prev) nb.push(end + cols);
      if (c && end - 1 !== prev) nb.push(end - 1);
      if (c < cols - 1 && end + 1 !== prev) nb.push(end + 1);
      const i = pos[pick(R, nb)];
      // turn the stretch between the end and its chosen neighbour around, so the path stays Hamiltonian
      if (head) flip(0, i - 1); else flip(i + 1, N - 1);
    }
    return path;
  }
  function subsetSum(R, words, spLen, target) {
    const idx = shuffle(R, words.map((_, i) => i));
    for (let mask = (1 << idx.length) - 1; mask > 0; mask--) {
      const chosen = idx.filter((_, k) => mask & (1 << k));
      if (chosen.length < 3) continue;
      if (chosen.reduce((a, i) => a + words[i].w.length, 0) + spLen === target) return chosen.map((i) => words[i]);
    }
    return null;
  }
  // every theme that fills one of the boards, in a fixed shuffled rotation: no theme returns until all have had a day
  let THREAD_ORDER = null;
  const shapesFor = (t) => SHAPES.filter(([rows, cols]) => t.spangram.length > Math.min(rows, cols) && subsetSum(rng(1), t.words, t.spangram.length, rows * cols));
  function threadOrder() {
    return (THREAD_ORDER ??= shuffle(rng(seedOf("threads-rotation-v1")), THEMES.filter((t) => t.words.length <= 12 && shapesFor(t).length)));
  }
  function buildThreads(dk) {
    const R = rng(seedOf("threads" + dk));
    const order = threadOrder(), n = order.length, at = ((dayIndex(dk) % n) + n) % n;
    for (let step = 0; step < n; step++) {
      const t = order[(at + step) % n];
      for (const [rows, cols] of shapesFor(t)) {
        const words = subsetSum(R, t.words, t.spangram.length, rows * cols);
        for (let attempt = 0, path; attempt < 240; attempt++) {
          // a fresh path every few tries; in between, only the order of the words along it changes
          if (attempt % 6 === 0) path = hamiltonPath(R, rows, cols);
          const items = shuffle(R, [...words.map((w) => ({ ...w, span: false })), { w: t.spangram, span: true }]);
          let k = 0;
          const placed = items.map((it) => { const cells = path.slice(k, k + it.w.length); k += it.w.length; return { ...it, cells }; });
          const sp = placed.find((p) => p.span);
          const rs = sp.cells.map((x) => Math.floor(x / cols)), cs = sp.cells.map((x) => x % cols);
          const spans = (Math.min(...cs) === 0 && Math.max(...cs) === cols - 1) || (Math.min(...rs) === 0 && Math.max(...rs) === rows - 1);
          if (!spans) continue;
          const grid = new Array(rows * cols);
          for (const p of placed) { if (R() < 0.5) p.cells.reverse(); p.cells.forEach((x, i) => (grid[x] = p.w[i])); }
          return { theme: t, rows, cols, grid, placed };
        }
      }
    }
    return null;
  }
  function renderThreads(root) {
    const dk = dayKey();
    const pz = buildThreads(dk);
    if (!pz) { root.innerHTML = `<p class="loading">${X("Today's puzzle could not be built. Try again tomorrow.", "No se pudo crear el juego de hoy. Vuelve mañana.")}</p>`; return; }
    const COLS = pz.cols, key = `bpm.threads.${dk}`;
    const fresh = () => ({ found: [], hints: 0, log: [], hinted: null });
    let st = load(key, fresh());
    // progress saved for a different board (the puzzle data changed) cannot be shown on this one
    const byWord = new Map(pz.placed.map((p) => [p.w, p]));
    if (!Array.isArray(st.found) || !Array.isArray(st.log) || st.found.some((w) => !byWord.has(w)) || new Set(st.found).size !== st.found.length || (st.hinted && !byWord.has(st.hinted))) st = fresh();
    const save = () => C().store.set(key, st);
    let sel = [];
    const adj = (a, b) => Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) <= 1 && Math.abs((a % COLS) - (b % COLS)) <= 1 && a !== b;
    const total = pz.placed.length;
    root.innerHTML = `
      <div class="game">
        <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Threads</h1><span class="qmeta">#${dayNumber()}</span></div>
        <div class="tclue"><span class="eyebrow">${X("Today's theme", "Tema de hoy")}</span><b>${esc(tx(pz.theme, "clue") || tx(pz.theme, "title"))}</b></div>
        <p class="qmeta" id="tprog" aria-live="polite"></p>
        <div class="tgrid-wrap" style="width:min(100%,${COLS * 54}px)"><svg class="tlines" id="tlines" aria-hidden="true"></svg><div class="tgrid" id="tgrid" role="group" aria-label="${X("Letter board", "Tablero de letras")}" style="grid-template-columns:repeat(${COLS},1fr);grid-template-rows:repeat(${pz.rows},1fr)">${pz.grid.map((ch, i) => `<button class="tcell" data-i="${i}" aria-label="${ch}">${ch}</button>`).join("")}</div></div>
        <div class="tword" id="tword" aria-live="polite">&nbsp;</div>
        <div class="gbtns"><button id="thint" class="ghost">${X("Hint", "Pista")}</button><button id="tclear" class="ghost">${X("Clear", "Borrar")}</button></div>
        <div id="tdone"></div>
        <p class="gfoot">${X("Drag across touching letters (any direction, diagonals too), or tap letters one by one and tap the last letter again to submit. Every letter belongs to exactly one word. The <b>golden thread</b> names the theme and runs from one edge of the board to the opposite edge.", "Arrastra el dedo por letras que se tocan (en cualquier dirección, también en diagonal), o toca las letras una a una y toca de nuevo la última para enviar. Cada letra pertenece a una sola palabra. El <b>hilo de oro</b> nombra el tema y va de un borde del tablero al borde opuesto. Las palabras están en inglés, como en el texto bíblico.")}</p>
      </div>`;
    const cells = [...root.querySelectorAll(".tcell")];
    const svg = $("#tlines", root);
    function center(i) { const el = cells[i], g = $("#tgrid", root).getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - g.left + r.width / 2, r.top - g.top + r.height / 2]; }
    const over = () => st.found.length === total;
    function draw() {
      if (!$("#tgrid", root)) return; // navigated away
      const foundCells = new Map();
      for (const w of st.found) { const p = byWord.get(w); p.cells.forEach((c) => foundCells.set(c, p.span ? "span" : "found")); }
      const hintP = st.hinted && !st.found.includes(st.hinted) ? byWord.get(st.hinted) : null;
      cells.forEach((el, i) => {
        const f = foundCells.get(i), on = sel.includes(i);
        el.className = "tcell" + (f ? " " + f : "") + (on ? " sel" : "") + (hintP?.cells.includes(i) ? " hinted" : "");
        el.setAttribute("aria-label", pz.grid[i] + (f ? `, ${X("found", "encontrada")}` : on ? `, ${X("selected", "seleccionada")}` : ""));
        el.disabled = !!f;
      });
      const g = $("#tgrid", root).getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${g.width} ${g.height}`);
      let lines = "";
      const seg = (arr, cls) => { for (let k = 1; k < arr.length; k++) { const [x1, y1] = center(arr[k - 1]), [x2, y2] = center(arr[k]); lines += `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; } };
      for (const w of st.found) { const p = byWord.get(w); seg(p.cells, p.span ? "ls" : "lf"); }
      seg(sel, "lsel");
      svg.innerHTML = lines;
      $("#tword", root).textContent = sel.map((i) => pz.grid[i]).join("") || " ";
      $("#tprog", root).textContent = X(`${st.found.length} of ${total} theme words found`, `${st.found.length} de ${total} palabras encontradas`) + (st.hints ? ` · ${st.hints} ${X(st.hints > 1 ? "hints" : "hint", st.hints > 1 ? "pistas" : "pista")}` : "");
      $("#thint", root).disabled = over() || !!hintP;
      $("#tclear", root).disabled = !sel.length;
      if (over()) finish();
    }
    function submit() {
      if (sel.length < 3) { sel = []; draw(); return; }
      const word = sel.map((i) => pz.grid[i]).join("");
      // the word counts however it was traced: a repeated letter next door is as good as the one we laid down
      const hit = byWord.get(word);
      if (hit && !st.found.includes(word)) {
        st.found.push(hit.w); st.log.push(hit.span ? "S" : "W"); save();
        sel = []; draw();
        $("#tword", root).textContent = word;
        flash(hit.span ? X("Golden thread!", "¡Hilo de oro!") : X("Found", "¡Encontrada!"));
      } else {
        sel = []; draw(); flash(hit ? X("Already found", "Ya la encontraste") : X("Not a theme word", "No es una palabra del tema"));
      }
    }
    function flash(t) { const el = $("#tword", root); el.dataset.msg = t; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
    let down = false, moved = false, tapSubmit = false, lastPointer = -1e9;
    threadsAbort?.abort(); threadsAbort = new AbortController();
    const sig = { signal: threadsAbort.signal };
    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y)?.closest(".tcell"); return el && root.contains(el) ? +el.dataset.i : null; };
    const used = (i) => st.found.some((w) => byWord.get(w).cells.includes(i));
    // one tap: start, extend, or (on the last letter again) submit
    function tap(i) {
      const again = sel.length > 1 && sel[sel.length - 1] === i;
      if (!again) { if (sel.length && adj(sel[sel.length - 1], i) && !sel.includes(i)) sel.push(i); else sel = [i]; }
      draw();
      return again;
    }
    $("#tgrid", root).addEventListener("pointerdown", (e) => {
      if (!e.isPrimary || e.button) return;
      lastPointer = e.timeStamp;
      const i = cellAt(e.clientX, e.clientY); if (i == null || used(i)) return;
      e.preventDefault(); down = true; moved = false;
      tapSubmit = tap(i);
    });
    // keyboard and screen-reader activation arrives as a click with no pointer behind it
    // (a finger's click follows its pointer events, which have already done the work)
    $("#tgrid", root).addEventListener("click", (e) => {
      const el = e.target.closest(".tcell"); if (!el || e.detail !== 0 || e.pointerType || e.timeStamp - lastPointer < 700 || used(+el.dataset.i)) return;
      if (tap(+el.dataset.i)) submit();
    });
    window.addEventListener("pointermove", (e) => {
      if (!down || !e.isPrimary) return;
      const i = cellAt(e.clientX, e.clientY);
      if (i == null || used(i)) return;
      const last = sel[sel.length - 1];
      if (i === last) return;
      // only the middle of a letter counts, so a diagonal stroke does not catch the letters beside it
      const r = cells[i].getBoundingClientRect();
      if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > r.width * 0.42) return;
      if (sel.length > 1 && i === sel[sel.length - 2]) { sel.pop(); moved = true; draw(); return; }
      if (!sel.includes(i) && adj(last, i)) { sel.push(i); moved = true; draw(); }
    }, sig);
    window.addEventListener("pointerup", (e) => {
      if (!down || !e.isPrimary) return; down = false; lastPointer = e.timeStamp;
      if (moved || tapSubmit) submit();
    }, sig);
    window.addEventListener("pointercancel", () => { if (down) { down = false; sel = []; draw(); } }, sig);
    $("#tclear", root).onclick = () => { sel = []; draw(); };
    $("#thint", root).onclick = () => {
      if (st.hinted && !st.found.includes(st.hinted)) return; // the last hint is still on the board
      const left = pz.placed.filter((p) => !st.found.includes(p.w) && !p.span);
      const target = left[0] || pz.placed.find((p) => !st.found.includes(p.w));
      if (!target) return;
      st.hinted = target.w; st.hints++; st.log.push("H"); save(); draw();
    };
    function finish() {
      if ($("#tdone", root).childElementCount) return;
      record("threads", { hints: st.hints }, dk);
      const t = pz.theme;
      const emoji = st.log.map((x) => (x === "S" ? "✨" : x === "H" ? "🕯️" : "🧵")).join("");
      const people = pz.placed.filter((p) => p.person).map((p) => C().chip(p.person)).join("");
      $("#tdone", root).innerHTML = `<div class="qcard"><h2>${esc(tx(t, "title"))}</h2><p>${esc(tx(t, "explain"))} ${t.ref ? `<button class="ref" data-ref="${esc(t.ref)}">${esc(C().refLabel(t.ref))}</button>` : ""}</p>
        <div class="chips">${people}</div><p class="qmeta">${streakText("threads")}</p><button class="qnext" id="tshare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#tshare", root).onclick = (e) => share(`The Daily Catholic · Threads #${dayIndex(dk) + 1}\n“${tx(t, "title")}”\n${emoji}\n${SITE}`, e.currentTarget,
        { title: "Threads", sub: cardSub(dk), rows: [emoji.length > 16 ? emoji.replace(/🧵/gu, "").concat(` 🧵×${st.log.filter((x) => x === "W").length}`) : emoji], big: st.hints ? X(`${st.hints} ${st.hints > 1 ? "hints" : "hint"}`, `${st.hints} ${st.hints > 1 ? "pistas" : "pista"}`) : X("No hints", "Sin pistas") });
    }
    watchSize($("#tgrid", root), draw);
    draw();
  }

  /* =====================================================================
     LINEAGE LINKS — sixteen names, four hidden groups of four.
     ===================================================================== */
  function buildLinks(dk) {
    const R = rng(seedOf("links" + dk));
    const P = C().P;
    const pool = THEMES.filter((t) => t.conn && t.words.filter((w) => w.person && P[w.person]).length >= 4);
    for (let attempt = 0; attempt < 500; attempt++) {
      const chosen = [];
      const byDiff = [1, 2, 3, 4].map((d) => shuffle(R, pool.filter((t) => (t.difficulty || 2) === d)));
      for (let d = 0; d < 4; d++) { const t = byDiff[d].find((x) => !chosen.includes(x)) || pick(R, pool); chosen.push(t); }
      if (new Set(chosen).size < 4) continue;
      const groups = chosen.map((t) => ({ t, items: shuffle(R, t.words.filter((w) => w.person && P[w.person])).slice(0, 4) }));
      const all = groups.flatMap((g) => g.items.map((w) => w.person));
      if (new Set(all).size !== 16) continue;
      if (new Set(groups.flatMap((g) => g.items.map((w) => w.w))).size !== 16) continue;
      // a name may not also fit another chosen group
      const ok = groups.every((g, gi) => groups.every((h, hi) => hi === gi || h.items.every((w) => !(g.t.excl || []).includes(w.person) && !g.t.words.some((x) => x.person === w.person))));
      if (!ok) continue;
      return groups;
    }
    return null;
  }
  function renderLinks(root) {
    const dk = dayKey();
    const groups = buildLinks(dk);
    if (!groups) { root.innerHTML = `<p class="loading">${X("Today's puzzle could not be built. Try again tomorrow.", "No se pudo crear el juego de hoy. Vuelve mañana.")}</p>`; return; }
    const key = `bpm.links.${dk}`;
    const ids = groups.flatMap((g) => g.items.map((w) => w.person));
    const fresh = () => ({ solved: [], mistakes: 0, guesses: [], tried: [], order: shuffle(rng(seedOf("linksorder" + dk)), ids) });
    let st = load(key, fresh());
    // progress saved for a different set of sixteen (the puzzle data changed) cannot be shown on this one
    if (!Array.isArray(st.order) || st.order.length !== 16 || st.order.some((id) => !ids.includes(id)) || new Set(st.order).size !== 16 || !Array.isArray(st.solved) || !Array.isArray(st.guesses) || !Array.isArray(st.tried)) st = fresh();
    const save = () => C().store.set(key, st);
    let sel = [];
    const groupOf = (id) => groups.findIndex((g) => g.items.some((w) => w.person === id));
    // in Spanish the tiles carry the Spanish names (Rebeca, Isaías), as the solved groups and profiles do
    const short = (id) => C().P[id].name.replace(/\s*\(.*\)\s*$/, "").replace(/,.*$/, "").trim();
    const local = window.I18N?.lang === "es" && new Set(ids.map((id) => plain(short(id)))).size === 16;
    const label = (id) => { if (local) return short(id); const w = groups.flatMap((g) => g.items).find((x) => x.person === id).w; return w[0] + w.slice(1).toLowerCase(); };
    root.innerHTML = `<div class="game">
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Lineage Links</h1><span class="qmeta">#${dayNumber()}</span></div>
      <p class="lede">${X("Find four groups of four people who share something: a family, an office, a book, a role in salvation history.", "Encuentra cuatro grupos de cuatro personas que tienen algo en común: una familia, un oficio, un libro, un papel en la historia de la salvación.")}</p>
      <div id="lsolved" class="lsolved"></div><div id="lgrid" class="lgrid"></div>
      <p class="qmeta" id="lmist" aria-live="polite"></p>
      <div class="gbtns"><button id="lshuf" class="ghost">${X("Shuffle", "Mezclar")}</button><button id="ldes" class="ghost">${X("Deselect", "Quitar selección")}</button><button id="lsub" class="qnext">${X("Submit", "Enviar")}</button></div>
      <div id="ldone"></div></div>`;
    function draw() {
      const over = st.solved.length === 4 || st.mistakes >= 4;
      const shownGroups = over ? [...st.solved, ...[0, 1, 2, 3].filter((g) => !st.solved.includes(g))] : st.solved;
      $("#lsolved", root).innerHTML = shownGroups.map((gi) => {
        const g = groups[gi];
        return `<div class="lgroup d${g.t.difficulty || 2}"><b>${esc(tx(g.t, "title"))}</b><span>${g.items.map((w) => C().chip(w.person)).join(" ")}</span></div>`;
      }).join("");
      const left = st.order.filter((id) => !shownGroups.includes(groupOf(id)));
      $("#lgrid", root).innerHTML = left.map((id) => `<button class="ltile${sel.includes(id) ? " on" : ""}" data-pid="${id}" aria-pressed="${sel.includes(id)}">${esc(label(id))}</button>`).join("");
      $("#lmist", root).innerHTML = over ? "" : `${X("Mistakes left", "Errores restantes")}: ${"●".repeat(4 - st.mistakes)}${"○".repeat(st.mistakes)}`;
      $("#lsub", root).disabled = sel.length !== 4 || over;
      $("#ldes", root).disabled = !sel.length;
      root.querySelector(".gbtns").hidden = over;
      if (over) finish();
    }
    $("#lgrid", root).onclick = (e) => {
      const b = e.target.closest(".ltile"); if (!b) return;
      const id = b.dataset.pid;
      if (sel.includes(id)) sel = sel.filter((x) => x !== id); else if (sel.length < 4) sel.push(id);
      draw();
      root.querySelector(`.ltile[data-pid="${id}"]`)?.focus({ preventScroll: true }); // the tiles are redrawn; keep the keyboard where it was
    };
    $("#lshuf", root).onclick = () => { st.order = shuffle(Math.random, st.order); save(); draw(); };
    $("#ldes", root).onclick = () => { sel = []; draw(); };
    $("#lsub", root).onclick = () => {
      if (sel.length !== 4 || st.solved.length === 4 || st.mistakes >= 4) return;
      // the same four again costs nothing
      const sig = sel.slice().sort().join("|");
      if (st.tried.includes(sig)) return toast(X("Already guessed", "Ya lo intentaste"));
      const gs = sel.map(groupOf);
      st.guesses.push(gs); st.tried.push(sig);
      const counts = {}; gs.forEach((g) => (counts[g] = (counts[g] || 0) + 1));
      const best = Math.max(...Object.values(counts));
      if (best === 4) { st.solved.push(gs[0]); sel = []; }
      else { st.mistakes++; toast(best === 3 ? X("One away…", "Te falta uno…") : X("Not a group", "No es un grupo")); }
      save(); draw();
    };
    function toast(t) { $("#lmist", root).dataset.msg = t; const el = $("#lmist", root); el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
    function finish() {
      if ($("#ldone", root).childElementCount) return;
      const won = st.solved.length === 4;
      record("links", { won, mistakes: st.mistakes }, dk);
      const sq = ["", "⚪", "🟢", "🔴", "🟣"];
      const grid = st.guesses.map((gs) => gs.map((g) => sq[groups[g].t.difficulty || 2]).join("")).join("\n");
      $("#ldone", root).innerHTML = `<div class="qcard"><h2>${won ? (st.mistakes ? X("Solved", "¡Resuelto!") : X("Perfect!", "¡Perfecto!")) : X("Out of tries", "Sin más intentos")}</h2>
        ${groups.map((g) => `<p><b>${esc(tx(g.t, "title"))}.</b> ${esc(tx(g.t, "explain"))}</p>`).join("")}
        <p class="qmeta">${streakText("links")}</p><button class="qnext" id="lshare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#lshare", root).onclick = (e) => share(`The Daily Catholic · Lineage Links #${dayIndex(dk) + 1}\n${grid}\n${SITE}`, e.currentTarget,
        { title: "Lineage Links", sub: cardSub(dk), cells: st.guesses.map((gs) => gs.map((g) => groups[g].t.difficulty || 2)), big: won ? (st.mistakes ? X("Solved", "Resuelto") : X("Perfect", "Perfecto")) : "" });
    }
    draw();
  }

  /* =====================================================================
     HIDDEN NAME — an acrostic: solve each clue; the first letters of the
     answers spell a hidden biblical figure.
     ===================================================================== */
  const ALPHA = new RegExp(`^[${LET}]+$`);
  const initial = (name) => plain(name)[0].toUpperCase();
  function buildAcrostic(dk) {
    const R = rng(seedOf("acrostic" + dk));
    const { PEOPLE } = C();
    const good = PEOPLE.filter((p) => ALPHA.test(p.name) && p.name.length >= 3 && p.name.length <= 10 && p.mentions >= 6 && p.summary.length > 60);
    // a clue has to say something once the name is blanked out of it
    const byLetter = {};
    for (const p of good) if (acrosticClue(p).replace(/▢/g, "").trim().length >= 30) (byLetter[initial(p.name)] ??= []).push(p);
    const others = (h, ch) => (byLetter[ch] || []).filter((p) => p.id !== h.id && plain(p.name) !== plain(h.name));
    const spellable = (h) => { const need = {}; for (const ch of plain(h.name).toUpperCase()) need[ch] = (need[ch] || 0) + 1; return Object.entries(need).every(([ch, k]) => others(h, ch).length >= k); };
    // the hidden names take turns in a fixed shuffled rotation, so none returns until all have had a day
    const hiddenPool = shuffle(rng(seedOf("acrostic-rotation-v1")), good.filter((p) => p.name.length >= 4 && p.name.length <= 8 && p.mentions >= 15 && spellable(p)).sort((x, y) => (x.id < y.id ? -1 : 1)));
    if (!hiddenPool.length) return null;
    const n = hiddenPool.length, at = ((dayIndex(dk) % n) + n) % n;
    for (let step = 0; step < n; step++) {
      const h = hiddenPool[(at + step) % n];
      const used = new Set([h.id]), clues = [];
      for (const ch of plain(h.name).toUpperCase()) {
        const cands = shuffle(R, others(h, ch).filter((p) => !used.has(p.id)));
        if (!cands.length) break;
        const c = cands.sort((a, b) => b.mentions - a.mentions)[Math.floor(R() * Math.min(4, cands.length))];
        used.add(c.id); clues.push(c);
      }
      if (clues.length === h.name.length) return { hidden: h, clues };
    }
    return null;
  }
  const maskText = (p, text) => maskNames([p.name, ...p.aliases], text);
  function firstSentence(t) { const m = /^(.{40,220}?[.!?])(\s|$)/.exec(t); return m ? m[1] : t.slice(0, 200); }
  const acrosticClue = (p) => maskText(p, firstSentence(p.summary));
  function renderAcrostic(root) {
    const dk = dayKey();
    const pz = buildAcrostic(dk);
    if (!pz) { root.innerHTML = `<p class="loading">${X("Today's puzzle could not be built. Try again tomorrow.", "No se pudo crear el juego de hoy. Vuelve mañana.")}</p>`; return; }
    // names differ by language, so each language has its own puzzle and its own progress
    const key = `bpm.acrostic.${X("", "es.")}${dk}`;
    const fresh = () => ({ solved: [], reveals: {}, who: pz.hidden.id, gaveUp: false });
    let st = load(key, fresh());
    if (st.who !== pz.hidden.id || !Array.isArray(st.solved) || st.solved.some((i) => !pz.clues[i]) || typeof st.reveals !== "object" || !st.reveals) st = fresh();
    const save = () => C().store.set(key, st);
    root.innerHTML = `<div class="game">
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Hidden Name</h1><span class="qmeta">#${dayNumber()}</span></div>
      <p class="lede">${X("Name each person from the clue. The first letters of the answers spell a hidden figure from Scripture.", "Nombra a cada persona según la pista. Las primeras letras de las respuestas forman el nombre de un personaje bíblico oculto.")}</p>
      <div class="ahidden" id="ahid" role="img"></div>
      <ol class="aclues" id="aclues"></ol>
      <div class="gbtns" id="agive"></div>
      <div id="adone"></div></div>`;
    $("#aclues", root).innerHTML = pz.clues.map((p, i) => `
      <li class="aclue" data-i="${i}">
        <p>${esc(acrosticClue(p))}</p>
        <div class="arow"><input id="ac${i}" class="ain" maxlength="${p.name.length}" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next" aria-label="${X(`Answer ${i + 1}, ${p.name.length} letters`, `Respuesta ${i + 1}, ${p.name.length} letras`)}" placeholder="${"_ ".repeat(p.name.length).trim()}">
        <span class="qmeta">${p.name.length} ${X("letters", "letras")}</span><button class="ghost small" data-hint="${i}">${X("Hint", "Pista")}</button></div>
        <p class="qmeta ahint" id="ah${i}" aria-live="polite"></p>
      </li>`).join("");
    const hintsUsed = () => Object.values(st.reveals).reduce((a, b) => a + b, 0);
    const ended = () => st.solved.length === pz.clues.length || !!st.gaveUp;
    let asking = false;
    function draw() {
      const open = (i) => st.solved.includes(i) || !!st.gaveUp;
      $("#ahid", root).innerHTML = pz.clues.map((p, i) => `<span class="${st.solved.includes(i) ? "on" : ""}">${open(i) ? initial(p.name) : ""}</span>`).join("");
      $("#ahid", root).setAttribute("aria-label", `${X("Hidden name", "Nombre oculto")}: ${pz.clues.map((p, i) => (open(i) ? initial(p.name) : X("blank", "vacío"))).join(", ")}`);
      pz.clues.forEach((p, i) => {
        const inp = $(`#ac${i}`, root), done = open(i);
        if (done) { inp.value = p.name.toUpperCase(); inp.disabled = true; if (st.solved.includes(i)) inp.closest(".aclue").classList.add("ok"); }
        const r = st.reveals[i] || 0, role = `${X("Role", "Función")}: ${maskText(p, p.role)}`;
        $(`#ah${i}`, root).textContent = r ? (r === 1 ? role : `${X("Starts with", "Empieza por")} ${p.name.slice(0, r - 1).toUpperCase()}…  ·  ${role}`) : "";
        root.querySelector(`[data-hint="${i}"]`).disabled = done || r >= p.name.length;
      });
      // the way out when stuck: always there on request, and offered in words once three hints have not been enough
      $("#agive", root).innerHTML = ended() ? "" : asking
        ? `<span class="qmeta">${X("See the answer? Today will count as not solved.", "¿Ver la respuesta? Hoy contará como no resuelto.")}</span><button class="qnext" id="ashowyes">${X("Yes, show it", "Sí, mostrar")}</button><button class="ghost" id="ashowno">${X("Keep trying", "Seguir intentando")}</button>`
        : `<button class="ghost" id="ashow">${X("Show answer", "Mostrar respuesta")}</button>${hintsUsed() >= 3 ? `<span class="qmeta">${X("Stuck? You can see the answer and come back tomorrow.", "¿Sin salida? Puedes ver la respuesta y volver mañana.")}</span>` : ""}`;
      if (ended()) finish();
    }
    $("#agive", root).addEventListener("click", (e) => {
      if (ended()) return;
      if (e.target.closest("#ashow")) { asking = true; draw(); $("#ashowyes", root)?.focus({ preventScroll: true }); }
      else if (e.target.closest("#ashowno")) { asking = false; draw(); }
      else if (e.target.closest("#ashowyes")) { st.gaveUp = true; save(); draw(); }
    });
    function check(inp) {
      const i = +inp.closest(".aclue").dataset.i, p = pz.clues[i];
      if (ended() || st.solved.includes(i) || ![p.name, ...p.aliases].some((n) => plain(n) === plain(inp.value))) return false;
      st.solved.push(i); save(); draw();
      // on to the next open clue below, or back round to the first one left
      const open = [...root.querySelectorAll(".ain:not(:disabled)")];
      (open.find((el) => +el.closest(".aclue").dataset.i > i) || open[0])?.focus();
      return true;
    }
    $("#aclues", root).addEventListener("input", (e) => { const inp = e.target.closest(".ain"); if (inp) { inp.classList.remove("shake"); check(inp); } });
    // Enter on a full but wrong answer says so, instead of leaving the player guessing whether it registered
    $("#aclues", root).addEventListener("keydown", (e) => {
      const inp = e.target.closest(".ain"); if (!inp || e.key !== "Enter" || !inp.value.trim()) return;
      if (!check(inp)) { inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); }
    });
    $("#aclues", root).addEventListener("click", (e) => {
      const b = e.target.closest("[data-hint]"); if (!b) return;
      const i = +b.dataset.hint;
      if (ended() || st.solved.includes(i)) return;
      st.reveals[i] = Math.min((st.reveals[i] || 0) + 1, pz.clues[i].name.length);
      save(); draw();
    });
    function finish() {
      if ($("#adone", root).childElementCount) return;
      const hints = hintsUsed(), lost = st.solved.length < pz.clues.length; // the answer was shown: a day played, not a day solved
      record("acrostic", lost ? { hints, lost: true } : { hints }, dk);
      const h = pz.hidden;
      $("#adone", root).innerHTML = `<div class="qcard"><span class="eyebrow">${lost ? X("The hidden name was", "El nombre oculto era") : X("The hidden name", "El nombre oculto")}</span><h2>${esc(h.name)}</h2><p>${esc(h.summary)}</p>
        <div class="chips">${C().chip(h.id)}${pz.clues.map((p) => C().chip(p.id)).join("")}</div>
        <p class="qmeta">${hints ? `${hints} ${X(hints > 1 ? "hints used" : "hint used", hints > 1 ? "pistas usadas" : "pista usada")} · ` : `${X("No hints!", "¡Sin pistas!")} · `}${streakText("acrostic")}</p><button class="qnext" id="ashare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#ashare", root).onclick = (e) => share(`The Daily Catholic · Hidden Name #${dayIndex(dk) + 1}\n${pz.clues.map((_, i) => (!st.solved.includes(i) ? "▫️" : st.reveals[i] ? "🕯️" : "✝️")).join("")}${lost ? " ✖️" : ""} ${h.name.length} ${X("letters", "letras")}\n${SITE}`, e.currentTarget,
        { title: "Hidden Name", sub: cardSub(dk), cells: [pz.clues.map((_, i) => (!st.solved.includes(i) ? "off" : st.reveals[i] ? "present" : "on"))], big: lost ? X("Not today", "Hoy no") : hints ? X(`${hints} ${hints > 1 ? "hints" : "hint"}`, `${hints} ${hints > 1 ? "pistas" : "pista"}`) : X("No hints", "Sin pistas") });
    }
    draw();
  }

  /* =====================================================================
     HOLY LAND TAP — five events a day; tap where they happened.
     ===================================================================== */
  const EXTENTS = {
    near: { box: [33.6, 29.3, 37.2, 33.9], full: 4, zero: 90 },
    wide: { box: [9, 21, 56, 44], full: 30, zero: 1100 },
  };
  function haversine(a, b) {
    const R = 6371, t = Math.PI / 180;
    const dLat = (b[1] - a[1]) * t, dLon = (b[0] - a[0]) * t;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function inBox(p, box) { return p.lon >= box[0] && p.lon <= box[2] && p.lat >= box[1] && p.lat <= box[3]; }
  // sea, land and lakes, drawn only where the map data reaches; a tall phone shows blank margin beyond it instead of
  // a false sea over Europe and Arabia. (The data's straight southern edge bows up to 19.8°N when projected.)
  function mapBase(g, proj, path, W, H, clipId) {
    const b = GEO.box, [x0, y1] = proj([b[0], Math.max(b[1], 19.8)]), [x1, y0] = proj([b[2], b[3]]);
    g.append("rect").attr("class", "off").attr("x", -W * 5).attr("y", -H * 5).attr("width", W * 11).attr("height", H * 11);
    g.append("clipPath").attr("id", clipId).append("rect").attr("x", x0).attr("y", y0).attr("width", x1 - x0).attr("height", y1 - y0);
    const m = g.append("g").attr("clip-path", `url(#${clipId})`);
    m.append("rect").attr("class", "sea").attr("x", x0).attr("y", y0).attr("width", x1 - x0).attr("height", y1 - y0);
    m.append("path").attr("class", "land").attr("d", path(GEO.land));
    m.selectAll(".lake").data(GEO.water.features).join("path").attr("class", "lake").attr("d", path);
    return m;
  }
  const tapScore = (d, ext) => { const e = EXTENTS[ext]; if (d <= e.full) return 1000; return Math.round(1000 * Math.max(0, 1 - (d - e.full) / (e.zero - e.full)) ** 1.6); };
  function buildTap(dk) {
    const R = rng(seedOf("tap" + dk));
    const near = PLACES.filter((p) => inBox(p, EXTENTS.near.box) && p.certainty !== "traditional" || (inBox(p, EXTENTS.near.box) && R() < 0.3));
    const far = PLACES.filter((p) => !inBox(p, EXTENTS.near.box));
    // a place beyond the edge of the wide map (Tarshish, Sheba) cannot be tapped, so it is never asked
    const picks = [...shuffle(R, near).slice(0, 3), ...shuffle(R, far).filter((p) => inBox(p, EXTENTS.wide.box)).slice(0, 2)];
    return shuffle(R, picks).map((pl) => { const ev = pick(R, pl.events); return { place: esPlace(pl), event: esEvent(pl, ev), ext: inBox(pl, EXTENTS.near.box) ? "near" : "wide" }; });
  }
  async function renderTap(root) {
    const mine = mountId;
    root.innerHTML = `<p class="loading">${X("Loading the map…", "Cargando el mapa…")}</p>`;
    await places();
    if (mine !== mountId) return; // another view was opened while the map loaded
    const dk = dayKey();
    const rounds = buildTap(dk);
    const key = `bpm.tap.${dk}`;
    const fresh = () => ({ i: 0, guesses: [] });
    let st = load(key, fresh());
    if (!Array.isArray(st.guesses) || st.guesses.length > rounds.length || st.guesses.some((x) => !x || !Array.isArray(x.pin) || !isFinite(x.d) || !isFinite(x.s)) || !(st.i >= 0)) st = fresh();
    st.i = Math.min(st.i, st.guesses.length, rounds.length); // never past the first unanswered round
    const save = () => C().store.set(key, st);
    const LABEL = { near: X("The Holy Land", "Tierra Santa"), wide: X("The biblical world", "El mundo bíblico") };
    root.innerHTML = `<div class="game">
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Holy Land Tap</h1><span class="qmeta">#${dayNumber()}</span></div>
      <div class="tapq" id="tapq" aria-live="polite"></div>
      <div class="tapmap"><svg id="tapsvg" role="img" aria-label="${X("Map", "Mapa")}"></svg><div class="maptag" id="maptag"></div></div>
      <div class="tapbar" id="tapbar" aria-live="polite"></div>
      <div id="tapdone"></div></div>`;
    const svgEl = $("#tapsvg", root);
    const svg = d3.select(svgEl);
    let pin = null, proj, path, zoomT = d3.zoomIdentity, shown = null;
    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([1, 12]).on("zoom", (e) => { zoomT = e.transform; g.attr("transform", zoomT); g.selectAll(".dot,.pin,.ans").attr("r", 6 / zoomT.k).attr("stroke-width", 2 / zoomT.k); g.selectAll(".gline").attr("stroke-width", 2 / zoomT.k); g.selectAll(".plabel").attr("font-size", 13 / zoomT.k); });
    // a second quick tap moves the pin; it must not zoom the map out from under the finger
    svg.call(zoom).on("dblclick.zoom", null);
    const answered = () => st.guesses.length > st.i;
    // the map for the round on screen, with its pin or its answer; redrawn as it is when the map changes size
    function drawMap(keepZoom) {
      const ext = rounds[st.i].ext;
      const W = svgEl.clientWidth || 600, H = svgEl.clientHeight || 500;
      svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
      zoom.extent([[0, 0], [W, H]]).translateExtent([[-W / 2, -H / 2], [W * 1.5, H * 1.5]]);
      const b = EXTENTS[ext].box;
      const boxGeo = { type: "MultiPoint", coordinates: [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]] };
      proj = d3.geoMercator().fitSize([W, H], boxGeo);
      path = d3.geoPath(proj);
      g.selectAll("*").remove();
      const m = mapBase(g, proj, path, W, H, "tapclip");
      m.append("path").attr("class", "river").attr("d", d3.line()(GEO.jordan.map((p) => proj(p))));
      if (!keepZoom) svg.call(zoom.transform, d3.zoomIdentity);
      $("#maptag", root).textContent = `${LABEL[ext]} · ${X("pinch or scroll to zoom", "pellizca o desplaza para acercar")}`;
      if (answered()) drawAnswer(); else if (pin) drawPin();
      shown = `${W}x${H}`;
    }
    function drawPin() {
      const [x, y] = proj(pin);
      g.selectAll(".pin").remove();
      g.append("circle").attr("class", "pin").attr("cx", x).attr("cy", y).attr("r", 6 / zoomT.k).attr("stroke-width", 2 / zoomT.k);
    }
    function drawAnswer() {
      const r = rounds[st.i], gs = st.guesses[st.i];
      const a = proj([r.place.lon, r.place.lat]), p = proj(gs.pin);
      g.selectAll(".pin,.ans,.gline,.plabel").remove();
      g.append("line").attr("class", "gline").attr("x1", p[0]).attr("y1", p[1]).attr("x2", a[0]).attr("y2", a[1]).attr("stroke-width", 2 / zoomT.k);
      g.append("circle").attr("class", "pin").attr("cx", p[0]).attr("cy", p[1]).attr("r", 6 / zoomT.k).attr("stroke-width", 2 / zoomT.k);
      g.append("circle").attr("class", "ans").attr("cx", a[0]).attr("cy", a[1]).attr("r", 6 / zoomT.k).attr("stroke-width", 2 / zoomT.k);
      // the name sits on whichever side of the dot has room for it
      const left = a[0] > (svgEl.clientWidth || 600) * 0.62;
      g.append("text").attr("class", "plabel").attr("x", a[0] + (left ? -9 : 9)).attr("y", a[1] + 4).attr("text-anchor", left ? "end" : "start").attr("font-size", 13 / zoomT.k).text(r.place.name);
    }
    function show() {
      if (st.guesses.length >= rounds.length && st.i >= rounds.length) return finish();
      const r = rounds[st.i];
      $("#tapq", root).innerHTML = `<span class="eyebrow">${X(`Round ${st.i + 1} of ${rounds.length}`, `Ronda ${st.i + 1} de ${rounds.length}`)}</span><b>${esc(r.event.q)}</b>`;
      pin = null;
      root.querySelector(".tapmap").classList.toggle("wideext", r.ext === "wide"); // the wide map is a landscape strip
      drawMap();
      if (answered()) reveal();
      else {
        $("#tapbar", root).innerHTML = `<span class="qmeta">${X("Tap the map to drop a pin.", "Toca el mapa para marcar un punto.")}</span><button class="qnext" id="tapok" disabled>${X("Lock in", "Confirmar")}</button>`;
        $("#tapok", root).onclick = lock;
      }
    }
    svg.on("click", (e) => {
      if (answered() || st.i >= rounds.length) return;
      const [mx, my] = zoomT.invert(d3.pointer(e, svgEl));
      pin = proj.invert([mx, my]);
      drawPin();
      const b = $("#tapok", root); if (b) b.disabled = false;
    });
    function lock() {
      if (!pin || answered()) return;
      const r = rounds[st.i];
      const d = haversine(pin, [r.place.lon, r.place.lat]);
      st.guesses.push({ pin, d, s: tapScore(d, r.ext) }); save();
      window.BPM_HABIT?.collect("places", r.place.id); // seen on the map: a stamp in My pilgrimage
      if (st.guesses.length === rounds.length) record("tap", { score: st.guesses.reduce((a, x) => a + x.s, 0) }, dk);
      svg.call(zoom.transform, d3.zoomIdentity); // step back so the pin and the answer are both in view
      drawAnswer(); reveal();
    }
    const km = (d) => (d < 1 ? X("spot on", "justo en el punto") : X(`${Math.round(d)} km away`, `a ${Math.round(d)} km`));
    const CERT = { probable: X("probable location", "ubicación probable"), traditional: X("traditional location", "ubicación tradicional") };
    function reveal() {
      const r = rounds[st.i], gs = st.guesses[st.i];
      const people = (r.event.people || []).filter((id) => C().P[id]).map((id) => C().chip(id)).join("");
      $("#tapbar", root).innerHTML = `<div class="tapres"><div><b>${esc(r.place.name)}</b> · ${km(gs.d)} · <b>${gs.s}</b> ${X("pts", "puntos")}</div>
        <p class="qmeta">${esc(r.place.note || "")}${CERT[r.place.certainty] ? ` (${CERT[r.place.certainty]})` : ""}</p>
        <div class="chips">${people}<button class="ref" data-ref="${esc(r.event.ref)}">${esc(C().refLabel(r.event.ref))}</button></div>
        <button class="qnext" id="tapnext">${st.i + 1 < rounds.length ? X("Next round", "Siguiente ronda") : X("See score", "Ver puntuación")}</button></div>`;
      $("#tapnext", root).onclick = () => { if (!answered()) return; st.i++; save(); show(); };
    }
    function finish() {
      const total = st.guesses.reduce((a, x) => a + x.s, 0);
      record("tap", { score: total }, dk);
      const bar = (s) => (s >= 900 ? "📍" : s >= 500 ? "🧭" : s > 0 ? "🐾" : "▫️");
      const num = (v) => v.toLocaleString(window.I18N?.locale());
      $("#tapq", root).innerHTML = `<span class="eyebrow">${X("Final score", "Puntuación final")}</span><b>${num(total)} / ${num(rounds.length * 1000)}</b>`;
      root.querySelector(".tapmap").hidden = true;
      $("#tapbar", root).innerHTML = "";
      $("#tapdone", root).innerHTML = `<div class="qcard">${rounds.map((r, i) => `<p>${bar(st.guesses[i].s)} <b>${esc(r.place.name)}</b>: ${esc(r.event.q)} <span class="qmeta">${Math.round(st.guesses[i].d)} km · ${st.guesses[i].s} ${X("pts", "puntos")}</span></p>`).join("")}
        <p class="qmeta">${streakText("tap")}</p><button class="qnext" id="tapshare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#tapshare", root).onclick = (e) => share(`The Daily Catholic · Holy Land Tap #${dayIndex(dk) + 1}\n${st.guesses.map((x) => bar(x.s)).join("")} ${total}/${rounds.length * 1000}\n${SITE}`, e.currentTarget,
        { title: "Holy Land Tap", sub: cardSub(dk), rows: [st.guesses.map((x) => bar(x.s)).join("")], big: `${num(total)} / ${num(rounds.length * 1000)}` });
    }
    // a phone's address bar sliding away resizes the map; redraw it in place and keep the player's pin and zoom
    watchSize(svgEl, () => { if (svgEl.isConnected && svgEl.clientWidth && st.i < rounds.length && shown !== `${svgEl.clientWidth}x${svgEl.clientHeight}`) drawMap(true); });
    show();
  }


  /* =====================================================================
     FIVE LOAVES — guess the five-letter word of the day in six tries.
     ===================================================================== */
  let WORDLE = null, WORDLE_ES = null, loavesAbort = null;
  function scoreGuess(g, ans) {
    const res = Array(5).fill("absent"), left = {};
    for (let i = 0; i < 5; i++) if (g[i] === ans[i]) res[i] = "correct"; else left[ans[i]] = (left[ans[i]] || 0) + 1;
    for (let i = 0; i < 5; i++) if (res[i] !== "correct" && left[g[i]]) { res[i] = "present"; left[g[i]]--; }
    return res;
  }
  async function renderLoaves(root) {
    const mine = mountId;
    root.innerHTML = `<p class="loading">${X("Loading…", "Cargando…")}</p>`;
    const es = window.I18N?.lang === "es";
    let W;
    if (es) { WORDLE_ES ??= await C().getJSON("data/wordle_es.json").catch(() => null); W = WORDLE_ES; }
    if (!W) { WORDLE ??= await C().getJSON("data/wordle.json"); W = WORDLE; }
    if (mine !== mountId) return; // another view was opened while the words loaded
    const spanish = W === WORDLE_ES;
    const VALID = new Set(W.valid);
    const dk = dayKey(), n = dayIndex(dk) + 1;
    const ans = W.answers[((n - 1) % W.answers.length + W.answers.length) % W.answers.length];
    const key = `bpm.loaves.${spanish ? "es." : ""}${dk}`;
    let st = load(key, { guesses: [] });
    if (!Array.isArray(st.guesses) || st.guesses.length > 6 || st.guesses.some((g) => typeof g !== "string" || g.length !== 5)) st = { guesses: [] };
    const save = () => C().store.set(key, st);
    let cur = "";
    const KB = spanish ? ["QWERTYUIOP", "ASDFGHJKLÑ", "↵ZXCVBNM⌫"] : ["QWERTYUIOP", "ASDFGHJKL", "↵ZXCVBNM⌫"];
    root.innerHTML = `<div class="game loaves">
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>Five Loaves</h1><span class="qmeta">#${n}</span></div>
      <p class="lede">${X("Guess today's five-letter word of faith in six tries. It may be a word from the Mass, the Bible or Church life, or a person from Scripture.", "Adivina la palabra de fe de hoy, de cinco letras, en seis intentos: términos de la Misa, la Biblia, la vida de la Iglesia o personajes bíblicos. Los acentos no cuentan.")}</p>
      <div class="wgrid" id="wgrid"></div>
      <p class="tword" id="wmsg" aria-live="assertive">&nbsp;</p>
      <div class="kb" id="kb">${KB.map((r) => `<div class="kbrow">${[...r].map((k) => `<button data-k="${k}" class="${k === "↵" || k === "⌫" ? "wide" : ""}" aria-label="${k === "↵" ? X("Enter", "Enviar") : k === "⌫" ? X("Delete", "Borrar") : k}">${k === "↵" ? X("Enter", "Enviar") : k}</button>`).join("")}</div>`).join("")}</div>
      <div id="wdone"></div></div>`;
    const over = () => st.guesses.includes(ans.w) || st.guesses.length >= 6;
    const NAME = { correct: X("correct", "correcta"), present: X("in the word, wrong place", "en otra posición"), absent: X("not in the word", "no está") };
    function draw() {
      const rows = [];
      for (let r = 0; r < 6; r++) {
        const g = st.guesses[r], live = r === st.guesses.length && !over();
        const letters = g ? [...g] : live ? [...cur.padEnd(5)] : [..."     "];
        const sc = g ? scoreGuess(g, ans.w) : [];
        const said = g ? `${X("Guess", "Intento")} ${r + 1}: ${letters.map((ch, i) => `${ch} ${NAME[sc[i]]}`).join(", ")}` : live ? `${X("Guess", "Intento")} ${r + 1}: ${cur || X("empty", "vacío")}` : "";
        rows.push(`<div class="wrow"${said ? ` role="img" aria-label="${said}"` : ` aria-hidden="true"`}>${letters.map((ch, i) => `<span class="wt ${sc[i] || (ch.trim() ? "filled" : "")}">${ch.trim()}</span>`).join("")}</div>`);
      }
      $("#wgrid", root).innerHTML = rows.join("");
      const best = {};
      const rank = { correct: 3, present: 2, absent: 1 };
      for (const g of st.guesses) scoreGuess(g, ans.w).forEach((v, i) => { if ((rank[v] || 0) > (rank[best[g[i]]] || 0)) best[g[i]] = v; });
      root.querySelectorAll("#kb button").forEach((b) => {
        b.className = (b.className.includes("wide") ? "wide " : "") + (best[b.dataset.k] || "");
        if (best[b.dataset.k]) b.setAttribute("aria-label", `${b.dataset.k}, ${NAME[best[b.dataset.k]]}`);
      });
      if (over()) finish();
    }
    function msg(t) { const el = $("#wmsg", root); el.textContent = t; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
    function press(k) {
      if (over()) return;
      if (k !== "↵") $("#wmsg", root).textContent = " "; // typing on clears the last message
      if (k === "⌫") cur = cur.slice(0, -1);
      else if (k === "↵") {
        if (cur.length < 5) return msg(X("Not enough letters", "Faltan letras"));
        if (!VALID.has(cur)) return msg(X("Not in the word list", "No está en la lista de palabras"));
        if (st.guesses.includes(cur)) return msg(X("Already tried", "Ya la probaste"));
        st.guesses.push(cur); cur = ""; save();
        if (st.guesses.at(-1) === ans.w) msg((spanish ? ["¡Milagroso!", "¡Glorioso!", "¡Maravilloso!", "¡Muy bien!", "¡Bien!", "¡Uf!"] : ["Miraculous!", "Glorious!", "Wonderful!", "Well done!", "Good!", "Phew!"])[st.guesses.length - 1]);
        else $("#wmsg", root).textContent = " ";
      } else if ((spanish ? /^[A-ZÑ]$/ : /^[A-Z]$/).test(k) && cur.length < 5) cur += k;
      else return;
      draw();
    }
    $("#kb", root).addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) press(b.dataset.k); });
    loavesAbort?.abort(); loavesAbort = new AbortController();
    window.addEventListener("keydown", (e) => {
      if (!root.isConnected || !$("#wgrid", root) || root.closest("[hidden]") || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input,textarea,select")) return;
      // Enter on a focused link or button (Back, the language switch, Share) must still press that control
      if (e.key === "Enter" && e.target.closest?.("a,button,summary") && !e.target.closest("#kb")) return;
      if (e.key === "Enter") { if (!e.repeat) press("↵"); }
      else if (e.key === "Backspace") press("⌫");
      // a Spanish keyboard types Á or Ü; the board is unaccented, and only Ñ is a letter of its own
      else if (e.key.length === 1 && /\p{L}/u.test(e.key)) press(/ñ/i.test(e.key) ? "Ñ" : plain(e.key).toUpperCase());
      else return;
      e.preventDefault();
    }, { signal: loavesAbort.signal });
    function finish() {
      if ($("#wdone", root).childElementCount) return;
      const won = st.guesses.includes(ans.w);
      record("loaves", { won, tries: st.guesses.length }, dk);
      $("#kb", root).hidden = true;
      const grid = st.guesses.map((g) => scoreGuess(g, ans.w).map((v) => (v === "correct" ? "🍞" : v === "present" ? "🐟" : "▫️")).join("")).join("\n");
      $("#wdone", root).innerHTML = `<div class="qcard"><span class="eyebrow">${won ? X(`Solved in ${st.guesses.length}`, `Resuelto en ${st.guesses.length}`) : X("Today's word", "La palabra de hoy")}</span><h2>${esc(ans.shown || ans.w)}</h2>
        <p>${esc(ans.explain)}</p>
        <div class="chips">${ans.person ? C().chip(ans.person) : ""}${ans.ref ? `<button class="ref" data-ref="${esc(ans.ref)}">${esc(C().refLabel(ans.ref))}</button>` : ""}</div>
        <p class="qmeta">${streakText("loaves")}</p><button class="qnext" id="wshare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#wshare", root).onclick = (e) => share(`The Daily Catholic · Five Loaves #${n} ${won ? st.guesses.length : "X"}/6\n${grid}\n${SITE}`, e.currentTarget,
        { title: "Five Loaves", sub: cardSub(dk), cells: st.guesses.map((g) => scoreGuess(g, ans.w)), big: `${won ? st.guesses.length : "X"}/6` });
    }
    draw();
  }


  /* =====================================================================
     PILGRIMAGE — our own daily game. A hidden figure from Scripture; four
     stations (Word, Place, Verse, Family) each unlock a clue. Name the
     pilgrim as early as you can. Candles measure how well you did.
     ===================================================================== */
  const WORD_RE = /[A-Za-zÀ-ÿ]+/g;
  function pickPilgrim(dk) {
    const R = rng(seedOf("pilgrim" + dk));
    const P = C().P;
    const atPlace = {};
    for (const pl of PLACES) for (const ev of pl.events) for (const id of ev.people || []) (atPlace[id] ??= []).push({ pl, ev });
    const rel = (p) => [p.father, p.mother, ...p.spouses, ...p.children].filter((x) => x && P[x]);
    // judged on the English profile, so both languages share the same pilgrim each day
    const cands = C().PEOPLE.filter((p) => atPlace[p.id] && /^[A-Za-z]{3,10}$/.test((p._en || p).name) && p.mentions >= 12 && (p._en || p).summary.length > 100 && p.keyPassages.length && rel(p).length >= 2);
    // a fixed shuffled rotation, so nobody repeats until everyone has had a day
    const order = shuffle(rng(seedOf("pilgrim-rotation-v1")), cands.sort((x, y) => (x.id < y.id ? -1 : 1)));
    const idx = dayIndex(dk);
    const p = order[((idx % order.length) + order.length) % order.length];
    const names = [p.name, ...p.aliases].filter(Boolean);
    const mask = (t) => maskNames(names, t);
    // Word station: a telling word from their role or story (not their name)
    const bad = new Set(["which", "their", "there", "about", "after", "later", "first", "where", "would", "under", "whose", "other", "being", "these", "those", "should", "could", "shall", "before", "because", "against", "among", "every", "while", "until", "upon", "unto", "therefore", "himself", "herself", "themselves", "people", "great", "things", "again", "whom", "what", "when", "also", "into", "from", "with", "said", "says", "saying"]);
    const pool = [...(p.role.match(WORD_RE) || []), ...(p.summary.match(WORD_RE) || [])].filter((w) => w.length >= 5 && w.length <= 9 && !bad.has(w.toLowerCase()) && !names.some((n) => n.toLowerCase() === w.toLowerCase()) && w[0] === w[0].toLowerCase() || /^(King|Prophet|Patriarch|Judge|Priest|Apostle|Queen|Matriarch)$/.test(w));
    const roleWords = (p.role.match(WORD_RE) || []).filter((w) => w.length >= 4 && w.length <= 10 && !names.some((n) => n.toLowerCase() === w.toLowerCase()) && !/^(of|the|and|son|daughter|wife|husband|father|mother|brother|sister)$/i.test(w));
    const word = (roleWords.sort((a, b) => b.length - a.length)[0] || pool.sort((a, b) => b.length - a.length)[Math.floor(R() * Math.min(4, pool.length))] || "faith").toUpperCase();
    let scr = word; for (let i = 0; i < 20 && scr === word; i++) scr = shuffle(R, [...word]).join("");
    // Place station
    // (a place beyond the edge of the map cannot be tapped; another of their places stands in, or the station is left out)
    const onMap = (x) => inBox(x.pl, EXTENTS.wide.box);
    let spot = atPlace[p.id][Math.floor(R() * atPlace[p.id].length)];
    if (!onMap(spot)) spot = atPlace[p.id].find(onMap) || null;
    const { pl, ev } = spot || {};
    // Verse station: a key-passage verse naming them; blank another word, 4 choices
    const verses = [];
    for (const ref of p.keyPassages) { const r = C().parseRef(ref); if (r) for (const v of C().verses(r)) if (names.some((n) => v.t.includes(n))) verses.push({ ...v, b: r.b }); }
    const vv = verses.length ? verses[Math.floor(R() * verses.length)] : null;
    let verse = null;
    if (vv) {
      const words = (vv.t.match(/[A-Za-z]{5,}/g) || []).filter((w) => !names.includes(w) && !bad.has(w.toLowerCase()));
      if (words.length) {
        const ans = words[Math.floor(R() * words.length)];
        // the verse is English in both languages, so the wrong choices come from the English profiles too
        const stock = C().PEOPLE.slice(0, 400).flatMap((x) => ((x._en || x).summary.match(/\b[a-z]{5,9}\b/g) || [])).filter((w) => !bad.has(w) && w !== ans.toLowerCase());
        const decoys = [...new Set(shuffle(R, stock.filter((w) => Math.abs(w.length - ans.length) <= 2)))].slice(0, 3);
        // a very long answer has few words its own size: fill up with the longest there are
        if (decoys.length < 3) for (const w of [...new Set(shuffle(R, stock))].sort((a, b) => b.length - a.length)) { if (decoys.length >= 3) break; if (!decoys.includes(w)) decoys.push(w); }
        const text = mask(vv.t).replace(new RegExp(`\\b${ans}\\b`), "_____");
        if (text.includes("_____")) verse = { ref: `${vv.b} ${vv.c}:${vv.v}`, text, ans, opts: shuffle(R, [ans, ...decoys.map((d) => (ans[0] === ans[0].toUpperCase() ? d[0].toUpperCase() + d.slice(1) : d))]) };
      }
    }
    // Family station
    const fam = rel(p);
    const famIds = new Set(fam);
    // a wrong choice must be plainly wrong: no brother, grandparent, grandchild or in-law, nobody whose listing names the pilgrim, no namesake
    const kin = new Set(fam.flatMap((id) => [id, ...rel(P[id])]));
    // shown without the "(son of …)" that would point at the pilgrim, or at the family
    const label = (x) => { const t = x.name.replace(/\s*\(.*\)\s*$/, "").replace(/,?\s+(son|daughter|wife|husband|father|mother|brother|sister|hijo|hija|esposa|mujer|esposo|marido|padre|madre|hermano|hermana)\s+(of|de)\s.*$/i, ""); return mask(t) === t && t ? t : mask(x.name); };
    const famPickNames = new Set();
    const decoyPeople = shuffle(R, C().PEOPLE.filter((x) => x.era === p.era && x.id !== p.id && !famIds.has(x.id) && x.mentions >= 5 && !rel(x).includes(p.id)))
      .filter((x) => !kin.has(x.id) && mask(x.name) === x.name && !fam.some((id) => plain(label(P[id])) === plain(label(x))) && !famPickNames.has(plain(label(x))) && famPickNames.add(plain(label(x))))
      .slice(0, 6 - Math.min(fam.length, 3));
    const famPick = shuffle(R, fam).slice(0, 3);
    const opts = shuffle(R, [...famPick, ...decoyPeople.map((x) => x.id)]);
    const family = { right: famPick, opts, label: Object.fromEntries(opts.map((id) => [id, label(P[id])])) };
    return { p, names, mask, word, scr, pl: pl && esPlace(pl), ev: ev && esEvent(pl, ev), verse, family };
  }
  async function renderPilgrimage(root) {
    const mine = mountId;
    root.innerHTML = `<p class="loading">${X("Loading…", "Cargando…")}</p>`;
    await places();
    await C().loadBible();
    if (mine !== mountId) return; // another view was opened while the Bible loaded
    const dk = dayKey(), n = dayIndex(dk) + 1;
    const g = pickPilgrim(dk);
    const P = C().P;
    const key = `bpm.pilgrim.${dk}`;
    const fresh = () => ({ done: {}, good: {}, guesses: [], won: false, who: g.p.id });
    let st = load(key, fresh());
    if ((st.who && st.who !== g.p.id) || !Array.isArray(st.guesses) || typeof st.done !== "object" || !st.done || typeof st.good !== "object" || !st.good) st = fresh();
    st.who = g.p.id;
    const save = () => C().store.set(key, st);
    const STATIONS = [
      { id: "word", icon: "✠", name: X("The Word", "La Palabra"), hint: X("Unscramble a word from this person's story.", "Ordena las letras de una palabra de su historia.") },
      { id: "place", icon: "⌖", name: X("The Place", "El Lugar"), hint: X("Find on the map where part of their story happened.", "Encuentra en el mapa dónde ocurrió parte de su historia.") },
      { id: "verse", icon: "¶", name: X("The Verse", "El Versículo"), hint: X("Complete a verse that speaks of them.", "Completa un versículo que habla de esta persona.") },
      { id: "family", icon: "⚭", name: X("The Family", "La Familia"), hint: X("Pick out their relatives.", "Elige a sus familiares.") },
    ].filter((x) => (x.id !== "verse" || g.verse) && (x.id !== "place" || g.pl));
    const MAX_WRONG = 3;
    const wrong = () => st.guesses.filter((x) => x !== "✓");
    const allDone = () => STATIONS.every((x) => st.done[x.id]);
    const candles = () => Math.max(0, STATIONS.filter((x) => st.good[x.id]).length + (st.won ? 1 : 0) + (st.won && st.wonEarly ? 1 : 0) - wrong().length);
    const maxC = STATIONS.length + 2;
    // the day ends when the pilgrim is named, the three guesses are spent, or the player asks to be told
    const over = () => st.won || wrong().length >= MAX_WRONG || !!st.gaveUp;
    const clue = (id) => ({
      word: `${X("Role", "Función")}: ${g.mask(g.p.role)} · ${X("Era", "Época")}: ${g.p.era}`,
      place: g.pl ? `${g.mask(g.ev.q)} ${g.pl.name}.` : "",
      verse: g.verse ? `${g.verse.text.replace("_____", g.verse.ans)} (${C().refLabel(g.verse.ref)})` : "",
      family: `${X("Relatives", "Familiares")}: ${g.family.right.map((id) => g.family.label[id]).join(", ")}`,
    }[id]);
    root.innerHTML = `<div class="game pilgrim">
      <div class="ghead"><button class="back" data-go="play">‹ ${X("Games", "Juegos")}</button><h1>${X("Pilgrimage", "Peregrinación")}</h1><span class="qmeta">#${n}</span></div>
      <p class="lede">${X(`Someone from Scripture is today's pilgrim. Visit the stations; each one you complete reveals a clue. Name the pilgrim as early as you can to light more candles. You have ${MAX_WRONG} guesses.`, `Un personaje de la Escritura es el peregrino de hoy. Visita las estaciones; cada una que completes revela una pista. Adivina quién es lo antes posible para encender más velas. Tienes ${MAX_WRONG} intentos.`)}</p>
      <div class="candles" id="pcand" role="img"></div>
      <ol class="stations" id="pst"></ol>
      <div class="pguess" id="pguess"></div>
      <div id="pdone"></div></div>`;
    const here = () => root.contains($("#pst", root)) && mine === mountId; // still this game on screen
    function drawCandles() { const c = candles(); $("#pcand", root).setAttribute("aria-label", `${c} / ${maxC} ${X("candles", "velas")}`); $("#pcand", root).innerHTML = Array.from({ length: maxC }, (_, i) => `<span class="cdl ${i < c ? "lit" : ""}" aria-hidden="true"></span>`).join("") + `<span class="qmeta" aria-hidden="true">${c} / ${maxC} ${X("candles", "velas")}</span>`; }
    function drawStations() {
      $("#pst", root).innerHTML = STATIONS.map((x, i) => {
        const done = st.done[x.id] || over();
        return `<li class="station${done ? " done" : ""}${!done && i === firstOpen() ? " open" : ""}" data-st="${x.id}">
          <div class="sthead"><span class="sticon" aria-hidden="true">${x.icon}</span><b>${esc(x.name)}</b>${done ? `<span class="qmeta">${st.good[x.id] ? "✓" : "·"}</span>` : ""}</div>
          ${done ? `<p class="clue">${esc(clue(x.id))}</p>` : `<p class="qmeta">${esc(x.hint)}</p><div class="stbody"></div>`}</li>`;
      }).join("");
      const open = root.querySelector(".station.open .stbody");
      if (open) mountStation(open.closest(".station").dataset.st, open);
    }
    const firstOpen = () => STATIONS.findIndex((x) => !st.done[x.id]);
    function finishStation(id, good) { if (st.done[id] || over()) return; st.done[id] = true; st.good[id] = good; save(); refresh(); }
    function mountStation(id, el) {
      if (id === "word") {
        let cur = [];
        const letters = [...g.scr];
        const draw = (missed) => {
          el.innerHTML = `<div class="tiles">${letters.map((ch, i) => `<button class="lt${cur.includes(i) ? " used" : ""}" data-i="${i}"${cur.includes(i) ? " disabled" : ""}>${ch}</button>`).join("")}</div>
            <div class="answer${missed ? " shake" : ""}" aria-live="polite">${cur.map((i) => letters[i]).join("") || (missed ? X("Not that; try again", "Así no; prueba otra vez") : "&nbsp;")}</div>
            <div class="gbtns"><button class="ghost small" id="wback" aria-label="${X("Delete", "Borrar")}"${cur.length ? "" : " disabled"}>⌫</button><button class="ghost small" id="wskip">${X("Reveal", "Revelar")}</button></div>`;
          el.querySelectorAll(".lt").forEach((b) => b.onclick = () => {
            const i = +b.dataset.i; if (cur.includes(i)) return;
            cur.push(i);
            if (cur.length < letters.length) return draw();
            if (cur.map((k) => letters[k]).join("") === g.word) return finishStation("word", true);
            cur = []; draw(true);
          });
          el.querySelector("#wback").onclick = () => { cur.pop(); draw(); };
          el.querySelector("#wskip").onclick = () => finishStation("word", false);
        };
        draw();
      } else if (id === "place") {
        el.innerHTML = `<p><b>${esc(g.mask(g.ev.q))}</b></p><div class="tapmap small"><svg role="img" aria-label="${X("Map", "Mapa")}"></svg></div><div class="gbtns"><button class="qnext" disabled>${X("Lock in", "Confirmar")}</button><span class="qmeta">${X("Tap the map to drop a pin.", "Toca el mapa para marcar un punto.")}</span></div>`;
        const svgEl = el.querySelector("svg"), btn = el.querySelector("button");
        const near = inBox(g.pl, EXTENTS.near.box);
        const b = EXTENTS[near ? "near" : "wide"].box;
        const svg = d3.select(svgEl);
        let pin = null, locked = false, proj = null;
        // drawn to the size the map has now; a turned phone or a resized window redraws it with the pin kept
        const paint = () => {
          const W = svgEl.clientWidth, H = svgEl.clientHeight;
          if (!W || !H) return;
          svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
          proj = d3.geoMercator().fitSize([W, H], { type: "MultiPoint", coordinates: [[b[0], b[1]], [b[2], b[3]]] });
          const path = d3.geoPath(proj);
          svg.selectAll("*").remove();
          mapBase(svg, proj, path, W, H, "pilclip");
          if (pin) { const [x, y] = proj(pin); svg.append("circle").attr("class", "pin").attr("cx", x).attr("cy", y).attr("r", 6); }
          if (locked) { const a = proj([g.pl.lon, g.pl.lat]); svg.append("circle").attr("class", "ans").attr("cx", a[0]).attr("cy", a[1]).attr("r", 6); }
        };
        watchSize(svgEl, paint);
        svg.on("click", (e) => { if (locked || !proj) return; pin = proj.invert(d3.pointer(e, svgEl)); paint(); btn.disabled = false; });
        btn.onclick = () => {
          if (!pin || locked) return;
          locked = true; btn.disabled = true; paint();
          window.BPM_HABIT?.collect("places", g.pl.id);
          const good = haversine(pin, [g.pl.lon, g.pl.lat]) <= (near ? 25 : 300);
          // a moment to see where it was; if the player has left by then, the station is still settled
          setTimeout(() => { if (here()) finishStation("place", good); else if (!st.done.place && !over()) { st.done.place = true; st.good.place = good; save(); } }, 900);
        };
      } else if (id === "verse") {
        el.innerHTML = `<p class="vq">“${esc(g.verse.text)}” <span class="qmeta">${esc(C().refLabel(g.verse.ref))}</span></p><div class="qopts">${g.verse.opts.map((o) => `<button data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
        el.querySelectorAll("[data-o]").forEach((b) => b.onclick = () => finishStation("verse", b.dataset.o === g.verse.ans));
      } else if (id === "family") {
        const sel = new Set();
        const draw = (focus) => {
          el.innerHTML = `<p>${X(`Choose the ${g.family.right.length} relatives of today's pilgrim.`, `Elige a los ${g.family.right.length} familiares del peregrino de hoy.`)}</p>
            <div class="chips">${g.family.opts.map((id) => `<button class="pchip${sel.has(id) ? " on" : ""}" data-f="${id}" aria-pressed="${sel.has(id)}">${esc(g.family.label[id])}</button>`).join("")}</div>
            <div class="gbtns"><button class="qnext" id="fok" ${sel.size === g.family.right.length ? "" : "disabled"}>${X("Check", "Comprobar")}</button></div>`;
          el.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { const id = b.dataset.f; sel.has(id) ? sel.delete(id) : sel.size < g.family.right.length && sel.add(id); draw(id); });
          el.querySelector("#fok").onclick = () => finishStation("family", g.family.right.every((id) => sel.has(id)));
          if (focus) el.querySelector(`[data-f="${focus}"]`)?.focus({ preventScroll: true });
        };
        draw();
      }
    }
    function drawGuess(note) {
      if (over()) { $("#pguess", root).innerHTML = ""; return; }
      const len = g.p.name.length, typed = $("#pgi", root)?.value || "", left = MAX_WRONG - wrong().length;
      $("#pguess", root).innerHTML = `<form id="pgf" class="findform"><label for="pgi">${X("Who is the pilgrim?", "¿Quién es el peregrino?")}</label>
        <input id="pgi" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="send" maxlength="${Math.max(len, ...g.names.map((x) => x.length))}" placeholder="${"_ ".repeat(len).trim()}" aria-label="${X(`Who is the pilgrim? ${len} letters`, `¿Quién es el peregrino? ${len} letras`)}"><button class="qnext">${X("Guess", "Adivinar")}</button>${allDone() ? `<button type="button" class="ghost" id="pgive">${X("Show me", "Mostrar respuesta")}</button>` : ""}</form>
        <p class="qmeta" id="pgnote" aria-live="polite">${len} ${X("letters", "letras")} · ${X(left === 1 ? "1 guess left" : `${left} guesses left`, left === 1 ? "queda 1 intento" : `quedan ${left} intentos`)} · ${X("a wrong guess blows out a candle", "cada error apaga una vela")}${wrong().length ? ` · ${wrong().map(esc).join(", ")}` : ""}</p>`;
      $("#pgi", root).value = typed;
      if (note) { const el = $("#pgnote", root); el.dataset.msg = note; el.classList.add("pulse"); }
      $("#pgf", root).onsubmit = (e) => {
        e.preventDefault();
        const v = $("#pgi", root).value.trim();
        if (!v || over()) return;
        if (g.names.some((nm) => plain(nm) === plain(v))) { st.won = true; st.wonEarly = !allDone(); st.guesses.push("✓"); }
        else if (wrong().some((x) => plain(x) === plain(v))) { $("#pgi", root).value = ""; return drawGuess(X("Already guessed", "Ya lo intentaste")); }
        else st.guesses.push(v);
        save(); $("#pgi", root).value = "";
        // a miss only costs a candle; the station in progress is left as the player has it
        if (over()) refresh(); else { drawCandles(); drawGuess(X("Not the pilgrim", "No es el peregrino")); $("#pgi", root).focus(); }
      };
      const give = $("#pgive", root);
      if (give) give.onclick = () => { st.gaveUp = true; save(); refresh(); };
    }
    function finish() {
      if (!over()) { $("#pdone", root).innerHTML = ""; return; }
      const c = candles();
      record("pilgrim", { won: st.won, candles: c }, dk);
      $("#pdone", root).innerHTML = `<div class="qcard"><span class="eyebrow">${st.won ? X("You found today's pilgrim", "Encontraste al peregrino de hoy") : X("Today's pilgrim was", "El peregrino de hoy era")}</span>
        <h2>${esc(g.p.name)}</h2><p>${esc(g.p.summary)}</p><div class="chips">${C().chip(g.p.id)}</div>
        <p class="qmeta">${c} / ${maxC} ${X("candles", "velas")} · ${streakText("pilgrim")}</p>
        <button class="qnext" id="pshare">${X("Share result", "Compartir resultado")}</button></div>`;
      $("#pshare", root).onclick = (e) => share(`The Daily Catholic · ${X("Pilgrimage", "Peregrinación")} #${n}\n${STATIONS.map((x) => (st.good[x.id] ? "🕯️" : "▫️")).join("")}${st.won ? (st.wonEarly ? " ✨" : " ✝️") : " ✖️"}  ${c}/${maxC}\n${SITE}`, e.currentTarget,
        { title: X("Pilgrimage", "Peregrinación"), sub: cardSub(dk), cells: [Array.from({ length: maxC }, (_, i) => (i < c ? "on" : "off"))], big: `${c} / ${maxC} ${X("candles", "velas")}` });
    }
    function refresh() { drawCandles(); drawStations(); drawGuess(); finish(); }
    refresh();
  }

  /* =====================================================================
     HUB
     ===================================================================== */
  const GAMES = [
    { id: "pilgrim", get name() { return X("Pilgrimage", "Peregrinación"); }, get desc() { return X("Our signature game: four stations, one hidden figure from Scripture.", "Nuestro juego principal: cuatro estaciones, un personaje bíblico oculto."); }, needs: "places" },
    { id: "loaves", name: "Five Loaves", get desc() { return X("Guess the five-letter word of faith in six tries.", "Adivina la palabra de fe de cinco letras en seis intentos."); }, needs: "wordle" },
    { id: "threads", name: "Threads", get desc() { return X("Find the hidden names in a grid of letters. One golden thread names today's theme.", "Encuentra los nombres ocultos en una cuadrícula de letras. Un hilo de oro nombra el tema."); }, needs: "themes" },
    { id: "links", name: "Lineage Links", get desc() { return X("Sixteen people, four hidden groups. Find what connects them.", "Dieciséis personas, cuatro grupos ocultos. Descubre qué los une."); }, needs: "themes" },
    { id: "acrostic", name: "Hidden Name", get desc() { return X("Solve the clues; their first letters spell a mystery figure.", "Resuelve las pistas; sus primeras letras forman un nombre misterioso."); }, needs: null },
    { id: "tap", name: "Holy Land Tap", get desc() { return X("Five moments from Scripture. Tap where on the map they happened.", "Cinco momentos de la Escritura. Toca en el mapa dónde ocurrieron."); }, needs: "places" },
    { id: "quiz", get name() { return X("Daily Quiz", "Quiz diario"); }, get desc() { return X("Five questions on who's who, in three difficulty levels.", "Cinco preguntas sobre personajes bíblicos, en tres niveles."); }, needs: null },
  ];
  // one small line drawing per game, so the hub reads at a glance
  const gicon = (d) => `<svg class="gico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const GAME_ICONS = {
    pilgrim: '<path d="M12 3v18M7 8h10"/><path d="M5 21h14"/>',
    loaves: '<path d="M4 13a8 5 0 0 1 16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 11.5v3M12 10.5v4M15 11.5v3"/>',
    threads: '<circle cx="5" cy="6" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="7" r="1.6"/><circle cx="8" cy="18" r="1.6"/><path d="M6.3 7.100l4.400 3.800M13.400 11l4.3-3M11 13.3l-2 3.3"/>',
    links: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/><path d="M11 7.5h4a2 2 0 0 1 2 2V13"/>',
    acrostic: '<path d="M5 6h3M5 12h3M5 18h3"/><path d="M11 6h8M11 12h8M11 18h5"/>',
    tap: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.800-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.2"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.400-1.100.9-1.100 1.800"/><path d="M12 16.800v.2"/>',
  };
  // One game is the day's headline, in turn through the week, so there is one clear thing to play;
  // Sunday is always Pilgrimage, our own game. Decided by the date alone: the same for everyone.
  const WEEK = ["pilgrim", "loaves", "threads", "links", "tap", "acrostic", "quiz"];
  const featured = (dk = dayKey()) => GAMES.find((g) => g.id === WEEK[new Date(dk + "T12:00").getDay()]);
  function renderHub(root) {
    const ctx = C();
    prune();
    const explored = ctx.explored();
    const feat = featured(), played = GAMES.filter((g) => playedToday(g.id)).length;
    const card = (g) => {
      const done = playedToday(g.id), s = streak(g.id);
      return `<button class="gcard${done ? " done" : ""}${g === feat ? " featured" : ""}" data-go="${g.id}">${g === feat ? `<span class="eyebrow">${X("Today's featured game", "El juego destacado de hoy")}</span>` : ""}<span class="gname">${gicon(GAME_ICONS[g.id] || "")}${g.name}</span><span class="gdesc">${g.desc}</span>
        <span class="gstat">${done ? X("✓ Played today", "✓ Jugado hoy") : X("Ready", "Listo")}${s ? ` · ${X(`${s}-day streak`, `racha de ${s} días`)}` : ""}</span></button>`;
    };
    root.innerHTML = `<div class="hub">
      <div class="ghead"><h1>${X("Play", "Jugar")}</h1><span class="qmeta">${new Date().toLocaleDateString(window.I18N?.locale(), { weekday: "long", month: "long", day: "numeric" })} · ${X("new puzzles every day", "nuevos juegos cada día")}</span></div>
      ${window.BPM_HABIT?.flame() || ""}
      <div class="gcards one">${card(feat)}</div>
      <h2>${X("More games today", "Más juegos de hoy")}</h2>
      <p class="qmeta">${played === GAMES.length ? X("All seven played. That's everything for today.", "Los siete jugados. Eso es todo por hoy.") : X(`${played} of ${GAMES.length} played today`, `${played} de ${GAMES.length} jugados hoy`)}</p>
      <div class="gcards">${GAMES.filter((g) => g !== feat).map(card).join("")}</div>
      <h2>${X("Your progress", "Tu progreso")}</h2>
      <p class="qmeta">${X(`You've opened ${explored} of ${ctx.PEOPLE.length} people.`, `Has abierto ${explored} de ${ctx.PEOPLE.length} personas.`)}</p>
      <div class="gbtns"><a class="ghost" href="#collection">${X("My pilgrimage: saints, places, books and badges", "Mi camino: santos, lugares, libros e insignias")} ›</a></div>
    </div>`;
  }

  // counts every mount, so a game that was still loading when the player moved on does not draw over the next view
  let mountId = 0, watched = [];
  // size observers belong to the game on screen; they are stopped when it leaves
  function watchSize(el, f) { const ro = new ResizeObserver(f); ro.observe(el); watched.push(ro); }
  async function mount(view, root) {
    mountId++;
    // the last game's listeners go with it (letter keys, drag tracking, size observers, the quiz's answer buttons)
    threadsAbort?.abort(); loavesAbort?.abort(); root.onclick = null;
    for (const ro of watched.splice(0)) ro.disconnect();
    try {
      if (view === "play") return renderHub(root);
      if (view === "threads" || view === "links") { await themes(); return view === "threads" ? renderThreads(root) : renderLinks(root); }
      if (view === "acrostic") return renderAcrostic(root);
      if (view === "loaves") return renderLoaves(root);
      if (view === "pilgrim") return renderPilgrimage(root);
      if (view === "tap") return renderTap(root);
    } catch (e) {
      root.innerHTML = `<p class="loading">${X("This game could not load", "Este juego no se pudo cargar")} (${esc(e.message)}). ${X("Reload to try again.", "Recarga la página para intentarlo de nuevo.")}</p>`;
    }
  }
  window.BPM_GAMES = { mount, playedToday, streak, GAMES, dayKey, featured, icon: (id) => gicon(GAME_ICONS[id] || ""), onMap: (p) => inBox(p, EXTENTS.wide.box), _score: scoreGuess, _pilgrim: (d) => pickPilgrim(d), _build: { threads: buildThreads, links: buildLinks, acrostic: buildAcrostic, tap: (d) => (PLACES ? buildTap(d) : null) }, _acrosticClues: (pz) => pz.clues.map(acrosticClue), _tapScore: tapScore };
})();
