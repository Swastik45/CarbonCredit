/**
 * Geodesic polygon area, Nepal bounds, and GeoJSON boundary helpers for MRV plots.
 */

export const NEPAL_BOUNDS = {
  minLat: 26.3,
  maxLat: 30.5,
  minLng: 80.0,
  maxLng: 88.3,
} as const;

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type BoundaryValidation = {
  ok: boolean;
  error?: string;
  polygon?: GeoJsonPolygon;
  measuredAreaHectares?: number;
  centroid?: { lat: number; lng: number };
};

const EARTH_RADIUS_M = 6378137;
const MIN_VERTICES = 3;
const MIN_AREA_HA = 0.01;
const MAX_AREA_HA = 5000;
const AREA_MISMATCH_RATIO = 0.25;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Spherical excess (Girard) polygon area in m² from [lng, lat] ring. */
export function ringAreaSquareMeters(ring: number[][]): number {
  if (ring.length < 3) return 0;

  let total = 0;
  const n = ring.length;

  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % n];
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }

  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function squareMetersToHectares(m2: number): number {
  return Math.round((m2 / 10000) * 10000) / 10000;
}

export function isInsideNepal(lat: number, lng: number): boolean {
  return (
    lat >= NEPAL_BOUNDS.minLat &&
    lat <= NEPAL_BOUNDS.maxLat &&
    lng >= NEPAL_BOUNDS.minLng &&
    lng <= NEPAL_BOUNDS.maxLng
  );
}

export function parseBoundaryGeoJson(input: unknown): GeoJsonPolygon | null {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;

  // Accept Feature or FeatureCollection with first Polygon
  if (obj.type === 'Feature' && obj.geometry) {
    return parseBoundaryGeoJson(obj.geometry);
  }
  if (obj.type === 'FeatureCollection' && Array.isArray(obj.features) && obj.features[0]) {
    return parseBoundaryGeoJson(obj.features[0]);
  }

  if (obj.type !== 'Polygon' || !Array.isArray(obj.coordinates)) return null;

  const coordinates = obj.coordinates as number[][][];
  if (!coordinates[0] || coordinates[0].length < MIN_VERTICES) return null;

  return { type: 'Polygon', coordinates };
}

export function ensureClosedRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [first[0], first[1]]];
}

export function polygonCentroid(polygon: GeoJsonPolygon): { lat: number; lng: number } {
  const ring = polygon.coordinates[0];
  let sumLng = 0;
  let sumLat = 0;
  const count = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1
    : ring.length;

  for (let i = 0; i < count; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }

  return { lng: sumLng / count, lat: sumLat / count };
}

export function validateBoundary(
  boundaryInput: unknown,
  claimedAreaHectares?: number
): BoundaryValidation {
  const polygon = parseBoundaryGeoJson(boundaryInput);
  if (!polygon) {
    return { ok: false, error: 'Valid GeoJSON Polygon boundary is required (draw the plot outline on the map).' };
  }

  const outer = ensureClosedRing(polygon.coordinates[0].map((c) => [Number(c[0]), Number(c[1])]));
  const uniqueVertices = outer.length - 1;

  if (uniqueVertices < MIN_VERTICES) {
    return { ok: false, error: `Boundary must have at least ${MIN_VERTICES} vertices.` };
  }

  for (const [lng, lat] of outer) {
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { ok: false, error: 'Boundary contains invalid coordinates.' };
    }
  }

  const closedPolygon: GeoJsonPolygon = { type: 'Polygon', coordinates: [outer] };
  const areaHa = squareMetersToHectares(ringAreaSquareMeters(outer));
  const centroid = polygonCentroid(closedPolygon);

  if (areaHa < MIN_AREA_HA) {
    return { ok: false, error: `Measured plot area (${areaHa} ha) is too small. Minimum is ${MIN_AREA_HA} ha.` };
  }
  if (areaHa > MAX_AREA_HA) {
    return { ok: false, error: `Measured plot area (${areaHa} ha) exceeds maximum ${MAX_AREA_HA} ha.` };
  }

  if (!isInsideNepal(centroid.lat, centroid.lng)) {
    return {
      ok: false,
      error: `Plot centroid (${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)}) is outside Nepal. This platform is Nepal-first.`,
    };
  }

  if (claimedAreaHectares !== undefined && claimedAreaHectares > 0) {
    const ratio = Math.abs(areaHa - claimedAreaHectares) / claimedAreaHectares;
    if (ratio > AREA_MISMATCH_RATIO) {
      return {
        ok: false,
        error: `Claimed area (${claimedAreaHectares} ha) differs from measured polygon area (${areaHa} ha) by more than ${AREA_MISMATCH_RATIO * 100}%. Adjust the boundary or claimed area.`,
        polygon: closedPolygon,
        measuredAreaHectares: areaHa,
        centroid,
      };
    }
  }

  return {
    ok: true,
    polygon: closedPolygon,
    measuredAreaHectares: areaHa,
    centroid,
  };
}

export function geometryHash(polygon: GeoJsonPolygon): string {
  const raw = JSON.stringify(polygon.coordinates);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `g${Math.abs(hash).toString(16)}`;
}

export function speciesMultiplier(treeSpecies: string): number {
  return treeSpecies.toLowerCase().includes('bamboo') ? 1.4 : 1.15;
}

/** Platform voluntary credit estimate (not a compliance credit). */
export function estimateCredits(measuredAreaHa: number, meanNdvi: number, treeSpecies: string): number {
  return Math.round(measuredAreaHa * Math.max(0, meanNdvi) * speciesMultiplier(treeSpecies) * 12.5 * 100) / 100;
}
