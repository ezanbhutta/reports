# CSR Pulse

Internal sales tracking dashboard for HaseebMadeIt — reads orders from your Google Sheets exports and shows leaderboards, shift breakdowns, and CEO summary PDFs.

## What's inside

- React + Vite + Tailwind frontend
- Password gate (configurable in `src/App.jsx`)
- Local-only storage (data lives in each browser's `localStorage`)
- XLSX / CSV import for both Order Sheets
- PDF CEO summary export

## Quick deploy to Vercel (~5 minutes)

### Option 1 — Drag-and-drop (easiest)

1. Open <https://vercel.com> → sign up / log in (free plan is fine)
2. Click **Add New → Project**
3. **Import** → drag this whole folder onto the page
4. Framework preset will auto-detect as **Vite**
5. Click **Deploy**
6. You'll get a URL like `csr-pulse-xyz.vercel.app` in 60 seconds

### Option 2 — Vercel CLI

```bash
npm install -g vercel
cd csr-pulse-deploy
vercel
# Follow prompts. First deploy is preview; add --prod for production.
vercel --prod
```

### Option 3 — GitHub + Vercel (best for updates)

1. Push this folder to a private GitHub repo
2. Vercel → New Project → Import the repo
3. Every git push redeploys automatically

## Change the password

Open `src/App.jsx`, line 6:

```js
const APP_PASSWORD = 'haseeb2026';
```

Change that string, redeploy. The login expires after 30 days; tweak `AUTH_DURATION_MS` on the next line if you want a shorter / longer session.

## How your team uses it

1. Open the deployed URL (e.g. `csr-pulse.vercel.app`)
2. Enter the password
3. Go to **Import** tab → drop the two Excel files (New Order Sheet + Order Management Sheet)
4. Review preview → click **Replace all data**
5. Dashboard now shows live totals filtered by date range, CSR, shift, profile, type
6. Export PDF anytime for a CEO summary

## Data storage

All data lives in **each browser's localStorage**. That means:

- Importing the file on your laptop does **not** auto-share it to anyone else
- Each person who uses CSR Pulse needs to re-import on their own device
- Clearing browser data wipes the dashboard (re-import to restore)

This is intentional — keeps the data local, no backend infrastructure needed. If you later want a shared cloud database, we can wire it up to Supabase.

## Local development

```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # outputs to dist/
```

## Customizing

- **Roster** — `src/CSRPulse.jsx`, search for `DEFAULT_ROSTER`
- **Profiles** — `src/CSRPulse.jsx`, search for `DEFAULT_PROFILES`
- **CSR aliases** — `src/CSRPulse.jsx`, search for `CSR_ALIASES`
- **Data start date** — `src/CSRPulse.jsx`, search for `DATA_START_DATE`
- **Brand colors** — `src/CSRPulse.jsx`, search for `const C = {`

After any change, run `npm run build` and redeploy (Vercel does this automatically if you used the GitHub option).

---

Built for HaseebMadeIt. Internal — Confidential.
