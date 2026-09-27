'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import RealLeafletMapContainer from '@/components/RealLeafletMapContainer';
import { PlantationPlot } from '@/components/InteractiveMap';

const PLOTS_CACHE_KEY = 'cc_map_plots';
const LABEL_CACHE_KEY = 'cc_map_label';

export default function MapPage() {
  const router = useRouter();
  const [plantations, setPlantations] = useState<PlantationPlot[]>([]);
  const [roleLabel, setRoleLabel] = useState('Map');

  useLayoutEffect(() => {
    try {
      const cached = sessionStorage.getItem(PLOTS_CACHE_KEY);
      if (cached) setPlantations(JSON.parse(cached));
      const label = sessionStorage.getItem(LABEL_CACHE_KEY);
      if (label) setRoleLabel(label);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const userRes = await fetch('/api/auth/me');
        const userData = await userRes.json();
        if (!userRes.ok || !userData.authenticated) {
          router.replace('/login');
          return;
        }

        const role = userData.user?.role as string;
        if (role === 'BUSINESS' || role === 'COMPANY') {
          router.replace('/dashboard');
          return;
        }

        const isAdmin = role === 'ADMIN';
        const label = isAdmin ? 'Audit map' : 'My plot map';
        setRoleLabel(label);

        const url = isAdmin
          ? '/api/plantations'
          : `/api/plantations?farmerId=${userData.user.id}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const plots = data.plantations || [];
          setPlantations(plots);
          try {
            sessionStorage.setItem(PLOTS_CACHE_KEY, JSON.stringify(plots));
            sessionStorage.setItem(LABEL_CACHE_KEY, label);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('Failed to load map plantations:', err);
      }
    }
    load();
  }, [router]);

  return (
    <div className="portal-world-root portal-dashboard-root min-h-screen flex flex-col">
      <header className="portal-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn-download py-2 text-xs font-bold">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to dashboard</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="portal-brand-mark" />
              <div>
                <span className="portal-brand-name">
                  Carbon<span>Credit</span>
                </span>
                <p className="portal-kicker mb-0 mt-0.5" style={{ marginBottom: 0 }}>
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
        <div className="clamphook-card p-2 sm:p-3 overflow-hidden">
          <RealLeafletMapContainer plantations={plantations} />
        </div>
      </main>
    </div>
  );
}
