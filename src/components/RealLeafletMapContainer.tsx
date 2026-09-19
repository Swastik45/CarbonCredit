'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { PlantationPlot } from './InteractiveMap';
import { RefreshCw } from 'lucide-react';

const LeafletMapClient = dynamic(() => import('./LeafletMapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full glass-panel rounded-3xl p-12 text-center text-carbon-400 text-xs flex items-center justify-center gap-3">
      <RefreshCw className="w-5 h-5 animate-spin text-carbon-400" />
      <span>Loading Esri Satellite Leaflet Map & Anti-Scam Inspector...</span>
    </div>
  ),
});

interface RealLeafletMapContainerProps {
  plantations: PlantationPlot[];
  onSelectPlot?: (plot: PlantationPlot) => void;
}

export default function RealLeafletMapContainer({ plantations, onSelectPlot }: RealLeafletMapContainerProps) {
  return <LeafletMapClient plantations={plantations} onSelectPlot={onSelectPlot} />;
}
