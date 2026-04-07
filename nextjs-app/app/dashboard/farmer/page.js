'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FarmerDashboard() {
  const [plantations, setPlantations] = useState([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    treeType: '',
    area: '',
    ndvi: '',
  });
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    if (!userId || userType !== 'farmer') {
      router.push('/login');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const headers = {
        'x-user-id': userId,
        'x-user-type': 'farmer',
      };

      const [plantRes, creditsRes] = await Promise.all([
        fetch('/api/farmer/plantations', { headers }),
        fetch('/api/farmer/credits', { headers })
      ]);

      const plantData = await plantRes.json();
      const creditsData = await creditsRes.json();
      
      setPlantations(plantData);
      setCredits(creditsData.totalCredits);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/farmer/plantations', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'x-user-type': 'farmer',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ latitude: '', longitude: '', treeType: '', area: '', ndvi: '' });
        loadData();
      }
    } catch (err) {
      setError('Failed to add plantation');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Top Navigation ── */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <span className="text-2xl">👨‍🌾</span>
             <div>
               <h1 className="text-lg font-bold text-slate-900 leading-tight">Farmer Dashboard</h1>
               <p className="text-xs text-slate-500 font-medium">Welcome back, Grower</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">Home</Link>
            <button 
              onClick={handleLogout} 
              className="bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-100 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* ── Left Column: Form & Stats ── */}
          <div className="lg:col-span-1 space-y-8">
            {/* Credits Card */}
            <div className="bg-emerald-900 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">Total Earnings</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">{credits.toFixed(2)}</span>
                  <span className="text-emerald-400 font-bold">Credits</span>
                </div>
                <p className="mt-4 text-emerald-100/60 text-sm leading-relaxed">
                  Calculated based on verified NDVI growth across all active plots.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
            </div>

            {/* Registration Form */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Register New Plot</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Latitude</label>
                    <input name="latitude" type="number" step="0.0001" value={formData.latitude} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Longitude</label>
                    <input name="longitude" type="number" step="0.0001" value={formData.longitude} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tree Species</label>
                  <input name="treeType" value={formData.treeType} onChange={handleChange} placeholder="e.g. Mango, Teak" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Area (ha)</label>
                    <input name="area" type="number" step="0.01" value={formData.area} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Initial NDVI</label>
                    <input name="ndvi" type="number" step="0.001" value={formData.ndvi} onChange={handleChange} placeholder="0.0 - 1.0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]">
                  Submit for Verification
                </button>
              </form>
            </div>
          </div>

          {/* ── Right Column: List ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Your Plantations</h2>
              <span className="bg-white px-4 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
                {plantations.length} total plots
              </span>
            </div>

            {error && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-medium">{error}</div>}

            <div className="grid sm:grid-cols-2 gap-4">
              {plantations.length === 0 ? (
                <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
                  <span className="text-4xl mb-2">🌱</span>
                  <p className="font-medium">No plantations registered yet.</p>
                </div>
              ) : (
                plantations.map(p => (
                  <div key={p.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                    {/* Status Badge */}
                    <div className="absolute top-0 right-0 pt-4 pr-6">
                      <span className={`
                        text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full
                        ${p.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}
                      `}>
                        {p.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                        {p.treeType.toLowerCase().includes('mango') ? '🥭' : '🌳'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{p.treeType}</h3>
                        <p className="text-xs text-slate-400 font-mono tracking-tighter">
                          {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-6">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Area</p>
                        <p className="text-sm font-bold text-slate-700">{p.area} <span className="text-[10px] font-medium text-slate-400">ha</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NDVI</p>
                        <p className="text-sm font-bold text-emerald-600">{p.ndvi.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Credits</p>
                        <p className="text-sm font-bold text-slate-700">{p.credits.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}