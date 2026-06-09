# CSR Reporting Automation

Kills the manual CSR shift report. A small data pipeline pulls from ClickUp and the
inquiry sheet; a standalone **Reports app** renders the CEO view. Zero backend.

```
ClickUp ─┐
         ├─► Apps Script sync ──► Google Sheet tabs ──► Reports app (this repo) ──► CEO view + PDF
Inquiry ─┘   (csr-pulse-clickup-*.gs)   (3 report tabs)        (reports-app/)
 sheet
```

## What's here

| Path | What it is |
|---|---|
| **`reports-app/`** | **The deliverable** — standalone React/Vite reporting dashboard. Reads the report tabs via gviz; no backend. |
| `csr-pulse-clickup-sync.gs` | Apps Script pipeline: pulls ClickUp + the inquiry sheet, writes `Designer Production`, `Profile Conversion`, `CSR Production` tabs. |
| `csr-pulse-clickup-webhook.gs` | ClickUp status-change webhook → `Status Transitions` event log (for exact revision rounds). |
| `csr-reporting-automation-build-spec.md` | Design spec, grounded against the live workspace. |
| `DEPLOY.md` | Step-by-step go-live runbook. |
| `csr-pulse/` | Reference copy of the **separate** revenue app (CSR Pulse). Not deployed from here. |

## The three report grains

| View | Grain | Source | Status |
|---|---|---|---|
| **Designer Production** | by designer | ClickUp | **live today** (no retrofit) |
| **Conversion** | by profile | inquiry sheet | live after one sync run |
| **CSR Production** | CSR × profile | ClickUp + retrofit fields | needs the 3 ClickUp custom fields |

## Quick start (the app)

```bash
cd reports-app
npm install
npm run dev      # local dev
npm run build    # production build → dist/ (deploy to Vercel like CSR Pulse)
```

Set the data source at the top of `reports-app/src/Reports.jsx` (`REPORTS.workbookUrl`)
to the workbook the Apps Script sync writes to. The workbook must be shared
**"Anyone with the link can view."**

## Quick start (the pipeline)

See **`DEPLOY.md`**. Short version: paste the two `.gs` files into an Apps Script
project, set `CLICKUP_TOKEN`, run `runDailySync()`, then `installTrigger()`.
Conversion + Designer Production light up immediately; CSR-grain fills once the
ClickUp `CSR`/`Profile` fields are added.
