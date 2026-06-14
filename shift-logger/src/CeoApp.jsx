import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Lock } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTION_BY_KEY, KPI_LABEL, CEO_PASSWORD } from './config.js';
import { db, todayPKT, timePKT, BACKEND } from './store.js';
import { Btn, Card, Tile, Label } from './ui.jsx';

const AUTH_KEY = 'sl_ceo_ok';

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
  return <Console />;
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
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim }}>HaseebMadeIt</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.ink, margin: '4px 0 0' }}>CEO Console
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: C.mint }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px ${C.mintBg}`, marginRight: 5 }} />live</span></h1>
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>data: {BACKEND === 'supabase' ? 'Supabase (multi-user)' : 'local demo (this browser)'}</div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0' }}>
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
      </div>
    </div>
  );
}

const ft = { fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.dim, marginBottom: 5 };
