// ════════════════════════════════════════════════════════════════
// Per-device identity for laptop binding.
// Browsers can't read a real MAC address, so each device gets a stable
// random id stored locally (persists until the browser's data is cleared).
// The CEO registers id → profile; the CSR app then locks to that profile.
// ════════════════════════════════════════════════════════════════
const ID_KEY = 'sl_device_id';

export function getDeviceId() {
  let id = null;
  try { id = localStorage.getItem(ID_KEY); } catch {}
  if (!id) {
    id = (crypto?.randomUUID ? crypto.randomUUID() : 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
    try { localStorage.setItem(ID_KEY, id); } catch {}
  }
  return id;
}

// Short, human-friendly code shown on the block screen so the CEO can match
// the laptop to the row in the console (e.g. "A3F9-C1").
export function getDeviceCode(id = getDeviceId()) {
  const hex = String(id).replace(/[^a-z0-9]/gi, '').toUpperCase();
  return hex.slice(0, 4) + '-' + hex.slice(4, 6);
}

// ── Legal, permission-free signals about the device opening the app ──
// Helps the CEO recognise an unexpected (pending) device. No GPS, no personal
// identity — only what the browser exposes to any website it visits.
export function onDeviceSignals() {
  const nav = (typeof navigator !== 'undefined') ? navigator : {};
  const scr = (typeof screen !== 'undefined') ? screen : {};
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  const uad = nav.userAgentData;
  return {
    ua: nav.userAgent || '',
    platform: (uad && uad.platform) || nav.platform || '',
    lang: nav.language || '',
    langs: Array.isArray(nav.languages) ? nav.languages.join(', ') : (nav.language || ''),
    tz,
    screen: (scr.width && scr.height) ? `${scr.width}×${scr.height}` : '',
    dpr: (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : '',
    cores: nav.hardwareConcurrency || '',
    memory: nav.deviceMemory || '',
    touch: typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : '',
  };
}

// Best-effort public IP + rough city/ISP via a free, keyless service. Cached for
// 12h so it isn't called on every load. Returns {} on any failure (never blocks).
const IP_KEY = 'sl_ipmeta_v1';
const IP_TTL = 12 * 60 * 60 * 1000;
export async function ipMeta() {
  try {
    const c = JSON.parse(localStorage.getItem(IP_KEY) || 'null');
    if (c && c.at && (Date.now() - c.at) < IP_TTL && c.data) return c.data;
  } catch {}
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('https://ipwho.is/', { signal: ctrl.signal });
    clearTimeout(timer);
    const j = await res.json();
    if (j && j.success !== false) {
      const data = {
        ip: j.ip || '',
        city: j.city || '',
        region: j.region || '',
        country: j.country || '',
        isp: (j.connection && (j.connection.isp || j.connection.org)) || '',
      };
      try { localStorage.setItem(IP_KEY, JSON.stringify({ at: Date.now(), data })); } catch {}
      return data;
    }
  } catch {}
  return {};
}
