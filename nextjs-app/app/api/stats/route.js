import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const all = await db.plantations.all();
  const verified = all.filter(p => p.status === 'verified');
  const totalCredits = verified.reduce((sum, p) => sum + (p.credits || 0), 0);
  const farmers = new Set(verified.map(p => p.farmer_id)).size;

  return Response.json({
    activePlantations: verified.length,
    totalCreditsTraded: Math.round(totalCredits),
    verifiedFarmers: farmers,
  });
}
