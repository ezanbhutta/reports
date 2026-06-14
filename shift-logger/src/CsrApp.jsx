import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, ChevronLeft, LogOut, Pencil, ClipboardList, Check, Clock } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTIONS, ACTION_BY_KEY, GROUPS, CHECKLIST, KPI_LABEL } from './config.js';
import { db, todayPKT, timePKT } from './store.js';
import { Btn, Card, Pill, Modal, Label, Field, actionSummary } from './ui.jsx';

const groupColor = k => (GROUPS.find(g => g.key === k) || {}).color || C.violet;
const QUICK = ['inquiry', 'followup_client', 'shared', 'revision_assigned', 'meeting', 'new_order'];
const getRecent = () => { try { return JSON.parse(localStorage.getItem('sl_recent_actions')) || []; } catch { return []; } };
const bumpRecent = k => { const r = [k, ...getRecent().filter(x => x !== k)].slice(0, 8); localStorage.setItem('sl_recent_actions', JSON.stringify(r)); };
const getClients = () => { try { return JSON.parse(localStorage.getItem('sl_clients')) || []; } catch { return []; } };
const addClient = c => { if (!c) return; const r = [c, ...getClients().filter(x => x !== c)].slice(0, 60); localStorage.setItem('sl_clients', JSON.stringify(r)); };

// ── PKT time intelligence ──
const pktHour = () => parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false }).format(new Date()), 10);
const currentShift = () => { const h = pktHour(); if (h >= 9 && h < 17) return 'Morning'; if (h >= 17 || h < 1) return 'Evening'; return 'Night'; };
const greeting = () => { const h = pktHour(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 22 ? 'Good evening' : 'Working late'; };

export default function CsrApp() {
  const [roster, setRoster] = useState([]);
  const [view, setView] = useState('login');
  const [report, setReport] = useState(null);
  const [actions, setActions] = useState([]);
  const [handoff, setHandoff] = useState(null);
  const [picker, setPicker] = useState(false);
  const [form, setForm] = useState(null);   // { action, values, editId, error }
  const [wrap, setWrap] = useState(false);
  const [name, setName] = useState(''); const [shift, setShift] = useState(currentShift()); const [profile, setProfile] = useState('');

  useEffect(() => { db.getRoster().then(setRoster); }, []);
  const refresh = useCallback(() => { if (report) db.listActions(report.id).then(setActions); }, [report]);
  useEffect(() => { refresh(); const off = db.subscribe(refresh); return off; }, [refresh]);
  // ⌘K / Ctrl-K opens the activity palette
  useEffect(() => {
    const onKey = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (report && report.status === 'open') setPicker(true); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [report]);

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

  // ════════════════════════════ LOGIN ════════════════════════════
  if (view === 'login') {
    const names = roster.filter(r => r.active);
    const nowShift = currentShift();
    return (
      <Shell center>
        <div className="pop" style={{ width: 396, maxWidth: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto', background: `linear-gradient(180deg,${C.glow},${C.violet})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, boxShadow: '0 12px 28px rgba(114,41,255,.34)' }}>C</div>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.22em', textTransform: 'uppercase', color: C.dim, marginTop: 11 }}>CSR Shift Logger</div>
          </div>
          <Card strong className="p-6">
            <h1 style={{ fontSize: 21, fontWeight: 800, color: C.ink, letterSpacing: '-.02em', textAlign: 'center', margin: 0 }}>Start your shift</h1>
            <p style={{ textAlign: 'center', color: C.muted, fontSize: 12.5, margin: '5px 0 4px' }}>No password — just tell us who's on.</p>

            <Label>Your name</Label>
            <select value={name} onChange={e => { setName(e.target.value); const r = names.find(x => x.name === e.target.value); if (r?.shift) setShift(r.shift); if (r?.profile) setProfile(r.profile); }}
              className="gi" style={{ fontSize: 15, fontWeight: 600, padding: '12px 12px' }}>
              <option value="">Select your name…</option>
              {names.map(r => <option key={r.id} value={r.name}>{r.name}{r.role === 'Manager' ? ' (manager)' : ''}</option>)}
            </select>

            <Label>Shift · Pakistan time</Label>
            <div className="grid grid-cols-3 gap-2">
              {SHIFTS.map(s => { const on = shift === s.key; const now = s.key === nowShift; return (
                <button key={s.key} onClick={() => setShift(s.key)} className="rounded-xl lift" style={{ position: 'relative', padding: '11px 4px', border: on ? 'none' : '1px solid rgba(124,41,255,.18)', background: on ? C.violet : 'rgba(255,255,255,.5)', color: on ? '#fff' : C.muted, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                  {now && !on && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 9, background: C.mint }} />}
                  {s.label}<div style={{ fontSize: 9, opacity: .85, fontWeight: 600 }}>{s.time}</div>
                  {now && on && <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.08em', opacity: .9 }}>NOW</div>}
                </button>); })}
            </div>

            <Label>Profile</Label>
            <select value={profile} onChange={e => setProfile(e.target.value)} className="gi"><option value="">Select profile…</option>{PROFILES.map(p => <option key={p} value={p}>{p}</option>)}</select>

            <Btn onClick={startReport} disabled={!name || !profile} className="lift" style={{ width: '100%', marginTop: 18, padding: 13, fontSize: 14 }}>Start my shift →</Btn>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingTop: 13, borderTop: '1px solid rgba(124,41,255,.1)', fontSize: 11, color: C.dim }}>
              <Clock size={11} /> {todayPKT()} · check-in {timePKT()} PKT · auto
            </div>
          </Card>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setView('teamlog')} style={link}><ClipboardList size={13} /> View past reports</button>
          </div>
        </div>
      </Shell>
    );
  }
  if (view === 'teamlog') return <TeamLog onBack={() => setView(report ? 'dashboard' : 'login')} />;
  if (view === 'done') return (
    <Shell center>
      <div className="pop" style={{ textAlign: 'center', width: 420, maxWidth: '100%' }}>
        <Card strong className="p-8">
          <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px', background: `${C.mint}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={30} style={{ color: C.mint }} /></div>
          <h1 style={h1}>Shift submitted</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '6px 0 18px' }}>{report.csr_name} · {report.profile} · checked out {timePKT(report.finish_at)} PKT. Locked now — the CEO sees it live.</p>
          <Btn onClick={() => { setReport(null); setProfile(''); setView('login'); }} style={{ padding: '11px 22px' }}>Start another shift</Btn>
        </Card>
      </div>
    </Shell>
  );

  // ════════════════════════════ DASHBOARD ════════════════════════════
  const locked = report.status !== 'open';
  const recent = getRecent().filter(k => ACTION_BY_KEY[k]);
  const quickKeys = [...new Set([...recent, ...QUICK])].slice(0, 6);
  const topTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3);
  const strip = [['Total', actions.length, true], ...topTypes.map(t => [KPI_LABEL[t] || t, counts[t], false])];
  while (strip.length < 4) strip.push(null);

  return (
    <Shell>
      <Header>
        <Brand small />
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => setView('teamlog')} style={{ padding: '8px 12px', fontSize: 12 }}><ClipboardList size={13} style={{ verticalAlign: -2 }} /> Past reports</Btn>
          <Btn variant="ghost" onClick={() => { setReport(null); setView('login'); }} style={{ padding: '8px 12px', fontSize: 12 }}><LogOut size={13} style={{ verticalAlign: -2 }} /> Switch</Btn>
        </div>
      </Header>

      <div className="mx-auto" style={{ maxWidth: 760, padding: '22px 20px 64px' }}>
        {/* greeting + identity */}
        <div className="mb-5 flex items-end justify-between" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: C.ink, letterSpacing: '-.02em', margin: 0 }}>{greeting()}, {report.csr_name.split(' ')[0]}</h1>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Logging for <b style={{ color: C.violetDim }}>{report.profile}</b> · {report.shift} shift · in since {timePKT(report.start_at)} PKT</p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: C.mint, background: C.mintBg, padding: '6px 11px', borderRadius: 99 }}>
            <span style={{ width: 7, height: 7, borderRadius: 9, background: C.mint, boxShadow: `0 0 0 3px rgba(16,185,129,.18)` }} /> Live to CEO
          </span>
        </div>

        {/* primary action */}
        {!locked ? (
          <Card strong className="p-5" style={{ marginBottom: 16 }}>
            <button onClick={() => setPicker(true)} className="lift w-full rounded-2xl"
              style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', cursor: 'pointer', background: `linear-gradient(135deg, ${C.glow}, ${C.violet})`, color: '#fff', border: 'none', boxShadow: '0 12px 28px rgba(114,41,255,.32)' }}>
              <span className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(255,255,255,.22)', flex: '0 0 auto' }}><Plus size={20} strokeWidth={2.6} /></span>
              <span style={{ textAlign: 'left', minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 15.5 }}>Log an activity</span>
                <span style={{ display: 'block', fontSize: 11, opacity: .85, fontWeight: 600 }}>Search 20+ actions or pick a quick one below</span>
              </span>
              <span className="hidden sm:flex" style={{ marginLeft: 'auto', alignItems: 'center', gap: 5, fontSize: 11, opacity: .9, background: 'rgba(255,255,255,.18)', padding: '5px 9px', borderRadius: 8, flex: '0 0 auto' }}><Search size={12} /> ⌘K</span>
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
              {quickKeys.map(k => { const a = ACTION_BY_KEY[k]; if (!a) return null; return (
                <button key={k} onClick={() => openForm(a)} className="lift rounded-xl" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'rgba(255,255,255,.6)', border: '1px solid rgba(124,41,255,.16)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.ink }}>
                  <span style={{ width: 7, height: 7, borderRadius: 9, background: groupColor(a.group) }} />{a.label}</button>); })}
            </div>
          </Card>
        ) : (
          <Card className="p-5" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: C.mint, fontWeight: 700, fontSize: 13.5 }}>
            <Check size={17} /> Shift submitted &amp; locked — no more edits.
          </Card>
        )}

        {/* compact metric strip */}
        <div className="glass rounded-2xl" style={{ display: 'flex', marginBottom: 16, overflow: 'hidden' }}>
          {strip.map((it, i) => (
            <div key={i} style={{ flex: 1, padding: '13px 8px', textAlign: 'center', borderLeft: i ? '1px solid rgba(124,41,255,.10)' : 'none' }}>
              {it ? <>
                <div className="mono" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: it[2] ? C.violet : C.ink }}>{it[1]}</div>
                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: C.dim, marginTop: 5 }}>{it[0]}</div>
              </> : <div style={{ fontSize: 18, color: 'rgba(124,41,255,.14)' }}>·</div>}
            </div>
          ))}
        </div>

        {/* timeline */}
        <Card className="p-5">
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.ink }}>Today's timeline</div>
            <span style={{ fontSize: 11, color: C.dim }}>{actions.length} {actions.length === 1 ? 'entry' : 'entries'}{!locked && actions.length > 0 ? ' · tap to edit' : ''}</span>
          </div>
          {actions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '26px 0', color: C.dim }}>
              <ClipboardList size={26} style={{ opacity: .5, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>Nothing logged yet.</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>Tap <b style={{ color: C.violetDim }}>Log an activity</b> to add your first one.</div>
            </div>
          )}
          <div className="no-scrollbar" style={{ maxHeight: 460, overflow: 'auto' }}>
            {actions.map(a => (
              <div key={a.id} onClick={() => !locked && openForm(ACTION_BY_KEY[a.type], { ...a.details, client: a.client }, a.id)}
                className="glass-soft rounded-xl lift" style={{ display: 'flex', gap: 11, padding: '11px 13px', marginBottom: 8, cursor: locked ? 'default' : 'pointer' }}>
                <span style={{ width: 8, height: 8, borderRadius: 9, marginTop: 5, flex: '0 0 auto', background: groupColor(ACTION_BY_KEY[a.type]?.group) }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{ACTION_BY_KEY[a.type]?.label || a.type}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.client}{actionSummary(a) ? ' · ' + actionSummary(a) : ''}</div>
                </div>
                <span style={{ fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>{timePKT(a.created_at)}{!locked && <Pencil size={10} style={{ color: C.violetLine }} />}</span>
              </div>
            ))}
          </div>
        </Card>

        {!locked && <Btn variant="ok" onClick={() => setWrap(true)} className="lift" style={{ width: '100%', marginTop: 14, padding: 13, fontSize: 14 }}><Check size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Wrap up &amp; submit my shift</Btn>}
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
    <Modal title="Wrap up & submit" subtitle="Submitting checks you out and locks the report" onClose={onClose} width={440}>
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
        <Btn variant="ok" onClick={() => onSubmit(done, note)} className="lift" style={{ flex: 1 }}>Submit &amp; check out</Btn>
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
      <Header><div className="flex items-center gap-3"><Brand small /><span style={{ fontWeight: 800, fontSize: 15, color: C.ink }} className="hidden sm:inline">· Past reports</span></div>
        <Btn variant="ghost" onClick={onBack} style={{ padding: '8px 12px', fontSize: 12 }}><ChevronLeft size={13} style={{ verticalAlign: -2 }} /> Back</Btn></Header>
      <div className="mx-auto" style={{ maxWidth: 820, padding: '22px 20px 60px' }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: C.ink, letterSpacing: '-.02em', margin: 0 }}>Past reports</h1>
        <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 16px' }}>Read-only — anyone can read; nothing changes after submit.</p>
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
const link = { display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 16, background: 'none', border: 'none', color: C.violetDim, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' };
function Brand({ small }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <div style={{ width: small ? 28 : 30, height: small ? 28 : 30, borderRadius: 9, background: `linear-gradient(180deg,${C.glow},${C.violet})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: small ? 15 : 16, boxShadow: '0 6px 16px rgba(114,41,255,.3)' }}>C</div>
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: C.dim }} className="hidden sm:block">CSR Shift Logger</div>
  </div>;
}
function Header({ children }) {
  return <div className="glass" style={{ position: 'sticky', top: 0, zIndex: 20, borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderRadius: 0 }}>
    <div className="mx-auto flex items-center justify-between" style={{ maxWidth: 760, padding: '12px 20px' }}>{children}</div>
  </div>;
}
function Shell({ children, center }) {
  return <div style={{ minHeight: '100vh', display: center ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center', padding: center ? 16 : 0 }}>{children}</div>;
}
