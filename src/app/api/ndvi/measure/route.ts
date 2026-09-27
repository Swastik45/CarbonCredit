import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { getUserFromRequest } from '@/lib/session';
import { Role } from '@prisma/client';
import { hasAdminAccess } from '@/lib/adminBypass';
import { measureAndStoreNdvi, getLatestNdviObservation } from '@/lib/ndviMeasure';
import { isSentinelHubConfigured } from '@/lib/sentinelHub';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plantationId = searchParams.get('plantationId');
    if (!plantationId) {
      return NextResponse.json({ error: 'plantationId is required.' }, { status: 400 });
    }

    const plantation = await prisma.plantation.findUnique({
      where: { id: plantationId },
      select: { id: true, farmerId: true, ndviScore: true, measuredAreaHectares: true, boundaryGeoJson: true },
    });

    if (!plantation) {
      return NextResponse.json({ error: 'Plantation not found.' }, { status: 404 });
    }

    const isAdmin = user.role === Role.ADMIN || hasAdminAccess(user.email);
    if (!isAdmin && plantation.farmerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const observations = await prisma.ndviObservation.findMany({
      where: { plantationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        meanNdvi: true,
        stDevNdvi: true,
        cloudCoverPct: true,
        sceneDate: true,
        intervalFrom: true,
        intervalTo: true,
        satellite: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      plantationId,
      ndviScore: plantation.ndviScore,
      measuredAreaHectares: plantation.measuredAreaHectares,
      hasBoundary: Boolean(plantation.boundaryGeoJson),
      sentinelHubConfigured: isSentinelHubConfigured(),
      provider: 'microsoft-planetary-computer',
      observations,
      latest: observations[0] || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load NDVI observations.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Planetary Computer is free and always available (no API keys).

    const body = await request.json();
    const plantationId = body?.plantationId;
    if (!plantationId || typeof plantationId !== 'string') {
      return NextResponse.json({ error: 'plantationId is required.' }, { status: 400 });
    }

    const plantation = await prisma.plantation.findUnique({
      where: { id: plantationId },
      select: { id: true, farmerId: true },
    });

    if (!plantation) {
      return NextResponse.json({ error: 'Plantation not found.' }, { status: 404 });
    }

    const isAdmin = user.role === Role.ADMIN || hasAdminAccess(user.email);
    if (!isAdmin && plantation.farmerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden. Only the plot owner or an admin can request NDVI measurement.' }, { status: 403 });
    }

    const result = await measureAndStoreNdvi(plantationId);
    const latest = await getLatestNdviObservation(plantationId);

    return NextResponse.json({
      message: 'Sentinel-2 NDVI measured via Microsoft Planetary Computer and stored.',
      provider: 'microsoft-planetary-computer',
      ...result,
      latest,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'NDVI measurement failed.' }, { status: 500 });
  }
}
