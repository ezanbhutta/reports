# CSR Reporting Automation — Build Spec (v2)

**Owner:** Abdul Haseeb
**Status:** Architecture locked. Grounded against the live ClickUp workspace AND the CSR Pulse codebase.
**Supersedes v1.** Key change: CSR Pulse is already a live, auto-syncing CEO dashboard — not a prototype. The revenue view is already automated. The build is now much smaller.

---

## 1. Objective

Kill the manual CSR shift report. The CEO view is one screen, derived automatically. CSR input drops to a minimal Fiverr-inbox log.

**Core principle:** one source of truth per metric. The chat report is authoritative for nothing → deleted.

---

## 2. What already exists and works (do not rebuild)

**CSR Pulse** (React + Vite + Tailwind, deployed on Vercel, password-gated) is a **live dashboard**, not a prototype:

- Auto-syncs on every load from **two Google Sheets workbooks** via the public gviz CSV endpoint (`/gviz/tq?tqx=out:csv&sheet={Tab}`). No manual import. Sheets are shared "anyone with link can view."
  - New Order Sheet — `1d7ZFWLmVPWK_UUXoxj2o7OJKj5hJHW87eClDC316fSY`
  - Order Management Sheet — `1kHw1DB7r4RhgBpF4l4CtapBdgtozJwJXtF-egVBZGUE`
- Ten profile tabs per workbook, standardized headers (with header-row auto-detection for banner rows).
- Computes: revenue, tips, AOV, order count, VVRO/ORGANIC/B2B split + mix %, per-shift breakdown, CSR leaderboard, and **margin** (revenue − VVRO cost − ad spend per profile − expenses + B2B).
- Honors a **5 AM PKT business-day cutoff** and assigns shift from each CSR's **roster entry**, not the timestamp.
- Exports a polished **CEO summary PDF** (jsPDF): hero revenue, KPI cards, "where the revenue lives" shift breakdown, CSR leaderboard.
- Local cache in browser localStorage; the shared truth is the Google Sheets.

**Implication: the revenue / completions / margin CEO view is already live and automated.** That entire half of the daily report is already redundant with this dashboard.

---

## 3. Decided values lifted from CSR Pulse (do not reinvent)

**Profiles (10) — use these exact names everywhere, including the ClickUp Profile dropdown, so joins line up:**
Abdul Haseeb, Tariq Mahmood, Eikon Designs, Alee Studioz, Carpicon, Dygram Designs, Storm Design, WeDesignz, Grid Designs, X Studioz.

**Shifts:** Morning, Evening, Night. Shift comes from the roster, not the timestamp. Business day rolls at 5 AM PKT (UTC+5).

**Roster (active CSRs by shift):**
- Morning: Tanzeel, Iqra, Hassan, Hira, Misbah, Gulba, Amrah
- Evening: Tayyab, Hasnain Gillani, Ali Shakeel, Abdul Basit, Hadi, Aneeq, Faiz
- Night: Salman, Saad, Shahzaib, Swaid, Samama, Ahmad, Nadir, Zuhair, Noor
- Night managers: Zubair, Ezan
- (CSR Pulse already fuzzy-matches name variants via an alias map — reuse it; align the ClickUp CSR dropdown to these canonical names.)

**Order types:** VVRO, ORGANIC, B2B (direct payment, no Fiverr). **Margin model:** revenue − VVRO cost(per profile) − ads(per profile) − expenses + B2B. Cost inputs entered by hand.

**Order Sheet statuses:** Completed, In progress, Delivered, Revision, Cancel, Late. ("Completed" matched by substring.)

---

## 4. What's actually missing (the real build)

CSR Pulse sees completed orders only. It does NOT have:

1. **Conversion** — inquiries → orders. Requires Inquiry Sheet data (CSR Pulse never ingests inquiries).
2. **Production / revisions / SLA** — from ClickUp. CSR Pulse has no ClickUp link.

Everything to build is these two, surfaced inside the existing dashboard.

---

## 5. Live ClickUp reality (re-verified Jun 2026 via direct ClickUp API)

- **Live production space:** `Designers Team` (`90187090116`) — confirmed live: 100+ current tasks with June 2026 due dates, client names matching the CSR daily reports (Ironhide Notary, 3D spools, SushiLab.ai, Axis Technologies, YoYu Group, Eden Studios, Thriving Kingdom Marriage…). Work sits in per-designer lists (Md Rashadul Haque, Amin Ullah, MD Rezaul, Nimeazad, Khubaib, Hamid, Owais Nadeem/Rehan, Abiha Imran, Atta Razaq, M. Tariq, Syed Mubahat, Abdullah, Md Dulal, Rejaul Karim, Shaoor Haider…); task title = client name; assignee = designer. Designer attribution is structural.
- **Real status set (CORRECTED):** `pickup your projects → deliver to client → client response → revision → revision complete → complete`. The earlier locked value (`to do → client response → pending → delivered → cancelled`) was wrong — it came from the **stale** Design Department space, not the live floor.
- **Revision signal:** explicit `revision` status — each ENTRY into `revision` = one revision round (cleaner than delivery-minus-one). Deliveries = entries into `deliver to client`. Pinned in the script.
- **Status history is chronological & rich** — Zetted exposed 10+ ordered transitions (`status_history` indices 0–9). Revision counting from the log is viable **via raw REST**. ⚠️ The ClickUp MCP `time_in_status` tool fails output validation on `null` status colors; the Apps Script's raw `UrlFetchApp` call bypasses this. ✓
- **Parallel/stale structures (ignore):**
  - `Design Department` (`90188283242`) — a stage pipeline (To-Do → Delivery → Feedback & Revisions → Final). Last meaningful activity ~Jan 2026; now collecting test tasks ("logo test 1"). **Zetted lives here** and is NOT representative of the live floor. Status set here: `to do → pending → delivered → complete projects/completed`.
  - `Logo design` (`90188148883`) — dead: 8 test tasks ("Subtasks Test", "Haider", "Alee").
- **Package state lives in tags** (`2/3/4/5 concepts`, `basic/premium/elite/standard pack`, `social media kit`, `complete branding kit`, `approved qa`, `revision`, `delivered`, `my order`); the `Deliverables` custom field exists (Designers Team space) but is unused.
- **No CSR field, no Profile field, no Order Value, no Fiverr Order ID** anywhere — workspace, space, and list custom fields all returned empty. The retrofit (§6) is genuinely required; until then production rows attribute to blank.
- **Hygiene risk (confirmed):** duplicate tasks for one client across designers (e.g. `OOVERT` ×3 tagged `my order`, `VisaTalents` ×2), test tasks leaking into live lists, inconsistent tags. The `Fiverr Order ID` join key matters for **de-duplication**, not just the revenue join.

---

## 6. ClickUp retrofit — three required custom fields

Workspace-level (none exist today; workspace-level makes them available on every list). **Required at task creation.** Optional = silent holes = worse than nothing.

| Field | Type | Options / format |
|---|---|---|
| `CSR` | dropdown | the canonical roster (Section 3) |
| `Profile` | dropdown | the exact 10 profile names (Section 3) |
| `Fiverr Order ID` | short text | Fiverr order number — join key to the Order Sheet |

Keep designer as list membership. Resolve `Deliverables` vs tags — pick one. Do not add order value (stays in the sheet).

**Creation discipline:** the CSR who takes the order creates the task with all three fields set, in one owned step.

---

## 7. The build

### 7a. Apps Script — the only new server-side component
Lives in the Order Management workbook (browser can't call ClickUp: CORS + key exposure). On a time trigger:

1. Pull ClickUp `Designers Team` tasks + **status history** via raw REST.
2. **Revisions per task** = (entries into the client-delivery status) − 1, floor 0. In this workspace the client-delivery status surfaces as `client response`; confirm the exact status name(s) against a raw history dump and pin the set.
3. Derive deliveries, current stage, and SLA timing (time in `to do`, time in `client response`) per task.
4. Read the **Inquiry Sheet**; compute conversion per CSR × Profile (orders ÷ inquiries).
5. Write a **`Production & Conversion`** tab into the workbook (standardized headers, gviz-readable), keyed `CSR × Profile × Fiverr Order ID`.

### 7b. CSR Pulse extension — small, reuses everything
- Add the new tab to its existing gviz sync (same mechanism already in `SHARED_SYNC` / `autoSyncFromGSheets`).
- Render conversion, revisions-per-order, and SLA panels alongside the existing revenue panels.
- Add the same rows to the CEO PDF (reuse the existing jsPDF framework).

### 7c. Result
CEO view = CSR Pulse extended: revenue + margin + leaderboard + shift (already live) **plus** conversion + revisions + SLA (new). No Supabase, no new backend, no parallel system. The chat report dies.

---

## 8. Join keys

- Revenue (Order Sheet) is already attributed by CSR × Profile via the profile tabs + CSR column.
- ClickUp production is attributed by CSR × Profile via the new fields.
- **Per-order linkage** (revisions-per-order, "order assigned but no draft in SLA" leak) needs `Fiverr Order ID` on both the task and the Order Sheet. If the Order Sheet lacks an order-ID column, per-order linkage falls back to client-name match; the CSR × Profile aggregates still work without it.
- Conversion joins inquiries to orders on **buyer username**.

---

## 9. CEO outputs

**Daily — exception line (not an activity feed):** lost lead (inquiry, no order in N days), stalled production (task past SLA), sub-target completion (below profile floor), revenue pace vs target.
Rule: reading is allowed, reacting is not — the only output is a delegated instruction, never the CEO doing the fix.

**Weekly — per-CSR scorecard (the review):** conversion (orders ÷ inquiries), revenue per CSR per profile, SLA hit rate, avg revisions per order. Activity counts dropped from the leaderboard.

---

## 10. Data hygiene — gating requirements

1. ClickUp `CSR`, `Profile`, `Fiverr Order ID` required at creation.
2. Designers flip status on every redelivery (revision count depends on it).
3. One package-type system (field or tags, not both).
4. Cancelled tasks excluded from production/revenue counts.
5. Sheets logged live, not reconstructed at shift end.

---

## 11. Rollout

1. **Week 1 (near-zero build):** add the 3 ClickUp fields (required); confirm the Inquiry Sheet structure; stop CSRs typing production lines in chat.
2. **Week 2:** Apps Script — ClickUp pull + revision count + conversion → `Production & Conversion` tab. Validate revision counts against a known task; pin the client-delivery status set.
3. **Week 3:** extend CSR Pulse to sync + render the new tab and add the PDF rows. Kill the chat report.

---

## 12. Open items to confirm at build

- ✅ **ClickUp status names (RESOLVED, Jun 2026):** live space uses `pickup your projects → deliver to client → client response → revision → revision complete → complete`. Revision count = entries into `revision`; delivery count = entries into `deliver to client`. Pinned in the script.
- ✅ **Revision-count feasibility (RESOLVED):** status history is chronological → viable via raw REST. (The ClickUp MCP `time_in_status` tool has a null-color validation bug; the Apps Script bypasses it with `UrlFetchApp`.)
- ✅ **Inquiry Sheet (CONFIRMED to exist):** provide its Google Sheet ID for `INQUIRY_SHEET_ID` in the script (still `TODO_PASTE_INQUIRY_SHEET_ID`).
- ⬜ **ClickUp retrofit (NOT DONE):** add `CSR`, `Profile`, `Fiverr Order ID` custom fields (workspace-level, required at creation). Field creation is a ClickUp admin/UI step (not exposed via the MCP tools available here). Until done, production attribution is blank.
- ⬜ **Order Sheet:** confirm a Fiverr Order ID column exists (for per-order ClickUp linkage / de-dup).
- ⬜ **CSR Pulse patch:** the CSR Pulse codebase is not in this repo — provide it (or its repo) to build the §7b render/PDF extension.
- ⬜ SLA thresholds per stage; per-profile revenue floors and cost inputs.
