import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lock, Users, BarChart3, Plus, Pencil, Trash2, Archive, ArchiveRestore, Filter, Activity, ClipboardList } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTION_BY_KEY, KPI_LABEL, CEO_PASSWORD } from './config.js';
import { db, todayPKT, timePKT, BACKEND } from './store.js';
import { Btn, StatCard, Pill, Select, Chip, SectionHeader, Modal, Label } from './ui.jsx';

const AUTH_KEY = 'sl_ceo_ok';
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'r_' + Math.random().toString(36).slice(2));
const SHIFT_COLOR = { Morning: C.amber, Evening: C.cyan, Night: C.violet };

export default function CeoApp() {
  const [ok, setOk] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [pw, setPw] = useState(''); const [err, setErr] = useState(false);
  if (!ok) {
    const tryOpen = () => { if (pw === CEO_PASSWORD) { sessionStorage.setItem(AUTH_KEY, '1'); setOk(true); } else setErr(true); };
    return (
      <div style={{ minHeight: '100vh', background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 300, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.4)' }}>
          <div style={{ background: C.ink, color: '#fff', padding: 22, textAlign: 'center' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><Lock size={20} /></div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>CEO / Manager screen</div>
            <div style={{ fontSize: 11, color: '#C9BBFF', marginTop: 3 }}>Managers only</div>
          </div>
          <div style={{ padding: 18 }}>
            <Label>Password</Label>
            <input type="password" value={pw} autoFocus onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === 'Enter' && tryOpen()}
              style={{ width: '100%', border: `1px solid ${err ? C.coral : C.violetLine}`, borderRadius: 9, padding: '10px 12px', fontSize: 14, outline: 'none' }} placeholder="••••••••" />
            {err && <div style={{ color: C.coral, fontSize: 12, marginTop: 6 }}>Wrong password.</div>}
            <Btn onClick={tryOpen} style={{ width: '100%', marginTop: 12, padding: 11 }}>Open</Btn>
          </div>
        </div>
      </div>
    );
  }
  return <Authed />;
}

function Authed() {
  const [view, setView] = useState('live');
  const Tab = ({ id, icon: Icon, label }) => {
    const on = view === id;
    return <button onClick={() => setView(id)} className="flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-all"
      style={{ background: on ? C.violet : 'transparent', color: on ? '#fff' : C.muted, border: `1px solid ${on ? C.violet : C.border}` }}><Icon size={14} />{label}</button>;
  };
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <header style={{ borderBottom: `1px solid ${C.border}`, background: '#fff' }}>
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>C</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>CEO Console <span style={{ fontSize: 11, fontWeight: 700, color: C.mint }}>· <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}` }} /> live</span></div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim }}>HaseebMadeIt · Operations</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tab id="live" icon={BarChart3} label="Live console" />
            <Tab id="roster" icon={Users} label="Roster" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {view === 'live' ? <Console /> : <RosterManager />}
      </main>
    </div>
  );
}

function withinRange(dateStr, range) {
  if (range === 'all') return true;
  const today = todayPKT();
  if (range === 'today') return dateStr === today;
  if (range === 'week') { const d = new Date(dateStr + 'T00:00:00'); const now = new Date(today + 'T00:00:00'); return (now - d) / 864e5 <= 6 && d <= now; }
  return true;
}

function Console() {
  const [reports, setReports] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [fShift, setFShift] = useState('all');
  const [fProfile, setFProfile] = useState('all');
  const [fCSR, setFCSR] = useState('all');
  const [fRange, setFRange] = useState('today');

  const load = useCallback(() => { db.listReports().then(setReports); db.allActions().then(setAllActions); }, []);
  useEffect(() => { load(); db.getRoster().then(setRoster); const off = db.subscribe(load); return off; }, [load]);

  const filtered = useMemo(() => reports.filter(r =>
    (fShift === 'all' || r.shift === fShift) && (fProfile === 'all' || r.profile === fProfile) &&
    (fCSR === 'all' || r.csr_name === fCSR) && withinRange(r.date, fRange)
  ), [reports, fShift, fProfile, fCSR, fRange]);
  const repIds = useMemo(() => new Set(filtered.map(r => r.id)), [filtered]);
  const acts = useMemo(() => allActions.filter(a => repIds.has(a.report_id)), [allActions, repIds]);
  const totals = useMemo(() => { const m = {}; acts.forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; }, [acts]);
  const online = filtered.filter(r => r.status === 'open').length;
  const countsFor = id => { const m = {}; allActions.filter(a => a.report_id === id).forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; };
  const rangeLabel = { today: 'Today', week: 'This week', all: 'All time' }[fRange];
  const sortedTypes = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  const maxType = totals[sortedTypes[0]] || 1;

  return (
    <>
      {/* Filter bar — CSR Pulse style */}
      <div className="mb-6 rounded-xl p-4" style={{ background: C.raised, border: `1px solid ${C.border}` }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 pr-3" style={{ borderRight: `1px solid ${C.border}` }}>
            <Filter size={14} style={{ color: C.dim }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.dim }}>Filters</span>
          </div>
          <div className="flex items-center gap-1">
            {[['today', 'Today'], ['week', 'This week'], ['all', 'All']].map(([v, l]) => <Chip key={v} active={fRange === v} onClick={() => setFRange(v)}>{l}</Chip>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={fCSR} onChange={e => setFCSR(e.target.value)}>
              <option value="all">All CSRs</option>
              {roster.filter(r => r.active).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </Select>
            <Select value={fShift} onChange={e => setFShift(e.target.value)}>
              <option value="all">All shifts</option>
              {SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
            <Select value={fProfile} onChange={e => setFProfile(e.target.value)}>
              <option value="all">All profiles</option>
              {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>{filtered.length} reports · {rangeLabel}</div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Reports open now" value={online} sub={`${rangeLabel.toLowerCase()}`} accent={C.mint} icon={Activity} />
        <StatCard label="Reports" value={filtered.length} sub="CSR · profile · shift" accent={C.violet} icon={ClipboardList} />
        <StatCard label="Actions logged" value={acts.length} sub="across all reports" accent={C.violetGlow} icon={BarChart3} />
        <StatCard label="Inquiries" value={totals.inquiry || 0} sub="new inquiries" accent={C.cyan} icon={Users} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Per-CSR table */}
        <div className="lg:col-span-2">
          <SectionHeader eyebrow="Live" title="Every report" right={`${filtered.length} · updating live`} />
          <div className="rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="grid grid-cols-[1.4fr_1fr_.8fr_auto] gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: C.dim, borderBottom: `1px solid ${C.border}` }}>
              <span>CSR · profile</span><span>Shift</span><span>Time</span><span className="text-right">Counts</span>
            </div>
            {filtered.length === 0 && <div className="px-4 py-6 text-center text-sm" style={{ color: C.dim }}>No reports for this filter.</div>}
            {filtered.map(r => { const c = countsFor(r.id); return (
              <div key={r.id} className="grid grid-cols-[1.4fr_1fr_.8fr_auto] items-center gap-2 px-4 py-3" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="flex items-center gap-2 min-w-0">
                  {r.status === 'open' && <span style={{ width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}`, flex: '0 0 auto' }} />}
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{r.csr_name}</span>
                  <span style={{ fontSize: 12, color: C.dim }}>· {r.profile}</span>
                </div>
                <Pill color={SHIFT_COLOR[r.shift] || C.muted}>{r.shift}</Pill>
                <span style={{ fontSize: 11, color: C.muted }}>{timePKT(r.start_at)}{r.finish_at ? '–' + timePKT(r.finish_at) : ''}</span>
                <div className="flex justify-end gap-1.5 flex-wrap">
                  {Object.keys(c).slice(0, 6).map(t => <span key={t} style={{ background: C.raised, borderRadius: 6, padding: '2px 7px', fontSize: 9.5, fontWeight: 700, color: C.muted }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}
                  {Object.keys(c).length === 0 && <span style={{ fontSize: 10, color: C.dim }}>—</span>}
                </div>
              </div>); })}
          </div>
        </div>

        {/* Activity breakdown */}
        <div>
          <SectionHeader eyebrow="Totals" title="By activity" right={`${acts.length}`} />
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            {sortedTypes.length === 0 && <div className="text-sm" style={{ color: C.dim }}>Nothing logged in this window.</div>}
            <div className="space-y-3">
              {sortedTypes.map(t => (
                <div key={t}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span style={{ color: C.ink, fontWeight: 600 }}>{KPI_LABEL[t] || t}</span>
                    <span className="mono" style={{ color: C.muted }}>{totals[t]}</span>
                  </div>
                  <div className="h-1.5 rounded" style={{ background: C.border }}>
                    <div className="h-1.5 rounded" style={{ background: C.violet, width: `${(totals[t] / maxType) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Roster manager — CSR Pulse card-grid style ──
function RosterManager() {
  const [roster, setRoster] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => db.getRoster().then(setRoster), []);
  useEffect(() => { load(); }, [load]);
  const persist = async (next) => { setRoster(next); await db.saveRoster(next); };
  const save = async (p) => { const exists = roster.some(r => r.id === p.id); await persist(exists ? roster.map(r => r.id === p.id ? p : r) : [...roster, p]); setEdit(null); };
  const remove = async (id) => persist(roster.filter(r => r.id !== id));
  const toggle = async (id) => persist(roster.map(r => r.id === id ? { ...r, active: !r.active } : r));
  const changeShift = async (id, shift) => persist(roster.map(r => r.id === id ? { ...r, shift } : r));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div><h2 className="text-lg font-bold" style={{ color: C.ink }}>Team roster</h2>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>These names fill the CSR “Your name” list. Archived people keep their history.</p></div>
        <Btn onClick={() => setEdit({ id: uid(), name: '', shift: 'Night', profile: '', role: 'CSR', active: true })}><Plus size={13} style={{ verticalAlign: -2 }} /> Add person</Btn>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {roster.map(c => (
          <div key={c.id} className="rounded-xl p-4 transition-all" style={{ background: c.active ? C.card : C.raised, border: `1px solid ${C.border}`, opacity: c.active ? 1 : 0.6 }}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div style={{ fontWeight: 700, color: C.ink }}>{c.name || 'Unnamed'}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <Pill color={c.role === 'Manager' ? C.amber : C.cyan}>{c.role}</Pill>
                  {c.profile && <Pill color={C.violet}>{c.profile}</Pill>}
                  {!c.active && <Pill color={C.coral}>Archived</Pill>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEdit(c)} title="edit" className="rounded p-1.5" style={{ color: C.dim }}><Pencil size={14} /></button>
                <button onClick={() => toggle(c.id)} title="archive" className="rounded p-1.5" style={{ color: c.active ? C.dim : C.mint }}>{c.active ? <Archive size={14} /> : <ArchiveRestore size={14} />}</button>
                <button onClick={() => remove(c.id)} title="remove" className="rounded p-1.5" style={{ color: C.coral }}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>Shift</span>
              <Select value={c.shift} color={SHIFT_COLOR[c.shift]} onChange={e => changeShift(c.id, e.target.value)}>
                {SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </div>
          </div>
        ))}
      </div>

      {edit && <Modal title={roster.some(r => r.id === edit.id) ? 'Edit person' : 'Add person'} onClose={() => setEdit(null)}>
        <Label>Name</Label>
        <input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="Full name" style={inp} />
        <Label>Shift</Label>
        <select value={edit.shift} onChange={e => setEdit({ ...edit, shift: e.target.value })} style={inp}>{SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label} ({s.time})</option>)}</select>
        <Label>Profile</Label>
        <select value={edit.profile} onChange={e => setEdit({ ...edit, profile: e.target.value })} style={inp}><option value="">No profile</option>{PROFILES.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <Label>Role</Label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['CSR', 'Manager'].map(role => { const on = edit.role === role; return <button key={role} onClick={() => setEdit({ ...edit, role })} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${on ? C.violet : C.violetLine}`, background: on ? C.violet : '#fff', color: on ? '#fff' : C.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{role}</button>; })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setEdit(null)} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="ok" onClick={() => edit.name.trim() && save(edit)} style={{ flex: 1 }}>Save</Btn>
        </div>
      </Modal>}
    </>
  );
}

const inp = { width: '100%', border: `1px solid ${C.violetLine}`, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: C.ink, background: '#fff', outline: 'none' };
