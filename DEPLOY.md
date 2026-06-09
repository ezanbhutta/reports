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

## Step 2 — Deploy the status webhook (event log)  ⏱ forward-only, so do it early

`csr-pulse-clickup-webhook.gs` → an Apps Script project (same project as the sync is fine).

1. **Script Properties:** `WEBHOOK_TOKEN` = a long random string; `CLICKUP_TOKEN` = your ClickUp token (`pk_...`).
2. **Deploy ▸ New deployment ▸ Web app** → Execute as **Me**, Access **Anyone**. Copy the `/exec` URL.
3. Paste that URL into `WEBHOOK_CFG.WEB_APP_URL`, then run `registerClickUpWebhook()` once.
4. Verify with `listClickUpWebhooks()`, then flip a task's status and watch the **`Status Transitions`** tab fill.

> Revision rounds only count from deployment day forward — earlier rounds aren't backfilled.

---

## Step 3 — Deploy the sync

`csr-pulse-clickup-sync.gs` (same Apps Script project).

1. `CLICKUP_TOKEN` is already in Script Properties (step 2). `INQUIRY_SHEET_ID` is already set in the file.
2. Run `runDailySync()` once manually — confirm it writes the **`CSR Production`** and **`Profile Conversion`** tabs into the Order Management workbook.
3. Run `installTrigger()` to schedule it every 6h.

`REVISION_METHOD` is set to `'webhook'` (reads the event log from step 2). Conversion
needs neither ClickUp nor the webhook — it works as soon as this runs.

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
