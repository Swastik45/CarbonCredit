import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  const auth = await requireAuth(request.headers, 'admin');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const { plantationId, status } = await request.json();

    if (!['verified', 'rejected'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    const normalizedId = Number(plantationId);
    if (!Number.isFinite(normalizedId)) {
      return Response.json({ error: 'Invalid plantation id' }, { status: 400 });
    }

    const plantation = await db.plantations.findById(normalizedId);
    if (!plantation) {
      return Response.json({ error: 'Plantation not found' }, { status: 404 });
    }

    const ndvi = Number(plantation.ndvi);
    if (!Number.isFinite(ndvi) || ndvi < 0 || ndvi > 1) {
      return Response.json({ error: 'Invalid NDVI on plantation. Update NDVI before verification.' }, { status: 400 });
    }

    const credits = status === 'verified' ? Number(plantation.area || 0) * ndvi * 5 : 0;
    await db.plantations.update(plantation.id, { status, credits });

    return Response.json({ message: `Plantation ${status}` });
  } catch (error) {
    console.error('Admin verify error:', error);
    return Response.json({ error: 'Failed to update plantation status' }, { status: 500 });
  }
}
