'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
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
  AlertTriangle,
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

type PlotRiskInfo = {
  scamRiskScore: number;
  gate: 'allow' | 'warn' | 'block';
  isSuspicious: boolean;
  actualAddress?: string;
  flags: string[];
  recommendation: string;
};

const USER_CACHE_KEY = 'cc_dashboard_user';
const PLOTS_CACHE_KEY = 'cc_dashboard_plots';

function readJsonCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [plantations, setPlantations] = useState<PlantationPlot[]>([]);
  const [listReady, setListReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [minNdviFilter, setMinNdviFilter] = useState<number>(0);

  const [showNdviModal, setShowNdviModal] = useState(false);
  const [selectedPlantationToBuy, setSelectedPlantationToBuy] = useState<PlantationPlot | null>(null);
  const [buyCreditsCount, setBuyCreditsCount] = useState<number>(10);
  const [remeasuringId, setRemeasuringId] = useState<string | null>(null);
  const [plotRisks, setPlotRisks] = useState<Record<string, PlotRiskInfo>>({});
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();

      if (!userRes.ok || !userData.authenticated) {
        try {
          sessionStorage.removeItem(USER_CACHE_KEY);
          sessionStorage.removeItem(PLOTS_CACHE_KEY);
        } catch {
          // ignore
        }
        router.replace('/login');
        return;
      }

      setUser(userData.user);
      try {
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData.user));
      } catch {
        // ignore
      }

      const plantationsRes = await fetch('/api/plantations');
      if (plantationsRes.ok) {
        const plantationsData = await plantationsRes.json();
        const plots = plantationsData.plantations || [];
        setPlantations(plots);
        try {
          sessionStorage.setItem(PLOTS_CACHE_KEY, JSON.stringify(plots));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      router.replace('/login');
    } finally {
      setListReady(true);
    }
  };

  useLayoutEffect(() => {
    const cachedUser = readJsonCache<UserProfile>(USER_CACHE_KEY);
    if (cachedUser) setUser(cachedUser);
    const cachedPlots = readJsonCache<PlantationPlot[]>(PLOTS_CACHE_KEY);
    if (cachedPlots) {
      setPlantations(cachedPlots);
      setListReady(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [router]);

  // Risk flags only for business marketplace
  useEffect(() => {
    if (!user || (user.role !== 'BUSINESS' && user.role !== 'COMPANY')) return;
    const verified = plantations.filter((p) => p.status === 'VERIFIED');
    if (verified.length === 0) {
      setPlotRisks({});
      return;
    }
    const ids = verified.map((p) => p.id).join(',');
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/plantations/risk?ids=${encodeURIComponent(ids)}`);
        const data = await res.json();
        if (!cancelled && res.ok) setPlotRisks(data.risks || {});
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, plantations]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      sessionStorage.removeItem(USER_CACHE_KEY);
      sessionStorage.removeItem(PLOTS_CACHE_KEY);
    } catch {
      // ignore
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    } catch {
      router.replace('/login');
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message + (data.formula ? ` (${data.formula})` : '') });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Verification workflow failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemeasureNdvi = async (plantationId: string) => {
    setRemeasuringId(plantationId);
    setMessage(null);
    try {
      const res = await fetch('/api/ndvi/measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const warn = data.warnings?.length ? ` Warnings: ${data.warnings.join(' ')}` : '';
      setMessage({
        type: 'success',
        text: `NDVI re-measured: ${data.observation?.meanNdvi ?? data.plantationNdviScore}.${warn}`,
      });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'NDVI re-measure failed.' });
    } finally {
      setRemeasuringId(null);
    }
  };

  const handlePurchaseCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlantationToBuy) return;

    const risk = plotRisks[selectedPlantationToBuy.id];
    if (risk?.gate === 'block') {
      setMessage({
        type: 'error',
        text: `Purchase blocked: high-risk plot (${risk.scamRiskScore}%). ${risk.flags[0] || risk.recommendation}`,
      });
      return;
    }

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
          acknowledgeWarning: risk?.gate === 'warn' ? acknowledgeRisk : false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresAcknowledgement) {
          setMessage({
            type: 'error',
            text: data.error || 'Acknowledge the risk warning to continue.',
          });
          throw new Error(data.error);
        }
        throw new Error(data.error);
      }

      setMessage({ type: 'success', text: data.message });
      setSelectedPlantationToBuy(null);
      setAcknowledgeRisk(false);
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
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      plot.title.toLowerCase().includes(q) ||
      plot.locationName.toLowerCase().includes(q) ||
      plot.treeSpecies.toLowerCase().includes(q) ||
      (plot.landParcelId && plot.landParcelId.toLowerCase().includes(q)) ||
      (plot.farmer?.name && plot.farmer.name.toLowerCase().includes(q)) ||
      (plot.farmer?.email && plot.farmer.email.toLowerCase().includes(q));
    const matchesNdvi = isBusiness ? plot.ndviScore >= minNdviFilter : true;
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
  const adminVerifiedCount = plantations.filter((p) => p.status === 'VERIFIED').length;
  const adminTotalArea = plantations.reduce((sum, p) => sum + (p.areaHectares || 0), 0);
  const marketplaceCredits = verifiedPlantations.reduce((sum, p) => sum + (p.creditsIssued || 0), 0);
  const mapPlantations = isFarmer ? userPlantations : isAdmin ? filteredPlantations : [];

  return (
    <div className="portal-world-root portal-dashboard-root min-h-screen flex flex-col relative font-sans text-neutral-200">
      <header className="portal-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="portal-brand-mark" />
            <span className="text-white text-base font-semibold tracking-tight">
              CarbonCredit
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isFarmer && (
              <Link href="/farmer" className="btn-download py-1.5 px-3 text-xs font-medium rounded-lg">
                <PlusCircle className="w-3.5 h-3.5 text-neutral-400" />
                <span>Register plot</span>
              </Link>
            )}

            {(isFarmer || isAdmin) && (
              <Link href="/map" className="btn-download py-1.5 px-3 text-xs font-medium rounded-lg">
                <Globe className="w-3.5 h-3.5 text-neutral-400" />
                <span>{isAdmin ? 'Audit map' : 'My map'}</span>
              </Link>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowNdviModal(true)}
                className="btn-download py-1.5 px-3 text-xs font-medium rounded-lg hidden sm:inline-flex"
              >
                <Activity className="w-3.5 h-3.5 text-neutral-400" />
                <span>NDVI guide</span>
              </button>
            )}

            {user && (
              <div className="hidden md:flex items-center gap-2 text-xs text-neutral-300">
                <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-medium text-white">{user.name}</span>
                <span className="text-neutral-600">·</span>
                <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                  {isAdmin ? 'Admin' : isBusiness ? 'Enterprise' : 'Landowner'}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="portal-logout px-3 py-1.5 text-xs font-medium flex items-center gap-2 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5 text-neutral-400" />
              <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 sm:py-10 flex-1 space-y-12">
        {message && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              message.type === 'success'
                ? 'border-white/10 bg-white/[0.04] text-neutral-200'
                : 'border-red-500/20 bg-red-500/[0.08] text-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-neutral-300 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-neutral-400 hover:text-white ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Hero Section matching Transparency Protocol */}
        <section className="portal-welcome pt-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
            <span className="text-xs text-neutral-400 font-medium tracking-wide">
              Verifiable Climate Infrastructure
            </span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="space-y-3 max-w-3xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-white tracking-tight leading-tight">
                Infrastructure that makes <br className="hidden sm:inline" />sustainability measurable.
              </h1>
              <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-2xl">
                We turn climate promises into verifiable proof backed by law, real-time monitoring and scientific validation.
              </p>
            </div>

            <div className="shrink-0 bg-[#101412]/80 border border-white/[0.08] rounded-xl p-5 sm:p-6 min-w-[260px]">
              <span className="text-xs text-neutral-400 font-medium block mb-1">
                {isBusiness ? 'Your purchased offsets' : isAdmin ? 'Total platform volume' : 'Your earned credits'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold font-mono text-white tracking-tight">
                  {(isAdmin
                    ? plantations.reduce((s, p) => s + (p.creditsIssued || 0), 0)
                    : creditBalance
                  ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-neutral-400 font-normal">tCO₂e</span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] text-neutral-400 font-normal flex items-center justify-between">
                <span>{user?.name}</span>
                <span className="font-mono text-[10px] uppercase text-neutral-500">
                  {isAdmin ? 'Admin' : isBusiness ? 'Buyer' : 'Landowner'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Pillar Showcase Cards matching Transparency Protocol reference */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Card 1: Legal validation */}
          <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#101412]/80 overflow-hidden hover:border-white/20 transition duration-300">
            <div className="p-5 border-b border-white/[0.06] bg-black/40 font-mono text-[11px] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-[10px] tracking-wider uppercase">REGISTRY ID</span>
                <span className="text-neutral-300 font-semibold">NP-LAL-2026-PLOT-01</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-[10px] tracking-wider uppercase">LEGAL STATUS</span>
                <span className="text-emerald-400/90 font-medium">Verified &amp; Binding</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-[10px] tracking-wider uppercase">JURISDICTION</span>
                <span className="text-neutral-300">Federal Democratic Republic of Nepal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-[10px] tracking-wider uppercase">VALIDITY</span>
                <span className="text-neutral-300">20 years</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] space-y-1.5 text-[10px]">
                <span className="text-neutral-500 block uppercase tracking-wider">CRYPTOGRAPHIC ATTESTATIONS</span>
                <div className="flex justify-between text-neutral-400">
                  <span>National Land Survey <span className="text-neutral-600">AUTHORITY</span></span>
                  <span className="text-neutral-500">0x82...F2</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Transparency Protocol <span className="text-neutral-600">PROTOCOL</span></span>
                  <span className="text-neutral-500">0x4F...D2</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Landowner Signatory <span className="text-neutral-600">SIGNATORY</span></span>
                  <span className="text-neutral-500">0x1A...B4</span>
                </div>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
              <h3 className="text-base font-medium text-white">Legal validation</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                Each project begins with official registration through verified land registry records and Lalpurja title deeds.
              </p>
            </div>
          </div>

          {/* Card 2: Continuous monitoring */}
          <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#101412]/80 overflow-hidden hover:border-white/20 transition duration-300">
            <div className="p-5 border-b border-white/[0.06] bg-black/40 font-mono text-[11px] space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] text-neutral-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE FEED</span>
                </div>
                <span className="text-neutral-500 text-[10px]">SENTINEL-2 L2A</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[10px] text-neutral-500 block uppercase tracking-wider">SATELLITE NDVI</span>
                  <span className="text-sm font-semibold text-white">0.82 <span className="text-[10px] font-normal text-emerald-400/90">HIGH</span></span>
                </div>
                <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[10px] text-neutral-500 block uppercase tracking-wider">IOT VARIANCE</span>
                  <span className="text-sm font-semibold text-white">±0.4% <span className="text-[10px] font-normal text-neutral-400">STABLE</span></span>
                </div>
              </div>
              <div className="p-2 rounded bg-black/60 border border-white/[0.04] space-y-1 text-[10px] text-neutral-400 font-mono">
                <div className="text-neutral-500">&gt; COMPUTING SPATIAL VARIANCE (±0.4%)...</div>
                <div className="text-neutral-400">&gt; CALCULATING NDVI COVERAGE...</div>
                <div className="text-neutral-300">&gt; SIGNING OBSERVATION PROOF 0X4F...D2</div>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
              <h3 className="text-base font-medium text-white">Continuous monitoring</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                IoT sensors, satellite data and certified field audits continuously measure and confirm the condition of each forest area.
              </p>
            </div>
          </div>

          {/* Card 3: Digital issuance */}
          <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#101412]/80 overflow-hidden hover:border-white/20 transition duration-300">
            <div className="p-5 border-b border-white/[0.06] bg-black/40 font-mono text-[11px] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-[10px] tracking-wider uppercase">DIGITAL ASSET</span>
                <span className="text-neutral-300 font-semibold">TP_CREDIT_#492</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-[10px] tracking-wider uppercase">STATUS</span>
                <span className="text-neutral-300 font-medium">MINTED</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[9px] text-neutral-500 block uppercase">AREA</span>
                  <span className="text-xs font-semibold text-white">42.5ha</span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[9px] text-neutral-500 block uppercase">VOLUME</span>
                  <span className="text-xs font-semibold text-white">1,240t</span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[9px] text-neutral-500 block uppercase">VINTAGE</span>
                  <span className="text-xs font-semibold text-white">2026</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] space-y-1.5 text-[10px]">
                <span className="text-neutral-500 block uppercase tracking-wider">IDENTITIES</span>
                <div className="flex justify-between text-neutral-400">
                  <span>Issuer DID</span>
                  <span className="text-neutral-500">did:key:z6Mk...vAp2</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Owner DID</span>
                  <span className="text-neutral-500">did:key:z6Mk...r9X1</span>
                </div>
                <div className="flex justify-between text-neutral-400 pt-0.5">
                  <span>ASSET_MINTED</span>
                  <span className="text-neutral-500">0x72a...c1</span>
                </div>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
              <h3 className="text-base font-medium text-white">Digital issuance</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                Once verified, carbon credits are issued digitally as secure and traceable assets with timestamped events, identities and public data.
              </p>
            </div>
          </div>
        </section>

        {/* Who it's for section matching screenshot */}
        <section className="pt-6 border-t border-white/[0.08]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
            <span className="text-xs text-neutral-400 font-medium tracking-wide">Who it's for</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-normal text-white tracking-tight">
              Built for actors who need proof — not promises
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-normal max-w-xl">
              {isAdmin && 'Official title review, satellite observation recalculation, and digital token issuance.'}
              {isBusiness && 'Browse verified Nepal forest offsets with cryptographic provenance and risk auditing.'}
              {isFarmer && 'Manage your enrolled plots, verify title deeds, and track satellite credit issuance.'}
            </p>
          </div>
        </section>

        {/* Clean monochrome metrics grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="Platform metrics">
          {isFarmer && (
            <>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Your registered land</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {userTotalHectares} <span className="text-xs text-neutral-400 font-normal">ha</span>
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Verified parcels</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {userVerifiedPlots}
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Issued credits</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {userEarnedCredits} <span className="text-xs text-neutral-400 font-normal">tCO₂e</span>
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Pending review</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {userPendingPlots}
                </span>
              </div>
            </>
          )}

          {isAdmin && (
            <>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Pending audits</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {pendingPlantations.length}
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Verified plots</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {adminVerifiedCount}
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Total land monitored</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {adminTotalArea.toFixed(1)} <span className="text-xs text-neutral-400 font-normal">ha</span>
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">All submissions</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {plantations.length}
                </span>
              </div>
            </>
          )}

          {isBusiness && (
            <>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Purchased offsets</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {creditBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  <span className="text-xs text-neutral-400 font-normal">tCO₂e</span>
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Active listings</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {verifiedPlantations.length}
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Credits available</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {marketplaceCredits.toLocaleString('en-US', { maximumFractionDigits: 1 })}{' '}
                  <span className="text-xs text-neutral-400 font-normal">tCO₂e</span>
                </span>
              </div>
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80">
                <span className="text-neutral-400 text-xs font-normal block mb-1">Flagged listings</span>
                <span className="text-2xl font-mono font-semibold text-white">
                  {Object.values(plotRisks).filter((r) => r.gate !== 'allow').length}
                </span>
              </div>
            </>
          )}
        </section>

        {/* Search & Filter Bar */}
        {(isBusiness || isAdmin) && (
          <section className="p-4 sm:p-5 rounded-xl border border-white/[0.08] bg-[#101412]/80 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isBusiness
                    ? 'Search listings by title, location, or species…'
                    : 'Search pending plots by title, parcel ID, or farmer…'
                }
                className="w-full pl-9 pr-3 py-2 bg-neutral-900/60 border border-white/10 rounded-lg text-white placeholder-neutral-500 text-xs font-normal focus:border-white/30 focus:outline-none transition"
              />
            </div>

            {isBusiness && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-neutral-400 font-medium flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Min NDVI</span>
                </span>
                <select
                  value={minNdviFilter}
                  onChange={(e) => setMinNdviFilter(parseFloat(e.target.value))}
                  className="px-3 py-2 bg-neutral-900/60 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-white/30 focus:outline-none min-w-[160px]"
                >
                  <option value="0">All scores</option>
                  <option value="0.5">NDVI &gt; 0.50</option>
                  <option value="0.7">NDVI &gt; 0.70</option>
                  <option value="0.8">NDVI &gt; 0.80</option>
                </select>
              </div>
            )}
          </section>
        )}

        {/* Admin Audit Queue */}
        {isAdmin && (
          <section className="space-y-6">
            <div className="border-b border-white/[0.08] pb-3 flex items-baseline justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-normal text-white">Land ownership audit</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Inspect parcel IDs, verify ownership documents, and issue audited credits
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {pendingPlantations.length} Pending
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {pendingPlantations.map((plot) => (
                <div key={plot.id} className="rounded-xl border border-white/[0.08] bg-[#101412]/80 p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                    <h3 className="text-base font-semibold text-white">{plot.title}</h3>
                    <span className="text-xs text-neutral-400 font-normal">
                      Landowner: <strong className="text-neutral-200 font-medium">{plot.farmer?.name}</strong>{' '}
                      <span className="text-neutral-500">({plot.farmer?.email})</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase tracking-wider block mb-1">Land parcel ID</span>
                      <span className="text-white font-medium text-xs font-sans">
                        {plot.landParcelId || 'Lalpurja pending'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase tracking-wider block mb-1">Location</span>
                      <span className="font-sans font-medium text-neutral-300">{plot.locationName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase tracking-wider block mb-1">Coordinates</span>
                      <span className="font-medium text-neutral-300">
                        {plot.latitude.toFixed(4)}°, {plot.longitude.toFixed(4)}°
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase tracking-wider block mb-1">Area / trees</span>
                      <span className="font-medium text-neutral-300">
                        {plot.areaHectares} ha · {plot.treeCount} trees
                      </span>
                    </div>
                  </div>

                  {plot.documentUrl && (
                    <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg flex items-center justify-between text-xs gap-3">
                      <span className="text-neutral-300 font-normal">Land title certificate (Lalpurja)</span>
                      <a
                        href={plot.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-300 hover:text-white underline underline-offset-4 flex items-center gap-1.5 shrink-0"
                      >
                        <span>View document</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-3 bg-black/30 rounded-lg p-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                      <span className="text-neutral-300">
                        Measured NDVI:{' '}
                        <span className="text-white font-semibold">
                          {plot.ndviScore > 0
                            ? plot.ndviScore.toFixed(3)
                            : plot.ndviObservations?.[0]?.meanNdvi?.toFixed(3) || 'Not measured'}
                        </span>
                      </span>
                      {plot.ndviObservations?.[0] && (
                        <span className="text-neutral-400">
                          Scene {new Date(plot.ndviObservations[0].sceneDate).toISOString().slice(0, 10)}
                          {plot.ndviObservations[0].cloudCoverPct != null
                            ? ` · cloud ~${plot.ndviObservations[0].cloudCoverPct}%`
                            : ''}
                          {' · '}
                          {plot.ndviObservations[0].satellite}
                        </span>
                      )}
                      <span className="text-neutral-400">
                        Area {plot.measuredAreaHectares ?? plot.areaHectares} ha
                        {plot.boundaryGeoJson ? ' · boundary ✓' : ' · no boundary'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={() => handleRemeasureNdvi(plot.id)}
                        disabled={actionLoading || remeasuringId === plot.id || !plot.boundaryGeoJson}
                        className="btn-download py-2 px-3 text-xs font-medium rounded-lg"
                      >
                        <Activity className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{remeasuringId === plot.id ? 'Measuring…' : 'Re-measure NDVI'}</span>
                      </button>

                      <button
                        onClick={() => handleVerifyPlot(plot.id, 'APPROVE')}
                        disabled={actionLoading}
                        className="btn-enroll py-2 px-3.5 text-xs font-semibold rounded-lg"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify &amp; issue credits</span>
                      </button>

                      <button
                        onClick={() => handleVerifyPlot(plot.id, 'REJECT')}
                        disabled={actionLoading}
                        className="portal-danger px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 rounded-lg"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-normal">
                      Credits use measured Sentinel-2 NDVI observation data.
                    </p>
                  </div>
                </div>
              ))}

              {listReady && pendingPlantations.length === 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-[#101412]/80 p-12 text-center text-sm">
                  <CheckCircle2 className="w-8 h-8 text-neutral-500 mx-auto mb-3" />
                  <p className="font-normal text-white">
                    All submitted parcels have been verified.
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    New submissions from registered landowners will appear here for audit.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Farmer Plots */}
        {isFarmer && (
          <section className="space-y-6">
            <div className="border-b border-white/[0.08] pb-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-normal text-white">Registered forest plots</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Land parcels enrolled for satellite monitoring and credit issuance
                </p>
              </div>

              <button
                onClick={() => router.push('/farmer')}
                className="btn-enroll text-xs font-medium py-2 px-3.5 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                <span>Register new plot</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {userPlantations.map((plot) => (
                <div key={plot.id} className="rounded-xl border border-white/[0.08] bg-[#101412]/80 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium text-base text-white">{plot.title}</h3>
                      {plot.status === 'VERIFIED' && (
                        <a
                          href={`/api/certificates/${plot.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-neutral-300 hover:text-white underline underline-offset-4 shrink-0 font-normal"
                        >
                          Certificate
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                      {plot.description}
                    </p>

                    <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg font-mono text-xs">
                      <span className="text-neutral-500 text-[10px] uppercase tracking-wider block mb-0.5">Land title parcel ID</span>
                      <span className="text-white font-medium">
                        {plot.landParcelId || 'Title registration pending'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-3 border-t border-white/[0.06]">
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Location</span>
                      <span className="font-sans font-medium text-neutral-300">{plot.locationName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Area</span>
                      <span className="font-medium text-white">{plot.areaHectares} ha</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Species</span>
                      <span className="font-sans font-medium text-neutral-300">{plot.treeSpecies}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Credits earned</span>
                      <span className="font-semibold text-white">
                        {plot.creditsIssued} tCO₂e
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {listReady && userPlantations.length === 0 && (
                <div className="col-span-full rounded-xl border border-white/[0.08] bg-[#101412]/80 p-12 text-center text-sm">
                  <Leaf className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                  <p className="font-normal text-white">
                    No forest plots registered yet.
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Register your first parcel with GPS boundary coordinates to begin satellite monitoring.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Business Marketplace */}
        {isBusiness && (
          <section className="space-y-6">
            <div className="border-b border-white/[0.08] pb-3 flex items-baseline justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-normal text-white">Verified credit listings</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Traceable voluntary offsets backed by continuous satellite NDVI measurements
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {verifiedPlantations.length} Active Listings
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {verifiedPlantations.map((plot) => {
                const risk = plotRisks[plot.id];
                const gate = risk?.gate || 'allow';
                const blocked = gate === 'block';
                const warned = gate === 'warn';

                return (
                  <div
                    key={plot.id}
                    className="rounded-xl border border-white/[0.08] bg-[#101412]/80 p-5 sm:p-6 space-y-4 flex flex-col justify-between hover:border-white/20 transition duration-200"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-2xl font-semibold font-mono text-white tracking-tight">
                            {plot.ndviScore.toFixed(2)}
                          </div>
                          <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">
                            Measured NDVI
                          </span>
                        </div>
                        {risk && (
                          <div className="text-right text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border border-white/10 bg-white/[0.03] text-neutral-300">
                              {blocked ? 'Blocked' : warned ? 'Review needed' : 'Verified'}
                            </span>
                            <span className="text-[10px] text-neutral-500 block font-mono mt-0.5">
                              {risk.scamRiskScore}% risk score
                            </span>
                          </div>
                        )}
                      </div>

                      <h3 className="font-semibold text-base text-white">{plot.title}</h3>
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-normal">
                        {plot.description}
                      </p>
                      {plot.landParcelId && (
                        <span className="text-xs font-mono text-neutral-400 block">
                          Parcel {plot.landParcelId}
                        </span>
                      )}
                      {(blocked || warned) && risk?.flags?.[0] && (
                        <p className="text-xs text-amber-300/80 font-normal">{risk.flags[0]}</p>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/[0.06] text-xs">
                      <div className="flex justify-between gap-3 text-neutral-400">
                        <span>Location</span>
                        <span className="text-white font-medium">{plot.locationName}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-neutral-400">
                        <span>Available volume</span>
                        <span className="text-white font-mono font-medium">
                          {plot.creditsIssued} tCO₂e
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 text-neutral-400">
                        <span>Price</span>
                        <span className="font-mono text-white font-medium">$18.50 / tCO₂e</span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPlantationToBuy(plot);
                          setBuyCreditsCount(Math.min(10, plot.creditsIssued));
                          setAcknowledgeRisk(false);
                        }}
                        disabled={plot.creditsIssued <= 0 || blocked}
                        className="w-full py-2.5 text-xs font-semibold rounded-lg bg-white text-black hover:bg-neutral-200 transition disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>
                          {blocked
                            ? 'Purchase blocked'
                            : plot.creditsIssued > 0
                              ? warned
                                ? 'Review & buy'
                                : 'Buy offsets'
                              : 'Sold out'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {listReady && verifiedPlantations.length === 0 && (
                <div className="col-span-full rounded-xl border border-white/[0.08] bg-[#101412]/80 p-12 text-center text-sm">
                  <ShoppingCart className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                  <p className="font-normal text-white">
                    No verified listings match your filters yet.
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Credits appear here after an admin verifies a land parcel.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4">
              <div className="border-b border-white/[0.08] pb-3 mb-4">
                <h2 className="text-lg font-normal text-white">Your purchase history</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Audited offset purchases and certificates issued on this platform
                </p>
              </div>
              <TransactionLedger />
            </div>
          </section>
        )}

        {/* Footprint Map */}
        {(isFarmer || isAdmin) && (
          <section className="rounded-xl border border-white/[0.08] bg-[#101412]/80 p-5 sm:p-6 space-y-4">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-lg sm:text-xl font-normal text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>{isAdmin ? 'All plantation footprints' : 'Your plot map'}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {isAdmin
                  ? 'Pending and verified land parcels across Nepal'
                  : 'Boundaries you registered for satellite verification'}
              </p>
            </div>
            <RealLeafletMapContainer plantations={mapPlantations} />
          </section>
        )}
      </main>

      {/* Buy Modal */}
      {selectedPlantationToBuy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#101412] p-6 sm:p-8 relative text-xs shadow-2xl">
            <h3 className="text-lg font-normal text-white mb-1">Buy carbon offsets</h3>
            <p className="text-neutral-400 mb-4 font-normal">
              {selectedPlantationToBuy.title}
              {selectedPlantationToBuy.locationName ? ` · ${selectedPlantationToBuy.locationName}` : ''}
            </p>

            {plotRisks[selectedPlantationToBuy.id]?.gate === 'block' && (
              <div className="p-3 rounded-lg border border-red-500/25 bg-red-500/10 mb-4 space-y-1">
                <span className="text-[10px] font-mono uppercase text-red-400 block font-semibold">Cannot complete purchase</span>
                <span className="text-white font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> High geo risk
                </span>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  {plotRisks[selectedPlantationToBuy.id].flags[0] ||
                    plotRisks[selectedPlantationToBuy.id].recommendation}
                </p>
              </div>
            )}

            {plotRisks[selectedPlantationToBuy.id]?.gate === 'warn' && (
              <div className="p-3 rounded-lg border border-amber-500/25 bg-amber-500/10 mb-4 space-y-2">
                <span className="text-[10px] font-mono uppercase text-amber-300 block font-semibold">Integrity caution</span>
                <span className="text-white font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Review before buying
                </span>
                <span className="text-[10px] font-mono text-neutral-400 block">
                  {plotRisks[selectedPlantationToBuy.id].scamRiskScore}% risk score
                </span>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  {plotRisks[selectedPlantationToBuy.id].flags[0] ||
                    plotRisks[selectedPlantationToBuy.id].recommendation}
                </p>
                {plotRisks[selectedPlantationToBuy.id].actualAddress && (
                  <p className="text-[10px] text-neutral-400">
                    GPS resolves to: {plotRisks[selectedPlantationToBuy.id].actualAddress}
                  </p>
                )}
                <label className="flex items-start gap-2 cursor-pointer pt-1 text-[11px] font-medium text-neutral-300">
                  <input
                    type="checkbox"
                    checked={acknowledgeRisk}
                    onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>I understand this listing is flagged and still want to buy.</span>
                </label>
              </div>
            )}

            <form onSubmit={handlePurchaseCredits} className="space-y-4">
              <div>
                <label className="block text-neutral-300 mb-1 font-medium text-xs">
                  Offset amount (tCO₂e)
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedPlantationToBuy.creditsIssued}
                  value={buyCreditsCount}
                  onChange={(e) => setBuyCreditsCount(parseFloat(e.target.value) || 1)}
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-white focus:border-white/30 focus:outline-none"
                  disabled={plotRisks[selectedPlantationToBuy.id]?.gate === 'block'}
                />
                <p className="mt-1 text-[10px] text-neutral-500 font-normal">
                  Up to {selectedPlantationToBuy.creditsIssued} tCO₂e available on this listing
                </p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-xl space-y-2">
                <div className="flex justify-between text-neutral-400 text-xs">
                  <span>Unit price</span>
                  <span className="font-mono text-white font-medium">$18.50 / tCO₂e</span>
                </div>
                <div className="flex justify-between text-xs font-medium pt-2 border-t border-white/[0.06]">
                  <span className="text-white">Total</span>
                  <span className="text-white font-mono font-semibold">${(buyCreditsCount * 18.5).toFixed(2)} USD</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlantationToBuy(null);
                    setAcknowledgeRisk(false);
                  }}
                  className="btn-download py-2 px-4 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    actionLoading ||
                    plotRisks[selectedPlantationToBuy.id]?.gate === 'block' ||
                    (plotRisks[selectedPlantationToBuy.id]?.gate === 'warn' && !acknowledgeRisk)
                  }
                  className="py-2 px-4 text-xs font-semibold rounded-lg bg-white text-black hover:bg-neutral-200 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Processing…' : 'Confirm purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && <NDVIGuideModal isOpen={showNdviModal} onClose={() => setShowNdviModal(false)} />}
    </div>
  );
}
