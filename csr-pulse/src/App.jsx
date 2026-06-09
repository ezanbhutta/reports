import React, { useState, useEffect } from 'react';
import CSRPulse from './CSRPulse.jsx';

// Change this password to whatever you want
const APP_PASSWORD = 'Haseeb@0900#';
const AUTH_KEY = 'csrp-auth';
const AUTH_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const C = {
  bg: '#FAFAFE', bgCard: '#FFFFFF', bgRaised: '#F4F2FA',
  border: '#E8E5F3', borderHi: '#D4CFEC',
  text: '#160A33', textMuted: '#534A78', textDim: '#8B82A8',
  violet: '#7229FF', violetBg: '#F1EBFF',
  coral: '#EF4444', coralBg: '#FDE9E9',
};

const HMLogo = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 392.35 392.35"
       xmlns="http://www.w3.org/2000/svg"
       style={{ borderRadius: size * 0.18, background: C.violet, display: 'block' }}>
    <path fill="#FFFFFF" d="M187.32,115.24h17.71c2.46,0,4.46,1.99,4.46,4.46v61.29c0,1.98-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-66.45c0-2.46,1.99-4.46,4.46-4.46ZM167.44,142.55v50.69c0,1.98-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-55.85c0-2.46,1.99-4.46,4.46-4.46h17.71c2.46,0,4.46,1.99,4.46,4.46ZM144.03,219.52l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v31.16c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46v-26c0-1.98,1.31-3.73,3.21-4.28ZM186.07,207.27l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v66.26c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46v-61.1c0-1.99,1.31-3.73,3.21-4.28ZM224.9,249.8v-50.5c0-1.98,1.31-3.73,3.21-4.28l17.71-5.16c2.86-.83,5.7,1.31,5.7,4.28v55.66c0,2.46-1.99,4.46-4.46,4.46h-17.71c-2.46,0-4.46-1.99-4.46-4.46ZM251.52,142.55v26.19c0,1.99-1.31,3.73-3.21,4.28l-17.71,5.16c-2.86.83-5.7-1.31-5.7-4.28v-31.35c0-2.46,1.99-4.46,4.46-4.46h17.71c2.46,0,4.46,1.99,4.46,4.46h0Z"/>
  </svg>
);

function LoginGate({ onAuth }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const tryLogin = () => {
    if (password === APP_PASSWORD) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        authedAt: Date.now(),
      }));
      onAuth();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6"
         style={{
           background: `radial-gradient(circle at 30% 20%, ${C.violetBg}, ${C.bg} 60%)`,
           color: C.text,
         }}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%     { transform: translateX(-6px); }
          75%     { transform: translateX(6px); }
        }
      `}</style>
      <div className="w-full max-w-sm rounded-2xl p-8"
           style={{
             background: C.bgCard,
             border: `1px solid ${C.border}`,
             boxShadow: '0 10px 40px rgba(114,41,255,0.08)',
             animation: shake ? 'shake 0.3s ease-in-out' : 'none',
           }}>
        <div className="mb-6 flex justify-center">
          <HMLogo size={64} />
        </div>
        <div className="mb-1 text-center text-xl font-bold tracking-tight" style={{ color: C.text }}>
          CSR Pulse
        </div>
        <div className="mb-6 text-center text-xs uppercase tracking-[0.2em]" style={{ color: C.violet }}>
          HaseebMadeIt
        </div>

        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider"
               style={{ color: C.textDim }}>
          Access password
        </label>
        <input type="password"
               autoFocus
               value={password}
               onChange={(e) => { setPassword(e.target.value); setError(false); }}
               onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
               placeholder="Enter password"
               className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
               style={{
                 background: C.bgRaised,
                 color: C.text,
                 border: `1px solid ${error ? C.coral : C.border}`,
               }} />
        {error && (
          <div className="mt-2 text-xs" style={{ color: C.coral }}>
            Wrong password. Try again.
          </div>
        )}

        <button onClick={tryLogin}
                disabled={!password}
                className="mt-4 w-full rounded-lg py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: C.violet, color: '#FFFFFF' }}>
          Sign in
        </button>

        <div className="mt-6 text-center text-[10px]" style={{ color: C.textDim }}>
          Internal · Confidential · For authorized staff only
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const { authedAt } = JSON.parse(raw);
        if (authedAt && Date.now() - authedAt < AUTH_DURATION_MS) {
          setAuthed(true);
        } else {
          localStorage.removeItem(AUTH_KEY);
        }
      }
    } catch {}
    setChecking(false);
  }, []);

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: C.bg, color: C.textDim }}>
        <div className="font-mono text-xs">Loading…</div>
      </div>
    );
  }

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />;
  return <CSRPulse onLogout={logout} />;
}
