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

export default function FarmerDashboard() {
  const [plantations, setPlantations] = useState([]);
  const [filteredPlantations, setFilteredPlantations] = useState([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [username, setUsername] = useState('');
  const [expandedPlantation, setExpandedPlantation] = useState(null);
  const [uploadingPlantationId, setUploadingPlantationId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    treeType: '',
    area: '',
    ndvi: '',
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userType = localStorage.getItem('userType');
    const savedUsername = localStorage.getItem('username');
    
    if (!token || userType !== 'farmer') {
      router.push('/login');
      return;
    }

    setUsername(savedUsername || 'Farmer');
    loadData();

    // Poll for updates every 5 seconds to reflect admin verification changes
    const pollInterval = setInterval(loadData, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    // Filter and sort plantations
    let filtered = [...plantations];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.tree_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'credits') {
      filtered.sort((a, b) => (b.credits || 0) - (a.credits || 0));
    } else if (sortBy === 'area') {
      filtered.sort((a, b) => (b.area || 0) - (a.area || 0));
    }

    setFilteredPlantations(filtered);
  }, [plantations, filterStatus, searchQuery, sortBy]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [plantRes, creditsRes] = await Promise.all([
        fetch('/api/farmer/plantations', { headers }),
        fetch('/api/farmer/credits', { headers })
      ]);

      if (!plantRes.ok || !creditsRes.ok) {
        const plantError = await plantRes.json().catch(() => ({}));
        const creditsError = await creditsRes.json().catch(() => ({}));
        const message = plantError.error || creditsError.error || 'Failed to load dashboard data';
        setError(message);
        if (plantRes.status === 401 || creditsRes.status === 401) {
          handleLogout();
        }
        return;
      }

      const plantData = await plantRes.json();
      const creditsData = await creditsRes.json();
      
      setPlantations(Array.isArray(plantData) ? plantData : []);
      setCredits(Number(creditsData.totalCredits || 0));
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getLocation = async () => {
    setLocationLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(4),
          longitude: longitude.toFixed(4),
        }));
        setLocationLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied. Please enable location access.';
        }
        setError(errorMessage);
        setLocationLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/farmer/plantations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await res.json();
        setFormData({ latitude: '', longitude: '', treeType: '', area: '', ndvi: '' });
        setError('');
        await loadData();
        setSuccessMessage('Plantation submitted for verification.');
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to add plantation');
      }
    } catch (err) {
      setError('Failed to add plantation');
    } finally {
      setSubmitting(false);
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

  const handleUploadDocument = async (plantationId, file, documentType) => {
    if (!file) return;
    setSuccessMessage('');

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      const msg = 'File size exceeds 10MB limit';
      setError(msg);
      alert(msg);
      return;
    }

    setUploadingPlantationId(plantationId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('plantationId', plantationId);
      formData.append('type', documentType);

      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/farmer/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        await res.json();
        await loadData();
        const successText = `${documentType === 'land_document' ? 'Land document' : 'Farm image'} uploaded successfully.`;
        setSuccessMessage(successText);
        alert(successText);
        setError('');
      } else {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.error || 'Upload failed. Please try again.';
        setError(message);
        alert(message);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
      alert('Upload failed. Please try again.');
    } finally {
      setUploadingPlantationId(null);
    }
  };

  const verifiedCount = plantations.filter(p => p.status === 'verified').length;
  const pendingCount = plantations.filter(p => p.status === 'pending').length;
  const totalArea = plantations.reduce((sum, p) => sum + (p.area || 0), 0);
  const avgNDVI = plantations.length > 0 
    ? (plantations.reduce((sum, p) => sum + (p.ndvi || 0), 0) / plantations.length).toFixed(3)
    : 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Top Navigation ── */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <span className="text-2xl">👨‍🌾</span>
             <div>
               <h1 className="text-lg font-bold text-slate-900 leading-tight">Farmer Dashboard</h1>
               <p className="text-xs text-slate-500 font-medium">Real-time Plantation Registry</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">Home</Link>
            <button 
              onClick={loadData} 
              className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-all"
              title="Refresh plantation data"
            >
              🔄 Refresh
            </button>
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
        
        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Credits</p>
            <p className="text-3xl font-bold text-emerald-600">{credits.toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Verified</p>
            <p className="text-3xl font-bold text-emerald-600">{verifiedCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Pending</p>
            <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Area</p>
            <p className="text-3xl font-bold text-slate-900">{totalArea.toFixed(1)}<span className="text-sm text-slate-500"> ha</span></p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* ── Left Column: Form ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm sticky top-24">
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

                <button
                  type="button"
                  onClick={getLocation}
                  disabled={locationLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {locationLoading ? '📍 Detecting...' : '📍 Get Location'}
                </button>

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

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </form>
            </div>
          </div>

          {/* ── Right Column: Map + List ── */}
          <div className="lg:col-span-2 space-y-8">
            {/* ── Map Section ── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="h-[400px] relative">
                <MapComponent plantations={plantations} />
              </div>
            </div>

            {/* ── Filters & Search ── */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search by tree type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all"
                >
                  <option value="date">Latest</option>
                  <option value="credits">Highest Credits</option>
                  <option value="area">Largest Area</option>
                </select>
              </div>
            </div>

            {/* ── Plantations List ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Your Plantations</h2>
                <span className="bg-white px-4 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  {filteredPlantations.length} results
                </span>
              </div>

              {error && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-medium">{error}</div>}
              {successMessage && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-sm font-medium">{successMessage}</div>}

              <div className="grid sm:grid-cols-2 gap-4">
                {filteredPlantations.length === 0 ? (
                  <div className="col-span-full py-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                    <span className="text-4xl mb-2">🌱</span>
                    <p className="font-medium">No plantations found.</p>
                  </div>
                ) : (
                  filteredPlantations.map(p => (
                    <div key={p.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                      <div className="p-6 pb-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl">
                              {p.tree_type && p.tree_type.toLowerCase().includes('mango') ? '🥭' : '🌳'}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900">{p.tree_type}</h3>
                              <p className="text-xs text-slate-400 font-mono">
                                {p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}
                              </p>
                            </div>
                          </div>
                          <span className={`
                            text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full
                            ${p.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}
                          `}>
                            {p.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-4 mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Area</p>
                            <p className="text-sm font-bold text-slate-700">{p.area || 0}<span className="text-[10px] text-slate-400"> ha</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">NDVI</p>
                            <p className="text-sm font-bold text-emerald-600">{(p.ndvi || 0).toFixed(3)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Credits</p>
                            <p className="text-sm font-bold text-slate-700">{(p.credits || 0).toFixed(1)}</p>
                          </div>
                        </div>

                        {/* Document Status */}
                        <div className="flex gap-2">
                          <div className="flex-1 text-center py-2 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-600 font-bold">
                              {p.land_document ? '✓ Land Doc' : '○ Land Doc'}
                            </p>
                          </div>
                          <div className="flex-1 text-center py-2 bg-purple-50 rounded-lg">
                            <p className="text-xs text-purple-600 font-bold">
                              {p.farm_image ? '✓ Farm Image' : '○ Farm Image'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Upload Section */}
                      <button
                        onClick={() => setExpandedPlantation(expandedPlantation === p.id ? null : p.id)}
                        className="w-full px-6 py-3 border-t border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        {expandedPlantation === p.id ? '△' : '▽'} Upload Documents
                      </button>

                      {expandedPlantation === p.id && (
                        <div className="px-6 py-4 bg-gradient-to-b from-slate-50 to-white border-t border-slate-100 space-y-4">
                          {/* Land Document Upload */}
                          <div>
                            <p className="text-xs font-bold text-slate-600 mb-2 uppercase">📋 Land Document</p>
                            <label className="block relative cursor-pointer">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                disabled={uploadingPlantationId === p.id}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadDocument(p.id, e.target.files[0], 'land_document');
                                  }
                                }}
                                className="sr-only"
                              />
                              <div className={`
                                border-2 border-dashed rounded-lg p-3 text-center
                                ${uploadingPlantationId === p.id ? 'border-slate-300 bg-slate-100' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'}
                                transition-colors
                              `}>
                                <p className="text-xs text-slate-600 font-semibold">
                                  {uploadingPlantationId === p.id ? '⏳ Uploading...' : '📤 Click to upload or drag'}
                                </p>
                                {p.land_document && !uploadingPlantationId && (
                                  <p className="text-[11px] text-green-600 font-bold mt-1">✓ {p.land_document_name || 'Document uploaded'}</p>
                                )}
                              </div>
                            </label>
                          </div>

                          {/* Farm Image Upload */}
                          <div>
                            <p className="text-xs font-bold text-slate-600 mb-2 uppercase">🖼️ Farm Image</p>
                            <label className="block relative cursor-pointer">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                disabled={uploadingPlantationId === p.id}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadDocument(p.id, e.target.files[0], 'farm_image');
                                  }
                                }}
                                className="sr-only"
                              />
                              <div className={`
                                border-2 border-dashed rounded-lg p-3 text-center
                                ${uploadingPlantationId === p.id ? 'border-slate-300 bg-slate-100' : 'border-purple-300 bg-purple-50 hover:bg-purple-100'}
                                transition-colors
                              `}>
                                <p className="text-xs text-slate-600 font-semibold">
                                  {uploadingPlantationId === p.id ? '⏳ Uploading...' : '📤 Click to upload or drag'}
                                </p>
                                {p.farm_image && !uploadingPlantationId && (
                                  <p className="text-[11px] text-green-600 font-bold mt-1">✓ {p.farm_image_name || 'Image uploaded'}</p>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
