import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Users, BarChart3, Plus, Pencil, Trash2, Archive, ArchiveRestore, Filter, Activity, ClipboardList, AlertTriangle, X, Clock, Download, ChevronLeft, ChevronRight, CalendarDays, ShieldAlert, ShieldCheck, Monitor } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTION_BY_KEY, KPI_LABEL, CEO_PASSWORD, GROUPS, isDesigner } from './config.js';
import { db, todayPKT, timePKT, addDays, BACKEND } from './store.js';
import { Btn, Card, StatCard, Pill, Select, Chip, SectionHeader, Modal, Label, actionSummary, Logo, TrendChart } from './ui.jsx';

const AUTH_KEY = 'sl_ceo_ok';
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
function deviceLabel(ua) {
  if (!ua) return 'Unknown device';
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${br} · ${os}`;
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
    // Rolling 8-hour window: 7 previous hours on the left → current hour on the right (every hour shown).
    const N = 8;
    const endH = win.s === todayPKT() ? hourPKT(Date.now()) : 23;
    const hrs = []; for (let i = N - 1; i >= 0; i--) hrs.push((endH - i + 24) % 24);
    const slot = Object.fromEntries(hrs.map((h, i) => [h, i]));
    const data = new Array(N).fill(0);
    (times || []).forEach(t => { const h = hourPKT(t); if (h in slot) data[slot[h]]++; });
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
  const [ok, setOk] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [pw, setPw] = useState(''); const [err, setErr] = useState(false);
  if (!ok) {
    const tryOpen = () => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      if (pw === CEO_PASSWORD) { db.logAccess('success', { ua }); sessionStorage.setItem(AUTH_KEY, '1'); setOk(true); }
      else { db.logAccess('failed', { pw, ua }); setErr(true); }
    };
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="glass-2 rounded-2xl pop" style={{ width: 340, overflow: 'hidden' }}>
          <div style={{ padding: '30px 26px 26px', textAlign: 'center' }}>
            <Logo size={52} style={{ margin: '0 auto 14px' }} />
            <div className="disp" style={{ fontWeight: 700, fontSize: 19, color: C.ink }}>CEO Console</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Lock size={11} /> Password-locked · managers only</div>
            <input type="password" value={pw} autoFocus onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === 'Enter' && tryOpen()}
              className="gi" style={{ marginTop: 16, textAlign: 'center', borderColor: err ? C.coral : undefined }} placeholder="Password" />
            {err && <div style={{ color: C.coral, fontSize: 12, marginTop: 8 }}>Wrong password.</div>}
            <Btn onClick={tryOpen} className="lift" style={{ width: '100%', marginTop: 12, padding: 11 }}>Unlock</Btn>
          </div>
        </div>
      </div>
    );
  }
  return <Authed />;
}

function Authed() {
  const [view, setView] = useState('live');
  const [secLog, setSecLog] = useState([]);
  const [seenAt, setSeenAt] = useState(() => localStorage.getItem(SEEN_KEY) || '');
  useEffect(() => {
    const reload = () => db.listAccessLog().then(setSecLog);
    reload();
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    let t; const off = db.subscribe(() => { clearTimeout(t); t = setTimeout(reload, 300); });
    return () => { clearTimeout(t); off && off(); window.removeEventListener('focus', onFocus); };
  }, []);
  const unseen = secLog.filter(e => e.event === 'failed' && (e.created_at || '') > seenAt).length;
  const markSeen = useCallback(() => { const now = new Date().toISOString(); localStorage.setItem(SEEN_KEY, now); setSeenAt(now); }, []);
  const Tab = ({ id, icon: Icon, label, badge }) => { const on = view === id; return (
    <button onClick={() => setView(id)} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all"
      style={on ? { background: C.violet, color: '#fff', boxShadow: '0 6px 16px rgba(114,41,255,.28)' } : { background: 'rgba(255,255,255,.5)', color: C.muted, border: '1px solid rgba(124,41,255,.14)' }}><Icon size={14} />{label}
      {badge > 0 && <span className="mono" style={{ marginLeft: 1, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 9, fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'rgba(255,255,255,.25)' : C.coral, color: '#fff' }}>{badge}</span>}</button>); };
  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="glass" style={{ position: 'sticky', top: 0, zIndex: 30, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div><div className="disp" style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>CEO Console <span style={{ fontSize: 11, fontWeight: 700, color: C.mint }}>· <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}` }} /> live</span></div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim }}>HaseebMadeIt · Operations</div></div>
          </div>
          <div className="flex items-center gap-2"><Tab id="live" icon={BarChart3} label="Live" /><Tab id="roster" icon={Users} label="Roster" /><Tab id="security" icon={ShieldAlert} label="Security" badge={unseen} /></div>
        </div>
      </div>
      <main className="mx-auto max-w-[1500px] px-6 py-6">
        {unseen > 0 && view !== 'security' && (
          <div onClick={() => setView('security')} className="lift" style={{ cursor: 'pointer', marginBottom: 20, padding: '13px 18px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, color: '#fff', background: `linear-gradient(135deg, ${C.coral}, #E11D48)`, boxShadow: '0 12px 30px rgba(225,29,72,.28)' }}>
            <ShieldAlert size={20} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{unseen} failed access attempt{unseen > 1 ? 's' : ''} on the CEO console</div>
              <div style={{ fontSize: 12, opacity: .9 }}>Someone tried a wrong password since you last checked. Tap to review.</div>
            </div>
            <span style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>Review →</span>
          </div>
        )}
        {view === 'live' ? <Console /> : view === 'roster' ? <RosterManager /> : <SecurityPanel log={secLog} seenAt={seenAt} onSeen={markSeen} />}
      </main>
    </div>
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
        <p className="mt-1 text-xs" style={{ color: C.muted }}>Every wrong-password attempt on the CEO console is recorded here. The real password is never stored — only what an intruder typed.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Failed attempts" value={failed.length} sub={failed[0] ? `last ${ago(failed[0].created_at)}` : 'none yet'} accent={failed.length ? C.coral : C.mint} icon={ShieldAlert} />
        <StatCard label="Successful unlocks" value={success.length} sub={success[0] ? `last ${ago(success[0].created_at)}` : 'none yet'} accent={C.mint} icon={ShieldCheck} />
        <StatCard label="Distinct devices" value={new Set(log.map(e => deviceLabel(e.ua))).size} sub="seen on this console" accent={C.violet} icon={Monitor} />
      </div>

      <SectionHeader eyebrow="Watch" title="Failed attempts" color={C.coral} right={`${failed.length}`} />
      <Card className="p-4 mb-6">
        {failed.length === 0
          ? <div style={{ color: C.mint, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={15} /> No failed attempts — nobody's tried a wrong password.</div>
          : <div className="scroll-y" style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 6 }}>
              {failed.map(e => { const isNew = (e.created_at || '') > hiSince; return (
                <div key={e.id} className="glass-soft rounded-xl" style={{ padding: '11px 13px', marginBottom: 8, borderLeft: `3px solid ${C.coral}` }}>
                  <div className="flex items-center justify-between gap-2" style={{ flexWrap: 'wrap' }}>
                    <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: C.dim }}>Tried</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: C.coral, background: 'rgba(244,63,94,.10)', padding: '2px 8px', borderRadius: 7, wordBreak: 'break-all' }}>{e.pw_tried || '(blank)'}</span>
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
      <button ref={btnRef} onClick={toggle} className="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', ...(isCustom || open ? { background: C.violet, color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 12px rgba(114,41,255,.25)' } : { background: 'rgba(255,255,255,.5)', color: C.muted, border: '1px solid rgba(124,41,255,.14)' }) }}>
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
  const [reports, setReports] = useState([]); const [allActions, setAllActions] = useState([]); const [roster, setRoster] = useState([]);
  const [fShift, setFShift] = useState('all'); const [fProfile, setFProfile] = useState('all'); const [fCSR, setFCSR] = useState('all'); const [range, setRange] = useState({ mode: 'today' });
  const [drill, setDrill] = useState(null); const [panel, setPanel] = useState(null); const [act, setAct] = useState(null);
  const load = useCallback(() => { db.listReports().then(setReports); db.allActions().then(setAllActions); }, []);
  useEffect(() => { load(); db.getRoster().then(setRoster); let t; const off = db.subscribe(() => { clearTimeout(t); t = setTimeout(load, 250); }); return () => { clearTimeout(t); off && off(); }; }, [load]);

  const win = useMemo(() => winFor(range), [range]);
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

  async function exportPdf() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 14; let y = 18;
    const V = [114, 41, 255], INK = [21, 8, 47], MUT = [110, 100, 140];
    doc.setFillColor(21, 8, 47); doc.rect(0, 0, W, 26, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('CSR Console Report', M, 13);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 190, 240);
    doc.text(`${label}  ·  generated ${todayPKT()} ${timePKT()} PKT`, M, 20);
    y = 36;
    const kpis = [['Reports', filtered.length], ['Actions', acts.length], ['Open now', online], ['Needs attn.', flags.length + idle.length]];
    const bw = (W - 2 * M - 9) / 4;
    kpis.forEach(([l, v], i) => { const x = M + i * (bw + 3); doc.setFillColor(243, 240, 251); doc.roundedRect(x, y, bw, 18, 2, 2, 'F'); doc.setTextColor(...MUT); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text(String(l).toUpperCase(), x + 4, y + 6); doc.setTextColor(...INK); doc.setFontSize(15); doc.text(String(v), x + 4, y + 14); });
    y += 28;
    doc.setTextColor(...V); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('REPORTS', M, y); y += 2; doc.setDrawColor(228, 224, 240); doc.line(M, y, W - M, y); y += 6;
    doc.setFontSize(7); doc.setTextColor(...MUT); doc.text('CSR', M, y); doc.text('PROFILE', M + 40, y); doc.text('SHIFT', M + 90, y); doc.text('TIME', M + 120, y); doc.text('ACTIONS', W - M, y, { align: 'right' }); y += 2; doc.line(M, y, W - M, y); y += 5;
    ranked.forEach(r => { if (y > 270) { doc.addPage(); y = 20; } const n = byReport[r.id]?.length || 0; doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(r.csr_name, M, y); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUT); doc.setFontSize(8.5); doc.text(r.profile || '—', M + 40, y); doc.text(r.shift || '—', M + 90, y); doc.text(timePKT(r.start_at) + (r.finish_at ? '-' + timePKT(r.finish_at) : ''), M + 120, y); doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.text(String(n), W - M, y, { align: 'right' }); y += 6; doc.setDrawColor(240, 237, 248); doc.line(M, y - 2, W - M, y - 2); });
    y += 6; if (y > 250) { doc.addPage(); y = 20; }
    doc.setTextColor(...V); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('BY ACTIVITY', M, y); y += 2; doc.setDrawColor(228, 224, 240); doc.line(M, y, W - M, y); y += 6;
    sortedTypes.forEach(t => { doc.setTextColor(...INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(KPI_LABEL[t] || t, M, y); doc.setFont('helvetica', 'bold'); doc.text(String(totals[t]), M + 60, y, { align: 'right' }); y += 6; });
    doc.save(`CSR-Console-${todayPKT()}.pdf`);
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
            <Btn onClick={exportPdf} disabled={!filtered.length} className="lift" style={{ padding: '8px 14px', fontSize: 12, border: '1px solid transparent' }}><Download size={13} />Export PDF</Btn>
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
              <Card key={r.id} className="lift p-4" style={{ cursor: 'pointer' }}>
                <div onClick={() => setDrill(r.id)} className="flex items-center justify-between gap-3 flex-wrap">
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
      {drill && <DrillDrawer report={repById(drill)} actions={byReport[drill] || []} onClose={() => setDrill(null)} />}
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

function DrillDrawer({ report, actions, onClose }) {
  if (!report) return null;
  const c = {}; actions.forEach(a => c[a.type] = (c[a.type] || 0) + 1);
  return (
    <div onClick={onClose} className="scrim" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className="glass-2 no-scrollbar" style={{ width: 440, maxWidth: '100%', height: '100%', overflow: 'auto', animation: 'pop .2s ease' }}>
        <div style={{ position: 'sticky', top: 0, padding: '16px 18px', borderBottom: '1px solid rgba(124,41,255,.12)', background: 'rgba(255,255,255,.5)' }} className="flex items-center justify-between">
          <div><div style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>{report.csr_name}</div><div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{report.profile} · {report.shift} · {report.date}</div></div>
          <button onClick={onClose} className="rounded-lg" style={{ border: 'none', background: 'rgba(124,41,255,.08)', width: 30, height: 30, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18 }}>
          <div className="flex items-center gap-3 mb-4" style={{ fontSize: 12, color: C.muted }}><span className="flex items-center gap-1"><Clock size={13} /> {timePKT(report.start_at)}{report.finish_at ? ' – ' + timePKT(report.finish_at) : ' · in progress'}</span><Pill color={report.status === 'open' ? C.mint : C.dim}>{report.status}</Pill></div>
          <div className="mb-4 flex flex-wrap gap-1.5">{Object.keys(c).map(t => <span key={t} style={{ background: 'rgba(124,41,255,.08)', borderRadius: 7, padding: '3px 9px', fontSize: 10.5, fontWeight: 700, color: C.violetDim }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}</div>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: C.dim, marginBottom: 8 }}>Timeline</div>
          {actions.length === 0 && <div style={{ color: C.dim, fontSize: 12.5 }}>No actions logged.</div>}
          {[...actions].reverse().map(a => { const det = actionDetails(a); return (
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
        </div>
      </div>
    </div>
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
