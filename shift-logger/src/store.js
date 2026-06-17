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
  reports: 'sl_reports_v1', actions: 'sl_actions_v1', roster: 'sl_roster_v1', security: 'sl_security_v1', geofence: 'sl_geofence_v1',
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
    log.push({ id: uid(), event, pw_tried: (detail && detail.pw) || '', ua: (detail && detail.ua) || '', created_at: new Date().toISOString() });
    write(LS.security, log);
  },
  async listAccessLog() {
    return read(LS.security, []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },
  async getGeofence() { return read(LS.geofence, null); },
  async setGeofence(obj) { write(LS.geofence, obj); return obj; },
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
async function client() {
  if (sb) return sb;
  const { createClient } = await import('@supabase/supabase-js');
  sb = createClient(URL, KEY);
  return sb;
}

const supaDb = {
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
    try { const c = await client(); await c.from('security_log').insert({ event, pw_tried: (detail && detail.pw) || '', ua: (detail && detail.ua) || '' }); } catch {}
  },
  async listAccessLog() {
    try { const c = await client(); const { data } = await c.from('security_log').select('*').order('created_at', { ascending: false }).limit(200); return data || []; } catch { return []; }
  },
  async getGeofence() {
    try { const c = await client(); const { data } = await c.from('settings').select('value').eq('key', 'geofence').maybeSingle(); return (data && data.value) || null; } catch { return null; }
  },
  async setGeofence(obj) {
    try { const c = await client(); await c.from('settings').upsert({ key: 'geofence', value: obj, updated_at: new Date().toISOString() }); } catch {}
    return obj;
  },
  subscribe(cb) {
    let ch;
    client().then(c => {
      ch = c.channel('sl-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'actions' }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'security_log' }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, cb)
        .subscribe();
    });
    return () => { if (ch && sb) sb.removeChannel(ch); };
  },
};

export const db = BACKEND === 'supabase' ? supaDb : localDb;

// Warm the Supabase client (dynamic import + connection) at startup so the first write is instant.
if (BACKEND === 'supabase') { client().catch(() => {}); }
