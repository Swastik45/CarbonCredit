import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireAuth(request.headers, 'farmer');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const plantations = await db.plantations.findByFarmerId(auth.userId);
  
  // Add farmer username to each plantation
  const plantationsWithUsername = plantations.map(p => ({
    ...p,
    farmer_username: auth.username,
  }));
  
  return Response.json(plantationsWithUsername);
}

export async function POST(request) {
  const auth = await requireAuth(request.headers, 'farmer');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { latitude, longitude, treeType, area, ndvi } = body;

  if (!latitude || !longitude || !treeType || !area) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const plantation = await db.plantations.create({
    farmer_id: auth.userId,
    farmer_username: auth.username, // Store farmer username
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    tree_type: treeType,
    area: parseFloat(area),
    ndvi: ndvi ? parseFloat(ndvi) : Math.random() * 0.3 + 0.4,
    status: 'pending',
    credits: 0,
  });

  return Response.json({ message: 'Plantation added', plantation }, { status: 201 });
}
