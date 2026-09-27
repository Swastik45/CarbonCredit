/**
 * Reverse geocoding + place-level location match (city/district/province).
 * Country-only overlap (e.g. both say "Nepal") is NOT a match.
 */

export type ReverseGeocodeResult = {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  isMatch: boolean;
  mismatchReason?: string;
  matchLevel?: 'city' | 'district' | 'province' | 'none' | 'unknown';
};

const COUNTRY_STOPWORDS = new Set([
  'nepal',
  'india',
  'china',
  'bhutan',
  'bangladesh',
  'np',
  'in',
  'country',
  'province',
  'district',
  'municipality',
  'rural',
  'metropolitan',
  'city',
  'the',
  'and',
  'of',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s,-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Significant place tokens from a claimed location string (drops country stopwords). */
export function claimedPlaceTokens(claimedLocationName: string): string[] {
  const normalized = normalize(claimedLocationName);
  const raw = normalized.split(/[\s,\/|-]+/).filter(Boolean);
  const tokens: string[] = [];

  for (const t of raw) {
    if (t.length < 3) continue;
    if (COUNTRY_STOPWORDS.has(t)) continue;
    tokens.push(t);
  }

  for (const part of normalized.split(',').map((p) => p.trim()).filter(Boolean)) {
    if (part.length < 3) continue;
    const withoutCountry = part
      .split(/\s+/)
      .filter((w) => !COUNTRY_STOPWORDS.has(w))
      .join(' ')
      .trim();
    if (withoutCountry.length >= 3 && tokens.indexOf(withoutCountry) === -1) {
      tokens.push(withoutCountry);
    }
  }

  return Array.from(new Set(tokens));
}

function placeFieldsFromNominatim(addressObj: Record<string, unknown>): string[] {
  const keys = [
    'city',
    'town',
    'village',
    'municipality',
    'city_district',
    'suburb',
    'county',
    'state_district',
    'district',
    'region',
    'state',
    'hamlet',
    'locality',
  ];
  const fields: string[] = [];
  for (const k of keys) {
    const v = addressObj[k];
    if (typeof v === 'string' && v.trim()) fields.push(normalize(v));
  }
  return fields;
}

function tokenMatchesField(token: string, field: string): boolean {
  if (!token || !field) return false;
  if (field === token) return true;
  if (field.includes(token) && token.length >= 4) return true;
  if (token.includes(field) && field.length >= 4) return true;
  // word boundary-ish: "rupandehi" in "rupandehi district"
  const fieldWords = field.split(/\s+/);
  if (fieldWords.includes(token)) return true;
  return false;
}

export function evaluateLocationMatch(
  claimedLocationName: string,
  addressObj: Record<string, unknown>,
  displayName: string
): Pick<ReverseGeocodeResult, 'isMatch' | 'mismatchReason' | 'matchLevel'> {
  const claimedTokens = claimedPlaceTokens(claimedLocationName);
  const fields = placeFieldsFromNominatim(addressObj);
  const display = normalize(displayName);

  const city =
    normalize(String(addressObj.city || addressObj.town || addressObj.village || addressObj.municipality || ''));
  const district = normalize(
    String(addressObj.county || addressObj.state_district || addressObj.district || addressObj.city_district || '')
  );
  const state = normalize(String(addressObj.state || addressObj.region || ''));
  const country = normalize(String(addressObj.country || ''));

  if (claimedTokens.length === 0) {
    return {
      isMatch: false,
      matchLevel: 'none',
      mismatchReason: `Claimed location "${claimedLocationName}" has no city/district name to verify (country alone is not enough).`,
    };
  }

  // Prefer city / district matches; province is weaker but acceptable if named explicitly
  for (const token of claimedTokens) {
    if (city && tokenMatchesField(token, city)) {
      return { isMatch: true, matchLevel: 'city' };
    }
    if (district && tokenMatchesField(token, district)) {
      return { isMatch: true, matchLevel: 'district' };
    }
    for (const field of fields) {
      if (tokenMatchesField(token, field) && field !== country) {
        const level =
          field === city ? 'city' : field === district ? 'district' : field === state ? 'province' : 'district';
        return { isMatch: true, matchLevel: level };
      }
    }
    // Token appears as its own word in reverse-geocode display name (not only "Nepal")
    if (token.length >= 4 && display.includes(token) && token !== country) {
      const level = state && tokenMatchesField(token, state) ? 'province' : 'district';
      return { isMatch: true, matchLevel: level };
    }
  }

  // Explicit province-only claim (e.g. "Lumbini, Nepal") vs GPS in Lumbini
  for (const token of claimedTokens) {
    if (state && tokenMatchesField(token, state)) {
      return { isMatch: true, matchLevel: 'province' };
    }
  }

  const actualLabel = [city, district, state, country].filter(Boolean).join(', ') || displayName;
  return {
    isMatch: false,
    matchLevel: 'none',
    mismatchReason: `Location mismatch: claimed "${claimedLocationName}" but GPS resolves to "${actualLabel}". Country-only match is not accepted.`,
  };
}

/**
 * Fetch physical address from GPS coordinates using OpenStreetMap Nominatim API
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
  claimedLocationName: string
): Promise<ReverseGeocodeResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      {
        headers: {
          'User-Agent': 'CarbonCreditVerificationEngine/1.0 (carbon-credit-audit@support.org)',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return {
        address: 'Water / Offshore / Remote Coordinates',
        isMatch: false,
        matchLevel: 'none',
        mismatchReason: 'GPS coordinates point to ocean or unpopulated remote area.',
      };
    }

    const addressObj = (data.address || {}) as Record<string, unknown>;
    const city = String(addressObj.city || addressObj.town || addressObj.village || addressObj.county || '');
    const state = String(addressObj.state || addressObj.region || '');
    const country = String(addressObj.country || '');
    const countryCode = addressObj.country_code
      ? String(addressObj.country_code).toUpperCase()
      : '';

    const formattedAddress = data.display_name || [city, state, country].filter(Boolean).join(', ');
    const match = evaluateLocationMatch(claimedLocationName, addressObj, formattedAddress);

    return {
      address: formattedAddress,
      city,
      state,
      country,
      countryCode,
      isMatch: match.isMatch,
      mismatchReason: match.mismatchReason,
      matchLevel: match.matchLevel,
    };
  } catch {
    return fallbackGeoCheck(lat, lng, claimedLocationName);
  }
}

function fallbackGeoCheck(lat: number, lng: number, claimedLocationName: string): ReverseGeocodeResult {
  const claimedLower = claimedLocationName.toLowerCase();
  const isNepalBounds = lat >= 26.3 && lat <= 30.5 && lng >= 80.0 && lng <= 88.3;

  if (claimedLower.includes('nepal') && !isNepalBounds) {
    return {
      address: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) outside Nepal boundary`,
      isMatch: false,
      matchLevel: 'none',
      mismatchReason: 'Claimed location is in Nepal, but GPS coordinates are outside Nepal borders.',
    };
  }

  // Cannot verify place-level match without Nominatim — do not auto-pass
  return {
    address: `GPS (${lat.toFixed(4)}°, ${lng.toFixed(4)}°) — reverse geocode unavailable`,
    isMatch: false,
    matchLevel: 'unknown',
    mismatchReason: 'Could not verify claimed place against GPS (geocoder unavailable). Manual admin review required.',
  };
}
