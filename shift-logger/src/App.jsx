import React, { useState, useEffect, lazy, Suspense } from 'react';
import CsrApp from './CsrApp.jsx';

// CSR app is the default and ships in the main bundle. The CEO console lives at
// #ceo (a separate, unlinked, password-protected route) and is lazy-loaded, so
// CSRs get the smallest, fastest initial download.
const CeoApp = lazy(() => import('./CeoApp.jsx'));

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  if (hash.toLowerCase().startsWith('#ceo')) return <Suspense fallback={null}><CeoApp /></Suspense>;
  return <CsrApp />;
}
