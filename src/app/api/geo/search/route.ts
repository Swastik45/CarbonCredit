import { NextResponse } from 'next/server';

/**
 * Forward-geocode a place name (e.g. "Lalitpur, Nepal") via Nominatim.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) {
      return NextResponse.json({ error: 'Search query is required.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
      {
        headers: { 'User-Agent': 'CarbonCreditMRV/1.0 (place-search)' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: `Geocoder HTTP ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const results = (Array.isArray(data) ? data : []).map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.display_name as string,
      type: item.type as string,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Place search failed.' }, { status: 500 });
  }
}
