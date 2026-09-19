import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { getUserFromRequest } from '@/lib/session';
import { PlantationStatus, Role } from '@prisma/client';
import { hasAdminAccess } from '@/lib/adminBypass';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user || (user.role !== Role.ADMIN && !hasAdminAccess(user.email))) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { plantationId, action, ndviScore, rejectionReason } = body;

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
          rejectionReason: rejectionReason ? String(rejectionReason).trim() : 'Insufficient vegetation health or coordinate invalidity.',
        },
      });

      return NextResponse.json({
        message: 'Plantation submission rejected.',
        plantation: updated,
      });
    }

    // Calculate NDVI score & Carbon Credits
    // Formula: Area (Hectares) * NDVI Health Score * Species Multiplier * Base Factor (12.5 tCO2e / ha)
    const calculatedNdvi = ndviScore !== undefined ? parseFloat(ndviScore) : Math.min(0.95, 0.55 + Math.random() * 0.35);
    const speciesMultiplier = plantation.treeSpecies.toLowerCase().includes('bamboo') ? 1.4 : 1.15;
    const creditsIssued = Math.round(plantation.areaHectares * calculatedNdvi * speciesMultiplier * 12.5 * 100) / 100;

    // Transactionally update plantation, credit farmer account, and log transaction
    const [updatedPlantation, updatedFarmer] = await prisma.$transaction([
      prisma.plantation.update({
        where: { id: plantationId },
        data: {
          status: PlantationStatus.VERIFIED,
          ndviScore: calculatedNdvi,
          creditsIssued: creditsIssued,
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
          plantationId: plantationId,
          amount: creditsIssued,
          totalPrice: creditsIssued * 18.5,
          type: 'TRANSFER',
          certificateUrl: `https://carboncredit.com/certificates/verify-${plantationId}.pdf`,
        },
      }),
    ]);

    return NextResponse.json({
      message: `Plantation verified! NDVI Score: ${calculatedNdvi.toFixed(2)}. ${creditsIssued} tCO₂e Carbon Credits issued to Farmer.`,
      plantation: updatedPlantation,
      farmer: {
        id: updatedFarmer.id,
        name: updatedFarmer.name,
        newCreditBalance: updatedFarmer.carbonCredits,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Verification workflow failed.' }, { status: 500 });
  }
}
