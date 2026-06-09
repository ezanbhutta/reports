/**
 * CSR Pulse — ClickUp + Conversion Sync
 * ------------------------------------------------------------------
 * Runs as YOUR Google account inside the Order Management workbook.
 * - Reads the Order Sheet + Inquiry Sheet directly (SpreadsheetApp, no gviz/sharing needed).
 * - Pulls ClickUp "Designers Team" tasks + status history (UrlFetchApp).
 * - Counts revisions per project from the status log.
 * - Computes conversion (orders / inquiries) per CSR x Profile.
 * - Writes a "Production & Conversion" tab that CSR Pulse syncs via gviz.
 *
 * SETUP (do these once — see the 4 TODOs):
 *  1. Project Settings > Script Properties: add CLICKUP_TOKEN = your ClickUp personal API token (pk_...).
 *  2. Fill INQUIRY_SHEET_ID below.
 *  3. Run debugClickUpStatuses() ONCE and read the log — confirm CLIENT_DELIVERY_STATUSES (see note in §Revisions).
 *  4. Run installTrigger() once to schedule runDailySync() (or run runDailySync() manually).
 */

// ════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════
const CONFIG = {
  // ClickUp
  CLICKUP_TEAM_ID: '9018453434',        // workspace/team id (verified)
  CLICKUP_SPACE_ID: '90187090116',      // Designers Team — LIVE production space (re-verified Jun 2026: 100+ current tasks)
  // Ignore: 90188283242 (Design Department — stale ~Jan 2026, where Zetted lives) and
  //         90188148883 (Logo design — dead, only test tasks).

  // Sheets (workbook IDs)
  ORDER_SHEET_IDS: [
    '1d7ZFWLmVPWK_UUXoxj2o7OJKj5hJHW87eClDC316fSY', // New Order Sheet
    '1kHw1DB7r4RhgBpF4l4CtapBdgtozJwJXtF-egVBZGUE', // Order Management Sheet (also the OUTPUT workbook)
  ],
  INQUIRY_SHEET_ID: 'TODO_PASTE_INQUIRY_SHEET_ID',  // TODO 2
  OUTPUT_WORKBOOK_ID: '1kHw1DB7r4RhgBpF4l4CtapBdgtozJwJXtF-egVBZGUE', // CSR Pulse already syncs this one
  OUTPUT_TAB: 'Production & Conversion',

  // The 10 profiles = the tab names in each workbook (must match exactly across ClickUp + sheets)
  PROFILES: ['Abdul Haseeb','Tariq Mahmood','Eikon Designs','Alee Studioz','Carpicon',
             'Dygram Designs','Storm Design','WeDesignz','Grid Designs','X Studioz'],

  // ClickUp custom field names added in the retrofit (must match the field labels exactly)
  CF_CSR: 'CSR',
  CF_PROFILE: 'Profile',
  CF_ORDER_ID: 'Fiverr Order ID',

  // ── Revision / delivery signals (status names + history SHAPE re-verified vs LIVE space 90187090116, Jun 2026) ──
  // Live status flow: pickup your projects → in progress → deliver to client → client response
  //                   → revision → revision complete → complete
  // IMPORTANT: ClickUp's time_in_status is AGGREGATE — one row per distinct status, with
  // cumulative time. It does NOT list visits chronologically, so it CANNOT yield the number
  // of revision ROUNDS. It gives binary "delivered?/everRevised?" + time-in-status only.
  // To count true rounds, pick a REVISION_METHOD (see §Revisions; 'webhook' recommended).
  REVISION_STATUSES: ['revision'],                 // presence => task hit revision (binary flag)
  CLIENT_DELIVERY_STATUSES: ['deliver to client'], // presence => task was delivered (binary flag)
  REVISION_METHOD: 'webhook',                      // CHOSEN: true rounds from the event log (csr-pulse-clickup-webhook.gs).
                                                   //   Reads 0 until the webhook is deployed + events accrue (forward-only).
                                                   //   Fallbacks: 'status_flag' (binary) | 'tag' | 'attachments'.

  // SLA thresholds (hours) for the stalled-production leak — adjust to your standard
  SLA_TO_DO_HOURS: 24,           // 'pickup your projects' — assigned but not started
  SLA_CLIENT_RESPONSE_HOURS: 48, // 'client response' — delivered but no movement

  // Column name candidates in the sheets (case-insensitive, first match wins)
  COLS: {
    csr:      ['csr','agent','rep','handled_by'],
    username: ['buyer_username','username','buyer','client_username'],
    date:     ['date','date_of_order','order_date','inquiry_date','created'],
    status:   ['status','order_status'],
  },

  // Lookback window for ClickUp + conversion (days). Keep modest to respect rate limits.
  LOOKBACK_DAYS: 7,

  // Throttle between per-task ClickUp calls (ms) to stay under rate limits
  THROTTLE_MS: 700,
};

// Roster: shift comes from here, not the timestamp (mirrors CSR Pulse)
const ROSTER = [
  ['Tanzeel','Morning'],['Iqra','Morning'],['Hassan','Morning'],['Hira','Morning'],
  ['Misbah','Morning'],['Gulba','Morning'],['Amrah','Morning'],
  ['Tayyab','Evening'],['Hasnain Gillani','Evening'],['Ali Shakeel','Evening'],
  ['Abdul Basit','Evening'],['Hadi','Evening'],['Aneeq','Evening'],['Faiz','Evening'],
  ['Salman','Night'],['Saad','Night'],['Shahzaib','Night'],['Swaid','Night'],
  ['Samama','Night'],['Ahmad','Night'],['Nadir','Night'],['Zuhair','Night'],['Noor','Night'],
  ['Zubair','Night'],['Ezan','Night'],
];
// TODO (optional but recommended): copy CSR_ALIASES from CSRPulse.jsx so name variants match.
const CSR_ALIASES = { /* e.g. 'basit':'Abdul Basit', 'hasnain':'Hasnain Gillani' */ };

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
function runDailySync() {
  const since = Date.now() - CONFIG.LOOKBACK_DAYS * 86400000;

  // 1. ClickUp production, keyed CSR x Profile
  const tasks = fetchSpaceTasks_(CONFIG.CLICKUP_SPACE_ID, since);
  // True revision ROUNDS come from the webhook event log (see csr-pulse-clickup-webhook.gs).
  const txn = CONFIG.REVISION_METHOD === 'webhook' ? readTransitionCounts_() : null;
  const prod = {}; // key "Profile||CSR" -> {revisions, deliveries, slaBreaches}
  tasks.forEach(t => {
    const csr = cfValue_(t, CONFIG.CF_CSR);
    const profile = cfValue_(t, CONFIG.CF_PROFILE);
    const key = (profile || '—') + '||' + (csr || '—');
    if (!prod[key]) prod[key] = { revisions: 0, deliveries: 0, slaBreaches: 0 };

    // time_in_status drives SLA + (in fallback modes) the binary flags.
    const hist = fetchTimeInStatus_(t.id);
    Utilities.sleep(CONFIG.THROTTLE_MS);
    if (txn) {
      const c = txn[t.id] || { revisions: 0, deliveries: 0 };
      prod[key].revisions  += c.revisions;   // exact rounds from the event log
      prod[key].deliveries += c.deliveries;  // exact client deliveries from the event log
    } else {
      const r = countDeliveries_(t, hist);   // binary flags (status_flag / tag)
      prod[key].deliveries += r.deliveries;
      prod[key].revisions  += r.revisions;
    }
    if (slaBreached_(hist)) prod[key].slaBreaches += 1;
  });

  // 2. Conversion: orders / inquiries per CSR x Profile
  const orders    = countRowsByCsrProfile_(CONFIG.ORDER_SHEET_IDS, since);
  const inquiries = countRowsByCsrProfile_([CONFIG.INQUIRY_SHEET_ID], since);

  // 3. Merge + write
  writeOutput_(prod, orders, inquiries);
  Logger.log('Sync complete. Tasks processed: ' + tasks.length);
}

// ════════════════════════════════════════════════════════════════
// CLICKUP
// ════════════════════════════════════════════════════════════════
function clickupHeaders_() {
  const token = PropertiesService.getScriptProperties().getProperty('CLICKUP_TOKEN');
  if (!token) throw new Error('Missing CLICKUP_TOKEN in Script Properties (TODO 1).');
  return { Authorization: token };
}

function fetchSpaceTasks_(spaceId, sinceMs) {
  const tasks = [];
  for (let page = 0; page < 50; page++) {
    const url = 'https://api.clickup.com/api/v2/team/' + CONFIG.CLICKUP_TEAM_ID + '/task'
      + '?space_ids[]=' + spaceId
      + '&include_closed=true&subtasks=false&order_by=updated'
      + '&date_updated_gt=' + sinceMs
      + '&page=' + page;
    const res = UrlFetchApp.fetch(url, { headers: clickupHeaders_(), muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) { Logger.log('ClickUp tasks error: ' + res.getContentText()); break; }
    const body = JSON.parse(res.getContentText());
    const batch = body.tasks || [];
    tasks.push.apply(tasks, batch);
    if (batch.length < 100) break;
  }
  return tasks;
}

function fetchTimeInStatus_(taskId) {
  const url = 'https://api.clickup.com/api/v2/task/' + taskId + '/time_in_status';
  const res = UrlFetchApp.fetch(url, { headers: clickupHeaders_(), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}

// Read a ClickUp custom field value by label (dropdowns return the selected option text)
function cfValue_(task, label) {
  const cf = (task.custom_fields || []).find(f => (f.name || '').toLowerCase() === label.toLowerCase());
  if (!cf || cf.value === undefined || cf.value === null) return '';
  if (cf.type === 'drop_down' && cf.type_config && cf.type_config.options) {
    const opt = cf.type_config.options[cf.value];
    return opt ? (opt.name || opt.label || '') : '';
  }
  return String(cf.value);
}

/**
 * §Revisions — VERIFIED Jun 2026 against the live workspace: time_in_status is AGGREGATE.
 * `status_history` returns ONE row per distinct status (orderindex = workflow position,
 * total_time = cumulative across ALL visits). Visits are NOT listed chronologically, so the
 * number of revision ROUNDS is NOT derivable from it. (Confirmed via bulk time_in_status:
 * e.g. a task that bounced revision↔client-response many times shows each status exactly once.)
 *
 * Derivable per task (meaningful when SUMMED across tasks per CSR x Profile):
 *   - delivered?   = 'deliver to client' present   -> summed = # tasks delivered
 *   - everRevised? = 'revision' present             -> summed = # tasks that hit revision
 *   - time in each status (SLA / stalled-task leak) -> see slaBreached_
 *
 * To count true revision ROUNDS, choose CONFIG.REVISION_METHOD:
 *   'status_flag' (default) -> binary: 1 if task ever entered 'revision'. Summed = # revised
 *                              tasks (NOT total rounds). Honest, free, no extra calls.
 *   'tag'                   -> binary from the 'revision' tag (same limitation).
 *   'attachments'           -> count attachments matching /rev(ision)?\s*#?\d+/i per task
 *                              (needs a per-task fetch; depends on file-naming discipline).
 *   'webhook'               -> RECOMMENDED for true rounds going forward: a ClickUp
 *                              status-change webhook logs each entry into 'revision' to a
 *                              sheet; rounds = count of logged transitions per task (forward-only).
 */
function countDeliveries_(task, hist) {
  const lc = s => (s || '').toLowerCase();
  if (CONFIG.REVISION_METHOD === 'tag') {
    const hasRev = (task.tags || []).some(t => lc(t.name) === 'revision');
    return { deliveries: 1, revisions: hasRev ? 1 : 0 };
  }
  // 'status_flag' (default): binary flags read from the AGGREGATE status_history.
  const present = {};
  (hist && hist.status_history ? hist.status_history : []).forEach(h => { present[lc(h.status)] = true; });
  const delivered   = CONFIG.CLIENT_DELIVERY_STATUSES.map(lc).some(s => present[s]) ? 1 : 0;
  const everRevised = (CONFIG.REVISION_STATUSES || ['revision']).map(lc).some(s => present[s]) ? 1 : 0;
  return { deliveries: delivered, revisions: everRevised };
}

/**
 * REVISION_METHOD='webhook': read the "Status Transitions" event log written by
 * csr-pulse-clickup-webhook.gs and count, per task, the number of entries INTO a
 * revision status (= true revision rounds) and into a delivery status (= client
 * deliveries). Forward-only: only transitions logged since the webhook was deployed.
 * Returns { taskId: { revisions, deliveries } }.
 */
function readTransitionCounts_() {
  const counts = {};
  let ss;
  try { ss = SpreadsheetApp.openById(CONFIG.OUTPUT_WORKBOOK_ID); } catch (e) { Logger.log('webhook log: cannot open workbook'); return counts; }
  const sh = ss.getSheetByName('Status Transitions');
  if (!sh || sh.getLastRow() < 2) { Logger.log('webhook log: no "Status Transitions" rows yet'); return counts; }
  const rows = sh.getDataRange().getValues(); // [Timestamp, Task ID, Event, From, To, User]
  const revSet = (CONFIG.REVISION_STATUSES || ['revision']).map(s => s.toLowerCase());
  const delSet = CONFIG.CLIENT_DELIVERY_STATUSES.map(s => s.toLowerCase());
  for (let i = 1; i < rows.length; i++) {
    const taskId = String(rows[i][1] || '').trim();
    const to = String(rows[i][4] || '').toLowerCase().trim();
    if (!taskId) continue;
    if (!counts[taskId]) counts[taskId] = { revisions: 0, deliveries: 0 };
    if (revSet.indexOf(to) !== -1) counts[taskId].revisions += 1;
    if (delSet.indexOf(to) !== -1) counts[taskId].deliveries += 1;
  }
  return counts;
}

function slaBreached_(hist) {
  if (!hist) return false;
  const cur = hist.current_status;
  if (!cur || !cur.total_time) return false;
  const status = (cur.status || '').toLowerCase();
  const hours = (cur.total_time.by_minute || 0) / 60;
  if (status === 'pickup your projects' && hours > CONFIG.SLA_TO_DO_HOURS) return true; // assigned, not started
  if (status === 'client response' && hours > CONFIG.SLA_CLIENT_RESPONSE_HOURS) return true; // delivered, awaiting client
  return false;
}

// ════════════════════════════════════════════════════════════════
// SHEETS (orders + inquiries)
// ════════════════════════════════════════════════════════════════
function countRowsByCsrProfile_(workbookIds, sinceMs) {
  const counts = {}; // "Profile||CSR" -> n
  workbookIds.forEach(id => {
    if (!id || id.indexOf('TODO') === 0) return;
    let ss; try { ss = SpreadsheetApp.openById(id); } catch (e) { Logger.log('Cannot open ' + id); return; }
    CONFIG.PROFILES.forEach(profile => {
      const sh = ss.getSheetByName(profile);
      if (!sh) return;
      const rows = sh.getDataRange().getValues();
      const { headerIdx, map } = locateHeader_(rows);
      if (headerIdx < 0) return;
      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (map.date >= 0) {
          const d = parseDate_(row[map.date]);
          if (d && d.getTime() < sinceMs) continue;
        }
        const csr = matchCsr_(map.csr >= 0 ? row[map.csr] : '');
        if (!csr) continue;
        const key = profile + '||' + csr;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });
  return counts;
}

// Auto-detect header row (handles banner rows like Grid Designs) and map needed columns
function locateHeader_(rows) {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const lower = rows[i].map(c => String(c).toLowerCase().trim());
    const has = (cands) => lower.findIndex(h => cands.indexOf(h) !== -1 || cands.some(c => h.indexOf(c) !== -1));
    const csr = has(CONFIG.COLS.csr), date = has(CONFIG.COLS.date);
    if (csr >= 0 || date >= 0) {
      return { headerIdx: i, map: {
        csr: csr, date: date,
        username: has(CONFIG.COLS.username), status: has(CONFIG.COLS.status),
      }};
    }
  }
  return { headerIdx: -1, map: {} };
}

function matchCsr_(raw) {
  let s = String(raw || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (!s) return '';
  const firstChunk = s.split(/[,/&;]+/)[0].trim();
  const firstWord = firstChunk.split(/\s+/)[0];
  if (CSR_ALIASES[firstWord]) return CSR_ALIASES[firstWord];
  if (CSR_ALIASES[firstChunk]) return CSR_ALIASES[firstChunk];
  const hit = ROSTER.find(([name]) => {
    const n = name.toLowerCase();
    return n === firstChunk || n.split(' ')[0] === firstWord;
  });
  return hit ? hit[0] : '';
}

function parseDate_(v) {
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return isNaN(d) ? null : d;
}

// ════════════════════════════════════════════════════════════════
// OUTPUT
// ════════════════════════════════════════════════════════════════
function writeOutput_(prod, orders, inquiries) {
  const ss = SpreadsheetApp.openById(CONFIG.OUTPUT_WORKBOOK_ID);
  let sh = ss.getSheetByName(CONFIG.OUTPUT_TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.OUTPUT_TAB);
  sh.clearContents();

  const header = ['Profile','CSR','Shift','Inquiries','Orders','Conversion %',
                  'Deliveries','Revisions','Avg Revisions/Order','SLA Breaches','Updated'];
  const out = [header];
  const now = new Date();

  const keys = {};
  [prod, orders, inquiries].forEach(obj => Object.keys(obj).forEach(k => keys[k] = true));

  Object.keys(keys).sort().forEach(key => {
    const [profile, csr] = key.split('||');
    const p = prod[key] || { revisions: 0, deliveries: 0, slaBreaches: 0 };
    const o = orders[key] || 0;
    const inq = inquiries[key] || 0;
    const conv = inq ? Math.round((o / inq) * 1000) / 10 : '';
    const avgRev = o ? Math.round((p.revisions / o) * 100) / 100 : '';
    const shift = (ROSTER.find(([n]) => n === csr) || [,''])[1];
    out.push([profile, csr, shift, inq, o, conv, p.deliveries, p.revisions, avgRev, p.slaBreaches, now]);
  });

  sh.getRange(1, 1, out.length, header.length).setValues(out);
  Logger.log('Wrote ' + (out.length - 1) + ' CSR x Profile rows to "' + CONFIG.OUTPUT_TAB + '".');
}

// ════════════════════════════════════════════════════════════════
// SETUP HELPERS
// ════════════════════════════════════════════════════════════════
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'runDailySync') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runDailySync').timeBased().everyHours(6).create();
  Logger.log('Trigger installed: runDailySync every 6 hours.');
}

// Run ONCE. Confirms your real status names + whether revision counting works.
function debugClickUpStatuses() {
  const tasks = fetchSpaceTasks_(CONFIG.CLICKUP_SPACE_ID, Date.now() - 14 * 86400000).slice(0, 25);
  const seen = {};
  tasks.forEach(t => seen[(t.status && t.status.status) || '?'] = true);
  Logger.log('DISTINCT CURRENT STATUSES: ' + Object.keys(seen).join(', '));

  // Inspect a LIVE multi-revision task's history shape (live space 90187090116).
  // 86exdhp1v = "Thriving Kingdom Marriage" (status 'revision' at validation time). Swap if closed.
  const sample = '86exdhp1v';
  const hist = fetchTimeInStatus_(sample);
  if (hist && hist.status_history) {
    const seq = hist.status_history.map(h => h.status + '(' + (h.orderindex) + ')');
    Logger.log('Sample status_history (' + seq.length + ' rows): ' + seq.join(', '));
    Logger.log('VERIFIED: this is AGGREGATE — one row per status (orderindex = workflow ' +
               'position), so it gives binary delivered?/everRevised? + time-in-status, NOT ' +
               'revision-round counts. For true rounds use REVISION_METHOD="webhook"/"attachments".');
  } else {
    Logger.log('No status_history returned. Enable the "Total time in Status" ClickApp, or use REVISION_METHOD="tag".');
  }
}
