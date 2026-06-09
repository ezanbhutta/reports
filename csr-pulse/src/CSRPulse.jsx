import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload, Filter, Download, Trash2, Archive, ArchiveRestore, Plus, X,
  TrendingUp, DollarSign, Package, Star, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight,
  Search, RefreshCw, Settings, Clock, Users, Trophy, Calendar, FileSpreadsheet,
  Cloud, Link2, CheckCircle2
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS — HaseebMadeIt brand · light theme
// ═══════════════════════════════════════════════════════════════
const C = {
  // Surfaces (~55% white dominance via tinted off-whites)
  bg:        '#FAFAFE',   // App canvas — barely-there violet tint
  bgRaised:  '#F4F2FA',   // Light panels
  bgCard:    '#FFFFFF',   // Cards — pure white
  bgHover:   '#F0EEFA',   // Hover states
  bgInk:     '#160A33',   // Deep brand dark — accents only

  // Borders
  border:    '#E8E5F3',
  borderHi:  '#D4CFEC',

  // Text
  text:      '#160A33',   // Deep brand dark — primary text
  textMuted: '#534A78',   // Medium text
  textDim:   '#8B82A8',   // Dim/labels
  textOnDark:'#FFFFFF',

  // Brand
  violet:    '#7229FF',   // Primary brand accent
  violetDim: '#5E1FD8',
  violetGlow:'#9F66FF',
  violetBg:  '#F1EBFF',   // Light violet tint

  // Functional
  mint:      '#10B981',   // Success / VVRO
  mintBg:    '#E7F8F1',
  amber:     '#F59E0B',
  amberBg:   '#FEF4DE',
  coral:     '#EF4444',
  coralBg:   '#FDE9E9',
  cyan:      '#0EA5E9',
  cyanBg:    '#E5F4FE',
};

const SHIFT_COLORS = {
  Morning: C.amber,
  Evening: C.cyan,
  Night:   C.violet,
};

const SHIFT_BG = {
  Morning: C.amberBg,
  Evening: C.cyanBg,
  Night:   C.violetBg,
};

// ═══════════════════════════════════════════════════════════════
// ROSTER & PROFILES
// ═══════════════════════════════════════════════════════════════
const DEFAULT_ROSTER = [
  { id: 'tanzeel',   name: 'Tanzeel',         shift: 'Morning', role: 'CSR',     active: true },
  { id: 'iqra',      name: 'Iqra',            shift: 'Morning', role: 'CSR',     active: true },
  { id: 'hassan',    name: 'Hassan',          shift: 'Morning', role: 'CSR',     active: true },
  { id: 'hira',      name: 'Hira',            shift: 'Morning', role: 'CSR',     active: true },
  { id: 'misbah',    name: 'Misbah',          shift: 'Morning', role: 'CSR',     active: true },
  { id: 'gulba',     name: 'Gulba',           shift: 'Morning', role: 'CSR',     active: true },
  { id: 'amrah',     name: 'Amrah',           shift: 'Morning', role: 'CSR',     active: true },
  { id: 'tayyab',    name: 'Tayyab',          shift: 'Evening', role: 'CSR',     active: true },
  { id: 'hasnain',   name: 'Hasnain Gillani', shift: 'Evening', role: 'CSR',     active: true },
  { id: 'alishakeel',name: 'Ali Shakeel',     shift: 'Evening', role: 'CSR',     active: true },
  { id: 'basit',     name: 'Abdul Basit',     shift: 'Evening', role: 'CSR',     active: true },
  { id: 'hadi',      name: 'Hadi',            shift: 'Evening', role: 'CSR',     active: true },
  { id: 'aneeq',     name: 'Aneeq',           shift: 'Evening', role: 'CSR',     active: true },
  { id: 'faiz',      name: 'Faiz',            shift: 'Evening', role: 'CSR',     active: true },
  { id: 'salman',    name: 'Salman',          shift: 'Night',   role: 'CSR',     active: true },
  { id: 'saad',      name: 'Saad',            shift: 'Night',   role: 'CSR',     active: true },
  { id: 'shahzaib',  name: 'Shahzaib',        shift: 'Night',   role: 'CSR',     active: true },
  { id: 'swaid',     name: 'Swaid',           shift: 'Night',   role: 'CSR',     active: true },
  { id: 'samama',    name: 'Samama',          shift: 'Night',   role: 'CSR',     active: true },
  { id: 'ahmad',     name: 'Ahmad',           shift: 'Night',   role: 'CSR',     active: true },
  { id: 'nadir',     name: 'Nadir',           shift: 'Night',   role: 'CSR',     active: true },
  { id: 'zuhair',    name: 'Zuhair',          shift: 'Night',   role: 'CSR',     active: true },
  { id: 'noor',      name: 'Noor',            shift: 'Night',   role: 'CSR',     active: true },
  { id: 'zubair',    name: 'Zubair',          shift: 'Night',   role: 'Manager', active: true },
  { id: 'ezan',      name: 'Ezan',            shift: 'Night',   role: 'Manager', active: true },
  // Former CSRs — kept for historical attribution, marked inactive
  { id: 'fatima',    name: 'Fatima',          shift: 'Morning', role: 'CSR',     active: false },
  { id: 'laiba',     name: 'Laiba',           shift: 'Morning', role: 'CSR',     active: false },
  { id: 'maria',     name: 'Maria',           shift: 'Morning', role: 'CSR',     active: false },
  { id: 'rida',      name: 'Rida',            shift: 'Morning', role: 'CSR',     active: false },
];

const DEFAULT_PROFILES = [
  'Abdul Haseeb', 'Tariq Mahmood', 'Eikon Designs', 'Alee Studioz', 'Carpicon',
  'Dygram Designs', 'Storm Design', 'WeDesignz', 'Grid Designs', 'X Studioz'
];

// ═══════════════════════════════════════════════════════════════
// TIME HELPERS — business day uses 5 AM PKT cutoff
// (Shifts come from each CSR's roster entry, NOT from the timestamp)
// ═══════════════════════════════════════════════════════════════
// Returns the business day (YYYY-MM-DD) for a given date, where the
// day "rolls over" at 5 AM PKT.
//
// PKT = UTC+5. So 5 AM PKT = 00:00 UTC.
// The "business day" of an order is the PKT calendar day, but where the day
// starts at 5 AM PKT instead of midnight. So an order at 4 AM PKT on May 22
// belongs to May 21's business day.
//
// Implementation: subtract 5 hours from PKT time, then take the date part.
const businessDay = (date) => {
  const d = new Date(date);
  // Convert UTC → PKT by adding 5 hours
  // Then subtract 5 more hours to make the day roll at 5 AM PKT
  // Net effect: subtract 0 hours from UTC = use UTC date directly
  // ... which IS what we want, because 00:00 UTC == 5 AM PKT == business-day boundary
  return d.toISOString().slice(0, 10);
};
const todayBD = () => businessDay(new Date());

// ═══════════════════════════════════════════════════════════════
// DATE PARSING — handles d/m/y, dd/mm/yyyy, d-m-y variations
// ═══════════════════════════════════════════════════════════════
const MONTH_MAP = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, sept:8, oct:9, nov:10, dec:11,
  january:0, february:1, march:2, april:3, june:5,
  july:6, august:7, september:8, october:9, november:10, december:11,
};

const parseFlexibleDate = (str) => {
  if (str === null || str === undefined || str === '') return null;
  if (str instanceof Date) {
    if (isNaN(str)) return null;
    // Excel cells parsed by sheetjs (cellDates: true) come back as JS Dates
    // anchored to LOCAL midnight. On a Pakistan (UTC+5) machine that becomes
    // the prior UTC day, so .toISOString() shifts every date back one day.
    // Re-anchor to UTC noon of the LOCAL calendar date so businessDay() is stable.
    return new Date(Date.UTC(str.getFullYear(), str.getMonth(), str.getDate(), 12, 0, 0));
  }

  // Excel serial date number
  if (typeof str === 'number' && str > 20000 && str < 80000) {
    const ms = (str - 25569) * 86400 * 1000;
    return new Date(ms);
  }

  const s = String(str).trim();
  if (!s) return null;

  // ── Format: "14-May-26" or "14 May 2026" or "14-May-2026" — day-MonthName-year
  const monthName = s.match(/^(\d{1,2})[\s\-\/\.]+([a-zA-Z]+)[\s\-\/\.]+(\d{2,4})/);
  if (monthName) {
    let [, d, mo, y] = monthName;
    const m = MONTH_MAP[mo.toLowerCase()];
    if (m !== undefined) {
      if (y.length === 2) y = '20' + y;
      // Use UTC noon to be safe on either side of the 5AM PKT cutoff
      return new Date(Date.UTC(parseInt(y), m, parseInt(d), 12, 0, 0));
    }
  }

  // ── ISO 2026-05-22
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return new Date(s);
  }

  // ── d/m/y or d-m-y (day-first)
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return new Date(Date.UTC(parseInt(y), parseInt(mo)-1, parseInt(d), 12, 0, 0));
  }

  // ── Last resort
  const parsed = new Date(s);
  return isNaN(parsed) ? null : parsed;
};

// ═══════════════════════════════════════════════════════════════
// DATA START CUTOFF — orders before this date are completely ignored
// ═══════════════════════════════════════════════════════════════
const DATA_START_DATE = '2026-01-01';

// ═══════════════════════════════════════════════════════════════
// SHARED DATA SOURCE — Google Sheets baked into the app so anyone who opens
// the link (with the password) auto-pulls the SAME numbers, with no per-device
// import. The sheets must be shared "Anyone with the link can view". To point
// at different sheets later, edit these URLs and each workbook's left-most tab.
// ═══════════════════════════════════════════════════════════════
const SHARED_SYNC = {
  workbookUrls: [
    'https://docs.google.com/spreadsheets/d/1d7ZFWLmVPWK_UUXoxj2o7OJKj5hJHW87eClDC316fSY/edit', // New Order Sheet
    'https://docs.google.com/spreadsheets/d/1kHw1DB7r4RhgBpF4l4CtapBdgtozJwJXtF-egVBZGUE/edit', // Order Management Sheet
  ],
  firstTabs: ['Dygram Designs', 'X Studioz'], // left-most tab of each workbook
};
const HAS_SHARED_SYNC = SHARED_SYNC.workbookUrls.some((u) => u && u.trim());

// Relative "x ago" label for the header sync indicator.
const syncAgo = (ts) => {
  if (!ts) return '';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Strip emoji + zero-width chars + invisible unicode from any string
const stripEmoji = (s) => {
  if (!s) return '';
  return String(s)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')   // pictographic
    .replace(/[\u{2600}-\u{27BF}]/gu, '')      // misc symbols
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')      // variation selectors
    .replace(/[\u{200B}-\u{200D}\uFEFF]/gu, '')// zero-width
    .trim();
};

// ═══════════════════════════════════════════════════════════════
// CSR MATCHING — fuzzy match against roster, with explicit aliases
// ═══════════════════════════════════════════════════════════════
// Names that appear in the sheets but should map to a specific roster member
const CSR_ALIASES = {
  'ali': 'alishakeel',          // Ali → Ali Shakeel
  'basit': 'basit',             // BASIT → Abdul Basit
  'abdul': 'basit',             // "Abdul" alone → Abdul Basit
  'gillani': 'hasnain',         // Gillani → Hasnain Gillani
  'husnain': 'hasnain',         // Husnain spelling
  'shakeel': 'alishakeel',      // Shakeel alone
  'hasan': 'hassan',            // Hasan (one S) → Hassan
  'hassaan': 'hassan',          // Hassaan (extra A) → Hassan
};

const matchCSR = (rawName, roster) => {
  if (!rawName) return null;
  // Strip emojis FIRST so "Ezan🤓" becomes "Ezan"
  const cleaned = stripEmoji(rawName);
  const norm = cleaned.toLowerCase();
  if (!norm) return null;

  // Multi-CSR cells like "Basit, Saad khan" — take the first name only
  const firstChunk = norm.split(/[,/&;]+/)[0].trim();
  const words = firstChunk.split(/\s+/);
  const firstWord = words[0];

  // Alias map first
  if (CSR_ALIASES[firstWord]) {
    const hit = roster.find(c => c.id === CSR_ALIASES[firstWord]);
    if (hit) return hit;
  }
  if (CSR_ALIASES[firstChunk]) {
    const hit = roster.find(c => c.id === CSR_ALIASES[firstChunk]);
    if (hit) return hit;
  }

  // Exact first-name match (case-insensitive)
  let hit = roster.find(c => c.name.toLowerCase().split(/\s+/)[0] === firstWord);
  if (hit) return hit;

  // Whole-name contains
  hit = roster.find(c =>
    c.name.toLowerCase() === firstChunk ||
    c.name.toLowerCase().includes(firstChunk) ||
    firstChunk.includes(c.name.toLowerCase().split(/\s+/)[0])
  );
  return hit || null;
};

// ═══════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════
// All money is formatted with 2 decimals + thousands separators. Per user:
// "0.00 rule" — every dollar amount surfaced anywhere in CSR Pulse needs
// to show its cents. fmtUSD and fmtUSDc are now the same function; kept
// both names to avoid churn at every call site.
const fmtUSD  = (n) => '$' + (n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUSDc = fmtUSD;
const fmtNum  = (n) => Math.round(n||0).toLocaleString();

// Parse a user-typed money string into a number. Calculator inputs are stored
// as raw strings (so a value can be typed straight through, decimal point and
// all — "12." stays "12." instead of snapping back to 12). Tolerates "$",
// thousands commas, and whitespace; returns 0 for blanks/garbage so the
// roll-up math never produces NaN. Numbers pass through unchanged (back-compat
// with inputs saved before this was a string).
const parseMoneyInput = (v) => {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
};

// ═══════════════════════════════════════════════════════════════
// SAMPLE DATA GEN
// ═══════════════════════════════════════════════════════════════
const genSampleOrders = (roster, profiles) => {
  const out = [];
  const types = ['VVRO', 'ORGANIC'];
  const statuses = ['Completed', 'In progress', 'Delivered', 'Revision', 'Cancel', 'Late'];
  const industries = ['Tech', 'Restaurant', 'Fashion', 'Real Estate', 'Healthcare', 'Construction'];
  for (let i = 0; i < 80; i++) {
    const csr = roster[Math.floor(Math.random() * roster.length)];
    const profile = profiles[Math.floor(Math.random() * profiles.length)];
    const daysBack = Math.floor(Math.random() * 14);
    // Pick a date — use UTC noon so business-day math is stable
    const ref = new Date();
    ref.setUTCDate(ref.getUTCDate() - daysBack);
    ref.setUTCHours(12, 0, 0, 0);
    out.push({
      id: 'sample_' + i,
      timestamp: ref.toISOString(),
      orderRef: 'FX' + String(40000 + i).slice(-5),
      client: ['Acme Co','Wave Studios','North Co','Hatch','Forge','Bloom','Vault'][i % 7] + ' ' + (i+1),
      project: ['Logo','Brand identity','Rebrand','Wordmark','Monogram'][i % 5],
      industry: industries[i % industries.length],
      type: types[Math.random() > 0.45 ? 1 : 0],
      status: statuses[Math.floor(Math.random()*statuses.length)],
      csrId: csr.id,
      csrName: csr.name,
      shiftAtTime: csr.shift,        // shift IS the CSR's assigned shift
      profile,
      price: Math.floor(35 + Math.random() * 480),
      tip: Math.random() > 0.7 ? Math.floor(5 + Math.random()*40) : 0,
      source: 'sample',
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════
const safeGet = async (k) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const safeSet = async (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

// ═══════════════════════════════════════════════════════════════
// REUSABLE BITS
// ═══════════════════════════════════════════════════════════════
const Pill = ({ children, color, bg }) => (
  <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ color, background: bg || `${color}1F`, border: `1px solid ${color}30` }}>
    {children}
  </span>
);

const StatCard = ({ label, value, sub, accent, icon: Icon }) => (
  <div className="rounded-xl p-5 transition-all hover:translate-y-[-2px] hover:shadow-sm"
       style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: C.textDim }}>{label}</span>
      {Icon && (
        <div className="flex h-6 w-6 items-center justify-center rounded-md"
             style={{ background: `${accent}15` }}>
          <Icon size={12} style={{ color: accent }} strokeWidth={2.5}/>
        </div>
      )}
    </div>
    <div className="font-mono text-2xl font-semibold tracking-tight" style={{ color: C.text }}>
      {value}
    </div>
    {sub && <div className="mt-1 text-xs" style={{ color: C.textMuted }}>{sub}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// HASEEBMADEIT LOGO MARK
// Extracted from brand asset — 6 vertical bars in chart formation
// ═══════════════════════════════════════════════════════════════
const HMLogo = ({ size = 32, color = '#FFFFFF', bg = '#7229FF' }) => (
  <svg width={size} height={size} viewBox="0 0 392.35 392.35"
       xmlns="http://www.w3.org/2000/svg"
       style={{ borderRadius: size * 0.18, background: bg, display: 'block' }}>
    <path fill={color} d="M187.32,115.24h17.71c2.46,0,4.46,1.99,4.46,4.46v61.29c0,1.98-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-66.45c0-2.46,1.99-4.46,4.46-4.46ZM167.44,142.55v50.69c0,1.98-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-55.85c0-2.46,1.99-4.46,4.46-4.46h17.71c2.46,0,4.46,1.99,4.46,4.46ZM144.03,219.52l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v31.16c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46v-26c0-1.98,1.31-3.73,3.21-4.28ZM186.07,207.27l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v66.26c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46v-61.1c0-1.99,1.31-3.73,3.21-4.28ZM224.9,249.8v-50.5c0-1.98,1.31-3.73,3.21-4.28l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v55.66c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46ZM251.52,142.55v26.19c0,1.99-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-31.35c0-2.46,1.99-4.46,4.46-4.46h17.71c2.46,0,4.46,1.99,4.46,4.46h0Z"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// DATE RANGE PICKER — preset chips + branded calendar popover
// Used on Dashboard, Completions and Calculator so the date control
// looks identical everywhere. Operates purely on YYYY-MM-DD business-day
// strings to stay in lockstep with businessDay()/window_ (no tz drift).
// ═══════════════════════════════════════════════════════════════
const CAL_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const parseYmd = (s) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || ''));
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
};
const fmtChip = (s) => {          // "May 27" — compact, for the trigger button
  const p = parseYmd(s);
  return p ? `${CAL_MONTHS[p.m].slice(0, 3)} ${p.d}` : '—';
};
const fmtLong = (s) => {          // "May 27, 2026" — for the popover footer
  const p = parseYmd(s);
  return p ? `${CAL_MONTHS[p.m].slice(0, 3)} ${p.d}, ${p.y}` : '—';
};

function DateRangePicker({
  label, dateRange, setDateRange,
  customStart, customEnd, setCustomStart, setCustomEnd,
  windowStart, windowEnd,
}) {
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState(null); // first click of a range
  const [hoverDay, setHoverDay] = useState(null);
  const seed = parseYmd(customEnd) || parseYmd(todayBD()) || { y: 2026, m: 0 };
  const [view, setView] = useState({ y: seed.y, m: seed.m });
  const rootRef = useRef(null);

  // Jump the visible month to the active range whenever the popover opens.
  useEffect(() => {
    if (!open) return;
    const p = parseYmd(customStart) || parseYmd(todayBD());
    if (p) setView({ y: p.y, m: p.m });
    setPendingStart(null);
    setHoverDay(null);
  }, [open]);

  // Close on outside-click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const presets = [
    { v: 'today',     l: 'Today' },
    { v: 'yesterday', l: 'Yest.' },
    { v: '7d',        l: '7d' },
    { v: '30d',       l: '30d' },
  ];

  const chipStyle = (active) => ({
    background: active ? C.violet : 'transparent',
    color: active ? '#FFFFFF' : C.textMuted,
    border: `1px solid ${active ? C.violet : 'transparent'}`,
  });

  const pickPreset = (v) => { setDateRange(v); setOpen(false); };

  // Seed the custom range from the currently-visible window so switching to
  // Custom keeps showing the same dates instead of snapping to today.
  const openCustom = () => {
    if (dateRange !== 'custom') {
      if (windowStart) setCustomStart(windowStart);
      if (windowEnd) setCustomEnd(windowEnd);
      setDateRange('custom');
      setOpen(true);
    } else {
      setOpen((o) => !o);
    }
  };

  const pickDay = (d) => {
    const cur = ymd(view.y, view.m, d);
    setDateRange('custom');
    if (!pendingStart) {
      setPendingStart(cur);
      setCustomStart(cur);
      setCustomEnd(cur);
    } else {
      const [s, e] = pendingStart <= cur ? [pendingStart, cur] : [cur, pendingStart];
      setCustomStart(s);
      setCustomEnd(e);
      setPendingStart(null);
    }
  };

  const shiftMonth = (delta) => setView((v) => {
    let m = v.m + delta, y = v.y;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    return { y, m };
  });

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const numDays = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);

  const today = todayBD();
  const isCustom = dateRange === 'custom';

  return (
    <div ref={rootRef} className="relative flex items-center gap-1 flex-wrap">
      {label && (
        <div className="flex items-center gap-1 px-2" style={{ color: C.textMuted }}>
          <Calendar size={12} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        </div>
      )}

      {presets.map((p) => (
        <button key={p.v} type="button" onClick={() => pickPreset(p.v)}
                className="rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
                style={chipStyle(dateRange === p.v)}>
          {p.l}
        </button>
      ))}

      <button type="button" onClick={openCustom}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
              style={chipStyle(isCustom)}>
        <Calendar size={12} strokeWidth={2.5} />
        {isCustom ? `${fmtChip(customStart)} – ${fmtChip(customEnd)}` : 'Custom'}
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 rounded-xl p-3"
             style={{
               background: C.bgCard,
               border: `1px solid ${C.borderHi}`,
               boxShadow: '0 14px 44px rgba(22,10,51,0.18)',
               width: 272,
             }}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month"
                    className="rounded-md p-1 transition-colors hover:bg-black/5" style={{ color: C.textMuted }}>
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs font-bold" style={{ color: C.text }}>
              {CAL_MONTHS[view.m]} {view.y}
            </div>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month"
                    className="rounded-md p-1 transition-colors hover:bg-black/5" style={{ color: C.textMuted }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {CAL_WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[9px] font-semibold uppercase" style={{ color: C.textDim }}>
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5" onMouseLeave={() => setHoverDay(null)}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const cur = ymd(view.y, view.m, d);
              // While mid-selection, preview the range as pendingStart → hovered day.
              let lo = customStart, hi = customEnd;
              if (pendingStart) {
                const h = hoverDay ? ymd(view.y, view.m, hoverDay) : pendingStart;
                [lo, hi] = pendingStart <= h ? [pendingStart, h] : [h, pendingStart];
              }
              const inRange = lo && hi && cur >= lo && cur <= hi;
              const isEdge = cur === lo || cur === hi;
              const isToday = cur === today;
              return (
                <button key={i} type="button"
                        onClick={() => pickDay(d)}
                        onMouseEnter={() => setHoverDay(d)}
                        className="h-8 rounded-md text-xs transition-colors"
                        style={{
                          background: isEdge ? C.violet : inRange ? C.violetBg : 'transparent',
                          color: isEdge ? '#FFFFFF' : inRange ? C.violetDim : C.text,
                          fontWeight: isEdge ? 700 : inRange ? 600 : 400,
                          border: `1px solid ${isToday && !isEdge ? C.borderHi : 'transparent'}`,
                        }}>
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: C.border }}>
            <span className="text-[10px]" style={{ color: C.textMuted }}>
              {fmtLong(customStart)} → {fmtLong(customEnd)}
            </span>
            <button type="button" onClick={() => setOpen(false)}
                    className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all hover:opacity-90"
                    style={{ background: C.violet, color: '#FFFFFF' }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CSRPulse({ onLogout }) {
  const [loaded, setLoaded] = useState(false);
  const [orders, setOrders] = useState([]);
  const [conversion, setConversion] = useState([]); // 'Profile Conversion' tab (profile-grain, from Inquiry sheet)
  const [production, setProduction] = useState([]);  // 'CSR Production' tab (CSR×Profile, from ClickUp)
  const [designerProd, setDesignerProd] = useState([]); // 'Designer Production' tab (LIVE from ClickUp, no retrofit)
  const [roster, setRoster] = useState(DEFAULT_ROSTER);
  const [profiles, setProfiles] = useState(DEFAULT_PROFILES);
  const [shiftHistory, setShiftHistory] = useState([]); // [{csrId, fromShift, toShift, changedOn}]

  // Filters
  const [dateRange, setDateRange] = useState('7d');
  const [customStart, setCustomStart] = useState(todayBD());
  const [customEnd, setCustomEnd] = useState(todayBD());
  const [fCSR, setFCSR] = useState('all');
  const [fShift, setFShift] = useState('all');
  const [fProfile, setFProfile] = useState('all');
  const [fType, setFType] = useState('all');

  // UI
  const [tab, setTab] = useState('dashboard'); // dashboard | completions | log | roster | calculator | import

  // ── Calculator inputs — all-time profit/loss roll-up. Manual cells the
  // user maintains by hand (VVRO + Ads per profile, plus aggregate
  // Expenses and partner profit split). Persisted to localStorage.
  const [calcInputs, setCalcInputs] = useState({
    vvroCost: {},        // { [profile]: string } — raw as typed, parsed at calc time
    ads: {},             // { [profile]: string }
    expenses: '',        // raw string
    b2b: [],             // [{ id, name, amount }] — direct payments, no Fiverr/VVRO/ads
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [searchOrder, setSearchOrder] = useState('');
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: '', shift: 'Morning', role: 'CSR' });
  const [tick, setTick] = useState(0);
  const [exportData, setExportData] = useState(null); // { csv, filename } | null
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState(false);
  const [calcClearArmed, setCalcClearArmed] = useState(false); // Calculator "Clear" button — needs a 2nd click to confirm
  const fileRef = useRef(null);
  const didAutoSync = useRef(false); // shared-sheets auto-sync runs once per load

  // ── Data source config (flexible — type can become 'supabase' / 'apps-script' later)
  const [syncConfig, setSyncConfig] = useState({
    type: 'gsheet',          // 'gsheet' | (future) 'supabase' | 'apps-script'
    workbookUrls: [...SHARED_SYNC.workbookUrls],  // pre-filled from the shared source
    firstTabs: [...SHARED_SYNC.firstTabs],        // left-most tab of each workbook
  });
  const [lastSync, setLastSync] = useState(null); // { at, ok, message }
  const [syncing, setSyncing] = useState(false);

  // Refresh the date window every 30 seconds so "today" stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // ── Load
  useEffect(() => {
    (async () => {
      const [o, r, p, h, sc, ls, ci] = await Promise.all([
        safeGet('csrp5-orders'),
        safeGet('csrp5-roster'),
        safeGet('csrp5-profiles'),
        safeGet('csrp5-shifthist'),
        safeGet('csrp5-syncconfig'),
        safeGet('csrp5-lastsync'),
        safeGet('csrp5-calcinputs'),
      ]);
      const rosterToUse = r || DEFAULT_ROSTER;
      const profilesToUse = p || DEFAULT_PROFILES;
      setRoster(rosterToUse);
      setProfiles(profilesToUse);
      setShiftHistory(h || []);
      // With a shared sheet baked in, fresh visitors start empty and auto-sync
      // fills the data — never show the fake sample numbers in that case.
      setOrders(o || (HAS_SHARED_SYNC ? [] : genSampleOrders(rosterToUse, profilesToUse)));
      if (sc) setSyncConfig(sc);
      if (ls) setLastSync(ls);
      if (ci) setCalcInputs({ vvroCost: {}, ads: {}, expenses: '', b2b: [], ...ci });
      setLoaded(true);
    })();
  }, []);

  // ── Save
  useEffect(() => { if (loaded) safeSet('csrp5-orders', orders); }, [orders, loaded]);
  useEffect(() => { if (loaded) safeSet('csrp5-roster', roster); }, [roster, loaded]);
  useEffect(() => { if (loaded) safeSet('csrp5-profiles', profiles); }, [profiles, loaded]);
  useEffect(() => { if (loaded) safeSet('csrp5-shifthist', shiftHistory); }, [shiftHistory, loaded]);
  useEffect(() => { if (loaded) safeSet('csrp5-syncconfig', syncConfig); }, [syncConfig, loaded]);
  useEffect(() => { if (loaded) safeSet('csrp5-lastsync', lastSync); }, [lastSync, loaded]);
  useEffect(() => { if (loaded) safeSet('csrp5-calcinputs', calcInputs); }, [calcInputs, loaded]);

  // Auto-pull the shared Google Sheets once on load so every visitor sees the
  // same numbers without a manual import.
  useEffect(() => {
    if (!loaded || !HAS_SHARED_SYNC || didAutoSync.current) return;
    didAutoSync.current = true;
    autoSyncFromGSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ── Date window — recomputes when tick fires (every 30s) so "today" stays fresh
  const window_ = useMemo(() => {
    const t = todayBD();
    if (dateRange === 'today') return { start: t, end: t, label: `Today (${t})` };
    if (dateRange === 'yesterday') {
      const y = new Date(); y.setUTCDate(y.getUTCDate()-1);
      const ys = businessDay(y);
      return { start: ys, end: ys, label: `Yesterday (${ys})` };
    }
    if (dateRange === '7d') {
      const s = new Date(); s.setUTCDate(s.getUTCDate()-6);
      return { start: businessDay(s), end: t, label: 'Last 7 days' };
    }
    if (dateRange === '30d') {
      const s = new Date(); s.setUTCDate(s.getUTCDate()-29);
      return { start: businessDay(s), end: t, label: 'Last 30 days' };
    }
    return { start: customStart, end: customEnd, label: `${customStart} → ${customEnd}` };
  }, [dateRange, customStart, customEnd, tick]);

  // ── Filtered
  const filtered = useMemo(() => orders.filter(o => {
    const bd = businessDay(o.timestamp);
    if (bd < window_.start || bd > window_.end) return false;
    if (fCSR !== 'all' && o.csrId !== fCSR) return false;
    if (fShift !== 'all' && o.shiftAtTime !== fShift) return false;
    if (fProfile !== 'all' && o.profile !== fProfile) return false;
    if (fType !== 'all' && o.type !== fType) return false;
    return true;
  }), [orders, window_, fCSR, fShift, fProfile, fType]);

  // ── KPIs
  const kpis = useMemo(() => {
    const total = filtered.reduce((s, o) => s + (o.price || 0), 0);
    const tips = filtered.reduce((s, o) => s + (o.tip || 0), 0);
    const vvro = filtered.filter(o => o.type === 'VVRO').length;
    const orgn = filtered.filter(o => o.type === 'ORGANIC').length;
    const count = filtered.length;
    const aov = count ? total / count : 0;
    const vvroRev = filtered.filter(o => o.type === 'VVRO').reduce((s,o)=>s+(o.price||0),0);
    const orgnRev = filtered.filter(o => o.type === 'ORGANIC').reduce((s,o)=>s+(o.price||0),0);
    const vvroMix = total ? (vvroRev/total)*100 : 0;
    return { total, tips, count, aov, vvro, orgn, vvroRev, orgnRev, vvroMix };
  }, [filtered]);

  // ── Completions — orders with Status = Completed, filtered by completion date
  // Status match is .includes('completed') so values like "Completed ✓" or
  // "Order Completed" still count.
  const isCompletedStatus = (s) => String(s || '').toLowerCase().includes('completed');
  const completed = useMemo(() => {
    return orders.filter(o => {
      if (!isCompletedStatus(o.status)) return false;
      if (!o.completionDate) return false;
      const bd = businessDay(o.completionDate);
      if (bd < window_.start || bd > window_.end) return false;
      if (fCSR !== 'all' && o.csrId !== fCSR) return false;
      if (fShift !== 'all' && o.shiftAtTime !== fShift) return false;
      if (fProfile !== 'all' && o.profile !== fProfile) return false;
      if (fType !== 'all' && o.type !== fType) return false;
      return true;
    });
  }, [orders, window_, fCSR, fShift, fProfile, fType]);

  const completionKpis = useMemo(() => {
    // "closing" is order revenue + tips combined — that's what surfaces on
    // the main Completed revenue card. We still keep the order-only revenue
    // around (as `revenue`) and tips separately so the sub can call them out.
    const revenue = completed.reduce((s, o) => s + (o.price || 0), 0);
    const tips = completed.reduce((s, o) => s + (o.tip || 0), 0);
    const total = revenue + tips;
    const count = completed.length;
    const vvro = completed.filter(o => o.type === 'VVRO').length;
    const orgn = completed.filter(o => o.type === 'ORGANIC').length;
    const vvroRev = completed.filter(o => o.type === 'VVRO').reduce((s,o)=>s+(o.price||0)+(o.tip||0),0);
    const orgnRev = completed.filter(o => o.type === 'ORGANIC').reduce((s,o)=>s+(o.price||0)+(o.tip||0),0);
    const vvroMix = total ? (vvroRev/total)*100 : 0;
    const aov = count ? revenue / count : 0;
    return { total, revenue, tips, count, vvro, orgn, vvroRev, orgnRev, vvroMix, aov };
  }, [completed]);

  const completionShifts = useMemo(() => ['Morning','Evening','Night'].map(sh => {
    const sub = completed.filter(o => o.shiftAtTime === sh);
    return {
      name: sh,
      count: sub.length,
      revenue: sub.reduce((s,o)=>s+(o.price||0)+(o.tip||0),0),
      tips: sub.reduce((s,o)=>s+(o.tip||0),0),
      vvro: sub.filter(o => o.type === 'VVRO').length,
      orgn: sub.filter(o => o.type === 'ORGANIC').length,
    };
  }), [completed]);

  const completionByCSR = useMemo(() => {
    const map = new Map();
    completed.forEach(o => {
      const key = o.csrId;
      if (!map.has(key)) {
        const r = roster.find(x => x.id === key);
        map.set(key, { id: key, name: r?.name || o.csrName || '—', shift: r?.shift || o.shiftAtTime, count: 0, revenue: 0, vvro: 0, orgn: 0 });
      }
      const e = map.get(key);
      e.count += 1;
      e.revenue += (o.price || 0) + (o.tip || 0);
      if (o.type === 'VVRO') e.vvro += 1;
      if (o.type === 'ORGANIC') e.orgn += 1;
    });
    return Array.from(map.values()).sort((a,b) => b.count - a.count);
  }, [completed, roster]);

  // Union of canonical profiles and profile values actually seen in
  // the data. Sheet names in imported workbooks don't always match the
  // canonical list (e.g. "Storm" vs "Storm Design"), so iterating just
  // the canonical list would leave every breakdown empty.
  const effectiveProfiles = useMemo(() => {
    const set = new Set(profiles);
    orders.forEach(o => { if (o.profile) set.add(o.profile); });
    return Array.from(set);
  }, [profiles, orders]);

  // ── Calculator — profit/loss per profile across the active date window.
  // Mirrors the Completions tab's revenue rule: only orders whose status
  // is Completed and whose completion date lands in the window count,
  // and the gross is price + tips (what the card was actually charged —
  // Fiverr's 20% comes off that total). Manual fields (VVRO / Ads /
  // Expenses) come from calcInputs and are not date-scoped.
  //   CC After 20% Fiverr = CC Without × 0.80
  //   Remaining (after VVRO) = CC After - VVRO
  //   Remaining (after Ads)  = above - Ads
  //   Individual Net Revenue = above - 49  (Seller Plus, fixed)
  //   Profile Net Revenue = sum of Individual Net Revenue across profiles
  //   Overall Income      = Profile Net Revenue - Expenses
  const FIVERR_KEEP_RATE = 0.80;
  const SELLER_PLUS = 49;
  const calculator = useMemo(() => {
    const totals = new Map();
    orders.forEach(o => {
      if (!o.profile) return;
      if (!isCompletedStatus(o.status)) return;
      if (!o.completionDate) return;
      const bd = businessDay(o.completionDate);
      if (bd < window_.start || bd > window_.end) return;
      const gross = (o.price || 0) + (o.tip || 0);
      totals.set(o.profile, (totals.get(o.profile) || 0) + gross);
    });
    const rows = effectiveProfiles
      .map(profile => {
        const ccGross = totals.get(profile) || 0;
        const ccAfter = ccGross * FIVERR_KEEP_RATE;
        const vvro = parseMoneyInput(calcInputs.vvroCost[profile]);
        const remAfterVvro = ccAfter - vvro;
        const ads = parseMoneyInput(calcInputs.ads[profile]);
        const remAfterAds = remAfterVvro - ads;
        const netRevenue = remAfterAds - SELLER_PLUS;
        return {
          profile, ccGross, ccAfter, vvro, remAfterVvro,
          ads, remAfterAds, sellerPlus: SELLER_PLUS, netRevenue,
        };
      })
      .sort((a, b) => b.ccGross - a.ccGross);
    const profileNetRevenue = rows.reduce((s, r) => s + r.netRevenue, 0);
    const expenses = parseMoneyInput(calcInputs.expenses);
    const b2bList = Array.isArray(calcInputs.b2b) ? calcInputs.b2b : [];
    const b2bTotal = b2bList.reduce((s, e) => s + parseMoneyInput(e.amount), 0);
    const overallIncome = profileNetRevenue + b2bTotal - expenses;
    return { rows, profileNetRevenue, expenses, b2bTotal, overallIncome };
  }, [orders, effectiveProfiles, calcInputs, window_]);

  const completionByProfile = useMemo(() => {
    return effectiveProfiles.map(p => {
      const sub = completed.filter(o => o.profile === p);
      return {
        profile: p,
        count: sub.length,
        revenue: sub.reduce((s,o)=>s+(o.price||0)+(o.tip||0),0),
        vvro: sub.filter(o => o.type === 'VVRO').length,
        orgn: sub.filter(o => o.type === 'ORGANIC').length,
      };
    }).sort((a,b) => b.count - a.count);
  }, [completed, effectiveProfiles]);

  // ── Cancellations — orders with Status containing "cancel".
  // Cancellations usually don't have a DOC, so we filter by ORDER date
  // (the date the order was placed) using the same date-range window.
  const isCancelledStatus = (s) => /cancel/i.test(String(s || ''));
  const cancelled = useMemo(() => {
    return orders.filter(o => {
      if (!isCancelledStatus(o.status)) return false;
      const bd = businessDay(o.timestamp);
      if (bd < window_.start || bd > window_.end) return false;
      if (fCSR !== 'all' && o.csrId !== fCSR) return false;
      if (fShift !== 'all' && o.shiftAtTime !== fShift) return false;
      if (fProfile !== 'all' && o.profile !== fProfile) return false;
      if (fType !== 'all' && o.type !== fType) return false;
      return true;
    });
  }, [orders, window_, fCSR, fShift, fProfile, fType]);

  const cancelledKpis = useMemo(() => {
    const lostValue = cancelled.reduce((s, o) => s + (o.price || 0), 0);
    const count = cancelled.length;
    const vvro = cancelled.filter(o => o.type === 'VVRO').length;
    const orgn = cancelled.filter(o => o.type === 'ORGANIC').length;
    const vvroVal = cancelled.filter(o => o.type === 'VVRO').reduce((s,o)=>s+(o.price||0),0);
    const orgnVal = cancelled.filter(o => o.type === 'ORGANIC').reduce((s,o)=>s+(o.price||0),0);
    return { lostValue, count, vvro, orgn, vvroVal, orgnVal };
  }, [cancelled]);

  const cancelledShifts = useMemo(() => ['Morning','Evening','Night'].map(sh => {
    const sub = cancelled.filter(o => o.shiftAtTime === sh);
    return {
      name: sh,
      count: sub.length,
      lostValue: sub.reduce((s,o)=>s+(o.price||0),0),
      vvro: sub.filter(o => o.type === 'VVRO').length,
      orgn: sub.filter(o => o.type === 'ORGANIC').length,
    };
  }), [cancelled]);

  const cancelledByCSR = useMemo(() => {
    const map = new Map();
    cancelled.forEach(o => {
      const key = o.csrId;
      if (!map.has(key)) {
        const r = roster.find(x => x.id === key);
        map.set(key, { id: key, name: r?.name || o.csrName || '—', shift: r?.shift || o.shiftAtTime, count: 0, lostValue: 0 });
      }
      const e = map.get(key);
      e.count += 1;
      e.lostValue += (o.price || 0);
    });
    return Array.from(map.values()).sort((a,b) => b.count - a.count);
  }, [cancelled, roster]);

  const cancelledByProfile = useMemo(() => {
    return effectiveProfiles.map(p => {
      const sub = cancelled.filter(o => o.profile === p);
      return {
        profile: p,
        count: sub.length,
        lostValue: sub.reduce((s,o)=>s+(o.price||0),0),
      };
    }).sort((a,b) => b.count - a.count);
  }, [cancelled, effectiveProfiles]);

  // ── Data quality — orders that imported with soft advisories (blank or
  // unknown CSR). Independent of date window — the user wants the full
  // list of rows to fix in the source sheet — but honors entity filters
  // so they can drill into a specific profile / type.
  const dataIssues = useMemo(() => {
    return orders.filter(o => {
      if (!o.advisories || o.advisories.length === 0) return false;
      if (fCSR !== 'all' && o.csrId !== fCSR) return false;
      if (fShift !== 'all' && o.shiftAtTime !== fShift) return false;
      if (fProfile !== 'all' && o.profile !== fProfile) return false;
      if (fType !== 'all' && o.type !== fType) return false;
      return true;
    }).sort((a, b) => {
      if (a.profile !== b.profile) return String(a.profile).localeCompare(String(b.profile));
      return (a.sheetRow || 0) - (b.sheetRow || 0);
    });
  }, [orders, fCSR, fShift, fProfile, fType]);

  const dataIssueSummary = useMemo(() => {
    const noCsr = dataIssues.filter(o => o.advisories.includes('no_csr')).length;
    const unknownCsr = dataIssues.filter(o => o.advisories.includes('unknown_csr')).length;
    return { total: dataIssues.length, noCsr, unknownCsr };
  }, [dataIssues]);

  // ── Leaderboard
  const leaderboard = useMemo(() => {
    const map = new Map();
    filtered.forEach(o => {
      if (!map.has(o.csrId)) {
        const r = roster.find(x => x.id === o.csrId);
        map.set(o.csrId, {
          id: o.csrId, name: o.csrName || r?.name || '—',
          shift: r?.shift || o.shiftAtTime, role: r?.role || 'CSR',
          revenue: 0, count: 0, vvroCount: 0, tips: 0,
        });
      }
      const e = map.get(o.csrId);
      e.revenue += (o.price || 0);
      e.count += 1;
      e.tips += (o.tip || 0);
      if (o.type === 'VVRO') e.vvroCount += 1;
    });
    return Array.from(map.values())
      .map(e => ({ ...e, aov: e.count ? e.revenue/e.count : 0, vvroMix: e.count ? (e.vvroCount/e.count)*100 : 0 }))
      .sort((a,b) => b.revenue - a.revenue);
  }, [filtered, roster]);

  // ── Shift breakdown
  const shiftBreak = useMemo(() => {
    const out = { Morning:0, Evening:0, Night:0 };
    filtered.forEach(o => { out[o.shiftAtTime] = (out[o.shiftAtTime]||0) + (o.price||0); });
    return out;
  }, [filtered]);

  // ── Profile breakdown — includes ALL profiles, even with zero orders
  const profileBreak = useMemo(() => {
    const map = new Map();
    profiles.forEach(p => map.set(p, { profile: p, revenue: 0, count: 0 }));
    filtered.forEach(o => {
      if (!map.has(o.profile)) map.set(o.profile, { profile: o.profile, revenue: 0, count: 0 });
      const e = map.get(o.profile);
      e.revenue += (o.price || 0);
      e.count += 1;
    });
    return Array.from(map.values()).sort((a,b)=>b.revenue-a.revenue);
  }, [filtered, profiles]);

  // ─────────────────────────────────────────────────────────────
  // ROW NORMALIZATION
  // Standardized headers (all 10 tabs use these exact names):
  //   Date of Order | Client Name | Project name | Indsutry | Order Type |
  //   Status | Logo Designer | Branding Designer | CSR | Order Amount |
  //   Tip | Notes | DOC | Earnings | Ratings
  //
  // We USE: Date of Order, Order Type, Status, CSR, Order Amount, Tip
  // We OPTIONALLY USE: Client Name, Project name, Indsutry
  // We IGNORE: Logo Designer, Branding Designer, Notes, DOC, Earnings, Ratings
  // ─────────────────────────────────────────────────────────────
  // A row counts as "blank reserved" when none of the meaningful business
  // fields carry any content. Google Sheets keeps thousands of empty rows
  // at the bottom of each tab for future entries; without this guard they
  // each get logged as a "Missing date" issue, drowning the real ones.
  // We require at least one of the core fields to have content — stray
  // formatting or dropdown placeholders in unrelated columns aren't
  // enough to count the row as a real entry.
  const looksEmpty = (row) => {
    if (!row) return true;
    const k = {};
    Object.keys(row).forEach(key => {
      const cleanKey = String(key).toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
      k[cleanKey] = row[key];
    });
    const hasVal = (...keys) => keys.some(key => {
      const v = k[key];
      return v !== null && v !== undefined && String(v).trim() !== '';
    });
    return !(
      hasVal('date_of_order', 'order_date', 'date', 'date_placed', 'placed_on', 'order_dt') ||
      hasVal('order_type', 'type') ||
      hasVal('status') ||
      hasVal('order_amount', 'amount', 'price', 'order_total', 'total', 'order_value') ||
      hasVal('project_name', 'project') ||
      hasVal('client_name', 'username') ||
      hasVal('csr', 'csr_name', 'agent', 'rep', 'sales_rep', 'handled_by', 'assigned_to') ||
      hasVal('doc')
    );
  };

  const normalizeRow = (row, profile, idx, rowOffset = 2) => {
    // Normalize keys: lowercase, underscores, no extra space
    const k = {};
    Object.keys(row).forEach(key => {
      const cleanKey = String(key).toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
      k[cleanKey] = row[key];
    });

    // ── Date — "Date of Order" / "Order Date" / "Date". As a last resort,
    // any header that contains "date" but isn't a DOC / completion / due date.
    let dateRaw = k.date_of_order || k.order_date || k.date || k.date_placed || k.placed_on || k.order_dt;
    if (!dateRaw) {
      const dateKey = Object.keys(k).find(key =>
        /date|dt/.test(key) && !/doc|complet|due|deliver|target/.test(key)
      );
      if (dateKey) dateRaw = k[dateKey];
    }
    const date = parseFlexibleDate(dateRaw);

    // ── CSR — optional. Blank cells used to drop the row entirely,
    // which made revenue totals undercount when the sheet was sparse on
    // CSR assignment. Now we keep the order and bucket it under a
    // synthetic "Unassigned" CSR so totals match the spreadsheet, and
    // unknown names land under their literal value so they're surfaced
    // on the leaderboard for the user to reconcile.
    let csrRaw = k.csr || k.csr_name || k.agent || k.rep || k.sales_rep || k.handled_by || k.assigned_to;
    if (!csrRaw) {
      const csrKey = Object.keys(k).find(key => /^csr|agent|rep/.test(key));
      if (csrKey) csrRaw = k[csrKey];
    }
    const csrName = csrRaw ? stripEmoji(String(csrRaw).trim()) : '';
    const csrMatch = csrName ? matchCSR(csrName, roster) : null;
    const csr = csrMatch || {
      id: csrName ? `_unknown_${csrName.toLowerCase()}` : '_unassigned',
      name: csrName || 'Unassigned',
      shift: null,
    };

    // ── Order Type — VVRO / ORGANIC (case-insensitive)
    let typeRaw = String(k.order_type || k.type || k.category || '').toUpperCase().trim();
    if (!typeRaw) {
      const typeKey = Object.keys(k).find(key => /type|category|kind/.test(key));
      if (typeKey) typeRaw = String(k[typeKey] || '').toUpperCase().trim();
    }
    const type = typeRaw.includes('VVRO') ? 'VVRO' : typeRaw.includes('ORGANIC') ? 'ORGANIC' : '—';

    // ── Status
    let status = k.status || k.order_status || k.state;
    if (!status) {
      const statusKey = Object.keys(k).find(key => /status|state/.test(key));
      if (statusKey) status = k[statusKey];
    }
    status = status || '—';

    // ── Date of Completion (DOC column). Optional — only present when the
    // order was closed. We capture it so the Completions view can filter by
    // when the close happened. Falls back to any header whose normalised
    // name contains "doc" or "complet" so we tolerate header variations.
    let docRaw = k.doc || k.date_of_completion || k.completion_date || k.completed_on || k.date_completed;
    if (!docRaw) {
      const docKey = Object.keys(k).find(key => /doc|complet/.test(key));
      if (docKey) docRaw = k[docKey];
    }
    const completionDateParsed = docRaw ? parseFlexibleDate(docRaw) : null;
    const completionDate = completionDateParsed ? completionDateParsed.toISOString() : null;

    // ── Price — "Order Amount" / "Amount" / "Price" / "Total".
    // Last-resort fallback: any header containing amount/price/total/value
    // that's not the tip column.
    let priceRaw = k.order_amount || k.amount || k.price || k.order_total || k.total || k.order_value || k.value || k.cost;
    if (!priceRaw) {
      const priceKey = Object.keys(k).find(key =>
        /amount|price|total|value|cost/.test(key) && !/tip/.test(key)
      );
      if (priceKey) priceRaw = k[priceKey];
    }
    const price = parseFloat(String(priceRaw || '').replace(/[$,]/g,'')) || 0;

    // ── Tip — accept Tip, TIP, TIPS variants
    const tipRaw = k.tip || k.tips || '';
    const tip = parseFloat(String(tipRaw).replace(/[$,]/g,'')) || 0;

    // ── Optional context fields
    const client  = k.client_name || k.username || '—';
    const project = k.project_name || k.project || '—';
    const industry= k.indsutry || k.industry || '—';

    // ── Validate mandatory fields. CSR is no longer required: blank CSR
    // rows now flow through under the synthetic "Unassigned" bucket built
    // above, so revenue totals match the source spreadsheet.
    if (!dateRaw)     return { error: 'Missing date', skipReason: 'no_date' };
    if (!date)        return { error: `Invalid date "${dateRaw}"`, skipReason: 'bad_date' };
    // Reject impossible dates and pre-cutoff data
    const year = date.getUTCFullYear();
    if (year < 2023 || year > 2030) return { error: `Date out of range (${year})`, skipReason: 'bad_year' };
    const isoDate = date.toISOString().slice(0,10);
    // Pre-cutoff applies only when BOTH order date and completion date are
    // before the analytics window. Orders placed before the cutoff but
    // completed after still belong in the Completions view — dropping them
    // during import was undercounting every profile (e.g. Storm Design /
    // May 2026 lost 47 Completed rows that were ordered in Mar/Apr 2026).
    const completionIso = completionDate ? completionDate.slice(0, 10) : null;
    const latestIso = completionIso && completionIso > isoDate ? completionIso : isoDate;
    if (latestIso < DATA_START_DATE) return { error: `Before cutoff (order ${isoDate}${completionIso ? `, DOC ${completionIso}` : ''})`, skipReason: 'pre_cutoff' };
    if (type === '—') return { error: `Missing/invalid Order Type "${typeRaw}"`, skipReason: 'no_type' };
    if (!price)       return { error: 'Missing/zero Price', skipReason: 'no_price' };

    // Soft advisories — the row IS included, but we surface it on the
    // Completions "Data quality" panel so the user can open the source
    // sheet, jump to that row, and fix the missing/unknown field.
    const advisories = [];
    if (!csrName) advisories.push('no_csr');
    else if (!csrMatch) advisories.push('unknown_csr');

    const sheetRow = idx + rowOffset;

    return {
      order: {
        id: `imp_${profile}_${idx}_${date.getTime()}`,
        timestamp: date.toISOString(),
        orderRef: `${profile}-${sheetRow}`,
        client, project, industry,
        type, status,
        csrId: csr.id,
        csrName: csr.name,
        csrRaw: csrName || null,
        shiftAtTime: csr.shift,
        profile,
        price, tip,
        completionDate,
        sheetRow,
        advisories,
        source: 'import',
      }
    };
  };

  // ─────────────────────────────────────────────────────────────
  // XLSX IMPORT — multiple workbooks supported, every sheet = one profile tab
  // Auto-detects header row position (handles Grid Designs case where row 1
  // contains a banner like "VANTABLACK" and headers are on row 2)
  // ─────────────────────────────────────────────────────────────
  const handleXLSX = async (files) => {
    const allRows = [];
    const issues = [];
    const tabsRead = [];
    const unknownCSRs = new Map();
    const skipReasonCounts = {};

    for (const file of files) {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });

        wb.SheetNames.forEach(sheetName => {
          const sheet = wb.Sheets[sheetName];
          if (!sheet) return;

          // Try row 1 as header (default)
          let json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
          // Excel row that holds idx 0 of `json`. Header on row 1 → idx 0 = row 2.
          let rowOffset = 2;

          // Detect if row 1 was a banner (no recognized columns)
          // If the FIRST row doesn't contain "Date of Order" anywhere, try row 2 as header
          const headerLooksValid = json.length > 0 && Object.keys(json[0]).some(k =>
            /date.*order|order.*date/i.test(k)
          );

          if (!headerLooksValid) {
            // Try reading with row 2 as header (skip row 1)
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
            if (range.e.r >= 1) {
              json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, range: 1 });
              rowOffset = 3; // banner row 1 + header row 2 + idx 0 = row 3
            }
          }

          if (json.length === 0) return;

          const profileMatch = profiles.find(p => p.toLowerCase() === sheetName.toLowerCase());
          const targetProfile = profileMatch || sheetName;
          const isProfileTab = !!profileMatch;

          tabsRead.push({
            name: sheetName,
            rows: json.length,
            matched: isProfileTab,
            file: file.name,
          });

          if (!isProfileTab) return;

          json.forEach((row, idx) => {
            if (looksEmpty(row)) return;
            const result = normalizeRow(row, targetProfile, idx, rowOffset);
            if (result.error) {
              const reason = result.skipReason || 'other';
              // Silent filters — no counter, no log entry, nothing.
              // - pre_cutoff: row is before DATA_START_DATE (out of scope)
              // - no_date  : row has content but no Date of Order; per the
              //              user the row is incomplete and not worth flagging
              if (reason === 'pre_cutoff' || reason === 'no_date') return;
              skipReasonCounts[reason] = (skipReasonCounts[reason] || 0) + 1;
              issues.push({
                profile: sheetName,
                row: idx + rowOffset,
                reason: result.error,
                skipReason: reason,
                file: file.name,
              });
            } else {
              allRows.push(result.order);
            }
          });
        });
      } catch (e) {
        issues.push({ profile: '—', row: 0, reason: `Couldn't read ${file.name}: ${e.message}`, file: file.name });
      }
    }

    // Roll soft advisories from imported rows into the unified error log
    // so the user sees one complete list of "things to fix" at the end of
    // import — including rows that flowed through under Unassigned.
    allRows.forEach(o => {
      if (!o.advisories || o.advisories.length === 0) return;
      const reason = o.advisories.includes('no_csr')
        ? 'Missing CSR'
        : `Unknown CSR "${o.csrRaw || ''}"`;
      issues.push({
        profile: o.profile,
        row: o.sheetRow,
        reason,
        skipReason: o.advisories[0],
        included: true,
        file: o.profile,
      });
      if (o.advisories.includes('unknown_csr') && o.csrRaw) {
        const key = o.csrRaw.toLowerCase();
        unknownCSRs.set(key, (unknownCSRs.get(key) || 0) + 1);
      }
    });

    issues.sort((a, b) => {
      const pa = String(a.profile || '');
      const pb = String(b.profile || '');
      if (pa !== pb) return pa.localeCompare(pb);
      return (a.row || 0) - (b.row || 0);
    });

    setImportPreview({
      rows: allRows,
      issues,
      tabsRead,
      unknownCSRs: Array.from(unknownCSRs.entries()).sort((a,b) => b[1] - a[1]),
      skipReasonCounts,
      source: 'xlsx',
      fileName: files.length === 1 ? files[0].name : `${files.length} files`,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // CSV IMPORT — multiple files, filename = profile name
  // ─────────────────────────────────────────────────────────────
  const handleCSVs = (files) => {
    const promises = Array.from(files).map(file => new Promise((res) => {
      const profileName = file.name.replace(/\.csv$/i, '').trim();
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => res({ profile: profileName, rows: results.data, file: file.name }),
      });
    }));
    Promise.all(promises).then(parsed => {
      const allRows = [];
      const issues = [];
      const tabsRead = [];
      const unknownCSRs = new Map();
      parsed.forEach(({ profile, rows, file }) => {
        const matched = profiles.some(p => p.toLowerCase() === profile.toLowerCase());
        tabsRead.push({ name: profile, rows: rows.length, matched, file });
        rows.forEach((row, idx) => {
          if (looksEmpty(row)) return;
          const result = normalizeRow(row, profile, idx);
          if (result.error) {
            const reason = result.skipReason;
            if (reason === 'pre_cutoff' || reason === 'no_date') return;
            issues.push({
              profile, row: idx+2, reason: result.error,
              skipReason: reason, file,
            });
          } else {
            allRows.push(result.order);
          }
        });
      });

      allRows.forEach(o => {
        if (!o.advisories || o.advisories.length === 0) return;
        const reason = o.advisories.includes('no_csr')
          ? 'Missing CSR'
          : `Unknown CSR "${o.csrRaw || ''}"`;
        issues.push({
          profile: o.profile,
          row: o.sheetRow,
          reason,
          skipReason: o.advisories[0],
          included: true,
          file: o.profile,
        });
        if (o.advisories.includes('unknown_csr') && o.csrRaw) {
          const key = o.csrRaw.toLowerCase();
          unknownCSRs.set(key, (unknownCSRs.get(key) || 0) + 1);
        }
      });

      issues.sort((a, b) => {
        const pa = String(a.profile || '');
        const pb = String(b.profile || '');
        if (pa !== pb) return pa.localeCompare(pb);
        return (a.row || 0) - (b.row || 0);
      });

      setImportPreview({
        rows: allRows, issues, tabsRead,
        unknownCSRs: Array.from(unknownCSRs.entries()).sort((a,b) => b[1] - a[1]),
        source: 'csv',
        fileName: `${parsed.length} files`,
      });
    });
  };

  // ─────────────────────────────────────────────────────────────
  // GOOGLE SHEETS SYNC — fetches each profile tab via gviz CSV endpoint
  // Requires each workbook to be set to "Anyone with the link can view".
  // Endpoint: /gviz/tq?tqx=out:csv&sheet={TabName}
  // ─────────────────────────────────────────────────────────────
  const extractSheetId = (url) => {
    if (!url) return null;
    const m = String(url).match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
    return m ? m[1] : null;
  };

  const fetchSheetTabCsv = async (sheetId, tabName) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    // gviz returns an HTML error page if the tab is missing or the sheet isn't shared
    if (!text || text.startsWith('<') || /Sheet not found|invalid_query/i.test(text)) return null;

    // Try row 1 as header
    let parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const looksValid = (parsed.meta.fields || []).some(f => /date.*order|order.*date/i.test(f));
    if (looksValid) return parsed.data;

    // Fall back: row 2 as header (Grid Designs has a banner in row 1)
    const raw = Papa.parse(text, { header: false, skipEmptyLines: true }).data;
    if (raw.length < 2) return parsed.data;
    const headers = raw[1].map(h => String(h).trim());
    return raw.slice(2).map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
  };

  // ── Aux tabs written by the Apps Script sync: 'Profile Conversion' (profile-grain) and
  //    'CSR Production' (CSR×Profile). Single named tabs with their own schema, so they
  //    bypass fetchOrdersFromSheets (which is order-shaped and date-header gated). ──
  const fetchAuxTab = async (sheetId, tabName) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      if (!text || text.startsWith('<') || /Sheet not found|invalid_query/i.test(text)) return [];
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      return parsed.data || [];
    } catch { return []; }
  };

  // Finds the two tabs across the configured workbooks (the sync writes them to the Order
  // Management workbook). Returns [] for a tab that doesn't exist yet — never throws.
  const fetchProductionAndConversion = async () => {
    const ids = SHARED_SYNC.workbookUrls.map(extractSheetId).filter(Boolean);
    let conversion = [], production = [], designer = [];
    for (const id of ids) {
      if (!conversion.length) conversion = await fetchAuxTab(id, 'Profile Conversion');
      if (!production.length) production = await fetchAuxTab(id, 'CSR Production');
      if (!designer.length) designer = await fetchAuxTab(id, 'Designer Production');
    }
    return { conversion, production, designer };
  };

  // Core fetch — pulls every profile tab from the given workbook sheet IDs and
  // normalizes rows. No state writes, so both the manual sync (which shows a
  // preview) and the auto-sync (which applies directly) can share it.
  const fetchOrdersFromSheets = async (sheetIds, firstTabs = []) => {
    const allRows = [];
    const issues = [];
    const tabsRead = [];
    const unknownCSRs = new Map();
    const skipReasonCounts = {};
    // gviz CSV silently falls back to the first sheet when sheet=Name doesn't
    // match. Probe each workbook with an obviously-invalid name to learn what
    // its fallback data looks like, then reject any profile fetch that returns
    // that same data (it's a fallback, not a real tab match).
    const sigOf = (data) => data.length + '|' + JSON.stringify(data[0]) + '|' + JSON.stringify(data[data.length - 1]);
    const fallbackSigs = await Promise.all(sheetIds.map(async (id) => {
      try {
        const data = await fetchSheetTabCsv(id, '__csrpulse_probe_no_such_tab_xyz123__');
        if (!data || data.length === 0) return null;
        return sigOf(data);
      } catch { return null; }
    }));

    // Fetch every profile tab concurrently (one round trip each in parallel,
    // not 10+ sequential ones) so a full pull takes seconds, not minutes.
    const fetched = await Promise.all(profiles.map(async (profile) => {
      let rows = null;
      let fromIdx = -1;
      const attempts = [];
      for (let i = 0; i < sheetIds.length; i++) {
        try {
          const data = await fetchSheetTabCsv(sheetIds[i], profile);
          if (data === null) { attempts.push(`W${i + 1}: not in workbook`); continue; }
          if (data.length === 0) { attempts.push(`W${i + 1}: tab exists but empty`); continue; }
          const sig = sigOf(data);
          if (fallbackSigs[i] !== null && sig === fallbackSigs[i]) {
            // Matches gviz's silent fallback (first sheet): accept only if the
            // caller told us this profile IS that workbook's first tab.
            const configuredFirstTab = (firstTabs?.[i] || '').trim();
            if (configuredFirstTab && configuredFirstTab.toLowerCase() === profile.toLowerCase()) {
              rows = data; fromIdx = i; break;
            }
            attempts.push(`W${i + 1}: tab not in workbook (gviz returned first sheet)`);
            continue;
          }
          rows = data; fromIdx = i; break;
        } catch {
          attempts.push(`W${i + 1}: fetch error`);
        }
      }
      return { profile, rows, fromIdx, attempts };
    }));

    // Normalize in profile order so the output stays deterministic.
    for (const { profile, rows, fromIdx, attempts } of fetched) {
      if (!rows) {
        tabsRead.push({ name: profile, rows: 0, matched: false, file: attempts.join(' · ') || 'not found in either sheet' });
        continue;
      }
      tabsRead.push({ name: profile, rows: rows.length, matched: true, file: `Workbook ${fromIdx + 1}` });
      rows.forEach((row, idx) => {
        if (looksEmpty(row)) return;
        const result = normalizeRow(row, profile, idx);
        if (result.error) {
          const reason = result.skipReason || 'other';
          if (reason === 'pre_cutoff' || reason === 'no_date') return;
          skipReasonCounts[reason] = (skipReasonCounts[reason] || 0) + 1;
          issues.push({ profile, row: idx + 2, reason: result.error, skipReason: reason, file: `Workbook ${fromIdx + 1}` });
        } else {
          allRows.push(result.order);
        }
      });
    }

    // Surface included-with-warning rows (blank / unknown CSR).
    allRows.forEach(o => {
      if (!o.advisories || o.advisories.length === 0) return;
      const reason = o.advisories.includes('no_csr') ? 'Missing CSR' : `Unknown CSR "${o.csrRaw || ''}"`;
      issues.push({ profile: o.profile, row: o.sheetRow, reason, skipReason: o.advisories[0], included: true, file: o.profile });
      if (o.advisories.includes('unknown_csr') && o.csrRaw) {
        const key = o.csrRaw.toLowerCase();
        unknownCSRs.set(key, (unknownCSRs.get(key) || 0) + 1);
      }
    });
    issues.sort((a, b) => {
      const pa = String(a.profile || ''), pb = String(b.profile || '');
      if (pa !== pb) return pa.localeCompare(pb);
      return (a.row || 0) - (b.row || 0);
    });

    return { allRows, issues, tabsRead, unknownCSRs, skipReasonCounts };
  };

  // Manual sync (Import tab) — fetches and shows a preview to confirm.
  const syncFromGSheets = async () => {
    const sheetIds = syncConfig.workbookUrls.map(extractSheetId).filter(Boolean);
    if (sheetIds.length === 0) {
      setLastSync({ at: Date.now(), ok: false, message: 'No valid Google Sheets URLs configured' });
      return;
    }
    setSyncing(true);
    const { allRows, issues, tabsRead, unknownCSRs, skipReasonCounts } =
      await fetchOrdersFromSheets(sheetIds, syncConfig.firstTabs);
    setSyncing(false);

    if (allRows.length === 0 && tabsRead.every(t => !t.matched)) {
      setLastSync({
        at: Date.now(), ok: false,
        message: 'Could not read any tabs. Make sure both workbooks are shared as "Anyone with the link can view".',
      });
      return;
    }
    setLastSync({
      at: Date.now(), ok: true,
      message: `Pulled ${allRows.length} orders from ${tabsRead.filter(t => t.matched).length}/${profiles.length} profile tabs`,
    });
    setImportPreview({
      rows: allRows, issues, tabsRead,
      unknownCSRs: Array.from(unknownCSRs.entries()).sort((a, b) => b[1] - a[1]),
      skipReasonCounts,
      source: 'gsheet',
      fileName: `Google Sheets sync (${sheetIds.length} workbook${sheetIds.length === 1 ? '' : 's'})`,
    });
  };

  // Auto-sync — pulls from the SHARED sheets baked into the app and applies the
  // result directly (no preview), so every visitor sees the same numbers.
  const autoSyncFromGSheets = async () => {
    const sheetIds = SHARED_SYNC.workbookUrls.map(extractSheetId).filter(Boolean);
    if (sheetIds.length === 0) return;
    setSyncing(true);
    try {
      const { allRows, tabsRead } = await fetchOrdersFromSheets(sheetIds, SHARED_SYNC.firstTabs);
      // Aux tabs (conversion + production) are independent of orders. Only overwrite when
      // present, so a missing/empty tab never wipes existing data.
      try {
        const { conversion: convRows, production: prodRows, designer: desRows } = await fetchProductionAndConversion();
        if (convRows.length) setConversion(convRows);
        if (prodRows.length) setProduction(prodRows);
        if (desRows.length) setDesignerProd(desRows);
      } catch (_) { /* aux tabs are best-effort */ }
      if (allRows.length === 0 && tabsRead.every(t => !t.matched)) {
        // Don't wipe any cached data on a failed pull.
        setLastSync({
          at: Date.now(), ok: false,
          message: 'Auto-sync could not read the sheets — they must be shared "Anyone with the link can view".',
        });
      } else {
        setOrders(allRows);
        setLastSync({
          at: Date.now(), ok: true,
          message: `Auto-synced ${allRows.length} orders from ${tabsRead.filter(t => t.matched).length}/${profiles.length} profile tabs`,
        });
      }
    } catch (e) {
      setLastSync({ at: Date.now(), ok: false, message: `Auto-sync failed: ${e.message || 'unknown error'}` });
    } finally {
      setSyncing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // UNIFIED FILE HANDLER — accepts mix of xlsx and csv
  // ─────────────────────────────────────────────────────────────
  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const xlsxFiles = arr.filter(f => /\.xlsx?$/i.test(f.name));
    const csvFiles = arr.filter(f => /\.csv$/i.test(f.name));
    if (xlsxFiles.length > 0) {
      handleXLSX(xlsxFiles);
    } else if (csvFiles.length > 0) {
      handleCSVs(csvFiles);
    }
  };

  const confirmImport = (mode) => {
    if (!importPreview) return;
    if (mode === 'replace') {
      setOrders(importPreview.rows);
    } else {
      // Merge: drop sample rows, then append imports — but dedupe by ID
      // so re-importing the same file doesn't double-count
      const real = orders.filter(o => o.source !== 'sample');
      const existingIds = new Set(real.map(o => o.id));
      const newOnes = importPreview.rows.filter(o => !existingIds.has(o.id));
      setOrders([...real, ...newOnes]);
    }
    setImportPreview(null);
    setImportOpen(false);
    setTab('dashboard');
  };

  // ─────────────────────────────────────────────────────────────
  // ROSTER OPS
  // ─────────────────────────────────────────────────────────────
  const changeShift = (csrId, newShift) => {
    const csr = roster.find(c => c.id === csrId);
    if (!csr || csr.shift === newShift) return;
    setShiftHistory(prev => [...prev, {
      csrId, name: csr.name, from: csr.shift, to: newShift, changedOn: todayBD()
    }]);
    setRoster(roster.map(c => c.id === csrId ? { ...c, shift: newShift } : c));
  };

  const toggleArchive = (csrId) => {
    setRoster(roster.map(c => c.id === csrId ? { ...c, active: !c.active } : c));
  };

  const openAddPerson = () => {
    setNewPerson({ name: '', shift: 'Morning', role: 'CSR' });
    setAddPersonOpen(true);
  };

  const saveNewPerson = () => {
    const name = newPerson.name.trim();
    if (!name) return;
    // Generate stable id
    const baseId = name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,16);
    // Ensure unique id
    let id = baseId;
    let n = 2;
    while (roster.find(r => r.id === id)) {
      id = baseId + n;
      n++;
    }
    setRoster([...roster, {
      id,
      name,
      shift: newPerson.shift,
      role: newPerson.role,
      active: true,
    }]);
    setAddPersonOpen(false);
    setNewPerson({ name: '', shift: 'Morning', role: 'CSR' });
  };

  // ─────────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // PDF EXPORT — CEO summary, programmatically generated
  // ─────────────────────────────────────────────────────────────
  const exportPDF = async (mode = 'dashboard') => {
    const isCompletions = mode === 'completions';
    const filenameBase = isCompletions ? 'csr-pulse-completions' : 'csr-pulse';
    // Name the file after the SELECTED window, not "today": a single day uses
    // that date, a multi-day range uses start_to_end
    // (e.g. csr-pulse-2026-05-27_to_2026-06-02.pdf).
    const datePart = window_.start === window_.end
      ? window_.start
      : `${window_.start}_to_${window_.end}`;
    const filename = `${filenameBase}-${datePart}.pdf`;
    setExportData({ status: 'preparing', filename });

    try {
      const ensureScript = (src) => new Promise((res, rej) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) { res(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
      await ensureScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

      // ── Brand colors (jsPDF RGB) — restrained palette
      const VIOLET   = [114, 41, 255];
      const INK      = [22, 10, 51];
      const BODY     = [60, 50, 100];
      const MUTED    = [120, 110, 155];
      const DIM      = [170, 162, 200];
      const HAIRLINE = [228, 224, 240];
      const MINT     = [16, 185, 129];
      const AMBER    = [245, 158, 11];
      const CYAN     = [14, 165, 233];

      const W = 210, H = 297;
      const M = 18;                  // wider side margin for breathing room
      const TOP_M = 22;
      const PAGE_BOTTOM = H - 22;    // reserve room for the footer
      let y = TOP_M;

      // ── Helpers
      const setFill = (rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      const setText = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      const setDraw = (rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      const hairline = (yPos) => {
        setDraw(HAIRLINE); doc.setLineWidth(0.2);
        doc.line(M, yPos, W - M, yPos);
      };
      const eyebrow = (text, x, yPos, align) => {
        setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        const cs = 0.6;
        doc.setCharSpace(cs);
        const upper = text.toUpperCase();
        // jsPDF's align: 'right' / 'center' doesn't account for setCharSpace,
        // so the visible right edge overshoots the requested x. Compute the
        // real rendered width and position manually instead.
        if (align === 'right' || align === 'center') {
          const w = doc.getTextWidth(upper) + (upper.length - 1) * cs;
          const startX = align === 'right' ? x - w : x - w / 2;
          doc.text(upper, startX, yPos);
        } else {
          doc.text(upper, x, yPos);
        }
        doc.setCharSpace(0);
      };
      const truncate = (str, max) => {
        const s = String(str || '');
        return s.length <= max ? s : s.slice(0, max - 1) + '…';
      };

      // ── LOGO (render the actual HMLogo SVG to a high-res PNG once)
      const renderLogoToPng = (sizePx = 256) => new Promise((resolve, reject) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 392.35 392.35"><rect width="392.35" height="392.35" rx="70" ry="70" fill="#7229FF"/><path fill="#FFFFFF" d="M187.32,115.24h17.71c2.46,0,4.46,1.99,4.46,4.46v61.29c0,1.98-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-66.45c0-2.46,1.99-4.46,4.46-4.46ZM167.44,142.55v50.69c0,1.98-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-55.85c0-2.46,1.99-4.46,4.46-4.46h17.71c2.46,0,4.46,1.99,4.46,4.46ZM144.03,219.52l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v31.16c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46v-26c0-1.98,1.31-3.73,3.21-4.28ZM186.07,207.27l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v66.26c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46v-61.1c0-1.99,1.31-3.73,3.21-4.28ZM224.9,249.8v-50.5c0-1.98,1.31-3.73,3.21-4.28l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v55.66c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46ZM251.52,142.55v26.19c0,1.99-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-31.35c0-2.46,1.99-4.46,4.46-4.46h17.71c2.46,0,4.46,1.99,4.46,4.46h0Z"/></svg>`;
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = sizePx; canvas.height = sizePx;
          canvas.getContext('2d').drawImage(img, 0, 0, sizePx, sizePx);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
      });
      let logoPng = null;
      try { logoPng = await renderLogoToPng(256); } catch { /* fall back to text-only header */ }

      // ── PDF-friendly date formatting (jsPDF helvetica can't render → arrow)
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const fmtPdfDate = (iso) => {
        const [yy, mm, dd] = iso.split('-');
        return `${parseInt(dd, 10)} ${MONTHS[parseInt(mm, 10) - 1]} ${yy}`;
      };
      const periodLabel = (() => {
        if (window_.start === window_.end) return fmtPdfDate(window_.start);
        return `${fmtPdfDate(window_.start)} - ${fmtPdfDate(window_.end)}`;
      })();
      const rangeKindLabel = (() => {
        if (dateRange === 'today') return 'TODAY';
        if (dateRange === 'yesterday') return 'YESTERDAY';
        if (dateRange === '7d') return 'LAST 7 DAYS';
        if (dateRange === '30d') return 'LAST 30 DAYS';
        return 'CUSTOM RANGE';
      })();

      // ── MULTI-PAGE HELPERS (use logoPng so must be defined after it loads)
      const runningHeader = () => {
        if (logoPng) doc.addImage(logoPng, 'PNG', M, 12, 6, 6);
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.setCharSpace(0.5);
        doc.text('CSR PULSE', M + 8.5, 16.4);
        doc.setCharSpace(0);
        setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(`${rangeKindLabel.toLowerCase()} · ${periodLabel}`, W - M, 16.4, { align: 'right' });
        hairline(20);
      };
      const newPage = () => {
        doc.addPage();
        runningHeader();
        y = 28;
      };
      const ensureSpace = (needed) => {
        if (y + needed > PAGE_BOTTOM) newPage();
      };
      // Eyebrow + big section title, professional style
      const sectionHeader = (eyebrowText, title, rightText) => {
        ensureSpace(18);
        eyebrow(eyebrowText, M, y);
        if (rightText) {
          setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
          doc.text(rightText, W - M, y, { align: 'right' });
        }
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
        doc.text(title, M, y + 7);
        y += 13;
      };

      // ── Per-mode data + labels. Dashboard = daily closings, scoped by
      // order date. Completions = daily completions, scoped by DOC.
      const reportKpis     = isCompletions ? completionKpis : kpis;
      const reportOrders   = isCompletions ? completed : filtered;
      const reportLeaderboard = isCompletions
        ? completionByCSR.map(e => ({
            id: e.id, name: e.name, shift: e.shift, role: 'CSR',
            count: e.count, revenue: e.revenue, vvroCount: e.vvro,
            vvroMix: e.count ? (e.vvro / e.count) * 100 : 0,
            aov: e.count ? e.revenue / e.count : 0,
          }))
        : leaderboard;
      const reportProfileBreak = isCompletions
        ? completionByProfile.map(p => ({ profile: p.profile, count: p.count, revenue: p.revenue }))
        : profileBreak;
      const heroLabel    = isCompletions ? 'Completed revenue' : 'Total revenue';
      const heroValue    = isCompletions ? reportKpis.total : reportKpis.total;
      const subtitleText = isCompletions ? 'HASEEBMADEIT · Daily completions report' : 'HASEEBMADEIT · Internal report';
      const orderLogTitle = isCompletions ? 'Completed orders' : 'Order log';
      const leaderboardSub = isCompletions
        ? `${reportLeaderboard.length} CSRs · ranked by completed orders`
        : `${reportLeaderboard.length} closers · ranked by revenue`;

      // ═══════════════════════════════════════════════════════════════
      //  PAGE 1 — COVER / OVERVIEW
      // ═══════════════════════════════════════════════════════════════

      // ── Identity strip (logo + brand) top-left
      if (logoPng) doc.addImage(logoPng, 'PNG', M, TOP_M - 8, 11, 11);
      setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('CSR Pulse', M + 14, TOP_M - 3);
      setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(subtitleText, M + 14, TOP_M + 1);

      // ── Date range top-right
      eyebrow(rangeKindLabel, W - M, TOP_M - 3, 'right');
      setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text(periodLabel, W - M, TOP_M + 1, { align: 'right' });

      y = TOP_M + 12;
      hairline(y);
      y += 16;

      // ── HERO: total revenue (display number)
      eyebrow(heroLabel, M, y);
      setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(42);
      doc.text(fmtUSD(heroValue), M, y + 16);
      setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      doc.text(
        `${fmtNum(reportKpis.count)} ${isCompletions ? 'completed' : 'orders'}  ·  ${fmtUSDc(reportKpis.aov)} AOV  ·  ${fmtUSD(reportKpis.tips)} in tips`,
        M, y + 23
      );
      y += 32;

      hairline(y);
      y += 12;

      // ── AT A GLANCE: 4 borderless KPI columns
      const colW2 = (W - M*2) / 4;
      const miniKpis = [
        { label: 'VVRO revenue',    value: fmtUSD(reportKpis.vvroRev), sub: `${fmtNum(reportKpis.vvro)} orders · ${reportKpis.vvroMix.toFixed(0)}% of revenue` },
        { label: 'Organic revenue', value: fmtUSD(reportKpis.orgnRev), sub: `${fmtNum(reportKpis.orgn)} orders · ${(100-reportKpis.vvroMix).toFixed(0)}% of revenue` },
        { label: 'Avg order value', value: fmtUSDc(reportKpis.aov),    sub: 'per order' },
        { label: 'Total tips',      value: fmtUSD(reportKpis.tips),    sub: heroValue > 0 ? `${(reportKpis.tips/heroValue*100).toFixed(1)}% of revenue` : 'no revenue yet' },
      ];
      miniKpis.forEach((k, i) => {
        const cx = M + i * colW2;
        eyebrow(k.label, cx, y);
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
        doc.text(k.value, cx, y + 9);
        setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text(k.sub, cx, y + 14);
      });
      y += 22;

      hairline(y);
      y += 12;

      // ── SHIFT PERFORMANCE: horizontal bar rows
      eyebrow('Performance by shift', M, y);
      setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text('Where the revenue lives', M, y + 7);
      y += 14;

      const shifts = ['Morning', 'Evening', 'Night'];
      const shiftColor = { Morning: AMBER, Evening: CYAN, Night: VIOLET };
      const shiftRange = { Morning: '9 AM – 5 PM PKT', Evening: '5 PM – 1 AM PKT', Night: '1 AM – 9 AM PKT' };
      const shiftStats = shifts.map(sh => {
        const sub = reportOrders.filter(o => o.shiftAtTime === sh);
        return {
          name: sh,
          count: sub.length,
          rev: sub.reduce((s, o) => s + (o.price || 0) + (isCompletions ? (o.tip || 0) : 0), 0),
          vvro: sub.filter(o => o.type === 'VVRO').length,
          orgn: sub.filter(o => o.type === 'ORGANIC').length,
        };
      });
      const maxShiftRev = Math.max(...shiftStats.map(s => s.rev), 1);
      const barX = M + 42;
      const barMaxW = W - M - barX - 40;
      shiftStats.forEach((s, i) => {
        const ry = y + i * 14;
        // Color dot + name + time range
        setFill(shiftColor[s.name]);
        doc.circle(M + 1.5, ry + 4, 1.5, 'F');
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
        doc.text(s.name, M + 5, ry + 4);
        setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(shiftRange[s.name], M + 5, ry + 8);
        // Bar
        const barY = ry + 1.6;
        const barH = 4;
        setFill(HAIRLINE); doc.roundedRect(barX, barY, barMaxW, barH, 1, 1, 'F');
        if (s.rev > 0) {
          setFill(shiftColor[s.name]);
          doc.roundedRect(barX, barY, barMaxW * (s.rev / maxShiftRev), barH, 1, 1, 'F');
        }
        // Revenue right of bar
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(fmtUSD(s.rev), W - M, ry + 4, { align: 'right' });
        setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(`${s.count} orders · ${s.vvro} VVRO · ${s.orgn} Organic`, W - M, ry + 8, { align: 'right' });
      });
      y += shifts.length * 14 + 6;

      // ═══════════════════════════════════════════════════════════════
      //  PAGE 2+ — CSR LEADERBOARD
      // ═══════════════════════════════════════════════════════════════
      newPage();
      sectionHeader('Performance', 'CSR leaderboard', leaderboardSub);

      const maxRev = reportLeaderboard[0]?.revenue || 1;
      const leaderCols = [
        { label: '#',       x: M,             align: 'left'  },
        { label: 'CSR',     x: M + 10,        align: 'left'  },
        { label: 'SHIFT',   x: M + 70,        align: 'left'  },
        { label: 'ORDERS',  x: M + 108,       align: 'right' },
        { label: 'VVRO',    x: M + 128,       align: 'right' },
        { label: 'AOV',     x: M + 150,       align: 'right' },
        { label: 'REVENUE', x: W - M,         align: 'right' },
      ];
      const drawLeaderHeader = () => {
        setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        doc.setCharSpace(0.6);
        leaderCols.forEach(c => doc.text(c.label, c.x, y + 3, c.align === 'right' ? { align: 'right' } : undefined));
        doc.setCharSpace(0);
        hairline(y + 5);
        y += 8;
      };
      drawLeaderHeader();

      reportLeaderboard.forEach((e, i) => {
        if (y + 8 > PAGE_BOTTOM) {
          newPage();
          sectionHeader('Performance', 'CSR leaderboard (cont.)', leaderboardSub);
          drawLeaderHeader();
        }
        // Rank
        setText(i < 3 ? VIOLET : DIM);
        doc.setFont('helvetica', i < 3 ? 'bold' : 'normal'); doc.setFontSize(8);
        doc.text(String(i + 1).padStart(2, '0'), M, y + 4);
        // Name
        setText(INK); doc.setFont('helvetica', i < 3 ? 'bold' : 'normal'); doc.setFontSize(9);
        doc.text(e.name + (e.role === 'Manager' ? '  ·  MGR' : ''), M + 10, y + 4);
        // Shift (just colored text, no pill)
        setText(shiftColor[e.shift] || MUTED);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.setCharSpace(0.4);
        doc.text(e.shift.toUpperCase(), M + 70, y + 4);
        doc.setCharSpace(0);
        // Numbers
        setText(BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        doc.text(String(e.count), M + 108, y + 4, { align: 'right' });
        setText(e.vvroMix >= 50 ? MINT : MUTED);
        doc.text(`${e.vvroMix.toFixed(0)}%`, M + 128, y + 4, { align: 'right' });
        setText(BODY);
        doc.text(fmtUSDc(e.aov), M + 150, y + 4, { align: 'right' });
        // Revenue + mini bar below it
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(fmtUSD(e.revenue), W - M, y + 4, { align: 'right' });
        const barW = (e.revenue / maxRev) * 24;
        setFill(HAIRLINE); doc.rect(W - M - 24, y + 5.6, 24, 0.7, 'F');
        setFill(VIOLET); doc.rect(W - M - 24, y + 5.6, barW, 0.7, 'F');
        // Row divider
        hairline(y + 7.5);
        y += 7.5;
      });
      y += 6;

      // ═══════════════════════════════════════════════════════════════
      //  PROFILE PERFORMANCE
      // ═══════════════════════════════════════════════════════════════
      ensureSpace(70);
      sectionHeader('Profiles', 'Profile performance', `${reportProfileBreak.filter(p => p.count > 0).length} of ${reportProfileBreak.length} active`);

      const maxProfRev = reportProfileBreak[0]?.revenue || 1;
      const profColW = (W - M*2 - 8) / 2;
      reportProfileBreak.forEach((p, i) => {
        const col = i % 2;
        if (col === 0) ensureSpace(14);
        const cx = M + col * (profColW + 8);
        const cy = y;
        const isZero = p.count === 0;
        // Name
        setText(isZero ? DIM : INK);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(p.profile, cx, cy + 3);
        // Right label
        setText(isZero ? DIM : BODY);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        const right = isZero ? 'no orders' : `${p.count} orders · ${fmtUSD(p.revenue)}`;
        doc.text(right, cx + profColW, cy + 3, { align: 'right' });
        // Bar
        setFill(HAIRLINE);
        doc.rect(cx, cy + 5.5, profColW, 1, 'F');
        if (!isZero) {
          setFill(VIOLET);
          doc.rect(cx, cy + 5.5, profColW * (p.revenue / maxProfRev), 1, 'F');
        }
        if (col === 1 || i === reportProfileBreak.length - 1) y += 11;
      });

      // ═══════════════════════════════════════════════════════════════
      //  DESIGNER PRODUCTION — by designer (live from ClickUp)
      // ═══════════════════════════════════════════════════════════════
      if (designerProd && designerProd.length) {
        const nD = (v) => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
        const dRows = designerProd
          .map((r) => ({ designer: r.Designer || '', tasks: nD(r.Tasks), inRev: nD(r['In Revision']), completed: nD(r.Completed), sla: nD(r['SLA Breaches']) }))
          .filter((r) => r.designer)
          .sort((a, b) => b.tasks - a.tasks);
        if (dRows.length) {
          ensureSpace(28 + dRows.length * 7.5);
          sectionHeader('Production', 'Designer throughput', 'from ClickUp');
          const drawDHead = () => {
            setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setCharSpace(0.6);
            doc.text('DESIGNER', M, y + 3);
            doc.text('TASKS', M + 105, y + 3, { align: 'right' });
            doc.text('IN REV', M + 135, y + 3, { align: 'right' });
            doc.text('DONE', M + 162, y + 3, { align: 'right' });
            doc.text('SLA', W - M, y + 3, { align: 'right' });
            doc.setCharSpace(0); hairline(y + 5); y += 8;
          };
          drawDHead();
          dRows.forEach((r) => {
            if (y + 7.5 > PAGE_BOTTOM) { newPage(); sectionHeader('Production', 'Designer throughput (cont.)', 'from ClickUp'); drawDHead(); }
            setText(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            doc.text(truncate(r.designer, 30), M, y + 4);
            setText(BODY); doc.setFontSize(8.5);
            doc.text(fmtNum(r.tasks), M + 105, y + 4, { align: 'right' });
            setText(r.inRev > 0 ? VIOLET : BODY);
            doc.text(fmtNum(r.inRev), M + 135, y + 4, { align: 'right' });
            setText(MINT);
            doc.text(fmtNum(r.completed), M + 162, y + 4, { align: 'right' });
            setText(r.sla > 0 ? AMBER : MUTED); doc.setFont('helvetica', r.sla > 0 ? 'bold' : 'normal');
            doc.text(fmtNum(r.sla), W - M, y + 4, { align: 'right' });
            hairline(y + 7.5); y += 7.5;
          });
          y += 6;
        }
      }

      // ═══════════════════════════════════════════════════════════════
      //  CONVERSION — inquiries → orders, by profile (from the Inquiry sheet)
      // ═══════════════════════════════════════════════════════════════
      if (conversion && conversion.length) {
        const nC = (v) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
        const cRows = conversion
          .map((r) => ({ profile: r.Profile || r.profile || '', inq: nC(r.Inquiries), placed: nC(r.Placed) }))
          .filter((r) => r.profile)
          .sort((a, b) => (b.inq ? b.placed / b.inq : 0) - (a.inq ? a.placed / a.inq : 0));
        if (cRows.length) {
          ensureSpace(28 + cRows.length * 7.5);
          sectionHeader('Conversion', 'Inquiries to orders', 'by profile');
          const drawCHead = () => {
            setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setCharSpace(0.6);
            doc.text('PROFILE', M, y + 3);
            doc.text('INQUIRIES', M + 100, y + 3, { align: 'right' });
            doc.text('PLACED', M + 130, y + 3, { align: 'right' });
            doc.text('CONV', W - M, y + 3, { align: 'right' });
            doc.setCharSpace(0); hairline(y + 5); y += 8;
          };
          drawCHead();
          let totI = 0, totP = 0;
          cRows.forEach((r) => {
            if (y + 7.5 > PAGE_BOTTOM) { newPage(); sectionHeader('Conversion', 'Inquiries to orders (cont.)', 'by profile'); drawCHead(); }
            totI += r.inq; totP += r.placed;
            const pct = r.inq ? (r.placed / r.inq) * 100 : 0;
            setText(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            doc.text(truncate(r.profile, 32), M, y + 4);
            setText(BODY); doc.setFontSize(8.5);
            doc.text(fmtNum(r.inq), M + 100, y + 4, { align: 'right' });
            doc.text(fmtNum(r.placed), M + 130, y + 4, { align: 'right' });
            setText(pct >= 30 ? MINT : (pct >= 15 ? AMBER : MUTED)); doc.setFont('helvetica', 'bold');
            doc.text(`${pct.toFixed(1)}%`, W - M, y + 4, { align: 'right' });
            hairline(y + 7.5); y += 7.5;
          });
          const tot = totI ? (totP / totI) * 100 : 0;
          setText(VIOLET); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
          doc.text('OVERALL', M, y + 4);
          doc.text(fmtNum(totI), M + 100, y + 4, { align: 'right' });
          doc.text(fmtNum(totP), M + 130, y + 4, { align: 'right' });
          doc.text(`${tot.toFixed(1)}%`, W - M, y + 4, { align: 'right' });
          y += 12;
        }
      }

      // ═══════════════════════════════════════════════════════════════
      //  PRODUCTION — CSR × profile (from ClickUp)
      // ═══════════════════════════════════════════════════════════════
      if (production && production.length) {
        const nP = (v) => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
        const pRows = production
          .map((r) => ({ profile: r.Profile || '', csr: r.CSR || '', orders: nP(r.Orders), deliveries: nP(r.Deliveries), revisions: nP(r.Revisions), sla: nP(r['SLA Breaches']) }))
          .filter((r) => r.csr || r.profile)
          .sort((a, b) => b.orders - a.orders || b.deliveries - a.deliveries);
        if (pRows.length) {
          ensureSpace(28 + pRows.length * 7.5);
          sectionHeader('Production', 'CSR production', 'from ClickUp');
          const drawPHead = () => {
            setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setCharSpace(0.6);
            doc.text('CSR', M, y + 3);
            doc.text('PROFILE', M + 45, y + 3);
            doc.text('ORDERS', M + 112, y + 3, { align: 'right' });
            doc.text('DELIV', M + 138, y + 3, { align: 'right' });
            doc.text('REV', M + 158, y + 3, { align: 'right' });
            doc.text('SLA', W - M, y + 3, { align: 'right' });
            doc.setCharSpace(0); hairline(y + 5); y += 8;
          };
          drawPHead();
          pRows.forEach((r) => {
            if (y + 7.5 > PAGE_BOTTOM) { newPage(); sectionHeader('Production', 'CSR production (cont.)', 'from ClickUp'); drawPHead(); }
            setText(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            doc.text(truncate(r.csr || '—', 22), M, y + 4);
            setText(BODY); doc.setFontSize(8.5);
            doc.text(truncate(r.profile, 26), M + 45, y + 4);
            doc.text(fmtNum(r.orders), M + 112, y + 4, { align: 'right' });
            doc.text(fmtNum(r.deliveries), M + 138, y + 4, { align: 'right' });
            doc.text(fmtNum(r.revisions), M + 158, y + 4, { align: 'right' });
            setText(r.sla > 0 ? AMBER : MUTED); doc.setFont('helvetica', r.sla > 0 ? 'bold' : 'normal');
            doc.text(fmtNum(r.sla), W - M, y + 4, { align: 'right' });
            hairline(y + 7.5); y += 7.5;
          });
          y += 6;
        }
      }

      // ═══════════════════════════════════════════════════════════════
      //  ORDER LOG — every row
      // ═══════════════════════════════════════════════════════════════
      newPage();
      sectionHeader('Detail', orderLogTitle, `${reportOrders.length} ${isCompletions ? 'completions' : 'orders'}`);

      const TYPE_X = W - M - 18;
      const orderCols = [
        { key: 'date',    label: 'DATE',    x: M,         align: 'left'  },
        { key: 'profile', label: 'PROFILE', x: M + 22,    align: 'left'  },
        { key: 'client',  label: 'CLIENT',  x: M + 50,    align: 'left'  },
        { key: 'project', label: 'PROJECT', x: M + 80,    align: 'left'  },
        { key: 'csr',     label: 'CSR',     x: M + 114,   align: 'left'  },
        { key: 'shift',   label: 'SHIFT',   x: M + 134,   align: 'left'  },
        { key: 'type',    label: 'TYPE',    x: TYPE_X,    align: 'right' },
        { key: 'price',   label: 'PRICE',   x: W - M,     align: 'right' },
      ];
      const drawOrderHeader = () => {
        setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        doc.setCharSpace(0.5);
        orderCols.forEach(c => doc.text(c.label, c.x, y + 3, c.align === 'right' ? { align: 'right' } : undefined));
        doc.setCharSpace(0);
        hairline(y + 5);
        y += 8;
      };
      drawOrderHeader();

      // Completions are sorted by completion date (when scoped by DOC),
      // dashboard orders are sorted by order date (when scoped by order date).
      const sortKey = (o) => isCompletions
        ? (o.completionDate ? businessDay(o.completionDate) : businessDay(o.timestamp))
        : businessDay(o.timestamp);
      const ordersSorted = [...reportOrders].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
      ordersSorted.forEach((o) => {
        if (y + 6 > PAGE_BOTTOM) {
          newPage();
          sectionHeader('Detail', `${orderLogTitle} (cont.)`, `${reportOrders.length} ${isCompletions ? 'completions' : 'orders'}`);
          drawOrderHeader();
        }
        const csrName = roster.find(c => c.id === o.csrId)?.name || o.csrName || '—';
        const dateOnly = sortKey(o);
        const dateShort = `${dateOnly.slice(8, 10)} ${MONTHS[parseInt(dateOnly.slice(5, 7), 10) - 1]}`;
        // Cells
        setText(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(dateShort, M, y + 3.5);
        setText(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(truncate(o.profile, 14), M + 22, y + 3.5);
        doc.text(truncate(o.client, 16), M + 50, y + 3.5);
        doc.text(truncate(o.project, 18), M + 80, y + 3.5);
        doc.text(truncate(csrName, 12), M + 114, y + 3.5);
        setText(MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
        doc.setCharSpace(0.3);
        doc.text((o.shiftAtTime || '—').slice(0, 3).toUpperCase(), M + 134, y + 3.5);
        const tc = o.type === 'VVRO' ? MINT : o.type === 'ORGANIC' ? VIOLET : DIM;
        setText(tc);
        doc.text(o.type || '—', TYPE_X, y + 3.5, { align: 'right' });
        doc.setCharSpace(0);
        setText(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
        doc.text(fmtUSD(o.price || 0), W - M, y + 3.5, { align: 'right' });
        // Hairline divider
        setDraw(HAIRLINE); doc.setLineWidth(0.15);
        doc.line(M, y + 5.5, W - M, y + 5.5);
        y += 5.5;
      });

      // ═══════════════════════════════════════════════════════════════
      //  FOOTERS (after all pages exist so we know total page count)
      // ═══════════════════════════════════════════════════════════════
      const totalPages = doc.getNumberOfPages();
      const filterDetail = [
        fCSR !== 'all' ? `CSR=${roster.find(c=>c.id===fCSR)?.name||fCSR}` : null,
        fShift !== 'all' ? `Shift=${fShift}` : null,
        fProfile !== 'all' ? `Profile=${fProfile}` : null,
        fType !== 'all' ? `Type=${fType}` : null,
      ].filter(Boolean).join(' · ');
      const now = new Date();
      const generatedStr = `Generated ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        // Footer hairline + text
        const footerY = H - 12;
        hairline(footerY - 4);
        setText(DIM); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
        doc.text('CSR Pulse  ·  HASEEBMADEIT  ·  Confidential', M, footerY);
        if (filterDetail) {
          doc.text(filterDetail, W / 2, footerY, { align: 'center' });
        } else {
          doc.text(generatedStr, W / 2, footerY, { align: 'center' });
        }
        doc.text(`Page ${p} of ${totalPages}`, W - M, footerY, { align: 'right' });
      }

      // Download
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      // filename was built from the selected window at the top of exportPDF
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => document.body.removeChild(a), 100);

      setExportData({ status: 'ready', filename, url });
    } catch (e) {
      console.error('PDF export failed:', e);
      setExportData({ status: 'error', message: e.message || 'Unknown error' });
    }
  };

  if (!loaded) return (
    <div className="flex h-screen items-center justify-center" style={{ background: C.bg, color: C.textMuted }}>
      <div className="font-mono text-xs">Loading CSR Pulse…</div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{
      background: C.bg,
      color: C.text,
      fontFamily: '"Inter", "SF Pro Text", system-ui, sans-serif',
    }}>
      <style>{`
        .mono { font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace; font-feature-settings: "ss01","ss02"; }
        .disp { font-family: "Space Grotesk", "Inter", sans-serif; letter-spacing: -0.02em; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: ${C.bgRaised}; }
        ::-webkit-scrollbar-thumb { background: ${C.borderHi}; border-radius: 5px; border: 2px solid ${C.bgRaised}; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.textDim}; }
        select, input { color-scheme: light; }
        select { appearance: none; padding-right: 1.75rem; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B82A8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 12px; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${C.violet}; outline-offset: 2px; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-xl"
              style={{ background: `${C.bg}E6`, borderColor: C.border }}>
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <HMLogo size={40} color="#FFFFFF" bg={C.violet} />
            <div>
              <div className="disp text-lg font-bold leading-tight" style={{ color: C.text }}>
                CSR Pulse
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: C.violet }}>
                  HaseebMadeIt
                </span>
                <span style={{ color: C.borderHi }}>·</span>
                <span className="mono text-[10px]" style={{ color: C.text }}>
                  Today {todayBD()}
                </span>
                <span style={{ color: C.borderHi }}>·</span>
                <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: C.textDim }}>
                  Data since {DATA_START_DATE} · 5 AM PKT cutoff
                </span>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {HAS_SHARED_SYNC && (
              <button onClick={autoSyncFromGSheets} disabled={syncing}
                      title="Refresh data from Google Sheets"
                      className="mr-1 flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[10px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                      style={{ background: C.bgRaised, color: C.textMuted, border: `1px solid ${C.border}` }}>
                <RefreshCw size={11} className={syncing ? 'animate-spin' : ''}
                           style={{ color: syncing ? C.violet : (lastSync && lastSync.ok === false ? C.coral : C.mint) }}/>
                {syncing ? 'Syncing…' : lastSync ? (lastSync.ok ? `Synced ${syncAgo(lastSync.at)}` : 'Sync failed') : 'Sync'}
              </button>
            )}
            {[
              { id:'dashboard',   label:'Dashboard' },
              { id:'completions', label:'Completions' },
              { id:'log',         label:'Order log' },
              { id:'roster',      label:'Roster' },
              { id:'calculator',  label:'Calculator' },
              { id:'import',      label:'Import' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                      className="rounded-md px-4 py-2 text-xs font-semibold transition-all"
                      style={{
                        background: tab === t.id ? C.violet : 'transparent',
                        color: tab === t.id ? '#FFFFFF' : C.textMuted,
                        border: `1px solid ${tab === t.id ? C.violet : 'transparent'}`,
                      }}>
                {t.label}
              </button>
            ))}
            {onLogout && (
              <button onClick={onLogout}
                      title="Sign out"
                      className="ml-2 rounded-md px-3 py-2 text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        background: 'transparent',
                        color: C.textDim,
                        border: `1px solid ${C.border}`,
                      }}>
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">

        {HAS_SHARED_SYNC && syncing && orders.length === 0 && (
          <div className="mb-6 flex items-center gap-2 rounded-xl p-4 text-xs"
               style={{ background: C.violetBg, border: `1px solid ${C.borderHi}`, color: C.violetDim }}>
            <RefreshCw size={14} className="animate-spin"/> Pulling the latest numbers from Google Sheets…
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            DASHBOARD TAB
           ════════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <>
            {/* Filter bar */}
            <div className="mb-6 rounded-xl p-4" style={{ background: C.bgRaised, border: `1px solid ${C.border}` }}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 pr-3" style={{ borderRight: `1px solid ${C.border}` }}>
                  <Filter size={14} style={{ color: C.textDim }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: C.textDim }}>Filters</span>
                </div>

                {/* Date range */}
                <DateRangePicker
                  dateRange={dateRange} setDateRange={setDateRange}
                  customStart={customStart} customEnd={customEnd}
                  setCustomStart={setCustomStart} setCustomEnd={setCustomEnd}
                  windowStart={window_.start} windowEnd={window_.end}
                />

                <div className="flex flex-wrap gap-2">
                  <select value={fCSR} onChange={e=>setFCSR(e.target.value)}
                          className="rounded-md px-2 py-1 text-xs"
                          style={{ background:C.bgCard, color:C.text, border:`1px solid ${C.border}` }}>
                    <option value="all">All CSRs</option>
                    {roster.filter(c=>c.active).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select value={fShift} onChange={e=>setFShift(e.target.value)}
                          className="rounded-md px-2 py-1 text-xs"
                          style={{ background:C.bgCard, color:C.text, border:`1px solid ${C.border}` }}>
                    <option value="all">All shifts</option>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                  <select value={fProfile} onChange={e=>setFProfile(e.target.value)}
                          className="rounded-md px-2 py-1 text-xs"
                          style={{ background:C.bgCard, color:C.text, border:`1px solid ${C.border}` }}>
                    <option value="all">All profiles</option>
                    {profiles.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={fType} onChange={e=>setFType(e.target.value)}
                          className="rounded-md px-2 py-1 text-xs"
                          style={{ background:C.bgCard, color:C.text, border:`1px solid ${C.border}` }}>
                    <option value="all">All types</option>
                    <option value="VVRO">VVRO</option>
                    <option value="ORGANIC">ORGANIC</option>
                  </select>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                    {filtered.length} orders · {window_.label}
                  </span>
                  <button onClick={exportPDF}
                          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90"
                          style={{ background: C.violet, color: '#FFFFFF' }}>
                    <Download size={12} strokeWidth={2.5} /> Export PDF
                  </button>
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Revenue"   value={fmtUSD(kpis.total)}      sub={`from ${fmtNum(kpis.count)} orders`} accent={C.mint}   icon={DollarSign}/>
              <StatCard label="Orders"    value={fmtNum(kpis.count)}      sub={`AOV ${fmtUSDc(kpis.aov)}`}          accent={C.violetGlow} icon={Package}/>
              <StatCard label="VVRO"      value={fmtUSD(kpis.vvroRev)}    sub={`${fmtNum(kpis.vvro)} orders · ${kpis.vvroMix.toFixed(0)}% of rev`} accent={C.mint}   icon={TrendingUp}/>
              <StatCard label="Organic"   value={fmtUSD(kpis.orgnRev)}    sub={`${fmtNum(kpis.orgn)} orders · ${(100-kpis.vvroMix).toFixed(0)}% of rev`} accent={C.violetGlow} icon={Star}/>
            </div>

            {/* SHIFT BREAKDOWN — ALWAYS shows all 3 shifts */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {['Morning', 'Evening', 'Night'].map(shiftName => {
                const shiftOrders = filtered.filter(o => o.shiftAtTime === shiftName);
                const revenue = shiftOrders.reduce((s,o) => s + (o.price||0), 0);
                const count = shiftOrders.length;
                const vvro = shiftOrders.filter(o => o.type === 'VVRO').length;
                const orgn = shiftOrders.filter(o => o.type === 'ORGANIC').length;
                const accent = SHIFT_COLORS[shiftName];
                const range = shiftName === 'Morning' ? '9 AM – 5 PM PKT'
                            : shiftName === 'Evening' ? '5 PM – 1 AM PKT'
                            : '1 AM – 9 AM PKT';
                return (
                  <div key={shiftName} className="rounded-xl p-5"
                       style={{
                         background: C.bgCard,
                         border: `1px solid ${C.border}`,
                         boxShadow: count > 0 ? `0 0 0 1px ${accent}20` : 'none',
                       }}>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={14} style={{ color: accent }}/>
                        <span className="text-sm font-semibold" style={{ color: accent }}>{shiftName}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                        {range}
                      </span>
                    </div>
                    <div className="mono mb-1 text-2xl font-semibold" style={{ color: count > 0 ? C.text : C.textDim }}>
                      {fmtUSD(revenue)}
                    </div>
                    <div className="mb-3 text-xs" style={{ color: C.textMuted }}>
                      {count} order{count === 1 ? '' : 's'}
                    </div>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: C.textMuted }}>
                      <span>
                        <span className="mono font-semibold" style={{ color: C.mint }}>{vvro}</span> VVRO
                      </span>
                      <span style={{ color: C.border }}>·</span>
                      <span>
                        <span className="mono font-semibold" style={{ color: C.violetGlow }}>{orgn}</span> Organic
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leaderboard + Profiles split */}
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

              {/* Leaderboard */}
              <div className="rounded-xl lg:col-span-2" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-2">
                    <Trophy size={14} style={{ color: C.mint }} />
                    <span className="text-sm font-semibold">Leaderboard</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>by revenue</span>
                </div>
                <div className="max-h-[480px] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                        <th className="px-5 py-2 text-left">#</th>
                        <th className="px-5 py-2 text-left">CSR</th>
                        <th className="px-5 py-2 text-left">Shift</th>
                        <th className="px-5 py-2 text-right">Orders</th>
                        <th className="px-5 py-2 text-right">VVRO mix</th>
                        <th className="px-5 py-2 text-right">AOV</th>
                        <th className="px-5 py-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-8 text-center text-xs" style={{ color: C.textDim }}>
                          No orders in this window
                        </td></tr>
                      )}
                      {leaderboard.map((e, i) => {
                        const max = leaderboard[0]?.revenue || 1;
                        const pct = (e.revenue / max) * 100;
                        const medal = i === 0 ? C.mint : i === 1 ? C.violetGlow : i === 2 ? C.amber : null;
                        return (
                          <tr key={e.id} className="border-t transition-colors hover:bg-white/[0.02]"
                              style={{ borderColor: C.border }}>
                            <td className="mono px-5 py-3 text-xs" style={{ color: medal || C.textDim, fontWeight: medal ? 700 : 400 }}>
                              {String(i+1).padStart(2,'0')}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{e.name}</span>
                                {e.role === 'Manager' && <Pill color={C.amber}>MGR</Pill>}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <Pill color={SHIFT_COLORS[e.shift]}>{e.shift}</Pill>
                            </td>
                            <td className="mono px-5 py-3 text-right text-xs" style={{ color: C.text }}>{e.count}</td>
                            <td className="mono px-5 py-3 text-right text-xs">
                              <span style={{ color: e.vvroMix >= 50 ? C.mint : C.textMuted }}>
                                {e.vvroMix.toFixed(0)}%
                              </span>
                            </td>
                            <td className="mono px-5 py-3 text-right text-xs" style={{ color: C.textMuted }}>{fmtUSDc(e.aov)}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="mono text-sm font-semibold" style={{ color: C.text }}>{fmtUSD(e.revenue)}</div>
                              <div className="mt-1 h-1 rounded-full" style={{ background: C.border }}>
                                <div className="h-full rounded-full transition-all"
                                     style={{ width: `${pct}%`, background: medal || C.violet }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Profile breakdown — always shows all 10 profiles */}
              <div className="rounded-xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="border-b px-5 py-3" style={{ borderColor: C.border }}>
                  <span className="text-sm font-semibold" style={{ color: C.text }}>By profile</span>
                </div>
                <div className="space-y-2.5 p-5">
                  {profileBreak.map(p => {
                    const max = profileBreak[0]?.revenue || 1;
                    const pct = max > 0 ? (p.revenue / max) * 100 : 0;
                    const isZero = p.count === 0;
                    return (
                      <div key={p.profile} style={{ opacity: isZero ? 0.4 : 1 }}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: C.text }}>{p.profile}</span>
                          <span className="mono text-xs" style={{ color: C.textMuted }}>
                            {isZero ? '— no orders' : `${p.count} · ${fmtUSD(p.revenue)}`}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: C.bgRaised }}>
                          <div className="h-full rounded-full transition-all"
                               style={{
                                 width: `${pct}%`,
                                 background: isZero ? C.border : `linear-gradient(90deg, ${C.violet}, ${C.violetGlow})`,
                               }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Conversion · inquiries → orders (profile-level, from the Inquiry sheet) ── */}
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                  Conversion <span className="font-normal" style={{ color: C.textDim }}>· inquiries → orders</span>
                </h3>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>by profile · Client Daily Inquiries</span>
              </div>
              {conversion.length === 0 ? (
                <div className="rounded-xl p-5 text-xs" style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.textMuted }}>
                  No conversion data yet — run the Apps Script sync (it writes the Profile Conversion tab).
                </div>
              ) : (() => {
                const n = (v) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
                const rows = conversion
                  .map((r) => ({ profile: r.Profile || r.profile || '', inq: n(r.Inquiries), placed: n(r.Placed) }))
                  .filter((r) => r.profile);
                const totInq = rows.reduce((s, r) => s + r.inq, 0);
                const totPlaced = rows.reduce((s, r) => s + r.placed, 0);
                const overall = totInq ? (totPlaced / totInq) * 100 : 0;
                const maxRate = Math.max(...rows.map((r) => (r.inq ? r.placed / r.inq : 0)), 0.0001);
                return (
                  <>
                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <StatCard label="Conversion" value={`${overall.toFixed(1)}%`} sub={`${fmtNum(totPlaced)} of ${fmtNum(totInq)} inquiries`} accent={C.mint} icon={TrendingUp} />
                      <StatCard label="Inquiries" value={fmtNum(totInq)} sub="in window" accent={C.violetGlow} icon={Package} />
                      <StatCard label="Placed" value={fmtNum(totPlaced)} sub="orders from inquiries" accent={C.mint} icon={Star} />
                    </div>
                    <div className="rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                      {rows.slice().sort((a, b) => (b.inq ? b.placed / b.inq : 0) - (a.inq ? a.placed / a.inq : 0)).map((r) => {
                        const pct = r.inq ? (r.placed / r.inq) * 100 : 0;
                        return (
                          <div key={r.profile} className="mb-3 last:mb-0">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span style={{ color: C.text }}>{r.profile}</span>
                              <span className="font-mono" style={{ color: C.textMuted }}>{pct.toFixed(1)}% · {r.placed}/{r.inq}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full" style={{ background: C.border }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${((r.inq ? r.placed / r.inq : 0) / maxRate) * 100}%`, background: C.mint }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* ── Designer Production · LIVE from ClickUp (no retrofit) ── */}
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                  Designer Production <span className="font-normal" style={{ color: C.textDim }}>· throughput · revision load · SLA</span>
                </h3>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>by designer · ClickUp (live)</span>
              </div>
              {designerProd.length === 0 ? (
                <div className="rounded-xl p-5 text-xs" style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.textMuted }}>
                  No designer data yet — run the Apps Script sync; it writes the Designer Production tab straight from ClickUp. No retrofit needed.
                </div>
              ) : (() => {
                const n = (v) => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
                const rows = designerProd
                  .map((r) => ({ designer: r.Designer || '', tasks: n(r.Tasks), inProgress: n(r['In Progress']), inRevision: n(r['In Revision']), awaiting: n(r['Awaiting Client']), completed: n(r.Completed), revisions: n(r.Revisions), sla: n(r['SLA Breaches']) }))
                  .filter((r) => r.designer)
                  .sort((a, b) => b.tasks - a.tasks);
                return (
                  <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.border}` }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: C.bgRaised }}>
                          {['Designer', 'Tasks', 'In Progress', 'In Revision', 'Awaiting', 'Completed', 'Revisions', 'SLA'].map((h, i) => (
                            <th key={h} className={`px-3 py-2 font-semibold uppercase ${i < 1 ? 'text-left' : 'text-right'}`} style={{ color: C.textDim, fontSize: '10px', letterSpacing: '0.1em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td className="px-3 py-2" style={{ color: C.text }}>{r.designer}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.text }}>{r.tasks}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.textMuted }}>{r.inProgress}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: r.inRevision > 0 ? C.violetGlow : C.textMuted }}>{r.inRevision}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.textMuted }}>{r.awaiting}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.mint }}>{r.completed}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.textMuted }}>{r.revisions}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: r.sla > 0 ? C.coral : C.textMuted }}>{r.sla}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* ── Production · CSR × Profile (from ClickUp) ── */}
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                  Production <span className="font-normal" style={{ color: C.textDim }}>· deliveries · revisions · SLA</span>
                </h3>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>CSR × profile · ClickUp</span>
              </div>
              {production.length === 0 ? (
                <div className="rounded-xl p-5 text-xs" style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.textMuted }}>
                  No production data yet — add the ClickUp CSR/Profile fields, deploy the status webhook, then run the sync. (See DEPLOY.md.)
                </div>
              ) : (() => {
                const n = (v) => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
                const rows = production
                  .map((r) => ({ profile: r.Profile || '', csr: r.CSR || '', shift: r.Shift || '', orders: n(r.Orders), deliveries: n(r.Deliveries), revisions: n(r.Revisions), sla: n(r['SLA Breaches']) }))
                  .filter((r) => r.csr || r.profile)
                  .sort((a, b) => b.orders - a.orders || b.deliveries - a.deliveries);
                return (
                  <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.border}` }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: C.bgRaised }}>
                          {['Profile', 'CSR', 'Shift', 'Orders', 'Deliveries', 'Revisions', 'SLA'].map((h, i) => (
                            <th key={h} className={`px-3 py-2 font-semibold uppercase ${i < 3 ? 'text-left' : 'text-right'}`} style={{ color: C.textDim, fontSize: '10px', letterSpacing: '0.1em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td className="px-3 py-2" style={{ color: C.textMuted }}>{r.profile}</td>
                            <td className="px-3 py-2" style={{ color: C.text }}>{r.csr}</td>
                            <td className="px-3 py-2" style={{ color: C.textMuted }}>{r.shift}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.text }}>{r.orders}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.text }}>{r.deliveries}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.text }}>{r.revisions}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: r.sla > 0 ? C.coral : C.textMuted }}>{r.sla}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* (Recent orders section removed — use Order Log tab) */}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            COMPLETIONS TAB — orders closed within the window
            (filtered by completion date, not order date)
           ════════════════════════════════════════════════════ */}
        {tab === 'completions' && (
          <>
            <div className="mb-3 rounded-xl p-1 flex items-center gap-1 flex-wrap"
                 style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <DateRangePicker
                label="Completed on"
                dateRange={dateRange} setDateRange={setDateRange}
                customStart={customStart} customEnd={customEnd}
                setCustomStart={setCustomStart} setCustomEnd={setCustomEnd}
                windowStart={window_.start} windowEnd={window_.end}
              />
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                  {completionKpis.count} completions · {window_.label}
                </span>
                <button onClick={() => exportPDF('completions')}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: C.violet, color: '#FFFFFF' }}>
                  <Download size={12} strokeWidth={2.5} /> Export PDF
                </button>
              </div>
            </div>

            <div className="mb-6 rounded-xl p-3 flex flex-wrap items-center gap-2"
                 style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <select value={fCSR} onChange={e=>setFCSR(e.target.value)}
                      className="rounded-md px-2 py-1 text-xs"
                      style={{ background:C.bgRaised, color:C.text, border:`1px solid ${C.border}` }}>
                <option value="all">All CSRs</option>
                {roster.filter(c=>c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select value={fShift} onChange={e=>setFShift(e.target.value)}
                      className="rounded-md px-2 py-1 text-xs"
                      style={{ background:C.bgRaised, color:C.text, border:`1px solid ${C.border}` }}>
                <option value="all">All shifts</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
              <select value={fProfile} onChange={e=>setFProfile(e.target.value)}
                      className="rounded-md px-2 py-1 text-xs"
                      style={{ background:C.bgRaised, color:C.text, border:`1px solid ${C.border}` }}>
                <option value="all">All profiles</option>
                {profiles.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={fType} onChange={e=>setFType(e.target.value)}
                      className="rounded-md px-2 py-1 text-xs"
                      style={{ background:C.bgRaised, color:C.text, border:`1px solid ${C.border}` }}>
                <option value="all">All types</option>
                <option value="VVRO">VVRO</option>
                <option value="ORGANIC">ORGANIC</option>
              </select>
              {(fCSR !== 'all' || fShift !== 'all' || fProfile !== 'all' || fType !== 'all') && (
                <button onClick={() => { setFCSR('all'); setFShift('all'); setFProfile('all'); setFType('all'); }}
                        className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all hover:opacity-90"
                        style={{ background:'transparent', color:C.coral, border:`1px solid ${C.coral}` }}>
                  Clear filters
                </button>
              )}
            </div>

            {/* Debug breakdown removed per user — not surfaced in normal use. */}

            {/* ══ DATA QUALITY — rows that imported with soft advisories
                 (blank or unknown CSR). Shows the source sheet + row so
                 you can jump to the spreadsheet and fix it. ══ */}
            {dataIssueSummary.total > 0 && (
              <div className="mb-6 rounded-xl"
                   style={{ background: C.bgCard, border: `1px solid ${C.amber}55` }}>
                <div className="flex items-center justify-between border-b px-4 py-2.5"
                     style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} style={{ color: C.amber }}/>
                    <span className="text-sm font-semibold" style={{ color: C.text }}>
                      Data quality · {dataIssueSummary.total} rows need attention
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: C.textMuted }}>
                    {dataIssueSummary.noCsr > 0 && (
                      <span><span style={{ color: C.amber, fontWeight: 600 }}>{dataIssueSummary.noCsr}</span> missing CSR</span>
                    )}
                    {dataIssueSummary.unknownCsr > 0 && (
                      <span><span style={{ color: C.coral, fontWeight: 600 }}>{dataIssueSummary.unknownCsr}</span> unknown CSR</span>
                    )}
                    <span style={{ color: C.textDim }}>open the listed sheet and jump to the row</span>
                  </div>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0" style={{ background: C.bgCard }}>
                      <tr style={{ color: C.textDim }}>
                        <th className="px-3 py-2 text-left">Sheet</th>
                        <th className="px-3 py-2 text-right">Row</th>
                        <th className="px-3 py-2 text-left">Project</th>
                        <th className="px-3 py-2 text-left">Issue</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataIssues.map(o => {
                        const adv = o.advisories.includes('no_csr')
                          ? <span style={{ color: C.amber, fontWeight: 600 }}>Missing CSR</span>
                          : <span style={{ color: C.coral, fontWeight: 600 }}>
                              Unknown CSR{o.csrRaw ? `: "${o.csrRaw}"` : ''}
                            </span>;
                        return (
                          <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td className="px-3 py-2 font-semibold">{o.profile}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: C.textMuted }}>{o.sheetRow}</td>
                            <td className="px-3 py-2">{o.project || '—'}</td>
                            <td className="px-3 py-2">{adv}</td>
                            <td className="px-3 py-2" style={{ color: isCompletedStatus(o.status) ? C.mint : C.textMuted }}>{o.status}</td>
                            <td className="px-3 py-2" style={{ color: C.textMuted }}>{o.type}</td>
                            <td className="px-3 py-2 text-right font-semibold">{fmtUSD(o.price || 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mb-6 grid grid-cols-4 gap-3">
              <StatCard label="Completed orders" value={fmtNum(completionKpis.count)} sub={`AOV ${fmtUSDc(completionKpis.aov)}`} accent={C.mint}        icon={Package}/>
              <StatCard label="Completed revenue" value={fmtUSD(completionKpis.total)} sub={completionKpis.tips > 0 ? `incl. ${fmtUSD(completionKpis.tips)} tips` : 'no tips this window'} accent={C.violetGlow} icon={DollarSign}/>
              <StatCard label="VVRO completed"      value={fmtUSD(completionKpis.vvroRev)} sub={`${fmtNum(completionKpis.vvro)} orders · ${completionKpis.vvroMix.toFixed(0)}% of rev`} accent={C.mint} icon={TrendingUp}/>
              <StatCard label="Organic completed"   value={fmtUSD(completionKpis.orgnRev)} sub={`${fmtNum(completionKpis.orgn)} orders · ${(100-completionKpis.vvroMix).toFixed(0)}% of rev`} accent={C.violetGlow} icon={Star}/>
            </div>

            {/* Shift breakdown */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {completionShifts.map(s => {
                const sc = s.name === 'Morning' ? C.amber : s.name === 'Evening' ? C.cyan : C.violet;
                return (
                  <div key={s.name} className="rounded-xl p-4"
                       style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                    <div className="mb-2 flex items-center gap-2">
                      <Clock size={12} style={{ color: sc }}/>
                      <span className="text-sm font-semibold" style={{ color: sc }}>{s.name}</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: C.text }}>{fmtUSD(s.revenue)}</div>
                    <div className="mt-1 text-xs" style={{ color: C.textMuted }}>
                      {s.count} completed · {s.vvro} VVRO · {s.orgn} Organic
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leaderboard + Profile */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} style={{ color: C.amber }}/>
                    <span className="text-sm font-semibold">Closers (by completion count)</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                    {completionByCSR.length} closers
                  </span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: C.textDim }}>
                      <th className="px-1 py-2 text-left">#</th>
                      <th className="px-1 py-2 text-left">CSR</th>
                      <th className="px-3 py-2 text-left">Shift</th>
                      <th className="px-3 py-2 text-right">Completed</th>
                      <th className="px-3 py-2 text-right">VVRO</th>
                      <th className="px-3 py-2 text-right">Organic</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completionByCSR.length === 0 && (
                      <tr><td colSpan={7} className="px-2 py-4 text-center" style={{ color: C.textDim }}>
                        No completions in this window
                      </td></tr>
                    )}
                    {completionByCSR.map((e, i) => (
                      <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td className="px-1 py-2" style={{ color: i < 3 ? C.violet : C.textDim, fontWeight: i < 3 ? 600 : 400 }}>
                          {String(i+1).padStart(2,'0')}
                        </td>
                        <td className="px-1 py-2 font-semibold">{e.name}</td>
                        <td className="px-3 py-2" style={{ color: C.textMuted }}>{e.shift || '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold">{e.count}</td>
                        <td className="px-3 py-2 text-right mono" style={{ color: C.mint }}>{e.vvro}</td>
                        <td className="px-3 py-2 text-right mono" style={{ color: C.violetGlow }}>{e.orgn}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtUSD(e.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="mb-3 flex items-center gap-2">
                  <Package size={14} style={{ color: C.violet }}/>
                  <span className="text-sm font-semibold">By profile</span>
                </div>
                <div className="space-y-3">
                  {completionByProfile.map(p => {
                    const max = completionByProfile[0]?.count || 1;
                    const pct = max > 0 ? (p.count / max) : 0;
                    const isZero = p.count === 0;
                    return (
                      <div key={p.profile}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span style={{ color: isZero ? C.textDim : C.text, fontWeight: isZero ? 400 : 600 }}>{p.profile}</span>
                          <span style={{ color: isZero ? C.textDim : C.textMuted }}>
                            {isZero ? '— no closes' : `${p.count} · ${fmtUSD(p.revenue)}`}
                          </span>
                        </div>
                        <div className="h-1 rounded" style={{ background: C.border }}>
                          {!isZero && <div className="h-1 rounded" style={{ background: C.violet, width: `${pct*100}%` }}/>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ══ CANCELLATIONS — same window, filtered by order date ══ */}
            <div className="mt-8 mb-3 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.coral }}>
                  Cancellations
                </div>
                <div className="text-lg font-bold" style={{ color: C.text }}>
                  Status = Cancelled · by order date
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                {cancelledKpis.count} cancellations · {window_.label}
              </span>
            </div>

            <div className="mb-6 grid grid-cols-4 gap-3">
              <StatCard label="Cancellations"      value={fmtNum(cancelledKpis.count)} sub={`in ${window_.label.toLowerCase()}`} accent={C.coral}      icon={Package}/>
              <StatCard label="Lost order value"   value={fmtUSD(cancelledKpis.lostValue)} sub="from cancelled orders"           accent={C.coral}      icon={DollarSign}/>
              <StatCard label="VVRO cancelled"     value={fmtUSD(cancelledKpis.vvroVal)} sub={`${fmtNum(cancelledKpis.vvro)} orders`} accent={C.mint}    icon={TrendingUp}/>
              <StatCard label="Organic cancelled"  value={fmtUSD(cancelledKpis.orgnVal)} sub={`${fmtNum(cancelledKpis.orgn)} orders`} accent={C.violetGlow} icon={Star}/>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
              {cancelledShifts.map(s => {
                const sc = s.name === 'Morning' ? C.amber : s.name === 'Evening' ? C.cyan : C.violet;
                return (
                  <div key={s.name} className="rounded-xl p-4"
                       style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                    <div className="mb-2 flex items-center gap-2">
                      <Clock size={12} style={{ color: sc }}/>
                      <span className="text-sm font-semibold" style={{ color: sc }}>{s.name}</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: C.text }}>{s.count}</div>
                    <div className="mt-1 text-xs" style={{ color: C.textMuted }}>
                      cancelled · {fmtUSD(s.lostValue)} lost · {s.vvro} VVRO · {s.orgn} Organic
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} style={{ color: C.coral }}/>
                    <span className="text-sm font-semibold">Cancellations by CSR</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                    {cancelledByCSR.length} CSRs
                  </span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: C.textDim }}>
                      <th className="px-1 py-2 text-left">#</th>
                      <th className="px-1 py-2 text-left">CSR</th>
                      <th className="px-3 py-2 text-left">Shift</th>
                      <th className="px-3 py-2 text-right">Cancelled</th>
                      <th className="px-3 py-2 text-right">Lost value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelledByCSR.length === 0 && (
                      <tr><td colSpan={5} className="px-2 py-4 text-center" style={{ color: C.textDim }}>
                        No cancellations in this window
                      </td></tr>
                    )}
                    {cancelledByCSR.map((e, i) => (
                      <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td className="px-1 py-2" style={{ color: i < 3 ? C.coral : C.textDim, fontWeight: i < 3 ? 600 : 400 }}>
                          {String(i+1).padStart(2,'0')}
                        </td>
                        <td className="px-1 py-2 font-semibold">{e.name}</td>
                        <td className="px-3 py-2" style={{ color: C.textMuted }}>{e.shift || '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold">{e.count}</td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ color: C.coral }}>{fmtUSD(e.lostValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="mb-3 flex items-center gap-2">
                  <Package size={14} style={{ color: C.coral }}/>
                  <span className="text-sm font-semibold">Cancelled by profile</span>
                </div>
                <div className="space-y-3">
                  {cancelledByProfile.map(p => {
                    const max = cancelledByProfile[0]?.count || 1;
                    const pct = max > 0 ? (p.count / max) : 0;
                    const isZero = p.count === 0;
                    return (
                      <div key={p.profile}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span style={{ color: isZero ? C.textDim : C.text, fontWeight: isZero ? 400 : 600 }}>{p.profile}</span>
                          <span style={{ color: isZero ? C.textDim : C.textMuted }}>
                            {isZero ? '— none' : `${p.count} · ${fmtUSD(p.lostValue)}`}
                          </span>
                        </div>
                        <div className="h-1 rounded" style={{ background: C.border }}>
                          {!isZero && <div className="h-1 rounded" style={{ background: C.coral, width: `${pct*100}%` }}/>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Per-cancellation detail — the profile and order behind each
                CSR's cancellations, grouped by CSR (most recent first). */}
            <div className="mt-4 rounded-xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-2">
                  <Package size={14} style={{ color: C.coral }}/>
                  <span className="text-sm font-semibold">Cancelled orders · by CSR</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                  {cancelled.length} order{cancelled.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0" style={{ background: C.bgCard }}>
                    <tr style={{ color: C.textDim }} className="text-[10px] uppercase tracking-wider">
                      <th className="px-4 py-2 text-left">CSR</th>
                      <th className="px-4 py-2 text-left">Profile</th>
                      <th className="px-4 py-2 text-left">Order</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Lost value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelled.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: C.textDim }}>
                        No cancellations in this window
                      </td></tr>
                    )}
                    {cancelled
                      .slice()
                      .sort((a, b) =>
                        (a.csrName || '').localeCompare(b.csrName || '') ||
                        new Date(b.timestamp) - new Date(a.timestamp))
                      .map(o => (
                        <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td className="px-4 py-2 font-semibold">{o.csrName}</td>
                          <td className="px-4 py-2">{o.profile}</td>
                          <td className="px-4 py-2" style={{ color: C.textMuted }}>
                            {o.project && o.project !== '—' ? o.project
                              : o.client && o.client !== '—' ? o.client
                              : o.orderRef}
                          </td>
                          <td className="px-4 py-2">
                            <Pill color={o.type === 'VVRO' ? C.mint : C.violetGlow}>{o.type}</Pill>
                          </td>
                          <td className="mono px-4 py-2 text-[10px]" style={{ color: C.textMuted }}>
                            {businessDay(o.timestamp)}
                          </td>
                          <td className="mono px-4 py-2 text-right font-semibold" style={{ color: C.coral }}>
                            {fmtUSD(o.price || 0)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════
            LOG TAB
           ════════════════════════════════════════════════════ */}
        {tab === 'log' && (
          <div className="rounded-xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: C.border }}>
              <span className="text-sm font-semibold">Order log · {filtered.length} orders</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md px-2 py-1"
                     style={{ background: C.bgRaised, border: `1px solid ${C.border}` }}>
                  <Search size={12} style={{ color: C.textDim }}/>
                  <input value={searchOrder} onChange={e=>setSearchOrder(e.target.value)}
                         placeholder="Client, ref, project…"
                         className="bg-transparent text-xs outline-none"
                         style={{ color: C.text, width: 200 }}/>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: C.textDim }} className="text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Profile</th>
                    <th className="px-4 py-2 text-left">Client</th>
                    <th className="px-4 py-2 text-left">Project</th>
                    <th className="px-4 py-2 text-left">Industry</th>
                    <th className="px-4 py-2 text-left">CSR</th>
                    <th className="px-4 py-2 text-left">Shift</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Tip</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .filter(o => !searchOrder || (
                      o.client.toLowerCase().includes(searchOrder.toLowerCase()) ||
                      o.orderRef.toLowerCase().includes(searchOrder.toLowerCase()) ||
                      o.project.toLowerCase().includes(searchOrder.toLowerCase())
                    ))
                    .slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))
                    .map(o => (
                        <tr key={o.id} className="group border-t transition-colors hover:bg-white/[0.02]"
                            style={{ borderColor: C.border }}>
                          <td className="mono px-4 py-2 text-[10px]" style={{ color: C.textMuted }}>
                            {businessDay(o.timestamp)}
                          </td>
                          <td className="px-4 py-2">{o.profile}</td>
                          <td className="px-4 py-2">{o.client}</td>
                          <td className="px-4 py-2" style={{ color: C.textMuted }}>{o.project}</td>
                          <td className="px-4 py-2" style={{ color: C.textMuted }}>{o.industry}</td>
                          <td className="px-4 py-2">{o.csrName}</td>
                          <td className="px-4 py-2"><Pill color={SHIFT_COLORS[o.shiftAtTime]}>{o.shiftAtTime}</Pill></td>
                          <td className="px-4 py-2"><Pill color={o.type==='VVRO'?C.mint:C.violetGlow}>{o.type}</Pill></td>
                          <td className="px-4 py-2" style={{ color: C.textMuted }}>{o.status}</td>
                          <td className="mono px-4 py-2 text-right font-semibold">{fmtUSDc(o.price)}</td>
                          <td className="mono px-4 py-2 text-right" style={{ color: o.tip ? C.mint : C.textDim }}>
                            {o.tip ? fmtUSDc(o.tip) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => setOrders(orders.filter(x=>x.id!==o.id))}
                                    className="rounded p-1 opacity-0 transition-opacity hover:bg-white/5 group-hover:opacity-100"
                                    style={{ color: C.coral }}>
                              <Trash2 size={12}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="px-5 py-12 text-center text-xs" style={{ color: C.textDim }}>
                  No orders match the current filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            ROSTER TAB
           ════════════════════════════════════════════════════ */}
        {tab === 'roster' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="disp text-lg font-semibold">Team roster</h2>
                <p className="mt-1 text-xs" style={{ color: C.textMuted }}>
                  Shift changes apply only to orders going forward · Archived members keep their history
                </p>
              </div>
              <button onClick={openAddPerson}
                      className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all"
                      style={{ background: C.violet, color: '#fff' }}>
                <Plus size={12} strokeWidth={2.5}/> Add person
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {roster.map(c => (
                <div key={c.id} className="rounded-xl p-4 transition-all"
                     style={{
                       background: c.active ? C.bgCard : C.bgRaised,
                       border: `1px solid ${C.border}`,
                       opacity: c.active ? 1 : 0.55,
                     }}>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Pill color={c.role==='Manager'?C.amber:C.cyan}>{c.role}</Pill>
                        {!c.active && <Pill color={C.coral}>Archived</Pill>}
                      </div>
                    </div>
                    <button onClick={() => toggleArchive(c.id)}
                            className="rounded p-1.5 transition-colors hover:bg-white/5"
                            style={{ color: c.active ? C.textDim : C.mint }}>
                      {c.active ? <Archive size={14}/> : <ArchiveRestore size={14}/>}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>Shift</span>
                    <select value={c.shift} disabled={!c.active}
                            onChange={e => changeShift(c.id, e.target.value)}
                            className="rounded-md px-2 py-1 text-xs disabled:opacity-50"
                            style={{ background: C.bgRaised, color: SHIFT_COLORS[c.shift], border:`1px solid ${C.border}`, fontWeight: 600 }}>
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {shiftHistory.length > 0 && (
              <div className="mt-6 rounded-xl" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="border-b px-5 py-3" style={{ borderColor: C.border }}>
                  <span className="text-sm font-semibold">Shift change history</span>
                </div>
                <div className="divide-y" style={{ borderColor: C.border }}>
                  {shiftHistory.slice().reverse().map((h, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3 text-xs"
                         style={{ borderTop: i ? `1px solid ${C.border}` : 'none' }}>
                      <span>{h.name}</span>
                      <span className="mono" style={{ color: C.textMuted }}>
                        <span style={{ color: SHIFT_COLORS[h.from] }}>{h.from}</span>
                        {' → '}
                        <span style={{ color: SHIFT_COLORS[h.to] }}>{h.to}</span>
                      </span>
                      <span className="mono" style={{ color: C.textDim }}>{h.changedOn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            CALCULATOR TAB — all-time profit/loss roll-up
            Auto:   CC Without 20% Fiverr (sum of imported order amounts per profile)
            Const:  Seller Plus = $49 per profile
            Manual: VVRO Cost, Ads per profile; Expenses total
           ════════════════════════════════════════════════════ */}
        {tab === 'calculator' && (() => {
          const setVvro = (profile, val) =>
            setCalcInputs(prev => ({ ...prev, vvroCost: { ...prev.vvroCost, [profile]: val } }));
          const setAds = (profile, val) =>
            setCalcInputs(prev => ({ ...prev, ads: { ...prev.ads, [profile]: val } }));
          const b2bList = Array.isArray(calcInputs.b2b) ? calcInputs.b2b : [];
          const addB2B = () =>
            setCalcInputs(prev => ({ ...prev, b2b: [...(prev.b2b || []), { id: `b2b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: '', amount: '' }] }));
          const updateB2B = (id, field, value) =>
            setCalcInputs(prev => ({ ...prev, b2b: (prev.b2b || []).map(e => e.id === id ? { ...e, [field]: value } : e) }));
          const removeB2B = (id) =>
            setCalcInputs(prev => ({ ...prev, b2b: (prev.b2b || []).filter(e => e.id !== id) }));
          const numInputStyle = {
            background: C.bgRaised, color: C.text,
            border: `1px solid ${C.border}`, width: '100%',
            textAlign: 'right', fontFamily: 'inherit',
          };
          const cellMoney = (n, color) => (
            <span style={{ color: color || (n < 0 ? C.coral : C.text) }}>{fmtUSD(n)}</span>
          );
          return (
            <>
              <div className="mb-3 rounded-xl p-1 flex items-center gap-1 flex-wrap"
                   style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <DateRangePicker
                  label="Completed on"
                  dateRange={dateRange} setDateRange={setDateRange}
                  customStart={customStart} customEnd={customEnd}
                  setCustomStart={setCustomStart} setCustomEnd={setCustomEnd}
                  windowStart={window_.start} windowEnd={window_.end}
                />
                <div className="ml-auto flex items-center gap-3 px-2">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                    {calculator.rows.length} profiles · {window_.label}
                  </span>
                  <span className="text-[11px]" style={{ color: C.textMuted }}>
                    Fiverr 20% · Seller Plus ${SELLER_PLUS}/profile
                  </span>
                  <button
                    onClick={() => {
                      if (calcClearArmed) {
                        setCalcInputs({ vvroCost: {}, ads: {}, expenses: '', b2b: [] });
                        setCalcClearArmed(false);
                      } else {
                        setCalcClearArmed(true);
                        setTimeout(() => setCalcClearArmed(false), 3000);
                      }
                    }}
                    title="Clear every VVRO cost, Ads and Expenses input"
                    className="rounded-md px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90"
                    style={{
                      background: calcClearArmed ? C.coral : 'transparent',
                      color: calcClearArmed ? '#FFFFFF' : C.coral,
                      border: `1px solid ${C.coral}`,
                    }}>
                    {calcClearArmed ? 'Click again to clear' : 'Clear'}
                  </button>
                </div>
              </div>

              <div className="mb-6 rounded-xl overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ color: C.textDim, background: C.bgRaised }} className="text-[10px] uppercase tracking-wider">
                        <th className="px-3 py-2 text-left">Profile</th>
                        <th className="px-3 py-2 text-right">CC w/o 20% Fiverr</th>
                        <th className="px-3 py-2 text-right">CC after 20%</th>
                        <th className="px-3 py-2 text-right" style={{ color: C.violet }}>VVRO cost</th>
                        <th className="px-3 py-2 text-right">Remaining</th>
                        <th className="px-3 py-2 text-right" style={{ color: C.violet }}>Ads</th>
                        <th className="px-3 py-2 text-right">Remaining</th>
                        <th className="px-3 py-2 text-right">Seller Plus</th>
                        <th className="px-3 py-2 text-right">Net revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculator.rows.map(r => (
                        <tr key={r.profile} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td className="px-3 py-2 font-semibold" style={{ color: C.text }}>{r.profile}</td>
                          <td className="mono px-3 py-2 text-right" style={{ color: C.textMuted }}>{cellMoney(r.ccGross)}</td>
                          <td className="mono px-3 py-2 text-right">{cellMoney(r.ccAfter)}</td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={calcInputs.vvroCost[r.profile] ?? ''}
                              onChange={e => setVvro(r.profile, e.target.value)}
                              placeholder="0"
                              className="mono rounded-md px-2 py-1 text-xs outline-none"
                              style={numInputStyle}
                            />
                          </td>
                          <td className="mono px-3 py-2 text-right">{cellMoney(r.remAfterVvro)}</td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={calcInputs.ads[r.profile] ?? ''}
                              onChange={e => setAds(r.profile, e.target.value)}
                              placeholder="0"
                              className="mono rounded-md px-2 py-1 text-xs outline-none"
                              style={numInputStyle}
                            />
                          </td>
                          <td className="mono px-3 py-2 text-right">{cellMoney(r.remAfterAds)}</td>
                          <td className="mono px-3 py-2 text-right" style={{ color: C.textMuted }}>{fmtUSD(r.sellerPlus)}</td>
                          <td className="mono px-3 py-2 text-right font-semibold">{cellMoney(r.netRevenue, r.netRevenue >= 0 ? C.mint : C.coral)}</td>
                        </tr>
                      ))}
                      {calculator.rows.length === 0 && (
                        <tr><td colSpan={9} className="px-3 py-6 text-center" style={{ color: C.textDim }}>
                          No profiles yet — import some orders first.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── B2B — direct payments. No Fiverr cut, no VVRO / ads; the
                   full amount lands in our account. Each row keeps a project
                   name as a reminder of whose payment it is. ── */}
              <div className="mb-6 rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: C.violet }}>B2B</span>
                  <span className="mono text-sm font-bold" style={{ color: calculator.b2bTotal >= 0 ? C.mint : C.coral }}>
                    {fmtUSD(calculator.b2bTotal)}
                  </span>
                </div>
                <div className="mb-3 text-[11px]" style={{ color: C.textMuted }}>
                  Direct payments — no Fiverr cut, no VVRO or ads. Added straight to income.
                </div>

                {b2bList.length > 0 && (
                  <div className="mb-2 space-y-2">
                    {b2bList.map(e => (
                      <div key={e.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={e.name}
                          onChange={ev => updateB2B(e.id, 'name', ev.target.value)}
                          placeholder="Project / client name"
                          className="flex-1 rounded-md px-2 py-1 text-xs outline-none"
                          style={{ background: C.bgRaised, color: C.text, border: `1px solid ${C.border}` }}
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={e.amount}
                          onChange={ev => updateB2B(e.id, 'amount', ev.target.value)}
                          placeholder="0"
                          className="mono w-28 rounded-md px-2 py-1 text-xs text-right outline-none"
                          style={{ background: C.bgRaised, color: C.text, border: `1px solid ${C.border}` }}
                        />
                        <button onClick={() => removeB2B(e.id)} title="Remove this B2B payment"
                                className="rounded p-1 transition-colors hover:bg-black/5" style={{ color: C.textDim }}>
                          <X size={14}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={addB2B}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:opacity-90"
                        style={{ background: 'transparent', color: C.violet, border: `1px dashed ${C.borderHi}` }}>
                  <Plus size={12} strokeWidth={2.5}/> Add B2B payment
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                  <div className="mb-3 text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>Profile net revenue</div>
                  <div className="mono text-2xl font-bold" style={{ color: calculator.profileNetRevenue >= 0 ? C.mint : C.coral }}>
                    {fmtUSD(calculator.profileNetRevenue)}
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: C.textMuted }}>
                    sum of every profile's net revenue
                  </div>
                </div>

                <div className="rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                  <div className="mb-3 text-[10px] uppercase tracking-wider" style={{ color: C.violet }}>Expenses</div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={calcInputs.expenses || ''}
                    onChange={e => setCalcInputs(prev => ({ ...prev, expenses: e.target.value }))}
                    placeholder="0"
                    className="mono rounded-md px-3 py-2 text-2xl font-bold outline-none w-full"
                    style={{ background: C.bgRaised, color: C.text, border: `1px solid ${C.border}` }}
                  />
                  <div className="mt-1 text-[11px]" style={{ color: C.textMuted }}>
                    operating expenses for the period
                  </div>
                </div>

              </div>

              <div className="rounded-xl p-6"
                   style={{ background: `linear-gradient(135deg, ${C.violet}15, ${C.violetGlow}10)`, border: `1px solid ${C.violet}55` }}>
                <div className="mb-2 text-[10px] uppercase tracking-wider" style={{ color: C.violet }}>Overall income</div>
                <div className="mono text-4xl font-bold" style={{ color: calculator.overallIncome >= 0 ? C.mint : C.coral }}>
                  {fmtUSD(calculator.overallIncome)}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: C.textMuted }}>
                  profile net revenue + B2B − expenses
                </div>
              </div>
            </>
          );
        })()}

        {/* ════════════════════════════════════════════════════
            IMPORT TAB
           ════════════════════════════════════════════════════ */}
        {tab === 'import' && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-6">
              <h2 className="disp text-lg font-semibold">Sync data</h2>
              <p className="mt-1 text-xs" style={{ color: C.textMuted }}>
                Pull straight from Google Sheets (no upload needed), or fall back to manual XLSX / CSV import.
              </p>
              {HAS_SHARED_SYNC && (
                <div className="mt-3 flex items-start gap-2 rounded-lg p-3 text-[11px]"
                     style={{ background: C.violetBg, border: `1px solid ${C.borderHi}`, color: C.textMuted }}>
                  <CheckCircle2 size={14} style={{ color: C.violet, marginTop: 1, flexShrink: 0 }}/>
                  <span>
                    <span className="font-semibold" style={{ color: C.text }}>Auto-sync is on.</span> The dashboard pulls
                    the latest numbers from the shared Google Sheets automatically on every load, so everyone with the
                    link sees the same data. Use <span className="font-semibold" style={{ color: C.text }}>Sync now</span> below
                    any time to refresh and review the import log / data-quality issues.
                  </span>
                </div>
              )}
            </div>

            {/* PRIMARY: GOOGLE SHEETS AUTO-SYNC */}
            <div className="mb-4 rounded-xl p-6"
                 style={{
                   background: `linear-gradient(135deg, ${C.bgCard}, ${C.violetBg})`,
                   border: `1px solid ${C.borderHi}`,
                 }}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg"
                     style={{ background: C.violet }}>
                  <Cloud size={20} style={{ color: '#FFFFFF' }}/>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: C.text }}>Pull from Google Sheets</span>
                    <Pill color={C.violet}>Auto</Pill>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: C.textMuted }}>
                    Paste the share URL for each workbook (each must be set to <span className="font-semibold" style={{ color: C.text }}>"Anyone with the link can view"</span>). Click Sync — every profile tab is pulled and shown for review.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[0, 1].map(i => (
                  <div key={i}>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                           style={{ color: C.textDim }}>
                      <Link2 size={10} className="mr-1 inline" />
                      {i === 0 ? 'New Order Sheet URL' : 'Order Management Sheet URL'}
                    </label>
                    <input type="url"
                           value={syncConfig.workbookUrls[i]}
                           onChange={e => {
                             const next = [...syncConfig.workbookUrls];
                             next[i] = e.target.value;
                             setSyncConfig({ ...syncConfig, workbookUrls: next });
                           }}
                           placeholder="https://docs.google.com/spreadsheets/d/..."
                           className="mono w-full rounded-md px-3 py-2 text-xs outline-none"
                           style={{
                             background: C.bgCard, color: C.text,
                             border: `1px solid ${C.border}`,
                           }} />
                    <div className="mt-1.5 flex items-center gap-2">
                      <label className="text-[10px] font-semibold uppercase tracking-wider"
                             style={{ color: C.textDim }}>
                        First tab
                      </label>
                      <select value={syncConfig.firstTabs?.[i] || ''}
                              onChange={e => {
                                const next = [...(syncConfig.firstTabs || ['', ''])];
                                next[i] = e.target.value;
                                setSyncConfig({ ...syncConfig, firstTabs: next });
                              }}
                              className="rounded-md px-2 py-1 text-[11px] outline-none"
                              style={{
                                background: C.bgCard, color: C.text,
                                border: `1px solid ${C.border}`,
                              }}>
                        <option value="">— select —</option>
                        {profiles.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <span className="text-[10px]" style={{ color: C.textDim }}>
                        (left-most tab in this workbook)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[11px]" style={{ color: C.textMuted }}>
                  {lastSync ? (
                    <span>
                      <span style={{ color: lastSync.ok ? C.mint : C.coral }}>
                        {lastSync.ok ? '✓' : '✗'}
                      </span>
                      {' '}
                      <span className="mono">{new Date(lastSync.at).toLocaleString()}</span>
                      {' — '}
                      <span>{lastSync.message}</span>
                    </span>
                  ) : (
                    <span style={{ color: C.textDim }}>Not synced yet.</span>
                  )}
                </div>
                <button onClick={syncFromGSheets}
                        disabled={syncing || syncConfig.workbookUrls.every(u => !u.trim())}
                        className="flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                        style={{ background: C.violet, color: '#FFFFFF' }}>
                  <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
              </div>

              <details className="mt-3 text-[11px]" style={{ color: C.textMuted }}>
                <summary className="cursor-pointer" style={{ color: C.textDim }}>How to share a Google Sheet</summary>
                <ol className="mt-2 ml-4 list-decimal space-y-1">
                  <li>Open the Google Sheet</li>
                  <li>Click <span className="font-semibold" style={{ color: C.text }}>Share</span> (top right)</li>
                  <li>Under <span className="font-semibold" style={{ color: C.text }}>General access</span>, change to <span className="font-semibold" style={{ color: C.text }}>Anyone with the link</span> · Viewer</li>
                  <li>Click <span className="font-semibold" style={{ color: C.text }}>Copy link</span> and paste above</li>
                </ol>
              </details>
            </div>

            {/* SECONDARY: XLSX */}
            <div className="mb-4 rounded-xl p-6"
                 style={{
                   background: `linear-gradient(135deg, ${C.bgCard}, ${C.violetBg})`,
                   border: `1px solid ${C.borderHi}`,
                 }}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg"
                     style={{ background: C.violet }}>
                  <FileSpreadsheet size={20} style={{ color: '#FFFFFF' }}/>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: C.text }}>Manual: drop Excel files</span>
                    <Pill color={C.textDim}>Fallback</Pill>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: C.textMuted }}>
                    In Google Sheets → File → Download → Microsoft Excel (.xlsx) for each sheet. Use this when auto-sync isn't an option (sheets are private, etc.).
                  </p>
                </div>
              </div>

              <div className="rounded-lg border-2 border-dashed p-8 text-center transition-all"
                   style={{ borderColor: C.borderHi, background: C.bgCard }}>
                <Upload size={24} className="mx-auto mb-3" style={{ color: C.violet }}/>
                <div className="mb-3 text-xs" style={{ color: C.textMuted }}>Drop .xlsx files here (1 or 2)</div>
                <input type="file" accept=".xlsx,.xls" ref={fileRef} multiple
                       onChange={e => e.target.files && handleFiles(e.target.files)}
                       className="hidden"/>
                <button onClick={() => fileRef.current?.click()}
                        className="rounded-md px-4 py-2 text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: C.violet, color: '#FFFFFF' }}>
                  Choose Excel files
                </button>
              </div>
            </div>

            {/* SECONDARY: CSV */}
            <details className="rounded-xl"
                     style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <summary className="cursor-pointer list-none px-5 py-3 text-xs font-medium"
                       style={{ color: C.textMuted }}>
                <ChevronDown size={12} className="mr-2 inline" />
                Or use CSV files (one per tab)
              </summary>
              <div className="border-t px-5 py-4" style={{ borderColor: C.border }}>
                <ol className="mb-4 space-y-1.5 text-xs" style={{ color: C.textMuted }}>
                  <li><span className="mono mr-2" style={{ color: C.violetGlow }}>01</span> Export each tab → File → Download → .csv</li>
                  <li><span className="mono mr-2" style={{ color: C.violetGlow }}>02</span> Rename each file to match the tab (e.g. <span className="mono" style={{ color: C.mint }}>Dygram Designs.csv</span>)</li>
                  <li><span className="mono mr-2" style={{ color: C.violetGlow }}>03</span> Select all 10 CSVs at once below</li>
                </ol>
                <input type="file" multiple accept=".csv" id="csv-input"
                       onChange={e => e.target.files && handleFiles(e.target.files)}
                       className="hidden"/>
                <button onClick={() => document.getElementById('csv-input')?.click()}
                        className="rounded-md px-3 py-2 text-xs font-medium"
                        style={{ background: C.bgRaised, color: C.textMuted, border: `1px solid ${C.border}` }}>
                  Choose CSV files
                </button>
              </div>
            </details>

            <div className="mt-6 space-y-2 rounded-xl p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <div className="text-xs" style={{ color: C.textDim }}>
                <span className="mono mr-2" style={{ color: C.mint }}>Required columns</span>
                <span style={{ color: C.textMuted }}>Date of Order · Order Type · Status · CSR · Order Amount · Tip</span>
              </div>
              <div className="text-xs" style={{ color: C.textDim }}>
                <span className="mono mr-2" style={{ color: C.cyan }}>Profile tabs</span>
                <span style={{ color: C.textMuted }}>{profiles.join(' · ')}</span>
              </div>
              <div className="text-xs" style={{ color: C.textDim }}>
                <span className="mono mr-2" style={{ color: C.amber }}>Ignored</span>
                <span style={{ color: C.textMuted }}>Logo Designer, Branding Designer, Notes, DOC, Earnings, Ratings, plus any tab not in the profile list (Monthly, Email Logs, etc.)</span>
              </div>
            </div>

            {/* Reset zone */}
            <div className="mt-6 rounded-xl p-4"
                 style={{ background: C.coralBg, border: `1px solid ${C.coral}30` }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold" style={{ color: C.coral }}>Reset all data</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: C.textMuted }}>
                    Currently storing <span className="mono font-semibold" style={{ color: C.text }}>{orders.length}</span> orders.
                    Clear them all if numbers look wrong, then re-import fresh.
                  </div>
                </div>
                <button onClick={() => setResetConfirmOpen(true)}
                        className="shrink-0 rounded-md px-3 py-2 text-xs font-semibold"
                        style={{ background: C.coral, color: '#FFFFFF' }}>
                  Clear all orders
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════
          IMPORT PREVIEW MODAL
         ════════════════════════════════════════════════════ */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
             style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl"
               style={{ background: C.bgRaised, border: `1px solid ${C.borderHi}` }}>
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor: C.border }}>
              <div>
                <div className="text-sm font-semibold">Import preview</div>
                <div className="mt-0.5 text-xs" style={{ color: C.textMuted }}>
                  <span className="mono" style={{ color: C.mint }}>{importPreview.rows.length}</span> orders ready ·{' '}
                  <span className="mono" style={{ color: importPreview.issues.length ? C.coral : C.textDim }}>
                    {importPreview.issues.length}
                  </span> issues ·{' '}
                  <span className="mono" style={{ color: C.cyan }}>
                    {importPreview.tabsRead?.filter(t => t.matched).length || 0}
                  </span> profile tabs
                </div>
                {importPreview.skipReasonCounts && (importPreview.skipReasonCounts.pre_cutoff || 0) > 0 && (
                  <div className="mt-1 text-[10px]" style={{ color: C.textDim }}>
                    Silently skipped: {importPreview.skipReasonCounts.pre_cutoff} pre-cutoff (out of analytics window)
                  </div>
                )}
              </div>
              <button onClick={() => setImportPreview(null)} className="rounded p-1 hover:bg-white/5">
                <X size={16} style={{ color: C.textMuted }}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">

            {/* Tabs detected — grouped by file */}
            {importPreview.tabsRead && importPreview.tabsRead.length > 0 && (() => {
              const byFile = {};
              importPreview.tabsRead.forEach(t => {
                if (!byFile[t.file]) byFile[t.file] = [];
                byFile[t.file].push(t);
              });
              return (
                <div className="border-b px-5 py-3" style={{ borderColor: C.border, background: `${C.cyan}05` }}>
                  <div className="mb-2 text-[10px] uppercase tracking-wider" style={{ color: C.textDim }}>
                    Tabs detected
                  </div>
                  {Object.entries(byFile).map(([file, tabs]) => (
                    <div key={file} className="mb-2 last:mb-0">
                      <div className="mono mb-1 text-[10px]" style={{ color: C.textMuted }}>{file}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {tabs.map((t, i) => (
                          <span key={i}
                                className="mono rounded px-2 py-0.5 text-[10px]"
                                style={{
                                  background: t.matched ? `${C.mint}15` : `${C.textDim}10`,
                                  color: t.matched ? C.mint : C.textDim,
                                  border: `1px solid ${t.matched ? C.mint : C.border}30`,
                                  textDecoration: t.matched ? 'none' : 'line-through',
                                }}>
                            {t.name} · {t.rows}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 text-[10px]" style={{ color: C.textDim }}>
                    <span style={{ color: C.mint }}>Green</span> = profile tab imported ·{' '}
                    <span style={{ color: C.textDim, textDecoration: 'line-through' }}>strikethrough</span> = ignored
                  </div>
                </div>
              );
            })()}

            {/* Unknown CSRs panel */}
            {importPreview.unknownCSRs && importPreview.unknownCSRs.length > 0 && (
              <div className="border-b px-5 py-3"
                   style={{ borderColor: C.border, background: `${C.amber}08` }}>
                <div className="mb-2 flex items-center gap-2">
                  <Users size={12} style={{ color: C.amber }}/>
                  <span className="text-xs font-semibold" style={{ color: C.amber }}>
                    {importPreview.unknownCSRs.length} unknown CSR{importPreview.unknownCSRs.length === 1 ? '' : 's'} in sheet
                  </span>
                </div>
                <div className="mb-2 text-[10px]" style={{ color: C.textMuted }}>
                  These names appeared in the CSR column but don't match anyone in the roster. Most are likely designers or typos.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {importPreview.unknownCSRs.map(([name, count], i) => (
                    <span key={i}
                          className="mono rounded px-2 py-0.5 text-[10px]"
                          style={{ background: `${C.amber}15`, color: C.amber, border: `1px solid ${C.amber}30` }}>
                      {name} <span style={{ opacity: 0.6 }}>×{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {importPreview.issues.length > 0 && (() => {
              const droppedCount = importPreview.issues.filter(i => !i.included).length;
              const includedCount = importPreview.issues.filter(i => i.included).length;
              const downloadLog = () => {
                const header = 'Sheet\tRow\tStatus\tIssue';
                const lines = importPreview.issues.map(i =>
                  `${i.profile}\t${i.row}\t${i.included ? 'Included' : 'Dropped'}\t${i.reason}`
                );
                const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/tab-separated-values' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `import-log-${new Date().toISOString().slice(0,10)}.tsv`;
                a.click();
                URL.revokeObjectURL(url);
              };
              return (
                <div className="border-b" style={{ borderColor: C.border, background: `${C.coral}08` }}>
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} style={{ color: C.coral }}/>
                      <span className="text-xs font-semibold" style={{ color: C.text }}>
                        Import log · {importPreview.issues.length} issue{importPreview.issues.length === 1 ? '' : 's'}
                      </span>
                      <span className="text-[10px]" style={{ color: C.textMuted }}>
                        {droppedCount > 0 && <><span style={{ color: C.coral, fontWeight: 600 }}>{droppedCount}</span> dropped</>}
                        {droppedCount > 0 && includedCount > 0 && ' · '}
                        {includedCount > 0 && <><span style={{ color: C.amber, fontWeight: 600 }}>{includedCount}</span> included with warning</>}
                      </span>
                    </div>
                    <button onClick={downloadLog}
                            className="rounded px-2 py-1 text-[10px] font-semibold"
                            style={{ background: `${C.cyan}15`, color: C.cyan, border: `1px solid ${C.cyan}40` }}>
                      Download log (.tsv)
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto px-5 pb-3">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0" style={{ background: C.bgRaised }}>
                        <tr style={{ color: C.textDim }} className="text-[9px] uppercase tracking-wider">
                          <th className="px-2 py-1 text-left">Sheet</th>
                          <th className="px-2 py-1 text-right">Row</th>
                          <th className="px-2 py-1 text-left">Status</th>
                          <th className="px-2 py-1 text-left">Issue</th>
                        </tr>
                      </thead>
                      <tbody className="mono">
                        {importPreview.issues.map((iss, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td className="px-2 py-1" style={{ color: C.text }}>{iss.profile}</td>
                            <td className="px-2 py-1 text-right" style={{ color: C.textMuted }}>{iss.row}</td>
                            <td className="px-2 py-1" style={{ color: iss.included ? C.amber : C.coral, fontWeight: 600 }}>
                              {iss.included ? 'Included' : 'Dropped'}
                            </td>
                            <td className="px-2 py-1" style={{ color: C.textMuted }}>{iss.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <div className="max-h-80 overflow-y-auto p-5">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ color: C.textDim }} className="text-[9px] uppercase tracking-wider">
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-left">Profile</th>
                    <th className="px-2 py-1 text-left">Client</th>
                    <th className="px-2 py-1 text-left">CSR</th>
                    <th className="px-2 py-1 text-left">Shift</th>
                    <th className="px-2 py-1 text-left">Type</th>
                    <th className="px-2 py-1 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: C.border }}>
                      <td className="mono px-2 py-1" style={{ color: C.textMuted }}>{r.timestamp.slice(0,10)}</td>
                      <td className="px-2 py-1">{r.profile}</td>
                      <td className="px-2 py-1" style={{ color: C.textMuted }}>{r.client}</td>
                      <td className="px-2 py-1">{r.csrName}</td>
                      <td className="px-2 py-1" style={{ color: SHIFT_COLORS[r.shiftAtTime] }}>{r.shiftAtTime}</td>
                      <td className="px-2 py-1" style={{ color: r.type==='VVRO'?C.mint:C.violetGlow }}>{r.type}</td>
                      <td className="mono px-2 py-1 text-right">{fmtUSDc(r.price)}</td>
                    </tr>
                  ))}
                  {importPreview.rows.length > 50 && (
                    <tr><td colSpan={7} className="px-2 py-2 text-center" style={{ color: C.textDim }}>
                      … and {importPreview.rows.length - 50} more
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: C.border }}>
              <button onClick={() => setImportPreview(null)}
                      className="rounded-md px-3 py-2 text-xs font-medium"
                      style={{ background: C.bgRaised, color: C.textMuted, border: `1px solid ${C.border}` }}>
                Cancel
              </button>
              <button onClick={() => confirmImport('replace')}
                      className="rounded-md px-3 py-2 text-xs font-semibold"
                      style={{ background: C.coral, color: '#FFFFFF' }}>
                Replace all data
              </button>
              <button onClick={() => confirmImport('merge')}
                      className="rounded-md px-3 py-2 text-xs font-semibold"
                      style={{ background: C.violet, color: '#FFFFFF' }}>
                Append (keep existing)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ════════════════════════════════════════════════════
          ADD PERSON MODAL
         ════════════════════════════════════════════════════ */}
      {addPersonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
             style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
             onClick={() => setAddPersonOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-xl"
               style={{ background: C.bgRaised, border: `1px solid ${C.borderHi}` }}
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: C.border }}>
              <div className="text-sm font-semibold">Add person to roster</div>
              <button onClick={() => setAddPersonOpen(false)} className="rounded p-1 hover:bg-white/5">
                <X size={16} style={{ color: C.textMuted }}/>
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider"
                       style={{ color: C.textDim }}>Name</label>
                <input value={newPerson.name}
                       onChange={e => setNewPerson({ ...newPerson, name: e.target.value })}
                       onKeyDown={e => e.key === 'Enter' && saveNewPerson()}
                       placeholder="e.g. Hassan"
                       autoFocus
                       className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500"
                       style={{ background: C.bgCard, color: C.text, border: `1px solid ${C.border}` }}/>
                <div className="mt-1 text-[10px]" style={{ color: C.textDim }}>
                  First name as it appears in the sheet's CSR column
                </div>
              </div>

              {/* Shift */}
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider"
                       style={{ color: C.textDim }}>Shift</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Morning','Evening','Night'].map(s => (
                    <button key={s}
                            onClick={() => setNewPerson({ ...newPerson, shift: s })}
                            className="rounded-md px-3 py-2 text-xs font-medium transition-all"
                            style={{
                              background: newPerson.shift === s ? `${SHIFT_COLORS[s]}20` : C.bgCard,
                              color: newPerson.shift === s ? SHIFT_COLORS[s] : C.textMuted,
                              border: `1px solid ${newPerson.shift === s ? SHIFT_COLORS[s] : C.border}`,
                            }}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[10px]" style={{ color: C.textDim }}>
                  Morning 9 AM – 5 PM · Evening 5 PM – 1 AM · Night 1 AM – 9 AM (PKT)
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider"
                       style={{ color: C.textDim }}>Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {['CSR','Manager'].map(r => (
                    <button key={r}
                            onClick={() => setNewPerson({ ...newPerson, role: r })}
                            className="rounded-md px-3 py-2 text-xs font-medium transition-all"
                            style={{
                              background: newPerson.role === r ? `${C.violet}20` : C.bgCard,
                              color: newPerson.role === r ? C.violetGlow : C.textMuted,
                              border: `1px solid ${newPerson.role === r ? C.violet : C.border}`,
                            }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: C.border }}>
              <button onClick={() => setAddPersonOpen(false)}
                      className="rounded-md px-3 py-2 text-xs"
                      style={{ background: C.bgRaised, color: C.textMuted, border: `1px solid ${C.border}` }}>
                Cancel
              </button>
              <button onClick={saveNewPerson}
                      disabled={!newPerson.name.trim()}
                      className="rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-40"
                      style={{ background: C.violet, color: '#FFFFFF' }}>
                Add to roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          EXPORT PDF MODAL
         ════════════════════════════════════════════════════ */}
      {exportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
             style={{ background: 'rgba(22,10,51,0.5)', backdropFilter: 'blur(8px)' }}
             onClick={() => exportData.status !== 'preparing' && setExportData(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-xl"
               style={{ background: C.bgCard, border: `1px solid ${C.borderHi}` }}
               onClick={(e) => e.stopPropagation()}>

            {exportData.status === 'preparing' && (
              <div className="px-6 py-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                     style={{ background: C.violetBg }}>
                  <RefreshCw size={20} className="animate-spin" style={{ color: C.violet }} />
                </div>
                <div className="text-sm font-semibold" style={{ color: C.text }}>
                  Generating PDF…
                </div>
                <div className="mt-1 text-xs" style={{ color: C.textMuted }}>
                  Capturing dashboard snapshot for {exportData.filename}
                </div>
              </div>
            )}

            {exportData.status === 'ready' && (
              <>
                <div className="px-6 pt-6 pb-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                       style={{ background: C.mintBg }}>
                    <Download size={18} style={{ color: C.mint }} />
                  </div>
                  <div className="text-base font-semibold" style={{ color: C.text }}>
                    PDF ready
                  </div>
                  <div className="mt-1 text-xs" style={{ color: C.textMuted }}>
                    Your download should have started automatically. If it didn't, use the button below.
                  </div>
                  <div className="mono mt-2 text-[11px]" style={{ color: C.textDim }}>
                    {exportData.filename}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: C.border }}>
                  <button onClick={() => setExportData(null)}
                          className="rounded-md px-3 py-2 text-xs font-medium"
                          style={{ background: C.bgRaised, color: C.textMuted, border: `1px solid ${C.border}` }}>
                    Close
                  </button>
                  <a href={exportData.url} download={exportData.filename}
                     onClick={() => setTimeout(() => setExportData(null), 500)}
                     className="rounded-md px-3 py-2 text-xs font-semibold"
                     style={{ background: C.violet, color: '#FFFFFF', textDecoration: 'none' }}>
                    Download PDF
                  </a>
                </div>
              </>
            )}

            {exportData.status === 'error' && (
              <>
                <div className="px-6 pt-6 pb-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                       style={{ background: C.coralBg }}>
                    <AlertTriangle size={18} style={{ color: C.coral }} />
                  </div>
                  <div className="text-base font-semibold" style={{ color: C.text }}>
                    Export failed
                  </div>
                  <div className="mt-1 text-xs" style={{ color: C.textMuted }}>
                    Something went wrong while generating the PDF.
                  </div>
                  <div className="mono mt-2 rounded-md p-2 text-[10px]"
                       style={{ background: C.bgRaised, color: C.coral, border: `1px solid ${C.border}` }}>
                    {exportData.message}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: C.border }}>
                  <button onClick={() => setExportData(null)}
                          className="rounded-md px-3 py-2 text-xs font-medium"
                          style={{ background: C.bgRaised, color: C.textMuted, border: `1px solid ${C.border}` }}>
                    Close
                  </button>
                  <button onClick={() => { setExportData(null); setTimeout(exportPDF, 100); }}
                          className="rounded-md px-3 py-2 text-xs font-semibold"
                          style={{ background: C.violet, color: '#FFFFFF' }}>
                    Try again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          RESET CONFIRM MODAL
         ════════════════════════════════════════════════════ */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
             style={{ background: 'rgba(22,10,51,0.5)', backdropFilter: 'blur(8px)' }}
             onClick={() => setResetConfirmOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-xl"
               style={{ background: C.bgCard, border: `1px solid ${C.borderHi}` }}
               onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                   style={{ background: C.coralBg }}>
                <AlertTriangle size={18} style={{ color: C.coral }} />
              </div>
              <div className="text-base font-semibold" style={{ color: C.text }}>
                Delete all orders?
              </div>
              <div className="mt-1 text-xs" style={{ color: C.textMuted }}>
                This will permanently delete <span className="mono font-semibold" style={{ color: C.text }}>{orders.length}</span> orders
                from CSR Pulse. Your roster and profiles stay intact. Your Google Sheets aren't affected — only the data inside the dashboard.
              </div>
              <div className="mt-2 text-xs" style={{ color: C.textMuted }}>
                You can re-import everything from the Excel files afterward.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: C.border }}>
              <button onClick={() => setResetConfirmOpen(false)}
                      className="rounded-md px-3 py-2 text-xs font-medium"
                      style={{ background: C.bgRaised, color: C.textMuted, border: `1px solid ${C.border}` }}>
                Cancel
              </button>
              <button onClick={() => {
                        setOrders([]);
                        setResetConfirmOpen(false);
                      }}
                      className="rounded-md px-3 py-2 text-xs font-semibold"
                      style={{ background: C.coral, color: '#FFFFFF' }}>
                Yes, delete all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
