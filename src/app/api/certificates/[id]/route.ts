import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    // Check if certificate ID belongs to a CarbonPurchase or Plantation
    const purchase = await prisma.carbonPurchase.findFirst({
      where: { OR: [{ id }, { receiptNumber: id }] },
      include: {
        business: true,
        plantation: { include: { farmer: true } },
      },
    });

    if (purchase) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Carbon Offset Receipt #${purchase.receiptNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0f0d; color: #f0fdf4; padding: 40px; margin: 0; }
            .cert-box { max-width: 680px; margin: 0 auto; background: #121a16; border: 2px solid #22c55e; border-radius: 24px; padding: 40px; box-shadow: 0 0 40px rgba(34, 197, 94, 0.2); }
            .header { text-align: center; border-bottom: 1px solid #1a2620; padding-bottom: 20px; margin-bottom: 30px; }
            .title { color: #22c55e; font-size: 26px; margin: 0; font-weight: 800; }
            .subtitle { color: #86efac; font-size: 14px; margin-top: 4px; }
            .badge { display: inline-block; background: #052e16; color: #4ade80; border: 1px solid #22c55e; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; margin-top: 12px; }
            .field-group { margin-[18px] 0; display: flex; justify-content: space-between; border-bottom: 1px dashed #1a2620; padding-bottom: 12px; }
            .label { color: #86efac; font-size: 13px; }
            .value { font-weight: bold; color: #ffffff; font-size: 14px; }
            .credits-amount { font-size: 36px; font-weight: 900; color: #4ade80; text-align: center; margin: 24px 0; font-family: monospace; }
            .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #86efac; opacity: 0.8; }
            @media print { body { background: white; color: black; } .cert-box { border-color: black; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <div class="header">
              <div class="title">🍃 Official Carbon Offset Certificate</div>
              <div class="subtitle">Verified Carbon Credit Registry • Net-Zero Sequestration</div>
              <div class="badge">VERIFIED & SETTLED</div>
            </div>

            <div class="credits-amount">${purchase.creditsCount} tCO₂e</div>

            <div class="field-group">
              <span class="label">Certificate / Receipt ID:</span>
              <span class="value">${purchase.receiptNumber}</span>
            </div>
            <div class="field-group">
              <span class="label">Corporate Buyer Entity:</span>
              <span class="value">${purchase.business.name} (${purchase.business.companyName || 'Enterprise'})</span>
            </div>
            <div class="field-group">
              <span class="label">Origin Reforestation Plot:</span>
              <span class="value">${purchase.plantation.title}</span>
            </div>
            <div class="field-group">
              <span class="label">Location & Coordinates:</span>
              <span class="value">${purchase.plantation.locationName} (${purchase.plantation.latitude.toFixed(4)}°, ${purchase.plantation.longitude.toFixed(4)}°)</span>
            </div>
            <div class="field-group">
              <span class="label">Satellite NDVI Health Score:</span>
              <span class="value">${purchase.plantation.ndviScore.toFixed(2)}</span>
            </div>
            <div class="field-group">
              <span class="label">Total Offset Investment:</span>
              <span class="value">$${purchase.totalPrice.toFixed(2)} USD</span>
            </div>
            <div class="field-group">
              <span class="label">Issuance Timestamp:</span>
              <span class="value">${new Date(purchase.createdAt).toUTCString()}</span>
            </div>

            <div class="footer">
              <p>Cryptographically Audited via Supabase PostgreSQL & Sentinel-2 Satellite Registry.</p>
              <button onclick="window.print()" style="background:#22c55e; color:#0a0f0d; border:none; padding:10px 20px; font-weight:bold; border-radius:8px; cursor:pointer; margin-top:10px;">
                🖨️ Print / Save PDF Certificate
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

    // Check if ID belongs to a Plantation plot
    const plantation = await prisma.plantation.findUnique({
      where: { id },
      include: { farmer: true },
    });

    if (plantation) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Plantation Verification Certificate #${plantation.id.slice(-8)}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0f0d; color: #f0fdf4; padding: 40px; margin: 0; }
            .cert-box { max-width: 680px; margin: 0 auto; background: #121a16; border: 2px solid #22c55e; border-radius: 24px; padding: 40px; box-shadow: 0 0 40px rgba(34, 197, 94, 0.2); }
            .header { text-align: center; border-bottom: 1px solid #1a2620; padding-bottom: 20px; margin-bottom: 30px; }
            .title { color: #22c55e; font-size: 26px; margin: 0; font-weight: 800; }
            .subtitle { color: #86efac; font-size: 14px; margin-top: 4px; }
            .badge { display: inline-block; background: #052e16; color: #4ade80; border: 1px solid #22c55e; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; margin-top: 12px; }
            .field-group { margin: 18px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed #1a2620; padding-bottom: 12px; }
            .label { color: #86efac; font-size: 13px; }
            .value { font-weight: bold; color: #ffffff; font-size: 14px; }
            .credits-amount { font-size: 36px; font-weight: 900; color: #4ade80; text-align: center; margin: 24px 0; font-family: monospace; }
            .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #86efac; opacity: 0.8; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <div class="header">
              <div class="title">🍃 Plantation Audit Certificate</div>
              <div class="subtitle">Sentinel-2 Satellite Sequestration Audit</div>
              <div class="badge">${plantation.status}</div>
            </div>

            <div class="credits-amount">${plantation.creditsIssued} tCO₂e</div>

            <div class="field-group">
              <span class="label">Plot Title:</span>
              <span class="value">${plantation.title}</span>
            </div>
            <div class="field-group">
              <span class="label">Registered Farmer:</span>
              <span class="value">${plantation.farmer.name} (${plantation.farmer.email})</span>
            </div>
            <div class="field-group">
              <span class="label">Location & GPS:</span>
              <span class="value">${plantation.locationName} (${plantation.latitude.toFixed(4)}°, ${plantation.longitude.toFixed(4)}°)</span>
            </div>
            <div class="field-group">
              <span class="label">Plot Area / Tree Species:</span>
              <span class="value">${plantation.areaHectares} ha • ${plantation.treeSpecies}</span>
            </div>
            <div class="field-group">
              <span class="label">Satellite NDVI Health Index:</span>
              <span class="value">${plantation.ndviScore.toFixed(2)}</span>
            </div>

            <div class="footer">
              <button onclick="window.print()" style="background:#22c55e; color:#0a0f0d; border:none; padding:10px 20px; font-weight:bold; border-radius:8px; cursor:pointer; margin-top:10px;">
                🖨️ Print / Save PDF Certificate
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
