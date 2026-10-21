// Clip Natural Earth land (world-atlas land-50m) to the biblical world and write
// public/data/geo.json for the Holy Land Tap game.
// Usage: node build_geo.mjs <world-atlas dir> <topojson-client dir> <project root>
import fs from "node:fs";
import { createRequire } from "node:module";
const [atlas, tc, root] = process.argv.slice(2);
const topojson = createRequire(import.meta.url)(tc + "/dist/topojson-client.js");
const topo = JSON.parse(fs.readFileSync(atlas + "/land-50m.json"));
const land = topojson.feature(topo, topo.objects.land);
const BOX = [8, 18, 58, 46]; // lon0, lat0, lon1, lat1
const r = (x) => Math.round(x * 100) / 100;
// Sutherland–Hodgman clip of each ring to the box
function clip(ring) {
  const edges = [
    (p) => p[0] >= BOX[0], (p) => p[0] <= BOX[2], (p) => p[1] >= BOX[1], (p) => p[1] <= BOX[3]];
  const inter = [
    (a, b) => [BOX[0], a[1] + (b[1] - a[1]) * (BOX[0] - a[0]) / (b[0] - a[0])],
    (a, b) => [BOX[2], a[1] + (b[1] - a[1]) * (BOX[2] - a[0]) / (b[0] - a[0])],
    (a, b) => [a[0] + (b[0] - a[0]) * (BOX[1] - a[1]) / (b[1] - a[1]), BOX[1]],
    (a, b) => [a[0] + (b[0] - a[0]) * (BOX[3] - a[1]) / (b[1] - a[1]), BOX[3]]];
  let out = ring;
  for (let e = 0; e < 4 && out.length; e++) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      const ia = edges[e](a), ib = edges[e](b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(inter[e](a, b));
    }
  }
  const res = [];
  for (const p of out) { const q = [r(p[0]), r(p[1])]; const l = res[res.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) res.push(q); }
  return res.length >= 4 ? res : null;
}
const polys = [];
const geoms = land.type === "FeatureCollection" ? land.features.map((f) => f.geometry) : [land.geometry];
for (const g of geoms) for (const poly of (g.type === "Polygon" ? [g.coordinates] : g.coordinates)) {
  const rings = poly.map(clip).filter(Boolean);
  if (rings.length) polys.push(rings);
}
// Inland seas the 50m land layer doesn't cut out (approximate outlines) and the Jordan.
const water = {
  type: "FeatureCollection", features: [
    { name: "Sea of Galilee", type: "Polygon", c: [[[35.53, 32.89], [35.58, 32.91], [35.64, 32.87], [35.65, 32.80], [35.62, 32.72], [35.58, 32.70], [35.53, 32.76], [35.52, 32.83], [35.53, 32.89]]] },
    { name: "Dead Sea", type: "Polygon", c: [[[35.47, 31.78], [35.56, 31.77], [35.59, 31.55], [35.56, 31.25], [35.50, 31.05], [35.40, 31.10], [35.40, 31.40], [35.44, 31.60], [35.47, 31.78]]] },
  ].map((f) => ({ type: "Feature", properties: { name: f.name }, geometry: { type: f.type, coordinates: f.c } })),
};
const jordan = [[35.57, 32.71], [35.58, 32.60], [35.57, 32.45], [35.55, 32.30], [35.55, 32.15], [35.53, 32.00], [35.54, 31.85], [35.55, 31.77]];
const out = { box: BOX, land: { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } }, water, jordan };
fs.writeFileSync(root + "/public/data/geo.json", JSON.stringify(out));
console.log("polygons", polys.length, "bytes", JSON.stringify(out).length);
