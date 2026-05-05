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

  try {
    const body = await request.json();
    const { latitude, longitude, treeType, area, ndvi } = body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      area === undefined ||
      !String(treeType || '').trim()
    ) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const latitudeNum = Number(latitude);
    const longitudeNum = Number(longitude);
    const areaNum = Number(area);
    const ndviNum = ndvi === undefined || ndvi === '' ? null : Number(ndvi);

    if (!Number.isFinite(latitudeNum) || !Number.isFinite(longitudeNum) || !Number.isFinite(areaNum)) {
      return Response.json({ error: 'Latitude, longitude and area must be valid numbers' }, { status: 400 });
    }

    if (areaNum <= 0) {
      return Response.json({ error: 'Area must be greater than 0' }, { status: 400 });
    }

    if (ndviNum === null || !Number.isFinite(ndviNum)) {
      return Response.json({ error: 'NDVI is required and must be a valid number' }, { status: 400 });
    }

    if (ndviNum < 0 || ndviNum > 1) {
      return Response.json({ error: 'NDVI must be between 0 and 1' }, { status: 400 });
    }

    const plantation = await db.plantations.create({
      farmer_id: auth.userId,
      farmer_username: auth.username,
      latitude: latitudeNum,
      longitude: longitudeNum,
      tree_type: String(treeType).trim(),
      area: areaNum,
      ndvi: ndviNum,
      status: 'pending',
      credits: 0,
    });

    return Response.json({ message: 'Plantation added', plantation }, { status: 201 });
  } catch (error) {
    console.error('Create plantation error:', error);
    return Response.json({ error: 'Failed to create plantation' }, { status: 500 });
  }
}
