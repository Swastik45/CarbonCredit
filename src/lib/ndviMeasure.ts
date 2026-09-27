import prisma from '@/lib/dbconnect';
import { parseBoundaryGeoJson, geometryHash, validateBoundary } from '@/lib/geoArea';
import { measureNdviForPolygon } from '@/lib/sentinelHub';

export const MIN_NDVI_FOR_ISSUE = 0.3;
export const MAX_CLOUD_FOR_ISSUE = 40;

export type MeasureNdviOutcome = {
  observation: {
    id: string;
    plantationId: string;
    meanNdvi: number;
    stDevNdvi: number | null;
    cloudCoverPct: number | null;
    sceneDate: Date;
    satellite: string;
  };
  plantationNdviScore: number;
  warnings: string[];
};

/**
 * Measure Sentinel-2 NDVI for a plantation boundary and persist NdviObservation.
 */
export async function measureAndStoreNdvi(plantationId: string): Promise<MeasureNdviOutcome> {
  const plantation = await prisma.plantation.findUnique({ where: { id: plantationId } });
  if (!plantation) {
    throw new Error('Plantation not found.');
  }
  if (!plantation.boundaryGeoJson) {
    throw new Error('Plantation has no boundary polygon. Farmer must draw the plot outline before NDVI measurement.');
  }

  const validated = validateBoundary(plantation.boundaryGeoJson);
  if (!validated.ok || !validated.polygon) {
    throw new Error(validated.error || 'Invalid plantation boundary.');
  }

  const polygon = parseBoundaryGeoJson(plantation.boundaryGeoJson) || validated.polygon;
  const stats = await measureNdviForPolygon(polygon);
  const hash = geometryHash(polygon);

  const warnings: string[] = [];
  if (stats.meanNdvi < MIN_NDVI_FOR_ISSUE) {
    warnings.push(`Mean NDVI ${stats.meanNdvi} is below ${MIN_NDVI_FOR_ISSUE} (weak vegetation signal).`);
  }
  if (stats.cloudCoverPct != null && stats.cloudCoverPct > MAX_CLOUD_FOR_ISSUE) {
    warnings.push(`Cloud/no-data fraction ~${stats.cloudCoverPct}% exceeds ${MAX_CLOUD_FOR_ISSUE}% gate.`);
  }

  const observation = await prisma.ndviObservation.create({
    data: {
      plantationId,
      meanNdvi: stats.meanNdvi,
      stDevNdvi: stats.stDevNdvi,
      cloudCoverPct: stats.cloudCoverPct,
      sceneDate: stats.sceneDate,
      intervalFrom: stats.intervalFrom,
      intervalTo: stats.intervalTo,
      satellite: 'SENTINEL2',
      geometryHash: hash,
      rawStatsJson: JSON.stringify(stats.rawStats),
    },
  });

  await prisma.plantation.update({
    where: { id: plantationId },
    data: {
      ndviScore: stats.meanNdvi,
      measuredAreaHectares: validated.measuredAreaHectares ?? plantation.measuredAreaHectares,
    },
  });

  return {
    observation: {
      id: observation.id,
      plantationId: observation.plantationId,
      meanNdvi: observation.meanNdvi,
      stDevNdvi: observation.stDevNdvi,
      cloudCoverPct: observation.cloudCoverPct,
      sceneDate: observation.sceneDate,
      satellite: observation.satellite,
    },
    plantationNdviScore: stats.meanNdvi,
    warnings,
  };
}

export async function getLatestNdviObservation(plantationId: string) {
  return prisma.ndviObservation.findFirst({
    where: { plantationId },
    orderBy: { createdAt: 'desc' },
  });
}
