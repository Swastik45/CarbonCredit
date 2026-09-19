import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { PlantationStatus, Role } from '@prisma/client';
import { getCache, setCache } from '@/lib/redis';

const STATS_CACHE_KEY = 'carbon:stats:global';

export async function GET() {
  try {
    // ⚡ Try L1 Memory / L2 Redis Cache first (Instant < 1ms response)
    const cachedStats = await getCache(STATS_CACHE_KEY);
    if (cachedStats) {
      return NextResponse.json(JSON.parse(cachedStats));
    }

    const [totalPlantations, verifiedPlantations, pendingPlantations, farmersCount, businessCount, totalCreditsAggregate, totalHectaresAggregate] =
      await Promise.all([
        prisma.plantation.count(),
        prisma.plantation.count({ where: { status: PlantationStatus.VERIFIED } }),
        prisma.plantation.count({ where: { status: PlantationStatus.PENDING } }),
        prisma.user.count({ where: { role: Role.FARMER } }),
        prisma.user.count({ where: { role: Role.BUSINESS } }),
        prisma.plantation.aggregate({
          where: { status: PlantationStatus.VERIFIED },
          _sum: { creditsIssued: true },
        }),
        prisma.plantation.aggregate({
          _sum: { areaHectares: true },
        }),
      ]);

    const statsResult = {
      totalPlantations,
      verifiedPlantations,
      pendingPlantations,
      farmersCount,
      businessCount,
      totalCreditsIssued: totalCreditsAggregate._sum.creditsIssued || 0,
      totalHectares: totalHectaresAggregate._sum.areaHectares || 0,
      totalCO2OffsetTons: Math.round((totalCreditsAggregate._sum.creditsIssued || 0) * 1.12),
    };

    // Cache results for 30 seconds
    await setCache(STATS_CACHE_KEY, JSON.stringify(statsResult), 30);

    return NextResponse.json(statsResult);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to calculate platform statistics.' }, { status: 500 });
  }
}
