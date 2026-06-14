import React from 'react';
import { C } from './config.js';

export const Btn = ({ children, onClick, variant = 'solid', disabled, style, ...p }) => {
  const base = { borderRadius: 10, fontWeight: 800, fontSize: 13, padding: '10px 16px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, border: 'none', transition: 'all .15s' };
  const v = variant === 'solid' ? { background: C.violet, color: '#fff' }
    : variant === 'ok' ? { background: C.mint, color: '#fff' }
    : variant === 'ghost' ? { background: '#fff', color: C.muted, border: `1px solid ${C.violetLine}` }
    : variant === 'dark' ? { background: C.ink, color: '#fff' }
    : { background: C.violet, color: '#fff' };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v, ...style }} {...p}>{children}</button>;
};

export const Card = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, ...style }}>{children}</div>
);

export const Tile = ({ n, label, hot }) => (
  <div style={{ background: hot ? C.violet : C.raised, border: `1px solid ${hot ? C.violet : C.border}`, borderRadius: 12, padding: '12px 13px' }}>
    <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: hot ? '#fff' : C.ink, lineHeight: 1 }}>{n}</div>
    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: hot ? '#D8C9FF' : C.dim, marginTop: 5 }}>{label}</div>
  </div>
);

// CSR Pulse–style stat card (label · big value · sub · tinted icon)
export const StatCard = ({ label, value, sub, accent = C.violet, icon: Icon }) => (
  <div className="rounded-xl p-5 transition-all" style={{ background: C.card, border: `1px solid ${C.border}` }}>
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: C.dim }}>{label}</span>
      {Icon && <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${accent}1A` }}><Icon size={12} style={{ color: accent }} strokeWidth={2.5} /></div>}
    </div>
    <div className="mono text-2xl font-bold tracking-tight" style={{ color: C.ink }}>{value}</div>
    {sub && <div className="mt-1 text-xs" style={{ color: C.muted }}>{sub}</div>}
  </div>
);

export const Pill = ({ children, color = C.violet }) => (
  <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ background: `${color}1A`, color }}>{children}</span>
);

export const Select = ({ value, onChange, children, color }) => (
  <select value={value} onChange={onChange} className="rounded-md px-2.5 py-1.5 text-xs font-medium outline-none"
    style={{ background: C.card, color: color || C.ink, border: `1px solid ${C.border}`, fontWeight: color ? 700 : 500 }}>{children}</select>
);

export const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} className="rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
    style={{ background: active ? C.violet : 'transparent', color: active ? '#fff' : C.muted, border: `1px solid ${active ? C.violet : 'transparent'}` }}>{children}</button>
);

export const SectionHeader = ({ eyebrow, title, right, color = C.violet }) => (
  <div className="mb-3 flex items-end justify-between">
    <div>
      {eyebrow && <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>{eyebrow}</div>}
      <div className="text-lg font-bold" style={{ color: C.ink }}>{title}</div>
    </div>
    {right && <span className="text-[10px] uppercase tracking-wider" style={{ color: C.dim }}>{right}</span>}
  </div>
);

export const Modal = ({ title, onClose, children, width = 380 }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(21,8,47,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
    <div onClick={e => e.stopPropagation()} style={{ width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px rgba(21,8,47,.3)' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.ink }}>{title}</div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: C.dim, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  </div>
);

export const Label = ({ children }) => (
  <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: C.dim, margin: '12px 0 5px' }}>{children}</div>
);

const inputStyle = { width: '100%', border: `1px solid ${C.violetLine}`, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: C.ink, outline: 'none', background: '#fff' };

// Dynamic field renderer — drives every action pop-up from config.
export function Field({ field, value, onChange }) {
  const { type, label, options, required } = field;
  return (
    <div>
      <Label>{label}{required && <span style={{ color: C.violet }}> *</span>}</Label>
      {type === 'text' && (
        <input style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={label} />
      )}
      {type === 'date' && (
        <input type="date" style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
      {type === 'select' && (
        <select style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {type === 'segment' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {options.map(o => {
            const on = value === o;
            return <button key={o} onClick={() => onChange(o)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? C.violet : C.violetLine}`, background: on ? C.violet : '#fff', color: on ? '#fff' : C.muted }}>{o}</button>;
          })}
        </div>
      )}
      {type === 'multiselect' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {options.map(o => {
            const arr = Array.isArray(value) ? value : [];
            const on = arr.includes(o);
            return <button key={o} onClick={() => onChange(on ? arr.filter(x => x !== o) : [...arr, o])}
              style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? C.violet : C.violetLine}`, background: on ? C.violet : '#fff', color: on ? '#fff' : C.violetDim }}>
              {on ? '✓ ' : ''}{o}</button>;
          })}
        </div>
      )}
    </div>
  );
}

// Summarise an action's details into a short string for the log.
export function actionSummary(action) {
  const d = action.details || {};
  if (Array.isArray(d.elements)) return d.elements.join(', ');
  return d.agenda || d.what || d.reason || d.designer || d.service || d.scope || d.project || d.kind || d.note || d.value || '';
}
