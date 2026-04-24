import { db } from '@/lib/db';

/**
 * Find plantations near a given location
 * Query parameters:
 * - lat: latitude
 * - lon: longitude
 * - radius: search radius in km (default: 50)
 */

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lon = parseFloat(searchParams.get('lon'));
  const radius = parseFloat(searchParams.get('radius')) || 50;

  if (isNaN(lat) || isNaN(lon)) {
    return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    const allPlantations = await db.plantations.all();
    
    // Filter plantations by distance
    const nearby = allPlantations
      .map(p => ({
        ...p,
        distance: calculateDistance(lat, lon, p.latitude, p.longitude),
      }))
      .filter(p => p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return Response.json({
      center: { latitude: lat, longitude: lon },
      radius,
      count: nearby.length,
      plantations: nearby,
    });
  } catch (error) {
    console.error('Nearby search error:', error);
    return Response.json({ error: 'Failed to search nearby plantations' }, { status: 500 });
  }
}
