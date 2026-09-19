'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Leaf,
  LogOut,
  ShieldCheck,
  PlusCircle,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Activity,
  Globe,
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import RealLeafletMapContainer from '@/components/RealLeafletMapContainer';
import { PlantationPlot } from '@/components/InteractiveMap';
import NDVIGuideModal from '@/components/NDVIGuideModal';
import TransactionLedger from '@/components/TransactionLedger';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  role: 'ADMIN' | 'FARMER' | 'BUSINESS' | 'USER' | 'COMPANY' | 'AUDITOR';
  carbonCredits: number;
  createdAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [plantations, setPlantations] = useState<PlantationPlot[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [minNdviFilter, setMinNdviFilter] = useState<number>(0);

  const [showNdviModal, setShowNdviModal] = useState(false);
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);
  const [selectedPlantationToBuy, setSelectedPlantationToBuy] = useState<PlantationPlot | null>(null);
  const [buyCreditsCount, setBuyCreditsCount] = useState<number>(10);

  const [newPlotTitle, setNewPlotTitle] = useState('');
  const [newPlotDescription, setNewPlotDescription] = useState('');
  const [newPlotLocation, setNewPlotLocation] = useState('');
  const [newPlotLat, setNewPlotLat] = useState('');
  const [newPlotLng, setNewPlotLng] = useState('');
  const [newPlotArea, setNewPlotArea] = useState('');
  const [newPlotSpecies, setNewPlotSpecies] = useState('');
  const [newPlotLandParcelId, setNewPlotLandParcelId] = useState('');
  const [newPlotDocumentUrl, setNewPlotDocumentUrl] = useState('');

  const [adminNdviScore, setAdminNdviScore] = useState<number>(0.82);

  const fetchData = async () => {
    setFetching(true);
    try {
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();

      if (!userRes.ok || !userData.authenticated) {
        router.replace('/login');
        return;
      }

      setUser(userData.user);

      const plantationsRes = await fetch('/api/plantations');
      if (plantationsRes.ok) {
        const plantationsData = await plantationsRes.json();
        setPlantations(plantationsData.plantations || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      router.replace('/login');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  };

  const handleCreatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/plantations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPlotTitle,
          description: newPlotDescription,
          locationName: newPlotLocation,
          latitude: newPlotLat,
          longitude: newPlotLng,
          areaHectares: newPlotArea,
          treeSpecies: newPlotSpecies,
          landParcelId: newPlotLandParcelId,
          documentUrl: newPlotDocumentUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message });
      setShowAddPlotModal(false);
      setNewPlotTitle('');
      setNewPlotLocation('');
      setNewPlotLat('');
      setNewPlotLng('');
      setNewPlotArea('');
      setNewPlotSpecies('');
      setNewPlotLandParcelId('');
      setNewPlotDocumentUrl('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to create plantation plot.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPlot = async (plantationId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantationId,
          action,
          ndviScore: action === 'APPROVE' ? adminNdviScore : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Verification workflow failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurchaseCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlantationToBuy) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/business/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantationId: selectedPlantationToBuy.id,
          creditsCount: buyCreditsCount,
          pricePerCredit: 18.5,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message });
      setSelectedPlantationToBuy(null);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Purchase transaction failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isFarmer = user?.role === 'FARMER' || user?.role === 'USER';
  const isBusiness = user?.role === 'BUSINESS' || user?.role === 'COMPANY';

  const filteredPlantations = plantations.filter((plot) => {
    const matchesSearch =
      searchQuery === '' ||
      plot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plot.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plot.treeSpecies.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plot.landParcelId && plot.landParcelId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesNdvi = plot.ndviScore >= minNdviFilter;
    return matchesSearch && matchesNdvi;
  });

  const pendingPlantations = filteredPlantations.filter((p) => p.status === 'PENDING');
  const verifiedPlantations = filteredPlantations.filter((p) => p.status === 'VERIFIED');

  const userPlantations = plantations.filter((p) => {
    if (!user) return false;
    if (p.farmerId && p.farmerId === user.id) return true;
    if (p.farmer?.email && user.email && p.farmer.email.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  });

  const userTotalHectares = userPlantations.reduce((sum, p) => sum + (p.areaHectares || 0), 0);
  const userVerifiedPlots = userPlantations.filter((p) => p.status === 'VERIFIED').length;
  const userPendingPlots = userPlantations.filter((p) => p.status === 'PENDING').length;
  const userEarnedCredits = userPlantations
    .filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + (p.creditsIssued || 0), 0);

  const creditBalance = isFarmer ? userEarnedCredits : user?.carbonCredits || 0;

  return (
    <div className="portal-world-root portal-dashboard-root min-h-screen hero-root text-black dark:text-slate-100 flex flex-col relative font-sans">
      {fetching && <div className="portal-load-bar absolute top-0 left-0 right-0 z-50" />}

      <header className="portal-header sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <span className="portal-brand-mark" />
            <span className="portal-brand-name">
              Carbon<span>Credit</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link href="/farmer" className="btn-download py-2 text-[10px] sm:text-xs font-bold">
              <PlusCircle className="w-3.5 h-3.5 text-[#3b69fc]" />
              <span>Plot Portal</span>
            </Link>

            <Link href="/map" className="btn-download py-2 text-[10px] sm:text-xs font-bold">
              <Globe className="w-3.5 h-3.5 text-[#3b69fc]" />
              <span>Satellite Map</span>
            </Link>

            <button
              onClick={() => setShowNdviModal(true)}
              className="btn-download py-2 text-[10px] sm:text-xs font-bold hidden sm:inline-flex"
            >
              <Activity className="w-3.5 h-3.5 text-[#3b69fc]" />
              <span>NDVI Guide</span>
            </button>

            {user && (
              <div className="hidden md:flex items-center gap-2 text-[10px] sm:text-xs font-bold text-black dark:text-white">
                <UserCheck className="w-3.5 h-3.5 text-[#3b69fc]" />
                <span>{user.name}</span>
                <span className="opacity-40">·</span>
                <span className="font-mono text-[#3b69fc] tracking-wide">{user.role}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="portal-logout px-4 py-2 text-[10px] sm:text-xs font-bold flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 sm:py-10 flex-1 space-y-10 sm:space-y-12">
        {message && (
          <div
            className={`portal-alert p-4 border-l-2 text-xs flex items-center justify-between ${
              message.type === 'success'
                ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300'
                : 'border-red-400/70 bg-red-500/10 text-red-900 dark:text-red-300'
            }`}
          >
            <div className="flex items-center gap-3 font-semibold">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="font-bold ml-4 opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Welcome — open composition, not a card stack */}
        <section className="portal-welcome">
          <p className="portal-kicker">Account portal</p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-black dark:text-white leading-[1.05]">
                Welcome, <span className="text-[#3b69fc]">{user?.name || 'Carbon Trader'}</span>
              </h1>
              <p className="text-sm text-slate-900 dark:text-slate-300 font-medium opacity-80">
                {user?.email}
                {user?.companyName ? ` · ${user.companyName}` : ' · Carbon Credit Exchange'}
              </p>
            </div>

            <div className="portal-balance shrink-0">
              <span className="portal-metric-label">
                {isBusiness ? 'Purchased offsets' : 'Earned carbon credits'}
              </span>
              <div className="portal-balance-value">
                <span className="font-mono">
                  {creditBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="portal-unit">tCO₂e</span>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics as a single editorial strip */}
        <section className="portal-metrics" aria-label="Account metrics">
          <div className="portal-metric">
            <span className="portal-metric-label">Reforested area</span>
            <span className="portal-metric-value font-mono">
              {userTotalHectares} <span className="portal-unit">ha</span>
            </span>
          </div>
          <div className="portal-metric">
            <span className="portal-metric-label">Verified plots</span>
            <span className="portal-metric-value font-mono text-emerald-700 dark:text-emerald-400">
              {userVerifiedPlots}
            </span>
          </div>
          <div className="portal-metric">
            <span className="portal-metric-label">Earned credits</span>
            <span className="portal-metric-value font-mono text-[#3b69fc]">
              {userEarnedCredits} <span className="portal-unit">tCO₂e</span>
            </span>
          </div>
          <div className="portal-metric">
            <span className="portal-metric-label">
              {isAdmin ? 'Pending approvals' : 'Your submissions'}
            </span>
            <span className="portal-metric-value font-mono text-amber-700 dark:text-amber-400">
              {isAdmin ? pendingPlantations.length : userPendingPlots}
            </span>
          </div>
        </section>

        {/* Search & filter */}
        <section className="clamphook-card p-4 sm:p-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
            <Search className="w-4 h-4 text-[#3b69fc] absolute left-0 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, parcel ID, location, or species…"
              className="w-full pl-7 pr-2 py-2.5 input-field text-xs font-semibold"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-black dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-[#3b69fc]" />
              <span>Min NDVI</span>
            </span>
            <select
              value={minNdviFilter}
              onChange={(e) => setMinNdviFilter(parseFloat(e.target.value))}
              className="px-3 py-2 input-field font-mono text-xs font-semibold min-w-[180px]"
            >
              <option value="0">All scores</option>
              <option value="0.5">NDVI &gt; 0.50</option>
              <option value="0.7">NDVI &gt; 0.70</option>
              <option value="0.8">NDVI &gt; 0.80</option>
            </select>
          </div>
        </section>

        {isAdmin && (
          <section className="space-y-6">
            <div className="portal-section-head">
              <h2 className="text-xl sm:text-2xl font-extrabold text-black dark:text-white flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Land ownership audit</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-400 mt-1 font-medium opacity-75">
                Inspect parcel IDs, verify ownership documents, and issue audited credits
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {pendingPlantations.map((plot) => (
                <div key={plot.id} className="clamphook-card p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-gray-800 pb-3">
                    <h3 className="text-lg font-bold text-black dark:text-white">{plot.title}</h3>
                    <span className="text-xs text-slate-900 dark:text-slate-300 font-medium">
                      Farmer:{' '}
                      <strong className="text-[#3b69fc] font-semibold">{plot.farmer?.name}</strong>{' '}
                      ({plot.farmer?.email})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="portal-metric-label block">Land parcel ID</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm font-sans">
                        {plot.landParcelId || 'Lalpurja pending'}
                      </span>
                    </div>
                    <div>
                      <span className="portal-metric-label block">Location</span>
                      <span className="font-sans font-semibold text-black dark:text-white">{plot.locationName}</span>
                    </div>
                    <div>
                      <span className="portal-metric-label block">Coordinates</span>
                      <span className="font-semibold text-black dark:text-white">
                        {plot.latitude.toFixed(4)}°, {plot.longitude.toFixed(4)}°
                      </span>
                    </div>
                    <div>
                      <span className="portal-metric-label block">Area / trees</span>
                      <span className="font-semibold text-black dark:text-white">
                        {plot.areaHectares} ha · {plot.treeCount} trees
                      </span>
                    </div>
                  </div>

                  {plot.documentUrl && (
                    <div className="p-3.5 bg-gray-100 dark:bg-[#07122a] border border-slate-300 dark:border-gray-800 flex items-center justify-between text-xs font-semibold gap-3">
                      <span className="text-black dark:text-slate-300">Land title certificate</span>
                      <a
                        href={plot.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#3b69fc] hover:underline flex items-center gap-1.5 shrink-0"
                      >
                        <span>View document</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 bg-gray-100 dark:bg-[#07122a] p-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-black dark:text-slate-300">
                        Satellite NDVI score
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="0.99"
                        value={adminNdviScore}
                        onChange={(e) => setAdminNdviScore(parseFloat(e.target.value))}
                        className="w-24 px-3 py-1.5 input-field font-mono text-xs text-center font-semibold"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleVerifyPlot(plot.id, 'APPROVE')}
                        disabled={actionLoading}
                        className="btn-enroll py-2 text-xs font-bold"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & issue credits</span>
                      </button>

                      <button
                        onClick={() => handleVerifyPlot(plot.id, 'REJECT')}
                        disabled={actionLoading}
                        className="portal-danger px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingPlantations.length === 0 && (
                <div className="clamphook-card p-10 sm:p-12 text-center text-sm">
                  <CheckCircle2 className="w-9 h-9 text-emerald-700 dark:text-emerald-400 mx-auto mb-3" />
                  <p className="font-semibold text-black dark:text-white">
                    All submitted parcels have been verified.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {isFarmer && (
          <section className="space-y-6">
            <div className="portal-section-head flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-black dark:text-white flex items-center gap-2.5">
                  <Leaf className="w-5 h-5 text-[#3b69fc] shrink-0" />
                  <span>Your plantations</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-400 mt-1 font-medium opacity-75">
                  Register land parcels and track satellite verification
                </p>
              </div>

              <button onClick={() => setShowAddPlotModal(true)} className="btn-enroll text-xs font-bold shrink-0">
                <PlusCircle className="w-4 h-4" />
                <span>Register plantation</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {userPlantations.map((plot) => (
                <div key={plot.id} className="clamphook-card p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-lg text-black dark:text-white">{plot.title}</h3>
                      {plot.status === 'VERIFIED' && (
                        <a
                          href={`/api/certificates/${plot.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#3b69fc] font-semibold hover:underline shrink-0"
                        >
                          Certificate
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-slate-900 dark:text-slate-300 leading-relaxed font-medium opacity-85">
                      {plot.description}
                    </p>

                    <div className="p-3 bg-gray-100 dark:bg-[#07122a] border border-slate-300 dark:border-gray-800 font-mono text-xs">
                      <span className="portal-metric-label block">Land title parcel ID</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        {plot.landParcelId || 'Title registration pending'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-3 border-t border-slate-300 dark:border-gray-800">
                    <div>
                      <span className="portal-metric-label block">Location</span>
                      <span className="font-sans font-semibold text-black dark:text-white">{plot.locationName}</span>
                    </div>
                    <div>
                      <span className="portal-metric-label block">Area</span>
                      <span className="font-semibold text-black dark:text-white">{plot.areaHectares} ha</span>
                    </div>
                    <div>
                      <span className="portal-metric-label block">Species</span>
                      <span className="text-[#3b69fc] font-sans font-semibold">{plot.treeSpecies}</span>
                    </div>
                    <div>
                      <span className="portal-metric-label block">Credits earned</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                        {plot.creditsIssued} tCO₂e
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {userPlantations.length === 0 && (
                <div className="col-span-full clamphook-card p-10 sm:p-12 text-center text-sm">
                  <Leaf className="w-9 h-9 text-[#3b69fc]/50 mx-auto mb-3" />
                  <p className="font-semibold text-black dark:text-white">
                    No plantations yet. Register your first plot to get started.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {isBusiness && (
          <section className="space-y-6">
            <div className="portal-section-head">
              <h2 className="text-xl sm:text-2xl font-extrabold text-black dark:text-white flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-[#3b69fc] shrink-0" />
                <span>Credit marketplace</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-400 mt-1 font-medium opacity-75">
                Browse verified offsets and retire corporate footprint
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {verifiedPlantations.map((plot) => (
                <div key={plot.id} className="clamphook-card p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      NDVI {plot.ndviScore.toFixed(2)}
                    </span>

                    <h3 className="font-bold text-lg text-black dark:text-white">{plot.title}</h3>
                    <p className="text-xs text-slate-900 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium opacity-85">
                      {plot.description}
                    </p>
                    {plot.landParcelId && (
                      <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 block font-semibold">
                        Parcel {plot.landParcelId}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-300 dark:border-gray-800 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-black dark:text-slate-400 font-medium">Location</span>
                      <span className="font-semibold text-black dark:text-white text-right">{plot.locationName}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-black dark:text-slate-400 font-medium">Available</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                        {plot.creditsIssued} tCO₂e
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-black dark:text-slate-400 font-medium">Spot price</span>
                      <span className="font-mono font-semibold text-black dark:text-white">$18.50 / credit</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPlantationToBuy(plot);
                        setBuyCreditsCount(Math.min(10, plot.creditsIssued));
                      }}
                      disabled={plot.creditsIssued <= 0}
                      className="w-full btn-enroll py-2.5 text-xs justify-center font-bold disabled:opacity-50"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{plot.creditsIssued > 0 ? 'Purchase offsets' : 'Sold out'}</span>
                    </button>
                  </div>
                </div>
              ))}

              {verifiedPlantations.length === 0 && (
                <div className="col-span-full clamphook-card p-10 sm:p-12 text-center text-sm">
                  <p className="font-semibold text-black dark:text-white">
                    No verified listings match your filters.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <TransactionLedger />
            </div>
          </section>
        )}

        <section className="clamphook-card p-5 sm:p-6 space-y-4">
          <div className="portal-section-head">
            <h2 className="text-xl sm:text-2xl font-extrabold text-black dark:text-white flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-[#3b69fc] shrink-0" />
              <span>Satellite map</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-400 mt-1 font-medium opacity-75">
              Live plantation footprints across verified land parcels
            </p>
          </div>
          <RealLeafletMapContainer plantations={filteredPlantations} />
        </section>
      </main>

      {showAddPlotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full clamphook-card auth-modal-stage p-6 sm:p-8 relative">
            <h3 className="text-xl font-extrabold text-black dark:text-white mb-1">Register plantation</h3>
            <p className="text-xs text-black dark:text-slate-400 mb-6 font-medium opacity-80">
              Enter land title parcel number and GPS coordinates for verification
            </p>

            <form onSubmit={handleCreatePlot} className="space-y-4 text-xs">
              <div>
                <label className="block text-black dark:text-slate-300 mb-1 font-semibold">Plot title</label>
                <input
                  type="text"
                  required
                  value={newPlotTitle}
                  onChange={(e) => setNewPlotTitle(e.target.value)}
                  className="w-full input-field font-semibold"
                />
              </div>

              <div>
                <label className="block text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                  Land title / Lalpurja parcel ID *
                </label>
                <input
                  type="text"
                  required
                  value={newPlotLandParcelId}
                  onChange={(e) => setNewPlotLandParcelId(e.target.value)}
                  className="w-full input-field font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-black dark:text-slate-300 mb-1 font-semibold">
                  Land title certificate URL
                </label>
                <input
                  type="url"
                  value={newPlotDocumentUrl}
                  onChange={(e) => setNewPlotDocumentUrl(e.target.value)}
                  className="w-full input-field font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-black dark:text-slate-300 mb-1 font-semibold">Location</label>
                  <input
                    type="text"
                    required
                    value={newPlotLocation}
                    onChange={(e) => setNewPlotLocation(e.target.value)}
                    className="w-full input-field font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-black dark:text-slate-300 mb-1 font-semibold">Area (ha)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    value={newPlotArea}
                    onChange={(e) => setNewPlotArea(e.target.value)}
                    className="w-full input-field font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-black dark:text-slate-300 mb-1 font-semibold">Latitude</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={newPlotLat}
                    onChange={(e) => setNewPlotLat(e.target.value)}
                    className="w-full input-field font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-black dark:text-slate-300 mb-1 font-semibold">Longitude</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={newPlotLng}
                    onChange={(e) => setNewPlotLng(e.target.value)}
                    className="w-full input-field font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-black dark:text-slate-300 mb-1 font-semibold">Tree species</label>
                <input
                  type="text"
                  required
                  value={newPlotSpecies}
                  onChange={(e) => setNewPlotSpecies(e.target.value)}
                  className="w-full input-field font-semibold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddPlotModal(false)} className="btn-download py-2 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-enroll py-2 text-xs font-bold">
                  {actionLoading ? 'Registering…' : 'Submit plot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPlantationToBuy && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full clamphook-card auth-modal-stage p-6 sm:p-8 relative text-xs">
            <h3 className="text-xl font-extrabold text-black dark:text-white mb-1">Purchase credits</h3>
            <p className="text-black dark:text-slate-400 mb-4 font-medium opacity-80">{selectedPlantationToBuy.title}</p>

            <form onSubmit={handlePurchaseCredits} className="space-y-4">
              <div>
                <label className="block text-black dark:text-slate-300 mb-1 font-semibold">
                  Credits amount (tCO₂e)
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedPlantationToBuy.creditsIssued}
                  value={buyCreditsCount}
                  onChange={(e) => setBuyCreditsCount(parseFloat(e.target.value) || 1)}
                  className="w-full input-field font-mono text-sm font-semibold"
                />
              </div>

              <div className="p-4 bg-gray-100 dark:bg-[#07122a] border border-slate-300 dark:border-gray-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-black dark:text-slate-400 font-medium">Unit price</span>
                  <span className="font-mono font-semibold text-black dark:text-white">$18.50 / credit</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-white">Total</span>
                  <span className="text-[#3b69fc] font-mono">${(buyCreditsCount * 18.5).toFixed(2)} USD</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlantationToBuy(null)}
                  className="btn-download py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-enroll py-2 text-xs font-bold">
                  {actionLoading ? 'Processing…' : 'Confirm purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <NDVIGuideModal isOpen={showNdviModal} onClose={() => setShowNdviModal(false)} />
    </div>
  );
}
