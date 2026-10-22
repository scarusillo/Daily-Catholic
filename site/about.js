/* About (our promise, privacy, credits & licenses, support) and My Parish (parish edition pilot). */
(() => {
  "use strict";
  const C = () => window.BPM;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const X = (en, es) => (window.I18N?.lang === "es" ? es : en);
  const L = (o) => window.I18N.L(o);
  const CFG = () => window.BPM_CONFIG || {};

  /* ---------- About ---------- */
  function renderAbout(root) {
    const cfg = CFG();
    root.innerHTML = `<div class="game guide about">
      <div class="ghead"><h1>${X("Our promise", "Nuestra promesa")}</h1></div>
      <p class="lede">${X("The Daily Catholic is a free companion for praying, reading Scripture and living the faith, in English and Spanish.", "The Daily Catholic es un compañero gratuito para orar, leer la Escritura y vivir la fe, en inglés y en español.")}</p>
      <ul class="promises">
        <li><b>${X("Free to pray, forever.", "Gratis para orar, siempre.")}</b> ${X("Prayers, readings, the Rosary, Confession help and the daily games will never be behind a paywall.", "Las oraciones, las lecturas, el Rosario, la ayuda para confesarse y los juegos diarios nunca estarán detrás de un pago.")}</li>
        <li><b>${X("No account, no tracking.", "Sin cuenta, sin rastreo.")}</b> ${X("You never sign up. Your progress, streaks and checklists stay on your own device. We don't collect what you pray for.", "Nunca te registras. Tu progreso, tus rachas y tus listas se quedan en tu propio dispositivo. No recopilamos por qué oras.")}</li>
        <li><b>${X("No ads.", "Sin anuncios.")}</b> ${X("Nothing is sold to advertisers, and nothing interrupts your prayer.", "No vendemos nada a anunciantes y nada interrumpe tu oración.")}</li>
        <li><b>${X("No celebrity or political sponsors.", "Sin patrocinadores famosos ni políticos.")}</b> ${X("Just Scripture, the Church's calendar and the prayers of the Church.", "Solo la Escritura, el calendario de la Iglesia y sus oraciones.")}</li>
        <li><b>${X("Faithful to the Church.", "Fiel a la Iglesia.")}</b> ${X("The 73-book Catholic Bible and content written to follow the Catechism and the Magisterium.", "La Biblia católica de 73 libros y contenido escrito para seguir el Catecismo y el Magisterio.")}${cfg.reviewedBy ? ` ${X("Content reviewed by", "Contenido revisado por")} ${esc(cfg.reviewedBy)}.` : ` ${X("A priest's review of the content is under way; if you spot an error, please tell us.", "Un sacerdote está revisando el contenido; si encuentras un error, avísanos.")}`}</li>
        <li><b>${X("Works offline.", "Funciona sin conexión.")}</b> ${X("Once installed on your phone, prayers, readings and games keep working without a signal.", "Una vez instalada en tu teléfono, las oraciones, las lecturas y los juegos funcionan sin señal.")}</li>
      </ul>

      ${cfg.donateUrl ? `<section class="tsec support"><h2>${X("Support this ministry", "Apoya este ministerio")}</h2>
        <p>${X("The Daily Catholic is kept free by people who give. If it helps you pray, consider a gift. Nothing is unlocked by giving; it simply keeps the lights on for everyone.", "The Daily Catholic se mantiene gratis gracias a quienes donan. Si te ayuda a orar, considera hacer un donativo. Donar no desbloquea nada; simplemente mantiene la luz encendida para todos.")}</p>
        <a class="qnext" href="${esc(cfg.donateUrl)}" target="_blank" rel="noopener">${X("Give", "Donar")}</a></section>` : ""}

      <section class="tsec"><h2>${X("For parishes and schools", "Para parroquias y escuelas")}</h2>
        <p>${X("Parishes can have their own page here with Mass and confession times, announcements and events. Catholic schools and religious-education programs can use the journeys and games in class.", "Las parroquias pueden tener aquí su propia página con horarios de Misa y confesión, avisos y eventos. Las escuelas católicas y los programas de catequesis pueden usar los caminos y juegos en clase.")}
        ${cfg.contactEmail ? `${X("Write to", "Escribe a")} <span class="sel">${esc(cfg.contactEmail)}</span>.` : ""}</p>
        <a class="chip" href="#myparish">${X("See the parish page", "Ver la página parroquial")}</a></section>

      <section class="tsec" id="privacy"><h2>${X("Privacy policy", "Política de privacidad")}</h2>
        <p>${X("Last updated: October 2026.", "Última actualización: octubre de 2026.")}</p>
        <ul class="know">
          <li>${X("We do not ask for your name, email or any account.", "No pedimos tu nombre, correo ni ninguna cuenta.")}</li>
          <li>${X("Your settings, game results, streaks, journey progress and checklists are stored only in your browser's local storage on your device. They are never sent to us. Clearing your browser data deletes them.", "Tu configuración, resultados de juegos, rachas, progreso en los caminos y listas se guardan solo en el almacenamiento local de tu navegador, en tu dispositivo. Nunca nos llegan. Si borras los datos del navegador, se eliminan.")}</li>
          <li>${X("Find a Church: your ZIP code is looked up on your device. To list churches, your device sends an approximate location (the ZIP code's center, or your location if you choose \"Use my location\") to the OpenStreetMap Overpass service. We do not receive or store it.", "Buscar Iglesia: tu código postal se busca en tu dispositivo. Para listar iglesias, tu dispositivo envía una ubicación aproximada (el centro del código postal, o tu ubicación si eliges \"Usar mi ubicación\") al servicio Overpass de OpenStreetMap. Nosotros no la recibimos ni la guardamos.")}</li>
          <li>${X("Links to other sites (parish websites, maps, Hymnary.org, search) are governed by those sites' own policies.", "Los enlaces a otros sitios (sitios parroquiales, mapas, Hymnary.org, buscadores) se rigen por las políticas de esos sitios.")}</li>
          <li>${X("Fonts are loaded from Google Fonts, which see standard web request information such as your IP address.", "Las fuentes se cargan desde Google Fonts, que ven la información estándar de una solicitud web, como tu dirección IP.")}</li>
          <li>${X("No ads, no analytics trackers, no selling or sharing of data.", "Sin anuncios, sin rastreadores de analítica, sin venta ni intercambio de datos.")}</li>
        </ul></section>

      <section class="tsec" id="credits"><h2>${X("Credits and licenses", "Créditos y licencias")}</h2>
        <ul class="know credits">
          <li>${X("Scripture: World English Bible, Catholic Edition (eBible.org), public domain. \"World English Bible\" is a trademark of eBible.org.", "Escritura: World English Bible, edición católica (eBible.org), dominio público. \"World English Bible\" es marca de eBible.org.")}</li>
          <li>${X("Maps and church locations: © OpenStreetMap contributors, available under the Open Database License (openstreetmap.org/copyright). Coastlines: Natural Earth (public domain).", "Mapas y ubicación de iglesias: © colaboradores de OpenStreetMap, bajo la Open Database License (openstreetmap.org/copyright). Costas: Natural Earth (dominio público).")} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">openstreetmap.org/copyright</a></li>
          <li>${X("Liturgical calendar: roman-catholic-church-calendar (MIT / LGPL), a port of calendarium-romanum.", "Calendario litúrgico: roman-catholic-church-calendar (MIT / LGPL), adaptación de calendarium-romanum.")}</li>
          <li>${X("Prayer texts: Prayer Collection by CodexCommunion, and rosario (MIT).", "Textos de oraciones: Prayer Collection de CodexCommunion, y rosario (MIT).")}</li>
          <li>${X("ZIP code locations: us-zips (MIT), from US Census ZCTAs. Word lists: an-array-of-english-words and an-array-of-spanish-words (MIT).", "Ubicación de códigos postales: us-zips (MIT), de las ZCTA del Censo de EE. UU. Listas de palabras: an-array-of-english-words y an-array-of-spanish-words (MIT).")}</li>
          <li>${X("Hymn titles and composers are listed for reference; copyrighted song lyrics are not reproduced.", "Los títulos y compositores de himnos se mencionan como referencia; no se reproducen letras con derechos de autor.")}</li>
          <li>${X("Code: d3 (ISC).", "Código: d3 (ISC).")}</li>
        </ul>
        <p class="gfoot">${X("Teaching notes, saint biographies and guides are study summaries written for this site. For authoritative teaching, consult the Catechism of the Catholic Church and your parish priest.", "Las notas, biografías de santos y guías son resúmenes de estudio escritos para este sitio. Para la enseñanza autorizada, consulte el Catecismo de la Iglesia Católica y a su párroco.")}</p></section>
    </div>`;
  }

  /* ---------- My Parish (parish edition pilot) ---------- */
  let INDEX = null;
  const PARISH_CACHE = {};
  const DAYNAME = { en: { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Vigil: "Saturday vigil" },
                    es: { Sun: "Domingo", Mon: "Lunes", Tue: "Martes", Wed: "Miércoles", Thu: "Jueves", Fri: "Viernes", Sat: "Sábado", Vigil: "Sábado (vigilia)" } };
  const dayName = (d) => DAYNAME[window.I18N.lang === "es" ? "es" : "en"][d] || d;
  async function renderParish(root, slug) {
    const ctx = C();
    root.innerHTML = `<p class="loading">…</p>`;
    try { INDEX ??= await ctx.getJSON("data/parishes/index.json"); } catch { INDEX = []; }
    slug ??= ctx.store.get("bpm.parish", null);
    const head = `<div class="levels finder-switch" role="group"><a href="#mass">${X("Mass", "Misa")}</a><a href="#confess">${X("Confession", "Confesión")}</a><a href="#myparish" class="on">${X("My parish", "Mi parroquia")}</a></div>`;
    const entry = INDEX.find((p) => p.slug === slug);
    if (!entry) {
      root.innerHTML = `${head}<div class="hub"><div class="ghead"><h1>${X("My parish", "Mi parroquia")}</h1></div>
        <p class="lede">${X("Choose your parish to see its Mass and confession times, announcements and events in one place.", "Elige tu parroquia para ver en un solo lugar sus horarios de Misa y confesión, avisos y eventos.")}</p>
        <div class="gcards">${INDEX.map((p) => `<button class="gcard" data-parish="${esc(p.slug)}"><span class="gname">${esc(p.name)}</span><span class="gdesc">${esc(p.city || "")}</span>${p.demo ? `<span class="gstat">${X("Example parish", "Parroquia de ejemplo")}</span>` : ""}</button>`).join("")}</div>
        <p class="gfoot">${X("Is your parish missing? Parishes can join for free during the pilot. Ask your parish office to get in touch.", "¿Falta tu parroquia? Durante el programa piloto las parroquias pueden unirse gratis. Pide al despacho parroquial que se comunique con nosotros.")}${CFG().contactEmail ? ` <span class="sel">${esc(CFG().contactEmail)}</span>` : ""}</p></div>`;
      root.querySelectorAll("[data-parish]").forEach((b) => b.onclick = () => { ctx.store.set("bpm.parish", b.dataset.parish); renderParish(root, b.dataset.parish); });
      return;
    }
    let p = PARISH_CACHE[slug];
    try { p ??= PARISH_CACHE[slug] = await ctx.getJSON(`data/parishes/${slug}.json`); }
    catch { root.innerHTML = `${head}<p class="loading">${X("This parish page could not load.", "No se pudo cargar esta página parroquial.")}</p>`; return; }
    const today = new Date().toISOString().slice(0, 10);
    const times = (rows) => `<table class="ptimes"><tbody>${rows.map((r) => `<tr><th>${esc(dayName(r.day))}</th><td>${r.times.map(esc).join(" · ")}${r.lang ? ` <span class="tag">${esc(r.lang)}</span>` : ""}${r.note ? ` <span class="qmeta">${esc(L(r.note))}</span>` : ""}</td></tr>`).join("")}</tbody></table>`;
    const ann = (p.announcements || []).filter((a) => !a.until || a.until >= today);
    const ev = (p.events || []).filter((e) => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
    root.innerHTML = `${head}<div class="game guide parishpage">
      ${p.demo ? `<p class="demo">${X("Example parish: this page shows what a participating parish would look like.", "Parroquia de ejemplo: esta página muestra cómo se vería una parroquia participante.")}</p>` : ""}
      <div class="ghead"><h1>${esc(p.name)}</h1></div>
      <p class="qmeta">${esc([p.address, p.city].filter(Boolean).join(", "))}${p.phone ? ` · <span class="sel">${esc(p.phone)}</span>` : ""}</p>
      <div class="chips">${p.website ? `<a class="chip" href="${esc(p.website)}" target="_blank" rel="noopener">${X("Parish website", "Sitio de la parroquia")}</a>` : ""}${p.bulletinUrl ? `<a class="chip" href="${esc(p.bulletinUrl)}" target="_blank" rel="noopener">${X("This week's bulletin", "Boletín de esta semana")}</a>` : ""}${p.lat ? `<a class="chip" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}" target="_blank" rel="noopener">${X("Directions", "Cómo llegar")}</a>` : ""}${p.donateUrl ? `<a class="chip" href="${esc(p.donateUrl)}" target="_blank" rel="noopener">${X("Give to the parish", "Donar a la parroquia")}</a>` : ""}</div>
      ${ann.length ? `<section class="tsec"><h2>${X("Announcements", "Avisos")}</h2>${ann.map((a) => `<div class="saint"><b>${esc(L(a.title))}</b>${a.date ? ` <span class="qmeta">${esc(a.date)}</span>` : ""}<p>${esc(L(a.text))}</p></div>`).join("")}</section>` : ""}
      <section class="tsec"><h2>${X("Mass times", "Horario de Misas")}</h2>${times(p.mass || [])}</section>
      ${(p.confession || []).length ? `<section class="tsec"><h2>${X("Confession", "Confesiones")}</h2>${times(p.confession)}</section>` : ""}
      ${(p.adoration || []).length ? `<section class="tsec"><h2>${X("Adoration", "Adoración")}</h2>${times(p.adoration)}</section>` : ""}
      ${ev.length ? `<section class="tsec"><h2>${X("Coming up", "Próximamente")}</h2><ul class="know">${ev.map((e) => `<li><b>${esc(new Date(e.date + "T12:00").toLocaleDateString(window.I18N.locale(), { weekday: "short", month: "short", day: "numeric" }))}${e.time ? ` · ${esc(e.time)}` : ""}</b> ${esc(L(e.title))}${e.place ? ` <span class="qmeta">${esc(e.place)}</span>` : ""}</li>`).join("")}</ul></section>` : ""}
      <button class="ghost small" id="pchange">${X("Choose a different parish", "Elegir otra parroquia")}</button>
    </div>`;
    $("#pchange", root).onclick = () => { ctx.store.set("bpm.parish", null); renderParish(root, ""); };
  }

  window.BPM_ABOUT = { renderAbout, renderParish };
})();
