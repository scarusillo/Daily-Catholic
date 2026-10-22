/* Parish life: Music at Mass, Sacraments (what you'll need), Find a Mass (churches near you). */
(() => {
  "use strict";
  const C = () => window.BPM;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PUBLIC_SITE = window.BPM_CONFIG?.siteUrl || "https://scarusillo.github.io/Daily-Catholic/";
  const inClaude = () => !!window.claude?.use;
  const ES = () => window.I18N?.lang === "es";
  const X = (en, es) => (ES() ? es : en);

  /* =====================================================================
     MUSIC
     ===================================================================== */
  let MUSIC_EN = null, MUSIC_ES = null, MUSIC = null;
  // Spanish overlay: names/descriptions from music_es.json, titles unchanged
  function localMusic() {
    if (!ES() || !MUSIC_ES) return MUSIC_EN;
    const o = MUSIC_ES;
    return {
      parts: MUSIC_EN.parts.map((p) => ({ ...p, ...(o.parts?.[p.id] || {}) })),
      seasons: MUSIC_EN.seasons.map((x) => ({ ...x, ...(o.seasons?.[x.id] || {}) })),
      songs: MUSIC_EN.songs.map((x) => ({ ...x, about: o.songs?.[x.id]?.about || x.about })),
    };
  }
  async function renderMusic(root, songId) {
    const ctx = C();
    root.innerHTML = `<p class="loading">…</p>`;
    try {
      MUSIC_EN ??= await ctx.getJSON("data/music.json");
      if (ES()) MUSIC_ES ??= await ctx.getJSON("data/music_es.json").catch(() => null);
      MUSIC = localMusic();
    } catch { root.innerHTML = `<h1>${X("Music at Mass", "Música en la Misa")}</h1><p class="loading">…</p>`; return; }
    const S = Object.fromEntries(MUSIC.songs.map((s) => [s.id, s]));
    if (songId && S[songId]) return renderSong(root, S[songId], S);
    // which season is it?
    let season = null;
    try {
      const cal = await ctx.getJSON("data/calendar.json");
      const d = new Date(), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      season = { ordinary: "ordinary", advent: "advent", christmas: "christmas", lent: "lent", triduum: "holy-week", easter: "easter" }[cal[k]?.[0]];
    } catch { /* calendar optional */ }
    const filt = ctx.store.get("bpm.musicFilter", "");
    const groups = [...MUSIC.parts.map((p) => ({ id: p.id, name: p.name })), ...MUSIC.seasons.map((s) => ({ id: s.id, name: s.name }))];
    const cur = MUSIC.seasons.find((s) => s.id === season);
    root.innerHTML = `<div class="hub">
      <div class="ghead"><h1>${X("Music at Mass", "Música en la Misa")}</h1></div>
      <p class="lede">${X("The hymns, chants and songs you hear at church: what each part of the Mass is for, the Latin chants with their words, the classic hymns and the modern songs most parishes sing.", "Los himnos, cantos y canciones que se escuchan en la iglesia: para qué sirve cada parte de la Misa, los cantos latinos con su letra, los himnos clásicos y las canciones modernas que se cantan en la mayoría de las parroquias.")}</p>
      ${cur ? `<section class="tsec"><h2>${X("Now in", "Ahora en")} ${esc(cur.name)}</h2><p>${esc(cur.about)}</p><div class="chips">${cur.songs.filter((id) => S[id]).slice(0, 12).map((id) => `<button class="chip" data-song="${id}">${esc(S[id].title)}</button>`).join("")}</div></section>` : ""}
      <details class="mparts"><summary><h2>${X("The sung parts of the Mass", "Las partes cantadas de la Misa")}</h2></summary>
        <ol class="partlist">${MUSIC.parts.map((p) => `<li><b>${esc(p.name)}</b> <span class="qmeta">${esc(p.when || "")}</span><p>${esc(p.about)}</p>
          ${(p.examples || []).filter((id) => S[id]).length ? `<div class="chips">${p.examples.filter((id) => S[id]).slice(0, 8).map((id) => `<button class="chip" data-song="${id}">${esc(S[id].title)}</button>`).join("")}</div>` : ""}</li>`).join("")}</ol>
      </details>
      <div class="people-tools">
        <input id="mq" type="search" placeholder="${X("Search songs, composers, scripture", "Buscar canciones, compositores, Escritura")}" autocomplete="off">
        <select id="mf" aria-label="Filter"><option value="">${X("All songs", "Todas las canciones")}</option>${groups.map((g) => `<option value="${g.id}" ${g.id === filt ? "selected" : ""}>${esc(g.name)}</option>`).join("")}<option value="pd" ${filt === "pd" ? "selected" : ""}>${X("Latin chants with words", "Cantos latinos con letra")}</option></select>
      </div>
      <p class="count" id="mcount"></p>
      <ul class="plist" id="mlist"></ul>
      <p class="gfoot">${X("Latin chants are shown with their words and an English translation. For hymns, follow the link to Hymnary.org or use your parish hymnal; modern songs are listed with their composer and publisher.", "Los cantos latinos aparecen con su letra y una traducción al inglés. Para los himnos, sigue el enlace a Hymnary.org o usa el himnario de tu parroquia; las canciones modernas aparecen con su compositor y editorial.")}</p>
    </div>`;
    const draw = () => {
      const q = $("#mq", root).value.trim().toLowerCase(), f = $("#mf", root).value;
      ctx.store.set("bpm.musicFilter", f);
      const inGroup = (s) => !f || (f === "pd" ? !!s.lyrics : (s.uses || []).includes(f) || MUSIC.seasons.find((x) => x.id === f)?.songs.includes(s.id) || MUSIC.parts.find((x) => x.id === f)?.examples?.includes(s.id));
      const rows = MUSIC.songs.filter((s) => inGroup(s) && (!q || [s.title, s.latinTitle, s.composer, s.textAuthor, s.about, ...(s.scripture || [])].join(" ").toLowerCase().includes(q)));
      $("#mcount", root).textContent = `${rows.length} ${X("of", "de")} ${MUSIC.songs.length} ${X("songs", "canciones")}`;
      $("#mlist", root).innerHTML = rows.map((s) => `<li><button data-song="${s.id}"><b>${esc(s.title)}</b><span>${esc([s.composer || s.textAuthor, s.year].filter(Boolean).join(" · "))}${s.lyrics ? X(" · words", " · letra") : ""}</span></button></li>`).join("");
    };
    $("#mq", root).addEventListener("input", draw);
    $("#mf", root).addEventListener("change", draw);
    draw();
  }
  function renderSong(root, s, S) {
    const ctx = C();
    const tags = (s.uses || []).map((u) => MUSIC.parts.find((p) => p.id === u)?.name || MUSIC.seasons.find((x) => x.id === u)?.name).filter(Boolean);
    const verse = (v) => `<p>${v.map(esc).join("<br>")}</p>`;
    root.innerHTML = `<div class="game song">
      <div class="ghead"><button class="back" data-song="">‹ ${X("All music", "Toda la música")}</button></div>
      <h1>${esc(s.title)}</h1>
      ${s.latinTitle && s.latinTitle !== s.title ? `<p class="p-alias">${esc(s.latinTitle)}</p>` : ""}
      <p class="qmeta">${esc([s.textAuthor && `${X("Words", "Letra")}: ${s.textAuthor}`, s.composer && `${X("Music", "Música")}: ${s.composer}`, s.year, s.publisher].filter(Boolean).join(" · "))}</p>
      ${tags.length ? `<div class="chips">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
      ${s.about ? `<p>${esc(s.about)}</p>` : ""}
      ${(s.scripture || []).length ? `<div class="chips"><span class="qmeta">${X("Scripture:", "Escritura:")}</span>${s.scripture.map((r) => `<button class="ref" data-ref="${esc(r)}">${esc(ctx.refLabel(r))}</button>`).join("")}</div>` : ""}
      ${s.lyrics ? `<div class="lyrics${s.translation ? " two" : ""}"><div>${s.lyrics.map(verse).join("")}</div>${s.translation ? `<div class="tr"><span class="eyebrow">${X("In English", "En inglés")}</span>${s.translation.map(verse).join("")}</div>` : ""}</div>`
        : s.publicDomain
          ? `<p class="gfoot">${X("Read the words and hear the tune on", "Lee la letra y escucha la melodía en")} <a href="https://hymnary.org/search?qu=${encodeURIComponent(s.title)}" target="_blank" rel="noopener">Hymnary.org</a>${X(", a free hymn library.", ", una biblioteca gratuita de himnos.")}</p>`
          : `<p class="gfoot">${X("This song is under copyright, so its words aren't shown here. Find it in your parish hymnal or missalette", "Esta canción tiene derechos de autor, por eso su letra no aparece aquí. Búscala en el himnario o misalito de tu parroquia")}${s.publisher ? ` (${X("published by", "editorial")} ${esc(s.publisher)})` : ""}.</p>`}
    </div>`;
    window.scrollTo(0, 0);
  }

  /* =====================================================================
     SACRAMENTS
     ===================================================================== */
  let SAC_EN = null, SAC_ES = null;
  const LEVELS = {
    en: { "church-law": "Required by Church law", common: "Usually required", "if-applicable": "Only if it applies" },
    es: { "church-law": "Obligatorio por ley de la Iglesia", common: "Normalmente requerido", "if-applicable": "Solo si aplica" },
  };
  async function renderSacraments(root, id) {
    const ctx = C();
    root.innerHTML = `<p class="loading">…</p>`;
    let SAC;
    try {
      SAC_EN ??= await ctx.getJSON("data/sacraments.json");
      if (ES()) SAC_ES ??= await ctx.getJSON("data/sacraments_es.json").catch(() => null);
      SAC = ES() && SAC_ES ? SAC_ES : SAC_EN;
    } catch { root.innerHTML = `<h1>${X("Sacraments", "Sacramentos")}</h1><p class="loading">…</p>`; return; }
    const LEVEL = LEVELS[ES() ? "es" : "en"];
    const s = SAC.find((x) => x.id === id);
    if (!s) {
      root.innerHTML = `<div class="hub"><div class="ghead"><h1>${X("Sacraments: what you'll need", "Sacramentos: lo que necesitas")}</h1></div>
        <p class="lede">${X("Planning a baptism, wedding, confirmation, First Communion or funeral, or thinking about becoming Catholic? Pick one to see the paperwork to gather, who to call and what to expect. Tick items off as you go; your progress is saved on this device.", "¿Planeas un bautizo, una boda, una confirmación, una Primera Comunión o un funeral, o piensas hacerte católico? Elige uno para ver los documentos que debes reunir, a quién llamar y qué esperar. Marca cada documento cuando lo tengas; tu progreso se guarda en este dispositivo.")}</p>
        <div class="gcards">${SAC.map((x) => {
          const done = Object.values(ctx.store.get(`bpm.sac.${x.id}`, {})).filter(Boolean).length;
          return `<button class="gcard" data-sac="${x.id}"><span class="gname">${esc(x.title)}</span><span class="gdesc">${esc(x.summary.replace(/\s*(Parishes and dioceses vary|Las parroquias y (las )?diócesis)[^.]*\.\s*$/, ""))}</span>${x.documents?.length ? `<span class="gstat">${done ? `${done} ${X("of", "de")} ${x.documents.length} ${X("gathered", "reunidos")}` : `${x.documents.length} ${X("documents", "documentos")}`}</span>` : ""}</button>`;
        }).join("")}</div>
        <p class="gfoot">${X("Requirements follow universal Church law and common practice in US dioceses. Every parish and diocese has its own details, so your parish office has the final word.", "Los requisitos siguen la ley universal de la Iglesia y la práctica común en las diócesis de EE. UU. Cada parroquia y diócesis tiene sus propios detalles; el despacho parroquial tiene la última palabra.")}</p></div>`;
      return;
    }
    const key = `bpm.sac.${s.id}`;
    const got = ctx.store.get(key, {});
    const docs = s.documents || [];
    root.innerHTML = `<div class="game sac">
      <div class="ghead"><button class="back" data-sac="">‹ ${X("All sacraments", "Todos los sacramentos")}</button></div>
      <h1>${esc(s.title)}</h1>
      <p>${esc(s.summary)}</p>
      <div class="facts">
        ${s.timeline ? `<div><span class="eyebrow">${X("When to start", "Cuándo empezar")}</span><p>${esc(s.timeline)}</p></div>` : ""}
        ${s.contact ? `<div><span class="eyebrow">${X("Who to contact", "A quién contactar")}</span><p>${esc(s.contact)}</p></div>` : ""}
        ${s.classes ? `<div><span class="eyebrow">${X("Preparation", "Preparación")}</span><p>${esc(s.classes)}</p></div>` : ""}
      </div>
      ${docs.length ? `<section class="tsec"><h2>${X("Documents to gather", "Documentos que reunir")} <span class="qmeta" id="sacprog"></span></h2>
        <ul class="checklist">${docs.map((d, i) => `<li><label><input type="checkbox" id="doc-${s.id}-${i}" data-i="${i}" ${got[i] ? "checked" : ""}><span><b>${esc(d.name)}</b> <span class="lvl lvl-${esc(d.level)}">${esc(LEVEL[d.level] || "")}</span>${d.detail ? `<br>${esc(d.detail)}` : ""}${d.where ? `<br><span class="qmeta">${X("Where to get it", "Dónde conseguirlo")}: ${esc(d.where)}</span>` : ""}</span></label></li>`).join("")}</ul>
        ${!inClaude() ? `<button class="ghost small" id="sacprint">${X("Print this checklist", "Imprimir esta lista")}</button>` : ""}</section>` : ""}
      ${(s.people || []).map((p) => `<section class="tsec"><h2>${esc(p.role)}</h2><ul class="know">${(p.requirements || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>${(p.documents || []).length ? `<p class="qmeta">${X("They will need", "Necesitarán")}: ${p.documents.map(esc).join("; ")}</p>` : ""}</section>`).join("")}
      ${(s.steps || []).length ? `<section class="tsec"><h2>${X("Step by step", "Paso a paso")}</h2><ol class="steplist">${s.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></section>` : ""}
      ${(s.dayOf || []).length ? `<section class="tsec"><h2>${X("On the day", "El día de la celebración")}</h2><ul class="know">${s.dayOf.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
      ${(s.faq || []).length ? `<section class="tsec"><h2>${X("Common questions", "Preguntas frecuentes")}</h2>${s.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>` : ""}
      ${(s.sources || []).length ? `<p class="gfoot">${X("Sources", "Fuentes")}: ${s.sources.map(esc).join(" · ")}. ${X("Your parish and diocese may add requirements; check with the parish office.", "Tu parroquia y tu diócesis pueden añadir requisitos; consulta en el despacho parroquial.")}</p>` : ""}
    </div>`;
    const prog = () => { const n = Object.values(got).filter(Boolean).length; const el = $("#sacprog", root); if (el) el.textContent = `· ${n} ${X("of", "de")} ${docs.length} ${X("gathered", "reunidos")}`; };
    root.querySelectorAll(".checklist input").forEach((cb) => cb.addEventListener("change", () => { got[cb.dataset.i] = cb.checked; ctx.store.set(key, got); prog(); }));
    $("#sacprint", root)?.addEventListener("click", () => window.print());
    prog();
    window.scrollTo(0, 0);
  }

  /* =====================================================================
     FIND A MASS — Catholic churches near a ZIP code or your location
     (OpenStreetMap via the Overpass API; distances computed here)
     ===================================================================== */
  const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  const DENOMS = "catholic|roman_catholic|byzantine_catholic|ukrainian_greek_catholic|greek_catholic|maronite|melkite|chaldean_catholic|syro-malabar|armenian_catholic|ruthenian";
  let ZIPS = null;
  const miles = (a, b) => {
    const R = 3958.8, t = Math.PI / 180;
    const h = Math.sin((b[0] - a[0]) * t / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin((b[1] - a[1]) * t / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  async function queryChurches(lat, lon, radiusMi) {
    const q = `[out:json][timeout:40];nwr["amenity"="place_of_worship"]["religion"="christian"]["denomination"~"^(${DENOMS})$"](around:${Math.round(radiusMi * 1609.34)},${lat},${lon});out center tags;`;
    let lastErr;
    for (const url of OVERPASS) {
      try {
        const r = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()).elements || [];
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }
  // "Su 07:00,08:00; Mo-Fr 12:10" → "Sunday 7:00 am, 8:00 am · Mon–Fri 12:10 pm"
  const DAYS_EN = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun", PH: "Holidays" };
  const DAYS_ES = { Mo: "lun", Tu: "mar", We: "mié", Th: "jue", Fr: "vie", Sa: "sáb", Su: "dom", PH: "festivos" };
  function prettyTimes(raw) {
    const t12 = (hm) => { const [h, m] = hm.split(":").map(Number); if (isNaN(h)) return hm; return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
    try {
      return raw.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
        const m = /^([A-Za-z,\- ]+?)\s+([\d:,\- ]+)$/.exec(part);
        if (!m) return part;
        const days = m[1].replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => (d === "Su" && m[1].trim() === "Su" ? X("Sunday", "Domingo") : d === "Sa" && m[1].trim() === "Sa" ? X("Saturday", "Sábado") : (ES() ? DAYS_ES : DAYS_EN)[d])).replace("-", "–");
        return `${days} ${m[2].split(",").map((x) => x.trim().split("-").map(t12).join("–")).join(", ")}`;
      }).join(" · ");
    } catch { return raw; }
  }
  function churchRow(el, origin) {
    const t = el.tags || {}, lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    const addr = [[t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), t["addr:city"], t["addr:state"]].filter(Boolean).join(", ");
    return { name: t.name, lat, lon, d: miles(origin, [lat, lon]), addr, city: t["addr:city"] || "", web: t.website || t["contact:website"] || "", phone: t.phone || t["contact:phone"] || "",
      times: t.service_times || t["service_times:mass"] || t["opening_hours:mass"] || "", rite: t.denomination,
      conf: t["service_times:confession"] || t["opening_hours:confession"] || t.confession_times || t["service_times:reconciliation"] || "",
      // cathedrals, shrines, friaries and the like usually hear confessions on weekdays
      major: t.building === "cathedral" || /cathedral|basilica|shrine|oratory|friary|monastery|abbey|franciscan|dominican|capuchin|carmel|national shrine|chapel of|adoration/i.test(t.name || "") };
  }
  // does an opening-hours style string ("Mo-Fr 12:00-12:30; Sa 15:00") include this weekday?
  const DCODES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  function onDay(raw, idx) {
    if (!raw) return false;
    const code = DCODES[idx];
    return raw.split(";").some((part) => {
      const days = (/^\s*([A-Za-z,\- ]+?)\s+[\d]/.exec(part) || [])[1];
      if (!days) return false;
      return days.split(",").some((d) => {
        const [a, b] = d.trim().split("-");
        if (!b) return a === code;
        const i = DCODES.indexOf(a), j = DCODES.indexOf(b);
        if (i < 0 || j < 0) return false;
        return i <= j ? idx >= i && idx <= j : idx >= i || idx <= j;
      });
    });
  }
  async function renderFinder(root, mode = "mass") {
    const ctx = C();
    const last = ctx.store.get("bpm.finder", { zip: "", radius: 50 });
    const conf = mode === "confession";
    root.innerHTML = `<div class="hub finder">
      <div class="levels" role="group" aria-label="${X("What are you looking for?", "¿Qué buscas?")}"><a href="#mass" class="${conf ? "" : "on"}">${X("Mass", "Misa")}</a><a href="#confess" class="${conf ? "on" : ""}">${X("Confession", "Confesión")}</a><a href="#myparish">${X("My parish", "Mi parroquia")}</a></div>
      <div class="ghead"><h1>${conf ? X("Find Confession", "Buscar Confesión") : X("Find a Mass", "Buscar Misa")}</h1></div>
      <p class="lede">${conf
        ? X("Catholic churches near you where you can go to Confession. Churches with listed confession times come first, then cathedrals, shrines and friaries, which usually hear confessions on weekdays too.", "Iglesias católicas cerca de ti donde puedes confesarte. Primero aparecen las que tienen horario de confesiones publicado y luego catedrales, santuarios y conventos, que suelen confesar también entre semana.")
        : X("Catholic churches near you, closest first, with Mass times where they're listed, a link to each parish and directions.", "Iglesias católicas cerca de ti, de la más cercana a la más lejana, con horarios de Misa cuando están disponibles, el enlace a cada parroquia y cómo llegar.")}</p>
      <form id="ffind" class="findform">
        <label for="fzip">${X("ZIP code", "Código postal")}</label>
        <input id="fzip" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="${X("e.g. 10001", "ej. 10001")}" value="${esc(last.zip)}">
        <label for="frad">${X("Within", "A menos de")}</label>
        <select id="frad">${[5, 10, 25, 50].map((r) => `<option value="${r}" ${r === last.radius ? "selected" : ""}>${r} ${X("miles", "millas")}</option>`).join("")}</select>
        <button class="qnext" type="submit">${X("Search", "Buscar")}</button>
        <button class="ghost" type="button" id="floc">${X("Use my location", "Usar mi ubicación")}</button>
      </form>
      <p class="qmeta" id="fmsg"></p>
      <ul class="churches" id="flist"></ul>
      ${conf ? `<div class="tipbox"><b>${X("Good to know", "Para saber")}</b><ul class="know">
        <li>${X("Most parishes hear confessions on Saturday afternoon, often before the evening Mass.", "La mayoría de las parroquias confiesan el sábado por la tarde, a menudo antes de la Misa vespertina.")}</li>
        <li>${X("Cathedrals, shrines, and Franciscan or Dominican churches often offer Confession every weekday, many around midday.", "Las catedrales, santuarios e iglesias franciscanas o dominicas suelen confesar todos los días entre semana, muchas al mediodía.")}</li>
        <li>${X("Any priest will hear your confession by appointment. Call the parish office and ask.", "Cualquier sacerdote te confiesa con cita previa. Llama al despacho parroquial y pídela.")}</li>
        <li>${X("In Lent and Advent many parishes add extra times and penance services.", "En Cuaresma y Adviento muchas parroquias añaden horarios y celebraciones penitenciales.")}</li>
      </ul><a class="chip" href="#confession">${X("How to go to Confession", "Cómo confesarse")}</a></div>` : ""}
      <p class="gfoot">${X("Church locations come from OpenStreetMap, a map built by volunteers, so a parish can occasionally be missing or out of date. Mass times change with seasons and holy days: always confirm on the parish's website or by phone. You can also search", "Las ubicaciones vienen de OpenStreetMap, un mapa hecho por voluntarios, así que a veces puede faltar una parroquia o estar desactualizada. Los horarios cambian según el tiempo litúrgico y los días de precepto: confírmalos siempre en el sitio web de la parroquia o por teléfono. También puedes buscar en")} <a href="https://masstimes.org/" target="_blank" rel="noopener">MassTimes.org</a>.</p>
    </div>`;
    const msg = $("#fmsg", root);
    async function run(origin, label) {
      const radius = +$("#frad", root).value;
      msg.textContent = X(`Searching for Catholic churches within ${radius} miles of ${label}…`, `Buscando iglesias católicas a menos de ${radius} millas de ${label}…`);
      $("#flist", root).innerHTML = "";
      let els;
      try { els = await queryChurches(origin[0], origin[1], radius); }
      catch {
        msg.innerHTML = inClaude()
          ? `${X("Church search needs the open internet, which this preview can't reach. Use it on the public site:", "La búsqueda necesita internet abierto, que esta vista previa no tiene. Úsala en el sitio público:")} <a href="${PUBLIC_SITE}#mass" target="_blank" rel="noopener">${PUBLIC_SITE}</a>`
          : X("The church search service didn't respond. Wait a moment and search again.", "El servicio de búsqueda no respondió. Espera un momento y vuelve a intentarlo.");
        return;
      }
      const seen = new Set();
      const today = new Date().getDay();
      const rank = (r) => (!conf ? 0 : r.conf ? (onDay(r.conf, today) ? 0 : 1) : r.major ? 2 : 3);
      const rows = els.map((e) => churchRow(e, origin)).filter((r) => r.name && r.lat != null)
        .filter((r) => { const k = r.name + "|" + r.lat.toFixed(3) + r.lon.toFixed(3); if (seen.has(k)) return false; seen.add(k); return true; })
        .filter((r) => r.d <= radius)
        // in Confession mode, nearby churches with listed or likely weekday times rise above distant ones
        .sort((a, b) => {
          const ka = conf && a.d <= 10 ? rank(a) : 4, kb = conf && b.d <= 10 ? rank(b) : 4;
          return ka - kb || a.d - b.d;
        });
      msg.textContent = rows.length
        ? X(`${rows.length} Catholic church${rows.length === 1 ? "" : "es"} within ${radius} miles of ${label}.`, `${rows.length} iglesia${rows.length === 1 ? "" : "s"} católica${rows.length === 1 ? "" : "s"} a menos de ${radius} millas de ${label}.`)
        : X(`No Catholic churches found within ${radius} miles of ${label}. Try a larger distance.`, `No se encontraron iglesias católicas a menos de ${radius} millas de ${label}. Prueba una distancia mayor.`);
      $("#flist", root).innerHTML = rows.slice(0, 300).map((r) => {
        const q = encodeURIComponent(`${r.name} ${r.city} ${conf ? X("confession times", "horario de confesiones") : X("Mass times", "horario de misas")}`);
        const confToday = conf && onDay(r.conf, today);
        return `<li class="church"><div class="ctop"><b>${esc(r.name)}</b><span class="dist">${r.d < 10 ? r.d.toFixed(1) : Math.round(r.d)} mi</span></div>
          ${confToday ? `<span class="badge-today">${X("Confession listed today", "Confesiones hoy")}</span>` : conf && !r.conf && r.major ? `<span class="badge-likely">${X("Often has weekday confession", "Suele confesar entre semana")}</span>` : ""}
          ${r.addr ? `<div class="qmeta">${esc(r.addr)}</div>` : ""}
          ${r.rite && !/^(catholic|roman_catholic)$/.test(r.rite) ? `<div class="qmeta">${X("", "rito ")}${esc(r.rite.replace(/_/g, " "))}${X(" rite", "")}</div>` : ""}
          ${conf && r.conf ? `<div class="mtimes"><span class="eyebrow">${X("Confession times (as listed)", "Horario de confesiones (según el mapa)")}</span>${esc(prettyTimes(r.conf))}</div>` : ""}
          ${r.times ? `<div class="mtimes"><span class="eyebrow">${X("Mass times (as listed)", "Horario de Misas (según el mapa)")}</span>${esc(prettyTimes(r.times))}</div>` : ""}
          <div class="chips">
            ${r.web ? `<a class="chip" href="${esc(r.web)}" target="_blank" rel="noopener">${X("Parish website", "Sitio de la parroquia")}</a>` : ""}
            <a class="chip" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">${conf ? (r.conf ? X("Check confession times", "Confirmar horario de confesiones") : X("Find confession times", "Buscar horario de confesiones")) : r.times ? X("Check Mass times", "Confirmar horarios") : X("Find Mass times", "Buscar horarios")}</a>
            <a class="chip" href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}" target="_blank" rel="noopener">${X("Directions", "Cómo llegar")}</a>
            ${r.phone ? `<span class="qmeta">${esc(r.phone)}</span>` : ""}
          </div></li>`;
      }).join("");
    }
    $("#ffind", root).addEventListener("submit", async (e) => {
      e.preventDefault();
      const zip = $("#fzip", root).value.trim();
      if (!/^\d{5}$/.test(zip)) { msg.textContent = X("Enter a 5-digit US ZIP code.", "Escribe un código postal de EE. UU. de 5 dígitos."); return; }
      ctx.store.set("bpm.finder", { zip, radius: +$("#frad", root).value });
      msg.textContent = X("Looking up that ZIP code…", "Buscando ese código postal…");
      try { ZIPS ??= await ctx.getJSON("data/zips.json"); } catch { msg.textContent = X("The ZIP code list didn't load. Reload the page and try again.", "La lista de códigos postales no cargó. Recarga la página e inténtalo de nuevo."); return; }
      const z = ZIPS[zip];
      if (!z) { msg.textContent = X(`${zip} isn't a ZIP code we recognize. Check the number, or use your location instead.`, `No reconocemos el código postal ${zip}. Revisa el número o usa tu ubicación.`); return; }
      run(z, zip);
    });
    $("#floc", root).addEventListener("click", () => {
      if (!navigator.geolocation) { msg.textContent = X("This browser can't share its location. Enter a ZIP code instead.", "Este navegador no puede compartir tu ubicación. Escribe un código postal."); return; }
      msg.textContent = X("Asking your browser for your location…", "Pidiendo tu ubicación al navegador…");
      navigator.geolocation.getCurrentPosition(
        (p) => run([p.coords.latitude, p.coords.longitude], X("your location", "tu ubicación")),
        () => { msg.textContent = inClaude() ? X("Location isn't available in this preview. Enter a ZIP code instead.", "La ubicación no está disponible en esta vista previa. Escribe un código postal.") : X("Location permission was declined or unavailable. Enter a ZIP code instead.", "No se dio permiso de ubicación o no está disponible. Escribe un código postal."); },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });
  }

  window.BPM_PARISH = { renderMusic, renderSacraments, renderFinder };
})();
