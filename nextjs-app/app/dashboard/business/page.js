'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-slate-100 animate-pulse flex items-center justify-center rounded-2xl">
      <p className="text-slate-500">Loading Map...</p>
    </div>
  ),
});

export default function BusinessDashboard() {
  const [plantations, setPlantations] = useState([]);
  const [filteredPlantations, setFilteredPlantations] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('ndvi');
  const [priceFilter, setPriceFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userType = localStorage.getItem('userType');
    
    if (!token || userType !== 'business') {
      router.push('/login');
      return;
    }

    loadData();
    const pollInterval = setInterval(loadData, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    let filtered = [...plantations];

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.tree_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (priceFilter === 'high') {
      filtered = filtered.filter(p => (p.credits || 0) > 10);
    } else if (priceFilter === 'medium') {
      filtered = filtered.filter(p => (p.credits || 0) >= 5 && (p.credits || 0) <= 10);
    } else if (priceFilter === 'low') {
      filtered = filtered.filter(p => (p.credits || 0) < 5);
    }

    if (sortBy === 'ndvi') {
      filtered.sort((a, b) => (b.ndvi || 0) - (a.ndvi || 0));
    } else if (sortBy === 'credits') {
      filtered.sort((a, b) => (b.credits || 0) - (a.credits || 0));
    } else if (sortBy === 'area') {
      filtered.sort((a, b) => (b.area || 0) - (a.area || 0));
    }

    setFilteredPlantations(filtered);
  }, [plantations, searchQuery, sortBy, priceFilter]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

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
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/business/purchases', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plantationId, credits: Math.min(5, credits) }),
      });

      if (res.ok) loadData();
    } catch (err) {
      console.error('Purchase failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_type');
    localStorage.removeItem('username');
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const totalCredits = purchases.reduce((sum, p) => sum + p.credits, 0);
  const totalSpent = purchases.reduce((sum, p) => sum + p.price, 0);
  const avgNDVI = plantations.length > 0 
    ? (plantations.reduce((sum, p) => sum + (p.ndvi || 0), 0) / plantations.length).toFixed(3)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Dashboard Header ── */}
      <nav className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl">🏢</div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Business Dashboard</h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Carbon Marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-emerald-600">Marketplace</Link>
            <button 
              onClick={loadData} 
              className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-all"
            >
              🔄 Refresh
            </button>
            <button 
              onClick={handleLogout} 
              className="bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-100"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Credits</p>
            <p className="text-3xl font-bold text-emerald-600">{totalCredits.toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Spent</p>
            <p className="text-3xl font-bold text-slate-900">${totalSpent.toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Available</p>
            <p className="text-3xl font-bold text-slate-900">{filteredPlantations.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Avg NDVI</p>
            <p className="text-3xl font-bold text-emerald-600">{avgNDVI}</p>
          </div>
        </div>

        {/* ── Map Section ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
          <div className="h-[400px] relative">
            <MapComponent plantations={plantations} />
          </div>
        </div>

        {/* ── Filters & Search ── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by tree type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all"
            />
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all"
            >
              <option value="all">All Credits</option>
              <option value="high">High (>10)</option>
              <option value="medium">Medium (5-10)</option>
              <option value="low">Low (<5)</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all"
            >
              <option value="ndvi">Best NDVI</option>
              <option value="credits">Most Credits</option>
              <option value="area">Largest Area</option>
            </select>
          </div>
        </div>

        {/* ── Marketplace Grid ── */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Available Plantations</h2>
            <span className="bg-white px-4 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-500 uppercase">
              {filteredPlantations.length} listings
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlantations.length === 0 ? (
              <div className="col-span-full py-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <span className="text-4xl mb-2">🌴</span>
                <p className="font-medium">No plantations match your filters.</p>
              </div>
            ) : (
              filteredPlantations.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden">
                  <div className="h-40 bg-slate-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent"></div>
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-emerald-700 uppercase tracking-widest shadow-sm">
                      NDVI {(p.ndvi || 0).toFixed(2)}
                    </div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                      {p.area || 0} ha
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{p.tree_type?.toLowerCase().includes('mango') ? '🥭' : '🌳'}</span>
                        <h3 className="text-lg font-bold text-slate-900">{p.tree_type}</h3>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-emerald-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Available</p>
                        <p className="text-sm font-bold text-emerald-900">{(p.credits || 0).toFixed(1)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Price</p>
                        <p className="text-sm font-bold text-slate-900">${((p.credits || 0) * 6.5).toFixed(0)}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handlePurchase(p.id, p.credits)}
                      className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]"
                    >
                      Acquire Credits
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Transaction History ── */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Purchase History</h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {purchases.length === 0 ? (
              <div className="p-20 text-center text-slate-400">
                <p className="font-medium">No purchases yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Plantation ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Credits</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Total Cost</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchases.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">#PLN-{p.plantation_id}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600">+{(p.credits || 0).toFixed(1)}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">${p.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

  const handlePurchase = async (plantationId, credits) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/business/purchases', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_type');
    localStorage.removeItem('username');
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
                      NDVI {(p.ndvi || 0).toFixed(2)}
                   </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-900">{p.tree_type} Plantation</h3>
                    <p className="text-xs font-mono text-slate-400">ID: {p.id}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Available</p>
                      <p className="text-sm font-bold text-slate-900">{(p.credits || 0).toFixed(1)} <span className="text-[10px] text-slate-400">CR</span></p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Area</p>
                      <p className="text-sm font-bold text-slate-900">{p.area || 0} <span className="text-[10px] text-slate-400">HA</span></p>
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
                      <td className="px-8 py-5 text-sm font-bold text-slate-900 font-mono tracking-tighter">#PLN-{p.plantation_id}</td>
                      <td className="px-8 py-5 text-sm font-medium text-emerald-600">+{(p.credits || 0).toFixed(2)} Credits</td>
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