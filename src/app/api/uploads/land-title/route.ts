import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/session';
import { getSupabaseAdmin, LAND_TITLES_BUCKET } from '@/lib/supabaseAdmin';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Sign in to upload documents.' }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Choose a PDF or image of your Lalpurja / land title.' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be between 1 byte and 8 MB.' }, { status: 400 });
    }

    const mime = (file.type || '').toLowerCase();
    if (mime && !ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: 'Only PDF, JPG, PNG, or WEBP land-title documents are allowed.' },
        { status: 400 }
      );
    }

    const extFromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
    const ext =
      extFromName && ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extFromName)
        ? extFromName === 'jpeg'
          ? 'jpg'
          : extFromName
        : mime === 'application/pdf'
          ? 'pdf'
          : 'jpg';

    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseAdmin();

    // Ensure bucket exists (idempotent-ish; ignore already-exists errors)
    const { error: bucketError } = await supabase.storage.createBucket(LAND_TITLES_BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: Array.from(ALLOWED),
    });
    if (bucketError && !/already exists|duplicate/i.test(bucketError.message)) {
      // Bucket may already exist or creation may be restricted — continue to upload
      console.warn('createBucket:', bucketError.message);
    }

    const { error: uploadError } = await supabase.storage.from(LAND_TITLES_BUCKET).upload(path, buffer, {
      contentType: mime || `application/${ext}`,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json(
        {
          error: `Upload failed: ${uploadError.message}. Create a public Storage bucket named "${LAND_TITLES_BUCKET}" in Supabase (or set SUPABASE_SERVICE_ROLE_KEY).`,
        },
        { status: 502 }
      );
    }

    const { data: pub } = supabase.storage.from(LAND_TITLES_BUCKET).getPublicUrl(path);

    return NextResponse.json({
      message: 'Land title document uploaded.',
      documentUrl: pub.publicUrl,
      path,
      fileName: file.name,
      size: file.size,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Document upload failed.' }, { status: 500 });
  }
}
