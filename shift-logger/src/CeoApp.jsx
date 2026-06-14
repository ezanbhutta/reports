import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lock, Users, BarChart3, Plus, Pencil, Trash2, Archive, ArchiveRestore, Filter, Activity, ClipboardList, AlertTriangle, X, Clock } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTION_BY_KEY, KPI_LABEL, CEO_PASSWORD } from './config.js';
import { db, todayPKT, timePKT, BACKEND } from './store.js';
import { Btn, Card, StatCard, Pill, Select, Chip, SectionHeader, Modal, Label, actionSummary } from './ui.jsx';

const AUTH_KEY = 'sl_ceo_ok';
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'r_' + Math.random().toString(36).slice(2));
const SHIFT_COLOR = { Morning: C.amber, Evening: C.cyan, Night: C.violet };

export default function CeoApp() {
  const [ok, setOk] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [pw, setPw] = useState(''); const [err, setErr] = useState(false);
  if (!ok) {
    const tryOpen = () => { if (pw === CEO_PASSWORD) { sessionStorage.setItem(AUTH_KEY, '1'); setOk(true); } else setErr(true); };
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="glass-2 rounded-2xl pop" style={{ width: 320, overflow: 'hidden' }}>
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: `linear-gradient(180deg,${C.glow},${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 20px rgba(114,41,255,.35)' }}><Lock size={22} color="#fff" /></div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.ink }}>CEO / Manager</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>This screen is password-locked</div>
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
  const Tab = ({ id, icon: Icon, label }) => { const on = view === id; return (
    <button onClick={() => setView(id)} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all"
      style={on ? { background: C.violet, color: '#fff', boxShadow: '0 6px 16px rgba(114,41,255,.28)' } : { background: 'rgba(255,255,255,.5)', color: C.muted, border: '1px solid rgba(124,41,255,.14)' }}><Icon size={14} />{label}</button>); };
  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="glass" style={{ position: 'sticky', top: 0, zIndex: 30, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: C.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>C</div>
            <div><div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>CEO Console <span style={{ fontSize: 11, fontWeight: 700, color: C.mint }}>· <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}` }} /> live</span></div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim }}>HaseebMadeIt · Operations</div></div>
          </div>
          <div className="flex items-center gap-2"><Tab id="live" icon={BarChart3} label="Live" /><Tab id="roster" icon={Users} label="Roster" /></div>
        </div>
      </div>
      <main className="mx-auto max-w-[1500px] px-6 py-6">{view === 'live' ? <Console /> : <RosterManager />}</main>
    </div>
  );
}

function withinRange(d, range) {
  if (range === 'all') return true; const t = todayPKT();
  if (range === 'today') return d === t;
  if (range === 'week') { const a = new Date(d + 'T00:00:00'), n = new Date(t + 'T00:00:00'); return (n - a) / 864e5 <= 6 && a <= n; }
  return true;
}

function Console() {
  const [reports, setReports] = useState([]); const [allActions, setAllActions] = useState([]); const [roster, setRoster] = useState([]);
  const [fShift, setFShift] = useState('all'); const [fProfile, setFProfile] = useState('all'); const [fCSR, setFCSR] = useState('all'); const [fRange, setFRange] = useState('today');
  const [drill, setDrill] = useState(null);
  const load = useCallback(() => { db.listReports().then(setReports); db.allActions().then(setAllActions); }, []);
  useEffect(() => { load(); db.getRoster().then(setRoster); const off = db.subscribe(load); return off; }, [load]);

  const filtered = useMemo(() => reports.filter(r => (fShift === 'all' || r.shift === fShift) && (fProfile === 'all' || r.profile === fProfile) && (fCSR === 'all' || r.csr_name === fCSR) && withinRange(r.date, fRange)), [reports, fShift, fProfile, fCSR, fRange]);
  const byReport = useMemo(() => { const m = {}; allActions.forEach(a => { (m[a.report_id] = m[a.report_id] || []).push(a); }); return m; }, [allActions]);
  const cnt = id => { const m = {}; (byReport[id] || []).forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; };
  const acts = useMemo(() => { const s = new Set(filtered.map(r => r.id)); return allActions.filter(a => s.has(a.report_id)); }, [filtered, allActions]);
  const totals = useMemo(() => { const m = {}; acts.forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; }, [acts]);
  const online = filtered.filter(r => r.status === 'open').length;
  const ranked = useMemo(() => [...filtered].sort((a, b) => (byReport[b.id]?.length || 0) - (byReport[a.id]?.length || 0)), [filtered, byReport]);
  const sortedTypes = Object.keys(totals).sort((a, b) => totals[b] - totals[a]); const maxType = totals[sortedTypes[0]] || 1;
  const rangeLabel = { today: 'Today', week: 'This week', all: 'All time' }[fRange];

  // intelligence
  const flags = acts.filter(a => a.type === 'frustrated' || a.type === 'disputed');
  const idle = filtered.filter(r => r.status === 'open' && !(byReport[r.id]?.length));
  const repById = id => filtered.find(r => r.id === id) || reports.find(r => r.id === id);

  // by profile
  const byProfile = useMemo(() => { const m = {}; filtered.forEach(r => { m[r.profile] = (m[r.profile] || 0) + (byReport[r.id]?.length || 0); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [filtered, byReport]);

  return (
    <>
      {/* filter bar */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 pr-3" style={{ borderRight: '1px solid rgba(124,41,255,.14)' }}><Filter size={14} style={{ color: C.dim }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.dim }}>Filters</span></div>
          <div className="flex gap-1.5">{[['today', 'Today'], ['week', 'This week'], ['all', 'All']].map(([v, l]) => <Chip key={v} active={fRange === v} onClick={() => setFRange(v)}>{l}</Chip>)}</div>
          <Select value={fCSR} onChange={e => setFCSR(e.target.value)}><option value="all">All CSRs</option>{roster.filter(r => r.active).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</Select>
          <Select value={fShift} onChange={e => setFShift(e.target.value)}><option value="all">All shifts</option>{SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
          <Select value={fProfile} onChange={e => setFProfile(e.target.value)}><option value="all">All profiles</option>{PROFILES.map(p => <option key={p} value={p}>{p}</option>)}</Select>
          <span className="ml-auto text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>{filtered.length} reports · {rangeLabel}</span>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open now" value={online} sub="reports in progress" accent={C.mint} icon={Activity} />
        <StatCard label="Reports" value={filtered.length} sub={rangeLabel.toLowerCase()} accent={C.violet} icon={ClipboardList} />
        <StatCard label="Actions logged" value={acts.length} sub="across reports" accent={C.violetGlow} icon={BarChart3} />
        <StatCard label="Needs attention" value={flags.length + idle.length} sub="flags + idle" accent={flags.length + idle.length ? C.coral : C.mint} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* reports */}
        <div className="lg:col-span-2">
          <SectionHeader eyebrow="Live" title="Reports" right={`${filtered.length} · tap to open`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ranked.length === 0 && <Card className="p-5"><span style={{ color: C.dim, fontSize: 13 }}>No reports for this filter.</span></Card>}
            {ranked.map(r => { const c = cnt(r.id); const n = byReport[r.id]?.length || 0; return (
              <Card key={r.id} className="lift p-4" style={{ cursor: 'pointer' }}>
                <div onClick={() => setDrill(r.id)} className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {r.status === 'open' && <span style={{ width: 8, height: 8, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}`, flex: '0 0 auto' }} />}
                    <span style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>{r.csr_name}</span>
                    <Pill color={C.violet}>{r.profile}</Pill><Pill color={SHIFT_COLOR[r.shift]}>{r.shift}</Pill>
                    <span style={{ fontSize: 11, color: C.dim }}>{timePKT(r.start_at)}{r.finish_at ? '–' + timePKT(r.finish_at) : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{n}</span>
                    <span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>actions</span>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-1.5 flex-wrap">
                  {Object.keys(c).slice(0, 7).map(t => <span key={t} style={{ background: 'rgba(124,41,255,.08)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: C.violetDim }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}
                  {n === 0 && <span style={{ fontSize: 10.5, color: C.amber, fontWeight: 700 }}>idle · nothing logged yet</span>}
                </div>
              </Card>); })}
          </div>
        </div>

        {/* right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <SectionHeader eyebrow="Watch" title="Needs attention" color={C.coral} right={`${flags.length + idle.length}`} />
            <Card className="p-4">
              {flags.length + idle.length === 0 && <div style={{ color: C.mint, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> All clear — nothing flagged.</div>}
              {flags.map(a => { const r = repById(a.report_id); return (
                <div key={a.id} className="mb-2 flex items-start gap-2.5">
                  <span style={{ width: 7, height: 7, borderRadius: 9, marginTop: 5, background: C.coral, flex: '0 0 auto' }} />
                  <div style={{ fontSize: 12, color: C.ink }}><b>{ACTION_BY_KEY[a.type]?.label}</b> · {a.client}<div style={{ fontSize: 11, color: C.muted }}>{actionSummary(a)}{r ? ` — ${r.csr_name}/${r.profile}` : ''}</div></div>
                </div>); })}
              {idle.length > 0 && <div style={{ marginTop: flags.length ? 10 : 0, paddingTop: flags.length ? 10 : 0, borderTop: flags.length ? '1px dashed rgba(124,41,255,.15)' : 'none' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.amber, marginBottom: 5 }}>Idle now</div>
                {idle.map(r => <div key={r.id} style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}><b style={{ color: C.ink }}>{r.csr_name}</b> · {r.profile} — open, 0 logged</div>)}
              </div>}
            </Card>
          </div>

          <div>
            <SectionHeader eyebrow="Totals" title="By activity" right={`${acts.length}`} />
            <Card className="p-5">
              {sortedTypes.length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>Nothing logged.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {sortedTypes.slice(0, 9).map(t => (
                  <div key={t}>
                    <div className="mb-1 flex items-center justify-between text-xs"><span style={{ color: C.ink, fontWeight: 600 }}>{KPI_LABEL[t] || t}</span><span className="mono" style={{ color: C.muted }}>{totals[t]}</span></div>
                    <div style={{ height: 6, borderRadius: 6, background: 'rgba(124,41,255,.12)' }}><div style={{ height: 6, borderRadius: 6, width: `${(totals[t] / maxType) * 100}%`, background: `linear-gradient(90deg,${C.glow},${C.violet})` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {byProfile.length > 0 && <div>
            <SectionHeader eyebrow="Split" title="By profile" />
            <Card className="p-4">
              {byProfile.slice(0, 8).map(([p, n]) => <div key={p} className="flex items-center justify-between" style={{ padding: '4px 0', fontSize: 12 }}><span style={{ color: C.ink, fontWeight: 600 }}>{p}</span><span className="mono" style={{ color: C.muted }}>{n}</span></div>)}
            </Card>
          </div>}
        </div>
      </div>

      {drill && <DrillDrawer report={repById(drill)} actions={byReport[drill] || []} onClose={() => setDrill(null)} />}
    </>
  );
}

function DrillDrawer({ report, actions, onClose }) {
  if (!report) return null;
  const c = {}; actions.forEach(a => c[a.type] = (c[a.type] || 0) + 1);
  return (
    <div onClick={onClose} className="scrim" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className="glass-2 no-scrollbar" style={{ width: 440, maxWidth: '100%', height: '100%', overflow: 'auto', animation: 'pop .2s ease' }}>
        <div style={{ position: 'sticky', top: 0, padding: '16px 18px', borderBottom: '1px solid rgba(124,41,255,.12)', background: 'rgba(255,255,255,.5)' }} className="flex items-center justify-between">
          <div><div style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>{report.csr_name}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{report.profile} · {report.shift} · {report.date}</div></div>
          <button onClick={onClose} className="rounded-lg" style={{ border: 'none', background: 'rgba(124,41,255,.08)', width: 30, height: 30, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18 }}>
          <div className="flex items-center gap-3 mb-4" style={{ fontSize: 12, color: C.muted }}>
            <span className="flex items-center gap-1"><Clock size={13} /> {timePKT(report.start_at)}{report.finish_at ? ' – ' + timePKT(report.finish_at) : ' · in progress'}</span>
            <Pill color={report.status === 'open' ? C.mint : C.dim}>{report.status}</Pill>
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">{Object.keys(c).map(t => <span key={t} style={{ background: 'rgba(124,41,255,.08)', borderRadius: 7, padding: '3px 9px', fontSize: 10.5, fontWeight: 700, color: C.violetDim }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}</div>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: C.dim, marginBottom: 8 }}>Timeline</div>
          {actions.length === 0 && <div style={{ color: C.dim, fontSize: 12.5 }}>No actions logged.</div>}
          {[...actions].reverse().map(a => (
            <div key={a.id} className="glass-soft rounded-xl" style={{ display: 'flex', gap: 10, padding: '10px 12px', marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 9, marginTop: 5, flex: '0 0 auto', background: C.violet }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{ACTION_BY_KEY[a.type]?.label || a.type}</div>
                <div style={{ fontSize: 11.5, color: C.muted }}>{a.client}{actionSummary(a) ? ' · ' + actionSummary(a) : ''}</div></div>
              <span style={{ fontSize: 10, color: C.dim }}>{timePKT(a.created_at)}</span>
            </div>))}
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
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div><h2 className="text-lg font-bold" style={{ color: C.ink }}>Team roster</h2><p className="mt-1 text-xs" style={{ color: C.muted }}>These names fill the CSR “Your name” list. Archived people keep their history.</p></div>
        <Btn onClick={() => setEdit({ id: uid(), name: '', shift: 'Night', profile: '', role: 'CSR', active: true })} className="lift"><Plus size={13} style={{ verticalAlign: -2 }} /> Add person</Btn>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {roster.map(c => (
          <Card key={c.id} className="lift p-4" style={{ opacity: c.active ? 1 : 0.55 }}>
            <div className="mb-3 flex items-start justify-between">
              <div><div style={{ fontWeight: 800, color: C.ink }}>{c.name || 'Unnamed'}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap"><Pill color={c.role === 'Manager' ? C.amber : C.cyan}>{c.role}</Pill>{c.profile && <Pill color={C.violet}>{c.profile}</Pill>}{!c.active && <Pill color={C.coral}>Archived</Pill>}</div></div>
              <div className="flex gap-0.5">
                <button onClick={() => setEdit(c)} className="rounded-lg p-1.5" style={{ color: C.dim, background: 'transparent', border: 'none', cursor: 'pointer' }}><Pencil size={14} /></button>
                <button onClick={() => persist(roster.map(r => r.id === c.id ? { ...r, active: !r.active } : r))} className="rounded-lg p-1.5" style={{ color: c.active ? C.dim : C.mint, background: 'transparent', border: 'none', cursor: 'pointer' }}>{c.active ? <Archive size={14} /> : <ArchiveRestore size={14} />}</button>
                <button onClick={() => persist(roster.filter(r => r.id !== c.id))} className="rounded-lg p-1.5" style={{ color: C.coral, background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>Shift</span>
              <Select value={c.shift} color={SHIFT_COLOR[c.shift]} onChange={e => persist(roster.map(r => r.id === c.id ? { ...r, shift: e.target.value } : r))}>{SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            </div>
          </Card>
        ))}
      </div>
      {edit && <Modal title={roster.some(r => r.id === edit.id) ? 'Edit person' : 'Add person'} onClose={() => setEdit(null)}>
        <Label>Name</Label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="Full name" className="gi" />
        <Label>Shift</Label><select value={edit.shift} onChange={e => setEdit({ ...edit, shift: e.target.value })} className="gi">{SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label} ({s.time})</option>)}</select>
        <Label>Profile</Label><select value={edit.profile} onChange={e => setEdit({ ...edit, profile: e.target.value })} className="gi"><option value="">No profile</option>{PROFILES.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <Label>Role</Label>
        <div style={{ display: 'flex', gap: 6 }}>{['CSR', 'Manager'].map(role => { const on = edit.role === role; return <button key={role} onClick={() => setEdit({ ...edit, role })} className="rounded-xl" style={{ flex: 1, padding: 9, border: on ? 'none' : '1px solid rgba(124,41,255,.18)', background: on ? C.violet : 'rgba(255,255,255,.5)', color: on ? '#fff' : C.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{role}</button>; })}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><Btn variant="ghost" onClick={() => setEdit(null)} style={{ flex: 1 }}>Cancel</Btn><Btn variant="ok" onClick={() => edit.name.trim() && save(edit)} className="lift" style={{ flex: 1 }}>Save</Btn></div>
      </Modal>}
    </>
  );
}
