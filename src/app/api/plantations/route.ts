import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { getUserFromRequest } from '@/lib/session';
import { PlantationStatus, Role } from '@prisma/client';
import { clearPlatformCaches } from '@/lib/redis';
import { evaluatePlantationScamRisk } from '@/lib/antiScam';

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
    } = body;

    if (!title || !locationName || latitude === undefined || longitude === undefined || !areaHectares || !treeSpecies) {
      return NextResponse.json({ error: 'Missing required plantation details (title, location, coordinates, area, species).' }, { status: 400 });
    }

    // 🛡️ Require Official Land Title Parcel ID to prevent fraudulent claims of public/other people's land
    if (!landParcelId || String(landParcelId).trim().length < 4) {
      return NextResponse.json(
        { error: 'Proof of Ownership Required: Please provide an official Land Parcel ID / Lalpurja Registration Number.' },
        { status: 422 }
      );
    }

    const cleanLandParcelId = String(landParcelId).trim();

    // 🛡️ Double Counting & Duplicate Land Claim Protection
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

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const areaNum = parseFloat(areaHectares);
    const parsedTreeCount = treeCount ? parseInt(treeCount, 10) : Math.round(areaNum * 400);

    // 🛡️ Anti-Scam & Reverse Geocoding Fraud Risk Check
    const scamAudit = await evaluatePlantationScamRisk({
      latitude: latNum,
      longitude: lngNum,
      areaHectares: areaNum,
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
        description: description ? String(description).trim() : 'Reforestation plot registered for carbon sequestration verification.',
        locationName: String(locationName).trim(),
        latitude: latNum,
        longitude: lngNum,
        areaHectares: areaNum,
        treeSpecies: String(treeSpecies).trim(),
        treeCount: parsedTreeCount,
        landParcelId: cleanLandParcelId,
        status: PlantationStatus.PENDING,
        documentUrl: documentUrl || null,
        isOwnershipVerified: false,
      },
    });

    // Invalidate cached statistics & dashboard values
    await clearPlatformCaches();

    return NextResponse.json({
      message: `Plantation plot registered successfully! Land Parcel Title #${cleanLandParcelId} submitted for Admin land ownership verification.`,
      plantation,
      scamAudit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to register plantation plot.' }, { status: 500 });
  }
}
