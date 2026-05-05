import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireAuth(request.headers, 'farmer');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const plantations = await db.plantations.findByFarmerId(auth.userId);
    const totalCredits = plantations
      .filter((p) => p.status === 'verified')
      .reduce((sum, p) => sum + (p.credits || 0), 0);

    return Response.json({ totalCredits });
  } catch (error) {
    console.error('Fetch farmer credits error:', error);
    return Response.json({ error: 'Failed to fetch credits' }, { status: 500 });
  }
}
