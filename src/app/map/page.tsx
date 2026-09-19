'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RealLeafletMapContainer from '@/components/RealLeafletMapContainer';
import { PlantationPlot } from '@/components/InteractiveMap';

export default function MapPage() {
  const [plantations, setPlantations] = useState<PlantationPlot[]>([]);

  useEffect(() => {
    async function fetchPlantations() {
      try {
        const res = await fetch('/api/plantations');
        if (res.ok) {
          const data = await res.json();
          setPlantations(data.plantations || []);
        }
      } catch (err) {
        console.error('Failed to load map plantations:', err);
      }
    }
    fetchPlantations();
  }, []);

  return (
    <div className="portal-world-root min-h-screen bg-darkbg-900 text-carbon-50 flex flex-col">
      {/* Top Navbar */}
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

      {/* Main Map Engine */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
        <RealLeafletMapContainer plantations={plantations} />
      </main>
    </div>
  );
}
