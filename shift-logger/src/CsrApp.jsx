import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, ChevronLeft, LogOut, Pencil, ClipboardList, Check, Clock, Sunrise, Sunset, Moon, Zap, ArrowRightLeft, ShieldCheck, RotateCcw, StickyNote, X, Trash2, Laptop } from 'lucide-react';
import { C, SHIFTS, PROFILES, ACTIONS, ACTION_BY_KEY, GROUPS, CHECKLIST, KPI_LABEL, isDesigner } from './config.js';
import { db, todayPKT, timePKT } from './store.js';
import { Btn, Card, Pill, Modal, Label, Field, actionSummary, Logo, ConfirmDelete } from './ui.jsx';

const groupColor = k => (GROUPS.find(g => g.key === k) || {}).color || C.violet;
const QUICK = ['inquiry', 'client_conversation', 'followup_client', 'shared', 'revision_assigned', 'meeting', 'new_order'];
const getRecent = () => { try { return JSON.parse(localStorage.getItem('sl_recent_actions')) || []; } catch { return []; } };
const bumpRecent = k => { const r = [k, ...getRecent().filter(x => x !== k)].slice(0, 8); localStorage.setItem('sl_recent_actions', JSON.stringify(r)); };
const getUsage = () => { try { return JSON.parse(localStorage.getItem('sl_action_usage')) || {}; } catch { return {}; } };
const bumpUsage = k => { const u = getUsage(); u[k] = (u[k] || 0) + 1; localStorage.setItem('sl_action_usage', JSON.stringify(u)); };
// Active (unsubmitted) report cache — lets a report resume after tab close / reload / offline, until submitted.
const ACTIVE = 'sl_active_report';
const saveActive = (report, actions) => { try { localStorage.setItem(ACTIVE, JSON.stringify({ report, actions })); } catch {} };
const readActive = () => { try { return JSON.parse(localStorage.getItem(ACTIVE)); } catch { return null; } };
const clearActive = () => localStorage.removeItem(ACTIVE);

// ── PKT time intelligence ──
const pktHour = () => parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false }).format(new Date()), 10);
const currentShift = () => { const h = pktHour(); if (h >= 9 && h < 17) return 'Morning'; if (h >= 17 || h < 1) return 'Evening'; return 'Night'; };
const greeting = () => { const h = pktHour(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 22 ? 'Good evening' : 'Working late'; };
const SHIFT_ICON = { Morning: Sunrise, Evening: Sunset, Night: Moon };
const hourLabel = iso => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: true }).format(new Date(iso));
function LiveClock() {
  const fmt = () => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date());
  const [t, setT] = useState(fmt());
  useEffect(() => { const id = setInterval(() => setT(fmt()), 1000); return () => clearInterval(id); }, []);
  return <>{t}</>;
}

export default function CsrApp({ boundProfile }) {
  const [roster, setRoster] = useState([]);
  const [view, setView] = useState('login');
  const [report, setReport] = useState(null);
  const [actions, setActions] = useState([]);
  const [handoff, setHandoff] = useState(null);
  const [picker, setPicker] = useState(false);
  const [form, setForm] = useState(null);   // { action, values, editId, error }
  const [wrap, setWrap] = useState(false);
  const [del, setDel] = useState(false);
  const [flash, setFlash] = useState(false);   // success banner on the login for the next person
  const [oops, setOops] = useState(false);     // submit failed — keep the report, let them retry
  const [name, setName] = useState(''); const [shift, setShift] = useState(currentShift()); const [profile, setProfile] = useState('');
  const [resumable, setResumable] = useState(null); // an unsubmitted report for the picked name+profile
  const [handoffSeen, setHandoffSeen] = useState(false); // has the incoming note been acknowledged?
  const [showHandoff, setShowHandoff] = useState(false); // incoming-note modal open
  const [noteDraft, setNoteDraft] = useState('');        // outgoing note for the next shift
  const [noteShifts, setNoteShifts] = useState([]);      // which shifts the outgoing note targets

  useEffect(() => { db.getRoster().then(setRoster); }, []);
  // This laptop is registered to a profile — force it and keep it locked.
  useEffect(() => { if (boundProfile) setProfile(boundProfile); }, [boundProfile]);
  // Resume an unsubmitted report after reload / tab close / offline (restores from cache instantly, reconciles when online)
  useEffect(() => {
    const saved = readActive();
    if (saved && saved.report && saved.report.status === 'open') {
      const rep = saved.report;
      setReport(rep); setActions(saved.actions || []);
      setName(rep.csr_name); setShift(rep.shift); setProfile(rep.profile);
      setView('dashboard');
      db.listActions(rep.id).then(a => { if (Array.isArray(a)) setActions(a); }).catch(() => {});
      db.getReport(rep.id).then(r => { if (r && r.status !== 'open') clearActive(); }).catch(() => {});
      db.latestNoteForProfile(rep.profile, rep.id, rep.shift).then(h => { setHandoff(h); setHandoffSeen(!!(h && h.note_seen_by)); setShowHandoff(!!h && !h.note_seen_by); }).catch(() => {});
    }
  }, []);
  // Keep the open report cached so nothing is lost
  useEffect(() => { if (report && report.status === 'open') saveActive(report, actions); }, [report, actions]);
  // Outgoing note: seed from the report; default target = the other two shifts
  useEffect(() => {
    if (!report) return;
    setNoteDraft(report.note_for_next || '');
    const t = report.checklist && report.checklist.__shifts;
    setNoteShifts(t && t.length ? t : SHIFTS.map(s => s.key).filter(k => k !== report.shift));
  }, [report?.id]);
  // Auto-save the outgoing note (and its target shifts) while the report is open
  useEffect(() => {
    if (!report || report.status !== 'open') return;
    const cur = report.checklist?.__shifts || [];
    if (noteDraft === (report.note_for_next || '') && JSON.stringify(noteShifts) === JSON.stringify(cur)) return;
    const id = setTimeout(() => {
      db.updateReportNote(report.id, noteDraft, noteShifts);
      setReport(r => r ? { ...r, note_for_next: noteDraft, checklist: { ...(r.checklist || {}), __shifts: noteShifts } } : r);
    }, 600);
    return () => clearTimeout(id);
  }, [noteDraft, noteShifts, report]);
  // At login, flag if the picked name+profile already has an unsubmitted report
  useEffect(() => {
    if (view !== 'login' || !name || !profile) { setResumable(null); return; }
    let off = false;
    db.openReportFor(name, profile).then(r => { if (!off) setResumable(r || null); }).catch(() => {});
    return () => { off = true; };
  }, [name, profile, view]);
  const refresh = useCallback(() => { if (report) db.listActions(report.id).then(setActions); }, [report]);
  useEffect(() => {
    refresh();
    let t; const off = db.subscribe(() => { clearTimeout(t); t = setTimeout(refresh, 200); }); // debounce live refetches
    return () => { clearTimeout(t); off && off(); };
  }, [refresh]);
  // ⌘K / Ctrl-K opens the activity palette
  useEffect(() => {
    const onKey = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (report && report.status === 'open') setPicker(true); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [report]);

  const counts = useMemo(() => { const m = {}; actions.forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; }, [actions]);
  const designerNames = useMemo(() => roster.filter(r => r.active && isDesigner(r)).map(r => r.name).sort((a, b) => a.localeCompare(b)), [roster]);

  async function startReport() {
    if (!name || !profile) return;
    const existing = resumable || await Promise.resolve(db.openReportFor(name, profile)).catch(() => null); // resume instead of duplicating
    const rep = existing || await db.createReport({ csr_name: name, shift, profile, date: todayPKT() });
    setReport(rep); setActions([]); setHandoff(null); setHandoffSeen(false); setShowHandoff(false); setView('dashboard');
    db.listActions(rep.id).then(a => { if (Array.isArray(a)) setActions(a); }); // load prior entries when resuming
    // incoming note for THIS shift — pop it and require acknowledgement
    db.latestNoteForProfile(profile, rep.id, rep.shift).then(h => { setHandoff(h); setHandoffSeen(!!(h && h.note_seen_by)); setShowHandoff(!!h && !h.note_seen_by); });
  }
  function ackHandoff() { setHandoffSeen(true); setShowHandoff(false); if (handoff) db.ackNote(handoff.id, name); } // mark read; note stays for reference

  function openForm(action, prefill, editId) { setPicker(false); setForm({ action, values: prefill || {}, editId }); }
  function saveForm() {
    const { action, values, editId } = form;
    const miss = action.fields.filter(f => f.required && (!f.showIf || f.showIf(values)) && !(Array.isArray(values[f.name]) ? values[f.name].length : values[f.name]));
    if (miss.length) return setForm({ ...form, error: 'Fill: ' + miss.map(m => m.label).join(', ') });
    const client = values.client || '';
    const details = { ...values }; delete details.client;
    bumpRecent(action.key); bumpUsage(action.key);
    setForm(null); // close the form instantly
    if (editId) {
      setActions(prev => prev.map(x => x.id === editId ? { ...x, client, details, updated_at: new Date().toISOString() } : x)); // optimistic
      Promise.resolve(db.updateAction(editId, { client, details })).catch(refresh);                                            // persist in background
    } else {
      const now = new Date().toISOString();
      const temp = { id: 'tmp_' + Math.random().toString(36).slice(2), report_id: report.id, type: action.key, client, details, created_at: now, updated_at: now };
      setActions(prev => [temp, ...prev]);                                                                                     // show immediately
      Promise.resolve(db.addAction(report.id, { type: action.key, client, details }))
        .then(saved => { if (saved && saved.id) setActions(prev => prev.map(x => x.id === temp.id ? saved : x)); })           // swap in the saved row
        .catch(refresh);
    }
  }
  function tryWrapUp() {
    if (handoff && !handoffSeen) { setShowHandoff(true); return; } // must read the previous note first
    setWrap(true);
  }
  async function submit(checklist) {
    setWrap(false);                               // close the modal instantly
    const finalChecklist = { ...checklist, __shifts: noteShifts };
    let rep = null;
    try { rep = await db.submitReport(report.id, { checklist: finalChecklist, note_for_next: noteDraft }); } catch (e) { /* surfaced below */ }
    if (!rep) { setOops(true); return; }          // submit didn't persist — keep their work, let them retry
    clearActive();                                // report is submitted — nothing left to resume
    setReport(null); setActions([]); setProfile(''); setName(''); setNoteDraft(''); setNoteShifts([]); setOops(false);
    setFlash(true); setView('login');             // back to the logger for the next person
  }
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(false), 4500); return () => clearTimeout(t); }, [flash]);

  // ════════════════════════════ LOGIN ════════════════════════════
  if (view === 'login') {
    const names = roster.filter(r => r.active && !isDesigner(r) && r.shift === shift); // CSRs available on the selected shift
    const nowShift = currentShift();
    return (
      <Shell center>
        {flash && (
          <div className="pop" style={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 99, background: `linear-gradient(180deg, #34D399, ${C.mint})`, color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 12px 28px rgba(16,185,129,.32)' }}>
            <Check size={16} /> Report submitted — ready for the next person
          </div>
        )}
        <div className="pop w-full" style={{ maxWidth: 940 }}>
          <div className="glass-2" style={{ borderRadius: 28, overflow: 'hidden' }}>
            <div className="grid md:grid-cols-[1.1fr_1fr]">

              {/* ── Brand hero (desktop) ── */}
              <div className="hidden md:flex" style={{ position: 'relative', flexDirection: 'column', justifyContent: 'space-between', padding: '38px 36px', minHeight: 552, color: '#fff', background: `linear-gradient(155deg, ${C.glow} 0%, ${C.violet} 52%, ${C.violetDim} 100%)`, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.16)', filter: 'blur(60px)', top: -90, right: -60 }} />
                <div style={{ position: 'absolute', width: 230, height: 230, borderRadius: '50%', background: 'rgba(159,102,255,.5)', filter: 'blur(70px)', bottom: -50, left: -40 }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src="/favicon.svg" width={40} height={40} alt="HaseebMadeIt" style={{ display: 'block', borderRadius: 11, boxShadow: '0 8px 20px rgba(0,0,0,.18)' }} />
                  <div>
                    <div className="disp" style={{ fontWeight: 700, fontSize: 20 }}>HaseebMadeIt</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .72 }}>CSR Operations</div>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 13, opacity: .85, fontWeight: 600 }}>{greeting()} — it's</div>
                  <div className="mono" style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05, marginTop: 2 }}><LiveClock /></div>
                  <div style={{ fontSize: 12.5, opacity: .82, marginTop: 5 }}>{todayPKT()} · Pakistan time</div>
                  <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', padding: '8px 13px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 9, background: '#fff', boxShadow: '0 0 0 3px rgba(255,255,255,.3)' }} /> {nowShift} shift is live now
                  </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {[[Zap, 'One tap to check in & out'], [ArrowRightLeft, 'Hand-off notes never get lost'], [ShieldCheck, 'Auto-saved the moment you submit']].map(([Icon, txt], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 31, height: 31, borderRadius: 10, background: 'rgba(255,255,255,.16)', flex: '0 0 auto' }}><Icon size={15} /></span>
                      <span style={{ opacity: .95 }}>{txt}</span>
                    </div>))}
                </div>
              </div>

              {/* ── Form ── */}
              <div style={{ padding: '40px 38px' }}>
                <div className="md:hidden flex flex-col items-center" style={{ marginBottom: 22 }}>
                  <Logo size={44} />
                  <div className="disp" style={{ fontWeight: 700, fontSize: 17, color: C.ink, marginTop: 9 }}>HaseebMadeIt</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: C.dim, marginTop: 2 }}>CSR Shift Logger</div>
                </div>

                <h1 className="disp" style={{ fontSize: 25, fontWeight: 700, color: C.ink, margin: 0 }}>Start your report</h1>

                <Label>Your name</Label>
                <select value={name} onChange={e => { setName(e.target.value); const r = names.find(x => x.name === e.target.value); if (r?.shift) setShift(r.shift); if (r?.profile) setProfile(r.profile); }}
                  className="gi" style={{ fontSize: 15, fontWeight: 600, padding: '13px 34px 13px 13px' }}>
                  <option value="">Select your name…</option>
                  {names.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>

                <Label>Shift · Pakistan time</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {SHIFTS.map(s => { const on = shift === s.key; const now = s.key === nowShift; const Icon = SHIFT_ICON[s.key]; return (
                    <button key={s.key} onClick={() => { setShift(s.key); setName(prev => roster.some(r => r.active && !isDesigner(r) && r.shift === s.key && r.name === prev) ? prev : ''); }} className="rounded-2xl lift" style={{ position: 'relative', padding: '15px 6px', cursor: 'pointer', textAlign: 'center', border: on ? 'none' : `1px solid ${C.surfaceLine}`, background: on ? `linear-gradient(165deg, ${C.glow}, ${C.violet})` : C.surface, color: on ? '#fff' : C.muted, boxShadow: on ? '0 12px 24px rgba(114,41,255,.28)' : 'none' }}>
                      {now && <span style={{ position: 'absolute', top: 7, right: 7, fontSize: 7.5, fontWeight: 800, letterSpacing: '.06em', padding: '2px 5px', borderRadius: 6, background: on ? 'rgba(255,255,255,.25)' : C.mintBg, color: on ? '#fff' : C.mint }}>NOW</span>}
                      <Icon size={19} strokeWidth={2.2} style={{ display: 'block', margin: '0 auto 7px' }} />
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{s.label}</div>
                      <div style={{ fontSize: 9.5, opacity: .8, fontWeight: 600, marginTop: 1 }}>{s.time}</div>
                    </button>); })}
                </div>

                <Label>Profile</Label>
                {boundProfile
                  ? <div className="gi" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px', background: C.violetBg, borderColor: C.violetLine, fontWeight: 700, color: C.violetDim }}>
                      <Laptop size={14} /> {boundProfile}
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>This device</span>
                    </div>
                  : <select value={profile} onChange={e => setProfile(e.target.value)} className="gi" style={{ padding: '13px 34px 13px 13px' }}><option value="">Select profile…</option>{PROFILES.map(p => <option key={p} value={p}>{p}</option>)}</select>}

                {resumable && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16, padding: '9px 12px', borderRadius: 12, background: C.mintBg, color: C.mint, fontSize: 12, fontWeight: 700 }}>
                  <RotateCcw size={13} /> Unsubmitted report from {timePKT(resumable.start_at)} — you'll pick up where you left off.
                </div>}
                <Btn onClick={startReport} disabled={!name || !profile} className="lift" style={{ width: '100%', marginTop: resumable ? 10 : 20, padding: 14, fontSize: 14.5 }}>{resumable ? 'Resume report →' : 'Start my report →'}</Btn>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(124,41,255,.1)', fontSize: 11, color: C.dim }}>
                  <Clock size={11} /> {todayPKT()} · check-in {timePKT()} PKT · auto
                </div>
              </div>

            </div>
          </div>
        </div>
      </Shell>
    );
  }
  if (view === 'teamlog') return <TeamLog profile={report?.profile} onBack={() => setView(report ? 'dashboard' : 'login')} />;

  // ════════════════════════════ DASHBOARD ════════════════════════════
  const locked = report.status !== 'open';
  const usage = getUsage();
  const quickKeys = [...new Set([...Object.keys(usage).filter(k => ACTION_BY_KEY[k]).sort((a, b) => usage[b] - usage[a]), ...QUICK])].slice(0, 6);
  // Moving ticker: each logged activity shown once, scrolling (Total stays static)
  const tickerItems = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => [KPI_LABEL[t] || t, n]);
  // Group the timeline by hour (newest first) for color-railed sections
  const tlGroups = [];
  actions.forEach(a => { const hr = hourLabel(a.created_at); let g = tlGroups[tlGroups.length - 1]; if (!g || g.hr !== hr) { g = { hr, items: [] }; tlGroups.push(g); } g.items.push(a); });

  return (
    <Shell>
      {oops && (
        <div className="pop" onClick={() => setOops(false)} style={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 99, background: C.coral, color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 12px 28px rgba(239,68,68,.32)', cursor: 'pointer' }}>
          Couldn't submit — your entries are safe. Tap to dismiss &amp; try again.
        </div>
      )}
      <Header>
        <Brand small />
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => setView('teamlog')} style={{ padding: '8px 13px', fontSize: 12 }}><ClipboardList size={13} />Past reports</Btn>
          <Btn variant="ghost" onClick={() => { clearActive(); setReport(null); setActions([]); setName(''); setProfile(''); setView('login'); }} style={{ padding: '8px 13px', fontSize: 12 }}><LogOut size={13} />Switch</Btn>
        </div>
      </Header>

      <div className="mx-auto" style={{ maxWidth: 760, padding: '22px 20px 64px' }}>
        {/* greeting + identity */}
        <div className="mb-5">
          <h1 className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>{greeting()}, {report.csr_name.split(' ')[0]}</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Logging for <b style={{ color: C.violetDim }}>{report.profile}</b> · {report.shift} shift · in since {timePKT(report.start_at)} PKT</p>
        </div>

        {handoff && !handoffSeen && (
          <div onClick={() => setShowHandoff(true)} className="lift" style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16, padding: '12px 14px', borderRadius: 14, cursor: 'pointer', background: C.amberBg, border: `1px solid ${C.amber}55` }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, background: C.amber, color: '#fff', flex: '0 0 auto' }}><StickyNote size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.ink }}>Unread note from the last shift</div>
              <div style={{ fontSize: 11.5, color: C.muted }}>From {handoff.csr_name} · tap to read &amp; acknowledge</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.amber, whiteSpace: 'nowrap' }}>READ →</span>
          </div>
        )}

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
                <button key={k} onClick={() => openForm(a)} className="lift rounded-xl" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: C.surface, border: `1px solid ${C.surfaceLine}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.ink }}>
                  <span style={{ width: 7, height: 7, borderRadius: 9, background: groupColor(a.group) }} />{a.label}</button>); })}
            </div>
          </Card>
        ) : (
          <Card className="p-5" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: C.mint, fontWeight: 700, fontSize: 13.5 }}>
            <Check size={17} /> Report submitted &amp; locked — no more edits.
          </Card>
        )}

        {/* metric strip — static Total + scrolling ticker of every activity */}
        <div className="glass rounded-2xl" style={{ display: 'flex', alignItems: 'stretch', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ flex: '0 0 auto', padding: '13px 24px', textAlign: 'center', borderRight: '1px solid rgba(124,41,255,.12)' }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: C.violet }}>{actions.length}</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: C.dim, marginTop: 5 }}>Total</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            {tickerItems.length === 0
              ? <span style={{ paddingLeft: 18, fontSize: 12, color: C.dim }}>Your activity will scroll here as you log…</span>
              : <div className="marquee">
                  {tickerItems.map((it, i) => (
                    <span key={i} style={{ padding: '0 18px' }}>
                      <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{it[1]}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: C.dim, marginLeft: 6 }}>{it[0]}</span>
                    </span>
                  ))}
                </div>}
          </div>
        </div>

        {/* timeline */}
        <Card className="p-5">
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.ink }}>Today's timeline</div>
            <span style={{ fontSize: 11, color: C.dim }}>{actions.length} {actions.length === 1 ? 'entry' : 'entries'}{!locked && actions.length > 0 ? ' · tap to edit' : ''}</span>
          </div>
          {actions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '26px 0', color: C.dim }}>
              <div style={{ fontSize: 13 }}>Nothing logged yet.</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>Tap <b style={{ color: C.violetDim }}>Log an activity</b> to add your first one.</div>
            </div>
          )}
          <div className="scroll-y" style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 6 }}>
            {tlGroups.map((g, gi) => (
              <div key={gi}>
                <div className="flex items-center gap-2" style={{ margin: gi ? '14px 0 8px' : '2px 0 8px' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', color: C.dim }}>{g.hr}</span>
                  <span style={{ flex: 1, height: 1, background: 'rgba(124,41,255,.10)' }} />
                  <span style={{ fontSize: 10, color: C.dim }}>{g.items.length}</span>
                </div>
                {g.items.map(a => { const col = groupColor(ACTION_BY_KEY[a.type]?.group); return (
                  <div key={a.id} onClick={() => !locked && openForm(ACTION_BY_KEY[a.type], { ...a.details, client: a.client }, a.id)}
                    className="glass-soft rounded-xl lift" style={{ display: 'flex', gap: 11, padding: '11px 13px', marginBottom: 8, cursor: locked ? 'default' : 'pointer', borderLeft: `3px solid ${col}` }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{ACTION_BY_KEY[a.type]?.label || a.type}</div>
                      <div className="truncate" style={{ fontSize: 11.5, color: C.muted }}>{a.client}{actionSummary(a) ? ' · ' + actionSummary(a) : ''}</div>
                    </div>
                    <span style={{ fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>{timePKT(a.created_at)}{!locked && <Pencil size={10} style={{ color: C.violetLine }} />}</span>
                  </div>
                ); })}
              </div>
            ))}
          </div>
        </Card>

        {/* hand-off note for the next shift */}
        <Card className="p-5" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StickyNote size={16} style={{ color: C.violet }} />
            <div style={{ fontWeight: 800, fontSize: 15, color: C.ink }}>Note for the next shift</div>
          </div>
          <p style={{ fontSize: 11.5, color: C.muted, margin: '4px 0 10px' }}>Saved automatically as you type — pending tasks, client moods, follow-ups.</p>
          {locked ? (
            <div className="glass-soft rounded-xl" style={{ padding: '11px 13px', fontSize: 13, color: noteDraft ? C.ink : C.dim, whiteSpace: 'pre-wrap' }}>{noteDraft || 'No note left.'}</div>
          ) : (<>
            <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={3} placeholder="Anything the next CSR should know…" className="gi" style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.dim }}>For which shift?</span>
              {SHIFTS.filter(s => s.key !== report.shift).map(s => { const on = noteShifts.includes(s.key); return (
                <button key={s.key} onClick={() => setNoteShifts(p => on ? p.filter(x => x !== s.key) : [...p, s.key])} className="rounded-lg" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: on ? 'none' : `1px solid ${C.surfaceLine}`, background: on ? C.violet : C.surface, color: on ? '#fff' : C.muted }}>{on ? '✓ ' : ''}{s.label}</button>); })}
            </div>
          </>)}
        </Card>

        {!locked && <Btn variant="ok" onClick={tryWrapUp} className="lift" style={{ width: '100%', marginTop: 14, padding: 13, fontSize: 14, textAlign: 'center' }}>Wrap up &amp; submit my report</Btn>}
        {!locked && <button onClick={() => setDel(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '12px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: C.coral, fontSize: 12, fontWeight: 700 }}><Trash2 size={13} /> Wrong report? Delete it</button>}
      </div>

      {showHandoff && handoff && <Modal title="Note from the last shift" subtitle={`for ${report.profile} · left by ${handoff.csr_name}`} onClose={() => setShowHandoff(false)} width={400}>
        <div className="glass-soft rounded-xl" style={{ padding: 13, fontSize: 13.5, color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{handoff.note_for_next}</div>
        <Btn variant="ok" onClick={ackHandoff} className="lift" style={{ width: '100%', marginTop: 14 }}>Noted ✓</Btn>
        <div style={{ fontSize: 11, color: C.dim, textAlign: 'center', marginTop: 8 }}>Closing without “Noted” keeps it flagged unread.</div>
      </Modal>}

      {picker && <CommandPalette onClose={() => setPicker(false)} onPick={openForm} />}

      {form && <Modal title={form.action.label} subtitle={form.editId ? 'Edit entry' : 'New entry'} onClose={() => setForm(null)} width={400}>
        {form.action.fields.filter(f => !f.showIf || f.showIf(form.values)).map(f => { const ff = f.type === 'designer' ? { ...f, type: 'select', options: [...new Set([...designerNames, form.values[f.name]].filter(Boolean))] } : f;
          return <Field key={f.name} field={ff} value={form.values[f.name]}
            onChange={v => setForm(m => ({ ...m, values: { ...m.values, [f.name]: v }, error: null }))} />; })}
        {form.error && <div style={{ color: C.coral, fontSize: 12, marginTop: 10 }}>{form.error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Btn variant="ghost" onClick={() => setForm(null)} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="ok" onClick={saveForm} className="lift" style={{ flex: 1 }}>{form.editId ? 'Save' : 'Add'}</Btn>
        </div>
      </Modal>}

      {wrap && <WrapUp note={noteDraft} shifts={noteShifts} onClose={() => setWrap(false)} onSubmit={submit} />}
      {del && report && <ConfirmDelete what="this report" onConfirm={async () => { await db.deleteReport(report.id); clearActive(); setReport(null); setActions([]); setHandoff(null); setShowHandoff(false); setName(''); setProfile(''); setView('login'); }} onClose={() => setDel(false)} />}
    </Shell>
  );
}

// ── Command palette (keyboard-navigable) ──
function CommandPalette({ onClose, onPick }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null); const listRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSel(0); }, [q]);

  const recent = getRecent().filter(k => ACTION_BY_KEY[k]).slice(0, 3).map(k => ACTION_BY_KEY[k]);
  const sections = [];
  if (q) { const ms = ACTIONS.filter(a => a.label.toLowerCase().includes(q.toLowerCase())); if (ms.length) sections.push({ label: 'Results', color: C.dim, items: ms }); }
  else { if (recent.length) sections.push({ label: 'Recent', color: C.violetDim, items: recent }); GROUPS.forEach(g => { const items = ACTIONS.filter(a => a.group === g.key); if (items.length) sections.push({ label: g.label, color: g.color, items }); }); }
  const flat = sections.flatMap(s => s.items);
  const clamped = Math.max(0, Math.min(sel, flat.length - 1));
  useEffect(() => { listRef.current?.querySelector('[data-active="1"]')?.scrollIntoView({ block: 'nearest' }); }, [clamped, q]);

  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (flat[clamped]) onPick(flat[clamped]); }
    else if (e.key === 'Escape') onClose();
  };

  let idx = -1;
  return (
    <Modal title={undefined} onClose={onClose} width={480}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 12px' }}>
        <Search size={18} style={{ color: C.violet }} />
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search activities…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: C.ink }} />
        <span style={{ color: C.dim, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}><X size={18} /></span>
      </div>
      <div ref={listRef} className="no-scrollbar" style={{ maxHeight: '56vh', overflow: 'auto', borderTop: '1px solid rgba(124,41,255,.1)', paddingTop: 6 }}>
        {flat.length === 0 && <div style={{ color: C.dim, fontSize: 13, padding: 14 }}>No match for “{q}”.</div>}
        {sections.map((s, si) => (
          <div key={si}>
            <GroupLabel color={s.color}>{s.label}</GroupLabel>
            {s.items.map(a => { idx++; const myIdx = idx; const active = myIdx === clamped; return (
              <button key={a.key} data-active={active ? '1' : '0'} onMouseMove={() => setSel(myIdx)} onClick={() => onPick(a)}
                className="w-full rounded-xl" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', marginBottom: 2, background: active ? 'rgba(124,41,255,.10)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 27, height: 27, borderRadius: 8, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${groupColor(a.group)}1A` }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9, background: groupColor(a.group) }} />
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, flex: 1 }}>{a.label}</span>
                {active ? <span style={{ fontSize: 10.5, fontWeight: 800, color: C.violet }}>Add ↵</span> : <Plus size={14} style={{ color: C.violetLine }} />}
              </button>
            ); })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, padding: '10px 4px 0', marginTop: 4, borderTop: '1px solid rgba(124,41,255,.08)', fontSize: 10.5, color: C.dim }}>
        <span><b style={{ color: C.muted }}>↑↓</b> navigate</span><span><b style={{ color: C.muted }}>↵</b> add</span><span><b style={{ color: C.muted }}>esc</b> close</span>
      </div>
    </Modal>
  );
}
const GroupLabel = ({ children, color = C.dim }) => <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color, margin: '10px 6px 4px' }}>{children}</div>;

// ── Wrap up ──
const COUNT_ITEMS = ['CRM updated', 'Portfolio updated', 'Briefs Created']; // these ask for a number once ticked
function WrapUp({ onClose, onSubmit, note, shifts }) {
  const [done, setDone] = useState({}); const [nums, setNums] = useState({});
  const submit = () => {
    const checklist = { ...done };
    COUNT_ITEMS.forEach(it => { if (done[it] && nums[it]) checklist[it + ' — count'] = nums[it]; });
    onSubmit(checklist);
  };
  return (
    <Modal title="Wrap up & submit" subtitle="Submitting checks you out and locks the report" onClose={onClose} width={440}>
      <Label>Tick what's done</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {CHECKLIST.map(item => { const on = done[item]; const needsNum = COUNT_ITEMS.includes(item); return (
          <div key={item} className="glass-soft rounded-xl" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
            <button onClick={() => setDone(d => ({ ...d, [item]: !d[item] }))} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, padding: '2px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.ink, textAlign: 'left' }}>
              <span style={{ width: 19, height: 19, flex: '0 0 auto', borderRadius: 7, border: `1.5px solid ${on ? C.mint : C.violetLine}`, background: on ? C.mint : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Check size={12} />}</span>{item}</button>
            {needsNum && on && (
              <input type="number" min="0" value={nums[item] || ''} onChange={e => setNums(n => ({ ...n, [item]: e.target.value }))} placeholder="No." autoFocus
                style={{ width: 76, flex: '0 0 auto', padding: '7px 9px', borderRadius: 9, border: `1px solid ${C.surfaceLine}`, background: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: 700, color: C.ink, textAlign: 'center', outline: 'none' }} />
            )}
          </div>); })}
      </div>
      <Label>Note for the next shift</Label>
      <div className="glass-soft rounded-xl" style={{ padding: '11px 13px', fontSize: 12.5, color: note ? C.ink : C.dim, whiteSpace: 'pre-wrap' }}>{note || 'No note added (write one on the dashboard).'}</div>
      {note && shifts && shifts.length > 0 && <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>Goes to: <b style={{ color: C.violetDim }}>{shifts.join(' · ')}</b></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Back</Btn>
        <Btn variant="ok" onClick={submit} className="lift" style={{ flex: 1 }}>Submit &amp; check out</Btn>
      </div>
    </Modal>
  );
}

// ── Team log ──
function TeamLog({ onBack, profile }) {
  const [reports, setReports] = useState([]); const [all, setAll] = useState([]); const [open, setOpen] = useState(null);
  const load = useCallback(() => { db.listReports().then(rs => setReports(profile ? rs.filter(r => r.profile === profile) : rs)); db.allActions().then(setAll); }, [profile]);
  useEffect(() => { load(); let t; const off = db.subscribe(() => { clearTimeout(t); t = setTimeout(load, 200); }); return () => { clearTimeout(t); off && off(); }; }, [load]);
  const cf = id => { const m = {}; all.filter(a => a.report_id === id).forEach(a => m[a.type] = (m[a.type] || 0) + 1); return m; };
  return (
    <Shell>
      <Header><div className="flex items-center gap-3"><Brand small /><span style={{ fontWeight: 800, fontSize: 15, color: C.ink }} className="hidden sm:inline">· Past reports</span></div>
        <Btn variant="ghost" onClick={onBack} style={{ padding: '8px 12px', fontSize: 12 }}><ChevronLeft size={13} style={{ verticalAlign: -2 }} /> Back</Btn></Header>
      <div className="mx-auto" style={{ maxWidth: 820, padding: '22px 20px 60px' }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: C.ink, letterSpacing: '-.02em', margin: 0 }}>Past reports{profile ? ` · ${profile}` : ''}</h1>
        <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 16px' }}>Read-only — {profile ? `past reports for ${profile}` : 'all profiles'}; nothing changes after submit.</p>
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
function Brand({ small }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <Logo size={small ? 28 : 30} />
    <div className="disp hidden sm:block" style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>HaseebMadeIt <span style={{ fontWeight: 600, color: C.dim }}>· CSR Logger</span></div>
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
