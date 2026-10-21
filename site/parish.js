/* Parish life: Music at Mass, Sacraments (what you'll need), Find a Mass (churches near you). */
(() => {
  "use strict";
  const C = () => window.BPM;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PUBLIC_SITE = "https://scarusillo.github.io/Daily-Catholic/";
  const inClaude = () => !!window.claude?.use;

  /* =====================================================================
     MUSIC
     ===================================================================== */
  let MUSIC = null;
  async function renderMusic(root, songId) {
    const ctx = C();
    root.innerHTML = `<p class="loading">Loading music…</p>`;
    try { MUSIC ??= await ctx.getJSON("data/music.json"); }
    catch { root.innerHTML = `<h1>Music at Mass</h1><p class="loading">The music guide is being prepared.</p>`; return; }
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
      <div class="ghead"><h1>Music at Mass</h1></div>
      <p class="lede">The hymns, chants and songs you hear at church: what each part of the Mass is for, the classic hymns with their words, and the modern songs most parishes sing.</p>
      ${cur ? `<section class="tsec"><h2>Now in ${esc(cur.name)}</h2><p>${esc(cur.about)}</p><div class="chips">${cur.songs.filter((id) => S[id]).slice(0, 12).map((id) => `<button class="chip" data-song="${id}">${esc(S[id].title)}</button>`).join("")}</div></section>` : ""}
      <details class="mparts"><summary><h2>The sung parts of the Mass</h2></summary>
        <ol class="partlist">${MUSIC.parts.map((p) => `<li><b>${esc(p.name)}</b> <span class="qmeta">${esc(p.when || "")}</span><p>${esc(p.about)}</p>
          ${(p.examples || []).filter((id) => S[id]).length ? `<div class="chips">${p.examples.filter((id) => S[id]).map((id) => `<button class="chip" data-song="${id}">${esc(S[id].title)}</button>`).join("")}</div>` : ""}</li>`).join("")}</ol>
      </details>
      <div class="people-tools">
        <input id="mq" type="search" placeholder="Search songs, composers, scripture" autocomplete="off">
        <select id="mf" aria-label="Filter"><option value="">All songs</option>${groups.map((g) => `<option value="${g.id}" ${g.id === filt ? "selected" : ""}>${esc(g.name)}</option>`).join("")}<option value="pd" ${filt === "pd" ? "selected" : ""}>With words to sing along</option></select>
      </div>
      <p class="count" id="mcount"></p>
      <ul class="plist" id="mlist"></ul>
      <p class="gfoot">Words are shown only for hymns and chants in the public domain. Modern songs are listed with their composer and publisher; your parish's hymnal or worship aid has their words.</p>
    </div>`;
    const draw = () => {
      const q = $("#mq", root).value.trim().toLowerCase(), f = $("#mf", root).value;
      ctx.store.set("bpm.musicFilter", f);
      const inGroup = (s) => !f || (f === "pd" ? !!s.lyrics : (s.uses || []).includes(f) || MUSIC.seasons.find((x) => x.id === f)?.songs.includes(s.id) || MUSIC.parts.find((x) => x.id === f)?.examples?.includes(s.id));
      const rows = MUSIC.songs.filter((s) => inGroup(s) && (!q || [s.title, s.latinTitle, s.composer, s.textAuthor, s.about, ...(s.scripture || [])].join(" ").toLowerCase().includes(q)));
      $("#mcount", root).textContent = `${rows.length} of ${MUSIC.songs.length} songs`;
      $("#mlist", root).innerHTML = rows.map((s) => `<li><button data-song="${s.id}"><b>${esc(s.title)}</b><span>${esc([s.composer || s.textAuthor, s.year].filter(Boolean).join(" · "))}${s.lyrics ? " · words" : ""}</span></button></li>`).join("");
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
      <div class="ghead"><button class="back" data-song="">‹ All music</button></div>
      <h1>${esc(s.title)}</h1>
      ${s.latinTitle && s.latinTitle !== s.title ? `<p class="p-alias">${esc(s.latinTitle)}</p>` : ""}
      <p class="qmeta">${esc([s.textAuthor && `Words: ${s.textAuthor}`, s.composer && `Music: ${s.composer}`, s.year, s.publisher].filter(Boolean).join(" · "))}</p>
      ${tags.length ? `<div class="chips">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
      ${s.about ? `<p>${esc(s.about)}</p>` : ""}
      ${(s.scripture || []).length ? `<div class="chips"><span class="qmeta">Scripture:</span>${s.scripture.map((r) => `<button class="ref" data-ref="${esc(r)}">${esc(ctx.refLabel(r))}</button>`).join("")}</div>` : ""}
      ${s.lyrics ? `<div class="lyrics${s.translation ? " two" : ""}"><div>${s.lyrics.map(verse).join("")}</div>${s.translation ? `<div class="tr"><span class="eyebrow">In English</span>${s.translation.map(verse).join("")}</div>` : ""}</div>`
        : `<p class="gfoot">This song is under copyright, so its words aren't shown here. Find it in your parish hymnal${s.publisher ? ` (published by ${esc(s.publisher)})` : ""}.</p>`}
    </div>`;
    window.scrollTo(0, 0);
  }

  /* =====================================================================
     SACRAMENTS
     ===================================================================== */
  let SAC = null;
  const LEVEL = { "church-law": "Required by Church law", common: "Usually required", "if-applicable": "Only if it applies" };
  async function renderSacraments(root, id) {
    const ctx = C();
    root.innerHTML = `<p class="loading">Loading…</p>`;
    try { SAC ??= await ctx.getJSON("data/sacraments.json"); }
    catch { root.innerHTML = `<h1>Sacraments</h1><p class="loading">This guide is being prepared.</p>`; return; }
    const s = SAC.find((x) => x.id === id);
    if (!s) {
      root.innerHTML = `<div class="hub"><div class="ghead"><h1>Sacraments: what you'll need</h1></div>
        <p class="lede">Planning a baptism, wedding, confirmation, First Communion or funeral, or thinking about becoming Catholic? Pick one to see the paperwork to gather, who to call and what to expect. Tick items off as you go; your progress is saved on this device.</p>
        <div class="gcards">${SAC.map((x) => {
          const done = Object.values(ctx.store.get(`bpm.sac.${x.id}`, {})).filter(Boolean).length;
          return `<button class="gcard" data-sac="${x.id}"><span class="gname">${esc(x.title)}</span><span class="gdesc">${esc(x.summary.replace(/\s*Parishes and dioceses vary[^.]*\.\s*$/, ""))}</span>${x.documents?.length ? `<span class="gstat">${done ? `${done} of ${x.documents.length} gathered` : `${x.documents.length} documents`}</span>` : ""}</button>`;
        }).join("")}</div>
        <p class="gfoot">Requirements follow universal Church law and common practice in US dioceses. Every parish and diocese has its own details, so your parish office has the final word.</p></div>`;
      return;
    }
    const key = `bpm.sac.${s.id}`;
    const got = ctx.store.get(key, {});
    const docs = s.documents || [];
    root.innerHTML = `<div class="game sac">
      <div class="ghead"><button class="back" data-sac="">‹ All sacraments</button></div>
      <h1>${esc(s.title)}</h1>
      <p>${esc(s.summary)}</p>
      <div class="facts">
        ${s.timeline ? `<div><span class="eyebrow">When to start</span><p>${esc(s.timeline)}</p></div>` : ""}
        ${s.contact ? `<div><span class="eyebrow">Who to contact</span><p>${esc(s.contact)}</p></div>` : ""}
        ${s.classes ? `<div><span class="eyebrow">Preparation</span><p>${esc(s.classes)}</p></div>` : ""}
      </div>
      ${docs.length ? `<section class="tsec"><h2>Documents to gather <span class="qmeta" id="sacprog"></span></h2>
        <ul class="checklist">${docs.map((d, i) => `<li><label><input type="checkbox" id="doc-${s.id}-${i}" data-i="${i}" ${got[i] ? "checked" : ""}><span><b>${esc(d.name)}</b> <span class="lvl lvl-${esc(d.level)}">${esc(LEVEL[d.level] || "")}</span>${d.detail ? `<br>${esc(d.detail)}` : ""}${d.where ? `<br><span class="qmeta">Where to get it: ${esc(d.where)}</span>` : ""}</span></label></li>`).join("")}</ul>
        ${!inClaude() ? `<button class="ghost small" id="sacprint">Print this checklist</button>` : ""}</section>` : ""}
      ${(s.people || []).map((p) => `<section class="tsec"><h2>${esc(p.role)}</h2><ul class="know">${(p.requirements || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>${(p.documents || []).length ? `<p class="qmeta">They will need: ${p.documents.map(esc).join("; ")}</p>` : ""}</section>`).join("")}
      ${(s.steps || []).length ? `<section class="tsec"><h2>Step by step</h2><ol class="steplist">${s.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></section>` : ""}
      ${(s.dayOf || []).length ? `<section class="tsec"><h2>On the day</h2><ul class="know">${s.dayOf.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
      ${(s.faq || []).length ? `<section class="tsec"><h2>Common questions</h2>${s.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>` : ""}
      ${(s.sources || []).length ? `<p class="gfoot">Sources: ${s.sources.map(esc).join(" · ")}. Your parish and diocese may add requirements; check with the parish office.</p>` : ""}
    </div>`;
    const prog = () => { const n = Object.values(got).filter(Boolean).length; const el = $("#sacprog", root); if (el) el.textContent = `· ${n} of ${docs.length} gathered`; };
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
  const DAYS = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun", PH: "Holidays" };
  function prettyTimes(raw) {
    const t12 = (hm) => { const [h, m] = hm.split(":").map(Number); if (isNaN(h)) return hm; return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
    try {
      return raw.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
        const m = /^([A-Za-z,\- ]+?)\s+([\d:,\- ]+)$/.exec(part);
        if (!m) return part;
        const days = m[1].replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => (d === "Su" && m[1].trim() === "Su" ? "Sunday" : d === "Sa" && m[1].trim() === "Sa" ? "Saturday" : DAYS[d])).replace("-", "–");
        return `${days} ${m[2].split(",").map((x) => x.trim().split("-").map(t12).join("–")).join(", ")}`;
      }).join(" · ");
    } catch { return raw; }
  }
  function churchRow(el, origin) {
    const t = el.tags || {}, lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    const addr = [[t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), t["addr:city"], t["addr:state"]].filter(Boolean).join(", ");
    return { name: t.name, lat, lon, d: miles(origin, [lat, lon]), addr, city: t["addr:city"] || "", web: t.website || t["contact:website"] || "", phone: t.phone || t["contact:phone"] || "",
      times: t.service_times || t["service_times:mass"] || t["opening_hours:mass"] || "", rite: t.denomination };
  }
  async function renderFinder(root) {
    const ctx = C();
    const last = ctx.store.get("bpm.finder", { zip: "", radius: 50 });
    root.innerHTML = `<div class="hub finder">
      <div class="ghead"><h1>Find a Mass</h1></div>
      <p class="lede">Catholic churches near you, closest first, with Mass times where they're listed, a link to each parish and directions.</p>
      <form id="ffind" class="findform">
        <label for="fzip">ZIP code</label>
        <input id="fzip" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="e.g. 10001" value="${esc(last.zip)}">
        <label for="frad">Within</label>
        <select id="frad">${[5, 10, 25, 50].map((r) => `<option value="${r}" ${r === last.radius ? "selected" : ""}>${r} miles</option>`).join("")}</select>
        <button class="qnext" type="submit">Search</button>
        <button class="ghost" type="button" id="floc">Use my location</button>
      </form>
      <p class="qmeta" id="fmsg"></p>
      <ul class="churches" id="flist"></ul>
      <p class="gfoot">Church locations come from OpenStreetMap, a map built by volunteers, so a parish can occasionally be missing or out of date. Mass times change with seasons and holy days: always confirm on the parish's website or by phone. You can also search <a href="https://masstimes.org/" target="_blank" rel="noopener">MassTimes.org</a>.</p>
    </div>`;
    const msg = $("#fmsg", root);
    async function run(origin, label) {
      const radius = +$("#frad", root).value;
      msg.textContent = `Searching for Catholic churches within ${radius} miles of ${label}…`;
      $("#flist", root).innerHTML = "";
      let els;
      try { els = await queryChurches(origin[0], origin[1], radius); }
      catch {
        msg.innerHTML = inClaude()
          ? `Church search needs the open internet, which this preview can't reach. Use it on the public site: <a href="${PUBLIC_SITE}#mass" target="_blank" rel="noopener">${PUBLIC_SITE}</a>`
          : `The church search service didn't respond. Wait a moment and search again.`;
        return;
      }
      const seen = new Set();
      const rows = els.map((e) => churchRow(e, origin)).filter((r) => r.name && r.lat != null)
        .filter((r) => { const k = r.name + "|" + r.lat.toFixed(3) + r.lon.toFixed(3); if (seen.has(k)) return false; seen.add(k); return true; })
        .filter((r) => r.d <= radius).sort((a, b) => a.d - b.d);
      msg.textContent = rows.length ? `${rows.length} Catholic church${rows.length === 1 ? "" : "es"} within ${radius} miles of ${label}.` : `No Catholic churches found within ${radius} miles of ${label}. Try a larger distance.`;
      $("#flist", root).innerHTML = rows.slice(0, 300).map((r) => {
        const q = encodeURIComponent(`${r.name} ${r.city} Mass times`);
        return `<li class="church"><div class="ctop"><b>${esc(r.name)}</b><span class="dist">${r.d < 10 ? r.d.toFixed(1) : Math.round(r.d)} mi</span></div>
          ${r.addr ? `<div class="qmeta">${esc(r.addr)}</div>` : ""}
          ${r.rite && !/^(catholic|roman_catholic)$/.test(r.rite) ? `<div class="qmeta">${esc(r.rite.replace(/_/g, " "))} rite</div>` : ""}
          ${r.times ? `<div class="mtimes"><span class="eyebrow">Mass times (as listed)</span>${esc(prettyTimes(r.times))}</div>` : ""}
          <div class="chips">
            ${r.web ? `<a class="chip" href="${esc(r.web)}" target="_blank" rel="noopener">Parish website</a>` : ""}
            <a class="chip" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">${r.times ? "Check Mass times" : "Find Mass times"}</a>
            <a class="chip" href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}" target="_blank" rel="noopener">Directions</a>
            ${r.phone ? `<span class="qmeta">${esc(r.phone)}</span>` : ""}
          </div></li>`;
      }).join("");
    }
    $("#ffind", root).addEventListener("submit", async (e) => {
      e.preventDefault();
      const zip = $("#fzip", root).value.trim();
      if (!/^\d{5}$/.test(zip)) { msg.textContent = "Enter a 5-digit US ZIP code."; return; }
      ctx.store.set("bpm.finder", { zip, radius: +$("#frad", root).value });
      msg.textContent = "Looking up that ZIP code…";
      try { ZIPS ??= await ctx.getJSON("data/zips.json"); } catch { msg.textContent = "The ZIP code list didn't load. Reload the page and try again."; return; }
      const z = ZIPS[zip];
      if (!z) { msg.textContent = `${zip} isn't a ZIP code we recognize. Check the number, or use your location instead.`; return; }
      run(z, zip);
    });
    $("#floc", root).addEventListener("click", () => {
      if (!navigator.geolocation) { msg.textContent = "This browser can't share its location. Enter a ZIP code instead."; return; }
      msg.textContent = "Asking your browser for your location…";
      navigator.geolocation.getCurrentPosition(
        (p) => run([p.coords.latitude, p.coords.longitude], "your location"),
        () => { msg.textContent = inClaude() ? "Location isn't available in this preview. Enter a ZIP code instead." : "Location permission was declined or unavailable. Enter a ZIP code instead."; },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });
  }

  window.BPM_PARISH = { renderMusic, renderSacraments, renderFinder };
})();
