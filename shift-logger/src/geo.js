// ════════════════════════════════════════════════════════════════
// Geolocation helpers for the work-area lock (geofence).
// ════════════════════════════════════════════════════════════════

// Great-circle distance between two lat/lng points, in metres.
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // earth radius (m)
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Promise wrapper around the browser Geolocation API.
// Rejects with the native GeolocationPositionError (err.code: 1=denied, 2=unavailable, 3=timeout)
// or an Error('unsupported') when the API is missing.
export function getPosition({ timeout = 12000, maximumAge = 30000, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      err => reject(err),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge },
    );
  });
}

// Human-friendly distance label.
export function fmtDist(m) {
  if (m == null || Number.isNaN(m)) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

// Radius presets offered in the setup UI.
export const RADIUS_PRESETS = [
  { m: 200, label: '200 m' },
  { m: 500, label: '500 m' },
  { m: 1000, label: '1 km' },
  { m: 1500, label: '1.5 km' },
  { m: 5000, label: '5 km' },
  { m: 25000, label: 'City (25 km)' },
];
