import { NextResponse } from 'next/server';

/**
 * Reverse-geocode lat/lng via Nominatim (server-side to avoid browser CORS).
 * Used to show "you are near X" for live GPS — not the same as a saved plot audit.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Valid lat and lng are required.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      {
        headers: {
          'User-Agent': 'CarbonCreditMRV/1.0 (plot-gps-label)',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: `Geocoder HTTP ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const a = data.address || {};
    const place =
      a.village ||
      a.suburb ||
      a.neighbourhood ||
      a.town ||
      a.city ||
      a.municipality ||
      a.county ||
      '';
    const district = a.county || a.state_district || a.district || '';
    const state = a.state || a.region || '';
    const country = a.country || '';

    const shortLabel = [place, district, state].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 3).join(', ');

    return NextResponse.json({
      lat,
      lng,
      displayName: data.display_name || shortLabel,
      shortLabel: shortLabel || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      place,
      district,
      state,
      country,
      /** Rough region hint for Nepal valley vs Terai west */
      regionHint:
        lng >= 85.0 && lng <= 85.6 && lat >= 27.5 && lat <= 27.9
          ? 'Kathmandu Valley (e.g. Kathmandu / Lalitpur / Bhaktapur)'
          : lng >= 82.5 && lng <= 84.0 && lat >= 27.2 && lat <= 28.0
            ? 'Western Terai (e.g. Rupandehi / Lumbini area)'
            : country || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Reverse geocode failed.' }, { status: 500 });
  }
}
