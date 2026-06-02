'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Initializing Satellite Map...</p>
      </div>
    </div>
  )
});

// ── Smart Search Bar (floats over the map) ─────────────────────────────────
function SmartSearch({ onSearch, onClear }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('map_recents') || '[]'); } catch { return []; }
  });
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // ── Fetch suggestions from Nominatim (free OSM geocoder) ──
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSuggestions(data.map(d => ({
        name: d.display_name.split(',').slice(0, 2).join(',').trim(),
        full: d.display_name,
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
        type: d.type,
      })));
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(t);
  }, [query, fetchSuggestions]);

  // ── Close on outside click ──
  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const saveRecent = (item) => {
    const next = [item, ...recents.filter(r => r.name !== item.name)].slice(0, 4);
    setRecents(next);
    try { localStorage.setItem('map_recents', JSON.stringify(next)); } catch {}
  };

  const pick = (item) => {
    setQuery(item.name);
    setOpen(false);
    setActiveIdx(-1);
    saveRecent(item);
    onSearch({ name: item.name, latitude: item.lat, longitude: item.lon });
  };

  const handleKey = (e) => {
    const list = query ? suggestions : recents;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      if (activeIdx >= 0 && list[activeIdx]) pick(list[activeIdx]);
      else if (suggestions[0]) pick(suggestions[0]);
    }
    else if (e.key === 'Escape') setOpen(false);
  };

  const clear = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onClear();
    inputRef.current?.focus();
  };

  const showDropdown = open && (query ? suggestions.length > 0 : recents.length > 0);

  return (
    <div ref={wrapRef} className="absolute top-4 left-1/2 -translate-x-1/2 w-[min(520px,calc(100%-32px))] z-[1000]">
      {/* Input box */}
      <div className={`flex items-center gap-2 bg-white rounded-2xl border px-4 h-12 shadow-xl transition-all
        ${open ? 'border-emerald-500 shadow-emerald-100' : 'border-slate-200'}`}>
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Search location, district, or coordinates…"
          className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400"
          autoComplete="off"
        />
        {query ? (
          <button onClick={clear} className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono shrink-0">⌘K</span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {!query && recents.length > 0 && (
            <div className="py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 pb-1.5">Recent searches</p>
              {recents.map((r, i) => (
                <button
                  key={i}
                  onClick={() => pick(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                    ${activeIdx === i ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                >
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  <span className="text-sm text-slate-700 flex-1 truncate">{r.name}</span>
                  <span className="text-xs text-slate-400">recent</span>
                </button>
              ))}
            </div>
          )}

          {query && suggestions.length > 0 && (
            <div className="py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 pb-1.5">Suggestions</p>
              {suggestions.map((s, i) => {
                const parts = s.name.split(new RegExp(`(${query})`, 'gi'));
                return (
                  <button
                    key={i}
                    onClick={() => pick(s)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                      ${activeIdx === i ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                  >
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span className="text-sm text-slate-700 flex-1 truncate">
                      {parts.map((p, j) =>
                        p.toLowerCase() === query.toLowerCase()
                          ? <mark key={j} className="bg-transparent text-emerald-600 font-semibold not-italic">{p}</mark>
                          : p
                      )}
                    </span>
                    <span className="text-xs text-slate-400 capitalize shrink-0">{s.type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Floating result bar (bottom of map) ───────────────────────────────────
function ResultBar({ location, nearbyPlantations, onClear }) {
  if (!location) return null;
  const verified = nearbyPlantations.filter(p => p.status === 'verified').length;
  const pending  = nearbyPlantations.filter(p => p.status === 'pending').length;
  const rejected = nearbyPlantations.filter(p => p.status === 'rejected').length;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-[999] flex flex-wrap items-center gap-2 pointer-events-none">
      {/* Location pill */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3.5 py-2 shadow-lg text-sm">
        <span className="text-emerald-600">📍</span>
        <span className="font-semibold text-slate-800 max-w-[180px] truncate">{location.name}</span>
        <span className="text-slate-400">·</span>
        <span className="font-bold text-emerald-600">{nearbyPlantations.length}</span>
        <span className="text-slate-500">within 50km</span>
        <button onClick={onClear} className="text-slate-400 hover:text-slate-700 ml-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Status chips */}
      {verified > 0 && (
        <div className="pointer-events-auto flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {verified} Verified
        </div>
      )}
      {pending > 0 && (
        <div className="pointer-events-auto flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          {pending} Pending
        </div>
      )}
      {rejected > 0 && (
        <div className="pointer-events-auto flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          {rejected} Rejected
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function MapPage() {
  const [plantations, setPlantations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState(null);
  const [nearbyPlantations, setNearbyPlantations] = useState([]);

  useEffect(() => { loadPlantations(); }, []);

  const loadPlantations = async () => {
    try {
      const res = await fetch('/api/business/plantations');
      if (res.ok) setPlantations(await res.json());
    } catch { console.error('Failed to load plantations'); }
    finally { setLoading(false); }
  };

  const handleSearch = async (location) => {
    setSearchLocation(location);
    try {
      const res = await fetch(`/api/geo/nearby?lat=${location.latitude}&lon=${location.longitude}&radius=50`);
      if (res.ok) {
        const data = await res.json();
        setNearbyPlantations(data.plantations || []);
      }
    } catch { console.error('Failed to load nearby plantations'); }
  };

  const handleClear = () => {
    setSearchLocation(null);
    setNearbyPlantations([]);
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
          <div className="hidden lg:flex items-center gap-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs font-bold uppercase tracking-tight">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Verified</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400" /> Pending</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500" /> Rejected</div>
          </div>
        </div>
      </section>

      {/* ── Map Container (search lives inside here now) ── */}
      <section className="px-6 max-w-7xl mx-auto">
        <div className="relative h-[650px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-emerald-900/10 border-8 border-white">
          {loading ? (
            <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
              <p className="text-slate-400 font-medium">Loading geospatial data...</p>
            </div>
          ) : (
            <MapComponent plantations={plantations} searchLocation={searchLocation} />
          )}

          {/* Smart search floats over the map */}
          <SmartSearch onSearch={handleSearch} onClear={handleClear} />

          {/* Result bar floats at bottom of map */}
          <ResultBar
            location={searchLocation}
            nearbyPlantations={nearbyPlantations}
            onClear={handleClear}
          />
        </div>
      </section>

      {/* ── Nearby Plantation Cards (shown below map only when results exist) ── */}
      {nearbyPlantations.length > 0 && (
        <section className="py-8 px-6 max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Plantations near <span className="text-emerald-600">{searchLocation?.name}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyPlantations.map(plantation => (
              <div key={plantation.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">
                    {plantation.tree_type?.toLowerCase().includes('mango') ? '🥭' : '🌳'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{plantation.tree_type}</h3>
                    <p className="text-xs text-slate-500">👨‍🌾 {plantation.farmer_username || 'Farmer'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-slate-500 font-medium">Area</p><p className="font-bold text-slate-900">{plantation.area} ha</p></div>
                  <div><p className="text-slate-500 font-medium">Distance</p><p className="font-bold text-blue-600">{(plantation.distance || 0).toFixed(1)} km</p></div>
                  <div><p className="text-slate-500 font-medium">NDVI</p><p className="font-bold text-emerald-600">{(plantation.ndvi || 0).toFixed(3)}</p></div>
                  <div>
                    <p className="text-slate-500 font-medium">Status</p>
                    <span className={`font-bold text-xs px-2 py-1 rounded inline-block mt-0.5 ${
                      plantation.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                      plantation.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                                                         'bg-red-100 text-red-700'
                    }`}>{plantation.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Stats Dashboard ── */}
      <section className="py-12 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🌳</div>
            <div>
              <p className="text-3xl font-bold text-slate-900 leading-none">{plantations.filter(p => p.status === 'verified').length}</p>
              <p className="text-sm text-slate-500 font-medium mt-1">Verified Projects</p>
            </div>
          </div>
          <div className="bg-emerald-900 p-8 rounded-3xl shadow-xl shadow-emerald-900/20 flex items-center gap-6 group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💎</div>
            <div>
              <p className="text-3xl font-bold text-white leading-none">{plantations.reduce((s, p) => s + p.credits, 0).toFixed(0)}</p>
              <p className="text-emerald-100/60 text-sm font-medium mt-1">Available Credits</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📐</div>
            <div>
              <p className="text-3xl font-bold text-slate-900 leading-none">{plantations.reduce((s, p) => s + p.area, 0).toFixed(1)}</p>
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
            </div>
            <div className="space-y-6">
              {[
                { label: 'Verified Status',      desc: 'Active projects ready for immediate credit purchase.',       icon: 'bg-emerald-500' },
                { label: 'Interactive Analysis', desc: 'Click markers to view heatmaps and historical growth.',      icon: 'bg-blue-400'    },
                { label: 'Geofencing',           desc: 'Strict boundaries prevent credit double-counting.',         icon: 'bg-purple-500'  },
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