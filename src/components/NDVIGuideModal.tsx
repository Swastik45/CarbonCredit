'use client';

import React, { useState } from 'react';
import { X, Leaf, Activity, BarChart2, Calculator, Info } from 'lucide-react';

interface NDVIGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NDVIGuideModal({ isOpen, onClose }: NDVIGuideModalProps) {
  const [hectares, setHectares] = useState<number>(10);
  const [nir, setNir] = useState<number>(0.75);
  const [red, setRed] = useState<number>(0.15);

  if (!isOpen) return null;

  // Formula: (NIR - RED) / (NIR + RED)
  const ndviScore = Math.max(-1, Math.min(1, (nir - red) / (nir + red)));
  const estimatedCredits = Math.max(0, Math.round(hectares * Math.max(0, ndviScore) * 12.5 * 100) / 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full glass-panel-glow p-6 sm:p-8 rounded-3xl border border-carbon-500/40 relative text-carbon-50 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-carbon-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-carbon-950 border border-carbon-500/30 flex items-center justify-center text-carbon-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">NDVI Satellite Verification Guide</h2>
              <p className="text-xs text-carbon-300">Normalized Difference Vegetation Index Science & Calculation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-darkbg-900 border border-carbon-500/20 flex items-center justify-center text-carbon-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-6 text-xs text-carbon-200">
          {/* NDVI Formula Explanation */}
          <div className="glass-panel p-5 rounded-2xl border border-carbon-500/20">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-carbon-400" />
              <span>The NDVI Scientific Formula</span>
            </h3>
            <p className="leading-relaxed">
              NDVI measures plant health by analyzing Near-Infrared (NIR) light reflection vs Visible Red light absorption by chlorophyll.
            </p>
            <div className="my-4 p-4 rounded-xl bg-darkbg-900 font-mono text-center text-sm font-bold text-carbon-400 border border-carbon-500/30">
              NDVI = (NIR - RED) / (NIR + RED)
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-[11px] pt-1">
              <div className="p-2 rounded bg-darkbg-800 border border-red-500/20">
                <span className="block text-red-400 font-bold">-1.0 to 0.1</span>
                <span className="text-carbon-400 text-[10px]">Water / Bare Soil</span>
              </div>
              <div className="p-2 rounded bg-darkbg-800 border border-amber-500/20">
                <span className="block text-amber-400 font-bold">0.2 to 0.5</span>
                <span className="text-carbon-400 text-[10px]">Sparse Vegetation</span>
              </div>
              <div className="p-2 rounded bg-darkbg-800 border border-emerald-500/20">
                <span className="block text-emerald-400 font-bold">0.6 to 0.95</span>
                <span className="text-carbon-400 text-[10px]">Dense Forest / High Sequestration</span>
              </div>
            </div>
          </div>

          {/* Interactive Calculator Widget */}
          <div className="glass-panel p-5 rounded-2xl border border-carbon-500/30 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-carbon-400" />
              <span>Interactive Carbon Sequestration Simulator</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-carbon-400 text-[11px] mb-1">Plot Area (Hectares)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={hectares}
                  onChange={(e) => setHectares(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg input-field font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-carbon-400 text-[11px] mb-1">NIR Reflection Band</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={nir}
                  onChange={(e) => setNir(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg input-field font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-carbon-400 text-[11px] mb-1">RED Light Reflection Band</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={red}
                  onChange={(e) => setRed(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg input-field font-mono text-sm"
                />
              </div>
            </div>

            {/* Calculated Output Banner */}
            <div className="p-4 rounded-xl bg-darkbg-900 border border-carbon-500/40 flex items-center justify-between">
              <div>
                <span className="text-carbon-400 text-[11px] block">Calculated NDVI Score</span>
                <span className="text-xl font-bold font-mono text-white">{ndviScore.toFixed(3)}</span>
              </div>

              <div className="text-right">
                <span className="text-carbon-400 text-[11px] block">Estimated Carbon Credits</span>
                <span className="text-xl font-extrabold font-mono text-emerald-400">{estimatedCredits} tCO₂e</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-carbon-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-darkbg-900 gradient-btn text-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
