import { db, getSupabaseServer } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import path from 'path';

export async function POST(request) {
  const auth = await requireAuth(request.headers, 'farmer');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const supabaseServer = getSupabaseServer();
    const formData = await request.formData();
    const file = formData.get('file');
    const plantationIdRaw = formData.get('plantationId');
    const documentTypeRaw = formData.get('type');


    if (!file || !plantationIdRaw || !documentTypeRaw) {
      return Response.json(
        {
          error: 'Missing required fields',
          received: {
            hasFile: !!file,
            plantationIdPresent: !!plantationIdRaw,
            typePresent: !!documentTypeRaw,
          },
        },
        { status: 400 }
      );
    }

    const plantationId = Number(plantationIdRaw);
    if (!Number.isFinite(plantationId)) {
      return Response.json({ error: 'Invalid plantation id' }, { status: 400 });
    }

    // Normalize document type to avoid casing/format mismatches
    const normalizedType = String(documentTypeRaw).trim().toLowerCase().replace(/\s+/g, '_');


    if (typeof file.arrayBuffer !== 'function') {
      return Response.json({ error: 'Invalid file payload' }, { status: 400 });
    }

    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return Response.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const plantation = await db.plantations.findById(plantationId);
    if (!plantation || plantation.farmer_id !== auth.userId) {
      return Response.json({ error: 'Plantation not found or access denied' }, { status: 403 });
    }

    const allowedTypes = new Set(['land_document']);
    if (!allowedTypes.has(normalizedType)) {
      return Response.json(
        {
          error: 'Invalid document type',
          receivedType: documentTypeRaw,
          normalizedType,
        },
        { status: 400 }
      );
    }

    const allowedMimeTypesByType = {
      land_document: new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp',
      ]),
    };

    const mimeType = file.type || 'application/octet-stream';
    const allowedMimeTypes = allowedMimeTypesByType[normalizedType];
    if (!allowedMimeTypes?.has(mimeType)) {
      return Response.json(
        { error: `Invalid file type for ${normalizedType}. Received: ${mimeType}` },
        { status: 400 }
      );
    }

    const extension = path.extname(file.name) || '';
    const safeName = path.basename(file.name, extension).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || 'upload';
    const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${plantationId}/${normalizedType}/${uniquePart}-${safeName}${extension}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'plantation-documents';

    const { data: existingBucket, error: bucketError } = await supabaseServer.storage.getBucket(bucket);
    if (bucketError && !String(bucketError.message || '').toLowerCase().includes('not found')) {
      return Response.json({ error: `Storage bucket check failed: ${bucketError.message}` }, { status: 500 });
    }

    if (!existingBucket) {
      const { error: createBucketError } = await supabaseServer.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: `${Math.floor(maxFileSize / (1024 * 1024))}MB`,
        allowedMimeTypes: Array.from(allowedMimeTypesByType.land_document),
      });

      if (
        createBucketError &&
        !String(createBucketError.message || '').toLowerCase().includes('already exists')
      ) {
        return Response.json(
          { error: `Storage bucket creation failed: ${createBucketError.message}` },
          { status: 500 }
        );
      }
    }

    const { error: uploadError } = await supabaseServer.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return Response.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseServer.storage.from(bucket).getPublicUrl(storagePath);
    const storedFileUrl = publicUrlData?.publicUrl || storagePath;

    const updatedPlantation = await db.plantations.update(plantationId, {
      land_document: storedFileUrl,
      land_document_name: file.name,
    });

    return Response.json({
      message: 'Document uploaded successfully',
      plantation: updatedPlantation,
    }, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}