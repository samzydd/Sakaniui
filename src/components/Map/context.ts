import React from 'react';
import type { LatLng } from './geo';

export interface MapContextValue {
  /** Container pixel position of a place, or null when it is far outside the view. */
  project: (position: LatLng) => { x: number; y: number } | null;
  zoom: number;
  /** Ease the map to a place (and zoom). */
  flyTo: (center: LatLng, zoom?: number) => void;
  /** Ease the map so every place in the list is in view. */
  fitBounds: (places: LatLng[], padding?: number) => void;
  maxZoom: number;
}

export const MapContext = React.createContext<MapContextValue | null>(null);

/** For MapMarker / MapPopup / MapClusterLayer (and custom overlays): projects places into the map's pixels. */
export function useMapContext() {
  const ctx = React.useContext(MapContext);
  if (!ctx) throw new Error('MapMarker, MapPopup and MapClusterLayer must be rendered inside <Map>.');
  return ctx;
}
