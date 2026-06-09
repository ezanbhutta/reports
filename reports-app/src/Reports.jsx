import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RefreshCw, Download, TrendingUp, AlertTriangle, Clock, Users, Package, Star, Activity,
} from 'lucide-react';
import Papa from 'papaparse';

// ═══════════════════════════════════════════════════════════════
// CONFIG — point this at the workbook the Apps Script sync writes to
// (csr-pulse-clickup-sync.gs → OUTPUT_WORKBOOK_ID). It can be a dedicated
// "CSR Reports" sheet or the Order Management sheet — only the tabs below
// are read, so it never collides with CSR Pulse's profile tabs.
// The workbook must be shared "Anyone with the link can view".
// ═══════════════════════════════════════════════════════════════
const REPORTS = {
  workbookUrl: 'https://docs.google.com/spreadsheets/d/1kHw1DB7r4RhgBpF4l4CtapBdgtozJwJXtF-egVBZGUE/edit',
  tabs: {
    designer: 'Designer Production',   // live from ClickUp (no retrofit)
    conversion: 'Profile Conversion',  // from the Inquiry sheet
    csr: 'CSR Production',              // CSR × Profile (needs the ClickUp retrofit)
  },
  conversionTarget: 25, // % — profiles below this are flagged on the exception line
  minInquiriesToFlag: 5, // ignore tiny-sample profiles when flagging conversion
  revisionHeavy: 6,      // a designer with ≥ this many in revision right now is flagged
};

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS — HaseebMadeIt brand · light theme (matches CSR Pulse)
// ═══════════════════════════════════════════════════════════════
const C = {
  bg: '#FAFAFE', bgRaised: '#F4F2FA', bgCard: '#FFFFFF', bgHover: '#F0EEFA', bgInk: '#160A33',
  border: '#E8E5F3', borderHi: '#D4CFEC',
  text: '#160A33', textMuted: '#534A78', textDim: '#8B82A8', textOnDark: '#FFFFFF',
  violet: '#7229FF', violetDim: '#5E1FD8', violetGlow: '#9F66FF', violetBg: '#F1EBFF',
  mint: '#10B981', mintBg: '#E7F8F1', amber: '#F59E0B', amberBg: '#FEF4DE',
  coral: '#EF4444', coralBg: '#FDE9E9', cyan: '#0EA5E9', cyanBg: '#E5F4FE',
};

// ── helpers ──
const extractSheetId = (url) => {
  const m = String(url || '').match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
};
const num = (v) => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

async function fetchTab(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const text = await res.text();
  if (!text || text.startsWith('<') || /Sheet not found|invalid_query/i.test(text)) return [];
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  return parsed.data || [];
}

function ensureScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

const syncAgo = (ts) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

// ── presentational ──
const StatCard = ({ label, value, sub, accent, icon: Icon }) => (
  <div className="rounded-xl p-5 transition-all hover:-translate-y-0.5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: C.textDim }}>{label}</span>
      {Icon && (
        <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${accent}15` }}>
          <Icon size={12} style={{ color: accent }} strokeWidth={2.5} />
        </div>
      )}
    </div>
    <div className="mono text-2xl font-semibold tracking-tight" style={{ color: C.text }}>{value}</div>
    {sub && <div className="mt-1 text-xs" style={{ color: C.textMuted }}>{sub}</div>}
  </div>
);

const Empty = ({ children }) => (
  <div className="rounded-xl p-5 text-xs" style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.textMuted }}>
    {children}
  </div>
);

const SectionHead = ({ title, sub, right }) => (
  <div className="mb-4 flex items-center justify-between">
    <h3 className="text-sm font-semibold" style={{ color: C.text }}>
      {title} {sub && <span className="font-normal" style={{ color: C.textDim }}>· {sub}</span>}
    </h3>
    {right && <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>{right}</span>}
  </div>
);

function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.border}` }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: C.bgRaised }}>
            {columns.map((c, i) => (
              <th key={c.key} className={`px-3 py-2 font-semibold uppercase ${i === 0 ? 'text-left' : 'text-right'}`}
                  style={{ color: C.textDim, fontSize: '10px', letterSpacing: '0.1em' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{ borderTop: `1px solid ${C.border}` }}>
              {columns.map((c, ci) => (
                <td key={c.key} className={`px-3 py-2 ${ci === 0 ? '' : 'text-right mono'}`}
                    style={{ color: c.color ? c.color(r) : (ci === 0 ? C.text : C.textMuted) }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function Reports() {
  const [designer, setDesigner] = useState([]);
  const [conversion, setConversion] = useState([]);
  const [csr, setCsr] = useState([]);
  const [tab, setTab] = useState('overview'); // overview | conversion | designers | csr
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null); // { at, ok, msg }
  const [exporting, setExporting] = useState(false);
  const didLoad = useRef(false);

  const load = async () => {
    const id = extractSheetId(REPORTS.workbookUrl);
    if (!id) { setLastSync({ at: Date.now(), ok: false, msg: 'Bad workbook URL in config' }); return; }
    setLoading(true);
    try {
      const [d, c, s] = await Promise.all([
        fetchTab(id, REPORTS.tabs.designer),
        fetchTab(id, REPORTS.tabs.conversion),
        fetchTab(id, REPORTS.tabs.csr),
      ]);
      setDesigner(d); setConversion(c); setCsr(s);
      const any = d.length || c.length || s.length;
      setLastSync({
        at: Date.now(), ok: !!any,
        msg: any ? `Loaded ${d.length} designers · ${c.length} profiles · ${s.length} CSR rows`
                 : 'No report tabs found — run the Apps Script sync, and share the workbook "Anyone with the link can view".',
      });
    } catch (e) {
      setLastSync({ at: Date.now(), ok: false, msg: `Load failed: ${e.message || 'unknown'}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!didLoad.current) { didLoad.current = true; load(); } }, []);

  // ── derived ──
  const conv = useMemo(() => {
    const rows = conversion
      .map((r) => ({ profile: r.Profile || r.profile || '', inq: num(r.Inquiries), placed: num(r.Placed) }))
      .filter((r) => r.profile)
      .map((r) => ({ ...r, rate: r.inq ? (r.placed / r.inq) * 100 : 0 }));
    const inq = rows.reduce((s, r) => s + r.inq, 0);
    const placed = rows.reduce((s, r) => s + r.placed, 0);
    return { rows: rows.sort((a, b) => b.rate - a.rate), inq, placed, overall: inq ? (placed / inq) * 100 : 0 };
  }, [conversion]);

  const des = useMemo(() => {
    const rows = designer
      .map((r) => ({
        designer: r.Designer || '', tasks: num(r.Tasks), inProgress: num(r['In Progress']),
        inRevision: num(r['In Revision']), awaiting: num(r['Awaiting Client']),
        completed: num(r.Completed), revisions: num(r.Revisions), sla: num(r['SLA Breaches']),
      }))
      .filter((r) => r.designer)
      .sort((a, b) => b.tasks - a.tasks);
    const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
    return { rows, tasks: sum('tasks'), inRevision: sum('inRevision'), awaiting: sum('awaiting'), completed: sum('completed'), sla: sum('sla') };
  }, [designer]);

  const csrRows = useMemo(() => csr
    .map((r) => ({ profile: r.Profile || '', csr: r.CSR || '', shift: r.Shift || '', orders: num(r.Orders), deliveries: num(r.Deliveries), revisions: num(r.Revisions), sla: num(r['SLA Breaches']) }))
    .filter((r) => r.csr || r.profile)
    .sort((a, b) => b.orders - a.orders), [csr]);

  const leaks = useMemo(() => {
    const out = [];
    conv.rows.filter((r) => r.inq >= REPORTS.minInquiriesToFlag && r.rate < REPORTS.conversionTarget)
      .forEach((r) => out.push({ kind: 'Conversion', sev: 'amber', text: `${r.profile} converting at ${fmtPct(r.rate)} (target ${REPORTS.conversionTarget}%) — ${r.placed}/${r.inq}`, action: 'Coach the profile’s CSRs on the inquiry → order step.' }));
    des.rows.filter((r) => r.inRevision >= REPORTS.revisionHeavy)
      .forEach((r) => out.push({ kind: 'Revision load', sev: 'violet', text: `${r.designer} has ${r.inRevision} logos in revision right now`, action: 'Rebalance the queue or check brief quality.' }));
    des.rows.filter((r) => r.sla > 0)
      .forEach((r) => out.push({ kind: 'Stalled', sev: 'coral', text: `${r.designer}: ${r.sla} task${r.sla === 1 ? '' : 's'} past SLA`, action: 'Unblock the stalled task(s) today.' }));
    return out;
  }, [conv, des]);

  const hasAny = des.rows.length || conv.rows.length || csrRows.length;

  // ── PDF ──
  const exportPDF = async () => {
    setExporting(true);
    try {
      await ensureScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const VIOLET = [114, 41, 255], INK = [22, 10, 51], BODY = [60, 50, 100], MUTED = [120, 110, 155],
            MINT = [16, 185, 129], AMBER = [245, 158, 11], CORAL = [239, 68, 68], HAIR = [228, 224, 240];
      const W = 210, H = 297, M = 16, BOTTOM = H - 18;
      let y = 20;
      const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
      const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
      const hair = (yy) => { doc.setDrawColor(HAIR[0], HAIR[1], HAIR[2]); doc.setLineWidth(0.2); doc.line(M, yy, W - M, yy); };
      const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
      const newPage = () => { doc.addPage(); y = 20; };
      const ensure = (n) => { if (y + n > BOTTOM) newPage(); };
      const section = (eyebrow, title, right) => {
        ensure(16);
        setText(VIOLET); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setCharSpace(0.8);
        doc.text(eyebrow.toUpperCase(), M, y); doc.setCharSpace(0);
        setText(INK); doc.setFontSize(13); doc.text(title, M, y + 6);
        if (right) { setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(right, W - M, y + 6, { align: 'right' }); }
        y += 10; hair(y); y += 6;
      };
      const table = (eyebrow, title, right, cols, rows, rowColor) => {
        if (!rows.length) return;
        section(eyebrow, title, right);
        const head = () => {
          setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setCharSpace(0.5);
          cols.forEach((c) => doc.text(c.label, c.x, y, c.align === 'right' ? { align: 'right' } : undefined));
          doc.setCharSpace(0); hair(y + 2); y += 6;
        };
        head();
        rows.forEach((r) => {
          if (y + 7 > BOTTOM) { newPage(); section(eyebrow, title + ' (cont.)', right); head(); }
          cols.forEach((c, i) => {
            const col = (rowColor && c.colorable) ? rowColor(r, c) : (i === 0 ? INK : BODY);
            setText(col); doc.setFont('helvetica', i === 0 ? 'normal' : 'normal'); doc.setFontSize(i === 0 ? 9 : 8.5);
            const v = c.val(r);
            doc.text(String(v), c.x, y + 3, c.align === 'right' ? { align: 'right' } : undefined);
          });
          hair(y + 5); y += 7;
        });
        y += 6;
      };

      // Cover / header
      setText(VIOLET); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setCharSpace(1);
      doc.text('HASEEBMADEIT · CSR REPORTS', M, y); doc.setCharSpace(0);
      setText(INK); doc.setFontSize(22); doc.text('Operations report', M, y + 12);
      setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }), M, y + 19);
      y += 30;

      // KPI strip
      const kpis = [
        ['Conversion', fmtPct(conv.overall)],
        ['In revision', fmtNum(des.inRevision)],
        ['Awaiting client', fmtNum(des.awaiting)],
        ['SLA breaches', fmtNum(des.sla)],
      ];
      const cw = (W - 2 * M) / 4;
      kpis.forEach(([l, v], i) => {
        const x = M + i * cw;
        setFill(i % 2 ? [248, 247, 253] : [243, 240, 251]); doc.roundedRect(x + 1, y, cw - 2, 20, 2, 2, 'F');
        setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setCharSpace(0.6);
        doc.text(l.toUpperCase(), x + 5, y + 7); doc.setCharSpace(0);
        setText(INK); doc.setFontSize(15); doc.text(String(v), x + 5, y + 15);
      });
      y += 30;

      // Exception line
      if (leaks.length) {
        section('Today', 'Exception line', `${leaks.length} flag${leaks.length === 1 ? '' : 's'}`);
        leaks.slice(0, 18).forEach((lk) => {
          if (y + 9 > BOTTOM) { newPage(); section('Today', 'Exception line (cont.)', ''); }
          const dot = lk.sev === 'coral' ? CORAL : lk.sev === 'violet' ? VIOLET : AMBER;
          setFill(dot); doc.circle(M + 1.2, y + 1.2, 1.2, 'F');
          setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(lk.kind, M + 5, y + 2);
          setText(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(trunc(lk.text, 78), M + 28, y + 2);
          y += 7;
        });
        y += 4;
      }

      // Conversion table
      table('Sales', 'Conversion by profile', `overall ${fmtPct(conv.overall)}`,
        [
          { label: 'PROFILE', x: M, val: (r) => trunc(r.profile, 30) },
          { label: 'INQUIRIES', x: M + 105, align: 'right', val: (r) => fmtNum(r.inq) },
          { label: 'PLACED', x: M + 140, align: 'right', val: (r) => fmtNum(r.placed) },
          { label: 'CONV', x: W - M, align: 'right', colorable: true, val: (r) => fmtPct(r.rate) },
        ], conv.rows,
        (r) => (r.rate >= 30 ? MINT : r.rate >= REPORTS.conversionTarget ? AMBER : CORAL));

      // Designer table
      table('Production', 'Designer throughput', 'live from ClickUp',
        [
          { label: 'DESIGNER', x: M, val: (r) => trunc(r.designer, 26) },
          { label: 'TASKS', x: M + 95, align: 'right', val: (r) => fmtNum(r.tasks) },
          { label: 'IN REV', x: M + 125, align: 'right', colorable: true, val: (r) => fmtNum(r.inRevision) },
          { label: 'AWAIT', x: M + 152, align: 'right', val: (r) => fmtNum(r.awaiting) },
          { label: 'DONE', x: M + 176, align: 'right', val: (r) => fmtNum(r.completed) },
          { label: 'SLA', x: W - M, align: 'right', colorable: true, val: (r) => fmtNum(r.sla) },
        ], des.rows,
        (r, c) => (c.label === 'SLA' ? (r.sla > 0 ? CORAL : MUTED) : (r.inRevision >= REPORTS.revisionHeavy ? VIOLET : BODY)));

      // CSR table (if present)
      if (csrRows.length) {
        table('Attribution', 'CSR production', 'CSR × profile',
          [
            { label: 'CSR', x: M, val: (r) => trunc(r.csr, 20) },
            { label: 'PROFILE', x: M + 45, val: (r) => trunc(r.profile, 22) },
            { label: 'ORDERS', x: M + 120, align: 'right', val: (r) => fmtNum(r.orders) },
            { label: 'DELIV', x: M + 150, align: 'right', val: (r) => fmtNum(r.deliveries) },
            { label: 'SLA', x: W - M, align: 'right', colorable: true, val: (r) => fmtNum(r.sla) },
          ], csrRows, (r) => (r.sla > 0 ? CORAL : BODY));
      }

      // footers
      const pages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text('HaseebMadeIt · CSR Reports', M, H - 10);
        doc.text(`${p} / ${pages}`, W - M, H - 10, { align: 'right' });
      }
      doc.save(`CSR-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      alert('PDF export failed: ' + (e.message || e));
    } finally {
      setExporting(false);
    }
  };

  // ── render ──
  const navTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'conversion', label: 'Conversion' },
    { id: 'designers', label: 'Designers' },
    { id: 'csr', label: 'CSR' },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b" style={{ background: `${C.bg}E6`, borderColor: C.border, backdropFilter: 'blur(8px)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: C.violet }}>
              <Activity size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: C.text }}>CSR Reports</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>HaseebMadeIt · operations</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[10px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: C.bgRaised, color: C.textMuted, border: `1px solid ${C.border}` }}>
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} style={{ color: loading ? C.violet : (lastSync && !lastSync.ok ? C.coral : C.mint) }} />
              {loading ? 'Syncing…' : lastSync ? (lastSync.ok ? `Synced ${syncAgo(lastSync.at)}` : 'Sync failed') : 'Sync'}
            </button>
            <button onClick={exportPDF} disabled={exporting || !hasAny}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: C.violet, color: '#fff' }}>
              <Download size={12} /> {exporting ? 'Building…' : 'CEO PDF'}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl items-center gap-1 px-6 pb-3">
          {navTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="rounded-md px-4 py-2 text-xs font-semibold transition-all"
              style={{ background: tab === t.id ? C.violet : 'transparent', color: tab === t.id ? '#fff' : C.textMuted, border: `1px solid ${tab === t.id ? C.violet : 'transparent'}` }}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {lastSync && !lastSync.ok && (
          <div className="mb-5 rounded-xl p-4 text-xs" style={{ background: C.coralBg, border: `1px solid ${C.coral}40`, color: C.text }}>
            {lastSync.msg}
          </div>
        )}

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Conversion" value={fmtPct(conv.overall)} sub={`${fmtNum(conv.placed)} of ${fmtNum(conv.inq)} inquiries`} accent={C.mint} icon={TrendingUp} />
              <StatCard label="In Revision" value={fmtNum(des.inRevision)} sub="logos in revision now" accent={C.violetGlow} icon={Package} />
              <StatCard label="Awaiting Client" value={fmtNum(des.awaiting)} sub="delivered, pending reply" accent={C.cyan} icon={Clock} />
              <StatCard label="SLA Breaches" value={fmtNum(des.sla)} sub="stalled past threshold" accent={des.sla > 0 ? C.coral : C.mint} icon={AlertTriangle} />
            </div>

            <SectionHead title="Exception line" sub="what needs a decision today" right={`${leaks.length} flag${leaks.length === 1 ? '' : 's'}`} />
            {!hasAny ? (
              <Empty>No report data yet. Run the Apps Script <span className="mono">runDailySync()</span>, make sure the workbook is shared “Anyone with the link can view”, then hit Sync.</Empty>
            ) : leaks.length === 0 ? (
              <div className="rounded-xl p-5 text-xs" style={{ background: C.mintBg, border: `1px solid ${C.mint}40`, color: C.text }}>
                Nothing over threshold right now. Conversion ≥ {REPORTS.conversionTarget}%, no overloaded designers, no SLA breaches.
              </div>
            ) : (
              <div className="space-y-2">
                {leaks.map((lk, i) => {
                  const dot = lk.sev === 'coral' ? C.coral : lk.sev === 'violet' ? C.violetGlow : C.amber;
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-xl p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dot }}>{lk.kind}</span>
                        </div>
                        <div className="text-sm" style={{ color: C.text }}>{lk.text}</div>
                        <div className="text-xs" style={{ color: C.textMuted }}>→ {lk.action}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 text-[11px]" style={{ color: C.textDim }}>
              Read-only oversight: the only output here is a delegated instruction to a CSR or lead — not you stepping into the fix.
            </div>
          </>
        )}

        {/* CONVERSION */}
        {tab === 'conversion' && (
          <>
            <SectionHead title="Conversion" sub="inquiries → orders, by profile" right="from Client Daily Inquiries" />
            {conv.rows.length === 0 ? (
              <Empty>No conversion data yet — run the sync (writes the “Profile Conversion” tab).</Empty>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <StatCard label="Conversion" value={fmtPct(conv.overall)} sub={`${fmtNum(conv.placed)} of ${fmtNum(conv.inq)}`} accent={C.mint} icon={TrendingUp} />
                  <StatCard label="Inquiries" value={fmtNum(conv.inq)} sub="in window" accent={C.violetGlow} icon={Package} />
                  <StatCard label="Placed" value={fmtNum(conv.placed)} sub="orders from inquiries" accent={C.mint} icon={Star} />
                  <StatCard label="Profiles" value={fmtNum(conv.rows.length)} sub="reporting inquiries" accent={C.cyan} icon={Users} />
                </div>
                <div className="rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                  {conv.rows.map((r) => {
                    const max = Math.max(...conv.rows.map((x) => x.rate), 1);
                    return (
                      <div key={r.profile} className="mb-3 last:mb-0">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span style={{ color: C.text }}>{r.profile}</span>
                          <span className="mono" style={{ color: r.rate < REPORTS.conversionTarget ? C.coral : C.textMuted }}>{fmtPct(r.rate)} · {r.placed}/{r.inq}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full" style={{ background: C.border }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${(r.rate / max) * 100}%`, background: r.rate < REPORTS.conversionTarget ? C.coral : C.mint }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* DESIGNERS */}
        {tab === 'designers' && (
          <>
            <SectionHead title="Designer Production" sub="throughput · revision load · SLA" right="live from ClickUp" />
            {des.rows.length === 0 ? (
              <Empty>No designer data yet — run the sync; it writes the “Designer Production” tab straight from ClickUp. No retrofit needed.</Empty>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <StatCard label="Active tasks" value={fmtNum(des.tasks)} sub={`${des.rows.length} designers`} accent={C.violet} icon={Users} />
                  <StatCard label="In Revision" value={fmtNum(des.inRevision)} sub="across the floor" accent={C.violetGlow} icon={Package} />
                  <StatCard label="Awaiting Client" value={fmtNum(des.awaiting)} sub="delivered, pending" accent={C.cyan} icon={Clock} />
                  <StatCard label="Completed" value={fmtNum(des.completed)} sub="in window" accent={C.mint} icon={Star} />
                </div>
                <Table
                  columns={[
                    { key: 'designer', label: 'Designer' },
                    { key: 'tasks', label: 'Tasks', color: () => C.text },
                    { key: 'inProgress', label: 'In Progress' },
                    { key: 'inRevision', label: 'In Revision', color: (r) => (r.inRevision >= REPORTS.revisionHeavy ? C.violetGlow : C.textMuted) },
                    { key: 'awaiting', label: 'Awaiting' },
                    { key: 'completed', label: 'Completed', color: () => C.mint },
                    { key: 'revisions', label: 'Revisions' },
                    { key: 'sla', label: 'SLA', color: (r) => (r.sla > 0 ? C.coral : C.textMuted) },
                  ]}
                  rows={des.rows}
                />
              </>
            )}
          </>
        )}

        {/* CSR */}
        {tab === 'csr' && (
          <>
            <SectionHead title="CSR Production" sub="orders · deliveries · revisions · SLA" right="CSR × profile · ClickUp" />
            {csrRows.length === 0 ? (
              <Empty>
                No CSR-attributed data yet. This needs the ClickUp retrofit — add the <span className="mono">CSR</span> + <span className="mono">Profile</span> custom fields to tasks (see DEPLOY.md). Until then, attribution lives at the designer grain (Designers tab).
              </Empty>
            ) : (
              <Table
                columns={[
                  { key: 'csr', label: 'CSR' },
                  { key: 'profile', label: 'Profile' },
                  { key: 'shift', label: 'Shift' },
                  { key: 'orders', label: 'Orders', color: () => C.text },
                  { key: 'deliveries', label: 'Deliveries' },
                  { key: 'revisions', label: 'Revisions' },
                  { key: 'sla', label: 'SLA', color: (r) => (r.sla > 0 ? C.coral : C.textMuted) },
                ]}
                rows={csrRows}
              />
            )}
          </>
        )}

        <div className="mt-8 text-[11px]" style={{ color: C.textDim }}>
          Data source: {REPORTS.tabs.designer} · {REPORTS.tabs.conversion} · {REPORTS.tabs.csr} tabs, written by the Apps Script sync. {lastSync && <span>· {lastSync.msg}</span>}
        </div>
      </main>
    </div>
  );
}
