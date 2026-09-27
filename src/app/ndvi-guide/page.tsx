'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity, CheckCircle, BarChart, Zap, Globe } from 'lucide-react';
import NDVIGuideModal from '@/components/NDVIGuideModal';

export default function NDVIGuidePage() {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="portal-world-root min-h-screen bg-darkbg-900 text-carbon-50 flex flex-col">
      {/* Header */}
      <header className="portal-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl glass-panel text-carbon-300 hover:text-white transition-all flex items-center gap-2 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portal</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="portal-brand-mark" />
              <span className="portal-brand-name">
                Carbon<span>Credit</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-carbon-500/30 text-carbon-300 text-xs">
            <Globe className="w-4 h-4 text-carbon-400" />
            <span>Nepal MRV · free Planetary Computer Sentinel-2</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            How <span className="gradient-text">NDVI Measurement</span> Works Here
          </h1>

          <p className="text-sm sm:text-base text-carbon-300 max-w-2xl mx-auto leading-relaxed">
            NDVI = (NIR − Red) / (NIR + Red). This platform measures mean NDVI over your drawn plot polygon
            using Microsoft Planetary Computer (free Sentinel-2 L2A — no paid account). Credits are a voluntary
            estimate — not Verra or Gold Standard. The calculator below is educational only.
          </p>

          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 rounded-xl font-bold text-darkbg-900 gradient-btn text-xs shadow-lg shadow-carbon-500/20"
          >
            Launch Interactive NDVI Calculator
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="glass-panel p-6 rounded-2xl">
            <BarChart className="w-8 h-8 text-carbon-400 mb-3" />
            <h3 className="font-bold text-white text-base">Spectral Reflectance</h3>
            <p className="text-xs text-carbon-300 mt-2">
              Healthy chlorophyll absorbs visible Red light while scattering Near-Infrared (NIR) light, producing distinct satellite signatures.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <Zap className="w-8 h-8 text-carbon-400 mb-3" />
            <h3 className="font-bold text-white text-base">Credit Issuance</h3>
            <p className="text-xs text-carbon-300 mt-2">
              Admins approve only after a stored Sentinel-2 observation (mean NDVI, scene date, cloud gate).
              Formula: measured area × NDVI × species multiplier × 12.5.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <CheckCircle className="w-8 h-8 text-carbon-400 mb-3" />
            <h3 className="font-bold text-white text-base">Nepal plot integrity</h3>
            <p className="text-xs text-carbon-300 mt-2">
              GPS + polygon must fall inside Nepal; claimed area must match measured boundary within 25%;
              Lalpurja parcel IDs cannot be double-claimed.
            </p>
          </div>
        </div>
      </main>

      <NDVIGuideModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
