/**
 * Free Sentinel-2 NDVI via Microsoft Planetary Computer (STAC + Data API).
 * No API key, company signup, or credit card required.
 */

import { GeoJsonPolygon } from './geoArea';

const STAC_SEARCH = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const DATA_STATS = 'https://planetarycomputer.microsoft.com/api/data/v1/item/statistics';
const COLLECTION = 'sentinel-2-l2a';

export type NdviStatsResult = {
  meanNdvi: number;
  stDevNdvi: number | null;
  cloudCoverPct: number | null;
  sceneDate: Date;
  intervalFrom: Date;
  intervalTo: Date;
  rawStats: unknown;
  itemId?: string;
};

function lookbackRange(days = 90): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

function polygonBbox(polygon: GeoJsonPolygon): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of polygon.coordinates[0]) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [minLng, minLat, maxLng, maxLat];
}

type StacItem = {
  id: string;
  properties?: {
    datetime?: string;
    start_datetime?: string;
    end_datetime?: string;
    'eo:cloud_cover'?: number;
  };
};

async function searchSentinel2Items(polygon: GeoJsonPolygon, from: string, to: string): Promise<StacItem[]> {
  const bbox = polygonBbox(polygon);
  const res = await fetch(STAC_SEARCH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      collections: [COLLECTION],
      bbox,
      datetime: `${from}/${to}`,
      limit: 12,
      query: {
        'eo:cloud_cover': { lt: 60 },
      },
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Planetary Computer STAC search failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return Array.isArray(data?.features) ? data.features : [];
}

async function statisticsForItem(itemId: string, polygon: GeoJsonPolygon): Promise<{
  mean: number;
  stdev: number | null;
  validPercent: number | null;
  raw: unknown;
} | null> {
  const params = new URLSearchParams();
  params.set('collection', COLLECTION);
  params.set('item', itemId);
  params.append('assets', 'B04');
  params.append('assets', 'B08');
  params.set('expression', '(B08-B04)/(B08+B04)');
  params.set('asset_as_band', 'true');
  params.set('max_size', '512');

  const feature = {
    type: 'Feature',
    properties: {},
    geometry: polygon,
  };

  const res = await fetch(`${DATA_STATS}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(feature),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Planetary Computer statistics failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return parseStatsPayload(await res.json());
}

function parseStatsPayload(data: any): {
  mean: number;
  stdev: number | null;
  validPercent: number | null;
  raw: unknown;
} | null {
  const statsRoot = data?.properties?.statistics || data?.statistics || data;
  if (!statsRoot || typeof statsRoot !== 'object') return null;

  const keys = Object.keys(statsRoot);
  // Expression key looks like "(B08-B04)/(B08+B04)"
  const preferred =
    keys.find((k) => k.includes('B08') && k.includes('B04')) ||
    keys.find((k) => k.toLowerCase().includes('ndvi')) ||
    keys[0];
  if (!preferred) return null;

  const bandStats = statsRoot[preferred];
  if (typeof bandStats?.mean !== 'number' || Number.isNaN(bandStats.mean)) return null;

  return {
    mean: bandStats.mean,
    stdev: typeof bandStats.std === 'number' ? bandStats.std : null,
    validPercent: typeof bandStats.valid_percent === 'number' ? bandStats.valid_percent : null,
    raw: data,
  };
}

/**
 * Measure mean Sentinel-2 NDVI for a plot polygon (free Planetary Computer).
 */
export async function measureNdviForPolygon(
  polygon: GeoJsonPolygon,
  options?: { from?: string; to?: string }
): Promise<NdviStatsResult> {
  const range = {
    from: options?.from || lookbackRange().from,
    to: options?.to || lookbackRange().to,
  };

  const items = await searchSentinel2Items(polygon, range.from, range.to);
  if (items.length === 0) {
    throw new Error(
      'No Sentinel-2 scenes found over this plot in the last 90 days (Planetary Computer). Try again later or adjust the boundary.'
    );
  }

  let lastError: string | null = null;

  for (const item of items) {
    try {
      const stats = await statisticsForItem(item.id, polygon);
      if (!stats) {
        lastError = `No statistics for scene ${item.id}`;
        continue;
      }

      if (stats.mean < -1 || stats.mean > 1) {
        lastError = `Out-of-range NDVI ${stats.mean} for ${item.id}`;
        continue;
      }

      const sceneDate = new Date(
        item.properties?.datetime || item.properties?.start_datetime || range.to
      );
      const cloudCoverPct =
        typeof item.properties?.['eo:cloud_cover'] === 'number'
          ? Math.round(item.properties['eo:cloud_cover'] * 10) / 10
          : stats.validPercent != null
            ? Math.round((100 - stats.validPercent) * 10) / 10
            : null;

      return {
        meanNdvi: Math.round(stats.mean * 10000) / 10000,
        stDevNdvi: stats.stdev != null ? Math.round(stats.stdev * 10000) / 10000 : null,
        cloudCoverPct,
        sceneDate,
        intervalFrom: sceneDate,
        intervalTo: sceneDate,
        rawStats: { itemId: item.id, cloudCover: cloudCoverPct, statistics: stats.raw },
        itemId: item.id,
      };
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(
    lastError ||
      'Could not compute NDVI from Planetary Computer for any recent Sentinel-2 scene. Try a clearer day or larger plot.'
  );
}

/** Always true — Planetary Computer needs no credentials. */
export function isNdviProviderConfigured(): boolean {
  return true;
}

/** @deprecated kept for older imports */
export function isSentinelHubConfigured(): boolean {
  return isNdviProviderConfigured();
}
