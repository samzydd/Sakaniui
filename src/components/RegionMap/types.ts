/** One drawable region: an id (shown as the key in callbacks), a label, an SVG path, and its bounding box. */
export interface RegionShape {
  id: string;
  name: string;
  /** SVG path data in the shapes' own coordinate space (see the viewBox that ships with them). */
  d: string;
  /** [x, y, width, height] of the path, used to zoom to it. */
  box: [number, number, number, number];
}
