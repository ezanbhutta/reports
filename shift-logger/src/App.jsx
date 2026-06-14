import React, { useState, useEffect } from 'react';
import CsrApp from './CsrApp.jsx';
import CeoApp from './CeoApp.jsx';

// CSR app is the default. The CEO console lives at #ceo (a separate, unlinked
// route protected by its own password) — CSRs never see a link to it.
export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.toLowerCase().startsWith('#ceo') ? <CeoApp /> : <CsrApp />;
}
