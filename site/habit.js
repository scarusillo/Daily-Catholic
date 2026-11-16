/* The daily habit: one app-wide streak ("days with God") with rest days, what has been collected
   (saints met, places visited, books heard), the My pilgrimage page, picture share cards, and
   the backup of everything saved on this device. Nothing here leaves the device. */
(() => {
  "use strict";
  const C = () => window.BPM;
  const X = (en, es) => (window.I18N?.lang === "es" ? es : en);
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SITE = () => window.BPM_CONFIG?.siteUrl || "https://scarusillo.github.io/Daily-Catholic/";
  const DAY = /^\d{4}-\d\d-\d\d$/;
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const noon = (dk) => new Date(dk + "T12:00");
  const between = (a, b) => Math.round((noon(b) - noon(a)) / 864e5);
  const GAMES = ["pilgrim", "loaves", "threads", "links", "acrostic", "tap", "quiz"];
  // this file loads before app.js, so it reads storage itself (same rules as the app's store)
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return (v ? JSON.parse(v) : d) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

  /* ---------- state: one versioned key ----------
     "bpm.habit" = { v, days: { "YYYY-MM-DD": ["flow" | "game" | "pray" | "gospel", ...] },
       ritual: { day: { pos, steps: { word | witness | play | amen: "done" | "skip" }, done } },
       saints: { id: first day met }, places: { id: 1 }, books: { id: 1 } }
     Game results (bpm.g.<game>), prayers (bpm.prayed) and people opened (bpm.seen) keep their own keys;
     their days are folded in here every time, so a returning player starts with the streak already earned. */
  const KEY = "bpm.habit", V = 1;
  function load() {
    const raw = ls.get(KEY, null), s = obj(raw);
    // a save from a newer version of the app is read as far as it is understood, never thrown away
    const st = { ...s, v: Math.max(V, +s.v || 0), days: obj(s.days), ritual: obj(s.ritual), saints: obj(s.saints), places: obj(s.places), books: obj(s.books) };
    for (const k of Object.keys(st.days)) if (!DAY.test(k) || !Array.isArray(st.days[k])) delete st.days[k];
    return st;
  }
  const save = (st) => ls.set(KEY, st);
  // days earned elsewhere: every finished game and every guided prayer
  function fold(st) {
    let changed = false;
    const add = (dk, kind) => { if (!DAY.test(dk)) return; const a = (st.days[dk] ??= []); if (!a.includes(kind)) { a.push(kind); changed = true; } };
    for (const g of GAMES) for (const dk of Object.keys(obj(obj(ls.get(`bpm.g.${g}`, null)).days))) add(dk, "game");
    for (const dk of Object.keys(obj(ls.get("bpm.quizHist", null)))) add(dk, "game");
    for (const [dk, kinds] of Object.entries(obj(ls.get("bpm.prayed", null)))) if (Array.isArray(kinds) && kinds.length) add(dk, "pray");
    return changed;
  }
  function state() { const st = load(); if (fold(st) || !ls.get(KEY, null)) save(st); return st; }

  /* ---------- the streak ----------
     A day counts when anything was done: the Start today steps, a game, a guided prayer, or the Gospel read.
     Rest days keep it gentle: you begin with one, every seven days in a row earn another (two at most), and a
     missed day uses one by itself. Today never counts against you until it is over. */
  const REST_START = 1, REST_MAX = 2, REST_EVERY = 7;
  function summary(today = dayKey()) {
    const st = state(), ds = Object.keys(st.days).filter((k) => st.days[k].length && k <= today).sort();
    let run = 0, best = 0, rest = REST_START, since = 0, prev = null, rested = 0;
    for (const dk of ds) {
      const gap = prev ? between(prev, dk) - 1 : 0;
      if (gap > 0) { if (run && gap <= rest) { rest -= gap; rested += gap; } else { run = 0; since = 0; } }
      run++; since++;
      if (since >= REST_EVERY) { since = 0; rest = Math.min(REST_MAX, rest + 1); }
      best = Math.max(best, run); prev = dk;
    }
    const doneToday = prev === today;
    let resting = 0;
    if (prev && !doneToday) { const gap = between(prev, today) - 1; if (gap > 0) { if (gap <= rest) { rest -= gap; resting = gap; } else run = 0; } }
    return { current: run, best, total: ds.length, rest, doneToday, resting, rested: rested + resting, toNext: REST_EVERY - since };
  }
  const nDays = (n) => X(n === 1 ? "1 day" : `${n} days`, n === 1 ? "1 día" : `${n} días`);
  // never a bare zero: in the morning the streak still stands, and after a break it is simply a new start
  function flameText(s = summary()) {
    if (s.current && s.doneToday) return X(`${nDays(s.current)} with God`, `${nDays(s.current)} con Dios`);
    if (s.current) return X(`${nDays(s.current)} with God · keep it going today`, `${nDays(s.current)} con Dios · sigue hoy`);
    return s.total ? X("A fresh start today", "Hoy, un nuevo comienzo") : X("Begin your first day with God", "Empieza tu primer día con Dios");
  }
  const FLAME = `<svg class="flico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2c1 3.200 4.500 5.300 4.500 9.700A4.500 4.500 0 0 1 12 16.500a4.500 4.500 0 0 1-4.500-4.800c0-1.500.6-2.700 1.500-3.700.2 1.300.8 2.200 1.700 2.700C10.200 8 10.700 4.500 12 2z"/><path fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" d="M7 20.500h10"/></svg>`;
  // the streak as a button to My pilgrimage; redrawn wherever it stands when the day is earned
  const flame = () => { const s = summary(); return `<a class="flame${s.doneToday ? " lit" : ""}" href="#collection" data-flame>${FLAME}<span>${esc(flameText(s))}</span></a>`; };
  function redraw() { document.querySelectorAll("[data-flame]").forEach((el) => { const t = document.createElement("template"); t.innerHTML = flame(); el.replaceWith(t.content.firstChild); }); }

  /* ---------- recording ---------- */
  let asked = false;
  // browsers may clear the storage of a site that is not installed; after the first real action, ask them to keep it
  function persist() {
    if (asked) return; asked = true;
    try { navigator.storage?.persist?.()?.catch?.(() => {}); } catch { /* not supported */ }
  }
  function changed(detail) {
    persist(); mirror(); redraw();
    try { window.dispatchEvent(new CustomEvent("bpm:habit", { detail })); } catch { /* very old browsers */ }
  }
  function mark(kind, dk = dayKey()) {
    const st = state(), a = (st.days[dk] ??= []);
    if (a.includes(kind)) return changed({ kind, dk }); // already earned (a game's day is folded in on read); still tell the page
    a.push(kind); save(st); changed({ kind, dk });
  }
  // saints met, places visited, books heard; returns true the first time
  function collect(what, id) {
    if (!id || !["saints", "places", "books"].includes(what)) return false;
    const st = state();
    if (st[what][id]) return false;
    st[what][id] = what === "saints" ? dayKey() : 1; save(st); persist(); mirror();
    return true;
  }
  const has = (what, id) => !!state()[what]?.[id];
  const count = (what) => Object.keys(obj(state()[what])).length;
  // today's Start today steps
  function ritual(dk = dayKey()) { const r = obj(state().ritual[dk]); return { pos: +r.pos || 0, steps: obj(r.steps), done: !!r.done, news: Array.isArray(r.news) ? r.news : [] }; }
  function setRitual(r, dk = dayKey()) {
    const st = state(); st.ritual[dk] = r;
    const keep = Object.keys(st.ritual).sort().slice(-60); // two months of steps is plenty
    for (const k of Object.keys(st.ritual)) if (!keep.includes(k)) delete st.ritual[k];
    save(st);
  }
  window.addEventListener("bpm:prayed", () => mark("pray"));

  /* ---------- backup: a file the person keeps ---------- */
  const mine = (k) => k.startsWith("bpm.");
  function exportData() {
    const keys = {};
    try { for (const k of Object.keys(localStorage)) if (mine(k)) keys[k] = localStorage.getItem(k); } catch { /* storage unavailable */ }
    return { app: "the-daily-catholic", v: V, exported: new Date().toISOString(), keys };
  }
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(exportData())], { type: "application/json" }));
    a.download = `daily-catholic-backup-${dayKey()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Restores a backup. Days, collections and game results are merged with what is here, so nothing earned is lost.
  function importData(data) {
    const keys = obj(obj(data).keys);
    if (obj(data).app !== "the-daily-catholic" || !Object.keys(keys).some(mine)) return false;
    const parse = (v) => { try { return JSON.parse(v); } catch { return null; } };
    const before = state();
    for (const [k, v] of Object.entries(keys)) {
      if (!mine(k) || typeof v !== "string" || parse(v) === null) continue;
      let val = parse(v);
      if (k === KEY) {
        const inc = obj(val), cur = before;
        const days = { ...obj(inc.days) };
        for (const [dk, a] of Object.entries(cur.days)) days[dk] = [...new Set([...(Array.isArray(days[dk]) ? days[dk] : []), ...a])];
        val = { ...inc, v: Math.max(V, +inc.v || 0), days, ritual: { ...obj(inc.ritual), ...cur.ritual }, saints: { ...cur.saints, ...obj(inc.saints) }, places: { ...obj(inc.places), ...cur.places }, books: { ...obj(inc.books), ...cur.books } };
      } else if (/^bpm\.g\.\w+$/.test(k) || k === "bpm.seen" || k === "bpm.prayed" || k === "bpm.quizHist") {
        const cur = obj(ls.get(k, null)), inc = obj(val);
        val = k.startsWith("bpm.g.") ? { ...inc, days: { ...obj(inc.days), ...obj(cur.days) } } : { ...inc, ...cur };
      }
      ls.set(k, val);
    }
    state(); mirror(); redraw();
    return true;
  }
  // In the phone app the same backup is also kept in the app's own preferences, which iOS does not clear
  // when storage runs low; if the web storage comes back empty, it is restored from there.
  const prefs = () => window.Capacitor?.Plugins?.Preferences;
  let mirrorT = 0;
  function mirror() {
    const P = prefs(); if (!P) return;
    clearTimeout(mirrorT);
    mirrorT = setTimeout(() => { try { P.set({ key: "bpm.backup", value: JSON.stringify(exportData()) })?.catch?.(() => {}); } catch { /* not available */ } }, 500);
  }
  async function restore() {
    const P = prefs();
    try {
      if (!P || localStorage.getItem(KEY)) return;
      const r = await P.get({ key: "bpm.backup" });
      if (r?.value && importData(JSON.parse(r.value))) window.dispatchEvent(new Event("hashchange")); // draw the page again with what came back
    } catch { /* nothing to restore */ }
  }
  restore();

  /* ---------- picture share cards ----------
     A 1080×1350 picture (the size Instagram, WhatsApp and Messages show whole) drawn on a canvas in the app's own
     colours and fonts. spec: { title, sub, cells: [[colour key]], rows: [text], big, streak, foot }. No answers on it. */
  const INK = { lapis: "#27448f", deep: "#1c3270", gold: "#d8b35c", vellum: "#eef0f3" };
  const CELL = { correct: "#d8b35c", present: "#8ea8f0", absent: "rgba(255,255,255,.14)", 1: "#d8b35c", 2: "#7fb27a", 3: "#8ea8f0", 4: "#b48ad0", on: "#d8b35c", off: "rgba(255,255,255,.14)" };
  const EMOJI = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  const blobs = new Map();
  async function card(spec) {
    const k = JSON.stringify([spec, window.I18N?.lang]);
    if (blobs.has(k)) return blobs.get(k);
    try {
      await document.fonts.ready;
      await Promise.all([`700 96px "Alegreya"`, `400 44px "Alegreya"`, `700 44px "Alegreya SC"`, `500 40px "Alegreya Sans"`, `700 40px "Alegreya Sans"`].map((f) => document.fonts.load(f)));
    } catch { /* the fallback serif is used */ }
    const W = 1080, H = 1350, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, INK.lapis); bg.addColorStop(1, INK.deep);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = INK.gold; g.lineWidth = 4; g.strokeRect(36, 36, W - 72, H - 72);
    g.lineWidth = 1.5; g.strokeRect(50, 50, W - 100, H - 100);
    // the cross from the app icon
    g.lineWidth = 12; g.lineCap = "round";
    g.beginPath(); g.moveTo(W / 2, 110); g.lineTo(W / 2, 230); g.moveTo(W / 2 - 38, 150); g.lineTo(W / 2 + 38, 150); g.stroke();
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    const fit = (text, font, size, max) => { do { g.font = font.replace("%", size); size -= 4; } while (g.measureText(text).width > max && size > 24); };
    g.fillStyle = INK.gold; g.font = `700 44px "Alegreya SC", Georgia, serif`;
    try { g.letterSpacing = "4px"; } catch { /* older browsers */ }
    g.fillText("The Daily Catholic", W / 2, 310);
    try { g.letterSpacing = "0px"; } catch { /* older browsers */ }
    g.fillStyle = "#fff"; fit(spec.title || "", `700 %px "Alegreya", Georgia, serif`, 104, W - 200);
    g.fillText(spec.title || "", W / 2, 440);
    if (spec.sub) { g.fillStyle = INK.vellum; g.globalAlpha = 0.85; fit(spec.sub, `500 %px "Alegreya Sans", sans-serif`, 46, W - 220); g.fillText(spec.sub, W / 2, 510); g.globalAlpha = 1; }
    // the result: coloured squares, lines of symbols, or one large line
    const top = 580, bottom = spec.streak ? 1040 : 1120, mid = (top + bottom) / 2;
    if (spec.cells?.length) {
      const rows = spec.cells.length, cols = Math.max(...spec.cells.map((r) => r.length));
      const sz = Math.min(96, (bottom - top - (spec.big ? 110 : 0)) / rows - 12, (W - 300) / cols - 12), gw = cols * (sz + 12) - 12;
      const y0 = mid - (rows * (sz + 12) - 12 + (spec.big ? 110 : 0)) / 2;
      spec.cells.forEach((row, r) => row.forEach((c, i) => { g.fillStyle = CELL[c] || CELL.off; g.beginPath(); g.roundRect((W - gw) / 2 + i * (sz + 12), y0 + r * (sz + 12), sz, sz, sz * 0.16); g.fill(); }));
      if (spec.big) { g.fillStyle = "#fff"; g.font = `700 84px "Alegreya", Georgia, serif`; g.fillText(spec.big, W / 2, y0 + rows * (sz + 12) + 80); }
    } else {
      const lines = [...(spec.rows || [])], lh = 104;
      let y = mid - ((lines.length + (spec.big ? 1.4 : 0)) * lh) / 2 + 76;
      for (const t of lines) { fit(t, `% ${EMOJI}`.replace("%", "%px"), 80, W - 200); g.fillStyle = "#fff"; g.fillText(t, W / 2, y); y += lh; }
      if (spec.big) { g.fillStyle = "#fff"; fit(spec.big, `700 %px "Alegreya", Georgia, serif`, 132, W - 220); g.fillText(spec.big, W / 2, y + 60); }
    }
    if (spec.streak) {
      const t = spec.streak; g.font = `700 50px "Alegreya Sans", sans-serif`;
      const tw = g.measureText(t).width, x = (W - tw - 60) / 2;
      g.save(); g.translate(x, 1076); g.scale(2.2, 2.2); g.fillStyle = INK.gold;
      g.fill(new Path2D("M12 2c1 3.2 4.5 5.3 4.5 9.700A4.500 4.500 0 0 1 12 16.500a4.500 4.500 0 0 1-4.500-4.800c0-1.500.6-2.700 1.500-3.700.2 1.300.8 2.200 1.700 2.700C10.200 8 10.700 4.500 12 2z")); g.restore();
      g.textAlign = "left"; g.fillStyle = INK.gold; g.fillText(t, x + 60, 1114); g.textAlign = "center";
    }
    if (spec.foot) { g.fillStyle = INK.vellum; g.globalAlpha = 0.9; fit(spec.foot, `400 italic %px "Alegreya", Georgia, serif`, 44, W - 200); g.fillText(spec.foot, W / 2, 1190); g.globalAlpha = 1; }
    g.fillStyle = INK.vellum; g.globalAlpha = 0.8; fit(SITE().replace(/^https?:\/\//, "").replace(/\/$/, ""), `500 %px "Alegreya Sans", sans-serif`, 38, W - 200);
    g.fillText(SITE().replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, 1262); g.globalAlpha = 1;
    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
    if (blob) { if (blobs.size > 8) blobs.clear(); blobs.set(k, blob); }
    return blob;
  }
  const streakLine = () => { const s = summary(); return s.current ? X(`${nDays(s.current)} with God`, `${nDays(s.current)} con Dios`) : ""; };
  // Share through the phone's own share sheet as a picture; where that is not possible, as text; else copy the text.
  async function share(text, btn, spec) {
    const label = (btn.dataset.label ??= btn.textContent);
    if (spec && navigator.share && navigator.canShare) {
      try {
        const blob = await card({ streak: streakLine(), ...spec });
        const file = blob && new File([blob], "daily-catholic.png", { type: "image/png" });
        if (file && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      } catch (e) { if (e?.name === "AbortError") return; /* closed the share sheet */ }
    }
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = X("Copied", "Copiado");
      setTimeout(() => { btn.textContent = label; }, 2000);
    } catch {
      let ta = btn.parentNode.querySelector(".sharebox");
      if (!ta) { ta = document.createElement("textarea"); ta.className = "sharebox"; ta.readOnly = true; ta.setAttribute("aria-label", label); btn.after(ta); }
      ta.value = text; ta.select(); btn.textContent = X("Select and copy the text below", "Selecciona y copia el texto de abajo");
    }
  }
  function shareStreak(btn) {
    const s = summary();
    const line = s.current ? X(`${nDays(s.current)} with God`, `${nDays(s.current)} con Dios`) : X("Starting today", "Empiezo hoy");
    return share(`The Daily Catholic · ${line}\n${X(`${s.total} days of prayer in all`, `${s.total} días de oración en total`)}\n${SITE()}`, btn,
      { title: X("Days with God", "Días con Dios"), big: String(s.current || s.total || 1), sub: X(`Best ${s.best} · ${s.total} in all`, `Mejor racha ${s.best} · ${s.total} en total`), streak: "",
        foot: X("“His mercies are new every morning.”", "«Su misericordia se renueva cada mañana.»") });
  }

  /* ---------- My pilgrimage: everything collected so far ---------- */
  const PRAYERS = { rosary: ["Rosary", "Rosario"], decade: ["One decade", "Un misterio"], chaplet: ["Divine Mercy Chaplet", "Coronilla de la Divina Misericordia"],
    stations: ["Stations of the Cross", "Vía Crucis"], angelus: ["Angelus", "Ángelus"], examen: ["Daily Examen", "Examen diario"] };
  let SAINTS = null, BYDATE = null, PLACES = null, PLACES_ES = null;
  function restText(s) {
    return X(`A day counts when you finish Start today, read the Gospel, pray a guided prayer or play a game. You begin with one rest day and earn another for every seven days in a row (two at most). If you miss a day, a rest day is used by itself and your days continue. Today only counts against you once it is over.`,
      `Un día cuenta cuando terminas «Empezar hoy», lees el Evangelio, rezas una oración guiada o juegas un juego. Empiezas con un día de descanso y ganas otro por cada siete días seguidos (dos como máximo). Si faltas un día, se usa un día de descanso automáticamente y tus días continúan. El día de hoy solo cuenta en tu contra cuando ha terminado.`)
      + (s.resting ? " " + X(s.resting === 1 ? "A rest day covered yesterday." : `Rest days covered the last ${s.resting} days.`, s.resting === 1 ? "Un día de descanso cubrió el día de ayer." : `Los días de descanso cubrieron los últimos ${s.resting} días.`) : "");
  }
  async function renderCollection(root) {
    const ctx = C(), es = window.I18N?.lang === "es", L = (o) => window.I18N.L(o);
    const draw = () => {
      const st = state(), s = summary();
      const of = (n, m, what) => X(`${n} of ${m} ${what[0]}`, `${n} de ${m} ${what[1]}`);
      const bar = (n, m) => `<span class="pbar wide"><i style="width:${m ? Math.min(100, (n / m) * 100) : 0}%"></i></span>`;
      // the saints there are to meet: every person with a card in the calendar, and the one remembered on each date
      const all = Object.fromEntries(Object.entries(SAINTS || {}).filter(([, e]) => !e.kind || e.kind === "saint" || e.kind === "mary"));
      for (const e of Object.values(BYDATE || {})) if (e?.id && !all[e.id]) all[e.id] = e;
      const met = Object.keys(st.saints).filter((id) => all[id]).sort((a, b) => String(st.saints[b]).localeCompare(String(st.saints[a])));
      const onMap = (PLACES || []).filter((p) => window.BPM_GAMES.onMap(p));
      const been = onMap.filter((p) => st.places[p.id]);
      const books = ctx.BOOKS, heard = books.filter((b) => st.books[b.id]);
      const prayed = obj(ls.get("bpm.prayed", null)), times = {};
      for (const kinds of Object.values(prayed)) if (Array.isArray(kinds)) for (const k of kinds) times[k] = (times[k] || 0) + 1;
      const kinds = Object.keys(PRAYERS), people = ctx.explored();
      const bname = (b) => (es ? window.I18N.T("books." + b.id) : b.name);
      root.innerHTML = `<div class="hub coll">
        <div class="ghead"><h1>${X("My pilgrimage", "Mi camino")}</h1></div>
        <section class="flamebox${s.doneToday ? " lit" : ""}">
          <div class="flnum">${FLAME}<b>${s.current || "✦"}</b></div>
          <div><h2>${esc(flameText(s))}</h2>
            <p class="qmeta">${X(`Best: ${nDays(s.best)}`, `Mejor racha: ${nDays(s.best)}`)} · ${X(`In all: ${nDays(s.total)}`, `En total: ${nDays(s.total)}`)} · ${X(`Rest days saved: ${s.rest}`, `Días de descanso guardados: ${s.rest}`)}</p></div>
          <p class="gfoot">${esc(restText(s))}</p>
          <div class="gbtns"><button class="qnext" id="cshare">${X("Share my days", "Compartir mis días")}</button><a class="ghost" href="#today">${X("Today", "Hoy")}</a></div>
        </section>
        <section class="tsec"><h2>${X("Books of the Bible heard", "Libros de la Biblia escuchados")}</h2>
          <p class="qmeta">${of(heard.length, books.length, ["books", "libros"])} · ${X("a book lights up when you open one of its readings", "un libro se ilumina cuando abres una de sus lecturas")}</p>${bar(heard.length, books.length)}
          <div class="bookgrid">${books.map((b) => `<span class="bk${st.books[b.id] ? " on" : ""}" title="${esc(bname(b))}">${esc(bname(b).replace(/^(\d) /, "$1").slice(0, 4))}<span class="sr">${st.books[b.id] ? X(", heard", ", escuchado") : ""}</span></span>`).join("")}</div></section>
        <section class="tsec"><h2>${X("Saints met", "Santos conocidos")}</h2>
          <p class="qmeta">${of(met.length, Object.keys(all).length, ["saints", "santos"])} · ${X("you meet a saint by reading their card on their day", "conoces a un santo al leer su ficha en su día")}</p>${bar(met.length, Object.keys(all).length)}
          ${met.length ? `<div class="chips">${met.map((id) => `<span class="stamp">${esc(L(all[id]).title || all[id].name)}</span>`).join("")}</div>` : ""}</section>
        <section class="tsec"><h2>${X("Holy Land places visited", "Lugares de Tierra Santa visitados")}</h2>
          <p class="qmeta">${of(been.length, onMap.length, ["places", "lugares"])} · ${X("from Holy Land Tap and Pilgrimage", "de Holy Land Tap y Peregrinación")}</p>${bar(been.length, onMap.length)}
          ${been.length ? `<div class="chips">${been.map((p) => `<span class="stamp">${esc((es && PLACES_ES?.[p.id]?.name) || p.name)}</span>`).join("")}</div>` : ""}
          <div class="gbtns"><a class="ghost" href="#tap">Holy Land Tap</a></div></section>
        <section class="tsec"><h2>${X("People of the Bible opened", "Personas de la Biblia abiertas")}</h2>
          <p class="qmeta">${of(people, ctx.PEOPLE.length, ["people", "personas"])}</p>${bar(people, ctx.PEOPLE.length)}
          <div class="gbtns"><a class="ghost" href="#people">${X("Meet someone new", "Conocer a alguien nuevo")}</a></div></section>
        <section class="tsec"><h2>${X("Devotions prayed", "Devociones rezadas")}</h2>
          <p class="qmeta">${of(kinds.filter((k) => times[k]).length, kinds.length, ["devotions", "devociones"])}</p>${bar(kinds.filter((k) => times[k]).length, kinds.length)}
          <div class="chips">${kinds.map((k) => `<span class="stamp${times[k] ? "" : " off"}">${esc(X(...PRAYERS[k]))}${times[k] ? ` · ${times[k]}` : ""}</span>`).join("")}</div>
          <div class="gbtns"><a class="ghost" href="#pray">${X("Pray", "Orar")}</a></div></section>
        <section class="tsec"><h2>${X("Badges", "Insignias")}</h2>
          <div class="badges">${ctx.badges().map((b) => `<div class="badge${b.got ? " got" : ""}"><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join("")}</div></section>
        <p class="gfoot">${X("All of this is kept only on this device.", "Todo esto se guarda solo en este dispositivo.")} <a href="#backup">${X("Back up my progress", "Hacer una copia de mi progreso")}</a></p>
      </div>`;
      $("#cshare", root).onclick = (e) => shareStreak(e.currentTarget);
    };
    draw();
    if (SAINTS && PLACES && (!es || PLACES_ES)) return;
    const get = (u) => ctx.getJSON(u).catch(() => null);
    [SAINTS, BYDATE, PLACES, PLACES_ES] = await Promise.all([SAINTS || get("data/saints.json"), BYDATE || get("data/saints_by_date.json"), PLACES || get("data/places.json"), PLACES_ES || (es ? get("data/places_es.json") : null)]);
    if (root.isConnected && !root.hidden && $(".coll", root)) draw();
  }

  window.BPM_HABIT = { summary, flame, flameText, flameIcon: FLAME, mark, collect, has, count, ritual, setRitual, share, shareStreak, renderCollection, exportData, download, importData, dayKey, nDays, _card: card, _state: state };
})();
