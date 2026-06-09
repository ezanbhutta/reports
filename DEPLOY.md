# CSR Reporting Automation — Go-Live Runbook

Order matters. Conversion works the moment the sync runs; production/revisions/SLA
fill in only after steps 1–2. Everything below is grounded in the verified live
workspace (Jun 2026).

---

## Step 1 — ClickUp retrofit (3 custom fields)  ⛔ gates all production attribution

Add these **workspace-level** custom fields (Settings ▸ ClickApps ▸ Custom Fields,
or on the `Designers Team` space `90187090116`), and make them **required at task
creation**. Field creation is a ClickUp UI/admin step — there is no API for it.

| Field | Type | Options |
|---|---|---|
| **CSR** | dropdown | the roster below |
| **Profile** | dropdown | the 10 profiles below |
| **Fiverr Order ID** | short text | the Fiverr order number (lives only on Fiverr — typed once at creation) |

**Profiles (must match the sheet tabs + CSR Pulse exactly):**
Abdul Haseeb · Tariq Mahmood · Eikon Designs · Alee Studioz · Carpicon · Dygram Designs · Storm Design · WeDesignz · Grid Designs · X Studioz

**CSR roster (by shift):**
- Morning: Tanzeel, Iqra, Hassan, Hira, Misbah, Gulba, Amrah
- Evening: Tayyab, Hasnain Gillani, Ali Shakeel, Abdul Basit, Hadi, Aneeq, Faiz
- Night: Salman, Saad, Shahzaib, Swaid, Samama, Ahmad, Nadir, Zuhair, Noor, Zubair, Ezan

> Without this step, ClickUp has no CSR/Profile on tasks, so every production row attributes to blank.

---

## Step 2 — Create the Apps Script project (standalone — touches nothing existing)

> ⚠️ Do **not** paste these scripts into a script already attached to one of your
> sheets, and never clear an existing `Code.gs` — it may hold your own automations.
> The sync opens every sheet **by ID**, so it doesn't need to live inside any sheet.
> (CSR Pulse itself uses no Apps Script at all, so it can't be affected either way.)

1. Go to **script.google.com → New project** — a fresh, empty, standalone project.
2. Paste `csr-pulse-clickup-sync.gs` into its (empty) `Code.gs`.
3. **+ → Script**, name it `Webhook`, paste `csr-pulse-clickup-webhook.gs`. Save.
4. **Project Settings (gear) → Script Properties:** add `CLICKUP_TOKEN` = your ClickUp token (`pk_...`).

---

## Step 3 — Deploy the status webhook (event log)  ⏱ forward-only, so do it early

In that same project:

1. **Script Properties:** add `WEBHOOK_TOKEN` = a long random string.
2. **Deploy ▸ New deployment ▸ Web app** → Execute as **Me**, Access **Anyone**. Copy the `/exec` URL.
3. Paste that URL into `WEBHOOK_CFG.WEB_APP_URL` (in the `Webhook` file), then run `registerClickUpWebhook()` once.
4. Verify with `listClickUpWebhooks()`, then flip a task's status and watch the **`Status Transitions`** tab fill.

> Revision rounds only count from deployment day forward — earlier rounds aren't backfilled.
> The webhook is scoped to the Designers Team space, so ops/attendance changes never hit the log.

---

## Step 3b — Run the sync

1. Function dropdown → `runDailySync` → **Run** (approve the one-time permission prompt) —
   confirm it writes **`Designer Production`**, **`Profile Conversion`**, and **`CSR Production`**
   tabs into the Order Management workbook.
2. Run `installTrigger()` to schedule it every 6h.

`REVISION_METHOD` is set to `'webhook'` (reads the event log from Step 3). Conversion and
Designer Production need neither the webhook nor the ClickUp retrofit — they work as soon
as this runs. Numbers cover a rolling `LOOKBACK_DAYS` window (default 7 — edit in CONFIG).

---

## Step 4 — Reports app (this repo, `reports-app/`)

The reporting lives in its **own** app — not CSR Pulse (that stays your revenue dashboard).

1. In `reports-app/src/Reports.jsx`, set `REPORTS.workbookUrl` to the workbook the sync
   writes to (Step 3's `OUTPUT_WORKBOOK_ID`). Share that workbook **"Anyone with the link can view."**
2. `cd reports-app && npm install && npm run build`, then deploy `dist/` to Vercel (same as CSR Pulse).
3. Open it → Overview shows the exception line; Conversion + Designers populate immediately;
   CSR tab fills once Step 1 is done.

> Optional clean separation: create a dedicated "CSR Reports" Google Sheet, set both the
> sync's `OUTPUT_WORKBOOK_ID` and the app's `REPORTS.workbookUrl` to it. Defaults work without this.

---

## Ongoing discipline (the part code can't enforce)

1. `CSR`, `Profile`, `Fiverr Order ID` set at task creation — every task, no exceptions.
2. Designers flip status on every redelivery (the webhook only logs real transitions).
3. Inquiry sheet logged live (it is today — sheet was last edited the day of verification).
4. A lead spot-checks field completeness daily for the first ~2 weeks.

---

## What each metric will show

| Metric | After step | Grain |
|---|---|---|
| Conversion (Placed ÷ total) | 3 | per Profile |
| Revenue / margin / leaderboard | already live | CSR × Profile |
| Revision rounds | 2 + 3 (forward-only) | CSR × Profile |
| Deliveries / SLA / stalled tasks | 1 + 3 | CSR × Profile |
