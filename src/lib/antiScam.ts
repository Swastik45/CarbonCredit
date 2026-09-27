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

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    flags.push('GPS numbers are invalid — not a real place on Earth.');
    riskPoints += 60;
  }

  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) {
    flags.push('GPS is at 0,0 in the ocean. That usually means a fake or empty entry.');
    riskPoints += 80;
  }

  let actualAddress = '';
  if (!isNaN(lat) && !isNaN(lng) && (Math.abs(lat) > 0.01 || Math.abs(lng) > 0.01)) {
    const geoResult: ReverseGeocodeResult = await reverseGeocodeCoordinates(lat, lng, params.locationName);
    actualAddress = geoResult.address;

    if (!geoResult.isMatch) {
      flags.push(
        geoResult.mismatchReason ||
          `Typed place “${params.locationName}” does not match where the GPS pin sits.`
      );
      riskPoints += geoResult.matchLevel === 'unknown' ? 30 : 55;
    } else if (geoResult.matchLevel === 'province') {
      flags.push('Only the province matches — city or district name does not line up with the pin.');
      riskPoints += 15;
    }
  }

  if (params.areaHectares > 0 && params.treeCount && params.treeCount > 0) {
    const density = params.treeCount / params.areaHectares;
    if (density > 3500) {
      flags.push(`Too many trees for this size (~${Math.round(density)}/ha). Over ~2,500/ha is unusual.`);
      riskPoints += 25;
    } else if (density < 50) {
      flags.push(`Very few trees for this size (~${Math.round(density)}/ha).`);
      riskPoints += 20;
    }
  }

  const titleLower = params.title.toLowerCase();
  const locLower = params.locationName.toLowerCase();
  const scamKeywords = ['test', 'fake', 'scam', 'dummy', 'asdf', '123', 'qwerty', 'sample', 'lorem'];

  if (scamKeywords.some((kw) => titleLower.includes(kw) || locLower.includes(kw))) {
    flags.push('Title or place name looks like placeholder text (test/fake/dummy…).');
    riskPoints += 45;
  }

  const finalRiskScore = Math.min(100, Math.max(0, riskPoints));
  const isSuspicious = finalRiskScore >= 35;
  const locationVerified = finalRiskScore < 25;

  let recommendation = 'Pin looks consistent with the place name.';
  if (finalRiskScore >= 60) {
    recommendation = 'Do not buy — GPS and place name do not line up, or the pin looks fake.';
  } else if (finalRiskScore >= 35) {
    recommendation = 'Double-check before buying — claimed place and GPS pin disagree.';
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

/** Business marketplace gates */
export const RISK_WARN_AT = 35;
export const RISK_BLOCK_AT = 60;

export type PurchaseRiskGate = 'allow' | 'warn' | 'block';

export function getPurchaseRiskGate(scamRiskScore: number): PurchaseRiskGate {
  if (scamRiskScore >= RISK_BLOCK_AT) return 'block';
  if (scamRiskScore >= RISK_WARN_AT) return 'warn';
  return 'allow';
}
