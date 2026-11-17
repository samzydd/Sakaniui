#!/usr/bin/env node
/**
 * Builds src/regions/{uk,es,de,ca,au}.ts: the first-level regions of five countries as simplified SVG paths, each in
 * its own national-style projection, centred in the same 975 x 610 box as the US states. Run by hand when the shapes
 * need regenerating; the output is committed, so nobody needs these tools to use the library.
 *
 *   mkdir /tmp/geo && cd /tmp/geo && npm i topojson-client topojson-server topojson-simplify d3-geo d3-geo-projection
 *   curl -L -o /tmp/geo/admin1.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
 *   node scripts/regions/countries.mjs /tmp/geo/admin1.geojson /tmp/geo/node_modules
 *
 * Source: Natural Earth, 1:10m Admin 1 - States, Provinces (public domain). The United Kingdom is built from Natural
 * Earth's counties and unitary areas, merged into the 12 statistical regions (the nine English regions, Wales, Scotland
 * and Northern Ireland); Spain from its provinces, merged into the 17 autonomous communities and two autonomous cities,
 * with the Canary Islands moved to an inset at the bottom left (like Alaska and Hawaii in the US map).
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , geojsonPath, nmArg] = process.argv;
const nm = resolve(nmArg || 'node_modules');
const require = createRequire(nm + '/');
const d3 = require('d3-geo');
const { geoProject } = require('d3-geo-projection');
const { topology } = require('topojson-server');
const { feature, merge } = require('topojson-client');
const { presimplify, simplify, quantile } = require('topojson-simplify');
const all = JSON.parse(readFileSync(geojsonPath, 'utf8'));

const W = 975, H = 610, PAD = 28;

/* ---------- how each country is grouped, named and projected ---------- */
const UK = {
  'Northern Ireland': ['NI', 'Northern Ireland'],
  'West Wales and the Valleys': ['WA', 'Wales'], 'East Wales': ['WA', 'Wales'],
  'Highlands and Islands': ['SC', 'Scotland'], 'South Western': ['SC', 'Scotland'], 'North Eastern': ['SC', 'Scotland'], Eastern: ['SC', 'Scotland'],
  'North East': ['NE', 'North East'], 'North West': ['NW', 'North West'], 'Yorkshire and the Humber': ['YH', 'Yorkshire and the Humber'],
  'East Midlands': ['EM', 'East Midlands'], 'West Midlands': ['WM', 'West Midlands'], East: ['EE', 'East of England'],
  'Greater London': ['LN', 'London'], 'South East': ['SE', 'South East'], 'South West': ['SW', 'South West'],
};
const ES = {
  Andalucía: ['AN', 'Andalucía'], 'Aragón': ['AR', 'Aragón'], Asturias: ['AS', 'Asturias'], 'Islas Baleares': ['IB', 'Illes Balears'],
  'Canary Is.': ['CN', 'Canarias'], Cantabria: ['CB', 'Cantabria'], 'Castilla y León': ['CL', 'Castilla y León'],
  'Castilla-La Mancha': ['CM', 'Castilla-La Mancha'], 'Cataluña': ['CT', 'Cataluña'], Valenciana: ['VC', 'Comunitat Valenciana'],
  Extremadura: ['EX', 'Extremadura'], Galicia: ['GA', 'Galicia'], Madrid: ['MD', 'Madrid'], Murcia: ['MC', 'Murcia'],
  'Foral de Navarra': ['NC', 'Navarra'], 'País Vasco': ['PV', 'País Vasco'], 'La Rioja': ['RI', 'La Rioja'],
  Ceuta: ['CE', 'Ceuta'], Melilla: ['ML', 'Melilla'],
};
const byIso = (code) => (p) => (p.iso_a2 === code && p.iso_3166_2 && !/~$/.test(p.iso_3166_2) ? [p.iso_3166_2.split('-')[1], p.name] : null);

const COUNTRIES = {
  uk: {
    code: 'GB', label: 'United Kingdom', const: 'UK_REGIONS', box: 'UK_REGIONS_VIEWBOX',
    classify: (p) => (p.iso_a2 === 'GB' ? UK[p.region] || null : null),
    projection: () => d3.geoTransverseMercator().rotate([2, 0]),
    weight: 0.1,
  },
  es: {
    code: 'ES', label: 'Spain', const: 'ES_REGIONS', box: 'ES_REGIONS_VIEWBOX',
    classify: (p) => (p.iso_a2 === 'ES' ? ES[p.region] || null : null),
    projection: () => d3.geoConicConformal().parallels([36, 44]).rotate([3.7, 0]),
    inset: { id: 'CN', projection: () => d3.geoMercator(), extent: [[PAD, 470], [250, 580]] },
    weight: 0.08,
  },
  de: {
    code: 'DE', label: 'Germany', const: 'DE_REGIONS', box: 'DE_REGIONS_VIEWBOX',
    classify: byIso('DE'),
    projection: () => d3.geoConicConformal().parallels([48.7, 53.7]).rotate([-10.5, 0]),
    weight: 0.12,
  },
  ca: {
    code: 'CA', label: 'Canada', const: 'CA_REGIONS', box: 'CA_REGIONS_VIEWBOX',
    classify: byIso('CA'),
    projection: () => d3.geoConicConformal().parallels([49, 77]).rotate([96, 0]),
    weight: 0.05,
  },
  au: {
    code: 'AU', label: 'Australia', const: 'AU_REGIONS', box: 'AU_REGIONS_VIEWBOX',
    classify: byIso('AU'),
    projection: () => d3.geoConicEqualArea().parallels([-18, -36]).rotate([-134, 0]),
    weight: 0.1,
  },
};

const here = dirname(fileURLToPath(import.meta.url));
const r = (n) => Math.round(n);
const rings = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((p) => p[0]);

for (const [key, c] of Object.entries(COUNTRIES)) {
  const feats = all.features.filter((f) => f.properties.iso_a2 === c.code);
  const groups = new Map(); // id -> { name, features[] }
  for (const f of feats) {
    const hit = c.classify(f.properties);
    if (!hit) continue;
    const [id, name] = hit;
    if (!groups.has(id)) groups.set(id, { id, name, features: [] });
    groups.get(id).features.push(f);
  }
  const insetFeats = c.inset ? groups.get(c.inset.id).features : [];
  const mainFeats = [...groups.values()].flatMap((g) => (c.inset && g.id === c.inset.id ? [] : g.features));
  const fcOf = (features) => ({ type: 'FeatureCollection', features });
  const mainProj = c.projection();
  mainProj.fitExtent([[PAD, PAD], [W - PAD, H - PAD]], fcOf(mainFeats));
  const projected = [];
  const tag = (f, id) => ({ type: 'Feature', properties: { id }, geometry: f.geometry });
  for (const g of groups.values()) {
    const list = c.inset && g.id === c.inset.id ? [] : g.features;
    for (const f of list) projected.push(...geoProject(fcOf([tag(f, g.id)]), mainProj).features);
  }
  if (c.inset) {
    const ip = c.inset.projection();
    ip.fitExtent(c.inset.extent, fcOf(insetFeats));
    for (const f of insetFeats) projected.push(...geoProject(fcOf([tag(f, c.inset.id)]), ip).features);
  }
  const topo = topology({ regions: fcOf(projected) }, 1e6);
  const pre = presimplify(topo);
  const slim = simplify(pre, quantile(pre, c.weight));
  const geoms = slim.objects.regions.geometries;
  const out = [];
  for (const g of groups.values()) {
    const merged = merge(slim, geoms.filter((x) => x.properties.id === g.id));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, d = '';
    const all = rings(merged);
    const area = (ring) => { let a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9; for (const [x, y] of ring) { a0 = Math.min(a0, x); a1 = Math.max(a1, x); b0 = Math.min(b0, y); b1 = Math.max(b1, y); } return (a1 - a0) * (b1 - b0); };
    const biggest = all.reduce((m, ring) => (area(ring) > area(m) ? ring : m), all[0]);
    for (const ring of all) {
      let rx0 = 1e9, ry0 = 1e9, rx1 = -1e9, ry1 = -1e9;
      for (const [x, y] of ring) { rx0 = Math.min(rx0, x); rx1 = Math.max(rx1, x); ry0 = Math.min(ry0, y); ry1 = Math.max(ry1, y); }
      if ((rx1 - rx0) * (ry1 - ry0) < 12 && ring !== biggest) continue; // islets are noise at this scale; a region always keeps its largest piece
      x0 = Math.min(x0, rx0); x1 = Math.max(x1, rx1); y0 = Math.min(y0, ry0); y1 = Math.max(y1, ry1);
      let px = r(ring[0][0]), py = r(ring[0][1]);
      const segs = [];
      for (let i = 1; i < ring.length; i++) { const x = r(ring[i][0]), y = r(ring[i][1]); if (x === px && y === py) continue; segs.push(x - px + ' ' + (y - py)); px = x; py = y; }
      // a piece that collapses to a point at this scale (Ceuta, Melilla) becomes a small square so it can still be seen and hovered
      if (segs.length < 2) d += 'M' + (r(ring[0][0]) - 3) + ' ' + (r(ring[0][1]) - 3) + 'h6v6h-6z';
      else d += 'M' + r(ring[0][0]) + ' ' + r(ring[0][1]) + 'l' + segs.join(' ') + 'z';
    }
    if (!d) throw new Error(`${key}/${g.id}: nothing left after simplification`);
    out.push({ id: g.id, name: g.name, d, box: [r(x0), r(y0), r(x1 - x0), r(y1 - y0)] });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  const file = resolve(here, `../../src/regions/${key}.ts`);
  writeFileSync(file, `/* Generated by scripts/regions/countries.mjs from Natural Earth (public domain). Do not edit by hand. */
import type { RegionShape } from '../components/RegionMap/types';

/** ${c.label}: ${out.length} regions, centred in a 975 x 610 box. */
export const ${c.box}: [number, number, number, number] = [0, 0, ${W}, ${H}];

export const ${c.const}: RegionShape[] = ${JSON.stringify(out).replace(/},\{/g, '},\n{')};
`);
  console.log(key, out.length, 'regions,', (readFileSync(file).length / 1024).toFixed(1), 'KB', out.map((o) => o.id).join(' '));
}
