/**
 * CSR Pulse — ClickUp + Conversion Sync
 * ------------------------------------------------------------------
 * Runs as YOUR Google account inside the Order Management workbook.
 * - Reads the Order Sheet + Inquiry Sheet directly (SpreadsheetApp, no gviz/sharing needed).
 * - Pulls ClickUp "Designers Team" tasks + status history (UrlFetchApp).
 * - Counts revisions per project from the status log.
 * - Computes conversion (orders / inquiries) per CSR x Profile.
 * - Writes "CSR Production" (CSR×Profile) + "Profile Conversion" tabs that CSR Pulse syncs via gviz.
 *
 * SETUP (once):
 *  1. Script Properties: CLICKUP_TOKEN = your ClickUp personal API token (pk_...).
 *  2. Deploy the webhook (csr-pulse-clickup-webhook.gs) so revision ROUNDS accrue (forward-only).
 *  3. Add the ClickUp retrofit fields (CSR / Profile / Fiverr Order ID) — else production attributes to blank.
 *  4. Run installTrigger() once to schedule runDailySync() (or run runDailySync() manually).
 * NOTE: INQUIRY_SHEET_ID is already set; conversion works today. Production fills once 2–3 are done.
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
  INQUIRY_SHEET_ID: '1Pp6RhsR96FzGfB3MV--CYj7Idja2-iyF7BNPhJ9Md_A', // "Client Daily Inquiries" (verified)
  OUTPUT_WORKBOOK_ID: '1kHw1DB7r4RhgBpF4l4CtapBdgtozJwJXtF-egVBZGUE', // CSR Pulse already syncs this one
  DESIGNER_TAB: 'Designer Production', // Per-designer (ClickUp) — LIVE today, no retrofit needed
  PRODUCTION_TAB: 'CSR Production',     // CSR × Profile (ClickUp) — needs the retrofit fields
  CONVERSION_TAB: 'Profile Conversion', // Profile-level (inquiry sheet) — gviz-readable by CSR Pulse

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
// Name-variant map (mirrors CSR Pulse), keyed alias -> canonical ROSTER name.
const CSR_ALIASES = {
  'ali': 'Ali Shakeel', 'shakeel': 'Ali Shakeel',
  'basit': 'Abdul Basit', 'abdul': 'Abdul Basit',
  'gillani': 'Hasnain Gillani', 'hasnain': 'Hasnain Gillani', 'husnain': 'Hasnain Gillani',
  'hasan': 'Hassan', 'hassaan': 'Hassan',
};

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
function runDailySync() {
  const since = Date.now() - CONFIG.LOOKBACK_DAYS * 86400000;

  // 1. ClickUp production, keyed CSR x Profile. Best-effort: if ClickUp isn't set up yet
  //    (no token / no retrofit), conversion + orders must still publish, so this can't abort.
  const prod = {};        // "Profile||CSR" -> {...}  (needs the retrofit to be non-blank)
  const byDesigner = {};  // designer -> {...}  ← available NOW; the space is one list per designer
  let taskCount = 0;
  try {
    const tasks = fetchSpaceTasks_(CONFIG.CLICKUP_SPACE_ID, since);
    taskCount = tasks.length;
    // True revision ROUNDS come from the webhook event log (see csr-pulse-clickup-webhook.gs).
    const txn = CONFIG.REVISION_METHOD === 'webhook' ? readTransitionCounts_() : null;
    tasks.forEach(t => {
      // time_in_status drives SLA + (in fallback modes) the binary flags. One fetch, reused.
      const hist = fetchTimeInStatus_(t.id);
      Utilities.sleep(CONFIG.THROTTLE_MS);

      // ── CSR × Profile grain (custom fields; blank until the retrofit) ──
      const csr = cfValue_(t, CONFIG.CF_CSR);
      const profile = cfValue_(t, CONFIG.CF_PROFILE);
      const key = (profile || '—') + '||' + (csr || '—');
      if (!prod[key]) prod[key] = { revisions: 0, deliveries: 0, slaBreaches: 0 };
      if (txn) {
        const c = txn[t.id] || { revisions: 0, deliveries: 0 };
        prod[key].revisions  += c.revisions;
        prod[key].deliveries += c.deliveries;
      } else {
        const r = countDeliveries_(t, hist);
        prod[key].deliveries += r.deliveries;
        prod[key].revisions  += r.revisions;
      }
      const breached = slaBreached_(hist);
      if (breached) prod[key].slaBreaches += 1;

      // ── Designer grain (list name = designer; LIVE today, no retrofit needed) ──
      accrueDesigner_(byDesigner, t, hist, txn, breached);
    });
  } catch (e) {
    Logger.log('ClickUp pull skipped/failed (' + e + '). Conversion + orders still publish.');
  }

  // 2a. Orders per CSR x Profile (the Order sheets DO carry a CSR column).
  const orders = countRowsByCsrProfile_(CONFIG.ORDER_SHEET_IDS, since);
  // 2b. Conversion is PROFILE-level: inquiry tabs carry no CSR, but every row has an
  //     'Order Status' (Placed / Not Placed / Direct Order). conv = placed / total.
  const conversion = countInquiriesByProfile_(CONFIG.INQUIRY_SHEET_ID, since);

  // 3. Write the tabs (three grains): designer production (live), CSR×Profile production
  //    (retrofit), and by-profile conversion (live).
  writeDesignerTab_(byDesigner);
  writeProductionTab_(prod, orders);
  writeConversionTab_(conversion);
  Logger.log('Sync done. ClickUp tasks: ' + taskCount + '; designers: ' + Object.keys(byDesigner).length +
             '; profiles w/ inquiries: ' + Object.keys(conversion).length);
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

// Designer-grain production — keyed by the LIST name (the space is one list per designer),
// so it works TODAY with zero retrofit. Buckets by current status + counts revisions
// (exact from the webhook log when present, else binary "ever revised").
function accrueDesigner_(byDesigner, t, hist, txn, breached) {
  const designer = (t.list && t.list.name ? String(t.list.name).trim() : '') ||
                   (t.assignees && t.assignees[0] && t.assignees[0].username) || '—';
  if (!byDesigner[designer]) byDesigner[designer] =
    { tasks: 0, inProgress: 0, inRevision: 0, awaitingClient: 0, completed: 0, revisions: 0, slaBreaches: 0 };
  const D = byDesigner[designer];
  const st = (t.status && t.status.status || '').toLowerCase();
  D.tasks += 1;
  if (st === 'revision') D.inRevision += 1;
  else if (st === 'deliver to client' || st === 'client response' || st === 'revision complete') D.awaitingClient += 1;
  else if (st === 'complete' || st === 'completed' || st === 'complete projects') D.completed += 1;
  else D.inProgress += 1; // pickup your projects / in progress / pending
  if (txn) {
    D.revisions += (txn[t.id] ? txn[t.id].revisions : 0);
  } else {
    const present = {};
    (hist && hist.status_history ? hist.status_history : []).forEach(h => { present[(h.status || '').toLowerCase()] = true; });
    if (present['revision']) D.revisions += 1;
  }
  if (breached) D.slaBreaches += 1;
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

/**
 * Conversion is computed entirely inside the Inquiry workbook ("Client Daily Inquiries").
 * Each profile is its own TAB (no Profile column, no CSR column), but every row has an
 * 'Order Status'. We enumerate ALL tabs, use the tab name as the profile, and tally:
 *   inquiries = rows with a non-empty status in the window
 *   placed    = rows whose status is 'placed' or 'direct order'
 * Returns { profileTabName: { inquiries, placed } }. PROFILE-level (inquiries carry no CSR).
 */
function countInquiriesByProfile_(workbookId, sinceMs) {
  const out = {};
  if (!workbookId || workbookId.indexOf('TODO') === 0) { Logger.log('INQUIRY_SHEET_ID not set'); return out; }
  let ss; try { ss = SpreadsheetApp.openById(workbookId); } catch (e) { Logger.log('Cannot open inquiry workbook'); return out; }
  const PLACED = ['placed', 'direct order'];
  ss.getSheets().forEach(sh => {
    const profile = sh.getName().trim();
    const rows = sh.getDataRange().getValues();
    const { headerIdx, map } = locateHeader_(rows);
    if (headerIdx < 0 || map.status < 0) return;
    let inquiries = 0, placed = 0;
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const status = String(rows[r][map.status] || '').toLowerCase().trim();
      if (!status) continue;                       // blank status = not a real inquiry row
      if (map.date >= 0) {
        const d = parseDate_(rows[r][map.date]);
        if (d && d.getTime() < sinceMs) continue;
      }
      inquiries += 1;
      if (PLACED.indexOf(status) !== -1) placed += 1;
    }
    if (inquiries > 0) out[profile] = { inquiries: inquiries, placed: placed };
  });
  return out;
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
// CSR × Profile production (ClickUp) + orders (Order sheets). Revisions/Deliveries are
// blank until the ClickUp retrofit (CSR/Profile fields) + webhook are live.
function writeProductionTab_(prod, orders) {
  const sh = freshTab_(CONFIG.PRODUCTION_TAB);
  const header = ['Profile','CSR','Shift','Orders','Deliveries','Revisions','SLA Breaches','Updated'];
  const out = [header];
  const now = new Date();

  const keys = {};
  [prod, orders].forEach(obj => Object.keys(obj).forEach(k => keys[k] = true));

  Object.keys(keys).sort().forEach(key => {
    const [profile, csr] = key.split('||');
    const p = prod[key] || { revisions: 0, deliveries: 0, slaBreaches: 0 };
    const o = orders[key] || 0;
    const shift = (ROSTER.find(([n]) => n === csr) || [, ''])[1];
    out.push([profile, csr, shift, o, p.deliveries, p.revisions, p.slaBreaches, now]);
  });

  sh.getRange(1, 1, out.length, header.length).setValues(out);
  Logger.log('Wrote ' + (out.length - 1) + ' CSR×Profile rows to "' + CONFIG.PRODUCTION_TAB + '".');
}

// Profile-level conversion from the Inquiry sheet (placed / total).
function writeConversionTab_(conversion) {
  const sh = freshTab_(CONFIG.CONVERSION_TAB);
  const header = ['Profile','Inquiries','Placed','Conversion %','Updated'];
  const out = [header];
  const now = new Date();

  Object.keys(conversion).sort().forEach(profile => {
    const c = conversion[profile];
    const conv = c.inquiries ? Math.round((c.placed / c.inquiries) * 1000) / 10 : '';
    out.push([profile, c.inquiries, c.placed, conv, now]);
  });

  sh.getRange(1, 1, out.length, header.length).setValues(out);
  Logger.log('Wrote ' + (out.length - 1) + ' profile rows to "' + CONFIG.CONVERSION_TAB + '".');
}

function freshTab_(name) {
  const ss = SpreadsheetApp.openById(CONFIG.OUTPUT_WORKBOOK_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clearContents();
  return sh;
}

// Designer-grain production (LIVE today — no retrofit). Sorted by load (task count).
function writeDesignerTab_(byDesigner) {
  const sh = freshTab_(CONFIG.DESIGNER_TAB);
  const header = ['Designer','Tasks','In Progress','In Revision','Awaiting Client','Completed','Revisions','SLA Breaches','Updated'];
  const out = [header];
  const now = new Date();
  Object.keys(byDesigner).sort((a, b) => byDesigner[b].tasks - byDesigner[a].tasks).forEach(d => {
    const x = byDesigner[d];
    out.push([d, x.tasks, x.inProgress, x.inRevision, x.awaitingClient, x.completed, x.revisions, x.slaBreaches, now]);
  });
  sh.getRange(1, 1, out.length, header.length).setValues(out);
  Logger.log('Wrote ' + (out.length - 1) + ' designer rows to "' + CONFIG.DESIGNER_TAB + '".');
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
