/**
 * Geocoding search API - Search for locations by name
 * Uses OpenStreetMap's Nominatim API for free geocoding
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = searchParams.get('limit') || '5';

  if (!query || query.length < 2) {
    return Response.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    // Use OpenStreetMap Nominatim for geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'CarbonCredit-App/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }

    const results = await response.json();
    
    // Transform results to our format
    const locations = results.map(result => ({
      id: result.osm_id,
      name: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type,
      class: result.class,
      boundingbox: result.boundingbox,
    }));

    return Response.json({ locations });
  } catch (error) {
    console.error('Geocoding error:', error);
    return Response.json({ error: 'Failed to search locations' }, { status: 500 });
  }
}
