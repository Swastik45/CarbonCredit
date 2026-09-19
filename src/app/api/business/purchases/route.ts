import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { getUserFromRequest } from '@/lib/session';
import { PlantationStatus, Role } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const purchases = await prisma.carbonPurchase.findMany({
      where: { businessId: user.id },
      include: {
        plantation: {
          select: {
            id: true,
            title: true,
            locationName: true,
            treeSpecies: true,
            farmer: { select: { name: true, companyName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ purchases });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch purchase history.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (user.role !== Role.BUSINESS && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Only registered Business buyers can purchase verified carbon credits.' }, { status: 403 });
    }

    const body = await request.json();
    const { plantationId, creditsCount, pricePerCredit } = body;

    if (!plantationId || !creditsCount || parseFloat(creditsCount) <= 0) {
      return NextResponse.json({ error: 'Plantation ID and valid credit amount are required.' }, { status: 400 });
    }

    const plantation = await prisma.plantation.findUnique({
      where: { id: plantationId },
      include: { farmer: true },
    });

    if (!plantation || plantation.status !== PlantationStatus.VERIFIED) {
      return NextResponse.json({ error: 'Selected plantation is not verified or available for trading.' }, { status: 400 });
    }

    const amountToBuy = parseFloat(creditsCount);
    if (amountToBuy > plantation.creditsIssued) {
      return NextResponse.json({ error: `Only ${plantation.creditsIssued} credits are remaining for this plot.` }, { status: 400 });
    }

    const unitPrice = pricePerCredit ? parseFloat(pricePerCredit) : 18.5;
    const totalPrice = amountToBuy * unitPrice;
    const receiptNumber = `CC-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [purchase, updatedPlantation, updatedBusiness] = await prisma.$transaction([
      prisma.carbonPurchase.create({
        data: {
          businessId: user.id,
          plantationId: plantationId,
          creditsCount: amountToBuy,
          pricePerCredit: unitPrice,
          totalPrice: totalPrice,
          receiptNumber: receiptNumber,
        },
      }),
      prisma.plantation.update({
        where: { id: plantationId },
        data: {
          creditsIssued: { decrement: amountToBuy },
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          carbonCredits: { increment: amountToBuy },
        },
      }),
      prisma.carbonTransaction.create({
        data: {
          userId: user.id,
          plantationId: plantationId,
          amount: amountToBuy,
          totalPrice: totalPrice,
          type: 'PURCHASE',
          certificateUrl: `https://carboncredit.com/receipts/${receiptNumber}.pdf`,
        },
      }),
    ]);

    return NextResponse.json({
      message: `Successfully purchased ${amountToBuy} tCO₂e Carbon Credits! Receipt #${receiptNumber} generated.`,
      purchase,
      receiptNumber,
      newTotalCredits: updatedBusiness.carbonCredits,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Transaction failed.' }, { status: 500 });
  }
}
