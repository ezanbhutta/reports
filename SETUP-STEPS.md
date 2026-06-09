# Setup — every click, in order

Parts 1–4 put live reporting in your hands (~25 min total). Part 5 is the later upgrade.
Nothing here touches CSR Pulse or any script attached to your sheets.

---

## Part 1 — Get your ClickUp token (2 min)

1. In **ClickUp**, click your **avatar** (bottom-left) → **Settings**.
2. Left menu → **Apps**.
3. Under **API Token** click **Generate**, then **Copy**. It starts with `pk_…`.

✅ You have the token. Keep it handy for Part 2.

---

## Part 2 — The data sync (10 min)

> **Safety note:** we create a brand-new, standalone script project. We never open or
> edit any script attached to your sheets, and never delete an existing `Code.gs`.
> CSR Pulse uses no Apps Script at all, so it cannot be affected.

1. Go to **script.google.com** → click **New project**.
2. It opens with an empty `Code.gs` (only `function myFunction() {}`). Select all → delete →
   paste in everything from **`csr-pulse-clickup-sync.gs`** (this repo).
3. Left "Files" panel → **+ → Script** → name it **`Webhook`** → paste in everything from
   **`csr-pulse-clickup-webhook.gs`**. Press **Ctrl/Cmd+S** to save.
4. Left menu → **gear (Project Settings)** → scroll to **Script Properties** →
   **Add script property**:
   - Property: `CLICKUP_TOKEN` — Value: your `pk_…` token → **Save script properties**.
5. Left menu → **Editor (`<>`)**. Top bar: open the **function dropdown** → choose
   **`runDailySync`** → click **▶ Run**.
6. First run only: an **Authorization required** dialog appears →
   **Review permissions** → choose your Google account → **Advanced** →
   **Go to Untitled project (unsafe)** → **Allow**. (Normal for your own script.)
7. Wait ~1 min. The **Execution log** should end with `Sync done…`.
8. Function dropdown → **`installTrigger`** → **▶ Run** (auto-resync every 6 hours).

✅ **Checkpoint:** open the **Order Management** Google Sheet — three new tabs exist at the
bottom: **Designer Production**, **Profile Conversion**, **CSR Production**, with rows in
the first two. (CSR Production stays near-empty until Part 5 — expected.)

---

## Part 3 — Make the data readable by the app (1 min)

1. In the Order Management sheet, click **Share** (top right).
2. **General access** → **Anyone with the link** → role **Viewer** → **Done**.

---

## Part 4 — Put the Reports app online (10 min)

1. Go to **vercel.com** → **Add New… → Project**.
2. **Import** the **`ezanbhutta/reports`** GitHub repo.
3. On the import screen: **Root Directory → Edit → select `reports-app`**.
   Framework auto-detects **Vite**. Leave everything else default.
4. Click **Deploy**, wait, then open the live URL.

✅ **Checkpoint:** the dashboard loads — **Overview** shows the exception line and KPIs,
**Conversion** shows per-profile bars, **Designers** shows the live ClickUp table.
**CEO PDF** button downloads the report.

> Numbers cover a rolling 7-day window. Want 30? Change `LOOKBACK_DAYS` in the sync's
> CONFIG and re-run `runDailySync`.

---

## Part 5 — Later upgrade: CSR attribution + exact revision counts

**5a. Add 3 ClickUp custom fields** (one-time, ClickUp UI — there is no API for this):

1. Open any task in the **Designers Team** space → **Custom Fields** → **+ Create Field**.
2. Create, applying each to the whole **Designers Team** space, set **required**:
   - **CSR** — *Dropdown* — options: Tanzeel, Iqra, Hassan, Hira, Misbah, Gulba, Amrah,
     Tayyab, Hasnain Gillani, Ali Shakeel, Abdul Basit, Hadi, Aneeq, Faiz, Salman, Saad,
     Shahzaib, Swaid, Samama, Ahmad, Nadir, Zuhair, Noor, Zubair, Ezan
   - **Profile** — *Dropdown* — options: Abdul Haseeb, Tariq Mahmood, Eikon Designs,
     Alee Studioz, Carpicon, Dygram Designs, Storm Design, WeDesignz, Grid Designs, X Studioz
   - **Fiverr Order ID** — *Text*
3. New rule for the team: whoever creates the task fills all three. Every task.

**5b. Turn on the webhook** (exact revision rounds, forward-only — sooner = more history):

1. In the Apps Script project: **Deploy → New deployment → Web app** →
   Execute as **Me** · Who has access **Anyone** → **Deploy** → copy the URL.
2. Paste it into `WEB_APP_URL` inside the `Webhook` file. Save.
3. **Project Settings → Script Properties** → add `WEBHOOK_TOKEN` = any long random text.
4. **Editor** → function dropdown → **`registerClickUpWebhook`** → **▶ Run**.
5. Flip any task's status in ClickUp → the **Status Transitions** tab gains a row. Working.

**5c.** Run **`runDailySync`** once more → the **CSR** tab in the Reports app fills.

---

## If something doesn't look right

| Symptom | Fix |
|---|---|
| `Missing CLICKUP_TOKEN` in the log | Part 2 step 4 — property name must be exactly `CLICKUP_TOKEN`. |
| Tabs created but Designer tab empty | Token belongs to an account without access to the Designers Team space — generate it from the owner account. |
| App says "Sync failed / no tabs" | Part 3 sharing not done, or the sync hasn't run yet. |
| CSR tab empty | Expected until Part 5a is done and new tasks carry the fields. |
| Revisions column = 0 | Expected until Part 5b — rounds only count from webhook deployment forward. |
