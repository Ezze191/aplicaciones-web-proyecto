'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  title?: string;
  colorHex?: string;
  selected?: boolean;
  badgeText?: string;
}

export interface MapPolygonItem {
  id: string;
  name: string;
  colorHex?: string;
  coordinates: Array<{ lat: number; lng: number }>;
}

export interface MapHeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface InteractiveMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  heightClass?: string;
  markers?: MapMarkerItem[];
  onMarkerClick?: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  selectablePin?: { lat: number; lng: number } | null;
  pinRadiusMeters?: number;
  onPinChange?: (lat: number, lng: number, resolvedAddress?: string) => void;
  polygons?: MapPolygonItem[];
  editablePolygon?: Array<{ lat: number; lng: number }>;
  onEditablePolygonChange?: (coords: Array<{ lat: number; lng: number }>) => void;
  heatmapPoints?: MapHeatmapPoint[];
  onLocateClick?: () => void;
  showLocateButton?: boolean;
  interactive?: boolean;
}

const TORREON_DEFAULT = { lat: 25.5428, lng: -103.4068 };

let googleMapsLoaderPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const win = window as unknown as { google?: { maps?: unknown } };
  if (win.google?.maps) return Promise.resolve();
  if (googleMapsLoaderPromise) return googleMapsLoaderPromise;

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=visualization`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleMapsLoaderPromise = null;
      reject(new Error('No se pudo cargar Google Maps JS API.'));
    };
    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
}

async function reverseGeocodeNominatim(
  lat: number,
  lng: number,
): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'es' } },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      address?: {
        road?: string;
        house_number?: string;
        neighbourhood?: string;
        suburb?: string;
      };
      display_name?: string;
    };
    const road = data.address?.road;
    const num = data.address?.house_number;
    const col = data.address?.neighbourhood || data.address?.suburb;
    if (road) {
      return `${road}${num ? ` #${num}` : ''}${col ? `, ${col}` : ''}`;
    }
    return data.display_name?.split(',').slice(0, 2).join(', ');
  } catch {
    return undefined;
  }
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center = TORREON_DEFAULT,
  zoom = 14,
  heightClass = 'h-[360px]',
  markers = [],
  onMarkerClick,
  userLocation = null,
  selectablePin = null,
  pinRadiusMeters = 50,
  onPinChange,
  polygons = [],
  editablePolygon,
  onEditablePolygonChange,
  heatmapPoints = [],
  onLocateClick,
  showLocateButton = false,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const googleApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>(
    googleApiKey ? 'google' : 'leaflet',
  );
  const [mapReady, setMapReady] = useState(false);

  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onPinChangeRef = useRef(onPinChange);
  onPinChangeRef.current = onPinChange;
  const onEditablePolygonChangeRef = useRef(onEditablePolygonChange);
  onEditablePolygonChangeRef.current = onEditablePolygonChange;
  const editablePolygonRef = useRef(editablePolygon);
  editablePolygonRef.current = editablePolygon;

  // Refs for persistent instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      if (googleApiKey) {
        try {
          await loadGoogleMapsScript(googleApiKey);
          if (cancelled) return;
          setMapEngine('google');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const g = (window as any).google.maps;
          if (!mapInstanceRef.current) {
            mapInstanceRef.current = new g.Map(containerRef.current, {
              center,
              zoom,
              disableDefaultUI: !interactive,
              zoomControl: interactive,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            });

            if (interactive) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              mapInstanceRef.current.addListener('click', async (ev: any) => {
                const lat = ev.latLng.lat();
                const lng = ev.latLng.lng();

                if (onEditablePolygonChangeRef.current) {
                  const current = editablePolygonRef.current ?? [];
                  onEditablePolygonChangeRef.current([...current, { lat, lng }]);
                  return;
                }

                if (onPinChangeRef.current) {
                  const geocoder = new g.Geocoder();
                  let resolved: string | undefined;
                  try {
                    const geoRes = await geocoder.geocode({
                      location: { lat, lng },
                    });
                    resolved = geoRes?.results?.[0]?.formatted_address
                      ?.split(',')
                      .slice(0, 2)
                      .join(', ');
                  } catch {
                    resolved = await reverseGeocodeNominatim(lat, lng);
                  }
                  onPinChangeRef.current(lat, lng, resolved);
                }
              });
            }
          }
          setMapReady(true);
          return;
        } catch {
          if (!cancelled) setMapEngine('leaflet');
        }
      }

      // Leaflet + OpenStreetMap (README 10.2)
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(containerRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: interactive,
          dragging: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        if (interactive) {
          map.on('click', async (e) => {
            const { lat, lng } = e.latlng;
            if (onEditablePolygonChangeRef.current) {
              const current = editablePolygonRef.current ?? [];
              onEditablePolygonChangeRef.current([...current, { lat, lng }]);
              return;
            }
            if (onPinChangeRef.current) {
              onPinChangeRef.current(lat, lng);
              const resolved = await reverseGeocodeNominatim(lat, lng);
              if (resolved && onPinChangeRef.current) {
                onPinChangeRef.current(lat, lng, resolved);
              }
            }
          });
        }

        mapInstanceRef.current = map;
      }

      setMapReady(true);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [googleApiKey, interactive]);

  // Recenter when center prop changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    if (mapEngine === 'google') {
      mapInstanceRef.current.panTo(center);
    } else {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom, {
        animate: true,
      });
    }
  }, [center.lat, center.lng, zoom, mapReady, mapEngine]);

  // Sync markers, userLocation, selectablePin, polygons, editablePolygon, heatmap
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    let cancelled = false;

    async function renderLayers() {
      // Clear previous layers
      for (const layer of layersRef.current) {
        if (mapEngine === 'google') {
          layer.setMap(null);
        } else {
          layer.remove();
        }
      }
      layersRef.current = [];

      if (mapEngine === 'google') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = (window as any).google.maps;
        const map = mapInstanceRef.current;

        if (userLocation) {
          const userMarker = new g.Marker({
            position: userLocation,
            map,
            title: 'Tu ubicación actual',
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#155ead',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
          });
          layersRef.current.push(userMarker);
        }

        if (selectablePin) {
          const circle = new g.Circle({
            map,
            center: selectablePin,
            radius: pinRadiusMeters,
            fillColor: '#155ead',
            fillOpacity: 0.14,
            strokeColor: '#155ead',
            strokeOpacity: 0.65,
            strokeWeight: 1.5,
          });
          const pin = new g.Marker({
            position: selectablePin,
            map,
            draggable: Boolean(onPinChangeRef.current),
            title: 'Ubicación de la falla',
          });
          if (onPinChangeRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pin.addListener('dragend', async (ev: any) => {
              const lat = ev.latLng.lat();
              const lng = ev.latLng.lng();
              const resolved = await reverseGeocodeNominatim(lat, lng);
              onPinChangeRef.current?.(lat, lng, resolved);
            });
          }
          layersRef.current.push(circle, pin);
        }

        for (const m of markers) {
          const marker = new g.Marker({
            position: { lat: m.lat, lng: m.lng },
            map,
            title: m.title || m.label || '',
            label: m.badgeText
              ? {
                  text: m.badgeText,
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }
              : undefined,
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: m.selected ? 14 : 11,
              fillColor: m.colorHex || '#155ead',
              fillOpacity: 1,
              strokeColor: m.selected ? '#0e315a' : '#ffffff',
              strokeWeight: m.selected ? 3 : 2,
            },
          });
          marker.addListener('click', () => {
            onMarkerClickRef.current?.(m.id);
          });
          layersRef.current.push(marker);
        }

        for (const poly of polygons) {
          if (poly.coordinates.length < 3) continue;
          const polygon = new g.Polygon({
            paths: poly.coordinates,
            strokeColor: poly.colorHex || '#155ead',
            strokeOpacity: 0.85,
            strokeWeight: 2,
            fillColor: poly.colorHex || '#155ead',
            fillOpacity: 0.16,
            map,
          });
          layersRef.current.push(polygon);
        }

        if (editablePolygon && editablePolygon.length > 0) {
          const poly = new g.Polygon({
            paths: editablePolygon,
            strokeColor: '#0e315a',
            strokeOpacity: 0.9,
            strokeWeight: 2.5,
            fillColor: '#155ead',
            fillOpacity: 0.2,
            map,
          });
          layersRef.current.push(poly);
          for (const pt of editablePolygon) {
            const dot = new g.Marker({
              position: pt,
              map,
              icon: {
                path: g.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: '#0e315a',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
            });
            layersRef.current.push(dot);
          }
        }

        if (heatmapPoints.length > 0 && g.visualization?.HeatmapLayer) {
          const heatData = heatmapPoints.map((p) => ({
            location: new g.LatLng(p.lat, p.lng),
            weight: p.weight,
          }));
          const heatmap = new g.visualization.HeatmapLayer({
            data: heatData,
            radius: 36,
            opacity: 0.78,
            map,
          });
          layersRef.current.push(heatmap);
        }
        return;
      }

      // Leaflet rendering
      const L = (await import('leaflet')).default;
      if (cancelled || !mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      if (userLocation) {
        const userIcon = L.divIcon({
          className: 'siu-user-loc-icon',
          html: `<div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;"><span style="position:absolute;width:28px;height:28px;border-radius:9999px;background:rgba(21,94,173,0.28);"></span><span style="width:14px;height:14px;border-radius:9999px;background:#155ead;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></span></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const m = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
        })
          .bindTooltip('Estás aquí', { permanent: false, direction: 'top' })
          .addTo(map);
        layersRef.current.push(m);
      }

      if (selectablePin) {
        const circle = L.circle([selectablePin.lat, selectablePin.lng], {
          radius: pinRadiusMeters,
          color: '#155ead',
          fillColor: '#155ead',
          fillOpacity: 0.14,
          weight: 1.5,
        }).addTo(map);

        const pinIcon = L.divIcon({
          className: 'siu-pin-icon',
          html: `<div style="width:32px;height:32px;border-radius:9999px;background:#155ead;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(14,49,90,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:14px;">•</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([selectablePin.lat, selectablePin.lng], {
          icon: pinIcon,
          draggable: Boolean(onPinChangeRef.current),
        }).addTo(map);

        if (onPinChangeRef.current) {
          marker.on('dragend', async () => {
            const pos = marker.getLatLng();
            onPinChangeRef.current?.(pos.lat, pos.lng);
            const resolved = await reverseGeocodeNominatim(pos.lat, pos.lng);
            if (resolved) {
              onPinChangeRef.current?.(pos.lat, pos.lng, resolved);
            }
          });
        }
        layersRef.current.push(circle, marker);
      }

      for (const m of markers) {
        const bg = m.colorHex || '#155ead';
        const size = m.selected ? 36 : 30;
        const badgeHtml = m.badgeText
          ? `<div style="background:${bg};color:#fff;padding:4px 8px;border-radius:8px;border:2px solid #fff;font-weight:700;font-size:11px;box-shadow:0 3px 8px rgba(0,0,0,0.25);white-space:nowrap;">${m.badgeText}</div>`
          : `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:${m.selected ? '3px solid #0e315a' : '2.5px solid #ffffff'};box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">●</div>`;

        const icon = L.divIcon({
          className: 'siu-incident-marker',
          html: badgeHtml,
          iconSize: m.badgeText ? [48, 28] : [size, size],
          iconAnchor: m.badgeText ? [24, 14] : [size / 2, size / 2],
        });

        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        if (m.title) {
          marker.bindTooltip(m.title, { direction: 'top' });
        }
        marker.on('click', () => {
          onMarkerClickRef.current?.(m.id);
        });
        layersRef.current.push(marker);
      }

      for (const poly of polygons) {
        if (poly.coordinates.length < 3) continue;
        const polygon = L.polygon(
          poly.coordinates.map((c) => [c.lat, c.lng]),
          {
            color: poly.colorHex || '#155ead',
            fillColor: poly.colorHex || '#155ead',
            fillOpacity: 0.16,
            weight: 2,
          },
        )
          .bindTooltip(poly.name)
          .addTo(map);
        layersRef.current.push(polygon);
      }

      if (editablePolygon && editablePolygon.length > 0) {
        const latLngs = editablePolygon.map(
          (c) => [c.lat, c.lng] as [number, number],
        );
        const shape =
          editablePolygon.length >= 3
            ? L.polygon(latLngs, {
                color: '#0e315a',
                fillColor: '#155ead',
                fillOpacity: 0.2,
                weight: 2.5,
              }).addTo(map)
            : L.polyline(latLngs, { color: '#0e315a', weight: 2.5 }).addTo(map);
        layersRef.current.push(shape);

        for (const pt of editablePolygon) {
          const dot = L.circleMarker([pt.lat, pt.lng], {
            radius: 5,
            color: '#ffffff',
            fillColor: '#0e315a',
            fillOpacity: 1,
            weight: 2,
          }).addTo(map);
          layersRef.current.push(dot);
        }
      }

      for (const h of heatmapPoints) {
        const intensity = Math.min(1, h.weight / 6);
        const color =
          intensity > 0.7 ? '#be313b' : intensity > 0.4 ? '#ea580c' : '#f59e0b';
        const circle = L.circle([h.lat, h.lng], {
          radius: 180 + h.weight * 35,
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.25 + intensity * 0.3,
        }).addTo(map);
        layersRef.current.push(circle);
      }
    }

    void renderLayers();

    return () => {
      cancelled = true;
    };
  }, [
    mapReady,
    mapEngine,
    markers,
    userLocation,
    selectablePin,
    pinRadiusMeters,
    polygons,
    editablePolygon,
    heatmapPoints,
  ]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current && mapEngine === 'leaflet') {
        mapInstanceRef.current.remove();
      }
      mapInstanceRef.current = null;
    };
  }, [mapEngine]);

  return (
    <div
      className={`relative w-full ${heightClass} rounded-[16px] overflow-hidden border border-[#dce4ed] bg-[#e9eef0]`}
    >
      <div ref={containerRef} className="w-full h-full z-0" />

      {showLocateButton && onLocateClick && (
        <button
          type="button"
          onClick={onLocateClick}
          title="Centrar en mi ubicación GPS"
          aria-label="Centrar en mi ubicación GPS"
          className="absolute bottom-3 right-3 z-[400] bg-white hover:bg-slate-50 border border-[#dce4ed] size-10 rounded-[10px] shadow-md flex items-center justify-center text-[#155ead] cursor-pointer"
        >
          <LocateFixed className="size-5" />
        </button>
      )}

      <div className="absolute bottom-2 left-2.5 z-[400] bg-white/85 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-medium text-[#5e7085] pointer-events-none">
        {mapEngine === 'google'
          ? 'Google Maps · Torreón, Coah.'
          : 'OpenStreetMap · Torreón, Coah.'}
      </div>
    </div>
  );
};
