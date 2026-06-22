import React, { useState, useEffect, lazy, Suspense } from 'react';
import CsrApp from './CsrApp.jsx';
import DeviceGate from './DeviceGate.jsx';
import { ConnectionToast } from './ui.jsx';

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
  const isCeo = hash.toLowerCase().startsWith('#ceo');
  // The CEO console is reachable from anywhere. The CSR (staff) app is wrapped in
  // the per-device lock; the device gate hands CsrApp the profile this laptop is
  // registered to.
  return (
    <>
      <ConnectionToast />
      {isCeo
        ? <Suspense fallback={null}><CeoApp /></Suspense>
        : <DeviceGate>{boundProfile => <CsrApp boundProfile={boundProfile} />}</DeviceGate>}
    </>
  );
}
