'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const [plantations, setPlantations] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    if (!userId || userType !== 'admin') {
      router.push('/login');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const headers = { 'x-user-id': userId, 'x-user-type': 'admin' };
      const res = await fetch('/api/admin/plantations', { headers });
      const data = await res.json();
      setPlantations(data);
    } catch (err) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (plantationId, status) => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'x-user-type': 'admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plantationId, status }),
      });

      if (res.ok) loadData();
    } catch (err) {
      console.error('Verification failed');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-500">Decrypting Registry...</p>
      </div>
    </div>
  );

  const pending = plantations.filter(p => p.status === 'pending');

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── Admin Top Bar ── */}
      <nav className="bg-slate-900 text-white px-8 py-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 text-slate-900 p-2 rounded-lg font-bold">HQ</div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest">Admin Command</h1>
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM ONLINE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-tighter">
            <Link href="/" className="hover:text-emerald-400 transition-colors">Public View</Link>
            <button onClick={handleLogout} className="bg-slate-800 hover:bg-rose-600 px-4 py-2 rounded-md transition-all">
              Terminal Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-10">
        
        {/* ── Dashboard Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Total Logs', value: plantations.length, color: 'text-slate-900' },
            { label: 'Pending Action', value: pending.length, color: 'text-amber-500' },
            { label: 'System Uptime', value: '99.9%', color: 'text-emerald-500' },
            { label: 'Active Nodes', value: '1,242', color: 'text-blue-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Pending Verification Queue ── */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Verification Queue</h2>
            <div className="h-[2px] flex-1 bg-slate-200" />
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
              {pending.length} ACTION REQUIRED
            </span>
          </div>

          {pending.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center text-slate-400">
              <p className="font-bold uppercase tracking-widest text-sm">Registry is clean. No pending tasks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pending.map(p => (
                <div key={p.id} className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl p-8 hover:border-emerald-500 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Plot ID</span>
                      <h3 className="text-lg font-black text-slate-900">#{p.id} — {p.treeType}</h3>
                    </div>
                    <div className="bg-slate-100 px-3 py-1 rounded-md font-mono text-[10px] font-bold">
                      FARMER_{p.farmerId}
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Satellite NDVI</span>
                      <span className="font-bold text-emerald-600">{p.ndvi.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Physical Area</span>
                      <span className="font-bold">{p.area} Hectares</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Coordinates</span>
                      <span className="font-mono text-[11px] bg-slate-50 px-2 rounded">{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleVerify(p.id, 'verified')}
                      className="bg-emerald-500 text-white font-black py-3 rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      ✓ VERIFY
                    </button>
                    <button 
                      onClick={() => handleVerify(p.id, 'rejected')}
                      className="bg-white border border-rose-200 text-rose-500 font-black py-3 rounded-xl hover:bg-rose-50 transition-all active:scale-95"
                    >
                      ✕ REJECT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Global Registry Table ── */}
        <section>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Full Registry Ledger</h2>
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Farmer</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Area/NDVI</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plantations.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-slate-400">#00{p.id}</td>
                    <td className="px-8 py-5 font-bold text-slate-900 text-sm">{p.treeType}</td>
                    <td className="px-8 py-5 text-sm text-slate-600">ID: {p.farmerId}</td>
                    <td className="px-8 py-5">
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">{p.area} ha</span>
                        <span className="mx-2 text-slate-200">|</span>
                        <span className="font-mono text-emerald-600">{p.ndvi.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`
                        text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full
                        ${p.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 
                          p.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}
                      `}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}