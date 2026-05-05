import { db, supabaseServer } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import path from 'path';

/**
 * Upload farm document/image
 * Stores files in Supabase Storage and saves URL/path in database.
 */

export async function POST(request) {
  const auth = await requireAuth(request.headers, 'farmer');
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const plantationId = formData.get('plantationId');
    const documentType = formData.get('type'); // 'land_document', 'farm_image', etc.

    if (!file || !plantationId || !documentType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic file guard to avoid oversized payloads in API/database
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      return Response.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get plantation to verify ownership
    const plantation = await db.plantations.findById(plantationId);
    if (!plantation || plantation.farmer_id !== auth.userId) {
      return Response.json({ error: 'Plantation not found or access denied' }, { status: 403 });
    }

    const allowedTypes = new Set(['land_document', 'farm_image']);
    if (!allowedTypes.has(String(documentType))) {
      return Response.json({ error: 'Invalid document type' }, { status: 400 });
    }

    const extension = path.extname(file.name) || '';
    const safeType = String(documentType).replace(/[^a-z_]/gi, '').toLowerCase();
    const safeName = path.basename(file.name, extension).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || 'upload';
    const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${plantationId}/${safeType}/${uniquePart}-${safeName}${extension}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'plantation-documents';

    const { error: uploadError } = await supabaseServer.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return Response.json(
        {
          error: `Storage upload failed: ${uploadError.message}`,
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseServer.storage.from(bucket).getPublicUrl(storagePath);
    const storedFileUrl = publicUrlData?.publicUrl || storagePath;

    // Update plantation with persisted file URL
    const updateData = {};
    if (documentType === 'land_document') {
      updateData.land_document = storedFileUrl;
      updateData.land_document_name = file.name;
    } else if (documentType === 'farm_image') {
      updateData.farm_image = storedFileUrl;
      updateData.farm_image_name = file.name;
    }

    const updatedPlantation = await db.plantations.update(plantationId, updateData);

    return Response.json({
      message: 'Document uploaded successfully',
      plantation: updatedPlantation,
    }, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
