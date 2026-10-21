// Build public/data/calendar.json from the General Roman Calendar (US) via
// roman-catholic-church-calendar. Usage: node build_calendar.mjs <pkgdir> <outdir>
// Each day: [season, week, sundayCycle, ferialCycle, [[title, colour, rank, id], ...]]
// Also writes data/liturgy/reading_keys.json: every Sunday/solemnity/feast key that needs readings.
import fs from "node:fs";
const [pkg, root] = process.argv.slice(2);
const { CalendarRepository, serializeDay } = await import(pkg + "/dist/api/index.js");
const { CalDate, i18n } = await import(pkg + "/dist/core/index.js");
const us = new CalendarRepository().get("us");
const days = {}, keys = {};
export function readingKey(d) {
  const c = d.celebrations[0];
  const high = ["solemnity", "feast", "Primary liturgical days", "Easter triduum", "Sunday"].includes(c.rank) || d.weekday === "sunday";
  if (!high) return null;
  if (c.id) return d.weekday === "sunday" || c.rank !== "feast" || c.id ? `${c.id}|${d.cycle_sunday}` : null;
  return `${d.season}-${d.season_week}-${d.weekday}|${d.cycle_sunday}`;
}
i18n.withLocale("en", () => {
  for (let d = CalDate.fromISO("2026-01-01"); d.toString() <= "2028-12-31"; d = d.succ ? d.succ() : CalDate.fromISO(new Date(Date.parse(d.toString()) + 864e5).toISOString().slice(0, 10))) {
    const s = serializeDay(us.day(d));
    const k = readingKey(s);
    days[s.date] = [s.season, s.season_week, s.cycle_sunday, s.cycle_ferial, s.celebrations.map((c) => [c.title, c.colour, c.rank, c.id]), k];
    if (k) (keys[k] ??= { title: s.celebrations[0].title, dates: [] }).dates.push(s.date);
  }
});
fs.writeFileSync(root + "/public/data/calendar.json", JSON.stringify(days));
fs.writeFileSync(root + "/data/liturgy/reading_keys.json", JSON.stringify(keys, null, 1));
console.log(Object.keys(days).length, "days,", Object.keys(keys).length, "reading keys");
