import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { getUserFromRequest } from '@/lib/session';
import { PlantationStatus, Role } from '@prisma/client';
import { clearPlatformCaches } from '@/lib/redis';
import { evaluatePlantationScamRisk } from '@/lib/antiScam';
import { validateBoundary, isInsideNepal } from '@/lib/geoArea';
import { measureAndStoreNdvi } from '@/lib/ndviMeasure';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const farmerIdParam = searchParams.get('farmerId');

    const whereClause: any = {};

    if (statusParam && ['PENDING', 'VERIFIED', 'REJECTED'].includes(statusParam.toUpperCase())) {
      whereClause.status = statusParam.toUpperCase() as PlantationStatus;
    }

    if (farmerIdParam) {
      whereClause.farmerId = farmerIdParam;
    }

    const plantations = await prisma.plantation.findMany({
      where: whereClause,
      include: {
        farmer: {
          select: { id: true, name: true, email: true, companyName: true, kycVerified: true, citizenshipId: true },
        },
        ndviObservations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            meanNdvi: true,
            cloudCoverPct: true,
            sceneDate: true,
            satellite: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ plantations });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch plantations.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in or register an account first.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      locationName,
      latitude,
      longitude,
      areaHectares,
      treeSpecies,
      treeCount,
      landParcelId,
      documentUrl,
      boundaryGeoJson,
    } = body;

    if (!title || !locationName || latitude === undefined || longitude === undefined || !areaHectares || !treeSpecies) {
      return NextResponse.json({ error: 'Missing required plantation details (title, location, coordinates, area, species).' }, { status: 400 });
    }

    if (!landParcelId || String(landParcelId).trim().length < 4) {
      return NextResponse.json(
        { error: 'Proof of Ownership Required: Please provide an official Land Parcel ID / Lalpurja Registration Number.' },
        { status: 422 }
      );
    }

    if (!boundaryGeoJson) {
      return NextResponse.json(
        { error: 'Plot boundary required: draw the plantation polygon on the map before submitting.' },
        { status: 422 }
      );
    }

    const cleanLandParcelId = String(landParcelId).trim();
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const claimedArea = parseFloat(areaHectares);

    if (!isInsideNepal(latNum, lngNum)) {
      return NextResponse.json(
        { error: 'GPS point must be inside Nepal. This platform is Nepal-first.' },
        { status: 422 }
      );
    }

    const boundary = validateBoundary(boundaryGeoJson, claimedArea);
    if (!boundary.ok || !boundary.polygon || boundary.measuredAreaHectares == null) {
      return NextResponse.json({ error: boundary.error || 'Invalid plot boundary.' }, { status: 422 });
    }

    const existingClaim = await prisma.plantation.findFirst({
      where: { landParcelId: cleanLandParcelId },
      include: { farmer: { select: { name: true, email: true } } },
    });

    if (existingClaim) {
      return NextResponse.json(
        {
          error: `FRAUD AUDIT ALERT: Land Parcel ID "${cleanLandParcelId}" has already been claimed by farmer ${existingClaim.farmer.name} (${existingClaim.farmer.email}). Double counting or duplicate land claims are strictly prohibited.`,
        },
        { status: 409 }
      );
    }

    const measuredArea = boundary.measuredAreaHectares;
    const parsedTreeCount = treeCount ? parseInt(treeCount, 10) : Math.round(measuredArea * 400);

    const scamAudit = await evaluatePlantationScamRisk({
      latitude: latNum,
      longitude: lngNum,
      areaHectares: measuredArea,
      treeCount: parsedTreeCount,
      title: String(title).trim(),
      locationName: String(locationName).trim(),
    });

    if (scamAudit.scamRiskScore >= 70) {
      return NextResponse.json(
        {
          error: `Plot registration rejected by Anti-Scam Engine (${scamAudit.scamRiskScore}% Fraud Risk). Reasons: ${scamAudit.flags.join(' ')}`,
          scamAudit,
        },
        { status: 422 }
      );
    }

    if (user.role !== Role.FARMER && user.role !== Role.ADMIN) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.FARMER },
      });
    }

    const plantation = await prisma.plantation.create({
      data: {
        farmerId: user.id,
        title: String(title).trim(),
        description: description
          ? String(description).trim()
          : 'Reforestation plot registered for Sentinel-2 NDVI verification (Nepal voluntary marketplace).',
        locationName: String(locationName).trim(),
        latitude: latNum,
        longitude: lngNum,
        areaHectares: claimedArea,
        measuredAreaHectares: measuredArea,
        treeSpecies: String(treeSpecies).trim(),
        treeCount: parsedTreeCount,
        landParcelId: cleanLandParcelId,
        status: PlantationStatus.PENDING,
        documentUrl: documentUrl || null,
        boundaryGeoJson: JSON.stringify(boundary.polygon),
        isOwnershipVerified: false,
      },
    });

    let ndviResult = null;
    let ndviError: string | null = null;
    try {
      ndviResult = await measureAndStoreNdvi(plantation.id);
    } catch (err: any) {
      ndviError = err?.message || 'Initial NDVI measurement failed; admin can re-measure.';
    }

    await clearPlatformCaches();

    const refreshed = await prisma.plantation.findUnique({
      where: { id: plantation.id },
      include: {
        ndviObservations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return NextResponse.json({
      message: `Plantation plot registered. Boundary ${measuredArea} ha measured. Lalpurja #${cleanLandParcelId} pending admin review.`,
      plantation: refreshed,
      scamAudit,
      ndvi: ndviResult,
      ndviError,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to register plantation plot.' }, { status: 500 });
  }
}
