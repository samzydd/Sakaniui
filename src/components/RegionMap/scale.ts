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
  const mix = (token: string, t: number) =>
    `color-mix(in srgb, var(${token}) ${Math.round(t * 100)}%, var(--color-bg-muted))`;
  if (scale.diverging) {
    // bin k spans [breaks[k-1], breaks[k]); it is "below zero" when its upper edge is <= 0
    const negative = scale.breaks.map((b) => b <= 0);
    const below = negative.filter(Boolean).length; // bins 0 .. below-1
    if (i < below) {
      // deepest orange for the most negative bin, easing off toward zero
      return mix('--color-chart-1', below === 1 ? 0.8 : 0.85 - (i / (below - 1)) * 0.45);
    }
    const above = n - below;
    const k = i - below;
    return mix('--color-chart-2', above === 1 ? 0.9 : 0.3 + (k / (above - 1)) * 0.7);
  }
  return mix('--color-chart-2', n === 1 ? 0.9 : 0.25 + (i / (n - 1)) * 0.75);
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
