'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import leaflet components to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-slate-100 animate-pulse flex items-center justify-center rounded-3xl border-2 border-dashed border-slate-200">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Initializing Satellite Map...</p>
      </div>
    </div>
  )
});

export default function MapPage() {
  const [plantations, setPlantations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlantations();
  }, []);

  const loadPlantations = async () => {
    try {
      const res = await fetch('/api/business/plantations');
      
      if (res.ok) {
        const data = await res.json();
        setPlantations(data);
      }
    } catch (err) {
      console.error('Failed to load plantations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <section className="pt-12 pb-8 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Global Registry
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">🗺️ Plantation Map</h1>
            <p className="text-slate-500 mt-2 max-w-xl">
              Real-time visualization of verified carbon sequestration projects. 
              Explore plantations verified via <span className="text-emerald-700 font-semibold">NDVI satellite analysis</span>.
            </p>
          </div>
          
          {/* Quick Legend for Desktop */}
          <div className="hidden lg:flex items-center gap-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs font-bold uppercase tracking-tight">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Verified</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400" /> Pending</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500" /> Rejected</div>
          </div>
        </div>
      </section>

      {/* ── Map Container ── */}
      <section className="px-6 max-w-7xl mx-auto">
        <div className="relative h-[650px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-emerald-900/10 border-8 border-white group">
          {loading ? (
             <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
                <p className="text-slate-400 font-medium">Loading geospatial data...</p>
             </div>
          ) : (
            <MapComponent plantations={plantations} />
          )}
          
          {/* Floating Instructions Toggle (Mobile Only) */}
          <div className="absolute bottom-6 right-6 lg:hidden z-[1000]">
            <button className="bg-emerald-900 text-white p-4 rounded-full shadow-xl">
               ℹ️
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats Dashboard ── */}
      <section className="py-12 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🌳</div>
            <div>
              <p className="text-3xl font-bold text-slate-900 leading-none">
                {plantations.filter(p => p.status === 'verified').length}
              </p>
              <p className="text-sm text-slate-500 font-medium mt-1">Verified Projects</p>
            </div>
          </div>

          <div className="bg-emerald-900 p-8 rounded-3xl shadow-xl shadow-emerald-900/20 flex items-center gap-6 group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💎</div>
            <div>
              <p className="text-3xl font-bold text-white leading-none">
                {plantations.reduce((sum, p) => sum + p.credits, 0).toFixed(0)}
              </p>
              <p className="text-emerald-100/60 text-sm font-medium mt-1">Available Credits</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📐</div>
            <div>
              <p className="text-3xl font-bold text-slate-900 leading-none">
                {plantations.reduce((sum, p) => sum + p.area, 0).toFixed(1)}
              </p>
              <p className="text-sm text-slate-500 font-medium mt-1">Hectares Protected</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Usage Guide ── */}
      <section className="pb-24 px-6 max-w-7xl mx-auto">
        <div className="bg-slate-900 rounded-[3rem] p-10 lg:p-16 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-6">Navigating the Registry</h2>
              <p className="text-slate-400 mb-8 max-w-md">
                Our interactive map provides full audit trails for every hectare of land listed on our platform. 
                Data is updated every 14 days via satellite passovers.
              </p>
              <div className="flex gap-4">
                <button className="bg-emerald-500 text-emerald-950 px-6 py-3 rounded-xl font-bold text-sm">Download Report</button>
                <button className="border border-slate-700 px-6 py-3 rounded-xl font-bold text-sm">NDVI Guide</button>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { label: 'Verified Status', desc: 'Active projects ready for immediate credit purchase.', icon: 'bg-emerald-500' },
                { label: 'Interactive Analysis', desc: 'Click markers to view heatmaps and historical growth.', icon: 'bg-blue-400' },
                { label: 'Geofencing', desc: 'Strict boundaries prevent credit double-counting.', icon: 'bg-purple-500' },
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-start">
                  <div className={`w-1.5 h-10 rounded-full ${item.icon} shrink-0`} />
                  <div>
                    <h4 className="font-bold text-white">{item.label}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}