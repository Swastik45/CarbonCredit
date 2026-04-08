import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireAuth(request.headers, 'admin');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const plantations = await db.plantations.all();
  return Response.json(plantations);
}
