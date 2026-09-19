'use client';

import React, { useState } from 'react';
import { Layers, MapPin, Filter } from 'lucide-react';
import { evaluatePlantationScamRisk, AntiScamResult } from '@/lib/antiScam';

export type PlantationPlot = {
  id: string;
  farmerId?: string;
  title: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  areaHectares: number;
  treeSpecies: string;
  treeCount: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  ndviScore: number;
  creditsIssued: number;
  landParcelId?: string;
  documentUrl?: string;
  farmer?: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
  };
};

interface InteractiveMapProps {
  plantations: PlantationPlot[];
  onSelectPlot?: (plot: PlantationPlot) => void;
}

export default function InteractiveMap({ plantations, onSelectPlot }: InteractiveMapProps) {
  const [activePlot, setActivePlot] = useState<PlantationPlot | null>(plantations[0] || null);
  const [filter, setFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [scamAudit, setScamAudit] = useState<AntiScamResult | null>(null);

  const filteredPlantations = plantations.filter((plot) => {
    if (filter === 'ALL') return true;
    return plot.status === filter;
  });

  const handlePlotClick = async (plot: PlantationPlot) => {
    setActivePlot(plot);
    if (onSelectPlot) onSelectPlot(plot);

    const audit = await evaluatePlantationScamRisk({
      latitude: plot.latitude,
      longitude: plot.longitude,
      areaHectares: plot.areaHectares,
      title: plot.title,
      locationName: plot.locationName,
    });
    setScamAudit(audit);
  };

  return (
    <div className="w-full clamphook-card rounded-3xl p-6 border border-slate-400 dark:border-gray-800 space-y-4">
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#3b69fc] flex items-center justify-center text-white shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-black dark:text-white text-base">Sentinel-2 Interactive Reforestation Map</h3>
            <p className="text-xs text-black dark:text-slate-200 font-black">OpenStreetMap View • Color-Coded NDVI Status</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-black">
          <Filter className="w-3.5 h-3.5 text-[#3b69fc]" />
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'ALL' ? 'bg-[#3b69fc] text-white font-black' : 'text-black dark:text-[#3b69fc]'
            }`}
          >
            All Plots ({plantations.length})
          </button>
          <button
            onClick={() => setFilter('VERIFIED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'VERIFIED' ? 'bg-emerald-600 text-white font-black' : 'text-black dark:text-emerald-500'
            }`}
          >
            Verified Only
          </button>
        </div>
      </div>

      {/* Grid Container without inner overflow scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPlantations.map((plot) => (
            <div
              key={plot.id}
              onClick={() => handlePlotClick(plot)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                activePlot?.id === plot.id
                  ? 'bg-[#3b69fc]/10 border-[#3b69fc] shadow-md'
                  : 'clamphook-card'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm text-black dark:text-white">{plot.title}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    plot.status === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {plot.status}
                </span>
              </div>

              <p className="text-xs text-black dark:text-slate-300 line-clamp-1 font-bold">{plot.locationName}</p>

              <div className="flex justify-between items-center text-xs font-mono pt-3 border-t border-slate-300 dark:border-gray-800 mt-2">
                <span className="text-black dark:text-slate-300 font-bold">{plot.areaHectares} ha</span>
                <span className="text-[#3b69fc] font-black">
                  {plot.ndviScore > 0 ? `NDVI ${plot.ndviScore.toFixed(2)}` : 'NDVI Audit'}
                </span>
              </div>
            </div>
          ))}

          {filteredPlantations.length === 0 && (
            <div className="col-span-full clamphook-card p-12 text-center text-black dark:text-white text-sm font-black">
              No plantations found for the selected filter.
            </div>
          )}
        </div>

        {/* Selected Plot Details */}
        <div className="clamphook-card p-6 rounded-2xl flex flex-col justify-between space-y-4 text-xs font-black">
          {activePlot ? (
            <div className="space-y-3">
              <div className="border-b border-slate-300 dark:border-gray-800 pb-3">
                <span className="text-xs font-mono text-[#3b69fc] font-black block">ID: {activePlot.id.slice(-6)}</span>
                <h4 className="font-black text-base text-black dark:text-white">{activePlot.title}</h4>
                <p className="text-xs text-black dark:text-slate-300 mt-1 font-bold">{activePlot.description}</p>
              </div>

              <div className="space-y-2 font-mono">
                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans">Location:</span>
                  <span className="text-black dark:text-white">{activePlot.locationName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans">Coordinates:</span>
                  <span className="font-mono text-black dark:text-white">
                    {activePlot.latitude.toFixed(2)}°, {activePlot.longitude.toFixed(2)}°
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans">Plot Area:</span>
                  <span className="font-black text-black dark:text-white">{activePlot.areaHectares} Hectares</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans">Tree Species:</span>
                  <span className="text-[#3b69fc] font-sans font-black">{activePlot.treeSpecies}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-300 dark:border-gray-800">
                  <span className="text-black dark:text-slate-400 font-sans">Satellite Health (NDVI):</span>
                  <span className="font-mono font-black text-black dark:text-white">
                    {activePlot.ndviScore > 0 ? activePlot.ndviScore.toFixed(2) : 'Awaiting Audit'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-black dark:text-white text-xs font-black">
              <MapPin className="w-8 h-8 text-[#3b69fc] mb-2" />
              Select a plantation to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
