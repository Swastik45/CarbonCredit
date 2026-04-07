import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request.headers, 'business');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const verifiedPlantations = db.plantations.findByStatus('verified');
  return Response.json(verifiedPlantations);
}
