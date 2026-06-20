# CSR Shift Logger

A structured shift-logging app for CSRs, with a separate live CEO console.
Built to the approved design (`../CSR-Shift-Logger-Design.pdf`).

- **CSR app** (`/`) — open, no password. Pick name · shift · profile → log each action via a
  pop-up → counts add up live → wrap up & submit (locks the report). Read-only **team log** included.
- **CEO console** (`/#ceo`) — separate, **password-locked**. Live totals + a row per CSR,
  filterable by shift / profile / date.

## Run it

```bash
cd shift-logger
npm install
npm run dev       # local dev
npm run build     # production build → dist/  (deploy to Vercel)
```

Out of the box it uses **localStorage** (works immediately; the CEO console updates live across
tabs in the same browser — great for a demo).

## Go multi-user (Supabase)

1. Create a Supabase project. In the SQL editor, run `supabase/schema.sql`.
2. Create `shift-logger/.env`:
   ```
   VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_CEO_PASSWORD_HASH=sha256-hex-of-your-password
   ```
3. Rebuild. Now every CSR writes to one shared database and the CEO sees everyone live.

## What's where

| File | Purpose |
|---|---|
| `src/config.js` | Theme, shifts (PKT), profiles, roster, **action catalog** (each `+` button + its fields). |
| `src/store.js` | Data layer — Supabase or localStorage, same API, with live updates. |
| `src/CsrApp.jsx` | CSR experience: login, hand-off note, dashboard, pop-up forms, wrap-up, team log. |
| `src/CeoApp.jsx` | Password gate + live CEO console. |
| `src/ui.jsx` | Shared UI + the dynamic form-field renderer. |
| `supabase/schema.sql` | Tables, realtime, and row-level security (incl. "no edits after submit"). |

## Notes
- **One profile per report.** A CSR covering two profiles files two reports.
- **Hand-off note** routes by profile — the next CSR on that profile sees it at login and taps *Noted*.
- **No edits after submit** — enforced in the app and by an RLS policy.
- The CEO password is verified by **SHA-256 hash** — only the hash goes in `VITE_CEO_PASSWORD_HASH`, so the plaintext password is never shipped in the bundle. It's still a client-side gate (a deterrent); the data itself is guarded by Supabase RLS.
- Generate the hash for your password (run in any browser console, then copy the 64-char result):
  ```js
  crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR-PASSWORD')).then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')))
  ```
- If `VITE_CEO_PASSWORD_HASH` is unset, a **local-dev default of `admin`** applies.
