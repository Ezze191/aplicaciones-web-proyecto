'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';

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
  editableCircle?: {
    center: { lat: number; lng: number };
    radiusMeters: number;
  } | null;
  onEditableCircleChange?: (circle: {
    center: { lat: number; lng: number };
    radiusMeters: number;
  }) => void;
  onMapClick?: (lat: number, lng: number) => void;
  heatmapPoints?: MapHeatmapPoint[];
  onLocateClick?: () => void;
  showLocateButton?: boolean;
  showSearchBar?: boolean;
  searchPlaceholder?: string;
  onSearchSelect?: (lat: number, lng: number, address: string) => void;
  interactive?: boolean;
}

interface PlaceSuggestion {
  id: string;
  primaryText: string;
  secondaryText: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

const TORREON_DEFAULT = { lat: 25.5428, lng: -103.4068 };

/**
 * Icono SVG minimalista y profesional de "Tu ubicación actual" (pin gota azul marino
 * con silueta de persona y sombra suave en la base) para distinguirlo claramente
 * de los círculos de incidencias por dependencia.
 */
const USER_LOCATION_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48" fill="none">
  <ellipse cx="20" cy="44" rx="8" ry="3" fill="#0e315a" fill-opacity="0.22"/>
  <path d="M20 3C11.716 3 5 9.716 5 18C5 28.4 17.6 40.6 19.3 42.2C19.7 42.58 20.3 42.58 20.7 42.2C22.4 40.6 35 28.4 35 18C35 9.716 28.284 3 20 3Z" fill="#0e315a" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="20" cy="14.2" r="3.6" fill="#ffffff"/>
  <path d="M13.5 24.2C13.9 20.8 16.6 18.8 20 18.8C23.4 18.8 26.1 20.8 26.5 24.2C26.58 24.85 26.07 25.4 25.42 25.4H14.58C13.93 25.4 13.42 24.85 13.5 24.2Z" fill="#ffffff"/>
</svg>`;

const USER_LOCATION_PIN_DATA_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  USER_LOCATION_PIN_SVG,
)}`;

async function searchPlacesTorreon(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'mx',
    limit: '6',
    viewbox: '-103.56,25.66,-103.26,25.44',
    bounded: '0',
    'accept-language': 'es',
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      signal,
      headers: { 'Accept-Language': 'es' },
    },
  );
  if (!res.ok) return [];

  const rows = (await res.json()) as Array<{
    place_id: number | string;
    lat: string;
    lon: string;
    name?: string;
    display_name: string;
    address?: {
      road?: string;
      house_number?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      state?: string;
    };
  }>;

  return rows.map((row) => {
    const road = row.address?.road;
    const num = row.address?.house_number;
    const col = row.address?.neighbourhood || row.address?.suburb;
    const city = row.address?.city || row.address?.town || 'Torreón';
    const state = row.address?.state || 'Coahuila';

    const primaryText =
      row.name?.trim() ||
      (road ? `${road}${num ? ` #${num}` : ''}` : row.display_name.split(',')[0]);
    const secondaryParts = [
      road && row.name && row.name !== road
        ? `${road}${num ? ` #${num}` : ''}`
        : null,
      col,
      city,
      state,
    ].filter(Boolean);
    const secondaryText =
      secondaryParts.length > 0
        ? secondaryParts.join(', ')
        : row.display_name.split(',').slice(1, 4).join(', ').trim();

    const fullAddress = [
      road ? `${road}${num ? ` #${num}` : ''}` : primaryText,
      col,
      city,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      id: String(row.place_id),
      primaryText,
      secondaryText,
      fullAddress: fullAddress || row.display_name,
      lat: Number(row.lat),
      lng: Number(row.lon),
    };
  });
}

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
  editableCircle = null,
  onEditableCircleChange,
  onMapClick,
  heatmapPoints = [],
  onLocateClick,
  showLocateButton = false,
  showSearchBar = false,
  searchPlaceholder = 'Buscar calle, colonia o lugar en Torreón...',
  onSearchSelect,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const googleApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
  const [googleAuthFailed, setGoogleAuthFailed] = useState(false);
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>(
    googleApiKey ? 'google' : 'leaflet',
  );
  const [mapReady, setMapReady] = useState(false);

  // Google Maps-style floating street autocomplete state
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const onSearchSelectRef = useRef(onSearchSelect);
  onSearchSelectRef.current = onSearchSelect;

  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onPinChangeRef = useRef(onPinChange);
  onPinChangeRef.current = onPinChange;
  const onEditablePolygonChangeRef = useRef(onEditablePolygonChange);
  onEditablePolygonChangeRef.current = onEditablePolygonChange;
  const onEditableCircleChangeRef = useRef(onEditableCircleChange);
  onEditableCircleChangeRef.current = onEditableCircleChange;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const editablePolygonRef = useRef(editablePolygon);
  editablePolygonRef.current = editablePolygon;

  // Refs for persistent instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const win = window as unknown as { gm_authFailure?: () => void };
    const previousAuthFailure = win.gm_authFailure;

    win.gm_authFailure = () => {
      if (previousAuthFailure) previousAuthFailure();
      if (cancelled) return;
      mapInstanceRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setMapReady(false);
      setMapEngine('leaflet');
      setGoogleAuthFailed(true);
    };

    async function init() {
      if (!containerRef.current) return;

      if (googleApiKey && !googleAuthFailed) {
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

                if (onMapClickRef.current) {
                  onMapClickRef.current(lat, lng);
                  return;
                }

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
            if (onMapClickRef.current) {
              onMapClickRef.current(lat, lng);
              return;
            }
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
      win.gm_authFailure = previousAuthFailure;
    };
  }, [googleApiKey, googleAuthFailed, interactive]);

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
            zIndex: 999,
            icon: {
              url: USER_LOCATION_PIN_DATA_URL,
              scaledSize: new g.Size(36, 44),
              anchor: new g.Point(18, 41),
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

        if (editableCircle) {
          const canDragCircle = Boolean(onEditableCircleChangeRef.current);
          const circle = new g.Circle({
            map,
            center: editableCircle.center,
            radius: editableCircle.radiusMeters,
            strokeColor: '#0e315a',
            strokeOpacity: 0.9,
            strokeWeight: 2.5,
            fillColor: '#155ead',
            fillOpacity: 0.2,
            draggable: canDragCircle,
            editable: canDragCircle,
            clickable: canDragCircle,
          });
          if (canDragCircle) {
            circle.addListener('dragend', () => {
              const c = circle.getCenter();
              if (!c) return;
              onEditableCircleChangeRef.current?.({
                center: { lat: c.lat(), lng: c.lng() },
                radiusMeters: Math.round(circle.getRadius()),
              });
            });
            circle.addListener('radius_changed', () => {
              const nextR = Math.round(circle.getRadius());
              if (Math.abs(nextR - editableCircle.radiusMeters) < 5) return;
              const c = circle.getCenter();
              if (!c) return;
              onEditableCircleChangeRef.current?.({
                center: { lat: c.lat(), lng: c.lng() },
                radiusMeters: Math.min(5000, Math.max(200, nextR)),
              });
            });
          }
          const centerDot = new g.Marker({
            position: editableCircle.center,
            map,
            draggable: canDragCircle,
            title: 'Arrastra para mover la geocerca',
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: 6.5,
              fillColor: '#0e315a',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2.5,
            },
          });
          if (canDragCircle) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            centerDot.addListener('dragend', (ev: any) => {
              onEditableCircleChangeRef.current?.({
                center: { lat: ev.latLng.lat(), lng: ev.latLng.lng() },
                radiusMeters: editableCircle.radiusMeters,
              });
            });
          }
          layersRef.current.push(circle, centerDot);
        }

        if (editablePolygon && editablePolygon.length > 0) {
          const canDragPoly = Boolean(onEditablePolygonChangeRef.current);
          const poly = new g.Polygon({
            paths: editablePolygon,
            strokeColor: '#0e315a',
            strokeOpacity: 0.9,
            strokeWeight: 2.5,
            fillColor: '#155ead',
            fillOpacity: 0.2,
            draggable: canDragPoly && editablePolygon.length >= 3,
            clickable: canDragPoly && editablePolygon.length >= 3,
            map,
          });
          if (canDragPoly && editablePolygon.length >= 3) {
            poly.addListener('dragend', () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const nextCoords = poly.getPath().getArray().map((pt: any) => ({
                lat: pt.lat(),
                lng: pt.lng(),
              }));
              onEditablePolygonChangeRef.current?.(nextCoords);
            });
          }
          layersRef.current.push(poly);
          editablePolygon.forEach((pt, idx) => {
            const dot = new g.Marker({
              position: pt,
              map,
              draggable: canDragPoly,
              title: 'Arrastra este vértice para ajustar el área',
              icon: {
                path: g.SymbolPath.CIRCLE,
                scale: 5.5,
                fillColor: '#0e315a',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
            });
            if (canDragPoly) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot.addListener('dragend', (ev: any) => {
                const current = editablePolygonRef.current ?? [];
                const updated = current.map((item, i) =>
                  i === idx
                    ? { lat: ev.latLng.lat(), lng: ev.latLng.lng() }
                    : item,
                );
                onEditablePolygonChangeRef.current?.(updated);
              });
            }
            layersRef.current.push(dot);
          });
        }

        if (heatmapPoints.length > 0 && g.visualization?.HeatmapLayer) {
          const heatData = heatmapPoints.map((p) => ({
            location: new g.LatLng(p.lat, p.lng),
            weight: p.weight,
          }));
          const heatmap = new g.visualization.HeatmapLayer({
            data: heatData,
            radius: 48,
            opacity: 0.74,
            gradient: [
              'rgba(14, 165, 233, 0)',
              'rgba(14, 165, 233, 0.45)',
              'rgba(16, 185, 129, 0.65)',
              'rgba(250, 204, 21, 0.8)',
              'rgba(249, 115, 22, 0.9)',
              'rgba(220, 38, 38, 1)',
            ],
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
          html: `<div style="width:36px;height:44px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 6px rgba(14,49,90,0.28));">${USER_LOCATION_PIN_SVG.replace('width="40" height="48"', 'width="36" height="44"')}</div>`,
          iconSize: [36, 44],
          iconAnchor: [18, 41],
        });
        const m = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 900,
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

      if (editableCircle) {
        const canDragCircle = Boolean(onEditableCircleChangeRef.current);
        const circle = L.circle(
          [editableCircle.center.lat, editableCircle.center.lng],
          {
            radius: editableCircle.radiusMeters,
            color: '#0e315a',
            fillColor: '#155ead',
            fillOpacity: 0.2,
            weight: 2.5,
            interactive: false,
          },
        ).addTo(map);
        const centerIcon = L.divIcon({
          className: 'siu-circle-center-handle',
          html: `<div style="width:16px;height:16px;border-radius:9999px;background:#0e315a;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(14,49,90,0.4);cursor:grab;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const centerDot = L.marker(
          [editableCircle.center.lat, editableCircle.center.lng],
          {
            icon: centerIcon,
            draggable: canDragCircle,
          },
        ).addTo(map);
        if (canDragCircle) {
          centerDot.on('dragend', () => {
            const pos = centerDot.getLatLng();
            onEditableCircleChangeRef.current?.({
              center: { lat: pos.lat, lng: pos.lng },
              radiusMeters: editableCircle.radiusMeters,
            });
          });
        }
        layersRef.current.push(circle, centerDot);
      }

      if (editablePolygon && editablePolygon.length > 0) {
        const canDragPoly = Boolean(onEditablePolygonChangeRef.current);
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
                interactive: false,
              }).addTo(map)
            : L.polyline(latLngs, {
                color: '#0e315a',
                weight: 2.5,
                interactive: false,
              }).addTo(map);
        layersRef.current.push(shape);

        editablePolygon.forEach((pt, idx) => {
          const vertexIcon = L.divIcon({
            className: 'siu-poly-vertex-handle',
            html: `<div style="width:14px;height:14px;border-radius:9999px;background:#0e315a;border:2px solid #ffffff;box-shadow:0 2px 5px rgba(14,49,90,0.35);cursor:grab;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          const dot = L.marker([pt.lat, pt.lng], {
            icon: vertexIcon,
            draggable: canDragPoly,
          }).addTo(map);
          if (canDragPoly) {
            dot.on('dragend', () => {
              const pos = dot.getLatLng();
              const current = editablePolygonRef.current ?? [];
              const updated = current.map((item, i) =>
                i === idx ? { lat: pos.lat, lng: pos.lng } : item,
              );
              onEditablePolygonChangeRef.current?.(updated);
            });
          }
          layersRef.current.push(dot);
        });
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
    editableCircle,
    heatmapPoints,
  ]);

  useEffect(() => {
    if (!showSearchBar) return;
    const handleOutsideClick = (ev: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(ev.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSearchBar]);

  useEffect(() => {
    if (!showSearchBar) return;
    const q = searchText.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlacesTorreon(q, controller.signal);
        setSuggestions(results);
        setHighlightedIdx(-1);
        setDropdownOpen(true);
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, showSearchBar]);

  const handleSelectSuggestion = (item: PlaceSuggestion) => {
    setSearchText(item.primaryText);
    setDropdownOpen(false);
    setSuggestions([]);

    if (mapReady && mapInstanceRef.current) {
      if (mapEngine === 'google') {
        mapInstanceRef.current.panTo({ lat: item.lat, lng: item.lng });
        mapInstanceRef.current.setZoom(16);
      } else {
        mapInstanceRef.current.setView([item.lat, item.lng], 16, {
          animate: true,
        });
      }
    }

    if (onSearchSelectRef.current) {
      onSearchSelectRef.current(item.lat, item.lng, item.fullAddress);
    }
    if (onPinChangeRef.current) {
      onPinChangeRef.current(item.lat, item.lng, item.fullAddress);
    }
  };

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

      {/* Buscador flotante estilo Google Maps con autocompletado de calles */}
      {showSearchBar && (
        <div
          ref={searchBoxRef}
          className={`absolute top-3 right-3 sm:max-w-[380px] z-[500] ${
            mapEngine === 'google' ? 'left-3' : 'left-14'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-[0_6px_22px_rgba(14,49,90,0.16)] border border-[#dce4ed] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 h-11">
              <Search className="size-4 text-[#155ead] shrink-0" />
              <input
                type="text"
                value={searchText}
                onFocus={() => {
                  if (suggestions.length > 0) setDropdownOpen(true);
                }}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (!dropdownOpen || suggestions.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIdx((prev) =>
                      prev < suggestions.length - 1 ? prev + 1 : 0,
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIdx((prev) =>
                      prev > 0 ? prev - 1 : suggestions.length - 1,
                    );
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const picked =
                      suggestions[highlightedIdx >= 0 ? highlightedIdx : 0];
                    if (picked) handleSelectSuggestion(picked);
                  } else if (e.key === 'Escape') {
                    setDropdownOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                aria-label="Buscar calle o ubicación en el mapa"
                className="w-full bg-transparent text-[13px] text-[#172b43] placeholder:text-[#5e7085] outline-none"
              />
              {isSearching && (
                <Loader2 className="size-4 text-[#155ead] animate-spin shrink-0" />
              )}
              {searchText && !isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('');
                    setSuggestions([]);
                    setDropdownOpen(false);
                  }}
                  aria-label="Limpiar búsqueda"
                  className="p-1 rounded-full text-[#5e7085] hover:bg-slate-100 hover:text-[#172b43] cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {dropdownOpen && searchText.trim().length >= 2 && (
              <div className="border-t border-[#eef2f6] max-h-[240px] overflow-y-auto bg-white">
                {suggestions.length === 0 && !isSearching ? (
                  <p className="px-4 py-3 text-xs text-[#5e7085]">
                    No se encontraron coincidencias para &ldquo;{searchText}&rdquo;.
                  </p>
                ) : (
                  suggestions.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                        idx === highlightedIdx
                          ? 'bg-[#edf5ff]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <MapPin className="size-4 text-[#155ead] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#172b43] truncate">
                          {item.primaryText}
                        </p>
                        {item.secondaryText && (
                          <p className="text-[11px] text-[#5e7085] truncate">
                            {item.secondaryText}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showLocateButton && onLocateClick && (
        <button
          type="button"
          onClick={onLocateClick}
          title="Centrar en mi ubicación GPS"
          aria-label="Centrar en mi ubicación GPS"
          className="absolute bottom-9 left-3 z-[400] bg-white hover:bg-slate-50 border border-[#dce4ed] size-10 rounded-[10px] shadow-md flex items-center justify-center text-[#155ead] cursor-pointer"
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
