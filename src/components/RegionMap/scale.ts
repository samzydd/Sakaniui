/**
 * The colour scale shared by the map and its legend.
 *
 * `breaks` are the upper edges between bins, ascending: 4 breaks make 5 bins. A value goes in the first bin whose
 * break is above it. A `diverging` scale (growth, change) paints the bins that sit entirely at or below zero in the
 * chart orange, deepest for the most negative, and the rest in the chart blue.
 */
export interface RegionScale {
  breaks: number[];
  /** Colour bins below zero differently (growth, change). Default false: one blue ramp. */
  diverging?: boolean;
}

/** The lightest blue is 25% chart blue over the muted background; five bins step by 18.75%. */
const RAMP_MIN = 0.25;
const RAMP_STEP = 0.1875;

/** Which bin a value falls in, 0 .. breaks.length. */
export function binIndex(value: number, breaks: number[]): number {
  let i = 0;
  while (i < breaks.length && value >= breaks[i]) i += 1;
  return i;
}

/**
 * The CSS colour of bin `i`. Built from design tokens with color-mix, so it follows light and dark mode and any
 * theme override of the chart colours.
 */
export function binColor(i: number, scale: RegionScale): string {
  const n = scale.breaks.length + 1;
  // The common steps are tokens (--color-map-bin-0..4, --color-map-neg-0..1), so a theme can retune them and Figma has
  // the same variables. Any other step is mixed the same way on the spot.
  const BIN = [0.25, 0.4375, 0.625, 0.8125, 1];
  const NEG = [0.85, 0.4];
  const at = (arr: number[], prefix: string, t: number) => {
    const k = arr.findIndex((x) => Math.abs(x - t) < 0.001);
    if (k >= 0) return `var(--color-map-${prefix}-${k})`;
    return `color-mix(in srgb, var(${prefix === 'neg' ? '--color-chart-1' : '--color-chart-2'}) ${Math.round(t * 1000) / 10}%, var(--color-bg-muted))`;
  };
  if (scale.diverging) {
    // bin k spans [breaks[k-1], breaks[k]); it is "below zero" when its upper edge is <= 0
    const below = scale.breaks.filter((b) => b <= 0).length; // bins 0 .. below-1
    if (i < below) {
      // deepest orange for the most negative bin, easing off toward zero
      return at(NEG, 'neg', below === 1 ? 0.85 : 0.85 - (i / (below - 1)) * 0.45);
    }
    // the blue bins use the top of the same ramp as a plain scale: the last bin is always the full chart blue
    const above = n - below;
    const step = above > 1 ? Math.min(RAMP_STEP, 0.75 / (above - 1)) : 0;
    return at(BIN, 'bin', 1 - (above - 1 - (i - below)) * step);
  }
  return at(BIN, 'bin', n === 1 ? 1 : RAMP_MIN + (i / (n - 1)) * (1 - RAMP_MIN));
}

/** Even-ish breaks for a set of values (quantiles), rounded to 2 significant figures. Used when `scale` is left out. */
export function autoBreaks(values: number[], bins = 5): number[] {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return [];
  const out: number[] = [];
  for (let k = 1; k < bins; k += 1) {
    const x = v[Math.min(v.length - 1, Math.floor((k / bins) * v.length))];
    const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(x) || 1)) - 1);
    const rounded = Math.round(x / mag) * mag;
    if (out.length === 0 || rounded > out[out.length - 1]) out.push(rounded);
  }
  return out;
}
