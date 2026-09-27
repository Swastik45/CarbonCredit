import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { getUserFromRequest } from '@/lib/session';
import { PlantationStatus, Role } from '@prisma/client';
import { hasAdminAccess } from '@/lib/adminBypass';
import { estimateCredits } from '@/lib/geoArea';
import {
  getLatestNdviObservation,
  measureAndStoreNdvi,
  MIN_NDVI_FOR_ISSUE,
  MAX_CLOUD_FOR_ISSUE,
} from '@/lib/ndviMeasure';
import { clearPlatformCaches } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user || (user.role !== Role.ADMIN && !hasAdminAccess(user.email))) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { plantationId, action, rejectionReason, forceRemeasure } = body;

    if (!plantationId || !action || !['APPROVE', 'REJECT'].includes(action.toUpperCase())) {
      return NextResponse.json({ error: 'Plantation ID and valid action (APPROVE/REJECT) are required.' }, { status: 400 });
    }

    const plantation = await prisma.plantation.findUnique({
      where: { id: plantationId },
      include: { farmer: true },
    });

    if (!plantation) {
      return NextResponse.json({ error: 'Plantation plot not found.' }, { status: 404 });
    }

    if (action.toUpperCase() === 'REJECT') {
      const updated = await prisma.plantation.update({
        where: { id: plantationId },
        data: {
          status: PlantationStatus.REJECTED,
          rejectionReason: rejectionReason
            ? String(rejectionReason).trim()
            : 'Insufficient vegetation health, ownership proof, or coordinate invalidity.',
        },
      });

      await clearPlatformCaches();

      return NextResponse.json({
        message: 'Plantation submission rejected.',
        plantation: updated,
      });
    }

    // APPROVE — measured NDVI only (no client-supplied score, no random)
    if (!plantation.boundaryGeoJson) {
      return NextResponse.json(
        { error: 'Cannot approve: plantation has no GPS boundary polygon.' },
        { status: 422 }
      );
    }

    let latest = await getLatestNdviObservation(plantationId);

    if (forceRemeasure || !latest) {
      try {
        await measureAndStoreNdvi(plantationId);
        latest = await getLatestNdviObservation(plantationId);
      } catch (err: any) {
        return NextResponse.json(
          { error: err?.message || 'Failed to measure NDVI before approval.' },
          { status: 502 }
        );
      }
    }

    if (!latest) {
      return NextResponse.json(
        { error: 'No Sentinel-2 NDVI observation available. Use Re-measure, then approve.' },
        { status: 422 }
      );
    }

    if (latest.meanNdvi < MIN_NDVI_FOR_ISSUE) {
      return NextResponse.json(
        {
          error: `Cannot issue credits: mean NDVI ${latest.meanNdvi} is below ${MIN_NDVI_FOR_ISSUE}. Reject or re-measure when vegetation is healthier.`,
          observation: latest,
        },
        { status: 422 }
      );
    }

    if (latest.cloudCoverPct != null && latest.cloudCoverPct > MAX_CLOUD_FOR_ISSUE) {
      return NextResponse.json(
        {
          error: `Cannot issue credits: cloud/no-data ~${latest.cloudCoverPct}% exceeds ${MAX_CLOUD_FOR_ISSUE}%. Re-measure on a clearer window.`,
          observation: latest,
        },
        { status: 422 }
      );
    }

    const areaForCredits = plantation.measuredAreaHectares ?? plantation.areaHectares;
    const calculatedNdvi = latest.meanNdvi;
    const creditsIssued = estimateCredits(areaForCredits, calculatedNdvi, plantation.treeSpecies);

    const [updatedPlantation] = await prisma.$transaction([
      prisma.plantation.update({
        where: { id: plantationId },
        data: {
          status: PlantationStatus.VERIFIED,
          ndviScore: calculatedNdvi,
          creditsIssued,
          isOwnershipVerified: true,
          rejectionReason: null,
        },
      }),
      prisma.user.update({
        where: { id: plantation.farmerId },
        data: {
          carbonCredits: { increment: creditsIssued },
        },
      }),
      prisma.carbonTransaction.create({
        data: {
          userId: plantation.farmerId,
          plantationId,
          amount: creditsIssued,
          totalPrice: creditsIssued * 18.5,
          type: 'TRANSFER',
          description: `Voluntary credits from Sentinel-2 NDVI ${calculatedNdvi} (scene ${latest.sceneDate.toISOString().slice(0, 10)}) over ${areaForCredits} ha`,
          certificateUrl: `/api/certificates/${plantationId}`,
        },
      }),
    ]);

    await clearPlatformCaches();

    return NextResponse.json({
      message: 'Plantation verified. Credits issued from measured Sentinel-2 NDVI (voluntary marketplace estimate).',
      plantation: updatedPlantation,
      observation: latest,
      creditsIssued,
      formula: `credits = ${areaForCredits} ha × NDVI ${calculatedNdvi} × speciesMultiplier × 12.5`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Verification failed.' }, { status: 500 });
  }
}
