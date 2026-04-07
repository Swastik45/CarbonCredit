import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request.headers, 'admin');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  return Response.json(db.plantations.all());
}
