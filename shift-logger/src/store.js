// ════════════════════════════════════════════════════════════════
// Data layer. Uses Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
// are set; otherwise falls back to localStorage (with cross-tab live updates),
// so the app runs and demos out of the box. Same API either way.
// ════════════════════════════════════════════════════════════════
import { DEFAULT_ROSTER } from './config.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const BACKEND = URL && KEY ? 'supabase' : 'local';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).slice(2) + Date.now());

// ── Pakistan-time helpers ──
export function todayPKT() {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
}
export function timePKT(iso) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}
export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// ════════════════════════════════════════════════════════════════
// localStorage backend
// ════════════════════════════════════════════════════════════════
const LS = {
  reports: 'sl_reports_v1', actions: 'sl_actions_v1', roster: 'sl_roster_v1', security: 'sl_security_v1', devices: 'sl_devices_v1', mistakes: 'sl_mistakes_v1', auth: 'sl_local_auth',
};
const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); ping(); };

let channel;
function ping() { try { channel = channel || new BroadcastChannel('sl'); channel.postMessage('change'); } catch {} }

const localDb = {
  async getRoster() {
    let r = read(LS.roster, null);
    if (!r) { r = DEFAULT_ROSTER; write(LS.roster, r); }
    return r;
  },
  async saveRoster(roster) { write(LS.roster, roster); return roster; },

  async createReport({ csr_name, shift, profile, date }) {
    const reports = read(LS.reports, []);
    const rep = { id: uid(), csr_name, shift, profile, date, start_at: new Date().toISOString(),
      finish_at: null, checklist: {}, note_for_next: '', note_seen_by: null, note_seen_at: null,
      status: 'open', created_at: new Date().toISOString() };
    reports.push(rep); write(LS.reports, reports);
    return rep;
  },
  async getReport(id) { return read(LS.reports, []).find(r => r.id === id) || null; },
  async deleteReport(id) {
    write(LS.reports, read(LS.reports, []).filter(r => r.id !== id));
    write(LS.actions, read(LS.actions, []).filter(a => a.report_id !== id));
    return true;
  },
  async openReportFor(csr_name, profile) {
    return read(LS.reports, []).filter(r => r.csr_name === csr_name && r.profile === profile && r.status === 'open')
      .sort((a, b) => (b.start_at || '').localeCompare(a.start_at || ''))[0] || null;
  },
  async listActions(reportId) {
    return read(LS.actions, []).filter(a => a.report_id === reportId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async addAction(reportId, { type, client, details }) {
    const actions = read(LS.actions, []);
    const a = { id: uid(), report_id: reportId, type, client: client || '', details: details || {},
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    actions.push(a); write(LS.actions, actions);
    return a;
  },
  async updateAction(actionId, patch) {
    const actions = read(LS.actions, []);
    const i = actions.findIndex(a => a.id === actionId);
    if (i >= 0) { actions[i] = { ...actions[i], ...patch, updated_at: new Date().toISOString() }; write(LS.actions, actions); }
    return actions[i];
  },
  async deleteAction(actionId) { write(LS.actions, read(LS.actions, []).filter(a => a.id !== actionId)); return true; },
  async submitReport(reportId, { checklist, note_for_next }) {
    const reports = read(LS.reports, []);
    const i = reports.findIndex(r => r.id === reportId);
    if (i >= 0) { reports[i] = { ...reports[i], checklist: checklist || {}, note_for_next: note_for_next || '',
      finish_at: new Date().toISOString(), status: 'submitted' }; write(LS.reports, reports); }
    return reports[i];
  },
  async updateReportNote(reportId, note_for_next, shifts) {
    const reports = read(LS.reports, []);
    const i = reports.findIndex(r => r.id === reportId);
    if (i >= 0 && reports[i].status === 'open') { reports[i] = { ...reports[i], note_for_next: note_for_next || '', checklist: { ...(reports[i].checklist || {}), __shifts: shifts || [] } }; write(LS.reports, reports); }
    return reports[i];
  },
  async latestNoteForProfile(profile, beforeReportId, shift) {
    const reports = read(LS.reports, [])
      .filter(r => r.profile === profile && r.status === 'submitted' && (r.note_for_next || '').trim() && r.id !== beforeReportId)
      .filter(r => { const t = r.checklist && r.checklist.__shifts; return !t || !t.length || (shift && t.includes(shift)); })
      .sort((a, b) => (b.finish_at || '').localeCompare(a.finish_at || ''));
    return reports[0] || null;
  },
  async ackNote(reportId, by) {
    const reports = read(LS.reports, []);
    const i = reports.findIndex(r => r.id === reportId);
    if (i >= 0) { reports[i] = { ...reports[i], note_seen_by: by, note_seen_at: new Date().toISOString() }; write(LS.reports, reports); }
    return reports[i];
  },
  async listReports() {
    return read(LS.reports, []).sort((a, b) => (b.start_at || '').localeCompare(a.start_at || ''));
  },
  async allActions() { return read(LS.actions, []); },
  async logAccess(event, detail) {
    const log = read(LS.security, []);
    log.push({ id: uid(), event, pw_tried: (detail && detail.email) || '', ua: (detail && detail.ua) || '', created_at: new Date().toISOString() });
    write(LS.security, log);
  },
  async listAccessLog() {
    return read(LS.security, []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },
  async listMistakes() {
    return read(LS.mistakes, []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },
  async addMistake(m) {
    const list = read(LS.mistakes, []);
    const row = { status: 'open', ceo_note: '', ...m, id: uid(), created_at: new Date().toISOString() };
    list.push(row); write(LS.mistakes, list);
    return row;
  },
  async updateMistake(id, patch) {
    const list = read(LS.mistakes, []);
    const i = list.findIndex(x => x.id === id);
    if (i >= 0) { list[i] = { ...list[i], ...patch }; write(LS.mistakes, list); }
    return list[i];
  },
  async deleteMistake(id) { write(LS.mistakes, read(LS.mistakes, []).filter(x => x.id !== id)); return true; },
  async listDevices() { return read(LS.devices, []); },
  async getDevice(id) { return read(LS.devices, []).find(d => d.id === id) || null; },
  async registerDevice({ id, code, ua }) {
    const list = read(LS.devices, []);
    if (!list.some(d => d.id === id)) {
      list.push({ id, code: code || '', label: '', profile: '', ua: ua || '', created_at: new Date().toISOString(), last_seen: new Date().toISOString() });
      write(LS.devices, list);
    }
    return read(LS.devices, []).find(d => d.id === id) || null;
  },
  async saveDevice(dev) {
    const list = read(LS.devices, []);
    const i = list.findIndex(d => d.id === dev.id);
    if (i >= 0) list[i] = { ...list[i], ...dev }; else list.push(dev);
    write(LS.devices, list);
    return dev;
  },
  async removeDevice(id) { write(LS.devices, read(LS.devices, []).filter(d => d.id !== id)); return true; },
  // Manager auth (demo) — local mode has no server, so "admin" unlocks the console.
  async signIn(email, password) {
    if (String(password) === 'admin') { localStorage.setItem(LS.auth, '1'); return { email: email || 'manager@local', local: true }; }
    throw new Error('Invalid login credentials');
  },
  async signOut() { localStorage.removeItem(LS.auth); },
  async currentUser() { return localStorage.getItem(LS.auth) === '1' ? { email: 'manager@local', local: true } : null; },
  onAuth() { return () => {}; },
  subscribe(cb) {
    const bc = (() => { try { return new BroadcastChannel('sl'); } catch { return null; } })();
    const onMsg = () => cb();
    const onStorage = (e) => { if (e.key && e.key.startsWith('sl_')) cb(); };
    bc && (bc.onmessage = onMsg);
    window.addEventListener('storage', onStorage);
    return () => { bc && bc.close(); window.removeEventListener('storage', onStorage); };
  },
};

// ════════════════════════════════════════════════════════════════
// Supabase backend
// ════════════════════════════════════════════════════════════════
let sb = null;
let _subCh = null, _subStarted = false; const _subCbs = new Set();
async function client() {
  if (sb) return sb;
  const { createClient } = await import('@supabase/supabase-js');
  sb = createClient(URL, KEY);
  return sb;
}

const supaDb = {
  // ── Manager auth (Supabase Auth) — the session unlocks manager-only data via RLS ──
  async signIn(email, password) {
    const c = await client();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return (data && data.user) || null;
  },
  async signOut() { try { const c = await client(); await c.auth.signOut(); } catch {} },
  async currentUser() { try { const c = await client(); const { data } = await c.auth.getUser(); return (data && data.user) || null; } catch { return null; } },
  onAuth(cb) {
    let unsub = () => {};
    client().then(c => { const { data } = c.auth.onAuthStateChange((_evt, session) => cb((session && session.user) || null)); unsub = () => { try { data.subscription.unsubscribe(); } catch {} }; });
    return () => unsub();
  },
  async getRoster() {
    const c = await client();
    const { data } = await c.from('roster').select('*').order('shift');
    if (!data || data.length === 0) return DEFAULT_ROSTER;
    return data;
  },
  async saveRoster(roster) {
    const c = await client();
    await c.from('roster').upsert(roster);
    return roster;
  },
  async createReport(r) {
    const c = await client();
    const row = { ...r, start_at: new Date().toISOString(), checklist: {}, note_for_next: '', status: 'open' };
    const { data } = await c.from('reports').insert(row).select().single();
    return data;
  },
  async getReport(id) {
    const c = await client();
    const { data } = await c.from('reports').select('*').eq('id', id).maybeSingle();
    return data || null;
  },
  async deleteReport(id) {
    const c = await client();
    await c.from('reports').delete().eq('id', id); // its actions cascade via the FK
    return true;
  },
  async openReportFor(csr_name, profile) {
    const c = await client();
    const { data } = await c.from('reports').select('*').eq('csr_name', csr_name).eq('profile', profile).eq('status', 'open').order('start_at', { ascending: false }).limit(1);
    return (data && data[0]) || null;
  },
  async listActions(reportId) {
    const c = await client();
    const { data } = await c.from('actions').select('*').eq('report_id', reportId).order('created_at', { ascending: false });
    return data || [];
  },
  async addAction(reportId, a) {
    const c = await client();
    const { data } = await c.from('actions').insert({ report_id: reportId, ...a }).select().single();
    return data;
  },
  async updateAction(id, patch) {
    const c = await client();
    const { data } = await c.from('actions').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    return data;
  },
  async deleteAction(id) {
    const c = await client();
    await c.from('actions').delete().eq('id', id);
    return true;
  },
  async submitReport(id, { checklist, note_for_next }) {
    const c = await client();
    const { data } = await c.from('reports').update({ checklist, note_for_next, finish_at: new Date().toISOString(), status: 'submitted' }).eq('id', id).select().single();
    return data;
  },
  async updateReportNote(reportId, note_for_next, shifts) {
    const c = await client();
    const cur = await c.from('reports').select('checklist').eq('id', reportId).maybeSingle();
    const checklist = { ...((cur.data && cur.data.checklist) || {}), __shifts: shifts || [] };
    const { data } = await c.from('reports').update({ note_for_next: note_for_next || '', checklist }).eq('id', reportId).eq('status', 'open').select().maybeSingle();
    return data;
  },
  async latestNoteForProfile(profile, beforeReportId, shift) {
    const c = await client();
    const { data } = await c.from('reports').select('*').eq('profile', profile).eq('status', 'submitted')
      .neq('id', beforeReportId || '00000000-0000-0000-0000-000000000000')
      .not('note_for_next', 'is', null).order('finish_at', { ascending: false }).limit(10);
    return (data || []).find(r => {
      if (!(r.note_for_next || '').trim()) return false;
      const t = r.checklist && r.checklist.__shifts;
      return !t || !t.length || (shift && t.includes(shift));
    }) || null;
  },
  async ackNote(id, by) {
    const c = await client();
    // note_seen_* live on a SUBMITTED report, which the row-level "update while
    // open" policy blocks — so a direct update silently fails and the handoff
    // re-pops on reload. A SECURITY DEFINER function records just the ack.
    const { error } = await c.rpc('ack_note', { p_id: id, p_by: by });
    if (error) { try { await c.from('reports').update({ note_seen_by: by, note_seen_at: new Date().toISOString() }).eq('id', id); } catch {} }
  },
  async listReports() {
    const c = await client();
    const { data } = await c.from('reports').select('*').order('start_at', { ascending: false });
    return data || [];
  },
  async allActions() {
    const c = await client();
    const { data } = await c.from('actions').select('*');
    return data || [];
  },
  async logAccess(event, detail) {
    // Security events must never be silently lost. If the cloud insert fails
    // (e.g. the security_log table/migration is missing), keep a local copy so
    // the console still records and shows the attempt.
    try { const c = await client(); const { error } = await c.from('security_log').insert({ event, pw_tried: (detail && detail.email) || '', ua: (detail && detail.ua) || '' }); if (error) throw error; }
    catch { try { await localDb.logAccess(event, detail); } catch {} }
  },
  async listAccessLog() {
    let cloud = [];
    try { const c = await client(); const { data, error } = await c.from('security_log').select('*').order('created_at', { ascending: false }).limit(200); if (error) throw error; cloud = data || []; } catch {}
    // Merge in any locally-buffered events (written when a cloud insert failed).
    const local = await localDb.listAccessLog();
    const seen = new Set(cloud.map(e => e.id));
    return [...cloud, ...local.filter(e => !seen.has(e.id))].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },
  async listMistakes() {
    let cloud = null;
    try { const c = await client(); const { data, error } = await c.from('mistakes').select('*').order('created_at', { ascending: false }).limit(500); if (error) throw error; cloud = data || []; } catch { cloud = null; }
    const local = await localDb.listMistakes();
    if (cloud === null) return local;                       // DB unreachable — show entries buffered on this device
    if (local.length) {                                     // best-effort: flush the buffer up to the cloud
      try {
        const c = await client();
        for (const row of local) { const { error } = await c.from('mistakes').insert(row); if (!error || error.code === '23505') await localDb.deleteMistake(row.id); }
        const { data } = await c.from('mistakes').select('*').order('created_at', { ascending: false }).limit(500);
        if (data) return data;
      } catch {}
      const seen = new Set(cloud.map(e => e.id));
      return [...cloud, ...local.filter(e => !seen.has(e.id))].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }
    return cloud;
  },
  async addMistake(m) {
    // Saving must never fail for the user. Try the cloud; if it's rejected
    // (missing table/column, RLS) or offline, buffer locally and sync on next load.
    try { const c = await client(); const { data, error } = await c.from('mistakes').insert(m).select().single(); if (error) throw error; return data; }
    catch { return await localDb.addMistake(m); }
  },
  async updateMistake(id, patch) {
    try { const c = await client(); await c.from('mistakes').update(patch).eq('id', id); } catch {}
    try { await localDb.updateMistake(id, patch); } catch {}   // also patch a still-buffered entry
    return null;
  },
  async deleteMistake(id) {
    try { const c = await client(); await c.from('mistakes').delete().eq('id', id); } catch {}
    try { await localDb.deleteMistake(id); } catch {}
    return true;
  },
  async listDevices() {
    try { const c = await client(); const { data } = await c.from('devices').select('*').order('created_at'); return data || []; } catch { return []; }
  },
  async getDevice(id) {
    try { const c = await client(); const { data } = await c.from('devices').select('*').eq('id', id).maybeSingle(); return data || null; } catch { return null; }
  },
  async registerDevice({ id, code, ua }) {
    try {
      const c = await client();
      await c.from('devices').upsert({ id, code: code || '', ua: ua || '', last_seen: new Date().toISOString() }, { onConflict: 'id', ignoreDuplicates: true });
      await c.from('devices').update({ last_seen: new Date().toISOString() }).eq('id', id);
      const { data } = await c.from('devices').select('*').eq('id', id).maybeSingle();
      return data || null;
    } catch { return null; }
  },
  async saveDevice(dev) {
    try { const c = await client(); await c.from('devices').upsert(dev, { onConflict: 'id' }); } catch {}
    return dev;
  },
  async removeDevice(id) {
    try { const c = await client(); await c.from('devices').delete().eq('id', id); } catch {}
    return true;
  },
  subscribe(cb) {
    // One shared realtime channel, fanned out to every listener (with the changed
    // table name) — instead of opening a websocket channel per component.
    _subCbs.add(cb);
    if (!_subStarted) {
      _subStarted = true;
      client().then(c => {
        _subCh = c.channel('sl-changes');
        ['reports', 'actions', 'security_log', 'devices', 'mistakes', 'roster'].forEach(t =>
          _subCh.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => { const tb = (p && p.table) || t; _subCbs.forEach(f => { try { f(tb); } catch {} }); }));
        _subCh.subscribe();
      });
    }
    return () => { _subCbs.delete(cb); };
  },
};

export const db = BACKEND === 'supabase' ? supaDb : localDb;

// Warm the Supabase client (dynamic import + connection) at startup so the first write is instant.
if (BACKEND === 'supabase') { client().catch(() => {}); }
