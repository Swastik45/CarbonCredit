'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapComponent({ plantations }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [selectedPlantation, setSelectedPlantation] = useState(null);

  useEffect(() => {
    if (!mapRef.current || !plantations.length) return;

    // Initialize map if not already done
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([20, 78], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);

      // Add zoom controls
      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);

      // Add scale control
      L.control.scale().addTo(mapInstance.current);
    }

    // Clear old markers
    markersRef.current.forEach(marker => mapInstance.current.removeLayer(marker));
    markersRef.current = [];

    // Add new markers
    plantations.forEach(plantation => {
      let color = '#16a34a'; // green for verified
      let icon = '✓';
      if (plantation.status === 'pending') {
        color = '#f59e0b'; // yellow
        icon = '⏳';
      }
      if (plantation.status === 'rejected') {
        color = '#ef4444'; // red
        icon = '✕';
      }

      const marker = L.circleMarker([plantation.latitude, plantation.longitude], {
        radius: 10,
        fillColor: color,
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.85,
      });

      const popupContent = `
        <div style="font-size: 13px; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="font-size: 20px;">${plantation.tree_type?.toLowerCase().includes('mango') ? '🥭' : '🌳'}</span>
            <div>
              <h4 style="margin: 0; font-weight: bold; color: #111;">${plantation.tree_type || 'Unknown'}</h4>
              <p style="margin: 0; font-size: 11px; color: #666;">ID: ${plantation.id}</p>
            </div>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <p style="margin: 0; font-size: 11px; color: #999; text-transform: uppercase; font-weight: bold;">Status</p>
              <p style="margin: 0; font-weight: bold; color: ${color};">${plantation.status}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 11px; color: #999; text-transform: uppercase; font-weight: bold;">Area</p>
              <p style="margin: 0; font-weight: bold;">${plantation.area || 0} ha</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 11px; color: #999; text-transform: uppercase; font-weight: bold;">NDVI</p>
              <p style="margin: 0; font-weight: bold; color: #059669;">${(plantation.ndvi || 0).toFixed(3)}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 11px; color: #999; text-transform: uppercase; font-weight: bold;">Credits</p>
              <p style="margin: 0; font-weight: bold;">${(plantation.credits || 0).toFixed(1)}</p>
            </div>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #666;">📍 ${plantation.latitude?.toFixed(4)}, ${plantation.longitude?.toFixed(4)}</p>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('mouseover', function() {
        this.openPopup();
        this.setRadius(14);
      });
      marker.on('mouseout', function() {
        this.closePopup();
        this.setRadius(10);
      });

      marker.addTo(mapInstance.current);
      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (markersRef.current.length > 0) {
      const group = new L.featureGroup(markersRef.current);
      mapInstance.current.fitBounds(group.getBounds().pad(0.1), { maxZoom: 12 });
    }

    return () => {
      // Don't remove map on unmount for persistence
    };
  }, [plantations]);

  return (
    <div
      ref={mapRef}
      style={{
        height: '100%',
        width: '100%',
        borderRadius: '0.5rem',
      }}
    />
  );
}
