import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, ChevronLeft, LogOut, Pencil, ClipboardList, Users, Package, Star, Check } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTIONS, ACTION_BY_KEY, GROUPS, CHECKLIST, KPI_LABEL } from './config.js';
import { db, todayPKT, timePKT } from './store.js';
import { Btn, Card, StatCard, Pill, Modal, Label, Field, actionSummary } from './ui.jsx';

const groupColor = k => (GROUPS.find(g => g.key === k) || {}).color || C.violet;
const QUICK = ['inquiry', 'followup_client', 'shared', 'revision_assigned', 'meeting', 'new_order'];
const getRecent = () => { try { return JSON.parse(localStorage.getItem('sl_recent_actions')) || []; } catch { return []; } };
const bumpRecent = k => { const r = [k, ...getRecent().filter(x => x !== k)].slice(0, 8); localStorage.setItem('sl_recent_actions', JSON.stringify(r)); };
const getClients = () => { try { return JSON.parse(localStorage.getItem('sl_clients')) || []; } catch { return []; } };
const addClient = c => { if (!c) return; const r = [c, ...getClients().filter(x => x !== c)].slice(0, 60); localStorage.setItem('sl_clients', JSON.stringify(r)); };

export default function CsrApp() {
  const [roster, setRoster] = useState([]);
  const [view, setView] = useState('login');
  const [report, setReport] = useState(null);
  const [actions, setActions] = useState([]);
  const [handoff, setHandoff] = useState(null);
  const [picker, setPicker] = useState(false);
  const [form, setForm] = useState(null);   // { action, values, editId, error }
  const [wrap, setWrap] = useState(false);
  const [name, setName] = useState(''); const [shift, setShift] = useState('Night'); const [profile, setProfile] = useState('');

  useEffect(() => { db.getRoster().then(setRoster); }, []);
  const refresh = useCallback(() => { if (report) db.listActions(report.id).then(setActions); }, [report]);
  useEffect(() => { refresh(); const off = db.subscribe(refresh); return off; }, [refresh]);

  const counts = useMemo(() => { const m = {}; actions.forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; }, [actions]);
  const clientSug = useMemo(() => [...new Set([...actions.map(a => a.client), ...getClients()].filter(Boolean))], [actions]);

  async function startReport() {
    if (!name || !profile) return;
    const rep = await db.createReport({ csr_name: name, shift, profile, date: todayPKT() });
    const note = await db.latestNoteForProfile(profile, rep.id);
    setReport(rep); setActions([]); setHandoff(note); setView('dashboard');
  }
  async function ackHandoff() { if (handoff) await db.ackNote(handoff.id, name); setHandoff(null); }

  function openForm(action, prefill, editId) { setPicker(false); setForm({ action, values: prefill || {}, editId }); }
  async function saveForm() {
    const { action, values, editId } = form;
    const miss = action.fields.filter(f => f.required && !(Array.isArray(values[f.name]) ? values[f.name].length : values[f.name]));
    if (miss.length) return setForm({ ...form, error: 'Fill: ' + miss.map(m => m.label).join(', ') });
    const client = values.client || '';
    const details = { ...values }; delete details.client;
    if (editId) await db.updateAction(editId, { client, details });
    else await db.addAction(report.id, { type: action.key, client, details });
    bumpRecent(action.key); addClient(client);
    setForm(null); refresh();
  }
  async function submit(checklist, note) { const rep = await db.submitReport(report.id, { checklist, note_for_next: note }); setReport(rep); setWrap(false); setView('done'); }

  // ════ LOGIN ════
  if (view === 'login') {
    const names = roster.filter(r => r.active);
    return (
      <Shell center>
        <div className="pop" style={{ width: 440, maxWidth: '100%' }}>
          <Brand /><h1 style={h1}>Start your report</h1>
          <p style={{ color: C.muted, fontSize: 13.5, margin: '6px 0 18px' }}>Pick who you are, your shift and your profile. No password needed.</p>
          <Card className="p-6">
            <Label>Your name</Label>
            <select value={name} onChange={e => { setName(e.target.value); const r = names.find(x => x.name === e.target.value); if (r?.shift) setShift(r.shift); if (r?.profile) setProfile(r.profile); }} className="gi">
              <option value="">Select your name…</option>
              {names.map(r => <option key={r.id} value={r.name}>{r.name}{r.role === 'Manager' ? ' (manager)' : ''}</option>)}
            </select>
            <Label>Your shift · Pakistan time</Label>
            <div style={{ display: 'flex', gap: 7 }}>
              {SHIFTS.map(s => { const on = shift === s.key; return (
                <button key={s.key} onClick={() => setShift(s.key)} className="rounded-xl lift" style={{ flex: 1, padding: '10px 4px', border: on ? 'none' : '1px solid rgba(124,41,255,.18)', background: on ? C.violet : 'rgba(255,255,255,.5)', color: on ? '#fff' : C.muted, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                  {s.label}<div style={{ fontSize: 9, opacity: .85, fontWeight: 600 }}>{s.time}</div></button>); })}
            </div>
            <Label>Profile</Label>
            <select value={profile} onChange={e => setProfile(e.target.value)} className="gi"><option value="">Select profile…</option>{PROFILES.map(p => <option key={p} value={p}>{p}</option>)}</select>
            <Label>Date &amp; start time</Label>
            <div className="gi" style={{ display: 'flex', justifyContent: 'space-between', color: C.muted }}><span>{todayPKT()} · {timePKT()}</span><span style={{ fontSize: 11, color: C.dim }}>auto · PKT</span></div>
            <Btn onClick={startReport} disabled={!name || !profile} className="lift" style={{ width: '100%', marginTop: 16, padding: 12 }}>Start my report</Btn>
          </Card>
          <button onClick={() => setView('teamlog')} style={link}><ClipboardList size={13} /> See past reports</button>
        </div>
      </Shell>
    );
  }
  if (view === 'teamlog') return <TeamLog onBack={() => setView(report ? 'dashboard' : 'login')} />;
  if (view === 'done') return (
    <Shell center>
      <div className="pop" style={{ textAlign: 'center', width: 440, maxWidth: '100%' }}>
        <Card className="p-8">
          <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px', background: `${C.mint}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={30} style={{ color: C.mint }} /></div>
          <h1 style={h1}>Report submitted</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '6px 0 18px' }}>{report.csr_name} · {report.profile} · finished {timePKT(report.finish_at)} PKT. Locked now — the CEO sees it live.</p>
          <Btn onClick={() => { setReport(null); setProfile(''); setView('login'); }} style={{ padding: '11px 22px' }}>Start another report</Btn>
        </Card>
      </div>
    </Shell>
  );

  // ════ DASHBOARD ════
  const locked = report.status !== 'open';
  const recent = getRecent().filter(k => ACTION_BY_KEY[k]);
  const quickKeys = [...new Set([...recent, ...QUICK])].slice(0, 6);
  return (
    <Shell>
      <Header>
        <div><Brand small /><div style={{ fontWeight: 800, fontSize: 18, color: C.ink, letterSpacing: '-.01em' }}>{report.csr_name} · {report.shift} · {report.profile}</div>
          <div style={{ fontSize: 11, color: C.dim }}>started {timePKT(report.start_at)} PKT · {report.date}</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => setView('teamlog')} style={{ padding: '8px 12px', fontSize: 12 }}><ClipboardList size={13} style={{ verticalAlign: -2 }} /> Past reports</Btn>
          <Btn variant="ghost" onClick={() => { setReport(null); setView('login'); }} style={{ padding: '8px 12px', fontSize: 12 }}><LogOut size={13} style={{ verticalAlign: -2 }} /> Switch</Btn>
        </div>
      </Header>

      <div className="mx-auto" style={{ maxWidth: 1180, padding: '8px 22px 60px' }}>
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total logged" value={actions.length} sub="this report" accent={C.violet} icon={ClipboardList} />
          {(() => { const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]); const pick = (top.length ? top : ['inquiry', 'followup_client', 'shared']).slice(0, 3); const acc = [C.cyan, C.amber, C.mint]; const ic = [Users, Package, Star];
            return pick.map((t, i) => <StatCard key={t} label={KPI_LABEL[t] || t} value={counts[t] || 0} sub="logged" accent={acc[i]} icon={ic[i]} />); })()}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Log activity */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <div className="text-lg font-bold tracking-tight" style={{ color: C.ink }}>Log an activity</div>
              <div style={{ fontSize: 12.5, color: C.muted, margin: '3px 0 14px' }}>Search 20+ actions, or tap a quick one. Fill the little box, done.</div>
              <button onClick={() => !locked && setPicker(true)} disabled={locked} className="lift w-full rounded-2xl"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: locked ? 'not-allowed' : 'pointer', background: `linear-gradient(180deg, ${C.glow}, ${C.violet})`, color: '#fff', border: 'none', boxShadow: '0 10px 24px rgba(114,41,255,.3)', opacity: locked ? .5 : 1 }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,.22)' }}><Search size={16} /></span>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Log an activity</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, opacity: .85 }}>search ▾</span>
              </button>
              {!locked && <>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: C.dim, margin: '16px 0 8px' }}>Quick</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {quickKeys.map(k => { const a = ACTION_BY_KEY[k]; if (!a) return null; return (
                    <button key={k} onClick={() => openForm(a)} className="lift rounded-xl" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', background: 'rgba(255,255,255,.55)', border: '1px solid rgba(124,41,255,.16)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.ink }}>
                      <span style={{ width: 8, height: 8, borderRadius: 9, background: groupColor(a.group) }} />{a.label}</button>); })}
                </div>
              </>}
              {locked && <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: C.mint, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={15} /> Report submitted &amp; locked</div>}
            </Card>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold" style={{ color: C.ink }}>Today's timeline</div>
                <span style={{ fontSize: 10, color: C.dim }}>{actions.length} entries{!locked && ' · tap to edit'}</span>
              </div>
              <div className="no-scrollbar" style={{ maxHeight: 380, overflow: 'auto' }}>
                {actions.length === 0 && <div style={{ color: C.dim, fontSize: 12.5, padding: '14px 0', textAlign: 'center' }}>Nothing yet — log your first activity.</div>}
                {actions.map(a => (
                  <div key={a.id} onClick={() => !locked && openForm(ACTION_BY_KEY[a.type], { ...a.details, client: a.client }, a.id)}
                    className="glass-soft rounded-xl" style={{ display: 'flex', gap: 10, padding: '10px 12px', marginBottom: 8, cursor: locked ? 'default' : 'pointer' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 9, marginTop: 5, flex: '0 0 auto', background: groupColor(ACTION_BY_KEY[a.type]?.group) }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{ACTION_BY_KEY[a.type]?.label || a.type}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.client}{actionSummary(a) ? ' · ' + actionSummary(a) : ''}</div>
                    </div>
                    <span style={{ fontSize: 10, color: C.dim, whiteSpace: 'nowrap' }}>{timePKT(a.created_at)}{!locked && <Pencil size={10} style={{ marginLeft: 4, verticalAlign: -1, color: C.violetLine }} />}</span>
                  </div>
                ))}
              </div>
              {!locked && <Btn onClick={() => setWrap(true)} className="lift" style={{ width: '100%', marginTop: 12 }}>Wrap up &amp; submit</Btn>}
            </Card>
          </div>
        </div>
      </div>

      {handoff && <Modal title="Note from the last shift" subtitle={`for ${report.profile} · left by ${handoff.csr_name}`} onClose={ackHandoff} width={380}>
        <div className="glass-soft rounded-xl" style={{ padding: 13, fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>{handoff.note_for_next}</div>
        <Btn variant="ok" onClick={ackHandoff} className="lift" style={{ width: '100%', marginTop: 14 }}>Noted ✓</Btn>
      </Modal>}

      {picker && <CommandPalette onClose={() => setPicker(false)} onPick={openForm} />}

      {form && <Modal title={form.action.label} subtitle={form.editId ? 'Edit entry' : 'New entry'} onClose={() => setForm(null)} width={400}>
        {form.action.fields.map(f => <Field key={f.name} field={f} value={form.values[f.name]} suggestions={f.name === 'client' ? clientSug : undefined}
          onChange={v => setForm(m => ({ ...m, values: { ...m.values, [f.name]: v }, error: null }))} />)}
        {form.error && <div style={{ color: C.coral, fontSize: 12, marginTop: 10 }}>{form.error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Btn variant="ghost" onClick={() => setForm(null)} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="ok" onClick={saveForm} className="lift" style={{ flex: 1 }}>{form.editId ? 'Save' : 'Add'}</Btn>
        </div>
      </Modal>}

      {wrap && <WrapUp profile={report.profile} onClose={() => setWrap(false)} onSubmit={submit} />}
    </Shell>
  );
}

// ── Command palette ──
function CommandPalette({ onClose, onPick }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const recent = getRecent().filter(k => ACTION_BY_KEY[k]);
  const matches = q ? ACTIONS.filter(a => a.label.toLowerCase().includes(q.toLowerCase())) : null;
  return (
    <Modal title={undefined} onClose={onClose} width={460}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 2px 12px' }}>
        <Search size={18} style={{ color: C.dim }} />
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search activities…"
          onKeyDown={e => { if (e.key === 'Enter' && matches?.length) onPick(matches[0]); if (e.key === 'Escape') onClose(); }}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: C.ink }} />
        <span style={{ fontSize: 18, color: C.dim, cursor: 'pointer' }} onClick={onClose}>×</span>
      </div>
      <div className="no-scrollbar" style={{ maxHeight: '60vh', overflow: 'auto', borderTop: '1px solid rgba(124,41,255,.1)', paddingTop: 8 }}>
        {matches ? (
          matches.length === 0 ? <div style={{ color: C.dim, fontSize: 13, padding: 12 }}>No match for “{q}”.</div>
            : matches.map(a => <Row key={a.key} a={a} onPick={onPick} />)
        ) : (<>
          {recent.length > 0 && <>
            <GroupLabel>Recent</GroupLabel>
            {recent.map(k => <Row key={k} a={ACTION_BY_KEY[k]} onPick={onPick} />)}
          </>}
          {GROUPS.map(g => { const items = ACTIONS.filter(a => a.group === g.key); return (
            <div key={g.key}><GroupLabel color={g.color}>{g.label}</GroupLabel>{items.map(a => <Row key={a.key} a={a} onPick={onPick} />)}</div>); })}
        </>)}
      </div>
    </Modal>
  );
}
const GroupLabel = ({ children, color = C.dim }) => <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color, margin: '10px 6px 4px' }}>{children}</div>;
const Row = ({ a, onPick }) => (
  <button onClick={() => onPick(a)} className="w-full rounded-xl" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,41,255,.07)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    <span style={{ width: 9, height: 9, borderRadius: 9, background: groupColor(a.group), flex: '0 0 auto' }} />
    <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{a.label}</span>
    <Plus size={14} style={{ marginLeft: 'auto', color: C.violetLine }} />
  </button>
);

// ── Wrap up ──
function WrapUp({ onClose, onSubmit, profile }) {
  const [done, setDone] = useState({}); const [note, setNote] = useState('');
  return (
    <Modal title="Wrap up & submit" subtitle="Submitting locks the report — no more edits" onClose={onClose} width={440}>
      <Label>Tick what's done</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {CHECKLIST.map(item => { const on = done[item]; return (
          <button key={item} onClick={() => setDone(d => ({ ...d, [item]: !d[item] }))} className="glass-soft rounded-xl" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.ink, textAlign: 'left', border: 'none' }}>
            <span style={{ width: 19, height: 19, borderRadius: 7, border: `1.5px solid ${on ? C.mint : C.violetLine}`, background: on ? C.mint : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Check size={12} />}</span>{item}</button>); })}
      </div>
      <Label>Note for the next CSR on {profile}</Label>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Anything they should know…" className="gi" style={{ resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Back</Btn>
        <Btn onClick={() => onSubmit(done, note)} className="lift" style={{ flex: 1 }}>Submit my report</Btn>
      </div>
    </Modal>
  );
}

// ── Team log ──
function TeamLog({ onBack }) {
  const [reports, setReports] = useState([]); const [all, setAll] = useState([]); const [open, setOpen] = useState(null);
  const load = useCallback(() => { db.listReports().then(setReports); db.allActions().then(setAll); }, []);
  useEffect(() => { load(); const off = db.subscribe(load); return off; }, [load]);
  const cf = id => { const m = {}; all.filter(a => a.report_id === id).forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; };
  return (
    <Shell>
      <Header><div><Brand small /><div style={{ fontWeight: 800, fontSize: 18, color: C.ink }}>Past reports</div></div>
        <Btn variant="ghost" onClick={onBack} style={{ padding: '8px 12px', fontSize: 12 }}><ChevronLeft size={13} style={{ verticalAlign: -2 }} /> Back</Btn></Header>
      <div className="mx-auto" style={{ maxWidth: 920, padding: '8px 22px 60px' }}>
        <p style={{ color: C.muted, fontSize: 13, margin: '0 0 14px' }}>Read-only — anyone can read; nothing changes after submit.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {reports.length === 0 && <Card className="p-5"><span style={{ color: C.dim, fontSize: 13 }}>No reports yet.</span></Card>}
          {reports.map(r => { const c = cf(r.id); const chips = Object.keys(c).slice(0, 5); return (
            <Card key={r.id} className="lift p-4" style={{ cursor: 'pointer' }} ><div onClick={() => setOpen(open === r.id ? null : r.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{r.csr_name} · {r.profile} <span style={{ color: C.dim, fontWeight: 500 }}>· {r.date} · {r.shift}</span>{r.status !== 'submitted' && <Pill color={C.amber}>open</Pill>}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{chips.map(t => <span key={t} style={{ background: 'rgba(124,41,255,.08)', borderRadius: 6, padding: '2px 7px', fontSize: 9.5, fontWeight: 700, color: C.violetDim }}>{(KPI_LABEL[t] || t)} {c[t]}</span>)}</div>
              </div>
              {open === r.id && <div style={{ marginTop: 10, borderTop: '1px dashed rgba(124,41,255,.15)', paddingTop: 8 }}>
                {all.filter(a => a.report_id === r.id).map(a => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '4px 0', color: C.muted }}><span><b style={{ color: C.ink }}>{ACTION_BY_KEY[a.type]?.label || a.type}</b> · {a.client} {actionSummary(a) ? '· ' + actionSummary(a) : ''}</span><span style={{ color: C.dim }}>{timePKT(a.created_at)}</span></div>)}
                {r.note_for_next && <div style={{ marginTop: 6, fontSize: 11.5, color: C.violetDim }}>📝 {r.note_for_next}</div>}
              </div>}
            </div></Card>); })}
        </div>
      </div>
    </Shell>
  );
}

// ── chrome ──
const h1 = { fontSize: 25, fontWeight: 800, color: C.ink, letterSpacing: '-.02em', margin: 0 };
const link = { display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 14, background: 'none', border: 'none', color: C.violetDim, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' };
function Brand({ small }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: small ? 2 : 12 }}>
    <div style={{ width: small ? 20 : 28, height: small ? 20 : 28, borderRadius: 8, background: `linear-gradient(180deg,${C.glow},${C.violet})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: small ? 12 : 15, boxShadow: '0 4px 12px rgba(114,41,255,.3)' }}>C</div>
    <div style={{ fontSize: small ? 10 : 12, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: C.dim }}>CSR Shift Logger</div>
  </div>;
}
function Header({ children }) {
  return <div className="glass" style={{ position: 'sticky', top: 0, zIndex: 20, borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderRadius: 0 }}>
    <div className="mx-auto flex items-center justify-between" style={{ maxWidth: 1180, padding: '12px 22px' }}>{children}</div>
  </div>;
}
function Shell({ children, center }) {
  return <div style={{ minHeight: '100vh', display: center ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center', padding: center ? 16 : 0 }}>{children}</div>;
}
