import { US_STATES } from '../../components/RegionMap';
import type { RegionMapMetric, RegionMapRow } from './types';

const money = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};
const pct = (n: number, signed = false) => `${n < 0 ? '−' : signed && n > 0 ? '+' : ''}${Math.abs(n).toFixed(1)}%`;

/** Three metrics, in the order of the tabs. */
export const SAMPLE_METRICS: RegionMapMetric[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    unit: 'Annual recurring revenue',
    caption: 'Shaded by annual recurring revenue',
    rankedBy: 'Ranked by revenue',
    format: money,
    scale: { breaks: [120_000, 230_000, 760_000, 1_600_000] },
  },
  {
    id: 'growth',
    label: 'Growth',
    unit: 'Growth year over year',
    caption: 'Shaded by growth year over year',
    rankedBy: 'Ranked by growth',
    format: (n) => pct(n, true),
    scale: { breaks: [-4.8, 0, 4.3, 8.9, 21], diverging: true },
    aggregate: 'mean',
  },
  {
    id: 'penetration',
    label: 'Penetration',
    unit: 'Target accounts won',
    caption: 'Shaded by target accounts won',
    rankedBy: 'Ranked by penetration',
    format: (n) => pct(n),
    scale: { breaks: [4.6, 6.2, 10, 14] },
    aggregate: 'mean',
  },
];

/* A fixed pseudo-random stream, so the sample reads the same on every render and in every screenshot. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/** Roughly how big each state's customer base is (relative), so the map has a believable shape. */
const WEIGHT: Record<string, number> = {
  CA: 26, TX: 22, FL: 18, NY: 17, WA: 9, IL: 8, GA: 8, NC: 6.5, VA: 6, MA: 6, CO: 5.5, OR: 5, AZ: 5, PA: 5, OH: 4.5, MI: 4, NJ: 4,
  TN: 3.5, MN: 3.4, MO: 3, MD: 3, WI: 2.6, IN: 2.5, UT: 2.4, NV: 2.2, SC: 2, AL: 1.8, KY: 1.6, OK: 1.5, LA: 1.5, CT: 1.5, KS: 1.3,
  IA: 1, ID: 1.2, NE: 0.9, NM: 0.8, AR: 0.8, MS: 0.7, HI: 0.7, NH: 0.6, ME: 0.5, DE: 0.5, RI: 0.4, MT: 0.4, SD: 0.3, ND: 0.25,
  AK: 0.25, VT: 0.2, WV: 0.3, DC: 0.35, WY: 0.17,
};

/** The sample figures: revenue, growth (%) and penetration (% of target accounts won) for each of the 51 regions. */
export const SAMPLE_ROWS: RegionMapRow[] = US_STATES.map((s, i) => {
  const r = rng(i * 7919 + 13);
  const w = WEIGHT[s.id] ?? 1;
  return {
    id: s.id,
    name: s.name,
    values: {
      revenue: Math.round((w * 200_000 * (0.8 + r() * 0.4)) / 1000) * 1000,
      growth: Math.round((-9 + r() * 38) * 10) / 10,
      penetration: Math.round((2 + r() * 15) * 10) / 10,
    },
  };
});
