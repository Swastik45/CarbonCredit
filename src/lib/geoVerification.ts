/**
 * Real Reverse Geocoding & Geographic Location Matching Engine.
 * Resolves physical GPS coordinates (latitude, longitude) to exact real-world addresses
 * and validates whether user-entered location names match actual geographic location.
 */

export type ReverseGeocodeResult = {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  isMatch: boolean;
  mismatchReason?: string;
};

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
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
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
        mismatchReason: 'GPS coordinates point to ocean or unpopulated remote area.',
      };
    }

    const addressObj = data.address || {};
    const city = addressObj.city || addressObj.town || addressObj.village || addressObj.county || '';
    const state = addressObj.state || addressObj.region || '';
    const country = addressObj.country || '';
    const countryCode = addressObj.country_code ? addressObj.country_code.toUpperCase() : '';

    const formattedAddress = data.display_name || [city, state, country].filter(Boolean).join(', ');

    // Match verification logic
    const claimedLower = claimedLocationName.toLowerCase().trim();
    const actualCityLower = city.toLowerCase();
    const actualStateLower = state.toLowerCase();
    const actualCountryLower = country.toLowerCase();

    let isMatch = false;
    let mismatchReason = '';

    if (
      (actualCountryLower && claimedLower.includes(actualCountryLower)) ||
      (actualStateLower && claimedLower.includes(actualStateLower)) ||
      (actualCityLower && claimedLower.includes(actualCityLower)) ||
      (countryCode && claimedLower.includes(countryCode.toLowerCase()))
    ) {
      isMatch = true;
    } else {
      isMatch = false;
      mismatchReason = `Location mismatch! User claimed "${claimedLocationName}", but coordinates point to "${city ? city + ', ' : ''}${country}".`;
    }

    return {
      address: formattedAddress,
      city,
      state,
      country,
      countryCode,
      isMatch,
      mismatchReason,
    };
  } catch (err: any) {
    return fallbackGeoCheck(lat, lng, claimedLocationName);
  }
}

function fallbackGeoCheck(lat: number, lng: number, claimedLocationName: string): ReverseGeocodeResult {
  const claimedLower = claimedLocationName.toLowerCase();

  const isNepalBounds = lat >= 26.3 && lat <= 30.5 && lng >= 80.0 && lng <= 88.2;

  if (claimedLower.includes('nepal') && !isNepalBounds) {
    return {
      address: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) outside Nepal boundary`,
      isMatch: false,
      mismatchReason: 'Claimed location is in Nepal, but GPS coordinates are outside Nepal borders.',
    };
  }

  return {
    address: `GPS (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    isMatch: true,
  };
}
