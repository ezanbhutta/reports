import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, ShieldAlert, Loader2, LockKeyhole, RefreshCw } from 'lucide-react';
import { C, CEO_PASSWORD } from './config.js';
import { db } from './store.js';
import { haversineMeters, getPosition, fmtDist } from './geo.js';

// Session-only escape hatch: lets a manager who is off-site (or whose location
// can't be read) get in, so enabling the geofence can never permanently lock
// the owner out. Cleared when the browser tab closes.
const OVERRIDE_KEY = 'sl_geo_override';

export default function GeoGate({ children }) {
  const [phase, setPhase] = useState('checking'); // checking | ok | outside | denied | error
  const [dist, setDist] = useState(null);
  const [cfg, setCfg] = useState(null);

  const check = useCallback(async () => {
    setPhase('checking');
    if (sessionStorage.getItem(OVERRIDE_KEY) === '1') { setPhase('ok'); return; }
    let g = null;
    try { g = await db.getGeofence(); } catch { g = null; }
    setCfg(g);
    // Not configured (or disabled, or no centre captured) → never block.
    if (!g || !g.enabled || g.lat == null || g.lng == null) { setPhase('ok'); return; }
    try {
      const pos = await getPosition();
      const d = haversineMeters(pos.lat, pos.lng, g.lat, g.lng);
      setDist(d);
      // Small grace for GPS jitter, capped so a very fuzzy reading can't defeat the fence.
      const grace = Math.min(pos.accuracy || 0, 150);
      setPhase(d <= (g.radiusM || 0) + grace ? 'ok' : 'outside');
    } catch (err) {
      setPhase(err && err.code === 1 ? 'denied' : 'error');
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  if (phase === 'ok') return <>{children}</>;
  return <GateScreen phase={phase} dist={dist} cfg={cfg} onRetry={check} />;
}

function GateScreen({ phase, dist, cfg, onRetry }) {
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState(false);
  const checking = phase === 'checking';

  const submitOverride = () => {
    if (pw === CEO_PASSWORD) { sessionStorage.setItem(OVERRIDE_KEY, '1'); window.location.reload(); }
    else setPwErr(true);
  };

  const title = checking ? 'Checking your location…'
    : phase === 'outside' ? "You're outside the work area"
    : phase === 'denied' ? 'Location access needed'
    : 'Couldn’t check your location';

  const message = checking ? 'One moment while we confirm you’re on-site.'
    : phase === 'outside' ? `This app only works inside the allowed area${cfg?.label ? ` · ${cfg.label}` : ''}.`
    : phase === 'denied' ? 'Please allow location access for this site, then try again. The app only works on-site.'
    : 'We couldn’t read your location. Make sure location is turned on, then try again.';

  const accent = checking ? C.violet : C.coral;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="glass-2 rounded-2xl pop" style={{ width: 420, maxWidth: '100%', padding: 26, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: checking ? C.violetBg : C.coralBg, color: accent }}>
          {checking ? <Loader2 size={26} className="animate-spin" /> : phase === 'outside' ? <MapPin size={26} /> : <ShieldAlert size={26} />}
        </div>

        <div className="disp" style={{ fontWeight: 800, fontSize: 19, color: C.ink }}>{title}</div>
        <p style={{ fontSize: 13, color: C.muted, margin: '8px 0 0', lineHeight: 1.5 }}>{message}</p>

        {phase === 'outside' && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: C.coral, background: C.coralBg, padding: '6px 12px', borderRadius: 10 }}>~{fmtDist(dist)} away</span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: C.muted, background: 'rgba(124,41,255,.06)', padding: '6px 12px', borderRadius: 10 }}>allowed: within {fmtDist(cfg?.radiusM)}</span>
          </div>
        )}

        {!checking && (
          <button onClick={onRetry} className="lift" style={{ marginTop: 20, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#fff', background: C.violet, boxShadow: '0 10px 24px rgba(114,41,255,.28)' }}>
            <RefreshCw size={16} /> Try again
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
                <div style={{ fontSize: 11, color: C.dim, textAlign: 'left' }}>Enter the manager password to bypass for this session.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="password" autoFocus value={pw} onChange={e => { setPw(e.target.value); setPwErr(false); }}
                    onKeyDown={e => e.key === 'Enter' && submitOverride()} placeholder="Manager password"
                    className="gi" style={{ flex: 1, borderColor: pwErr ? C.coral : undefined }} />
                  <button onClick={submitOverride} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#fff', background: C.ink }}>Unlock</button>
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
