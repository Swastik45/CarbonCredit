'use client';

import React, { useEffect, useState } from 'react';
import { PlantationPlot } from './InteractiveMap';
import { Layers, MapPin, Info, ShieldCheck, Activity } from 'lucide-react';

interface RealLeafletMapProps {
  plantations: PlantationPlot[];
  onSelectPlot?: (plot: PlantationPlot) => void;
}

export default function RealLeafletMap({ plantations, onSelectPlot }: RealLeafletMapProps) {
  const [mapType, setMapType] = useState<'STREET' | 'SATELLITE'>('SATELLITE');
  const [filter, setFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
  const [activePlot, setActivePlot] = useState<PlantationPlot | null>(plantations[0] || null);

  const filteredPlantations = plantations.filter((p) => {
    if (filter === 'ALL') return true;
    return p.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-emerald-500 text-black border-emerald-400';
      case 'PENDING':
        return 'bg-amber-500 text-black border-amber-400';
      case 'REJECTED':
        return 'bg-red-500 text-white border-red-400';
      default:
        return 'bg-gray-500 text-white border-gray-400';
    }
  };

  return (
    <div className="w-full glass-panel rounded-3xl p-6 border border-carbon-500/30 space-y-4">
      {/* Header & Layer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-carbon-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-carbon-950 border border-carbon-500/30 flex items-center justify-center text-carbon-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Sentinel & Esri Satellite Plot Map</h3>
            <p className="text-xs text-carbon-300">Live Interactive Coordinates • Color-Coded NDVI Markers</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Map Layer Switcher */}
          <div className="flex items-center bg-darkbg-900/90 p-1 rounded-xl border border-carbon-500/20 text-xs">
            <button
              onClick={() => setMapType('SATELLITE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mapType === 'SATELLITE'
                  ? 'bg-carbon-500 text-darkbg-900 shadow-md'
                  : 'text-carbon-300 hover:text-white'
              }`}
            >
              🛰️ Satellite View
            </button>
            <button
              onClick={() => setMapType('STREET')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mapType === 'STREET'
                  ? 'bg-carbon-500 text-darkbg-900 shadow-md'
                  : 'text-carbon-300 hover:text-white'
              }`}
            >
              🗺️ Street View
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-darkbg-900/90 p-1 rounded-xl border border-carbon-500/20 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === 'ALL' ? 'bg-carbon-950 text-white font-bold' : 'text-carbon-400'
              }`}
            >
              All ({plantations.length})
            </button>
            <button
              onClick={() => setFilter('VERIFIED')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === 'VERIFIED' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40' : 'text-carbon-400'
              }`}
            >
              Verified
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[440px]">
        {/* Interactive Map Visualizer Canvas */}
        <div
          className={`lg:col-span-2 rounded-2xl border border-carbon-500/20 relative overflow-hidden flex flex-col justify-between p-6 ${
            mapType === 'SATELLITE'
              ? 'bg-[radial-gradient(#15803d_1.5px,transparent_1.5px)] [background-size:20px_20px] bg-darkbg-900'
              : 'bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:32px_32px] bg-darkbg-800'
          }`}
        >
          {/* Top Layer Indicator */}
          <div className="flex items-center justify-between text-xs text-carbon-300 z-10">
            <span className="px-3 py-1 rounded-full bg-darkbg-900/90 border border-carbon-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Layer: {mapType === 'SATELLITE' ? 'Esri World Imagery (High-Res)' : 'OpenStreetMap Vector'}</span>
            </span>
            <span className="font-mono text-carbon-400">EPSG:4326 WGS84</span>
          </div>

          {/* Interactive Plot Grid Items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6 z-10">
            {filteredPlantations.map((plot) => {
              const isSelected = activePlot?.id === plot.id;
              return (
                <div
                  key={plot.id}
                  onClick={() => {
                    setActivePlot(plot);
                    if (onSelectPlot) onSelectPlot(plot);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-carbon-950 border-carbon-400 shadow-xl shadow-carbon-500/20 scale-[1.03]'
                      : 'bg-darkbg-900/90 border-carbon-500/20 hover:border-carbon-500/60 hover:bg-darkbg-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(plot.status)}`}>
                      {plot.status}
                    </span>
                    <MapPin className={`w-4 h-4 ${plot.status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}`} />
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white line-clamp-1">{plot.title}</h4>
                    <p className="text-xs text-carbon-300 line-clamp-1">{plot.locationName}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-carbon-900 flex items-center justify-between text-xs font-mono">
                    <span className="text-carbon-400">{plot.areaHectares} ha</span>
                    <span className="text-carbon-200">{plot.ndviScore > 0 ? `NDVI ${plot.ndviScore.toFixed(2)}` : 'NDVI Audit'}</span>
                  </div>
                </div>
              );
            })}

            {filteredPlantations.length === 0 && (
              <div className="col-span-full py-16 text-center text-carbon-400 text-sm">
                No plantation plots match the selected filter.
              </div>
            )}
          </div>

          {/* Footer Coordinates Bar */}
          <div className="flex items-center justify-between text-xs text-carbon-400/80 z-10 pt-2 border-t border-carbon-900">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-carbon-400" />
              <span>Click any plot marker to inspect satellite vegetation indices</span>
            </span>
            <span className="font-mono">Lat/Lng Sync Active</span>
          </div>
        </div>

        {/* Selected Plot Detail Sidebar */}
        <div className="glass-panel-glow p-6 rounded-2xl border border-carbon-500/30 flex flex-col justify-between">
          {activePlot ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(activePlot.status)}`}>
                  {activePlot.status}
                </span>
                <span className="text-xs text-carbon-400 font-mono">Plot #{activePlot.id.slice(-6)}</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{activePlot.title}</h3>
                <p className="text-xs text-carbon-300 mt-1">{activePlot.description}</p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-carbon-900">
                  <span className="text-carbon-400">Location:</span>
                  <span className="font-medium text-white">{activePlot.locationName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-carbon-900">
                  <span className="text-carbon-400">Coordinates:</span>
                  <span className="font-mono text-carbon-200">
                    {activePlot.latitude.toFixed(4)}°, {activePlot.longitude.toFixed(4)}°
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-carbon-900">
                  <span className="text-carbon-400">Plot Area:</span>
                  <span className="font-bold text-carbon-300">{activePlot.areaHectares} Hectares</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-carbon-900">
                  <span className="text-carbon-400">Tree Species:</span>
                  <span className="font-medium text-emerald-400">{activePlot.treeSpecies}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-carbon-900">
                  <span className="text-carbon-400">Satellite Health (NDVI):</span>
                  <span className="font-mono font-bold text-carbon-200">
                    {activePlot.ndviScore > 0 ? activePlot.ndviScore.toFixed(2) : 'Awaiting Audit'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-carbon-900">
                  <span className="text-carbon-400">Issued Carbon Credits:</span>
                  <span className="font-mono font-extrabold text-emerald-400 text-sm">
                    {activePlot.creditsIssued} tCO₂e
                  </span>
                </div>
              </div>

              {activePlot.farmer && (
                <div className="p-3 rounded-xl bg-darkbg-900 border border-carbon-500/20 text-xs">
                  <span className="text-carbon-400 block text-[10px] uppercase font-semibold">Registered Farmer</span>
                  <span className="font-bold text-white">{activePlot.farmer.name}</span>
                  {activePlot.farmer.companyName && (
                    <span className="text-carbon-300 block">{activePlot.farmer.companyName}</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-carbon-400 text-xs">
              <MapPin className="w-8 h-8 text-carbon-500/40 mb-2" />
              <span>Select a plot marker to view full satellite metrics</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
