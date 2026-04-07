'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapComponent({ plantations }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([20, 78], 5);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Add plantation markers
    plantations.forEach(plantation => {
      let color = '#16a34a'; // green for verified
      if (plantation.status === 'pending') color = '#f59e0b'; // yellow
      if (plantation.status === 'rejected') color = '#ef4444'; // red

      const marker = L.circleMarker([plantation.latitude, plantation.longitude], {
        radius: 8,
        fillColor: color,
        color: '#000',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });

      marker.bindPopup(`
        <div style="font-size: 12px;">
          <h4>${plantation.treeType} (ID: ${plantation.id})</h4>
          <p><strong>Status:</strong> ${plantation.status}</p>
          <p><strong>Area:</strong> ${plantation.area} ha</p>
          <p><strong>NDVI:</strong> ${plantation.ndvi.toFixed(3)}</p>
          <p><strong>Credits:</strong> ${plantation.credits.toFixed(2)}</p>
          <p><strong>Farmer ID:</strong> ${plantation.farmerId}</p>
        </div>
      `);

      marker.addTo(mapInstance.current);
    });

    return () => {
      // Cleanup on unmount
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [plantations]);

  return (
    <div
      ref={mapRef}
      style={{
        height: '500px',
        width: '100%',
        borderRadius: 'var(--radius)',
      }}
    />
  );
}
