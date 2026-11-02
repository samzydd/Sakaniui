/**
 * Map maths shared by Map (Web Mercator tiles) and MapGlobe (orthographic
 * dotted sphere). Plain functions, no dependencies.
 */

import { LAND_MASK_B64, LAND_MASK_H, LAND_MASK_W } from './landMask';

/** [latitude, longitude] in degrees. */
export type LatLng = [number, number];

export const TILE_SIZE = 256;
const MAX_LAT = 85.05112878;
const RAD = Math.PI / 180;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

/* ---- Web Mercator: world pixels at a (fractional) zoom ---- */

export function toWorld([lat, lng]: LatLng, zoom: number) {
  const size = TILE_SIZE * 2 ** zoom;
  const s = Math.sin(clamp(lat, -MAX_LAT, MAX_LAT) * RAD);
  return { x: ((lng + 180) / 360) * size, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size };
}

export function fromWorld(x: number, y: number, zoom: number): LatLng {
  const size = TILE_SIZE * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / size;
  return [clamp(Math.atan(Math.sinh(n)) / RAD, -MAX_LAT, MAX_LAT), wrapLng((x / size) * 360 - 180)];
}

/* ---- Globe: land mask, dot rings, orthographic projection ---- */

let maskBytes: Uint8Array | null = null;
function mask() {
  if (!maskBytes) {
    const bin = atob(LAND_MASK_B64);
    maskBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) maskBytes[i] = bin.charCodeAt(i);
  }
  return maskBytes;
}

export function isLand(lat: number, lng: number) {
  const row = clamp(Math.floor(90 - lat), 0, LAND_MASK_H - 1);
  const col = clamp(Math.floor(wrapLng(lng) + 180), 0, LAND_MASK_W - 1);
  const i = row * LAND_MASK_W + col;
  return (mask()[i >> 3] & (0x80 >> (i & 7))) !== 0;
}

export interface GlobeDot { cp: number; sp: number; lam: number; land: boolean }

/** Rings of latitude, with dots spaced evenly along each ring. */
export function globeDots(step: number): GlobeDot[] {
  const dots: GlobeDot[] = [];
  for (let lat = -90 + step / 2; lat < 90; lat += step) {
    const n = Math.max(1, Math.round((360 * Math.cos(lat * RAD)) / step));
    for (let i = 0; i < n; i++) {
      const lng = -180 + ((i + 0.5) * 360) / n;
      dots.push({ cp: Math.cos(lat * RAD), sp: Math.sin(lat * RAD), lam: lng * RAD, land: isLand(lat, lng) });
    }
  }
  return dots;
}

/** Orthographic projection centred on [tilt, rotLng]: x right, y up, z toward the viewer. */
export function orthographic(rotLng: number, tilt: number) {
  const l0 = rotLng * RAD, c0 = Math.cos(tilt * RAD), s0 = Math.sin(tilt * RAD);
  return (cp: number, sp: number, lam: number) => {
    const dl = lam - l0, cdl = Math.cos(dl);
    return { x: cp * Math.sin(dl), y: c0 * sp - s0 * cp * cdl, z: s0 * sp + c0 * cp * cdl };
  };
}

export const sphere = ([lat, lng]: LatLng) => ({ cp: Math.cos(lat * RAD), sp: Math.sin(lat * RAD), lam: lng * RAD });

/** A great-circle arc between two places, lifted off the surface toward its middle. */
export function arcPath(from: LatLng, to: LatLng, segments = 64, lift = 0.12) {
  const v = (p: LatLng) => { const s = sphere(p); return [s.cp * Math.cos(s.lam), s.cp * Math.sin(s.lam), s.sp]; };
  const A = v(from), B = v(to);
  const om = Math.acos(clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1));
  const so = Math.sin(om) || 1e-6;
  const pts: { cp: number; sp: number; lam: number; h: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const k1 = Math.sin((1 - t) * om) / so, k2 = Math.sin(t * om) / so;
    const x = k1 * A[0] + k2 * B[0], y = k1 * A[1] + k2 * B[1], z = k1 * A[2] + k2 * B[2];
    const r = Math.hypot(x, y, z) || 1;
    const lat = Math.asin(clamp(z / r, -1, 1));
    pts.push({ cp: Math.cos(lat), sp: Math.sin(lat), lam: Math.atan2(y, x), h: 1 + lift * Math.sin(Math.PI * t) * Math.min(1, om / 1.2) });
  }
  return pts;
}
