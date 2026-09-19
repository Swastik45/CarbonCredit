'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PlantationPlot } from './InteractiveMap';
import { evaluatePlantationScamRisk, AntiScamResult } from '@/lib/antiScam';
import { ShieldCheck, AlertTriangle, Layers, MapPin, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

interface LeafletMapClientProps {
  plantations: PlantationPlot[];
  onSelectPlot?: (plot: PlantationPlot) => void;
}

export default function LeafletMapClient({ plantations, onSelectPlot }: LeafletMapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [mapTileType, setMapTileType] = useState<'SATELLITE' | 'STREET'>('SATELLITE');
  const [activePlot, setActivePlot] = useState<PlantationPlot | null>(plantations[0] || null);
  const [selectedScamAudit, setSelectedScamAudit] = useState<AntiScamResult | null>(null);

  // Initialize Leaflet Map dynamically on Client
  useEffect(() => {
    let isSubscribed = true;

    async function initLeaflet() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const L = (await import('leaflet')).default;

      if (!isSubscribed) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const defaultLat = plantations[0]?.latitude || 27.7172;
      const defaultLng = plantations[0]?.longitude || 85.3240;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 7,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      const satelliteTiles = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri World Imagery',
          maxZoom: 18,
        }
      );

      const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      });

      if (mapTileType === 'SATELLITE') {
        satelliteTiles.addTo(map);
      } else {
        streetTiles.addTo(map);
      }

      markersRef.current = [];

      for (const plot of plantations) {
        const scamResult = await evaluatePlantationScamRisk({
          latitude: plot.latitude,
          longitude: plot.longitude,
          areaHectares: plot.areaHectares,
          title: plot.title,
          locationName: plot.locationName,
        });

        let markerColor = '#3b69fc'; // Clamphook Blue Verified
        if (scamResult.isSuspicious) {
          markerColor = '#ef4444'; // Red High Scam Risk
        } else if (plot.status === 'PENDING') {
          markerColor = '#f59e0b'; // Amber Pending
        }

        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="
              background-color: ${markerColor};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 3px solid #000000;
              box-shadow: 0 0 12px ${markerColor};
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            ">
              <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([plot.latitude, plot.longitude], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="font-family: Mulish, sans-serif; color: #000000; width: 220px; padding: 4px;">
            <div style="font-weight: 900; font-size: 14px; margin-bottom: 4px; color: #000000;">${plot.title}</div>
            <div style="font-size: 11px; color: #000000; font-weight: 800; margin-bottom: 4px;">Claimed: <strong style="color:#000000">${plot.locationName}</strong></div>
            <div style="font-size: 10px; color: #000000; font-weight: 900; margin-bottom: 8px;">Actual: ${scamResult.actualAddress || 'Resolving...'}</div>
            <div style="font-size: 10px; font-weight: 900; padding: 6px 10px; border-radius: 6px; color: white; background: ${
              scamResult.isSuspicious ? '#ef4444' : '#3b69fc'
            }">
              ${scamResult.isSuspicious ? '⚠️ LOCATION MISMATCH / SCAM' : '🟢 GEOGRAPHY VERIFIED MATCH'}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          setActivePlot(plot);
          setSelectedScamAudit(scamResult);
          if (onSelectPlot) onSelectPlot(plot);
        });

        markersRef.current.push(marker);
      }
    }

    initLeaflet();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [plantations, mapTileType, onSelectPlot]);

  // Compute Scam Audit for Active Plot
  useEffect(() => {
    async function auditActive() {
      if (activePlot) {
        const audit = await evaluatePlantationScamRisk({
          latitude: activePlot.latitude,
          longitude: activePlot.longitude,
          areaHectares: activePlot.areaHectares,
          title: activePlot.title,
          locationName: activePlot.locationName,
        });
        setSelectedScamAudit(audit);
      }
    }
    auditActive();
  }, [activePlot]);

  return (
    <div className="w-full clamphook-card rounded-3xl p-6 border border-slate-400 dark:border-gray-800 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#3b69fc] flex items-center justify-center text-white shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-black dark:text-white text-base">Sentinel & Esri Real Satellite Map</h3>
            <p className="text-xs text-black dark:text-slate-200 font-extrabold">
              Reverse Geocoding • Real Location Match Audit Engine
            </p>
          </div>
        </div>

        {/* Tile Layer Switcher */}
        <div className="flex items-center bg-gray-200 dark:bg-[#07122a] p-1.5 rounded-xl border border-slate-400 dark:border-gray-800 text-xs font-black">
          <button
            onClick={() => setMapTileType('SATELLITE')}
            className={`px-3.5 py-1.5 rounded-lg font-black transition-all ${
              mapTileType === 'SATELLITE'
                ? 'bg-[#3b69fc] text-white shadow-md'
                : 'text-black dark:text-white hover:text-[#3b69fc]'
            }`}
          >
            🛰️ Esri Satellite Imagery
          </button>
          <button
            onClick={() => setMapTileType('STREET')}
            className={`px-3.5 py-1.5 rounded-lg font-black transition-all ${
              mapTileType === 'STREET'
                ? 'bg-[#3b69fc] text-white shadow-md'
                : 'text-black dark:text-white hover:text-[#3b69fc]'
            }`}
          >
            🗺️ OpenStreetMap Vector
          </button>
        </div>
      </div>

      {/* Map + Anti-Scam Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[460px]">
        {/* Leaflet Map Canvas Container */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-400 dark:border-gray-800 overflow-hidden relative min-h-[440px] z-10">
          <div ref={mapContainerRef} className="w-full h-full min-h-[440px] z-10" />

          <div className="absolute bottom-3 left-3 z-20 bg-white/95 dark:bg-[#07122a]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-400 dark:border-gray-800 text-[11px] text-black dark:text-white font-mono font-black shadow-md">
            🛰️ Tile Source: {mapTileType === 'SATELLITE' ? 'Esri World Imagery (ArcGIS)' : 'OpenStreetMap Standard'}
          </div>
        </div>

        {/* Selected Plot Anti-Scam & Satellite Inspector Sidebar */}
        <div className="clamphook-card p-6 flex flex-col justify-between space-y-4">
          {activePlot ? (
            <div className="space-y-4 text-xs font-black">
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-gray-800 pb-3">
                <span className="font-black text-black dark:text-white text-sm">{activePlot.title}</span>
                <span
                  className={`px-2.5 py-1 rounded-full font-black text-[10px] ${
                    selectedScamAudit?.isSuspicious
                      ? 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/40'
                      : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {selectedScamAudit?.isSuspicious ? '⚠️ LOCATION MISMATCH' : '🟢 GEOGRAPHY VERIFIED'}
                </span>
              </div>

              {/* Reverse Geocoding Match Card */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  selectedScamAudit?.isSuspicious
                    ? 'bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-200'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    {selectedScamAudit?.isSuspicious ? (
                      <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    Geographic Match Audit
                  </span>
                  <span className="font-mono font-black text-sm">
                    {selectedScamAudit?.scamRiskScore}% Risk
                  </span>
                </div>

                <div className="space-y-1 text-[11px] pt-1">
                  <div>
                    <span className="text-black dark:text-slate-400 block text-[10px] font-black">CLAIMED LOCATION:</span>
                    <strong className="text-black dark:text-white font-black">{activePlot.locationName}</strong>
                  </div>
                  <div>
                    <span className="text-black dark:text-slate-400 block text-[10px] font-black">ACTUAL GPS PHYSICAL ADDRESS:</span>
                    <strong className={selectedScamAudit?.isSuspicious ? 'text-red-700 dark:text-red-300 font-black' : 'text-emerald-700 dark:text-emerald-300 font-black'}>
                      {selectedScamAudit?.actualAddress || 'Resolving reverse geocoding...'}
                    </strong>
                  </div>
                </div>

                {selectedScamAudit?.flags && selectedScamAudit.flags.length > 0 && (
                  <div className="pt-2 border-t border-red-500/30 space-y-1">
                    {selectedScamAudit.flags.map((flag: string, idx: number) => (
                      <div key={idx} className="text-[10px] text-red-700 dark:text-red-300 font-mono font-black">
                        • {flag}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plot Technical Details */}
              <div className="space-y-2 font-mono text-black dark:text-white">
                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans font-black">GPS Coordinates:</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${activePlot.latitude},${activePlot.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3b69fc] font-black hover:underline flex items-center gap-1"
                  >
                    <span>{activePlot.latitude.toFixed(4)}°, {activePlot.longitude.toFixed(4)}°</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans font-black">Plot Area:</span>
                  <span className="font-black text-black dark:text-white">{activePlot.areaHectares} Hectares</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans font-black">Tree Species:</span>
                  <span className="text-[#3b69fc] font-sans font-black">{activePlot.treeSpecies}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans font-black">Satellite Health Index:</span>
                  <span className="text-black dark:text-white font-black">
                    {activePlot.ndviScore > 0 ? activePlot.ndviScore.toFixed(2) : 'Awaiting Audit'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-black dark:text-white text-xs font-black">
              Select a marker on the map to run an instant reverse-geocoding match audit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
