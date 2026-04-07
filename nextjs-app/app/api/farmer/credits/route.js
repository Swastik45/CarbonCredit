import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request.headers, 'farmer');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const user = db.users.findById(auth.userId);
  return Response.json({ totalCredits: user?.totalCredits || 0 });
}
