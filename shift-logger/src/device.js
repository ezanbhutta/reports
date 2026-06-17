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
