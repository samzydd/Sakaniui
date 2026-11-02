/**
 * MapClusterLayer
 *
 * Draws many places on a Map without drawing them all. Places close together at the current zoom
 * collapse into a MapMarker cluster with a count (the Figma "Map Marker" Cluster variant); clicking
 * one zooms in to fit its places, and they split apart as you zoom. Single places are drawn by
 * `renderPoint`, so you decide what a place looks like and whether it opens a popup.
 *
 * Places are bucketed on a grid of `radius` px at the whole zoom level below the current one, then buckets
 * whose centres would overlap are merged, so clusters hold still while you pinch-zoom between levels and
 * only regroup on a level change. Only clusters in view are rendered, which keeps thousands of places cheap.
 */

import React from 'react';
import { useMapContext } from './context';
import { toWorld, type LatLng } from './geo';
import { MapMarker } from './MapMarker';

export interface MapClusterPoint {
  id: string | number;
  position: LatLng;
}

export interface MapClusterLayerProps<T extends MapClusterPoint = MapClusterPoint> {
  points: T[];
  /** Draws one place that is not clustered, usually a <MapMarker>. Give it the point's `id` as its key. */
  renderPoint: (point: T) => React.ReactNode;
  /** Grid size in px: larger groups more places together. Defaults to 56. */
  radius?: number;
  /** From this zoom up, nothing clusters. Defaults to 16. */
  clusterMaxZoom?: number;
  /** Called after a cluster is clicked, with the places in it. The map zooms to them first. */
  onClusterClick?: (points: T[]) => void;
}

interface Group<T> { key: string; position: LatLng; points: T[] }

export function MapClusterLayer<T extends MapClusterPoint = MapClusterPoint>({
  points, renderPoint, radius = 56, clusterMaxZoom = 16, onClusterClick,
}: MapClusterLayerProps<T>) {
  const { zoom, project, fitBounds, flyTo, maxZoom } = useMapContext();
  const level = Math.floor(zoom);
  const clustering = level < clusterMaxZoom;

  const groups = React.useMemo<Group<T>[]>(() => {
    if (!clustering) return points.map((p) => ({ key: String(p.id), position: p.position, points: [p] }));
    // 1. bucket every place into a grid cell
    const cells = new Map<string, T[]>();
    for (const p of points) {
      const w = toWorld(p.position, level);
      const k = `${Math.floor(w.x / radius)}:${Math.floor(w.y / radius)}`;
      const cell = cells.get(k);
      if (cell) cell.push(p); else cells.set(k, [p]);
    }
    // 2. merge cells whose centres would draw on top of each other (a cluster is ~44px wide), biggest first
    const gap = radius * 0.8;
    const centred = Array.from(cells, ([k, pts]) => {
      const lat = pts.reduce((sum, p) => sum + p.position[0], 0) / pts.length;
      const lng = pts.reduce((sum, p) => sum + p.position[1], 0) / pts.length;
      return { k, pts, lat, lng, ...toWorld([lat, lng], level) };
    }).sort((a, b) => b.pts.length - a.pts.length);
    const kept: typeof centred = [], near = new Map<string, typeof centred>();
    for (const c of centred) {
      const cx = Math.floor(c.x / gap), cy = Math.floor(c.y / gap);
      let into: (typeof centred)[number] | undefined;
      for (let dx = -1; dx <= 1 && !into; dx++) for (let dy = -1; dy <= 1 && !into; dy++) {
        into = near.get(`${cx + dx}:${cy + dy}`)?.find((m) => Math.hypot(m.x - c.x, m.y - c.y) < gap);
      }
      if (into) {
        const n = into.pts.length + c.pts.length;
        into.lat = (into.lat * into.pts.length + c.lat * c.pts.length) / n;
        into.lng = (into.lng * into.pts.length + c.lng * c.pts.length) / n;
        into.pts = into.pts.concat(c.pts);
        Object.assign(into, toWorld([into.lat, into.lng], level));
      } else {
        kept.push(c);
        const key = `${cx}:${cy}`;
        near.set(key, [...(near.get(key) ?? []), c]);
      }
    }
    return kept.map((c) => ({
      key: c.pts.length === 1 ? String(c.pts[0].id) : `c${level}:${c.k}`,
      position: c.pts.length === 1 ? c.pts[0].position : ([c.lat, c.lng] as LatLng),
      points: c.pts,
    }));
  }, [points, level, radius, clustering]);

  const open = (g: Group<T>) => {
    const places = g.points.map((p) => p.position);
    const same = places.every((p) => p[0] === places[0][0] && p[1] === places[0][1]);
    if (same) flyTo(g.position, Math.min(maxZoom, level + 3)); else fitBounds(places);
    onClusterClick?.(g.points);
  };

  return (
    <>
      {groups.map((g) => {
        if (!project(g.position)) return null; // out of view: render nothing
        return g.points.length === 1
          ? <React.Fragment key={g.key}>{renderPoint(g.points[0])}</React.Fragment>
          : <MapMarker key={g.key} variant="cluster" position={g.position} count={g.points.length} onClick={() => open(g)} />;
      })}
    </>
  );
}

MapClusterLayer.displayName = 'MapClusterLayer';
export default MapClusterLayer;
