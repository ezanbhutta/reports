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
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

// ════════════════════════════════════════════════════════════════
// localStorage backend
// ════════════════════════════════════════════════════════════════
const LS = {
  reports: 'sl_reports_v1', actions: 'sl_actions_v1', roster: 'sl_roster_v1',
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
  async latestNoteForProfile(profile, beforeReportId) {
    const reports = read(LS.reports, [])
      .filter(r => r.profile === profile && r.status === 'submitted' && (r.note_for_next || '').trim() && r.id !== beforeReportId)
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
  async latestNoteForProfile(profile, beforeReportId) {
    const c = await client();
    const { data } = await c.from('reports').select('*').eq('profile', profile).eq('status', 'submitted')
      .neq('id', beforeReportId || '00000000-0000-0000-0000-000000000000')
      .not('note_for_next', 'is', null).order('finish_at', { ascending: false }).limit(5);
    return (data || []).find(r => (r.note_for_next || '').trim()) || null;
  },
  async ackNote(id, by) {
    const c = await client();
    await c.from('reports').update({ note_seen_by: by, note_seen_at: new Date().toISOString() }).eq('id', id);
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
  subscribe(cb) {
    let ch;
    client().then(c => {
      ch = c.channel('sl-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'actions' }, cb)
        .subscribe();
    });
    return () => { if (ch && sb) sb.removeChannel(ch); };
  },
};

export const db = BACKEND === 'supabase' ? supaDb : localDb;
