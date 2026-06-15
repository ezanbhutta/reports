import React from 'react';
import { C } from './config.js';

// Official HaseebMadeIt mark (served from /public/favicon.svg). Never substitute another logo.
export const Logo = ({ size = 30, className = '', style }) => (
  <img src="/favicon.svg" width={size} height={size} alt="HaseebMadeIt" className={className}
    style={{ display: 'block', borderRadius: Math.round(size * 0.26), filter: 'drop-shadow(0 6px 14px rgba(114,41,255,.30))', ...style }} />
);

export const Btn = ({ children, onClick, variant = 'solid', disabled, style, className = '', ...p }) => {
  const base = 'rounded-xl font-bold transition-all';
  const v = {
    solid: { background: `linear-gradient(180deg, ${C.glow}, ${C.violet})`, color: '#fff', boxShadow: '0 8px 20px rgba(114,41,255,.30)' },
    ok: { background: `linear-gradient(180deg, #34D399, ${C.mint})`, color: '#fff', boxShadow: '0 8px 20px rgba(16,185,129,.28)' },
    ghost: { background: C.surface, color: C.muted, border: `1px solid ${C.surfaceLine}` },
    dark: { background: C.ink, color: '#fff' },
    subtle: { background: 'rgba(124,41,255,.08)', color: C.violetDim },
  }[variant];
  return <button onClick={onClick} disabled={disabled} className={`${base} ${className}`}
    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, whiteSpace: 'nowrap', fontSize: 13, padding: '10px 16px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, border: 'none', ...v, ...style }} {...p}>{children}</button>;
};

export const Card = ({ children, className = '', strong, style }) => (
  <div className={`${strong ? 'glass-2' : 'glass'} rounded-2xl ${className}`} style={style}>{children}</div>
);

// Tiny inline trend chart (area + line + end dot)
export const Sparkline = ({ data = [], color = C.violet, w = 84, h = 28 }) => {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...data, 1);
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, h - (v / max) * (h - 4) - 2]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const id = 'sp' + Math.random().toString(36).slice(2, 7);
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible', flex: '0 0 auto' }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".26" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
};

export const StatCard = ({ label, value, sub, accent = C.violet, icon: Icon, series }) => (
  <div className="glass lift rounded-2xl p-5">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: C.dim }}>{label}</span>
      {Icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}22` }}><Icon size={13} style={{ color: accent }} strokeWidth={2.5} /></div>}
    </div>
    <div className="flex items-end justify-between gap-2">
      <div style={{ minWidth: 0 }}>
        <div className="mono text-3xl font-bold tracking-tight" style={{ color: C.ink }}>{value}</div>
        {sub && <div className="mt-1 text-xs" style={{ color: C.muted }}>{sub}</div>}
      </div>
      {series && <Sparkline data={series} color={accent} />}
    </div>
  </div>
);

export const Pill = ({ children, color = C.violet }) => (
  <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ background: `${color}1F`, color }}>{children}</span>
);

export const Select = ({ value, onChange, children, color }) => (
  <select value={value} onChange={onChange} className="gi" style={{ padding: '8px 32px 8px 11px', width: 'auto', color: color || C.ink, fontWeight: color ? 700 : 500, fontSize: 12.5 }}>{children}</select>
);

export const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} className="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
    style={active ? { background: C.violet, color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 12px rgba(114,41,255,.25)' } : { background: 'rgba(255,255,255,.5)', color: C.muted, border: '1px solid rgba(124,41,255,.14)' }}>{children}</button>
);

export const SectionHeader = ({ eyebrow, title, right, color = C.violet }) => (
  <div className="mb-3 flex items-end justify-between">
    <div>
      {eyebrow && <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>{eyebrow}</div>}
      <div className="disp text-lg font-bold" style={{ color: C.ink }}>{title}</div>
    </div>
    {right && <span className="text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>{right}</span>}
  </div>
);

export const Modal = ({ title, subtitle, onClose, children, width = 420 }) => (
  <div onClick={onClose} className="scrim" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
    <div onClick={e => e.stopPropagation()} className="glass-2 rounded-2xl pop no-scrollbar" style={{ width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto' }}>
      {title !== undefined && (
        <div style={{ padding: '15px 18px', borderBottom: '1px solid rgba(124,41,255,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg" style={{ border: 'none', background: 'rgba(124,41,255,.08)', width: 28, height: 28, fontSize: 18, color: C.muted, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  </div>
);

export const Label = ({ children }) => (
  <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: C.dim, margin: '13px 0 5px' }}>{children}</div>
);

// Dynamic field renderer (powers every action form).
export function Field({ field, value, onChange }) {
  const { type, label, options, required } = field;
  return (
    <div>
      <Label>{label}{required && <span style={{ color: C.violet }}> *</span>}</Label>
      {type === 'text' && <input className="gi" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={label} autoComplete="off" />}
      {type === 'date' && <input type="date" className="gi" value={value || ''} onChange={e => onChange(e.target.value)} />}
      {type === 'select' && (
        <select className="gi" value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Select…</option>{options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {type === 'segment' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {options.map(o => { const on = value === o; return (
            <button key={o} onClick={() => onChange(o)} className="rounded-xl" style={{ flex: 1, padding: '9px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: on ? 'none' : `1px solid ${C.surfaceLine}`, background: on ? C.violet : C.surface, color: on ? '#fff' : C.muted }}>{o}</button>); })}
        </div>
      )}
      {type === 'multiselect' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {options.map(o => { const arr = Array.isArray(value) ? value : []; const on = arr.includes(o); return (
            <button key={o} onClick={() => onChange(on ? arr.filter(x => x !== o) : [...arr, o])} className="rounded-full"
              style={{ padding: '7px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: on ? 'none' : `1px solid ${C.surfaceLine}`, background: on ? C.violet : C.surface, color: on ? '#fff' : C.violetDim }}>{on ? '✓ ' : ''}{o}</button>); })}
        </div>
      )}
    </div>
  );
}

export function actionSummary(action) {
  const d = action.details || {};
  if (Array.isArray(d.elements)) return d.elements.join(', ');
  return d.agenda || d.what || d.reason || d.stage || d.designer || d.service || d.scope || d.project || d.kind || d.note || (d.attempt ? d.attempt + ' follow-up' : '') || d.value || '';
}
