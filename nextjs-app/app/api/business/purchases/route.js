import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request.headers, 'business');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const purchases = db.purchases.findByBusinessId(auth.userId);
  return Response.json(purchases);
}

export async function POST(request) {
  const auth = requireAuth(request.headers, 'business');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { plantationId, credits } = body;

  if (!plantationId || !credits) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const purchase = db.purchases.create({
    businessId: auth.userId,
    plantationId,
    credits: parseFloat(credits),
    price: parseFloat(credits) * 6.5,
  });

  return Response.json({ message: 'Purchase successful', purchase }, { status: 201 });
}
