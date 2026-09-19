'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PlantationPlot } from '@/components/InteractiveMap';

export default function FarmerPage() {
  const router = useRouter();
  const [plantations, setPlantations] = useState<PlantationPlot[]>([]);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
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

  const fetchMyPlantations = async () => {
    setFetching(true);
    try {
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();

      if (!userRes.ok || !userData.authenticated) {
        router.replace('/login');
        return;
      }

      const res = await fetch(`/api/plantations?farmerId=${userData.user.id}`);
      const data = await res.json();
      setPlantations(data.plantations || []);
    } catch (err) {
      console.error('Failed to load farmer plantations:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMyPlantations();
  }, [router]);

  const handleSubmitPlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

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
          areaHectares,
          treeSpecies,
          treeCount,
          landParcelId,
          documentUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit plantation plot.');
      }

      setMessage({ type: 'success', text: data.message });
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
      fetchMyPlantations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Plot submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-world-root min-h-screen hero-root text-black dark:text-slate-100 flex flex-col relative font-sans">
      {fetching && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#3b69fc] animate-pulse z-50" />
      )}

      {/* Top Navbar */}
      <header className="portal-header sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard"
              className="btn-download py-2 text-[10px] sm:text-xs font-black"
            >
              <ArrowLeft className="w-4 h-4 text-[#3b69fc]" />
              <span>Back to Portal</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="portal-brand-mark" />
              <span className="portal-brand-name">
                Carbon<span>Credit</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end">
            <div className="text-[10px] sm:text-xs text-black dark:text-white font-black">
              <span className="font-mono text-[#3b69fc] font-black text-sm">{plantations.length}</span> Registered Plots
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 sm:py-8 flex-1 space-y-6 sm:space-y-8">
        {/* Banner Notification */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xl ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-300'
            }`}
          >
            <span className="font-black">{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-black ml-4 text-black dark:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Plot Registration Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Registration Form */}
          <div className="clamphook-card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#3b69fc]" />
                <span>Register Plantation Plot</span>
              </h2>
              <p className="text-xs text-black dark:text-slate-300 mt-1 font-black">
                Enter land title parcel registration & GPS coordinates for satellite auditing
              </p>
            </div>

            <form onSubmit={handleSubmitPlot} className="space-y-4 text-xs">
              <div>
                <label className="block text-black dark:text-slate-300 font-black mb-1">Plot Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full input-field font-black"
                />
              </div>

              <div>
                <label className="block text-emerald-700 dark:text-emerald-400 font-black mb-1">
                  Land Title / Lalpurja Parcel ID *
                </label>
                <input
                  type="text"
                  required
                  value={landParcelId}
                  onChange={(e) => setLandParcelId(e.target.value)}
                  className="w-full input-field font-mono font-black border-[#3b69fc]"
                />
              </div>

              <div>
                <label className="block text-black dark:text-slate-300 font-black mb-1">Land Title Certificate Document URL</label>
                <input
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  className="w-full input-field font-black"
                />
              </div>

              <div>
                <label className="block text-black dark:text-slate-300 font-black mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full input-field font-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-black dark:text-slate-300 font-black mb-1">Location Name</label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full input-field font-black"
                  />
                </div>
                <div>
                  <label className="block text-black dark:text-slate-300 font-black mb-1">Area (Hectares)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    value={areaHectares}
                    onChange={(e) => setAreaHectares(e.target.value)}
                    className="w-full input-field font-mono font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-black dark:text-slate-300 font-black mb-1">Latitude</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full input-field font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block text-black dark:text-slate-300 font-black mb-1">Longitude</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full input-field font-mono font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-black dark:text-slate-300 font-black mb-1">Tree Species</label>
                  <input
                    type="text"
                    required
                    value={treeSpecies}
                    onChange={(e) => setTreeSpecies(e.target.value)}
                    className="w-full input-field font-black"
                  />
                </div>
                <div>
                  <label className="block text-black dark:text-slate-300 font-black mb-1">Estimated Tree Count</label>
                  <input
                    type="number"
                    value={treeCount}
                    onChange={(e) => setTreeCount(e.target.value)}
                    className="w-full input-field font-mono font-black"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-enroll py-3.5 text-xs font-black justify-center shadow-xl disabled:opacity-50 mt-2"
              >
                {submitting ? 'Registering Plot...' : 'Submit Plot for Land Audit'}
              </button>
            </form>
          </div>

          {/* Registered Plots Display */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Registered Plantation Plots</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plantations.map((plot) => (
                <div key={plot.id} className="clamphook-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-black dark:text-white">{plot.title}</h3>
                    <span className="text-xs font-black text-black dark:text-slate-300">{plot.status}</span>
                  </div>

                  <p className="text-xs text-black dark:text-slate-300 leading-relaxed font-extrabold">{plot.description}</p>

                  <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-[#07122a] border border-slate-300 dark:border-gray-800 font-mono text-xs">
                    <span className="text-black dark:text-slate-400 block text-[10px] uppercase font-black">LAND TITLE PARCEL ID:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-black">{plot.landParcelId || 'Title Registration Pending'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-300 dark:border-gray-800">
                    <div>
                      <span className="text-black dark:text-slate-400 text-[10px] block font-black">LOCATION</span>
                      <span className="font-sans font-black text-black dark:text-white">{plot.locationName}</span>
                    </div>
                    <div>
                      <span className="text-black dark:text-slate-400 text-[10px] block font-black">AREA</span>
                      <span className="font-black text-black dark:text-white">{plot.areaHectares} Hectares</span>
                    </div>
                    <div>
                      <span className="text-black dark:text-slate-400 text-[10px] block font-black">COORDINATES</span>
                      <span className="font-black text-black dark:text-white">
                        {plot.latitude.toFixed(4)}°, {plot.longitude.toFixed(4)}°
                      </span>
                    </div>
                    <div>
                      <span className="text-black dark:text-slate-400 text-[10px] block font-black">CREDITS ISSUED</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-black">{plot.creditsIssued} tCO₂e</span>
                    </div>
                  </div>
                </div>
              ))}

              {plantations.length === 0 && (
                <div className="col-span-full clamphook-card p-12 text-center text-black dark:text-slate-400 text-sm font-black">
                  <span className="font-black text-black dark:text-white">No plots registered yet. Use the form on the left to submit your plot!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
