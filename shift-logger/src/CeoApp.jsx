import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lock, Users, BarChart3, Plus, Pencil, Trash2 } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTION_BY_KEY, KPI_LABEL, CEO_PASSWORD } from './config.js';
import { db, todayPKT, timePKT, BACKEND } from './store.js';
import { Btn, Card, Tile, Label, Modal } from './ui.jsx';

const AUTH_KEY = 'sl_ceo_ok';
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'r_' + Math.random().toString(36).slice(2));

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
  const Nav = ({ id, icon: Icon, label }) => {
    const on = view === id;
    return <button onClick={() => setView(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: `1px solid ${on ? C.violet : 'transparent'}`, background: on ? C.violet : 'transparent', color: on ? '#fff' : C.muted, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}><Icon size={14} />{label}</button>;
  };
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim }}>HaseebMadeIt · CEO</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Nav id="live" icon={BarChart3} label="Live console" />
              <Nav id="roster" icon={Users} label="Roster" />
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>data: {BACKEND === 'supabase' ? 'Supabase (multi-user)' : 'local demo (this browser)'}</div>
        </div>
        {view === 'live' ? <Console /> : <RosterManager />}
      </div>
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
  const [fShift, setFShift] = useState('all');
  const [fProfile, setFProfile] = useState('all');
  const [fRange, setFRange] = useState('today');

  const load = useCallback(() => { db.listReports().then(setReports); db.allActions().then(setAllActions); }, []);
  useEffect(() => { load(); const off = db.subscribe(load); return off; }, [load]);

  const filtered = useMemo(() => reports.filter(r =>
    (fShift === 'all' || r.shift === fShift) && (fProfile === 'all' || r.profile === fProfile) && withinRange(r.date, fRange)
  ), [reports, fShift, fProfile, fRange]);
  const repIds = useMemo(() => new Set(filtered.map(r => r.id)), [filtered]);
  const acts = useMemo(() => allActions.filter(a => repIds.has(a.report_id)), [allActions, repIds]);
  const totals = useMemo(() => { const m = {}; acts.forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; }, [acts]);
  const online = filtered.filter(r => r.status === 'open').length;
  const countsFor = id => { const m = {}; allActions.filter(a => a.report_id === id).forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; };

  const Filter = ({ value, set, opts }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {opts.map(o => { const on = value === o.v; return (
        <button key={o.v} onClick={() => set(o.v)} style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '5px 11px', cursor: 'pointer', border: `1px solid ${on ? C.violet : C.violetLine}`, background: on ? C.violet : '#fff', color: on ? '#fff' : C.muted }}>{o.l}</button>); })}
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0 }}>Live console</h1>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.mint }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}`, marginRight: 5 }} />live</span>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '14px 0' }}>
        <div><div style={ft}>Shift</div><Filter value={fShift} set={setFShift} opts={[{ v: 'all', l: 'All' }, ...SHIFTS.map(s => ({ v: s.key, l: s.label }))]} /></div>
        <div><div style={ft}>When</div><Filter value={fRange} set={setFRange} opts={[{ v: 'today', l: 'Today' }, { v: 'week', l: 'This week' }, { v: 'all', l: 'All' }]} /></div>
        <div style={{ flex: 1, minWidth: 200 }}><div style={ft}>Profile</div><Filter value={fProfile} set={setFProfile} opts={[{ v: 'all', l: 'All' }, ...PROFILES.map(p => ({ v: p, l: p }))]} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 9, marginBottom: 18 }}>
        <Tile n={online} label="Reports open now" hot />
        <Tile n={filtered.length} label="Reports" />
        {Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, 8).map(t => <Tile key={t} n={totals[t]} label={KPI_LABEL[t] || t} />)}
      </div>
      <Card style={{ padding: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.dim }}>
          <span>CSR · profile · shift</span><span>Counts · live</span></div>
        {filtered.length === 0 && <div style={{ padding: 16, color: C.dim, fontSize: 13 }}>No reports for this filter.</div>}
        {filtered.map(r => { const c = countsFor(r.id); return (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: C.ink, display: 'flex', alignItems: 'center', gap: 7 }}>
              {r.status === 'open' && <span style={{ width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}` }} />}
              {r.csr_name} · {r.profile} <span style={{ color: C.dim, fontWeight: 500 }}>· {r.shift} · {r.date} · {timePKT(r.start_at)}{r.finish_at ? '–' + timePKT(r.finish_at) : ''}</span>
              {r.status === 'submitted' && <span style={{ fontSize: 9, fontWeight: 800, color: C.dim }}>· submitted</span>}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {Object.keys(c).map(t => <span key={t} style={{ background: C.raised, borderRadius: 6, padding: '2px 7px', fontSize: 9.5, fontWeight: 700, color: C.muted }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}
              {Object.keys(c).length === 0 && <span style={{ fontSize: 10, color: C.dim }}>—</span>}
            </div>
          </div>); })}
      </Card>
    </>
  );
}

// ── Roster manager (CSR Pulse style: add / edit / remove, grouped by shift) ──
function RosterManager() {
  const [roster, setRoster] = useState([]);
  const [edit, setEdit] = useState(null); // person being added/edited
  const load = useCallback(() => db.getRoster().then(setRoster), []);
  useEffect(() => { load(); }, [load]);

  const persist = async (next) => { setRoster(next); await db.saveRoster(next); };
  const save = async (p) => {
    const exists = roster.some(r => r.id === p.id);
    await persist(exists ? roster.map(r => r.id === p.id ? p : r) : [...roster, p]);
    setEdit(null);
  };
  const remove = async (id) => persist(roster.filter(r => r.id !== id));
  const toggle = async (id) => persist(roster.map(r => r.id === id ? { ...r, active: !r.active } : r));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0 }}>Roster</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>These names fill the CSR “Your name” list. Add, edit or remove people here.</div></div>
        <Btn onClick={() => setEdit({ id: uid(), name: '', shift: 'Night', profile: '', role: 'CSR', active: true })}><Plus size={14} style={{ verticalAlign: -2 }} /> Add person</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 13, marginTop: 16 }}>
        {SHIFTS.map(s => {
          const people = roster.filter(r => r.shift === s.key);
          return (
            <Card key={s.key} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '9px 13px', fontWeight: 800, fontSize: 12, color: '#fff', background: s.key === 'Morning' ? C.amber : s.key === 'Evening' ? C.cyan : C.violet, display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.label}</span><span>{s.time}</span></div>
              {people.length === 0 && <div style={{ padding: 12, fontSize: 11, color: C.dim }}>No one yet.</div>}
              {people.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderTop: `1px solid ${C.line}`, opacity: r.active ? 1 : 0.45 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{r.name} {r.role === 'Manager' && <span style={{ fontSize: 9, color: C.violetDim, fontWeight: 800 }}>· MGR</span>}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{r.profile || 'no profile set'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <button title="active" onClick={() => toggle(r.id)} style={{ width: 30, height: 18, borderRadius: 999, border: 'none', cursor: 'pointer', background: r.active ? C.mint : C.border, position: 'relative' }}>
                      <span style={{ position: 'absolute', top: 2, left: r.active ? 14 : 2, width: 14, height: 14, borderRadius: 999, background: '#fff', transition: 'left .15s' }} /></button>
                    <button onClick={() => setEdit(r)} style={iconBtn}><Pencil size={12} /></button>
                    <button onClick={() => remove(r.id)} style={iconBtn}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </Card>
          );
        })}
      </div>

      {edit && <Modal title={roster.some(r => r.id === edit.id) ? 'Edit person' : 'Add person'} onClose={() => setEdit(null)}>
        <Label>Name</Label>
        <input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="Full name" style={inp} />
        <Label>Shift</Label>
        <select value={edit.shift} onChange={e => setEdit({ ...edit, shift: e.target.value })} style={inp}>
          {SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label} ({s.time})</option>)}
        </select>
        <Label>Profile</Label>
        <select value={edit.profile} onChange={e => setEdit({ ...edit, profile: e.target.value })} style={inp}>
          <option value="">No profile</option>
          {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <Label>Role</Label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['CSR', 'Manager'].map(role => { const on = edit.role === role; return (
            <button key={role} onClick={() => setEdit({ ...edit, role })} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${on ? C.violet : C.violetLine}`, background: on ? C.violet : '#fff', color: on ? '#fff' : C.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{role}</button>); })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setEdit(null)} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="ok" onClick={() => edit.name.trim() && save(edit)} style={{ flex: 1 }}>Save</Btn>
        </div>
      </Modal>}
    </>
  );
}

const ft = { fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.dim, marginBottom: 5 };
const iconBtn = { width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const inp = { width: '100%', border: `1px solid ${C.violetLine}`, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: C.ink, background: '#fff', outline: 'none' };
