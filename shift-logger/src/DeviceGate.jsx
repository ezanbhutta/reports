import React, { useState, useEffect, useCallback } from 'react';
import { Laptop, ShieldAlert, Loader2, LockKeyhole, RefreshCw } from 'lucide-react';
import { C, CEO_PASSWORD } from './config.js';
import { db } from './store.js';
import { getDeviceId, getDeviceCode } from './device.js';

// Session-only manager bypass for an unregistered laptop (e.g. a manager filling
// in). Cleared when the tab closes.
const OVERRIDE_KEY = 'sl_device_override';

// Gates the CSR app: a laptop must be registered to a profile (by the CEO) before
// it can report, and it's locked to that profile. children is a render-prop that
// receives the bound profile (or null when a manager has overridden).
export default function DeviceGate({ children }) {
  const [phase, setPhase] = useState('checking'); // checking | ok | pending
  const [bound, setBound] = useState(null);
  const id = getDeviceId();
  const code = getDeviceCode(id);

  const check = useCallback(async () => {
    if (sessionStorage.getItem(OVERRIDE_KEY) === '1') { setBound(null); setPhase('ok'); return; }
    let dev = null;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    try { dev = await db.registerDevice({ id, code, ua }); } catch {}
    if (!dev) { try { dev = await db.getDevice(id); } catch {} }
    // profile === '*' = admin device (access to ALL profiles → no lock).
    if (dev && dev.profile) { setBound(dev.profile === '*' ? null : dev.profile); setPhase('ok'); }
    else setPhase('pending');
  }, [id, code]);

  useEffect(() => {
    check();
    let t; const off = db.subscribe(() => { clearTimeout(t); t = setTimeout(check, 300); });
    return () => { clearTimeout(t); off && off(); };
  }, [check]);

  if (phase === 'ok') return children(bound);
  return <BlockScreen phase={phase} code={code} onRetry={check} onOverride={() => { sessionStorage.setItem(OVERRIDE_KEY, '1'); setBound(null); setPhase('ok'); }} />;
}

function BlockScreen({ phase, code, onRetry, onOverride }) {
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState(false);
  const checking = phase === 'checking';
  const submit = () => { if (pw === CEO_PASSWORD) onOverride(); else setPwErr(true); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="glass-2 rounded-2xl pop" style={{ width: 420, maxWidth: '100%', padding: 26, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: checking ? C.violetBg : C.amberBg, color: checking ? C.violet : C.amber }}>
          {checking ? <Loader2 size={26} className="animate-spin" /> : <Laptop size={26} />}
        </div>
        <div className="disp" style={{ fontWeight: 800, fontSize: 19, color: C.ink }}>{checking ? 'Checking this device…' : 'This device isn’t registered'}</div>
        <p style={{ fontSize: 13, color: C.muted, margin: '8px 0 0', lineHeight: 1.5 }}>
          {checking ? 'One moment.' : 'Ask your manager to assign this laptop a profile in the CEO console. It unlocks here automatically once they do.'}
        </p>

        {!checking && (
          <div style={{ margin: '16px 0 4px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: C.dim }}>Device code</div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: '.08em', marginTop: 4 }}>{code}</div>
          </div>
        )}

        {!checking && (
          <button onClick={onRetry} className="lift" style={{ marginTop: 14, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#fff', background: C.violet, boxShadow: '0 10px 24px rgba(114,41,255,.28)' }}>
            <RefreshCw size={16} /> Check again
          </button>
        )}

        {!checking && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(124,41,255,.1)' }}>
            {!showPw ? (
              <button onClick={() => setShowPw(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.dim }}>
                <LockKeyhole size={13} /> Manager override
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: C.dim, textAlign: 'left' }}>Manager password to use this laptop for this session.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="password" autoFocus value={pw} onChange={e => { setPw(e.target.value); setPwErr(false); }} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Manager password" className="gi" style={{ flex: 1, borderColor: pwErr ? C.coral : undefined }} />
                  <button onClick={submit} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#fff', background: C.ink }}>Unlock</button>
                </div>
                {pwErr && <div style={{ fontSize: 11, color: C.coral, textAlign: 'left' }}>Wrong password.</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
