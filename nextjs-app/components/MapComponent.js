'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapComponent({ plantations, onSearch, showSearch = false }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const searchCircleRef = useRef(null);
  const [selectedPlantation, setSelectedPlantation] = useState(null);
  const [searchLocation, setSearchLocation] = useState(null);

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

      // Enhanced popup with farmer username
      const farmerName = plantation.farmer_username || plantation.farmer_id || 'Unknown Farmer';
      const popupContent = `
        <div style="font-size: 13px; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="font-size: 20px;">${plantation.tree_type?.toLowerCase().includes('mango') ? '🥭' : '🌳'}</span>
            <div>
              <h4 style="margin: 0; font-weight: bold; color: #111;">${plantation.tree_type || 'Unknown'}</h4>
              <p style="margin: 0; font-size: 11px; color: #666;">ID: ${plantation.id}</p>
            </div>
          </div>
          <div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 8px; margin-bottom: 8px; border-radius: 4px;">
            <p style="margin: 0; font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">👨‍🌾 Farmer</p>
            <p style="margin: 0; font-weight: bold; color: #15803d;">${farmerName}</p>
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

  const handleSearch = async (e) => {
    e.preventDefault();
    const searchInput = e.target.elements.searchInput;
    const query = searchInput.value.trim();
    
    if (!query) return;

    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.locations && data.locations.length > 0) {
        const location = data.locations[0];
        setSearchLocation(location);
        
        // Pan to location
        if (mapInstance.current) {
          mapInstance.current.setView([location.latitude, location.longitude], 12);
        }
        
        // Call parent's search callback if provided
        if (onSearch) {
          onSearch(location);
        }

        // Add search circle
        if (searchCircleRef.current && mapInstance.current) {
          mapInstance.current.removeLayer(searchCircleRef.current);
        }

        const circle = L.circle(
          [location.latitude, location.longitude],
          {
            color: '#3b82f6',
            fillColor: '#93c5fd',
            fillOpacity: 0.1,
            weight: 2,
            radius: 5000, // 5km radius
            dashArray: '5, 5',
          }
        ).addTo(mapInstance.current);
        searchCircleRef.current = circle;
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}
    >
      {showSearch && (
        <form onSubmit={handleSearch} style={{ padding: '12px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', zIndex: 500 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              name="searchInput"
              type="text"
              placeholder="Search location (e.g., 'Bangalore, India')"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 16px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              🔍 Search
            </button>
          </div>
        </form>
      )}
      <div
        ref={mapRef}
        style={{
          flex: 1,
          borderRadius: '0.5rem',
        }}
      />
    </div>
  );
}

