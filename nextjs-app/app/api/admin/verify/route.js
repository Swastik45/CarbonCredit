import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  const auth = await requireAuth(request.headers, 'admin');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { plantationId, status } = await request.json();

  if (!['verified', 'rejected'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  const plantation = await db.plantations.findById(parseInt(plantationId, 10));
  if (!plantation) {
    return Response.json({ error: 'Plantation not found' }, { status: 404 });
  }

  const credits = status === 'verified' ? plantation.area * plantation.ndvi * 5 : 0;
  await db.plantations.update(plantation.id, { status, credits });

  return Response.json({ message: `Plantation ${status}` });
}
