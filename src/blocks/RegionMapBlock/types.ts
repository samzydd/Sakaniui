import type { RegionScale } from '../../components/RegionMap';

/** One thing the map can be shaded by (Revenue, Growth, Penetration). */
export interface RegionMapMetric {
  id: string;
  /** The tab label. */
  label: string;
  /** What the headline figure means, e.g. "Annual recurring revenue". */
  unit: string;
  /** The line under the legend, e.g. "Shaded by annual recurring revenue". */
  caption: string;
  /** "Ranked by revenue" */
  rankedBy: string;
  /** Formats a value for the headline, the hover card and the legend. */
  format: (value: number) => string;
  /** The legend breaks. */
  scale: RegionScale;
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
