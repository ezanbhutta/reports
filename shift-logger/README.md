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
   ```
3. Create a **manager account** in the Supabase dashboard (**Authentication → Users → Add user**, tick *Auto Confirm*), and turn **off** public sign-ups (**Authentication → Providers → Email**).
4. Rebuild. Now every CSR writes to one shared database and the CEO sees everyone live.

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
- **Reminders.** Rule-based follow-throughs, always scoped to the **profile** (any shift, any person) and persistent until resolved (Snooze = 5 min). Rules live in `src/config.js` (`REMINDERS`: per-rule delay, condition, auto-clear activity, buttons). Requires re-running `supabase/schema.sql` once (adds the `reminders` table).
  1. **Order completed** → 30 min later: ask the client for a **Public Review** — auto-cleared if a **Review received** for the same client + profile is logged first. Buttons: **No need** · **Msg sent** · **Review given**.
  2. **Review received with a 4.7–5.0 average** → exactly 24 h later: ask that client for a **Private Review** (shows client + project + the ★ average). Buttons: **Msg sent**.
  3. **Project delivered** or **Shared to client (chat)** → 15 h later: follow up on **that specific item** (draft/files/shared elements) with **that client** — the reminder names both. Buttons: **Responded** (client already replied) · **Followed up**.
  4. **Files Assigned to Designer** → **immediately**: suggest an upsell to that client (the CSR knows what to offer). Buttons: **No need** · **Upsell done**.
  5. **New inquiry** → 25 min later: send the prospect their **1st follow-up** (shows what they wanted). Buttons: **In discussion** · **Followed up** · **Order taken**.
  6. **Lead follow-up chain** — logging the **1st** → 12 h later remind the **2nd**; the **2nd** → 24 h later remind the **3rd**; the **3rd** → 48 h later remind the **4th & last**. A "4th+" entry books nothing. Buttons: **In discussion** · **Followed up** · **Order taken**.
  7. **New order** → **immediately**: assign the order to a designer. Buttons: **Next shift** (reminds again in 8 h) · **Assigned**.
  8. **New order** (second reminder) → **immediately**: potential upsell — what's missing / what else would help, **especially a Website** (the order's service shows as context). Buttons: **No need** · **Upsell done**.
  9. **Revision assigned to designer** → after the time the CSR types in the form's **"Remind me in"** box (`30m`, `2h`, `5 h`, …): check whether the revision is done. No time entered ⇒ no reminder. Buttons: **Noted** only (plus Snooze).
- **Hand-off note** routes by profile — the next CSR on that profile sees it at login and taps *Noted*.
- **No edits after submit** — enforced in the app and by an RLS policy.
- **Manager login uses Supabase Auth** (email + password) — no password or hash is shipped in the app bundle. Create manager accounts in Supabase (**Authentication → Users → Add user**, tick *Auto Confirm*) and disable public sign-ups.
- The **mistakes log** and the **sign-in / security log** are readable only by a signed-in manager (enforced by RLS). The CSR app has no password and is unchanged.
- Local/demo mode (no Supabase configured) accepts the demo password **`admin`** for the console.
