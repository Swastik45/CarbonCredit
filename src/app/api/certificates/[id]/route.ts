import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function certStyles(): string {
  return `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0f0d; color: #f0fdf4; padding: 40px; margin: 0; }
    .cert-box { max-width: 680px; margin: 0 auto; background: #121a16; border: 2px solid #22c55e; border-radius: 24px; padding: 40px; box-shadow: 0 0 40px rgba(34, 197, 94, 0.2); }
    .header { text-align: center; border-bottom: 1px solid #1a2620; padding-bottom: 20px; margin-bottom: 30px; }
    .title { color: #22c55e; font-size: 26px; margin: 0; font-weight: 800; }
    .subtitle { color: #86efac; font-size: 14px; margin-top: 4px; }
    .badge { display: inline-block; background: #052e16; color: #4ade80; border: 1px solid #22c55e; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; margin-top: 12px; }
    .field-group { margin: 18px 0; display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px dashed #1a2620; padding-bottom: 12px; }
    .label { color: #86efac; font-size: 13px; }
    .value { font-weight: bold; color: #ffffff; font-size: 14px; text-align: right; }
    .credits-amount { font-size: 36px; font-weight: 900; color: #4ade80; text-align: center; margin: 24px 0; font-family: monospace; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #86efac; opacity: 0.9; }
    .disclaimer { margin-top: 12px; font-size: 11px; color: #fbbf24; }
    @media print { body { background: white; color: black; } .cert-box { border-color: black; box-shadow: none; } }
  `;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    const purchase = await prisma.carbonPurchase.findFirst({
      where: { OR: [{ id }, { receiptNumber: id }] },
      include: {
        business: true,
        plantation: {
          include: {
            farmer: true,
            ndviObservations: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (purchase) {
      const obs = purchase.plantation.ndviObservations[0];
      const area = purchase.plantation.measuredAreaHectares ?? purchase.plantation.areaHectares;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Carbon Offset Receipt #${escapeHtml(purchase.receiptNumber)}</title>
          <style>${certStyles()}</style>
        </head>
        <body>
          <div class="cert-box">
            <div class="header">
              <div class="title">Carbon Offset Certificate</div>
              <div class="subtitle">Nepal voluntary marketplace · measured Sentinel-2 NDVI</div>
              <div class="badge">SETTLED</div>
            </div>

            <div class="credits-amount">${purchase.creditsCount} tCO₂e</div>

            <div class="field-group">
              <span class="label">Certificate / Receipt ID:</span>
              <span class="value">${escapeHtml(purchase.receiptNumber)}</span>
            </div>
            <div class="field-group">
              <span class="label">Buyer:</span>
              <span class="value">${escapeHtml(purchase.business.name)} (${escapeHtml(purchase.business.companyName || 'Enterprise')})</span>
            </div>
            <div class="field-group">
              <span class="label">Origin plot:</span>
              <span class="value">${escapeHtml(purchase.plantation.title)}</span>
            </div>
            <div class="field-group">
              <span class="label">Location & coordinates:</span>
              <span class="value">${escapeHtml(purchase.plantation.locationName)} (${purchase.plantation.latitude.toFixed(4)}°, ${purchase.plantation.longitude.toFixed(4)}°)</span>
            </div>
            <div class="field-group">
              <span class="label">Measured area:</span>
              <span class="value">${area} ha</span>
            </div>
            <div class="field-group">
              <span class="label">Mean NDVI (Sentinel-2):</span>
              <span class="value">${(obs?.meanNdvi ?? purchase.plantation.ndviScore).toFixed(4)}</span>
            </div>
            <div class="field-group">
              <span class="label">Scene / interval date:</span>
              <span class="value">${obs ? new Date(obs.sceneDate).toISOString().slice(0, 10) : 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="label">Cloud / no-data fraction:</span>
              <span class="value">${obs?.cloudCoverPct != null ? `${obs.cloudCoverPct}%` : 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="label">Satellite:</span>
              <span class="value">${escapeHtml(obs?.satellite || 'SENTINEL2')}</span>
            </div>
            <div class="field-group">
              <span class="label">Total price:</span>
              <span class="value">$${purchase.totalPrice.toFixed(2)} USD</span>
            </div>
            <div class="field-group">
              <span class="label">Issuance:</span>
              <span class="value">${new Date(purchase.createdAt).toUTCString()}</span>
            </div>

            <div class="footer">
              <p>NDVI from Sentinel Hub Statistical API over the registered plot polygon. Persisted in PostgreSQL.</p>
              <p class="disclaimer">Voluntary platform estimate — not a Verra, Gold Standard, or compliance credit.</p>
              <button onclick="window.print()" style="background:#22c55e; color:#0a0f0d; border:none; padding:10px 20px; font-weight:bold; border-radius:8px; cursor:pointer; margin-top:10px;">
                Print / Save PDF
              </button>
            </div>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const plantation = await prisma.plantation.findUnique({
      where: { id },
      include: {
        farmer: true,
        ndviObservations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (plantation) {
      const obs = plantation.ndviObservations[0];
      const area = plantation.measuredAreaHectares ?? plantation.areaHectares;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Plantation Verification Certificate #${escapeHtml(plantation.id.slice(-8))}</title>
          <style>${certStyles()}</style>
        </head>
        <body>
          <div class="cert-box">
            <div class="header">
              <div class="title">Plantation MRV Certificate</div>
              <div class="subtitle">Nepal · Sentinel-2 NDVI over GPS boundary</div>
              <div class="badge">${escapeHtml(plantation.status)}</div>
            </div>

            <div class="credits-amount">${plantation.creditsIssued} tCO₂e</div>

            <div class="field-group">
              <span class="label">Plot title:</span>
              <span class="value">${escapeHtml(plantation.title)}</span>
            </div>
            <div class="field-group">
              <span class="label">Farmer:</span>
              <span class="value">${escapeHtml(plantation.farmer.name)} (${escapeHtml(plantation.farmer.email)})</span>
            </div>
            <div class="field-group">
              <span class="label">Lalpurja / parcel ID:</span>
              <span class="value">${escapeHtml(plantation.landParcelId || 'N/A')}</span>
            </div>
            <div class="field-group">
              <span class="label">Location & GPS:</span>
              <span class="value">${escapeHtml(plantation.locationName)} (${plantation.latitude.toFixed(4)}°, ${plantation.longitude.toFixed(4)}°)</span>
            </div>
            <div class="field-group">
              <span class="label">Measured area / species:</span>
              <span class="value">${area} ha · ${escapeHtml(plantation.treeSpecies)}</span>
            </div>
            <div class="field-group">
              <span class="label">Mean NDVI:</span>
              <span class="value">${(obs?.meanNdvi ?? plantation.ndviScore).toFixed(4)}</span>
            </div>
            <div class="field-group">
              <span class="label">Scene date:</span>
              <span class="value">${obs ? new Date(obs.sceneDate).toISOString().slice(0, 10) : 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="label">Cloud / no-data:</span>
              <span class="value">${obs?.cloudCoverPct != null ? `${obs.cloudCoverPct}%` : 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="label">Satellite:</span>
              <span class="value">${escapeHtml(obs?.satellite || 'SENTINEL2')}</span>
            </div>

            <div class="footer">
              <p class="disclaimer">Voluntary marketplace estimate from measured NDVI — not a compliance registry credit.</p>
              <button onclick="window.print()" style="background:#22c55e; color:#0a0f0d; border:none; padding:10px 20px; font-weight:bold; border-radius:8px; cursor:pointer; margin-top:10px;">
                Print / Save PDF
              </button>
            </div>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return NextResponse.json({ error: 'Certificate or receipt record not found.' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to render certificate.' }, { status: 500 });
  }
}
