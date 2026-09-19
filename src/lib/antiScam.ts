import { reverseGeocodeCoordinates, ReverseGeocodeResult } from './geoVerification';

export type AntiScamResult = {
  scamRiskScore: number; // 0 (Legitimate) to 100 (High Risk Scam)
  isSuspicious: boolean;
  locationVerified: boolean;
  actualAddress?: string;
  flags: string[];
  recommendation: string;
};

export async function evaluatePlantationScamRisk(params: {
  latitude: number;
  longitude: number;
  areaHectares: number;
  treeCount?: number;
  title: string;
  locationName: string;
}): Promise<AntiScamResult> {
  const flags: string[] = [];
  let riskPoints = 0;

  const lat = params.latitude;
  const lng = params.longitude;

  // 1. Coordinate Validity Check
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    flags.push('CRITICAL: Invalid GPS coordinates outside Earth physical bounds.');
    riskPoints += 60;
  }

  // 2. Null Island / Default Coordinate Detection (0, 0)
  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) {
    flags.push('CRITICAL: Coordinates pointing to Null Island (0,0 ocean). Likely default/fake entry.');
    riskPoints += 80;
  }

  // 3. Real Reverse Geocoding & Geographic Match Validation
  let actualAddress = '';
  if (!isNaN(lat) && !isNaN(lng) && (Math.abs(lat) > 0.01 || Math.abs(lng) > 0.01)) {
    const geoResult: ReverseGeocodeResult = await reverseGeocodeCoordinates(lat, lng, params.locationName);
    actualAddress = geoResult.address;

    if (!geoResult.isMatch) {
      flags.push(`GEOGRAPHIC MISMATCH: ${geoResult.mismatchReason || 'Coordinates do not match claimed place.'}`);
      riskPoints += 45;
    }
  }

  // 4. Tree Density Reality Check (Hectares vs Tree Count)
  if (params.areaHectares > 0 && params.treeCount && params.treeCount > 0) {
    const density = params.treeCount / params.areaHectares;
    if (density > 3500) {
      flags.push(`SUSPICIOUS: Unrealistic tree density (${Math.round(density)} trees/ha). Max realistic is ~2,500/ha.`);
      riskPoints += 25;
    } else if (density < 50) {
      flags.push(`SUSPICIOUS: Extremely sparse tree density (${Math.round(density)} trees/ha).`);
      riskPoints += 20;
    }
  }

  // 5. Title & Location Text Anomaly Detection
  const titleLower = params.title.toLowerCase();
  const locLower = params.locationName.toLowerCase();
  const scamKeywords = ['test', 'fake', 'scam', 'dummy', 'asdf', '123', 'qwerty', 'sample', 'lorem'];
  
  if (scamKeywords.some((kw) => titleLower.includes(kw) || locLower.includes(kw))) {
    flags.push('SUSPICIOUS: Title or location contains placeholder keywords.');
    riskPoints += 45;
  }

  const finalRiskScore = Math.min(100, Math.max(0, riskPoints));
  const isSuspicious = finalRiskScore >= 35;
  const locationVerified = finalRiskScore < 25;

  let recommendation = '🟢 LOW SCAM RISK: GPS coordinates match physical real-world location & ecological bounds.';
  if (finalRiskScore >= 60) {
    recommendation = '🔴 HIGH SCAM RISK: Geographic mismatch or fake coordinates detected!';
  } else if (finalRiskScore >= 35) {
    recommendation = '🟡 MODERATE SCAM RISK: Location mismatch detected between claimed name & GPS coordinates.';
  }

  return {
    scamRiskScore: finalRiskScore,
    isSuspicious,
    locationVerified,
    actualAddress,
    flags,
    recommendation,
  };
}
