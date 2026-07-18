# Shift‑Logger — Project Notes & Handoff

> A context primer for anyone (human or a fresh AI chat) picking up work on **`shift-logger/`**.
> Read this first. It captures the architecture, data model, everything built/fixed in the
> most recent working session, the gotchas we learned, and what is still pending.

---

## 0. Scope rule (IMPORTANT)

This repo contains several independent apps/scripts. **Only work on `shift-logger/`.**
Do NOT read, modify, run, or build any other app in the repo (e.g. `csr-pulse/`,
`reports-app/`, the `*.gs` Google Apps Script files) unless explicitly told to.
(This rule lives in the repo root `CLAUDE.md`.)

---

## 1. What the app is

A **CSR shift‑logging tool** for a Karachi‑based design agency (brand "HaseebMadeIt").
Two faces, one codebase:

- **CSR app (staff)** — a customer‑service rep logs in by name + profile + shift, starts/resumes a
  "report" for their shift, logs "activities" (a timeline of actions like inquiries, orders,
  revisions, chats), reads a hand‑off note from the previous shift (must acknowledge), writes a
  note for the next shift, then wraps up (a checklist) and submits. Runs on shared laptops that are
  **locked to one brand profile** each.
- **CEO / manager console** — reached at the `#ceo` URL hash. Manager signs in (Supabase Auth) and
  sees a live dashboard: activity trend, KPI stat cards, live feed, reports list (click → drawer
  with full timeline), "needs attention", per‑profile/per‑CSR breakdowns, date‑range/shift/profile
  filters, a branded **PDF export**, a **registered‑devices** manager, a **security/access log**, a
  **roster** editor, a **mistakes** log, and a **universal search**.

Timezone is always **Asia/Karachi (PKT, UTC+5)**.

---

## 2. Tech stack

- **React 18** + **Vite 5** SPA (JS/JSX, not TypeScript).
- **Tailwind** (utility classes) + a lot of inline styles + CSS vars in `src/index.css`.
- **lucide-react** icons.
- **Supabase** (Postgres + Row‑Level Security + Realtime + Supabase Auth) as the backend, with a
  **localStorage fallback** when env vars are absent (same `db` API either way).
- **jsPDF** for the PDF export (dynamically imported).
- Deployed on **Vercel** (`vercel.json`). Secrets come from `VITE_`‑prefixed env vars at build time
  (only the Supabase **anon** key is exposed — protection relies on RLS).

Build: `cd shift-logger && npm run build`. There are **no tests**; verify by building.

---

## 3. File map (`shift-logger/src/`)

| File | Role |
|---|---|
| `main.jsx` | React entry. |
| `App.jsx` | Routes on `#ceo` hash: CEO console (lazy‑loaded) vs `DeviceGate`‑wrapped CSR app. Mounts `<ConnectionToast/>`. |
| `config.js` | `C` (color tokens), `SHIFTS`, `PROFILES`, `DEFAULT_ROSTER`, `ACTIONS` (the activity catalog), `ACTION_BY_KEY`, `GROUPS`, `CHECKLIST`, `KPI_LABEL`, `isDesigner`, `SHARE_ELEMENTS`. **Drives the whole UI.** |
| `store.js` | **Data layer.** `db = supaDb \| localDb` chosen by `BACKEND` (set from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`). PKT helpers (`todayPKT`, `timePKT`, `addDays`). Realtime `subscribe`. |
| `ui.jsx` | Shared primitives: `Btn`, `Card`, `Pill`, `Select`, `Chip`, `Modal`, `Label`, `Field`, `StatCard`, `Sparkline`, `TrendChart`, `ConfirmDelete`, `Logo`, `actionSummary`, and the **`useLive`** hook + **`ConnectionToast`**. |
| `device.js` | Per‑laptop identity: stable random `sl_device_id`, human code (e.g. `A3F9-C1`), `onDeviceSignals()` (browser/OS/tz/screen/etc.), `ipMeta()` (IP→city/ISP via free `ipwho.is`, cached 12h). |
| `DeviceGate.jsx` | Wraps the CSR app; blocks until the CEO assigns the laptop a profile. Registers device + enriches with IP meta. **Client‑side gate only.** |
| `CsrApp.jsx` | The staff app (login, dashboard, activity forms, hand‑off notes, wrap‑up/submit, resume, ⌘K palette). |
| `CeoApp.jsx` | The whole CEO console (auth gate, header/tabs, `Console`, `StatPanel`, `DrillDrawer`, `RosterManager`, `MistakesPanel`, `SecurityPanel`, `DevicesCard`, `GlobalSearch`, PDF export). |
| `pdfFont.js` | Base64 DejaVu Sans (regular+bold) embedded for the PDF so non‑Latin renders. ~1.95 MB; lazy‑imported only on export. |
| `../supabase/schema.sql` | The full DB schema + RLS + functions. **Idempotent — safe to re‑run.** |

---

## 4. Data model (Supabase tables)

- **`roster`** — `id, name, shift, profile, role, active`. Who exists. `role != CSR/Manager` ⇒ designer.
- **`reports`** — one per CSR per shift. `id (uuid), csr_name, shift, profile, date, start_at,
  finish_at, checklist (jsonb), note_for_next, note_seen_by, note_seen_at,
  note_seen_shifts (jsonb[]), closed_by_ceo (timestamptz), ceo_close_seen (bool),
  status ('open'|'submitted'), created_at`. Partial unique index: **one open report per
  `(csr_name, profile)`**.
- **`actions`** — the activity timeline. `id (uuid), report_id (uuid FK → reports, cascade),
  type, client, details (jsonb), created_at, updated_at`. `details` holds per‑action fields
  (project, agenda, designer, etc.).
- **`security_log`** — CEO console sign‑in attempts. `id, event ('failed'|'success'), email_tried,
  ua, created_at`. Manager‑read‑only. **Never stores passwords** (only the email typed).
- **`devices`** — per‑laptop binding. `id (text, client‑generated), code, label, profile, ua,
  meta (jsonb — browser/tz/screen/IP/city/ISP), created_at, last_seen`. `profile=''` ⇒ pending.
- **`mistakes`** — manager‑only issue log. `person, category, severity, description, client,
  project, happened_on, happened_time, shift, profile, logged_by, status
  ('open'|'reviewed'|'resolved'), ceo_note, created_at`.
- **`settings`** — generic key/value, currently unused.

**SECURITY DEFINER functions** (needed because RLS blocks updating a *submitted* report):
- `ack_note(p_id uuid, p_by text, p_shift text)` — records a hand‑off‑note acknowledgement **per
  shift** (so a note targeting two shifts must be read by both).
- `mark_ceo_close_seen(p_id uuid)` — marks the "CEO closed my open report" heads‑up as seen.

**RLS posture (deliberate):** the team log is treated as open — anon can read everything and
insert/update reports+actions **while open**, delete reports, and rewrite the roster. Only
`security_log` and `mistakes` are locked to authenticated managers. This is a known trade‑off (see
§7 F8/F9) that the owner chose to keep.

---

## 5. Key architecture patterns / conventions

- **`db` API parity.** Every method exists in both `supaDb` and `localDb`. When adding a data method,
  add it to **both**.
- **`useLive(key, fetcher, tables)`** (ui.jsx) — subscribes to realtime + refetches on focus, caches
  in a module map, returns `[data, refresh, set, error]`. Catches fetch errors and emits an
  `sl:livestatus` event that `ConnectionToast` listens to. Focus refetch is throttled (1.5 s).
- **Realtime** — one shared Supabase channel fanned out to all `useLive` consumers via `db.subscribe`.
- **PKT time** — `todayPKT()` (YYYY‑MM‑DD), `timePKT()`, `dayPKT(iso)`, `currentShift()`. Never trust
  the browser clock for shift/day logic beyond these helpers. Shifts: Morning 9am–5pm, Evening
  5pm–1am, Night 1am–9am (so **midnight–1am is Evening**, by design).
- **Optimistic UI** — CSR activity add/edit/delete update local state immediately, then persist.
  Failed saves are marked and retryable (never silently lost).
- **Modal focus** — `Modal` is accessible (role=dialog, Esc, focus once on open, restore on close).
  Its focus effect **must run once (`[]` deps)** — see §7 lesson.
- **Never define a component inside another component's render** — it remounts every render (focus
  loss, flicker). Keep them at module scope and pass props.

---

## 6. What was built/fixed in the last session (PRs #5–#17)

All merged to `main`. Chronological:

- **#5/#6** — Per‑device info capture: `onDeviceSignals()` + `ipMeta()` (free `ipwho.is`); show
  **browser, computer/OS, device type, location, IP, ISP** etc. in the console's DevicesCard.
  Added `devices.meta` jsonb.
- **#7** — Shortcut hint shows the **OS‑correct** key (`Ctrl K` on Windows/Linux, `⌘K` on Mac) —
  no more Mac‑only symbol for everyone.
- **#8** — **THE "empty reports" bug.** The console loaded all actions via a plain `.select('*')`,
  silently capped by PostgREST at **1000 rows**, so once the team passed 1000 actions the newest
  ones (and their reports) vanished from the console. Fixed with a paginated `fetchAll()` in
  `store.js` used by `allActions()` and `listReports()`.
- **#9 (audit batch 1)** — reliability: surface failed activity saves with retry (F1); safe
  shared‑laptop resume as an explicit login choice, profile/date checked (F3); full 24‑hour
  single‑day activity graph (F4, was an 8‑hour window that dropped mornings); hand‑off lookup
  bounded to 24h + shift‑filtered (F6); surface sign‑out/device/mistake write failures (F11);
  `useLive` error handling + `ConnectionToast` (F13); Ctrl‑K doesn't hijack typing (F16); delete
  confirm shows error instead of closing as success (F17).
- **#10 (audit batch 2 — SCHEMA)** — hand‑off ack tracked **per shift** (`note_seen_shifts` +
  3‑arg `ack_note`) so a two‑shift note must be read by both (F2); **one open report** per
  CSR+profile via a partial unique index + `createReport` adopts an existing open report on
  conflict; migration archives older duplicate open reports (F5); `security_log` removed from the
  realtime publication and `pw_tried` renamed to `email_tried` (F10).
- **#11 (batch 3)** — console loads actions **only for the selected date window**
  (`actionsInWindow`) instead of all history on every realtime tick; the report drawer fetches its
  **own complete** timeline so windowing never hides an entry (F12).
- **#12 (batch 4+5)** — accessible `Modal` (role/aria/Esc/focus) + keyboard‑operable `StatCard` +
  focus ring (F14); `type="button"` on shared buttons (F16); Vercel security headers (F18);
  `engines` in package.json (F19); confirmed jsPDF already lazy (F20).
- **#13 (batch 6)** — embed **DejaVu Sans** (regular+bold) in the PDF, registered as `helvetica`,
  so non‑Latin names render instead of boxes (F15). Caveat: RTL Arabic/Urdu **shaping/joining** is
  still limited in jsPDF (glyphs render, joining may not).
- **#14 (HOTFIX)** — two regressions from the batches:
  1. **Inputs lost focus after one letter** in every modal — the Modal focus effect depended on
     `[onClose]` (a new inline fn each render), so it re‑ran every keystroke and re‑focused the
     panel. Fixed: run once (`[]`), keep Esc current via a ref, don't steal focus from a focused field.
  2. **Hand‑off "Noted" kept re‑popping** — the new per‑shift check reads `note_seen_shifts`, only
     populated by the migrated 3‑arg `ack_note`; on an un‑migrated DB the ack couldn't persist.
     Made it self‑healing: `ackNote` falls back to the old 2‑arg function; `noteSeenFor` falls back
     to the legacy `note_seen_by`.
- **#15** — moved three inline components (`Tab`, `Row`→`StatRow`, `Actions`→`RosterActions`) to
  module scope so the nav/lists stop remounting on every render (same class as the focus bug).
- **#16** — **Universal search** (`GlobalSearch`): a spotlight (header button + **Ctrl/⌘‑K**) that
  searches **reports, activities (client/project/any detail), and mistakes/issues** across all
  history, including by date (`2026-06-22`). Grouped, capped ("refine your search"), click a result
  to expand it inline. Not limited by the dashboard date filter.
- **#17** — **CEO can close an open report** (drawer → "Close report", marks it submitted; for when
  a CSR forgot to wrap up). The CSR then gets a **one‑time** "Heads up from management" popup the
  next time that same person+profile logs in, listing profile · date · shift, then it's marked
  seen (`closed_by_ceo`, `ceo_close_seen`, `mark_ceo_close_seen`).

---

## 7. Gotchas & lessons (read these before changing things)

1. **PostgREST silently caps a plain `.select()` at 1000 rows.** Any "load everything" query must
   paginate (see `fetchAll` / `actionsInWindow` in `store.js`). This caused the flagship
   "reports show but their activities are empty" bug.
2. **Never define a React component inside another component's render.** It gets a new identity each
   render → full remount → lost input focus, restarted transitions, list flicker.
3. **A `useEffect` that manages focus/side‑effects must not depend on inline callbacks.** An inline
   `onClose={() => …}` changes every render; effects keyed on it re‑run on every keystroke. Use a
   ref + `[]` deps.
4. **Supabase writes swallow errors by default** (`const { data } = await …` ignores `error`).
   Surface failures (throw or return a status) so the UI can react — don't let saves fail silently.
5. **RLS blocks updating a *submitted* report** (the "update while open" policy). Anything that must
   write to a submitted report (ack a note, mark a heads‑up seen) needs a **SECURITY DEFINER**
   function granted to `anon, authenticated`.
6. **Schema changes require re‑running `supabase/schema.sql`.** It's fully idempotent (guards,
   `add column if not exists`, drop‑then‑create policies/functions). Tell the user to re‑run it, or
   the feature won't fully work.
7. **The Supabase anon key ships in the client bundle.** Don't put anything secret behind it; rely on
   RLS. (See F8/F9 below — currently open by owner's choice.)
8. **jsPDF's built‑in fonts are Latin‑only (WinAnsi).** Non‑Latin text → boxes. We embed a Unicode
   TTF and register it as `helvetica`. True RTL Arabic shaping is a bigger, separate effort.
9. **Don't show OS‑specific symbols to everyone** (the Mac ⌘). Detect OS or use neutral wording.
10. **`localDb` and `supaDb` must stay in sync.** Add every new method to both.

---

## 8. Audit findings map (F‑numbers)

A 4‑agent read‑only audit produced findings **F1–F21**. Owner decisions:

- **Fixed:** F1, F2, F3, F4, F5, F6, F10, F11, F12, F13, F14, F15, F16, F17, F18, F19, F20.
- **Skipped by choice:** **F7** (no offline mode used), **F8** (staff keep edit/delete of any
  report — open RLS), **F9** (per‑laptop lock is client‑side only, left as‑is), **F21** (minor code
  cleanups — dead `seriesFor`, distinct‑devices undercount, etc.).
- **Verified NON‑issues (false positives):** the "midnight logs as Evening" (correct per config),
  and "required designer field has no input" (converted to a select in `CsrApp.jsx`).

---

## 9. Outstanding / pending

- **⚠️ The owner must re‑run `shift-logger/supabase/schema.sql`** in the Supabase SQL editor. It's
  one file that now covers: `devices.meta`; per‑shift hand‑off (`note_seen_shifts`, 3‑arg
  `ack_note`); one‑open‑report index + duplicate archival; `security_log` realtime removal +
  `pw_tried`→`email_tried`; and the CEO‑close columns + `mark_ceo_close_seen`. Running it once
  applies all of it. The client code self‑heals where it can, but "seen"/per‑shift persistence and
  the unique‑report guard need the migration.
- **Left open by choice:** F8 (anon can edit/delete any report), F9 (device lock is client‑side).
  Revisit if the threat model changes.
- **Possible follow‑ups the owner mentioned/були offered:** a "Close report" button directly on the
  "Open now" list (without opening each report); full RTL Urdu/Arabic in the PDF; clicking a search
  result to jump into the full side‑drawer; quick filters inside search.

---

## 10. Workflow conventions used this session

- **Branch:** development happened on `claude/jolly-lovelace-9eflii`. (A new chat may be assigned a
  different feature branch — check its own instructions.) Never push to `main` directly.
- **Every change:** build → commit → push → open PR → merge. Small, themed PRs.
- **Git:** branch off the default branch; don't commit/push unless asked (this session the user
  wanted each change shipped). Use the GitHub MCP tools (`mcp__github__*`) — no `gh` CLI available.
- **Environment:** remote/ephemeral container; the repo is cloned fresh each session, so commit +
  push anything worth keeping. No committed `.env` (Supabase creds are injected at deploy time), so
  you can't query the live DB from the session — reason from code, or ask the user to run SQL.
- **Only touch `shift-logger/`.**

---

_Last updated after PR #17. If you extend the app, append your changes to §6 and any new lesson to §7._
