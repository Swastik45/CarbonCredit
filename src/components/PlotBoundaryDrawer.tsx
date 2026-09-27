'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Pentagon, Trash2, ZoomIn, Search, Layers } from 'lucide-react';

export type BoundaryChange = {
  geoJson: GeoJSON.Polygon | null;
  measuredAreaHectares: number | null;
  centroid: { lat: number; lng: number } | null;
};

type PlotBoundaryDrawerProps = {
  onBoundaryChange: (value: BoundaryChange) => void;
  onGpsFix?: (coords: { lat: number; lng: number }) => void;
  /** Called when reverse-geocode of live GPS returns a place label */
  onGpsPlace?: (place: { shortLabel: string; regionHint?: string | null }) => void;
  initialCenter?: { lat: number; lng: number };
  heightClassName?: string;
};

function ringAreaHa(ring: number[][]): number {
  const R = 6378137;
  const toRad = (d: number) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % ring.length];
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  const m2 = Math.abs((total * R * R) / 2);
  return Math.round((m2 / 10000) * 10000) / 10000;
}

function loadStylesheet(id: string, href: string) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).L?.Control?.Draw) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

/** Zoom so the accuracy circle fills most of the view (field-scale when GPS is good). */
function zoomForAccuracyMeters(accuracy: number): number {
  if (accuracy <= 15) return 19;
  if (accuracy <= 40) return 18;
  if (accuracy <= 100) return 17;
  if (accuracy <= 500) return 15;
  return 13; // city-level Wi‑Fi / IP estimate
}

export default function PlotBoundaryDrawer({
  onBoundaryChange,
  onGpsFix,
  onGpsPlace,
  initialCenter = { lat: 27.7172, lng: 85.324 },
  heightClassName = 'h-[min(70vh,640px)] min-h-[420px]',
}: PlotBoundaryDrawerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const gpsLayerRef = useRef<any>(null);
  const satelliteLayerRef = useRef<any>(null);
  const streetLayerRef = useRef<any>(null);
  const Lref = useRef<any>(null);
  const onBoundaryChangeRef = useRef(onBoundaryChange);
  const onGpsFixRef = useRef(onGpsFix);
  const onGpsPlaceRef = useRef(onGpsPlace);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [measuredHa, setMeasuredHa] = useState<number | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [gpsLocking, setGpsLocking] = useState(false);
  const [mapTileType, setMapTileType] = useState<'SATELLITE' | 'STREET'>('SATELLITE');
  const watchIdRef = useRef<number | null>(null);
  const gpsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onBoundaryChangeRef.current = onBoundaryChange;
  onGpsFixRef.current = onGpsFix;
  onGpsPlaceRef.current = onGpsPlace;

  const stopGpsWatch = () => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsTimerRef.current) {
      clearTimeout(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }
    setGpsLocking(false);
  };

  useEffect(() => {
    return () => stopGpsWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapRef.current || mapInstance.current) return;

      try {
        loadStylesheet('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        loadStylesheet('leaflet-draw-css', 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css');

        const Lmod = await import('leaflet');
        const L = Lmod.default || Lmod;
        (window as any).L = L;
        Lref.current = L;

        await loadScript('leaflet-draw-js', 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js');

        if (cancelled || !mapRef.current) return;

        const map = L.map(mapRef.current, {
          center: [initialCenter.lat, initialCenter.lng],
          zoom: 16,
          zoomControl: true,
          maxZoom: 19,
        });
        mapInstance.current = map;

        const satellite = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Esri World Imagery',
            maxZoom: 19,
            maxNativeZoom: 18,
          }
        );
        const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        });
        satelliteLayerRef.current = satellite;
        streetLayerRef.current = street;
        satellite.addTo(map);

        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        const gpsLayer = new L.FeatureGroup();
        map.addLayer(gpsLayer);
        gpsLayerRef.current = gpsLayer;

        const drawControl = new (L as any).Control.Draw({
          position: 'topright',
          draw: {
            polygon: false,
            polyline: false,
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
          },
          edit: {
            featureGroup: drawnItems,
            remove: true,
          },
        });
        map.addControl(drawControl);

        const emitFromLayer = (layer: any) => {
          const gj = layer.toGeoJSON();
          const geometry = gj.geometry as GeoJSON.Polygon;
          const ring = geometry.coordinates[0];
          const ha = ringAreaHa(ring);
          let sumLng = 0;
          let sumLat = 0;
          const n = ring.length > 1 ? ring.length - 1 : ring.length;
          for (let i = 0; i < n; i++) {
            sumLng += ring[i][0];
            sumLat += ring[i][1];
          }
          setMeasuredHa(ha);
          onBoundaryChangeRef.current({
            geoJson: geometry,
            measuredAreaHectares: ha,
            centroid: { lat: sumLat / n, lng: sumLng / n },
          });
        };

        const Draw = (L as any).Draw;
        map.on(Draw.Event.CREATED, (e: any) => {
          setDrawing(false);
          drawnItems.clearLayers();
          drawnItems.addLayer(e.layer);
          emitFromLayer(e.layer);
        });

        map.on(Draw.Event.EDITED, (e: any) => {
          e.layers.eachLayer((layer: any) => emitFromLayer(layer));
        });

        map.on(Draw.Event.DELETED, () => {
          setMeasuredHa(null);
          onBoundaryChangeRef.current({ geoJson: null, measuredAreaHectares: null, centroid: null });
        });

        setTimeout(() => {
          map.invalidateSize();
          setReady(true);
        }, 80);
        setTimeout(() => map.invalidateSize(), 400);
      } catch (err: any) {
        if (!cancelled) setMapError(err?.message || 'Failed to load map drawing tools.');
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [initialCenter.lat, initialCenter.lng]);

  const showGpsOnMap = (lat: number, lng: number, accuracy: number) => {
    const L = Lref.current;
    const map = mapInstance.current;
    const gpsLayer = gpsLayerRef.current;
    if (!L || !map || !gpsLayer) return;

    gpsLayer.clearLayers();

    const radius = Math.max(accuracy || 30, 5);
    L.circle([lat, lng], {
      radius,
      color: '#3b69fc',
      weight: 2,
      fillColor: '#3b69fc',
      fillOpacity: 0.15,
    }).addTo(gpsLayer);

    L.circleMarker([lat, lng], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#3b69fc',
      fillOpacity: 1,
    })
      .bindTooltip('Your GPS position — draw the plot around this pin', { permanent: false })
      .addTo(gpsLayer);

    const zoom = zoomForAccuracyMeters(accuracy);
    map.setView([lat, lng], zoom);
    map.invalidateSize();
  };

  const flyTo = (lat: number, lng: number, zoom = 17) => {
    const map = mapInstance.current;
    if (!map) return;
    map.setView([lat, lng], zoom);
    map.invalidateSize();
  };

  const applyAcceptedFix = async (lat: number, lng: number, accuracy: number, source: string) => {
    showGpsOnMap(lat, lng, accuracy);
    onGpsFixRef.current?.({ lat, lng });

    let placeLine = '';
    try {
      const geoRes = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
      const geo = await geoRes.json();
      if (geoRes.ok && geo.shortLabel) {
        placeLine = ` · ${geo.shortLabel}`;
        if (geo.regionHint) placeLine += ` (${geo.regionHint})`;
        onGpsPlaceRef.current?.({ shortLabel: geo.shortLabel, regionHint: geo.regionHint });
      }
    } catch {
      // ignore
    }

    setGpsStatus(
      `✓ Real GPS locked (±${Math.round(accuracy)} m) · ${lat.toFixed(6)}, ${lng.toFixed(6)}${placeLine} · ${source}`
    );
  };

  /**
   * Real GPS: watchPosition + enableHighAccuracy, ignore first coarse Wi‑Fi hits,
   * keep the best sample until accuracy is good enough (or timeout).
   */
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported in this browser.');
      return;
    }

    stopGpsWatch();
    setGpsLocking(true);
    setGpsStatus('Waiting for satellite GPS… ignore Wi‑Fi guesses. Stay outdoors 15–45s with location ON.');

    type Sample = { lat: number; lng: number; accuracy: number; at: number };
    let best: Sample | null = null;
    const GOOD_M = 40; // accept as real GPS
    const OK_M = 100; // acceptable field-ish
    const MAX_WAIT_MS = 45000;

    const consider = (coords: GeolocationCoordinates) => {
      const accuracy = coords.accuracy ?? 9999;
      const sample: Sample = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy,
        at: Date.now(),
      };

      if (!best || sample.accuracy < best.accuracy) {
        best = sample;
      }

      // Live preview of improving fix (even while waiting)
      showGpsOnMap(best.lat, best.lng, best.accuracy);
      setGpsStatus(
        `Listening for GPS… best so far ±${Math.round(best.accuracy)} m at ${best.lat.toFixed(5)}, ${best.lng.toFixed(5)}. Need ≤${GOOD_M} m for lock.`
      );

      if (best.accuracy <= GOOD_M) {
        const accepted = best;
        stopGpsWatch();
        void applyAcceptedFix(accepted.lat, accepted.lng, accepted.accuracy, 'satellite-grade');
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => consider(pos.coords),
      (err) => {
        stopGpsWatch();
        setGpsStatus(
          `GPS error: ${err.message}. Allow precise location, use outdoors, or Search place and draw on the map.`
        );
      },
      {
        enableHighAccuracy: true, // request real GNSS when available
        maximumAge: 0,
        timeout: MAX_WAIT_MS,
      }
    );

    gpsTimerRef.current = setTimeout(() => {
      const finalBest = best;
      stopGpsWatch();

      if (!finalBest) {
        setGpsStatus('No GPS reading. Enable location permission and try outdoors on a phone.');
        return;
      }

      if (finalBest.accuracy <= OK_M) {
        void applyAcceptedFix(
          finalBest.lat,
          finalBest.lng,
          finalBest.accuracy,
          finalBest.accuracy <= GOOD_M ? 'satellite-grade' : 'usable (±100 m)'
        );
        return;
      }

      // Reject coarse Wi‑Fi / IP so we don't "catch" junk city locations
      setGpsStatus(
        `Rejected fake/Wi‑Fi location (±${Math.round(finalBest.accuracy)} m at ${finalBest.lat.toFixed(5)}, ${finalBest.lng.toFixed(5)}). That is not precise GPS. Use a phone outdoors, or Search place and draw on the map.`
      );
      // Clear misleading pin after reject
      gpsLayerRef.current?.clearLayers();
    }, MAX_WAIT_MS);
  };

  const searchPlace = async () => {
    const q = placeQuery.trim();
    if (q.length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      const first = data.results?.[0];
      if (!first) throw new Error('No places found. Try a clearer name, e.g. city + Nepal.');
      flyTo(first.lat, first.lng, 16);
      setGpsStatus(
        `Map jumped to search result (not GPS): ${first.lat.toFixed(5)}, ${first.lng.toFixed(5)} · ${first.label.slice(0, 80)} — zoom in and draw your plot here.`
      );
      onGpsFixRef.current?.({ lat: first.lat, lng: first.lng });
      onGpsPlaceRef.current?.({ shortLabel: q, regionHint: null });
    } catch (err: any) {
      setSearchError(err?.message || 'Place search failed');
    } finally {
      setSearching(false);
    }
  };

  const setViewMode = (mode: 'SATELLITE' | 'STREET') => {
    const map = mapInstance.current;
    const sat = satelliteLayerRef.current;
    const street = streetLayerRef.current;
    if (!map || !sat || !street) return;
    if (mode === 'SATELLITE') {
      if (map.hasLayer(street)) map.removeLayer(street);
      if (!map.hasLayer(sat)) sat.addTo(map);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(street)) street.addTo(map);
    }
    setMapTileType(mode);
  };

  const zoomCloser = () => {
    const map = mapInstance.current;
    if (!map) return;
    map.setZoom(Math.min(19, (map.getZoom() || 16) + 1));
  };

  const startDrawPolygon = () => {
    const L = Lref.current;
    const map = mapInstance.current;
    if (!L || !map || !(L as any).Draw) return;
    setDrawing(true);
    new (L as any).Draw.Polygon(map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: { color: '#3b69fc', weight: 3, fillOpacity: 0.25 },
    }).enable();
  };

  const clearBoundary = () => {
    drawnItemsRef.current?.clearLayers();
    setMeasuredHa(null);
    setDrawing(false);
    onBoundaryChangeRef.current({ geoJson: null, measuredAreaHectares: null, centroid: null });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        Search any place, switch <strong>Satellite / Street</strong> view, then draw the boundary.
        GPS waits for a precise fix and rejects coarse Wi‑Fi guesses (best on a phone outdoors).
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={placeQuery}
          onChange={(e) => setPlaceQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void searchPlace();
            }
          }}
          placeholder="Search any place (city, village, Nepal)"
          className="flex-1 input-field text-sm py-3"
        />
        <button
          type="button"
          onClick={() => void searchPlace()}
          disabled={searching || !ready}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-[#0b1630] border border-slate-300 dark:border-gray-700 text-sm font-bold disabled:opacity-50"
        >
          <Search className="w-4 h-4 text-[#3b69fc]" />
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {searchError && <p className="text-sm font-semibold text-red-600">{searchError}</p>}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-gray-200 dark:bg-[#07122a] border border-slate-300 dark:border-gray-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('SATELLITE')}
              disabled={!ready}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                mapTileType === 'SATELLITE'
                  ? 'bg-[#3b69fc] text-white'
                  : 'text-black dark:text-white hover:text-[#3b69fc]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setViewMode('STREET')}
              disabled={!ready}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                mapTileType === 'STREET'
                  ? 'bg-[#3b69fc] text-white'
                  : 'text-black dark:text-white hover:text-[#3b69fc]'
              }`}
            >
              Street
            </button>
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={gpsLocking}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-[#0b1630] border border-slate-300 dark:border-gray-700 text-sm font-bold text-black dark:text-white hover:border-[#3b69fc] transition-colors disabled:opacity-50"
          >
            <Crosshair className="w-4 h-4 text-[#3b69fc]" />
            {gpsLocking ? 'Locking GPS…' : 'Use my GPS'}
          </button>
          {gpsLocking && (
            <button
              type="button"
              onClick={stopGpsWatch}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-red-400 text-sm font-bold text-red-600"
            >
              Cancel GPS
            </button>
          )}
          <button
            type="button"
            onClick={zoomCloser}
            disabled={!ready}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-[#0b1630] border border-slate-300 dark:border-gray-700 text-sm font-bold text-black dark:text-white hover:border-[#3b69fc] transition-colors disabled:opacity-50"
          >
            <ZoomIn className="w-4 h-4 text-[#3b69fc]" />
            Zoom in
          </button>
          <button
            type="button"
            onClick={startDrawPolygon}
            disabled={!ready}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-[#3b69fc] text-white hover:brightness-110 transition-colors disabled:opacity-50"
          >
            <Pentagon className="w-4 h-4" />
            {drawing ? 'Tap field corners…' : 'Draw plot boundary'}
          </button>
          <button
            type="button"
            onClick={clearBoundary}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-[#0b1630] border border-slate-300 dark:border-gray-700 text-sm font-bold text-black dark:text-white hover:border-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            Clear
          </button>
        </div>

        <div className="text-sm font-semibold text-black dark:text-slate-200">
          {measuredHa != null ? (
            <span className="text-emerald-700 dark:text-emerald-400">Measured · {measuredHa} ha</span>
          ) : (
            <span className="opacity-70">Double‑tap / double‑click to finish polygon</span>
          )}
        </div>
      </div>

      {mapError && <p className="text-sm font-semibold text-red-600">{mapError}</p>}
      {gpsStatus && (
        <p className="text-sm font-semibold text-[#3b69fc] leading-relaxed whitespace-pre-wrap">{gpsStatus}</p>
      )}

      <div className="relative">
        <div
          ref={mapRef}
          className={`w-full ${heightClassName} rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-gray-600 shadow-lg z-0 bg-slate-200 dark:bg-[#07122a]`}
        />
        <div className="absolute bottom-3 left-3 z-[500] bg-white/95 dark:bg-[#07122a]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-300 dark:border-gray-700 text-[11px] font-bold shadow-md">
          View: {mapTileType === 'SATELLITE' ? 'Satellite imagery' : 'Street map'}
        </div>
      </div>
    </div>
  );
}
