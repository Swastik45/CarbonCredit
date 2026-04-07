'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BusinessDashboard() {
  const [plantations, setPlantations] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    if (!userId || userType !== 'business') {
      router.push('/login');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const headers = { 'x-user-id': userId, 'x-user-type': 'business' };

      const [plantRes, purchaseRes] = await Promise.all([
        fetch('/api/business/plantations', { headers }),
        fetch('/api/business/purchases', { headers })
      ]);

      const plantData = await plantRes.json();
      const purchaseData = await purchaseRes.json();
      
      setPlantations(plantData);
      setPurchases(purchaseData);
    } catch (err) {
      console.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plantationId, credits) => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/business/purchases', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'x-user-type': 'business',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plantationId, credits }),
      });

      if (res.ok) loadData();
    } catch (err) {
      console.error('Purchase failed');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const totalCredits = purchases.reduce((sum, p) => sum + p.credits, 0);

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-20">
      {/* ── Dashboard Header ── */}
      <nav className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl">🏢</div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Business Portal</h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Sustainability Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-900">Marketplace</Link>
            <button onClick={handleLogout} className="text-sm font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-4 py-2 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 mt-10">
        
        {/* ── Impact Overview ── */}
        <section className="mb-12">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em] mb-4">Your Total Offset</h2>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-black text-slate-900 tracking-tighter">{totalCredits.toFixed(2)}</span>
                <span className="text-emerald-600 font-bold text-xl uppercase italic">Credits</span>
              </div>
              <p className="mt-4 text-slate-400 max-w-sm text-sm font-medium">
                Your portfolio has contributed to the protection of approximately {(totalCredits * 0.4).toFixed(1)} hectares of forest.
              </p>
            </div>
            
            <div className="flex-1 w-full grid grid-cols-2 gap-4">
               <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Impact Status</p>
                  <p className="text-lg font-bold text-emerald-900">Carbon Neutral+</p>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Portfolio Value</p>
                  <p className="text-lg font-bold text-slate-900">${(totalCredits * 15).toLocaleString()}</p>
               </div>
            </div>
          </div>
        </section>

        {/* ── Marketplace Grid ── */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Available Inventory</h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500">SORT BY: RELEVANCE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plantations.map(p => (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                   <img 
                    src={`https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400&sig=${p.id}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" 
                    alt="Plantation"
                   />
                   <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-emerald-700 uppercase tracking-widest shadow-sm">
                      NDVI {p.ndvi.toFixed(2)}
                   </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-900">{p.treeType} Plantation</h3>
                    <p className="text-xs font-mono text-slate-400">ID: {p.id}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Available</p>
                      <p className="text-sm font-bold text-slate-900">{p.credits.toFixed(1)} <span className="text-[10px] text-slate-400">CR</span></p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Area</p>
                      <p className="text-sm font-bold text-slate-900">{p.area} <span className="text-[10px] text-slate-400">HA</span></p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handlePurchase(p.id, Math.min(5, p.credits))}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-[0.98]"
                  >
                    Acquire Credits
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Transaction History ── */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Investment Ledger</h2>
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            {purchases.length === 0 ? (
              <div className="p-20 text-center text-slate-400">
                <p className="font-medium italic">No transactions recorded in this fiscal period.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asset ID</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Credits Acquired</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transaction Value</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clearing Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 text-sm font-bold text-slate-900 font-mono tracking-tighter">#PLN-{p.plantationId}</td>
                      <td className="px-8 py-5 text-sm font-medium text-emerald-600">+{p.credits.toFixed(2)} Credits</td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-900 font-mono">${p.price.toFixed(2)}</td>
                      <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                        {new Date(p.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}