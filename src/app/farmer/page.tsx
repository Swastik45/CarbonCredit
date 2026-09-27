'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { PlantationPlot } from '@/components/InteractiveMap';
import PlotBoundaryDrawer, { BoundaryChange } from '@/components/PlotBoundaryDrawer';

export default function FarmerPage() {
  const router = useRouter();
  const [plantations, setPlantations] = useState<PlantationPlot[]>([]);
  const [listReady, setListReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [areaHectares, setAreaHectares] = useState('');
  const [treeSpecies, setTreeSpecies] = useState('');
  const [treeCount, setTreeCount] = useState('');
  const [landParcelId, setLandParcelId] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<GeoJSON.Polygon | null>(null);
  const [measuredAreaHa, setMeasuredAreaHa] = useState<number | null>(null);

  const fetchMyPlantations = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();

      if (!userRes.ok || !userData.authenticated) {
        router.replace('/login');
        return;
      }

      const role = userData.user?.role;
      if (role !== 'FARMER' && role !== 'USER') {
        router.replace('/dashboard');
        return;
      }

      const res = await fetch(`/api/plantations?farmerId=${userData.user.id}`);
      const data = await res.json();
      const plots = data.plantations || [];
      setPlantations(plots);
      try {
        sessionStorage.setItem(`cc_farmer_plots_${userData.user.id}`, JSON.stringify(plots));
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Failed to load farmer plantations:', err);
    } finally {
      setListReady(true);
    }
  };

  useEffect(() => {
    try {
      const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('cc_farmer_plots_'));
      if (keys[0]) {
        const cached = JSON.parse(sessionStorage.getItem(keys[0]) || '[]');
        if (Array.isArray(cached) && cached.length > 0) {
          setPlantations(cached);
          setListReady(true);
        }
      }
    } catch {
      // ignore
    }
    fetchMyPlantations();
  }, [router]);

  const handleBoundaryChange = (value: BoundaryChange) => {
    setBoundaryGeoJson(value.geoJson);
    setMeasuredAreaHa(value.measuredAreaHectares);
    if (value.centroid) {
      setLatitude(value.centroid.lat.toFixed(6));
      setLongitude(value.centroid.lng.toFixed(6));
    }
    if (value.measuredAreaHectares != null) {
      setAreaHectares(String(value.measuredAreaHectares));
    }
  };

  const handleGpsFix = (coords: { lat: number; lng: number }) => {
    setLatitude(coords.lat.toFixed(6));
    setLongitude(coords.lng.toFixed(6));
  };

  const handleGpsPlace = (place: { shortLabel: string; regionHint?: string | null }) => {
    // Suggest typed location from live GPS place (user can edit)
    if (!locationName.trim()) {
      setLocationName(place.shortLabel);
    }
  };

  const handleDocumentPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingDoc(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/uploads/land-title', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setDocumentUrl(data.documentUrl);
      setDocumentName(data.fileName || file.name);
    } catch (err: any) {
      setDocumentUrl('');
      setDocumentName('');
      setMessage({ type: 'error', text: err?.message || 'Document upload failed.' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const clearDocument = () => {
    setDocumentUrl('');
    setDocumentName('');
  };

  const handleSubmitPlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (!boundaryGeoJson) {
      setMessage({ type: 'error', text: 'Draw the plot boundary on the map first.' });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/plantations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          locationName,
          latitude,
          longitude,
          areaHectares: areaHectares || measuredAreaHa,
          treeSpecies,
          treeCount,
          landParcelId,
          documentUrl,
          boundaryGeoJson,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit plantation plot.');

      const ndviNote = data.ndvi
        ? ` NDVI ${data.ndvi.plantationNdviScore}.`
        : data.ndviError
          ? ` (${data.ndviError})`
          : '';

      setMessage({ type: 'success', text: `${data.message}${ndviNote}` });
      setTitle('');
      setDescription('');
      setLocationName('');
      setLatitude('');
      setLongitude('');
      setAreaHectares('');
      setTreeSpecies('');
      setTreeCount('');
      setLandParcelId('');
      setDocumentUrl('');
      setDocumentName('');
      setBoundaryGeoJson(null);
      setMeasuredAreaHa(null);
      fetchMyPlantations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Plot submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-world-root portal-dashboard-root min-h-screen flex flex-col relative font-sans">
      <header className="portal-header sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="btn-download py-2 text-xs font-bold shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span>My dashboard</span>
            </Link>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="portal-brand-mark shrink-0" />
              <div className="min-w-0">
                <div className="portal-brand-name text-base sm:text-lg truncate">
                  Carbon<span>Credit</span>
                </div>
                <p className="portal-kicker mb-0 truncate" style={{ marginBottom: 0 }}>
                  Farmer · Nepal plot
                </p>
              </div>
            </div>
          </div>
          <div className="text-xs sm:text-sm font-bold shrink-0">
            <span className="font-mono text-base" style={{ color: '#ffab86' }}>
              {plantations.length}
            </span>{' '}
            <span className="opacity-60">plots</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 py-6 sm:px-6 sm:py-10 flex-1 space-y-10 sm:space-y-12">
        {message && (
          <div
            className={`portal-alert p-4 border-l-2 text-sm flex items-start justify-between gap-4 ${
              message.type === 'success'
                ? 'border-emerald-400/70 text-emerald-300'
                : 'border-red-400/70 text-red-300'
            }`}
          >
            <span className="font-semibold leading-relaxed">{message.text}</span>
            <button type="button" onClick={() => setMessage(null)} className="font-bold shrink-0 opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        <section className="portal-welcome">
          <p className="portal-kicker">Register plantation</p>
          <h1 className="font-extrabold">Mark your land on the map</h1>
          <p className="portal-welcome-sub font-medium mt-3">
            Use GPS to center on your field, then draw the boundary. Nepal plots only — large map so corners are easy to tap.
          </p>
        </section>

        <form onSubmit={handleSubmitPlot} className="space-y-10">
          <section className="space-y-4">
            <div className="portal-section-head">
              <p className="portal-kicker mb-1">Step 1</p>
              <h2 className="text-xl sm:text-2xl font-extrabold">Draw boundary</h2>
            </div>

            <div className="clamphook-card p-3 sm:p-4">
              <PlotBoundaryDrawer
                onBoundaryChange={handleBoundaryChange}
                onGpsFix={handleGpsFix}
                onGpsPlace={handleGpsPlace}
              />
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-mono opacity-80">
                <span>
                  Lat <strong>{latitude || '—'}</strong>
                </span>
                <span>
                  Lng <strong>{longitude || '—'}</strong>
                </span>
                {longitude && parseFloat(longitude) < 84.5 && parseFloat(longitude) > 80 && (
                  <span className="text-amber-400 font-sans font-semibold">
                    Western Nepal (Lumbini/Terai), not Kathmandu Valley (~85.3°E).
                  </span>
                )}
                {longitude && parseFloat(longitude) >= 85.0 && parseFloat(longitude) <= 85.6 && (
                  <span className="text-emerald-400 font-sans font-semibold">
                    Coordinates look like Kathmandu Valley.
                  </span>
                )}
                <span>
                  Area{' '}
                  <strong className="text-emerald-400">
                    {measuredAreaHa != null ? `${measuredAreaHa} ha` : 'draw first'}
                  </strong>
                </span>
                <span>
                  Boundary{' '}
                  <strong className={boundaryGeoJson ? 'text-emerald-400' : 'text-amber-400'}>
                    {boundaryGeoJson ? 'ready' : 'required'}
                  </strong>
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="portal-section-head">
              <p className="portal-kicker mb-1">Step 2</p>
              <h2 className="text-xl sm:text-2xl font-extrabold">Plot details &amp; Lalpurja</h2>
            </div>

            <div className="clamphook-card p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">Plot title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lower terrace reforestation"
                    className="w-full input-field text-sm py-3"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1.5 text-emerald-400">
                    Lalpurja / land parcel ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={landParcelId}
                    onChange={(e) => setLandParcelId(e.target.value)}
                    className="w-full input-field font-mono text-sm py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">Location name</label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Kavre, Nepal"
                    className="w-full input-field text-sm py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">
                    Area (ha)
                    {measuredAreaHa != null && (
                      <span className="text-emerald-400 font-normal ml-1">from map · editable</span>
                    )}
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={areaHectares}
                    onChange={(e) => setAreaHectares(e.target.value)}
                    className="w-full input-field font-mono text-sm py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">Tree species</label>
                  <input
                    type="text"
                    required
                    value={treeSpecies}
                    onChange={(e) => setTreeSpecies(e.target.value)}
                    placeholder="e.g. Bamboo, Sal, Mixed"
                    className="w-full input-field text-sm py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">Tree count (optional)</label>
                  <input
                    type="number"
                    value={treeCount}
                    onChange={(e) => setTreeCount(e.target.value)}
                    className="w-full input-field font-mono text-sm py-3"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">
                    Lalpurja / land title scan
                  </label>
                  <p className="text-xs opacity-55 mb-2 leading-relaxed">
                    Upload a photo or PDF of your land title — not a website link.
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="inline-flex items-center justify-center gap-2 px-5 py-3 btn-enroll text-sm font-bold cursor-pointer disabled:opacity-50">
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        disabled={uploadingDoc}
                        onChange={handleDocumentPick}
                      />
                      {uploadingDoc ? 'Uploading…' : documentUrl ? 'Replace file' : 'Choose file'}
                    </label>
                    {documentUrl ? (
                      <div className="flex items-center gap-3 text-sm min-w-0">
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-emerald-400 truncate hover:underline"
                        >
                          {documentName || 'Uploaded document'}
                        </a>
                        <button
                          type="button"
                          onClick={clearDocument}
                          className="text-xs font-bold portal-danger px-2 py-1 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm opacity-50">PDF or image · max 8 MB</span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full input-field text-sm py-3"
                  />
                </div>

                <input type="hidden" value={latitude} readOnly />
                <input type="hidden" value={longitude} readOnly />
              </div>

              <button
                type="submit"
                disabled={submitting || !boundaryGeoJson || !latitude || !longitude}
                className="w-full sm:w-auto btn-enroll px-8 py-4 text-sm font-bold justify-center disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit for NDVI verification'}
              </button>
              {!boundaryGeoJson && (
                <p className="text-sm text-amber-400 font-medium">
                  Draw the boundary in Step 1 before submitting.
                </p>
              )}
            </div>
          </section>
        </form>

        <section className="space-y-4">
          <div className="portal-section-head">
            <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Your registered plots
            </h2>
          </div>

          {plantations.length === 0 ? (
            listReady ? (
              <p className="text-sm opacity-60 font-medium">
                None yet. Complete the steps above to add your first plot.
              </p>
            ) : null
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plantations.map((plot) => (
                <div key={plot.id} className="clamphook-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-base">{plot.title}</h3>
                    <span className="portal-status-line">
                      Status <strong>{plot.status}</strong>
                    </span>
                  </div>
                  <p className="text-xs font-mono text-emerald-400">
                    {plot.landParcelId || 'No parcel ID'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-white/10">
                    <div>
                      <div className="text-xs opacity-50">Location</div>
                      <div className="font-semibold">{plot.locationName}</div>
                    </div>
                    <div>
                      <div className="text-xs opacity-50">Area</div>
                      <div className="font-semibold">{plot.measuredAreaHectares ?? plot.areaHectares} ha</div>
                    </div>
                    <div>
                      <div className="text-xs opacity-50">NDVI</div>
                      <div className="font-semibold">
                        {plot.ndviScore > 0 ? plot.ndviScore.toFixed(3) : 'Pending'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs opacity-50">Credits</div>
                      <div className="font-semibold text-emerald-400">
                        {plot.creditsIssued} tCO₂e
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
