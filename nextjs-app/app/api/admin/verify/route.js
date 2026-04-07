import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  const auth = requireAuth(request.headers, 'admin');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { plantationId, status } = await request.json();

  if (!['verified', 'rejected'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  const plantation = db.plantations.findById(parseInt(plantationId));
  if (!plantation) {
    return Response.json({ error: 'Plantation not found' }, { status: 404 });
  }

  const credits = status === 'verified' ? plantation.area * plantation.ndvi * 5 : 0;
  db.plantations.update(plantation.id, { status, credits });

  if (status === 'verified') {
    const farmer = db.users.findById(plantation.farmerId);
    if (farmer) {
      const totalCredits = db.plantations
        .findByFarmerId(farmer.id)
        .filter(p => p.status === 'verified')
        .reduce((sum, p) => sum + p.credits, 0);
      db.users.all().forEach(u => {
        if (u.id === farmer.id) u.totalCredits = totalCredits;
      });
    }
  }

  return Response.json({ message: `Plantation ${status}` });
}
