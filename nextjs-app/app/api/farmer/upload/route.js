import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * Upload farm document/image - stores as base64 in database
 * For production, integrate with cloud storage (S3, GCS, etc.)
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

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;

    // Get plantation to verify ownership
    const plantation = await db.plantations.findById(plantationId);
    if (!plantation || plantation.farmer_id !== auth.userId) {
      return Response.json({ error: 'Plantation not found or access denied' }, { status: 403 });
    }

    // Update plantation with document/image
    const updateData = {};
    if (documentType === 'land_document') {
      updateData.land_document = `data:${mimeType};base64,${base64}`;
      updateData.land_document_name = file.name;
    } else if (documentType === 'farm_image') {
      updateData.farm_image = `data:${mimeType};base64,${base64}`;
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
