import { db } from '@/lib/db';

export async function GET() {
  const verifiedPlantations = await db.plantations.findByStatus('verified');
  return Response.json(verifiedPlantations);
}
