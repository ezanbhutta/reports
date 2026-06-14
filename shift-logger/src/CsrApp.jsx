import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Plus, ChevronLeft, LogOut, Pencil, ClipboardList } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTIONS, ACTION_BY_KEY, GROUPS, CHECKLIST, KPI_LABEL } from './config.js';
import { db, todayPKT, timePKT } from './store.js';
import { Btn, Card, Tile, Modal, Label, Field, actionSummary } from './ui.jsx';

export default function CsrApp() {
  const [roster, setRoster] = useState([]);
  const [view, setView] = useState('login'); // login | dashboard | teamlog | done
  const [report, setReport] = useState(null);
  const [actions, setActions] = useState([]);
  const [handoff, setHandoff] = useState(null);     // note shown at login
  const [modalAction, setModalAction] = useState(null); // {action, editing?, values}
  const [wrapOpen, setWrapOpen] = useState(false);

  // login form
  const [name, setName] = useState('');
  const [shift, setShift] = useState('Night');
  const [profile, setProfile] = useState('');

  useEffect(() => { db.getRoster().then(setRoster); }, []);

  const refresh = useCallback(() => {
    if (report) db.listActions(report.id).then(setActions);
  }, [report]);
  useEffect(() => { refresh(); const off = db.subscribe(refresh); return off; }, [refresh]);

  const counts = useMemo(() => {
    const m = {}; actions.forEach(a => { m[a.type] = (m[a.type] || 0) + 1; }); return m;
  }, [actions]);

  // ── start a report ──
  async function startReport() {
    if (!name || !profile) return;
    const rep = await db.createReport({ csr_name: name, shift, profile, date: todayPKT() });
    const note = await db.latestNoteForProfile(profile, rep.id);
    setReport(rep); setActions([]); setHandoff(note); setView('dashboard');
  }
  async function ackHandoff() {
    if (handoff) await db.ackNote(handoff.id, name);
    setHandoff(null);
  }

  // ── add / edit an action ──
  function openAdd(action) { setModalAction({ action, values: {} }); }
  function openEdit(a) {
    if (report.status !== 'open') return;
    setModalAction({ action: ACTION_BY_KEY[a.type], values: { ...a.details, client: a.client }, editId: a.id });
  }
  async function saveAction() {
    const { action, values, editId } = modalAction;
    const missing = action.fields.filter(f => f.required && !(Array.isArray(values[f.name]) ? values[f.name].length : values[f.name]));
    if (missing.length) { setModalAction({ ...modalAction, error: 'Please fill: ' + missing.map(m => m.label).join(', ') }); return; }
    const client = values.client || values.name || '';
    const details = { ...values }; delete details.client;
    if (editId) await db.updateAction(editId, { client, details });
    else await db.addAction(report.id, { type: action.key, client, details });
    setModalAction(null); refresh();
  }

  // ── submit ──
  async function submit(checklist, note) {
    const rep = await db.submitReport(report.id, { checklist, note_for_next: note });
    setReport(rep); setWrapOpen(false); setView('done');
  }

  const headerName = report ? `${report.csr_name} · ${report.shift} · ${report.profile}` : '';

  // ════════ LOGIN ════════
  if (view === 'login') {
    const names = roster.filter(r => r.active);
    return (
      <Shell>
        <div style={{ maxWidth: 440, margin: '6vh auto 0', padding: '0 16px' }}>
          <Brand /><h1 style={h1}>Start your report</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '6px 0 18px' }}>Pick who you are, your shift and your profile. No password needed.</p>
          <Card style={{ padding: 18 }}>
            <Label>Your name</Label>
            <select value={name} onChange={e => { setName(e.target.value); const r = names.find(x => x.name === e.target.value); if (r?.shift) setShift(r.shift); if (r?.profile) setProfile(r.profile); }} style={sel}>
              <option value="">Select your name…</option>
              {names.map(r => <option key={r.id} value={r.name}>{r.name}{r.role === 'Manager' ? ' (manager)' : ''}</option>)}
            </select>
            <Label>Your shift (Pakistan time)</Label>
            <div style={{ display: 'flex', gap: 6 }}>
              {SHIFTS.map(s => { const on = shift === s.key; return (
                <button key={s.key} onClick={() => setShift(s.key)} style={{ flex: 1, padding: '9px 4px', borderRadius: 9, border: `1px solid ${on ? C.violet : C.violetLine}`, background: on ? C.violet : '#fff', color: on ? '#fff' : C.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {s.label}<div style={{ fontSize: 9, opacity: .85 }}>{s.time}</div></button>); })}
            </div>
            <Label>Profile</Label>
            <select value={profile} onChange={e => setProfile(e.target.value)} style={sel}>
              <option value="">Select profile…</option>
              {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <Label>Date &amp; start time</Label>
            <div style={{ ...sel, display: 'flex', justifyContent: 'space-between', color: C.muted }}>
              <span>{todayPKT()} · {timePKT()}</span><span style={{ fontSize: 11, color: C.dim }}>filled in (PKT)</span>
            </div>
            <Btn onClick={startReport} disabled={!name || !profile} style={{ width: '100%', marginTop: 14, padding: 12 }}>Start my report</Btn>
          </Card>
          <button onClick={() => setView('teamlog')} style={linkBtn}><ClipboardList size={13} /> See past reports</button>
        </div>
      </Shell>
    );
  }

  // ════════ TEAM LOG ════════
  if (view === 'teamlog') return <TeamLog onBack={() => setView(report ? 'dashboard' : 'login')} />;

  // ════════ DONE ════════
  if (view === 'done') {
    return (
      <Shell>
        <div style={{ maxWidth: 440, margin: '12vh auto 0', padding: '0 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <h1 style={{ ...h1, marginTop: 8 }}>Report submitted</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '6px 0 18px' }}>
            {report.csr_name} · {report.profile} · finished {timePKT(report.finish_at)} PKT. It's locked now — the CEO can see it live.</p>
          <Btn onClick={() => { setReport(null); setProfile(''); setView('login'); }} style={{ padding: '11px 20px' }}>Start another report</Btn>
          <div><button onClick={() => setView('teamlog')} style={linkBtn}><ClipboardList size={13} /> See past reports</button></div>
        </div>
      </Shell>
    );
  }

  // ════════ DASHBOARD ════════
  const locked = report.status !== 'open';
  return (
    <Shell>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 16px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div><Brand small /><div style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>{headerName}</div>
            <div style={{ fontSize: 11, color: C.dim }}>started {timePKT(report.start_at)} PKT · {report.date}</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={() => setView('teamlog')} style={{ padding: '8px 12px', fontSize: 12 }}><ClipboardList size={13} style={{ verticalAlign: -2 }} /> Past reports</Btn>
            <Btn variant="ghost" onClick={() => { setReport(null); setView('login'); }} style={{ padding: '8px 12px', fontSize: 12 }}><LogOut size={13} style={{ verticalAlign: -2 }} /> Switch</Btn>
          </div>
        </div>

        {/* KPI tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 9, marginBottom: 18 }}>
          <Tile n={actions.length} label="Total logged" hot />
          {Object.keys(counts).map(t => <Tile key={t} n={counts[t]} label={KPI_LABEL[t] || t} />)}
          {actions.length === 0 && <div style={{ gridColumn: '2 / -1', alignSelf: 'center', color: C.dim, fontSize: 12 }}>Nothing logged yet — tap a button below to add your first action.</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 18 }}>
          {/* action buttons */}
          <div>
            {GROUPS.map(g => {
              const items = ACTIONS.filter(a => a.group === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: g.color, marginBottom: 7 }}>{g.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 7 }}>
                    {items.map(a => (
                      <button key={a.key} disabled={locked} onClick={() => openAdd(a)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 11px', borderRadius: 10, border: `1px solid ${C.violetLine}`, background: '#fff', color: C.violetDim, fontWeight: 700, fontSize: 11.5, cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? .5 : 1, textAlign: 'left' }}>
                        <span style={{ width: 16, height: 16, borderRadius: 5, background: C.violetBg, color: C.violet, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Plus size={12} /></span>{a.label}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* today's log */}
          <div>
            <Card style={{ padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: C.dim, marginBottom: 6 }}>Your list today {!locked && '· tap to fix ✎'}</div>
              {actions.length === 0 && <div style={{ color: C.dim, fontSize: 12, padding: '10px 0' }}>No entries yet.</div>}
              {actions.map(a => (
                <div key={a.id} onClick={() => openEdit(a)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: `1px dashed ${C.line}`, cursor: locked ? 'default' : 'pointer' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: C.ink, fontWeight: 700 }}>{ACTION_BY_KEY[a.type]?.label || a.type}</div>
                    <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.client}{actionSummary(a) ? ' · ' + actionSummary(a) : ''}</div>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, whiteSpace: 'nowrap' }}>{timePKT(a.created_at)}{!locked && <Pencil size={11} style={{ marginLeft: 5, verticalAlign: -1, color: C.violetLine }} />}</div>
                </div>
              ))}
              {!locked && <Btn onClick={() => setWrapOpen(true)} style={{ width: '100%', marginTop: 12 }}>Wrap up &amp; submit</Btn>}
              {locked && <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.mint }}>Submitted &amp; locked ✓</div>}
            </Card>
          </div>
        </div>
      </div>

      {handoff && <Modal title={`Note from the last shift · ${report.profile}`} onClose={ackHandoff} width={360}>
        <div style={{ background: C.raised, borderRadius: 10, padding: 12, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{handoff.note_for_next}</div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>left by {handoff.csr_name}</div>
        <Btn variant="ok" onClick={ackHandoff} style={{ width: '100%', marginTop: 14 }}>Noted ✓</Btn>
      </Modal>}

      {modalAction && <Modal title={modalAction.action.label} onClose={() => setModalAction(null)}>
        {modalAction.action.fields.map(f => (
          <Field key={f.name} field={f} value={modalAction.values[f.name]}
            onChange={v => setModalAction(m => ({ ...m, values: { ...m.values, [f.name]: v }, error: null }))} />
        ))}
        {modalAction.error && <div style={{ color: C.coral, fontSize: 12, marginTop: 10 }}>{modalAction.error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setModalAction(null)} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="ok" onClick={saveAction} style={{ flex: 1 }}>OK</Btn>
        </div>
      </Modal>}

      {wrapOpen && <WrapUp onClose={() => setWrapOpen(false)} onSubmit={submit} profile={report.profile} />}
    </Shell>
  );
}

// ── Wrap-up modal (checklist + handoff note + submit) ──
function WrapUp({ onClose, onSubmit, profile }) {
  const [done, setDone] = useState({});
  const [note, setNote] = useState('');
  return (
    <Modal title="Wrap up & submit" onClose={onClose} width={420}>
      <Label>Tick what's done</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {CHECKLIST.map(item => { const on = done[item]; return (
          <button key={item} onClick={() => setDone(d => ({ ...d, [item]: !d[item] }))} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: C.ink, textAlign: 'left' }}>
            <span style={{ width: 18, height: 18, borderRadius: 6, border: `1.5px solid ${on ? C.mint : C.violetLine}`, background: on ? C.mintBg : '#fff', color: C.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{on ? '✓' : ''}</span>{item}</button>); })}
      </div>
      <Label>Note for the next CSR on {profile}</Label>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Anything they should know…" style={{ width: '100%', border: `1px solid ${C.violetLine}`, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: C.ink, outline: 'none', resize: 'vertical' }} />
      <div style={{ background: C.amberBg, color: '#92400E', borderRadius: 8, padding: '8px 11px', fontSize: 11.5, margin: '12px 0' }}>Once you submit, the report is <b>locked</b> — no more edits.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Back</Btn>
        <Btn onClick={() => onSubmit(done, note)} style={{ flex: 1 }}>Submit my report</Btn>
      </div>
    </Modal>
  );
}

// ── Team log (read-only) ──
function TeamLog({ onBack }) {
  const [reports, setReports] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => { db.listReports().then(setReports); db.allActions().then(setAllActions); }, []);
  useEffect(() => { load(); const off = db.subscribe(load); return off; }, [load]);
  const countsFor = id => { const m = {}; allActions.filter(a => a.report_id === id).forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; };

  return (
    <Shell>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 16px 60px' }}>
        <button onClick={onBack} style={linkBtn}><ChevronLeft size={14} /> Back</button>
        <h1 style={{ ...h1, marginTop: 8 }}>Past reports</h1>
        <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 16px' }}>Read-only. Anyone can read; nothing can be changed after it's submitted.</p>
        <Card style={{ padding: 6 }}>
          {reports.length === 0 && <div style={{ padding: 16, color: C.dim, fontSize: 13 }}>No reports yet.</div>}
          {reports.map(r => { const c = countsFor(r.id); const chips = Object.keys(c).slice(0, 5); return (
            <div key={r.id} onClick={() => setOpen(open === r.id ? null : r.id)} style={{ padding: '11px 12px', borderTop: `1px solid ${C.line}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{r.csr_name} · {r.profile} <span style={{ color: C.dim, fontWeight: 500 }}>· {r.date} · {r.shift}</span>
                  {r.status !== 'submitted' && <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, color: C.amber, background: C.amberBg, borderRadius: 5, padding: '1px 6px' }}>OPEN</span>}</div>
                <div style={{ display: 'flex', gap: 5 }}>{chips.map(t => <span key={t} style={{ background: C.raised, borderRadius: 6, padding: '2px 7px', fontSize: 9.5, fontWeight: 700, color: C.muted }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}</div>
              </div>
              {open === r.id && <div style={{ marginTop: 8, borderTop: `1px dashed ${C.line}`, paddingTop: 8 }}>
                {allActions.filter(a => a.report_id === r.id).map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '4px 0', color: C.muted }}>
                    <span><b style={{ color: C.ink }}>{ACTION_BY_KEY[a.type]?.label || a.type}</b> · {a.client} {actionSummary(a) ? '· ' + actionSummary(a) : ''}</span>
                    <span style={{ color: C.dim }}>{timePKT(a.created_at)}</span></div>))}
                {r.note_for_next && <div style={{ marginTop: 6, fontSize: 11.5, color: C.violetDim }}>📝 Note left: {r.note_for_next}</div>}
              </div>}
            </div>); })}
        </Card>
      </div>
    </Shell>
  );
}

// ── chrome ──
const h1 = { fontSize: 24, fontWeight: 800, color: C.ink, letterSpacing: '-.02em', margin: 0 };
const sel = { width: '100%', border: `1px solid ${C.violetLine}`, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: C.ink, background: '#fff', outline: 'none' };
const linkBtn = { display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, background: 'none', border: 'none', color: C.violetDim, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' };

function Brand({ small }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: small ? 2 : 10 }}>
    <div style={{ width: small ? 18 : 26, height: small ? 18 : 26, borderRadius: 7, background: C.violet, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: small ? 11 : 14 }}>C</div>
    <div style={{ fontSize: small ? 10 : 12, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim }}>CSR Shift Logger</div>
  </div>;
}
function Shell({ children }) { return <div style={{ minHeight: '100vh', background: C.bg }}>{children}</div>; }
