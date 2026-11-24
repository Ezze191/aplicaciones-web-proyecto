/**
 * Utilidades geoespaciales para la Zona Metropolitana de Torreón / La Laguna.
 */

export const TORREON_BOUNDS = {
  minLat: 25.4,
  maxLat: 25.7,
  minLng: -103.6,
  maxLng: -103.2,
  centerLat: 25.5428,
  centerLng: -103.4068,
};

export function isWithinTorreonJurisdiction(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= TORREON_BOUNDS.minLat &&
    lat <= TORREON_BOUNDS.maxLat &&
    lng >= TORREON_BOUNDS.minLng &&
    lng <= TORREON_BOUNDS.maxLng
  );
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateEtaMinutes(distanceKm: number): number {
  const avgUrbanSpeedKmH = 24;
  return Math.max(2, Math.round((distanceKm / avgUrbanSpeedKmH) * 60));
}
