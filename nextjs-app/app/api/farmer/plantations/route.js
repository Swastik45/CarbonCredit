import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = await requireAuth(request.headers, 'farmer');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const plantations = await db.plantations.findByFarmerId(auth.userId);

  const plantationsWithUsername = plantations.map((p) => ({
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

    // ── Presence check ──────────────────────────────────────────────
    if (
      latitude === undefined ||
      longitude === undefined ||
      area === undefined ||
      ndvi === undefined ||          // FIX 1: ndvi was never checked for presence here,
      !String(treeType || '').trim() //         so a missing ndvi fell through to the
    ) {                              //         numeric checks and returned a confusing error
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── Coerce to numbers ────────────────────────────────────────────
    const latitudeNum  = Number(latitude);
    const longitudeNum = Number(longitude);
    const areaNum      = Number(area);
    // FIX 2: empty-string ndvi now treated as missing (caught above),
    //         so we can always coerce here without the null branch
    const ndviNum      = Number(ndvi);

    // ── Numeric validity ─────────────────────────────────────────────
    if (
      !Number.isFinite(latitudeNum) ||
      !Number.isFinite(longitudeNum) ||
      !Number.isFinite(areaNum) ||
      !Number.isFinite(ndviNum)   // FIX 3: ndvi finitude was checked separately and
    ) {                           //         only after the null-branch; unify it here
      return Response.json(
        { error: 'Latitude, longitude, area, and NDVI must be valid numbers' },
        { status: 400 }
      );
    }

    // ── Range checks ─────────────────────────────────────────────────
    if (latitudeNum < -90 || latitudeNum > 90) {
      return Response.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 });
    }
    if (longitudeNum < -180 || longitudeNum > 180) {
      return Response.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 });
    }
    if (areaNum <= 0) {
      return Response.json({ error: 'Area must be greater than 0' }, { status: 400 });
    }
    if (ndviNum < 0 || ndviNum > 1) {
      return Response.json({ error: 'NDVI must be between 0 and 1' }, { status: 400 });
    }

    // ── Persist ──────────────────────────────────────────────────────
    const plantation = await db.plantations.create({
      farmer_id:        auth.userId,
      farmer_username:  auth.username,
      latitude:         latitudeNum,
      longitude:        longitudeNum,
      tree_type:        String(treeType).trim(),
      area:             areaNum,
      ndvi:             ndviNum,
      status:           'pending',
      credits:          0,
    });

    return Response.json({ message: 'Plantation added', plantation }, { status: 201 });
  } catch (error) {
    console.error('Create plantation error:', error);
    const message =
      (typeof error?.message === 'string' && error.message) ||
      (typeof error?.error_description === 'string' && error.error_description) ||
      'Failed to create plantation';

    // Surface supabase/postgrest details so schema issues are actionable.
    const details = {
      message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    };

    return Response.json(
      {
        error: message,
        ...(process.env.NODE_ENV !== 'production' ? { debug: details } : null),
      },
      { status: 500 }
    );
  }
}