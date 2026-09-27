import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { getUserFromRequest } from '@/lib/session';
import { evaluatePlantationScamRisk, getPurchaseRiskGate } from '@/lib/antiScam';

/**
 * GET /api/plantations/risk?ids=id1,id2
 * Returns geo/anti-scam risk for marketplace warnings (business buyers).
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);

    if (ids.length === 0) {
      return NextResponse.json({ risks: {} });
    }

    const plantations = await prisma.plantation.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        areaHectares: true,
        measuredAreaHectares: true,
        treeCount: true,
        title: true,
        locationName: true,
      },
    });

    const risks: Record<
      string,
      {
        scamRiskScore: number;
        gate: 'allow' | 'warn' | 'block';
        isSuspicious: boolean;
        actualAddress?: string;
        flags: string[];
        recommendation: string;
      }
    > = {};

    await Promise.all(
      plantations.map(async (p) => {
        const audit = await evaluatePlantationScamRisk({
          latitude: p.latitude,
          longitude: p.longitude,
          areaHectares: p.measuredAreaHectares ?? p.areaHectares,
          treeCount: p.treeCount,
          title: p.title,
          locationName: p.locationName,
        });
        risks[p.id] = {
          scamRiskScore: audit.scamRiskScore,
          gate: getPurchaseRiskGate(audit.scamRiskScore),
          isSuspicious: audit.isSuspicious,
          actualAddress: audit.actualAddress,
          flags: audit.flags,
          recommendation: audit.recommendation,
        };
      })
    );

    return NextResponse.json({ risks });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to evaluate risk.' }, { status: 500 });
  }
}
