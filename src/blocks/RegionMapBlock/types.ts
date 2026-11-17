import type { RegionScale } from '../../components/RegionMap';

/** One thing the map can be shaded by (Revenue, Growth, Penetration). */
export interface RegionMapMetric {
  id: string;
  /** The tab label. */
  label: string;
  /** What the headline figure means, e.g. "Annual recurring revenue". */
  unit: string;
  /** Formats a value for the headline, the hover card and the legend. */
  format: (value: number) => string;
  /** The legend breaks. */
  scale: RegionScale;
  /** Words for how a figure compares with the average region ("+16.6 pts vs average"). Default: points for a mean metric, a multiple for a sum. */
  compare?: (value: number, average: number) => string;
  /** How the headline combines every region when none is selected. Default "sum". */
  aggregate?: 'sum' | 'mean';
}

/** One region's figures, by metric id. */
export interface RegionMapRow {
  id: string;
  name: string;
  values: Record<string, number>;
}

export type RegionMapState = 'default' | 'loading' | 'empty';
