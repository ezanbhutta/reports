import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Users, BarChart3, Plus, Pencil, Trash2, Archive, ArchiveRestore, Filter, Activity, ClipboardList, AlertTriangle, X, Clock, Download, ChevronLeft, ChevronRight, CalendarDays, ShieldAlert, ShieldCheck, Monitor, Loader2, Laptop, LogOut, MapPin, Info } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTION_BY_KEY, KPI_LABEL, GROUPS, isDesigner, MISTAKE_CATEGORIES } from './config.js';
import { db, todayPKT, timePKT, addDays, BACKEND } from './store.js';
import { Btn, Card, StatCard, Pill, Select, Chip, SectionHeader, Modal, Label, Field, actionSummary, Logo, TrendChart, ConfirmDelete, useLive } from './ui.jsx';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'r_' + Math.random().toString(36).slice(2));
const SHIFT_COLOR = { Morning: C.amber, Evening: C.cyan, Night: C.violet };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ymd = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const parseYmd = s => { const [y, m, d] = (s || '').split('-').map(Number); return { y, m: m - 1, d }; };
const fmtShort = s => { const p = parseYmd(s); return p.y ? `${MON[p.m]} ${p.d}` : '—'; };
const groupColor = k => (GROUPS.find(g => g.key === k) || {}).color || C.violet;
function ago(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}
const SEEN_KEY = 'sl_sec_seen';
// Short, readable device label from a user-agent string.
function browserName(ua) {
  if (!ua) return '';
  return /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
}
function osName(ua) {
  if (!ua) return '';
  return /Windows/.test(ua) ? 'Windows' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
}
function deviceKind(ua) {
  if (!ua) return '';
  if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'Tablet';
  if (/Mobi|iPhone|iPod/.test(ua)) return 'Phone';
  return 'Desktop / Laptop';
}
function deviceLabel(ua) {
  if (!ua) return 'Unknown device';
  return `${browserName(ua)} · ${osName(ua)}`;
}
// Full field-by-field detail for an action — mirrors exactly what the CSR typed.
function actionDetails(action) {
  const def = ACTION_BY_KEY[action.type];
  const d = action.details || {};
  const out = [];
  const cf = def?.fields.find(f => f.name === 'client');
  if (action.client) out.push([cf?.label || 'Client', action.client]);
  (def?.fields || []).forEach(f => {
    if (f.name === 'client') return;
    let v = d[f.name];
    if (Array.isArray(v)) v = v.join(', ');
    if (v != null && String(v).trim() !== '') out.push([f.label, String(v)]);
  });
  return out;
}

function winFor(r) {
  const t = todayPKT();
  if (r.mode === 'today') return { s: t, e: t };
  if (r.mode === 'yesterday') { const y = addDays(t, -1); return { s: y, e: y }; }
  if (r.mode === '7d') return { s: addDays(t, -6), e: t };
  if (r.mode === '30d') return { s: addDays(t, -29), e: t };
  if (r.mode === 'custom' && r.start) return { s: r.start, e: r.end || r.start };
  return null;
}
const inWin = (d, w) => !w || (d >= w.s && d <= w.e);
function winLabel(r) {
  const m = { today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All time' };
  if (r.mode === 'custom' && r.start) return `${fmtShort(r.start)} – ${fmtShort(r.end || r.start)}`;
  return m[r.mode] || 'Today';
}
const dayPKT = iso => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(iso));
const hourPKT = iso => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false }).format(new Date(iso))) % 24;
const initials = n => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
// Bin timestamps into a small series: 24 hourly buckets for a single day, else daily buckets across the window.
function seriesFor(times, win) {
  if (!times || !times.length) return [];
  const single = win && win.s === win.e;
  if (single) { const b = new Array(24).fill(0); times.forEach(t => { b[hourPKT(t)]++; }); return b; }
  const start = win ? win.s : times.map(dayPKT).sort()[0];
  const end = win ? win.e : todayPKT();
  const idx = {}; const days = []; let d = start, guard = 0;
  while (d <= end && guard++ < 200) { idx[d] = days.length; days.push(d); d = addDays(d, 1); }
  const b = new Array(days.length).fill(0);
  times.forEach(t => { const dd = dayPKT(t); if (dd in idx) b[idx[dd]]++; });
  return b;
}
// Trend with time-axis labels: hourly buckets for a single day, else daily buckets.
const hourShort = h => { const hh = h % 12 || 12; return hh + (h < 12 ? 'a' : 'p'); };
const hourFull = h => { const hh = h % 12 || 12; return hh + (h < 12 ? ' AM' : ' PM'); };
function buildTrend(times, win) {
  const single = win && win.s === win.e;
  if (single) {
    // Full day: one bucket per hour (00:00 → 23:00) so morning/early activity is never dropped.
    const data = new Array(24).fill(0);
    (times || []).forEach(t => { data[hourPKT(t)]++; });
    const hrs = Array.from({ length: 24 }, (_, h) => h);
    return { data, labels: hrs.map(hourShort), full: hrs.map(hourFull) };
  }
  const start = win ? win.s : ((times || []).map(dayPKT).sort()[0] || todayPKT());
  const end = win ? win.e : todayPKT();
  const days = []; let d = start, guard = 0;
  while (d <= end && guard++ < 200) { days.push(d); d = addDays(d, 1); }
  const idx = Object.fromEntries(days.map((dd, i) => [dd, i]));
  const data = new Array(days.length).fill(0);
  (times || []).forEach(t => { const dd = dayPKT(t); if (dd in idx) data[idx[dd]]++; });
  const lab = days.map(fmtShort);
  return { data, labels: lab, full: lab };
}

export default function CeoApp() {
  const [user, setUser] = useState(undefined); // undefined = checking · null = signed out · object = signed in
  useEffect(() => {
    let alive = true;
    db.currentUser().then(u => { if (alive) setUser(u || null); });
    const off = db.onAuth(u => { if (alive) setUser(u || null); });
    return () => { alive = false; off && off(); };
  }, []);
  if (user === undefined) return null;
  if (!user) return <Login onSignedIn={u => setUser(u)} />;
  return <Authed user={user} onSignOut={async () => { try { await db.signOut(); setUser(null); } catch { window.alert('Could not sign out — check your connection and try again.'); } }} />;
}

function Login({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    try {
      const u = await db.signIn(email.trim(), pw);
      db.logAccess('success', { email: email.trim(), ua });
      onSignedIn(u || { email: email.trim() });
    } catch {
      db.logAccess('failed', { email: email.trim(), ua });
      setErr('Wrong email or password.'); setBusy(false);
    }
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="glass-2 rounded-2xl pop" style={{ width: 360, overflow: 'hidden' }}>
        <div style={{ padding: '30px 26px 26px', textAlign: 'center' }}>
          <Logo size={52} style={{ margin: '0 auto 14px' }} />
          <div className="disp" style={{ fontWeight: 700, fontSize: 19, color: C.ink }}>CEO Console</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Lock size={11} /> Manager sign-in</div>
          <input type="email" value={email} autoFocus onChange={e => { setEmail(e.target.value); setErr(''); }} onKeyDown={e => e.key === 'Enter' && submit()}
            className="gi" style={{ marginTop: 16, textAlign: 'center' }} placeholder="Email" autoComplete="username" />
          <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(''); }} onKeyDown={e => e.key === 'Enter' && submit()}
            className="gi" style={{ marginTop: 10, textAlign: 'center', borderColor: err ? C.coral : undefined }} placeholder="Password" autoComplete="current-password" />
          {err && <div style={{ color: C.coral, fontSize: 12, marginTop: 8 }}>{err}</div>}
          <Btn onClick={submit} disabled={busy} className="lift" style={{ width: '100%', marginTop: 12, padding: 11 }}>{busy ? 'Signing in…' : 'Sign in'}</Btn>
        </div>
      </div>
    </div>
  );
}

function Authed({ user, onSignOut }) {
  const [view, setView] = useState('live');
  const [secLog] = useLive('secLog', () => db.listAccessLog(), ['security_log']);
  const [mistakes, reloadMistakes] = useLive('mistakes', () => db.listMistakes(), ['mistakes']);
  const [seenAt, setSeenAt] = useState(() => localStorage.getItem(SEEN_KEY) || '');
  const unseen = secLog.filter(e => e.event === 'failed' && (e.created_at || '') > seenAt).length;
  const openMistakes = mistakes.filter(m => m.status !== 'reviewed').length;
  const markSeen = useCallback(() => { const now = new Date().toISOString(); localStorage.setItem(SEEN_KEY, now); setSeenAt(now); }, []);
  const Tab = ({ id, icon: Icon, label, badge }) => { const on = view === id; return (
    <button onClick={() => setView(id)} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all"
      style={on ? { background: C.violet, color: '#fff', boxShadow: '0 6px 16px rgba(114,41,255,.28)' } : { background: 'rgba(255,255,255,.5)', color: C.muted, border: '1px solid rgba(124,41,255,.14)' }}><Icon size={14} />{label}
      {badge > 0 && <span className="mono" style={{ marginLeft: 1, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 9, fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'rgba(255,255,255,.25)' : C.coral, color: '#fff' }}>{badge}</span>}</button>); };
  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="glass" style={{ position: 'sticky', top: 0, zIndex: 30, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(255,255,255,.92)' }}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div><div className="disp" style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>CEO Console <span style={{ fontSize: 11, fontWeight: 700, color: C.mint }}>· <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}` }} /> live</span></div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim }}>HaseebMadeIt · Operations</div></div>
          </div>
          <div className="flex items-center gap-2"><Tab id="live" icon={BarChart3} label="Live" /><Tab id="mistakes" icon={ClipboardList} label="Mistakes" badge={openMistakes} /><Tab id="roster" icon={Users} label="Roster" /><Tab id="security" icon={ShieldAlert} label="Security" badge={unseen} />
            <button onClick={onSignOut} title={user && user.email ? `Signed in as ${user.email}` : 'Sign out'} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all" style={{ background: 'rgba(255,255,255,.5)', color: C.muted, border: '1px solid rgba(124,41,255,.14)' }}><LogOut size={14} />Sign out</button></div>
        </div>
      </div>
      <main className="mx-auto max-w-[1500px] px-6 py-6">
        {unseen > 0 && view !== 'security' && (
          <div onClick={() => setView('security')} className="lift" style={{ cursor: 'pointer', marginBottom: 20, padding: '13px 18px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, color: '#fff', background: `linear-gradient(135deg, ${C.coral}, #E11D48)`, boxShadow: '0 12px 30px rgba(225,29,72,.28)' }}>
            <ShieldAlert size={20} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{unseen} failed access attempt{unseen > 1 ? 's' : ''} on the CEO console</div>
              <div style={{ fontSize: 12, opacity: .9 }}>A failed sign-in to the CEO console since you last checked. Tap to review.</div>
            </div>
            <span style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>Review →</span>
          </div>
        )}
        {view === 'live' ? <Console /> : view === 'roster' ? <RosterManager /> : view === 'mistakes' ? <MistakesPanel mistakes={mistakes} reload={reloadMistakes} /> : <SecurityPanel log={secLog} seenAt={seenAt} onSeen={markSeen} />}
      </main>
    </div>
  );
}

// Per-laptop device registry — assign each laptop a profile (it locks to it).
function DevicesCard() {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState({});   // device id → details expanded
  const reload = useCallback(() => db.listDevices().then(setDevices), []);
  useEffect(() => { reload(); let t; const off = db.subscribe(() => { clearTimeout(t); t = setTimeout(reload, 300); }); return () => { clearTimeout(t); off && off(); }; }, [reload]);
  const assign = async (d, patch) => { setDevices(ds => ds.map(x => x.id === d.id ? { ...x, ...patch } : x)); await db.saveDevice({ ...d, ...patch }); reload(); };
  const remove = async (d) => { if (!window.confirm(`Remove device ${d.code || ''}? It will be blocked until re-registered.`)) return; const ok = await db.removeDevice(d.id); if (!ok) window.alert('Could not remove the device — please try again.'); reload(); };
  const pending = devices.filter(d => !d.profile).length;
  return (
    <Card className="p-4">
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
        Each laptop locks to the profile you assign here. Open the staff app on a laptop once and it appears below by its code — pick a profile and it unlocks on that laptop automatically. Tap <b>ⓘ</b> on any row to see what its browser reveals (browser, location, IP) — handy for spotting an unexpected device.
        {pending > 0 && <b style={{ color: C.amber }}> · {pending} waiting to assign</b>}
      </div>
      {devices.length === 0
        ? <div style={{ color: C.dim, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}><Laptop size={15} /> No laptops yet — open the staff app on one to register it.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devices.map(d => { const m = d.meta || {}; const loc = [m.city, m.region, m.country].filter(Boolean).join(', '); const isOpen = !!open[d.id]; const rows = [['Browser', m.ua ? browserName(m.ua) : ''], ['Computer / OS', m.ua ? osName(m.ua) : ''], ['Device type', m.ua ? deviceKind(m.ua) : ''], ['Location', loc], ['IP', m.ip], ['ISP', m.isp], ['Timezone', m.tz], ['Language', m.langs || m.lang], ['Screen', m.screen ? m.screen + (m.dpr ? ` @${m.dpr}x` : '') : ''], ['CPU / RAM', [m.cores && `${m.cores} cores`, m.memory && `${m.memory} GB`].filter(Boolean).join(' · ')], ['Platform', m.platform], ['First seen', d.created_at ? `${fmtShort(dayPKT(d.created_at))} · ${timePKT(d.created_at)}` : ''], ['Last seen', d.last_seen ? `${fmtShort(dayPKT(d.last_seen))} · ${timePKT(d.last_seen)}` : '']].filter(([, v]) => v); return (
              <div key={d.id} className="glass-soft rounded-xl" style={{ borderLeft: `3px solid ${d.profile === '*' ? C.violet : d.profile ? C.mint : C.amber}`, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 90 }}>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 800, color: C.ink, letterSpacing: '.06em' }}>{d.code || String(d.id).slice(0, 6)}</div>
                    <div style={{ fontSize: 9.5, color: d.profile === '*' ? C.violet : d.profile ? C.mint : C.amber, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{d.profile === '*' ? 'admin · all' : d.profile ? 'bound' : 'pending'}</div>
                  </div>
                  <input defaultValue={d.label} onBlur={e => { if (e.target.value !== (d.label || '')) assign(d, { label: e.target.value }); }} placeholder="Laptop name (e.g. Desk 1)" className="gi" style={{ flex: 1, minWidth: 130, padding: '8px 10px', fontSize: 12.5 }} />
                  <Select value={d.profile || ''} onChange={e => assign(d, { profile: e.target.value })}>
                    <option value="">— unassigned —</option>
                    <option value="*">All profiles (admin)</option>
                    {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                  <button onClick={() => setOpen(o => ({ ...o, [d.id]: !o[d.id] }))} title="Device details" style={{ border: 'none', background: isOpen ? C.violet : 'rgba(124,41,255,.08)', width: 30, height: 30, borderRadius: 9, color: isOpen ? '#fff' : C.violet, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Info size={14} /></button>
                  <button onClick={() => remove(d)} title="Remove device" style={{ border: 'none', background: 'rgba(124,41,255,.08)', width: 30, height: 30, borderRadius: 9, color: C.coral, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Trash2 size={14} /></button>
                </div>
                {(m.ua || loc) && <div style={{ padding: '0 12px 9px', fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {m.ua && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Monitor size={12} />{deviceLabel(m.ua)}</span>}
                  {loc && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{loc}</span>}
                  {m.ip && <span className="mono" style={{ color: C.dim }}>{m.ip}</span>}
                </div>}
                {isOpen && (rows.length
                  ? <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(124,41,255,.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px 14px' }}>
                      {rows.map(([k, v]) => <div key={k}><div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: C.dim }}>{k}</div><div style={{ fontSize: 11.5, color: C.ink, wordBreak: 'break-word' }}>{v}</div></div>)}
                    </div>
                  : <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(124,41,255,.08)', fontSize: 11, color: C.dim }}>No details captured yet — they appear after this laptop next opens the app.</div>)}
              </div>
            ); })}
          </div>}
    </Card>
  );
}

// ── Mistakes log: manager records, CEO reviews ──
const MISTAKE_STATUS = { open: { label: 'Open', color: C.amber }, reviewed: { label: 'Reviewed', color: C.mint } };
function currentShift() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false }).format(new Date())) % 24;
  if (h >= 9 && h < 17) return 'Morning';
  if (h >= 17 || h < 1) return 'Evening';
  return 'Night';
}

// Multi-select people picker (chips + dropdown) — a mistake can involve several people.
function PeoplePicker({ people, value, onChange }) {
  const selected = Array.isArray(value) ? value : (value ? [value] : []);
  const available = people.filter(p => !selected.includes(p));
  return (
    <div>
      <Label>Who made it<span style={{ color: C.violet }}> *</span></Label>
      {selected.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {selected.map(p => (
          <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.violetBg, color: C.violetDim, borderRadius: 8, padding: '5px 6px 5px 10px', fontSize: 12, fontWeight: 700 }}>
            {p}<button onClick={() => onChange(selected.filter(x => x !== p))} title="Remove" style={{ border: 'none', background: 'transparent', color: C.violetDim, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><X size={13} /></button>
          </span>))}
      </div>}
      <select className="gi" value="" onChange={e => { if (e.target.value) onChange([...selected, e.target.value]); }}>
        <option value="">{selected.length ? 'Add another person…' : 'Select…'}</option>
        {available.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {selected.length > 1 && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 5 }}>{selected.length} people selected</div>}
    </div>
  );
}

function MistakesPanel({ mistakes, reload }) {
  const [roster, setRoster] = useState([]);
  useEffect(() => { db.getRoster().then(setRoster); }, []);
  const people = [...new Set(roster.filter(r => r.active && r.name).map(r => r.name))];
  const blank = () => ({ person: [], category: '', description: '', client: '', project: '', shift: currentShift(), happened_on: todayPKT(), happened_time: timePKT(), profile: '', logged_by: '' });
  const [form, setForm] = useState(blank());
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editId, setEditId] = useState(null);   // id of the mistake being edited (null = new entry)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [fStatus, setFStatus] = useState('all'); const [fPerson, setFPerson] = useState('all');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(''); };

  const openNew = () => { setForm(blank()); setEditId(null); setErr(''); setShowForm(true); };
  const openEdit = (m) => {
    setForm({ person: (m.person || '').split(',').map(s => s.trim()).filter(Boolean), category: m.category || '', description: m.description || '', client: m.client || '', project: m.project || '', shift: m.shift || currentShift(), happened_on: m.happened_on || todayPKT(), happened_time: m.happened_time || '', profile: m.profile || '', logged_by: m.logged_by || '' });
    setEditId(m.id); setErr(''); setDetail(null); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(blank()); setErr(''); };
  const submit = async () => {
    if (!form.person || !form.person.length) { setErr('Pick who made the mistake.'); return; }
    if (!form.description.trim()) { setErr('Describe what happened.'); return; }
    setBusy(true);
    const payload = { ...form, person: form.person.join(', '), description: form.description.trim() };
    try {
      if (editId) { const ok = await db.updateMistake(editId, payload); if (!ok) window.alert('Couldn’t save changes — check your connection and try again.'); } else await db.addMistake(payload);
      closeForm(); reload();
    }
    catch (e) { const msg = (e && (e.message || e.error_description || e.hint)) || 'Unknown error'; setErr('Could not save: ' + msg + (e && e.code ? ` (${e.code})` : '')); }
    finally { setBusy(false); }
  };
  const setStatus = async (m, status) => { const ok = await db.updateMistake(m.id, { status }); if (!ok) window.alert('Couldn’t update status — check your connection and try again.'); reload(); };
  const saveNote = async (m, ceo_note) => { const ok = await db.updateMistake(m.id, { ceo_note }); if (!ok) window.alert('Couldn’t save the note — check your connection and try again.'); reload(); };
  const remove = async (m) => { if (!window.confirm('Delete this mistake entry? This cannot be undone.')) return; const ok = await db.deleteMistake(m.id); if (!ok) window.alert('Could not delete — please try again.'); reload(); };

  const namesOf = m => (m.person || '').split(',').map(s => s.trim()).filter(Boolean);
  const filtered = mistakes.filter(m => (fStatus === 'all' || (fStatus === 'reviewed' ? m.status === 'reviewed' : m.status !== 'reviewed')) && (fPerson === 'all' || namesOf(m).includes(fPerson)));
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const openN = mistakes.filter(m => m.status !== 'reviewed').length;
  const reviewedN = mistakes.filter(m => m.status === 'reviewed').length;
  const weekN = mistakes.filter(m => (m.created_at || '') >= weekAgo).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="disp text-lg font-bold" style={{ color: C.ink }}>Mistakes log</h2>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>Record what went wrong — who, when and which shift. The CEO reviews and signs off here. Best used for coaching and spotting patterns, not blame.</p>
        </div>
        <Btn onClick={openNew} className="lift"><Plus size={15} strokeWidth={2.6} />Log a mistake</Btn>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total logged" value={mistakes.length} sub="all time" accent={C.violet} icon={ClipboardList} />
        <StatCard label="To review" value={openN} sub="awaiting review" accent={openN ? C.amber : C.mint} icon={AlertTriangle} />
        <StatCard label="Reviewed" value={reviewedN} sub="signed off" accent={C.mint} icon={ShieldCheck} />
        <StatCard label="This week" value={weekN} sub="last 7 days" accent={C.cyan} icon={CalendarDays} />
      </div>

      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 14 }}>
        {[['all', 'All'], ['open', 'To review'], ['reviewed', 'Reviewed']].map(([s, lbl]) => <Chip key={s} active={fStatus === s} onClick={() => setFStatus(s)}>{lbl}</Chip>)}
        <div style={{ flex: 1 }} />
        <Select value={fPerson} onChange={e => setFPerson(e.target.value)}>
          <option value="all">All people</option>
          {[...new Set(mistakes.flatMap(namesOf))].sort().map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>

      {filtered.length === 0
        ? <Card className="p-5"><span style={{ color: C.dim, fontSize: 13 }}>{mistakes.length === 0 ? 'No mistakes logged yet — tap “Log a mistake” to add the first one.' : 'Nothing matches this filter.'}</span></Card>
        : filtered.map(m => { const st = MISTAKE_STATUS[m.status] || MISTAKE_STATUS.open; const reviewed = m.status === 'reviewed'; return (
          <div key={m.id} className="glass-soft rounded-xl" style={{ marginBottom: 8, borderLeft: `3px solid ${st.color}`, overflow: 'hidden' }}>
            <div onClick={() => setDetail(m)} style={{ padding: '12px 14px 8px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>{m.person || '—'}</span>
                    {m.category && <Pill color={C.violet}>{m.category}</Pill>}
                    <Pill color={st.color}>{st.label}</Pill>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>
                    {fmtShort(m.happened_on)}{m.happened_time ? ' · ' + m.happened_time : ''}{m.shift ? ' · ' + m.shift + ' shift' : ''}{m.profile ? ' · ' + m.profile : ''}{m.logged_by ? ' · by ' + m.logged_by : ''}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: C.dim, whiteSpace: 'nowrap', flex: '0 0 auto' }}>tap to read ›</span>
              </div>
              {m.description && <div style={{ fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.description}</div>}
              {(m.client || m.project) && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>{[m.client && ('Client: ' + m.client), m.project && ('Project: ' + m.project)].filter(Boolean).join('  ·  ')}</div>}
            </div>
            <div style={{ padding: '0 14px 11px', display: 'flex', gap: 8, alignItems: 'center' }}>
              {reviewed
                ? <Btn variant="ghost" onClick={() => setStatus(m, 'open')} style={{ padding: '7px 14px', fontSize: 12 }}>Reopen</Btn>
                : <Btn variant="ok" onClick={() => setStatus(m, 'reviewed')} style={{ padding: '7px 14px', fontSize: 12 }}>Mark reviewed</Btn>}
              <div style={{ flex: 1 }} />
              <button onClick={() => openEdit(m)} title="Edit entry" style={{ border: 'none', background: 'rgba(124,41,255,.08)', width: 30, height: 30, borderRadius: 8, color: C.violet, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={14} /></button>
              <button onClick={() => remove(m)} title="Delete entry" style={{ border: 'none', background: 'rgba(124,41,255,.08)', width: 30, height: 30, borderRadius: 8, color: C.coral, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
            </div>
          </div>); })}

      {detail && (() => { const st = MISTAKE_STATUS[detail.status] || MISTAKE_STATUS.open; return (
        <Modal title={detail.person || 'Mistake'} subtitle={detail.category || 'Mistake detail'} onClose={() => setDetail(null)} width={520}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              {detail.category && <Pill color={C.violet}>{detail.category}</Pill>}
              <Pill color={st.color}>{st.label}</Pill>
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>{fmtShort(detail.happened_on)}{detail.happened_time ? ' · ' + detail.happened_time : ''}{detail.shift ? ' · ' + detail.shift + ' shift' : ''}{detail.profile ? ' · ' + detail.profile : ''}{detail.logged_by ? ' · by ' + detail.logged_by : ''}</div>
            {(detail.client || detail.project) && <div style={{ fontSize: 13, color: C.ink }}>{[detail.client && ('Client: ' + detail.client), detail.project && ('Project: ' + detail.project)].filter(Boolean).join('     ·     ')}</div>}
            <div>
              <Label>What happened</Label>
              <div style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.description || '—'}</div>
            </div>
            <div>
              <Label>CEO note</Label>
              <textarea className="gi" defaultValue={detail.ceo_note} placeholder="Add a review note…" onBlur={e => { if (e.target.value !== (detail.ceo_note || '')) { saveNote(detail, e.target.value); setDetail(d => d && { ...d, ceo_note: e.target.value }); } }} style={{ minHeight: 64, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {detail.status === 'reviewed'
                ? <Btn variant="ghost" onClick={() => { setStatus(detail, 'open'); setDetail(d => d && { ...d, status: 'open' }); }}>Reopen</Btn>
                : <Btn variant="ok" onClick={() => { setStatus(detail, 'reviewed'); setDetail(d => d && { ...d, status: 'reviewed' }); }}>Mark reviewed</Btn>}
              <Btn variant="ghost" onClick={() => openEdit(detail)}><Pencil size={14} />Edit</Btn>
              <div style={{ flex: 1 }} />
              <Btn variant="ghost" onClick={() => { remove(detail); setDetail(null); }} style={{ color: C.coral }}><Trash2 size={14} />Delete</Btn>
            </div>
          </div>
        </Modal>
      ); })()}

      {showForm && <Modal title={editId ? 'Edit mistake' : 'Log a mistake'} subtitle={editId ? 'Edit entry' : 'Manager entry'} onClose={closeForm} width={460}>
        <div style={{ display: 'grid', gap: 12 }}>
          <PeoplePicker people={people} value={form.person} onChange={v => set('person', v)} />
          <Field field={{ name: 'category', label: 'Category', type: 'select', options: MISTAKE_CATEGORIES }} value={form.category} onChange={v => set('category', v)} />
          <div>
            <Label>What happened <span style={{ color: C.violet }}>*</span></Label>
            <textarea className="gi" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Factual description — what went wrong" style={{ resize: 'vertical', minHeight: 72, lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Field field={{ name: 'client', label: 'Client name', type: 'text' }} value={form.client} onChange={v => set('client', v)} /></div>
            <div style={{ flex: 1 }}><Field field={{ name: 'project', label: 'Project', type: 'text' }} value={form.project} onChange={v => set('project', v)} /></div>
          </div>
          <Field field={{ name: 'shift', label: 'Shift', type: 'segment', options: SHIFTS.map(s => s.key), required: true }} value={form.shift} onChange={v => set('shift', v)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Field field={{ name: 'happened_on', label: 'Date', type: 'date' }} value={form.happened_on} onChange={v => set('happened_on', v)} /></div>
            <div style={{ flex: 1 }}><Field field={{ name: 'happened_time', label: 'Time', type: 'text' }} value={form.happened_time} onChange={v => set('happened_time', v)} /></div>
          </div>
          <Field field={{ name: 'profile', label: 'Profile (optional)', type: 'select', options: PROFILES }} value={form.profile} onChange={v => set('profile', v)} />
          <Field field={{ name: 'logged_by', label: 'Logged by (optional)', type: 'text' }} value={form.logged_by} onChange={v => set('logged_by', v)} />
          {err && <div style={{ color: C.coral, fontSize: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <Btn variant="ghost" onClick={closeForm} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="ok" onClick={submit} disabled={busy} className="lift" style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save'}</Btn>
          </div>
        </div>
      </Modal>}
    </>
  );
}

function SecurityPanel({ log, seenAt, onSeen }) {
  const [hiSince] = useState(seenAt); // snapshot so "new" highlight survives marking-seen
  useEffect(() => { onSeen(); }, [onSeen]);
  const failed = log.filter(e => e.event === 'failed');
  const success = log.filter(e => e.event === 'success');
  const stamp = iso => `${fmtShort(dayPKT(iso))} · ${timePKT(iso)}`;
  return (
    <>
      <div className="mb-4">
        <h2 className="disp text-lg font-bold" style={{ color: C.ink }}>Access security</h2>
        <p className="mt-1 text-xs" style={{ color: C.muted }}>Every failed sign-in to the CEO console is recorded here. Passwords are never stored — only the email someone tried.</p>
      </div>

      <SectionHeader eyebrow="Access" title="Registered devices" right="laptop → profile" />
      <DevicesCard />

      <div className="mt-6 mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Failed attempts" value={failed.length} sub={failed[0] ? `last ${ago(failed[0].created_at)}` : 'none yet'} accent={failed.length ? C.coral : C.mint} icon={ShieldAlert} />
        <StatCard label="Successful unlocks" value={success.length} sub={success[0] ? `last ${ago(success[0].created_at)}` : 'none yet'} accent={C.mint} icon={ShieldCheck} />
        <StatCard label="Distinct devices" value={new Set(log.map(e => deviceLabel(e.ua))).size} sub="seen on this console" accent={C.violet} icon={Monitor} />
      </div>

      <SectionHeader eyebrow="Watch" title="Failed attempts" color={C.coral} right={`${failed.length}`} />
      <Card className="p-4 mb-6">
        {failed.length === 0
          ? <div style={{ color: C.mint, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={15} /> No failed sign-ins — nobody's tried to get in.</div>
          : <div className="scroll-y" style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 6 }}>
              {failed.map(e => { const isNew = (e.created_at || '') > hiSince; return (
                <div key={e.id} className="glass-soft rounded-xl" style={{ padding: '11px 13px', marginBottom: 8, borderLeft: `3px solid ${C.coral}` }}>
                  <div className="flex items-center justify-between gap-2" style={{ flexWrap: 'wrap' }}>
                    <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: C.dim }}>Email tried</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: C.coral, background: 'rgba(244,63,94,.10)', padding: '2px 8px', borderRadius: 7, wordBreak: 'break-all' }}>{e.email_tried || e.pw_tried || '(blank)'}</span>
                      {isNew && <Pill color={C.coral}>New</Pill>}
                    </div>
                    <span style={{ fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap' }}>{stamp(e.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Monitor size={12} /> {deviceLabel(e.ua)} · {ago(e.created_at)}</div>
                </div>); })}
            </div>}
      </Card>

      {success.length > 0 && <>
        <SectionHeader eyebrow="Log" title="Successful unlocks" right={`${success.length}`} />
        <Card className="p-4">
          <div className="scroll-y" style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 6 }}>
            {success.map(e => (
              <div key={e.id} className="flex items-center justify-between" style={{ padding: '8px 2px', borderBottom: '1px solid rgba(124,41,255,.06)' }}>
                <span style={{ fontSize: 12.5, color: C.ink, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={13} style={{ color: C.mint }} /> {deviceLabel(e.ua)}</span>
                <span style={{ fontSize: 11, color: C.dim, whiteSpace: 'nowrap' }}>{stamp(e.created_at)}</span>
              </div>))}
          </div>
        </Card>
      </>}
    </>
  );
}

// ── Date range picker (presets + custom calendar) ──
function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  // The calendar opens ONLY when "Custom" is clicked; outside-click or scroll closes it.
  useEffect(() => {
    if (!open) return;
    const onDoc = ev => { if (btnRef.current?.contains(ev.target) || popRef.current?.contains(ev.target)) return; setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: Math.max(12, Math.min(r.left, window.innerWidth - 306)) });
    setOpen(true);
  };
  const presets = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', '7d'], ['30d', '30d'], ['all', 'All']];
  const isCustom = value.mode === 'custom';
  return (
    <div className="flex items-center gap-1.5 flex-wrap" style={{ position: 'relative' }}>
      {presets.map(([v, l]) => <Chip key={v} active={value.mode === v} onClick={() => { setOpen(false); onChange({ mode: v }); }}>{l}</Chip>)}
      <button ref={btnRef} onClick={toggle} className="rounded-xl px-3 text-xs font-semibold transition-all"
        style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', ...(isCustom || open ? { background: C.violet, color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 12px rgba(114,41,255,.25)' } : { background: 'rgba(255,255,255,.5)', color: C.muted, border: '1px solid rgba(124,41,255,.14)' }) }}>
        <CalendarDays size={12} />{isCustom ? `${fmtShort(value.start)} – ${fmtShort(value.end || value.start)}` : 'Custom'}
      </button>
      {open && <Calendar popRef={popRef} pos={pos} value={value} onApply={(s, e) => { onChange({ mode: 'custom', start: s, end: e }); setOpen(false); }} />}
    </div>
  );
}
function Calendar({ value, onApply, pos, popRef }) {
  const seed = parseYmd(value.start || todayPKT());
  const [vw, setVw] = useState({ y: seed.y, m: seed.m });
  const [s, setS] = useState(value.mode === 'custom' ? value.start : null);
  const [e, setE] = useState(value.mode === 'custom' ? (value.end || value.start) : null);
  const firstDow = new Date(vw.y, vw.m, 1).getDay();
  const days = new Date(vw.y, vw.m + 1, 0).getDate();
  const cells = []; for (let i = 0; i < firstDow; i++) cells.push(null); for (let d = 1; d <= days; d++) cells.push(d);
  const shift = delta => setVw(v => { let m = v.m + delta, y = v.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { y, m }; });
  const pick = d => { const cur = ymd(vw.y, vw.m, d); if (!s || (s && e)) { setS(cur); setE(null); } else { if (cur < s) { setE(s); setS(cur); } else setE(cur); } };
  return createPortal(
    <div ref={popRef} className="glass-2 rounded-2xl pop" style={{ position: 'fixed', top: pos?.top ?? 120, left: pos?.left ?? 24, width: 290, padding: 14, zIndex: 1000 }}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shift(-1)} className="rounded-lg p-1" style={{ border: 'none', background: 'rgba(124,41,255,.08)', color: C.muted, cursor: 'pointer' }}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 800, fontSize: 13, color: C.ink }}>{MON[vw.m]} {vw.y}</span>
        <button onClick={() => shift(1)} className="rounded-lg p-1" style={{ border: 'none', background: 'rgba(124,41,255,.08)', color: C.muted, cursor: 'pointer' }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: C.dim }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const cur = ymd(vw.y, vw.m, d);
          const sel = cur === s || cur === e; const inr = s && e && cur > s && cur < e;
          return <button key={i} onClick={() => pick(d)} className="rounded-lg" style={{ height: 30, fontSize: 12, fontWeight: sel ? 800 : 500, cursor: 'pointer', border: 'none', background: sel ? C.violet : inr ? 'rgba(124,41,255,.14)' : 'transparent', color: sel ? '#fff' : C.ink }}>{d}</button>;
        })}
      </div>
      <div className="flex items-center justify-between mt-3">
        <span style={{ fontSize: 11, color: C.muted }}>{s ? `${fmtShort(s)}${e ? ' – ' + fmtShort(e) : ''}` : 'Pick a range'}</span>
        <Btn onClick={() => s && onApply(s, e || s)} disabled={!s} style={{ padding: '6px 14px', fontSize: 12 }}>Apply</Btn>
      </div>
    </div>,
    document.body
  );
}

function Console() {
  const [reports, reloadReports] = useLive('reports', () => db.listReports(), ['reports']);
  const [roster] = useLive('roster', () => db.getRoster(), ['roster']);
  const [fShift, setFShift] = useState('all'); const [fProfile, setFProfile] = useState('all'); const [fCSR, setFCSR] = useState('all'); const [range, setRange] = useState({ mode: 'today' });
  const win = useMemo(() => winFor(range), [range]);
  // Load actions ONLY for the selected window (not the whole history) so a busy shift
  // doesn't re-download every action on each realtime tick. 'All time' still loads everything.
  const winKey = win ? `${win.s}_${win.e}` : 'all';
  const [allActions, reloadActions] = useLive('actions:' + winKey, () => db.actionsInWindow(win), ['actions']);
  const [drill, setDrill] = useState(null); const [panel, setPanel] = useState(null); const [act, setAct] = useState(null);
  const [exporting, setExporting] = useState(false);
  const load = useCallback(() => { reloadReports(); reloadActions(); }, [reloadReports, reloadActions]);
  const filtered = useMemo(() => reports.filter(r => (fShift === 'all' || r.shift === fShift) && (fProfile === 'all' || r.profile === fProfile) && (fCSR === 'all' || r.csr_name === fCSR) && inWin(r.date, win)), [reports, fShift, fProfile, fCSR, win]);
  const byReport = useMemo(() => { const m = {}; allActions.forEach(a => { (m[a.report_id] = m[a.report_id] || []).push(a); }); return m; }, [allActions]);
  const cnt = id => { const m = {}; (byReport[id] || []).forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; };
  const acts = useMemo(() => { const s = new Set(filtered.map(r => r.id)); return allActions.filter(a => s.has(a.report_id)); }, [filtered, allActions]);
  const totals = useMemo(() => { const m = {}; acts.forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; }, [acts]);
  const online = filtered.filter(r => r.status === 'open').length;
  const ranked = useMemo(() => [...filtered].sort((a, b) => {
    const ao = a.status === 'open' ? 1 : 0, bo = b.status === 'open' ? 1 : 0;
    if (ao !== bo) return bo - ao;                                          // live (open) reports first
    return (byReport[b.id]?.length || 0) - (byReport[a.id]?.length || 0);    // then by activity
  }), [filtered, byReport]);
  const sortedTypes = Object.keys(totals).sort((a, b) => totals[b] - totals[a]); const maxType = totals[sortedTypes[0]] || 1;
  const label = winLabel(range);
  const flags = acts.filter(a => a.type === 'frustrated' || a.type === 'disputed');
  const idle = filtered.filter(r => r.status === 'open' && !(byReport[r.id]?.length));
  const repById = id => filtered.find(r => r.id === id) || reports.find(r => r.id === id);
  const byProfile = useMemo(() => { const m = {}; filtered.forEach(r => { m[r.profile] = (m[r.profile] || 0) + (byReport[r.id]?.length || 0); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [filtered, byReport]);
  // Live feed — newest actions across EVERY shift / profile / CSR (ignores filters on purpose)
  const repMap = useMemo(() => Object.fromEntries(reports.map(r => [r.id, r])), [reports]);
  const latest = useMemo(() => [...allActions].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 6), [allActions]);
  const submitted = filtered.filter(r => r.status === 'submitted').length;
  // Activity trend (with time-axis labels) for the hero band — find the busiest bucket
  const trend = useMemo(() => buildTrend(acts.map(a => a.created_at), win), [acts, win]);
  const peak = trend.data.reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);
  const peakVal = trend.data[peak] || 0;
  const hourly = win && win.s === win.e;
  const team = useMemo(() => {
    const m = {};
    filtered.forEach(r => {
      const t = m[r.csr_name] || (m[r.csr_name] = { name: r.csr_name, actions: 0, shifts: new Set(), profiles: new Set(), open: false, types: {} });
      t.actions += byReport[r.id]?.length || 0; t.shifts.add(r.shift); t.profiles.add(r.profile);
      if (r.status === 'open') t.open = true;
      (byReport[r.id] || []).forEach(a => t.types[a.type] = (t.types[a.type] || 0) + 1);
    });
    return Object.values(m).map(t => ({ ...t, shifts: [...t.shifts], profiles: [...t.profiles], top: Object.keys(t.types).sort((a, b) => t.types[b] - t.types[a])[0] })).sort((a, b) => b.actions - a.actions);
  }, [filtered, byReport]);

  // Programmatically drawn, branded PDF (vector text — crisp at any zoom),
  // matching the CSR Pulse report style. Filename is named after the selected
  // window (DD-MM-YYYY), e.g. csr-shift-logger-17-06-2026.pdf.
  async function exportPdf() {
    if (exporting || !filtered.length) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

      const VIOLET = [114, 41, 255], INK = [22, 10, 51], BODY = [60, 50, 100],
        MUTED = [120, 110, 155], DIM = [170, 162, 200], HAIRLINE = [228, 224, 240],
        MINT = [16, 185, 129], AMBER = [245, 158, 11], CORAL = [239, 68, 68], TRACK = [237, 231, 255];
      const W = 210, H = 297, M = 18, TOP_M = 22, PAGE_BOTTOM = H - 22;
      let y = TOP_M;

      const setFill = c => doc.setFillColor(c[0], c[1], c[2]);
      const setText = c => doc.setTextColor(c[0], c[1], c[2]);
      const setDraw = c => doc.setDrawColor(c[0], c[1], c[2]);
      const hairline = yPos => { setDraw(HAIRLINE); doc.setLineWidth(0.2); doc.line(M, yPos, W - M, yPos); };
      const truncate = (s, max) => { s = String(s ?? ''); return s.length <= max ? s : s.slice(0, max - 1) + '…'; };
      const eyebrow = (text, x, yPos, align) => {
        setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        const cs = 0.6; doc.setCharSpace(cs); const up = String(text).toUpperCase();
        if (align === 'right' || align === 'center') {
          const w = doc.getTextWidth(up) + (up.length - 1) * cs;
          doc.text(up, align === 'right' ? x - w : x - w / 2, yPos);
        } else doc.text(up, x, yPos);
        doc.setCharSpace(0);
      };

      // The HaseebMadeIt mark → PNG (no network needed).
      const logoPng = await new Promise((resolve) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 392.35 392.35"><rect width="392.35" height="392.35" rx="70" fill="#7229FF"/><path fill="#fff" d="M187.32,115.24h17.71c2.46,0,4.46,1.99,4.46,4.46v61.29c0,1.98-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-66.45c0-2.46,1.99-4.46,4.46-4.46ZM167.44,142.55v50.69c0,1.98-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-55.85c0-2.46,1.99-4.46,4.46-4.46h17.71c2.46,0,4.46,1.99,4.46,4.46ZM144.03,219.52l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v31.16c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46v-26c0-1.98,1.31-3.73,3.21-4.28ZM186.07,207.27l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v66.26c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46v-61.1c0-1.99,1.31-3.73,3.21-4.28ZM224.9,249.8v-50.5c0-1.98,1.31-3.73,3.21-4.28l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v55.66c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46ZM251.52,142.55v26.19c0,1.99-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-31.35c0-2.46,1.99-4.46,4.46-4.46h17.71c2.46,0,4.46,1.99,4.46,4.46h0Z"/></svg>`;
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
        const img = new Image();
        img.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; cv.getContext('2d').drawImage(img, 0, 0, 256, 256); URL.revokeObjectURL(url); resolve(cv.toDataURL('image/png')); };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });

      const toDMY = iso => { const [yy, mm, dd] = String(iso).split('-'); return `${dd}-${mm}-${yy}`; };
      const periodLabel = win ? (win.s === win.e ? toDMY(win.s) : `${toDMY(win.s)} to ${toDMY(win.e)}`) : 'All time';
      const rangeKind = { today: 'TODAY', yesterday: 'YESTERDAY', '7d': 'LAST 7 DAYS', '30d': 'LAST 30 DAYS', all: 'ALL TIME', custom: 'CUSTOM RANGE' }[range.mode] || 'REPORT';

      const runningHeader = () => {
        if (logoPng) doc.addImage(logoPng, 'PNG', M, 12, 6, 6);
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setCharSpace(0.5);
        doc.text('CSR SHIFT LOGGER', M + 8.5, 16.4); doc.setCharSpace(0);
        setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(`${rangeKind.toLowerCase()} · ${periodLabel}`, W - M, 16.4, { align: 'right' });
        hairline(20);
      };
      const newPage = () => { doc.addPage(); runningHeader(); y = 28; };
      const ensureSpace = need => { if (y + need > PAGE_BOTTOM) newPage(); };
      const sectionHeader = (eb, title, right) => {
        ensureSpace(20); eyebrow(eb, M, y);
        if (right) { setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(right, W - M, y, { align: 'right' }); }
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(title, M, y + 7); y += 13;
      };

      const repById = {}; filtered.forEach(r => { repById[r.id] = r; });
      const uniqCsr = new Set(filtered.map(r => r.csr_name)).size;

      // ── Identity strip
      if (logoPng) doc.addImage(logoPng, 'PNG', M, TOP_M - 8, 11, 11);
      setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('CSR Shift Logger', M + 14, TOP_M - 3);
      setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text('HASEEBMADEIT · Operations report', M + 14, TOP_M + 1);
      eyebrow(rangeKind, W - M, TOP_M - 3, 'right');
      setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(periodLabel, W - M, TOP_M + 1, { align: 'right' });
      y = TOP_M + 12; hairline(y); y += 16;

      // ── Hero
      const profilesActive = new Set(filtered.map(r => r.profile)).size;
      eyebrow('Actions logged', M, y);
      setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(40); doc.text(String(acts.length), M, y + 15);
      setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      doc.text(`across ${filtered.length} report${filtered.length === 1 ? '' : 's'}  ·  ${profilesActive} profile${profilesActive === 1 ? '' : 's'} active  ·  ${uniqCsr} CSR${uniqCsr === 1 ? '' : 's'} on`, M, y + 22);
      y += 31;

      // ── KPI cards (mirror the dashboard's four)
      const cards = [
        ['Open now', String(online), 'reports in progress'],
        ['Submitted', String(submitted), 'reports'],
        ['Actions logged', String(acts.length), 'across reports'],
        ['Needs attention', String(flags.length + idle.length), 'flags + idle'],
      ];
      const gap = 4, cw = (W - 2 * M - gap * 3) / 4, chh = 22;
      cards.forEach((c, i) => {
        const x = M + i * (cw + gap);
        setFill([248, 247, 252]); setDraw(HAIRLINE); doc.setLineWidth(0.2); doc.roundedRect(x, y, cw, chh, 2.2, 2.2, 'FD');
        eyebrow(c[0], x + 4, y + 6);
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(c[1], x + 4, y + 14);
        setText(DIM); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.1); doc.text(c[2], x + 4, y + 18.5);
      });
      y += chh + 16;

      // ── Activity by hour / day
      sectionHeader('Pulse', `Activity · by ${hourly ? 'hour' : 'day'}`, peakVal > 0 ? `busiest ${trend.full[peak]} · ${peakVal}` : 'no activity yet');
      {
        const n = trend.data.length || 1, cmax = Math.max(...trend.data, 1);
        const chartW = W - 2 * M, slotW = chartW / n, barW = Math.min(slotW * 0.62, 11), chartH = 24, baseY = y + chartH;
        trend.data.forEach((v, i) => {
          const bx = M + i * slotW + (slotW - barW) / 2, bh = v > 0 ? Math.max(1, (v / cmax) * chartH) : 0.6;
          setFill(i === peak && v > 0 ? VIOLET : TRACK); doc.roundedRect(bx, baseY - bh, barW, bh, 0.8, 0.8, 'F');
          if (v > 0 && n <= 12) { setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text(String(v), bx + barW / 2, baseY - bh - 1.4, { align: 'center' }); }
        });
        setDraw(HAIRLINE); doc.setLineWidth(0.2); doc.line(M, baseY, W - M, baseY);
        setText(DIM); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
        const every = n <= 12 ? 1 : Math.ceil(n / 10);
        trend.labels.forEach((lab, i) => { if (i % every === 0) doc.text(String(lab), M + i * slotW + slotW / 2, baseY + 4, { align: 'center' }); });
        y = baseY + 12;
      }

      // ── Reports (detailed, with per-type breakdown)
      sectionHeader('Live', 'Reports', `${ranked.length} total`);
      const cProf = M + 50, cShift = M + 98, cTime = M + 124, cAct = W - M;
      setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setCharSpace(0.4);
      doc.text('CSR', M + 4, y); doc.text('PROFILE', cProf, y); doc.text('SHIFT', cShift, y); doc.text('TIME (PKT)', cTime, y);
      { const t = 'ACTIONS'; const w = doc.getTextWidth(t) + (t.length - 1) * 0.4; doc.text(t, cAct - w, y); }
      doc.setCharSpace(0); y += 2.5; hairline(y); y += 5;
      ranked.forEach(r => {
        ensureSpace(10);
        const cc = cnt(r.id), n = byReport[r.id]?.length || 0, open = r.status === 'open';
        setFill(open ? MINT : DIM); doc.circle(M + 1, y - 1.4, 0.9, 'F');
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(truncate(r.csr_name, 22), M + 4, y);
        setText(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        doc.text(truncate(r.profile || '—', 22), cProf, y);
        doc.text(truncate(r.shift || '—', 10), cShift, y);
        doc.text(timePKT(r.start_at) + (r.finish_at ? '–' + timePKT(r.finish_at) : ''), cTime, y);
        setText(INK); doc.setFont('helvetica', 'bold'); doc.text(String(n), cAct, y, { align: 'right' });
        y += 4.4;
        if (n === 0) { setText(AMBER); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('idle · nothing logged yet', M + 4, y); }
        else { setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(truncate(Object.keys(cc).map(t => `${KPI_LABEL[t] || t} ${cc[t]}`).join('    '), 98), M + 4, y); }
        y += 3; setDraw([240, 238, 248]); doc.setLineWidth(0.15); doc.line(M, y - 1.4, W - M, y - 1.4); y += 1.6;
      });
      y += 8;

      // ── By activity (proportional bars)
      if (sortedTypes.length) {
        sectionHeader('Totals', 'By activity', `${acts.length} action${acts.length === 1 ? '' : 's'}`);
        const max = totals[sortedTypes[0]] || 1, barX = M + 66, barW = (W - M) - barX - 12;
        sortedTypes.forEach(t => {
          ensureSpace(7);
          setText(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(truncate(KPI_LABEL[t] || t, 32), M, y);
          const v = totals[t], bw = Math.max(1.5, (v / max) * barW);
          setFill(TRACK); doc.roundedRect(barX, y - 2.9, barW, 3.2, 1, 1, 'F');
          setFill(VIOLET); doc.roundedRect(barX, y - 2.9, bw, 3.2, 1, 1, 'F');
          setText(INK); doc.setFont('helvetica', 'bold'); doc.text(String(v), W - M, y, { align: 'right' });
          y += 7;
        });
        y += 6;
      }

      // ── By profile
      if (byProfile.length) {
        sectionHeader('Split', 'By profile', `${byProfile.length} profile${byProfile.length === 1 ? '' : 's'}`);
        const pmax = byProfile[0][1] || 1, barX = M + 66, barW = (W - M) - barX - 12;
        byProfile.forEach(([p, v]) => {
          ensureSpace(7);
          setText(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(truncate(p || '—', 32), M, y);
          const bw = Math.max(1.5, (v / pmax) * barW);
          setFill(TRACK); doc.roundedRect(barX, y - 2.9, barW, 3.2, 1, 1, 'F');
          setFill([94, 31, 216]); doc.roundedRect(barX, y - 2.9, bw, 3.2, 1, 1, 'F');
          setText(INK); doc.setFont('helvetica', 'bold'); doc.text(String(v), W - M, y, { align: 'right' });
          y += 7;
        });
        y += 6;
      }

      // ── Who's on (per CSR)
      if (team.length) {
        sectionHeader('Team', "Who's on", `${team.length} ${team.length === 1 ? 'person' : 'people'}`);
        setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setCharSpace(0.4);
        doc.text('CSR', M + 4, y); doc.text('SHIFTS · PROFILES', M + 50, y); doc.text('TOP ACTION', M + 116, y);
        { const t = 'ACTIONS'; const w = doc.getTextWidth(t) + (t.length - 1) * 0.4; doc.text(t, W - M - w, y); }
        doc.setCharSpace(0); y += 2.5; hairline(y); y += 5;
        team.forEach(t => {
          ensureSpace(7);
          setFill(t.open ? MINT : DIM); doc.circle(M + 1, y - 1.4, 0.9, 'F');
          setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(truncate(t.name, 22), M + 4, y);
          setText(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
          doc.text(truncate(`${t.shifts.join('/')} · ${t.profiles.length} prof`, 34), M + 50, y);
          doc.text(truncate(t.top ? (KPI_LABEL[t.top] || t.top) : '—', 22), M + 116, y);
          setText(INK); doc.setFont('helvetica', 'bold'); doc.text(String(t.actions), W - M, y, { align: 'right' });
          y += 5; setDraw([240, 238, 248]); doc.setLineWidth(0.15); doc.line(M, y - 1.7, W - M, y - 1.7); y += 1.6;
        });
        y += 8;
      }

      // ── Needs attention (flagged actions)
      if (flags.length) {
        sectionHeader('Watch', 'Needs attention', `${flags.length} flagged`);
        flags.forEach(a => {
          ensureSpace(11);
          const r = repById[a.report_id];
          setFill(a.type === 'disputed' ? AMBER : CORAL); doc.circle(M + 1, y - 1.4, 0.9, 'F');
          setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
          doc.text(truncate(`${ACTION_BY_KEY[a.type]?.label || a.type}${a.client ? ' · ' + a.client : ''}`, 64), M + 4, y);
          setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(timePKT(a.created_at), W - M, y, { align: 'right' });
          y += 4.4;
          const sum = actionSummary(a);
          if (sum) { setText(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(truncate(sum, 96), M + 4, y); y += 4; }
          if (r) { setText(DIM); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(truncate(`logged by ${r.csr_name} · ${r.profile || '—'} · ${r.shift || '—'}`, 96), M + 4, y); y += 4; }
          y += 1.4; setDraw([244, 242, 250]); doc.setLineWidth(0.15); doc.line(M, y - 1.4, W - M, y - 1.4); y += 1.4;
        });
        y += 6;
      }

      // ── Idle now
      if (idle.length) {
        sectionHeader('Watch', 'Idle now', `${idle.length}`);
        idle.forEach(r => {
          ensureSpace(6);
          setFill(AMBER); doc.circle(M + 1, y - 1.4, 0.9, 'F');
          setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(truncate(r.csr_name, 24), M + 4, y);
          setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(truncate(`${r.profile || '—'} · ${r.shift || '—'}`, 44), M + 52, y);
          setText(AMBER); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('IDLE', W - M, y, { align: 'right' });
          y += 5.5; setDraw([240, 238, 248]); doc.setLineWidth(0.15); doc.line(M, y - 1.7, W - M, y - 1.7); y += 1.4;
        });
        y += 6;
      }

      // ── Footers (page numbers, after all pages exist)
      const totalPages = doc.getNumberOfPages();
      const fd = [
        fCSR !== 'all' ? `CSR=${fCSR}` : null,
        fShift !== 'all' ? `Shift=${fShift}` : null,
        fProfile !== 'all' ? `Profile=${fProfile}` : null,
      ].filter(Boolean).join(' · ');
      const gen = `Generated ${toDMY(todayPKT())} ${timePKT()} PKT`;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p); const fy = H - 12; hairline(fy - 4);
        setText(DIM); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
        doc.text('CSR Shift Logger · HASEEBMADEIT · Confidential', M, fy);
        doc.text(fd || gen, W / 2, fy, { align: 'center' });
        doc.text(`Page ${p} of ${totalPages}`, W - M, fy, { align: 'right' });
      }

      const datePart = win ? (win.s === win.e ? toDMY(win.s) : `${toDMY(win.s)}_to_${toDMY(win.e)}`) : 'all-time';
      doc.save(`csr-shift-logger-${datePart}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 pr-3" style={{ borderRight: '1px solid rgba(124,41,255,.14)' }}><Filter size={14} style={{ color: C.dim }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.dim }}>Filters</span></div>
          <DateRangePicker value={range} onChange={setRange} />
          <Select value={fCSR} onChange={e => setFCSR(e.target.value)}><option value="all">All CSRs</option>{roster.filter(r => r.active && !isDesigner(r)).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</Select>
          <Select value={fShift} onChange={e => setFShift(e.target.value)}><option value="all">All shifts</option>{SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
          <Select value={fProfile} onChange={e => setFProfile(e.target.value)}><option value="all">All profiles</option>{PROFILES.map(p => <option key={p} value={p}>{p}</option>)}</Select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>{filtered.length} · {label}</span>
            <Btn onClick={exportPdf} disabled={!filtered.length || exporting} className="lift" style={{ padding: '8px 14px', fontSize: 12, border: '1px solid transparent' }}>{exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}{exporting ? 'Preparing…' : 'Export PDF'}</Btn>
          </div>
        </div>
      </Card>

      {/* Hero · today at a glance */}
      <div className="lift rounded-2xl mb-6" style={{ position: 'relative', overflow: 'hidden', padding: '22px 26px', color: '#fff', background: 'linear-gradient(135deg, #1B1140 0%, #3A1D7A 52%, #5E1FD8 120%)', boxShadow: '0 20px 50px rgba(94,31,216,.28)' }}>
        <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'rgba(159,102,255,.40)', filter: 'blur(70px)', top: -100, right: 30 }} />
        <div className="relative flex items-end justify-between gap-5" style={{ flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .68 }}>HaseebMadeIt · Operations · {label}</div>
            <div className="disp" style={{ fontSize: 30, fontWeight: 700, marginTop: 7, lineHeight: 1.05 }}>{acts.length} {acts.length === 1 ? 'action' : 'actions'} <span style={{ opacity: .6, fontWeight: 600, fontSize: 17 }}>across {filtered.length} {filtered.length === 1 ? 'report' : 'reports'}</span></div>
            <div className="flex" style={{ gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
              {[['Open now', online], ['Profiles active', new Set(filtered.map(r => r.profile)).size], ['CSRs on', new Set(filtered.map(r => r.csr_name)).size], ['Needs attention', flags.length + idle.length]].map(([l, v]) => (
                <div key={l}><div className="mono" style={{ fontSize: 21, fontWeight: 700, lineHeight: 1 }}>{v}</div><div style={{ fontSize: 10, opacity: .7, fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{ minWidth: 300 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6, gap: 12 }}>
              <span style={{ fontSize: 10, opacity: .7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' }}>Activity · {hourly ? 'by hour' : 'by day'}</span>
              {peakVal > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, background: 'rgba(255,255,255,.16)', padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>Busiest {trend.full[peak]} · {peakVal}</span>}
            </div>
            <TrendChart data={trend.data} labels={trend.labels} peak={peak} color="#FFFFFF" w={320} h={80} />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open now" value={online} sub="reports in progress" accent={C.mint} icon={Activity} onClick={() => setPanel('open')} />
        <StatCard label="Submitted" value={submitted} sub={`reports · ${label.toLowerCase()}`} accent={C.violet} icon={ClipboardList} onClick={() => setPanel('submitted')} />
        <StatCard label="Actions logged" value={acts.length} sub="across reports" accent={C.glow} icon={BarChart3} onClick={() => setPanel('actions')} />
        <StatCard label="Needs attention" value={flags.length + idle.length} sub="flags + idle" accent={flags.length + idle.length ? C.coral : C.mint} icon={AlertTriangle} onClick={() => setPanel('attention')} />
      </div>

      <div className="mb-6">
        <SectionHeader eyebrow="Pulse · live" title="Latest activity" color={C.mint}
          right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}` }} /> all shifts &amp; profiles</span>} />
        <Card style={{ overflow: 'hidden' }}>
          {latest.length === 0 ? <div style={{ color: C.dim, fontSize: 13, padding: 16 }}>No activity logged yet.</div> : (
            <div className="loopx" style={{ padding: '14px 0' }}>
              {[...latest, ...latest].map((a, i) => { const r = repMap[a.report_id]; return (
                <span key={i} onClick={() => setAct(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 22px', borderRight: '1px solid rgba(124,41,255,.08)', cursor: 'pointer', verticalAlign: 'middle' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9, flex: '0 0 auto', background: groupColor(ACTION_BY_KEY[a.type]?.group) }} />
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>{ACTION_BY_KEY[a.type]?.label || a.type}{a.client ? <span style={{ color: C.muted, fontWeight: 500 }}> · {a.client}</span> : ''}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: C.muted, whiteSpace: 'nowrap' }}>{r ? <><b style={{ color: C.violetDim, fontWeight: 700 }}>{r.csr_name}</b> · {r.profile} · {r.shift}</> : '—'} · {ago(a.created_at)}</span>
                  </span>
                </span>); })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader eyebrow="Live" title="Reports" right={`${filtered.length} · tap to open`} />
          <div className="scroll-y" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 560, overflowY: 'auto', paddingRight: 6 }}>
            {ranked.length === 0 && <Card className="p-5"><span style={{ color: C.dim, fontSize: 13 }}>No reports for this filter.</span></Card>}
            {ranked.map(r => { const c = cnt(r.id); const n = byReport[r.id]?.length || 0; return (
              <Card key={r.id} onClick={() => setDrill(r.id)} className="lift p-4" style={{ cursor: 'pointer' }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {r.status === 'open' && <span style={{ width: 8, height: 8, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}`, flex: '0 0 auto' }} />}
                    <span style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>{r.csr_name}</span>
                    <Pill color={C.violet}>{r.profile}</Pill><Pill color={SHIFT_COLOR[r.shift]}>{r.shift}</Pill>
                    <span style={{ fontSize: 11, color: C.dim }}>{r.date} · {timePKT(r.start_at)}{r.finish_at ? '–' + timePKT(r.finish_at) : ''}</span>
                  </div>
                  <div className="flex items-center gap-2"><span className="mono" style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{n}</span><span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>actions</span></div>
                </div>
                <div className="mt-2.5 flex gap-1.5 flex-wrap">
                  {Object.keys(c).slice(0, 7).map(t => <span key={t} style={{ background: 'rgba(124,41,255,.08)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: C.violetDim }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}
                  {n === 0 && <span style={{ fontSize: 10.5, color: C.amber, fontWeight: 700 }}>idle · nothing logged yet</span>}
                </div>
              </Card>); })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <SectionHeader eyebrow="Watch" title="Needs attention" color={C.coral} right={`${flags.length}`} />
            <Card className="p-4">
              {flags.length === 0
                ? <div style={{ color: C.mint, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> All clear — nothing flagged.</div>
                : <div className="scroll-y" style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 6 }}>
                    {flags.map(a => { const r = repById(a.report_id); return (
                      <div key={a.id} onClick={() => setAct(a)} className="glass-soft rounded-xl" style={{ padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${C.coral}`, cursor: 'pointer' }}>
                        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                          <Pill color={C.coral}>{a.type === 'disputed' ? 'Disputed' : 'Frustrated'}</Pill>
                          <span style={{ fontWeight: 800, fontSize: 13, color: C.ink }}>{a.client || '—'}</span>
                        </div>
                        {actionSummary(a) && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 5, lineHeight: 1.35 }}>{actionSummary(a)}</div>}
                        {r && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 5 }}>Logged by <b style={{ color: C.violetDim, fontWeight: 700 }}>{r.csr_name}</b> · {r.profile} · {r.shift}</div>}
                      </div>); })}
                  </div>}
            </Card>
          </div>
          <div>
            <SectionHeader eyebrow="Watch" title="Idle now" color={C.amber} right={`${idle.length}`} />
            <Card className="p-4">
              {idle.length === 0
                ? <div style={{ color: C.mint, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> Everyone's logging — none idle.</div>
                : <div className="scroll-y" style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 6 }}>
                    {idle.map(r => <div key={r.id} onClick={() => setDrill(r.id)} className="flex items-center justify-between" style={{ padding: '8px 2px', cursor: 'pointer', borderBottom: '1px solid rgba(124,41,255,.06)' }}>
                      <span style={{ fontSize: 12.5, color: C.ink }}><b style={{ fontWeight: 700 }}>{r.csr_name}</b> <span style={{ color: C.dim, fontWeight: 500 }}>· {r.profile} · {r.shift}</span></span>
                      <Pill color={C.amber}>idle</Pill>
                    </div>)}
                  </div>}
            </Card>
          </div>
          <div>
            <SectionHeader eyebrow="Totals" title="By activity" right={`${acts.length}`} />
            <Card className="p-5">
              {sortedTypes.length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>Nothing logged.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {sortedTypes.slice(0, 9).map(t => (
                  <div key={t}><div className="mb-1 flex items-center justify-between text-xs"><span style={{ color: C.ink, fontWeight: 600 }}>{KPI_LABEL[t] || t}</span><span className="mono" style={{ color: C.muted }}>{totals[t]}</span></div>
                    <div style={{ height: 6, borderRadius: 6, background: 'rgba(124,41,255,.12)' }}><div style={{ height: 6, borderRadius: 6, width: `${(totals[t] / maxType) * 100}%`, background: `linear-gradient(90deg,${C.glow},${C.violet})` }} /></div></div>))}
              </div>
            </Card>
          </div>
          {byProfile.length > 0 && <div>
            <SectionHeader eyebrow="Split" title="By profile" />
            <Card className="p-4">{byProfile.slice(0, 8).map(([p, n]) => <div key={p} className="flex items-center justify-between" style={{ padding: '4px 0', fontSize: 12 }}><span style={{ color: C.ink, fontWeight: 600 }}>{p}</span><span className="mono" style={{ color: C.muted }}>{n}</span></div>)}</Card>
          </div>}
        </div>
      </div>

      {team.length > 0 && (
        <div className="mt-6">
          <SectionHeader eyebrow="Team" title="Who's on" right={`${team.length} ${team.length === 1 ? 'person' : 'people'} · ${label}`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {team.map(t => (
              <div key={t.name} onClick={() => setFCSR(fCSR === t.name ? 'all' : t.name)} className="glass lift rounded-2xl p-4" style={{ cursor: 'pointer', outline: fCSR === t.name ? `2px solid ${C.violet}` : 'none' }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 12, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', background: `linear-gradient(150deg, ${C.glow}, ${SHIFT_COLOR[t.shifts[0]] || C.violet})` }}>{initials(t.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate" style={{ fontWeight: 800, fontSize: 13.5, color: C.ink }}>{t.name}</span>
                      <span style={{ width: 7, height: 7, borderRadius: 9, flex: '0 0 auto', background: t.open ? C.mint : C.dim, boxShadow: t.open ? `0 0 0 3px ${C.mintBg}` : 'none' }} />
                    </div>
                    <div style={{ fontSize: 10.5, color: C.dim }}>{t.shifts.join(', ')} · {t.profiles.length} profile{t.profiles.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{t.actions}</div><div style={{ fontSize: 9.5, color: C.dim, textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 3 }}>actions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {panel && <StatPanel kind={panel} label={label} reports={filtered} actions={acts} flags={flags} idle={idle} repMap={repMap} byReport={byReport}
        onOpen={id => { setPanel(null); setDrill(id); }} onOpenAction={a => { setPanel(null); setAct(a); }} onClose={() => setPanel(null)} />}
      {act && <ActionDetail action={act} report={repMap[act.report_id]} onClose={go => { const rid = act.report_id; setAct(null); if (go === 'report') setDrill(rid); }} />}
      {drill && <DrillDrawer report={repById(drill)} actions={byReport[drill] || []} onClose={() => setDrill(null)} onDelete={async (id) => { await db.deleteReport(id); setDrill(null); load(); }} />}
    </>
  );
}

// Drill-down list behind each KPI card — open / submitted / actions / needs-attention.
function StatPanel({ kind, label, reports, actions, flags, idle, repMap, byReport, onOpen, onOpenAction, onClose }) {
  const meta = {
    open: { title: 'Open now', sub: 'Reports in progress' },
    submitted: { title: 'Submitted reports', sub: label },
    actions: { title: 'Actions logged', sub: `${actions.length} across ${reports.length} ${reports.length === 1 ? 'report' : 'reports'} · ${label}` },
    attention: { title: 'Needs attention', sub: `${flags.length} flagged · ${idle.length} idle` },
  }[kind];
  const empty = t => <div style={{ color: C.dim, fontSize: 13, padding: '22px 4px', textAlign: 'center' }}>{t}</div>;
  const Row = ({ r }) => (
    <div onClick={() => onOpen(r.id)} className="glass-soft lift rounded-xl" style={{ padding: '11px 13px', marginBottom: 8, cursor: 'pointer' }}>
      <div className="flex items-center justify-between gap-2" style={{ flexWrap: 'wrap' }}>
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          {r.status === 'open' && <span style={{ width: 8, height: 8, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}`, flex: '0 0 auto' }} />}
          <span style={{ fontWeight: 800, fontSize: 13.5, color: C.ink }}>{r.csr_name}</span>
          <Pill color={C.violet}>{r.profile}</Pill><Pill color={SHIFT_COLOR[r.shift]}>{r.shift}</Pill>
        </div>
        <div className="flex items-center gap-1.5"><span className="mono" style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{byReport[r.id]?.length || 0}</span><span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '.06em' }}>actions</span></div>
      </div>
      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 5 }}>{r.date} · {timePKT(r.start_at)}{r.finish_at ? '–' + timePKT(r.finish_at) : ''}</div>
    </div>
  );

  let body;
  if (kind === 'open' || kind === 'submitted') {
    const st = kind === 'open' ? 'open' : 'submitted';
    const list = reports.filter(r => r.status === st).sort((a, b) => (b.start_at || '').localeCompare(a.start_at || ''));
    body = list.length ? list.map(r => <Row key={r.id} r={r} />) : empty(kind === 'open' ? 'No open reports right now.' : 'No submitted reports for this filter.');
  } else if (kind === 'actions') {
    const list = [...actions].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    body = list.length ? list.map(a => { const r = repMap[a.report_id]; return (
      <div key={a.id} onClick={() => onOpenAction(a)} className="glass-soft lift rounded-xl" style={{ padding: '10px 12px', marginBottom: 8, cursor: 'pointer' }}>
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: 9, flex: '0 0 auto', background: groupColor(ACTION_BY_KEY[a.type]?.group) }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{ACTION_BY_KEY[a.type]?.label || a.type}</span>
          {a.client && <span style={{ fontSize: 12, color: C.muted }}>· {a.client}</span>}
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap' }}>{ago(a.created_at)}</span>
        </div>
        {r && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 4 }}><b style={{ color: C.violetDim, fontWeight: 700 }}>{r.csr_name}</b> · {r.profile} · {r.shift}</div>}
      </div>); }) : empty('Nothing logged for this filter.');
  } else {
    body = (flags.length + idle.length) ? <>
      {flags.length > 0 && <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.coral, marginBottom: 7 }}>Flagged clients</div>}
      {flags.map(a => { const r = repMap[a.report_id]; return (
        <div key={a.id} onClick={() => onOpenAction(a)} className="glass-soft lift rounded-xl" style={{ padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${C.coral}`, cursor: 'pointer' }}>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <Pill color={C.coral}>{a.type === 'disputed' ? 'Disputed' : 'Frustrated'}</Pill>
            <span style={{ fontWeight: 800, fontSize: 13, color: C.ink }}>{a.client || '—'}</span>
          </div>
          {actionSummary(a) && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 5 }}>{actionSummary(a)}</div>}
          {r && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 5 }}>Logged by <b style={{ color: C.violetDim, fontWeight: 700 }}>{r.csr_name}</b> · {r.profile} · {r.shift}</div>}
        </div>); })}
      {idle.length > 0 && <div style={{ marginTop: flags.length ? 8 : 0, paddingTop: flags.length ? 10 : 0, borderTop: flags.length ? '1px dashed rgba(124,41,255,.15)' : 'none' }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.amber, marginBottom: 7 }}>Idle now · nothing logged</div>
        {idle.map(r => <div key={r.id} onClick={() => onOpen(r.id)} className="flex items-center justify-between" style={{ padding: '8px 2px', cursor: 'pointer', borderBottom: '1px solid rgba(124,41,255,.06)' }}>
          <span style={{ fontSize: 12.5, color: C.ink }}><b style={{ fontWeight: 700 }}>{r.csr_name}</b> <span style={{ color: C.dim, fontWeight: 500 }}>· {r.profile} · {r.shift}</span></span>
          <Pill color={C.amber}>idle</Pill>
        </div>)}
      </div>}
    </> : empty('All clear — nothing flagged or idle.');
  }

  return (
    <Modal title={meta.title} subtitle={meta.sub} onClose={onClose} width={520}>
      <div className="scroll-y" style={{ maxHeight: '64vh', overflowY: 'auto', paddingRight: 6 }}>{body}</div>
    </Modal>
  );
}

// Single-action detail — shows ONLY the clicked action (not the whole report's timeline).
function ActionDetail({ action, report, onClose }) {
  if (!action) return null;
  const def = ACTION_BY_KEY[action.type];
  const det = actionDetails(action);
  return (
    <Modal title={def?.label || action.type} subtitle={action.client || undefined} onClose={() => onClose()} width={460}>
      <div className="flex items-center gap-3" style={{ fontSize: 12, color: C.muted, marginBottom: 14, flexWrap: 'wrap' }}>
        <span className="flex items-center gap-1"><Clock size={13} /> {timePKT(action.created_at)}</span>
        {report && <span><b style={{ color: C.violetDim, fontWeight: 700 }}>{report.csr_name}</b> · {report.profile} · {report.shift}</span>}
      </div>
      {det.length === 0 ? <div style={{ color: C.dim, fontSize: 13 }}>No extra details were recorded for this action.</div> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {det.map(([l, v], i) => (
            <div key={i} className="glass-soft rounded-xl" style={{ padding: '9px 12px', display: 'flex', gap: 10 }}>
              <span style={{ color: C.dim, fontWeight: 800, fontSize: 10.5, minWidth: 92, flex: '0 0 auto', textTransform: 'uppercase', letterSpacing: '.05em', paddingTop: 1 }}>{l}</span>
              <span style={{ color: C.ink, fontSize: 12.5, wordBreak: 'break-word', lineHeight: 1.4 }}>{v}</span>
            </div>))}
        </div>
      )}
      {report && <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => onClose('report')} className="rounded-lg" style={{ border: '1px solid rgba(124,41,255,.18)', background: 'rgba(124,41,255,.06)', color: C.violetDim, fontWeight: 700, fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>View full report →</button>
      </div>}
    </Modal>
  );
}

function DrillDrawer({ report, actions, onClose, onDelete }) {
  const [del, setDel] = useState(false);
  const [acts, setActs] = useState(actions || []);
  // Always show the report's COMPLETE timeline (not just the windowed slice the list was built from).
  useEffect(() => { setActs(actions || []); if (report) db.listActions(report.id).then(a => { if (Array.isArray(a)) setActs(a); }).catch(() => {}); }, [report && report.id]);
  if (!report) return null;
  const c = {}; acts.forEach(a => c[a.type] = (c[a.type] || 0) + 1);
  return (
    <>
    <div onClick={onClose} className="scrim" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className="no-scrollbar" style={{ width: 440, maxWidth: '100%', height: '100%', overflow: 'auto', animation: 'pop .2s ease', background: '#fff', borderLeft: '1px solid var(--border)', boxShadow: '-24px 0 60px rgba(22,10,51,.18)' }}>
        <div style={{ position: 'sticky', top: 0, padding: '16px 18px', borderBottom: '1px solid rgba(124,41,255,.12)', background: 'rgba(255,255,255,.5)' }} className="flex items-center justify-between">
          <div><div style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>{report.csr_name}</div><div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{report.profile} · {report.shift} · {report.date}</div></div>
          <button onClick={onClose} className="rounded-lg" style={{ border: 'none', background: 'rgba(124,41,255,.08)', width: 30, height: 30, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18 }}>
          <div className="flex items-center gap-3 mb-4" style={{ fontSize: 12, color: C.muted }}><span className="flex items-center gap-1"><Clock size={13} /> {timePKT(report.start_at)}{report.finish_at ? ' – ' + timePKT(report.finish_at) : ' · in progress'}</span><Pill color={report.status === 'open' ? C.mint : C.dim}>{report.status}</Pill></div>
          <div className="mb-4 flex flex-wrap gap-1.5">{Object.keys(c).map(t => <span key={t} style={{ background: 'rgba(124,41,255,.08)', borderRadius: 7, padding: '3px 9px', fontSize: 10.5, fontWeight: 700, color: C.violetDim }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}</div>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: C.dim, marginBottom: 8 }}>Timeline</div>
          {acts.length === 0 && <div style={{ color: C.dim, fontSize: 12.5 }}>No actions logged.</div>}
          {[...acts].reverse().map(a => { const det = actionDetails(a); return (
            <div key={a.id} className="glass-soft rounded-xl" style={{ padding: '11px 13px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9, flex: '0 0 auto', background: groupColor(ACTION_BY_KEY[a.type]?.group) }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{ACTION_BY_KEY[a.type]?.label || a.type}</span>
                </div>
                <span style={{ fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap' }}>{timePKT(a.created_at)}</span>
              </div>
              {det.length > 0 && <div style={{ marginTop: 7, paddingLeft: 16, display: 'grid', gap: 4 }}>
                {det.map(([l, v], i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11.5, lineHeight: 1.35 }}>
                    <span style={{ color: C.dim, fontWeight: 700, minWidth: 86, flex: '0 0 auto' }}>{l}</span>
                    <span style={{ color: C.ink, wordBreak: 'break-word' }}>{v}</span>
                  </div>))}
              </div>}
            </div>); })}
          {report.note_for_next && <div className="mt-3 glass-soft rounded-xl" style={{ padding: 12 }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: C.violetDim, marginBottom: 4 }}>Note for next shift</div><div style={{ fontSize: 12.5, color: C.ink }}>{report.note_for_next}</div></div>}
          {onDelete && <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(124,41,255,.1)' }}>
            <button onClick={() => setDel(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${C.coral}`, background: C.coralBg, color: C.coral, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Trash2 size={14} /> Delete report</button>
            <div style={{ fontSize: 10.5, color: C.dim, textAlign: 'center', marginTop: 6 }}>Removes this report and its activity from the console (e.g. a wrong-profile report).</div>
          </div>}
        </div>
      </div>
    </div>
    {del && <ConfirmDelete what="this report" onConfirm={() => onDelete(report.id)} onClose={() => setDel(false)} />}
    </>
  );
}

function RosterManager() {
  const [roster, setRoster] = useState([]); const [edit, setEdit] = useState(null);
  const load = useCallback(() => db.getRoster().then(setRoster), []);
  useEffect(() => { load(); }, [load]);
  const persist = async n => { setRoster(n); await db.saveRoster(n); };
  const save = async p => { const ex = roster.some(r => r.id === p.id); await persist(ex ? roster.map(r => r.id === p.id ? p : r) : [...roster, p]); setEdit(null); };
  const csrs = roster.filter(r => !isDesigner(r));
  const designers = roster.filter(r => isDesigner(r));
  const designerRoles = [...new Set([...designers.map(d => d.role).filter(Boolean), 'Branding', 'Logo', 'Animation', 'PPT Designer', 'Canva Designer'])];
  const editing = edit && roster.some(r => r.id === edit.id);
  const editDesigner = edit && isDesigner(edit);

  const Actions = ({ c }) => (
    <div className="flex gap-0.5">
      <button onClick={() => setEdit(c)} className="rounded-lg p-1.5" style={{ color: C.dim, background: 'transparent', border: 'none', cursor: 'pointer' }}><Pencil size={14} /></button>
      <button onClick={() => persist(roster.map(r => r.id === c.id ? { ...r, active: !r.active } : r))} className="rounded-lg p-1.5" style={{ color: c.active ? C.dim : C.mint, background: 'transparent', border: 'none', cursor: 'pointer' }}>{c.active ? <Archive size={14} /> : <ArchiveRestore size={14} />}</button>
      <button onClick={() => persist(roster.filter(r => r.id !== c.id))} className="rounded-lg p-1.5" style={{ color: C.coral, background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div><h2 className="disp text-lg font-bold" style={{ color: C.ink }}>CSRs &amp; Managers <span style={{ fontSize: 13, fontWeight: 600, color: C.dim }}>· {csrs.length}</span></h2><p className="mt-1 text-xs" style={{ color: C.muted }}>These names fill the CSR “Your name” list. Archived people keep their history.</p></div>
        <Btn onClick={() => setEdit({ id: uid(), name: '', shift: 'Night', profile: '', role: 'CSR', active: true })} className="lift"><Plus size={15} strokeWidth={2.6} />Add person</Btn>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {csrs.map(c => (
          <Card key={c.id} className="lift p-4" style={{ opacity: c.active ? 1 : 0.55 }}>
            <div className="mb-3 flex items-start justify-between">
              <div><div style={{ fontWeight: 800, color: C.ink }}>{c.name || 'Unnamed'}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap"><Pill color={C.cyan}>CSR</Pill>{c.profile && <Pill color={C.violet}>{c.profile}</Pill>}{!c.active && <Pill color={C.coral}>Archived</Pill>}</div></div>
              <Actions c={c} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>Shift</span>
              <Select value={c.shift} color={SHIFT_COLOR[c.shift]} onChange={e => persist(roster.map(r => r.id === c.id ? { ...r, shift: e.target.value } : r))}>{SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between" style={{ marginTop: 38, paddingTop: 28, borderTop: '1px solid rgba(124,41,255,.16)' }}>
        <div><h2 className="disp text-lg font-bold" style={{ color: C.ink }}>Design Team <span style={{ fontSize: 13, fontWeight: 600, color: C.dim }}>· {designers.length}</span></h2><p className="mt-1 text-xs" style={{ color: C.muted }}>These fill the “Designer” dropdown when assigning work. Archived designers keep their history.</p></div>
        <Btn onClick={() => setEdit({ id: 'd-' + uid(), name: '', shift: '', profile: '', role: '', active: true })} className="lift"><Plus size={15} strokeWidth={2.6} />Add designer</Btn>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {designers.length === 0 && <Card className="p-5"><span style={{ color: C.dim, fontSize: 13 }}>No designers yet — add your design team.</span></Card>}
        {designers.map(c => (
          <Card key={c.id} className="lift p-4" style={{ opacity: c.active ? 1 : 0.55 }}>
            <div className="mb-3 flex items-start justify-between">
              <div><div style={{ fontWeight: 800, color: C.ink }}>{c.name || 'Unnamed'}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap"><Pill color={C.violet}>Designer</Pill>{!c.active && <Pill color={C.coral}>Archived</Pill>}</div></div>
              <Actions c={c} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>Role</span>
              <Select value={c.role} color={C.violet} onChange={e => persist(roster.map(r => r.id === c.id ? { ...r, role: e.target.value } : r))}>{designerRoles.map(rr => <option key={rr} value={rr}>{rr}</option>)}</Select>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8"><SectionHeader eyebrow="Access" title="Registered devices" right="laptop → profile · admin = all" /></div>
      <DevicesCard />

      {edit && <Modal title={(editing ? 'Edit ' : 'Add ') + (editDesigner ? 'designer' : 'person')} onClose={() => setEdit(null)}>
        <Label>Name</Label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="Full name" className="gi" />
        {editDesigner ? (
          <><Label>Role / specialty</Label><input value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value })} placeholder="e.g. Logo, Branding, Animation" className="gi" /></>
        ) : (<>
          <Label>Shift</Label><select value={edit.shift} onChange={e => setEdit({ ...edit, shift: e.target.value })} className="gi">{SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label} ({s.time})</option>)}</select>
          <Label>Profile</Label><select value={edit.profile} onChange={e => setEdit({ ...edit, profile: e.target.value })} className="gi"><option value="">No profile</option>{PROFILES.map(p => <option key={p} value={p}>{p}</option>)}</select>
        </>)}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><Btn variant="ghost" onClick={() => setEdit(null)} style={{ flex: 1 }}>Cancel</Btn><Btn variant="ok" onClick={() => edit.name.trim() && (!editDesigner || edit.role.trim()) && save(edit)} className="lift" style={{ flex: 1 }}>Save</Btn></div>
      </Modal>}
    </>
  );
}
