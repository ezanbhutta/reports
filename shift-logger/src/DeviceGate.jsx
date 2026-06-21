import React, { useState, useEffect, useCallback } from 'react';
import { Laptop, Loader2, RefreshCw } from 'lucide-react';
import { C } from './config.js';
import { db } from './store.js';
import { getDeviceId, getDeviceCode, onDeviceSignals, ipMeta } from './device.js';

// Gates the CSR app: a laptop must be registered to a profile (by the CEO) before
// it can report, and it's locked to that profile. children is a render-prop that
// receives the bound profile (or null for an admin "all profiles" device).
export default function DeviceGate({ children }) {
  const [phase, setPhase] = useState('checking'); // checking | ok | pending
  const [bound, setBound] = useState(null);
  const id = getDeviceId();
  const code = getDeviceCode(id);

  const check = useCallback(async () => {
    const meta = onDeviceSignals();
    let dev = null;
    try { dev = await db.registerDevice({ id, code, ua: meta.ua, meta }); } catch {}
    if (!dev) { try { dev = await db.getDevice(id); } catch {} }
    // profile === '*' = admin device (access to ALL profiles → no lock).
    if (dev && dev.profile) { setBound(dev.profile === '*' ? null : dev.profile); setPhase('ok'); }
    else setPhase('pending');
  }, [id, code]);

  // Best-effort: enrich the device record with rough IP/location (free service,
  // cached 12h) once on mount — never blocks the gate.
  useEffect(() => {
    let alive = true;
    ipMeta().then(ip => { if (alive && ip && ip.ip) { const meta = { ...onDeviceSignals(), ...ip }; db.registerDevice({ id, code, ua: meta.ua, meta }).catch(() => {}); } });
    return () => { alive = false; };
  }, [id, code]);

  useEffect(() => {
    check();
    let t; const off = db.subscribe(() => { clearTimeout(t); t = setTimeout(check, 300); });
    return () => { clearTimeout(t); off && off(); };
  }, [check]);

  if (phase === 'ok') return children(bound);
  return <BlockScreen phase={phase} code={code} onRetry={check} />;
}

function BlockScreen({ phase, code, onRetry }) {
  const checking = phase === 'checking';
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
      </div>
    </div>
  );
}
