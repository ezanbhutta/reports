/**
 * CSR Pulse — ClickUp Status-Transition Webhook (the event log)
 * ---------------------------------------------------------------------------
 * Deploy as a Web App. ClickUp POSTs every task status change here, and we
 * append it to a "Status Transitions" sheet. That sheet IS the event log:
 * revision ROUNDS, client deliveries, and full per-task timelines all derive
 * from it. Forward-only — it captures events from deployment day onward (it
 * cannot backfill rounds that happened before setup).
 *
 * Pairs with csr-pulse-clickup-sync.gs (set CONFIG.REVISION_METHOD = 'webhook'
 * there to read true round counts from this log).
 *
 * SETUP (once):
 *  1. Script Properties:
 *       WEBHOOK_TOKEN = any long random string (shared secret for the URL).
 *       CLICKUP_TOKEN = your ClickUp personal token (pk_...), if not already set.
 *     NOTE: Apps Script web apps cannot read request headers, so ClickUp's
 *     X-Signature (HMAC) can't be verified. We gate on a ?token= query param
 *     instead — keep WEBHOOK_TOKEN long and secret.
 *  2. Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access:
 *     Anyone. Copy the /exec URL.
 *  3. Paste it into WEB_APP_URL below, then run registerClickUpWebhook() ONCE.
 *     (Or register manually in ClickUp with endpoint = <url>?token=<WEBHOOK_TOKEN>
 *      and event 'taskStatusUpdated'.)
 *  4. Verify with listClickUpWebhooks(); flip a task's status and watch the
 *     "Status Transitions" tab fill in.
 */

const WEBHOOK_CFG = {
  OUTPUT_WORKBOOK_ID: '1kHw1DB7r4RhgBpF4l4CtapBdgtozJwJXtF-egVBZGUE', // same workbook the sync writes to
  LOG_TAB: 'Status Transitions',
  CLICKUP_TEAM_ID: '9018453434',
  CLICKUP_SPACE_ID: '90187090116', // scope events to Designers Team — keeps ops/attendance out of the log
  WEB_APP_URL: 'PASTE_YOUR_DEPLOYED_WEB_APP_/exec_URL', // fill after step 2
};

// ── Web app entry points ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
    if (token && (!e || !e.parameter || e.parameter.token !== token)) {
      return _txt('forbidden');
    }
    if (!e || !e.postData || !e.postData.contents) return _txt('no body');
    const body = JSON.parse(e.postData.contents);

    const rows = [];
    const now = new Date();
    (body.history_items || []).forEach(h => {
      if ((h.field || '') !== 'status') return;
      const from = (h.before && (h.before.status || '')) || '';
      const to   = (h.after  && (h.after.status  || '')) || '';
      const when = h.date ? new Date(Number(h.date)) : now;
      const user = (h.user && (h.user.username || h.user.email)) || '';
      rows.push([when, body.task_id || '', body.event || '', from, to, user]);
    });
    if (rows.length) appendTransitions_(rows);
    return _txt('ok ' + rows.length);
  } catch (err) {
    return _txt('error: ' + err);
  }
}

function doGet() { return _txt('CSR Pulse webhook is live.'); } // health check

function _txt(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }

function appendTransitions_(rows) {
  const ss = SpreadsheetApp.openById(WEBHOOK_CFG.OUTPUT_WORKBOOK_ID);
  let sh = ss.getSheetByName(WEBHOOK_CFG.LOG_TAB);
  if (!sh) {
    sh = ss.insertSheet(WEBHOOK_CFG.LOG_TAB);
    sh.appendRow(['Timestamp', 'Task ID', 'Event', 'From Status', 'To Status', 'User']);
    sh.setFrozenRows(1);
  }
  // Use a lock — ClickUp can fire concurrent events.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  } finally {
    lock.releaseLock();
  }
}

// ── One-time setup / admin helpers ────────────────────────────────────────
function registerClickUpWebhook() {
  const token   = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
  const cuToken = PropertiesService.getScriptProperties().getProperty('CLICKUP_TOKEN');
  if (!token)   throw new Error('Set WEBHOOK_TOKEN in Script Properties first.');
  if (!cuToken) throw new Error('Set CLICKUP_TOKEN in Script Properties first.');
  if (WEBHOOK_CFG.WEB_APP_URL.indexOf('http') !== 0) throw new Error('Set WEBHOOK_CFG.WEB_APP_URL to your deployed /exec URL first.');

  const endpoint = WEBHOOK_CFG.WEB_APP_URL + '?token=' + encodeURIComponent(token);
  const payload = { endpoint: endpoint, events: ['taskStatusUpdated'] };
  if (WEBHOOK_CFG.CLICKUP_SPACE_ID) payload.space_id = Number(WEBHOOK_CFG.CLICKUP_SPACE_ID);
  const res = UrlFetchApp.fetch('https://api.clickup.com/api/v2/team/' + WEBHOOK_CFG.CLICKUP_TEAM_ID + '/webhook', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: cuToken },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  Logger.log('register -> ' + res.getResponseCode() + ': ' + res.getContentText());
}

function listClickUpWebhooks() {
  const cuToken = PropertiesService.getScriptProperties().getProperty('CLICKUP_TOKEN');
  const res = UrlFetchApp.fetch('https://api.clickup.com/api/v2/team/' + WEBHOOK_CFG.CLICKUP_TEAM_ID + '/webhook',
    { headers: { Authorization: cuToken }, muteHttpExceptions: true });
  Logger.log(res.getContentText());
}

// Delete a webhook by id (from listClickUpWebhooks) if you need to re-point it.
function deleteClickUpWebhook(webhookId) {
  const cuToken = PropertiesService.getScriptProperties().getProperty('CLICKUP_TOKEN');
  const res = UrlFetchApp.fetch('https://api.clickup.com/api/v2/webhook/' + webhookId,
    { method: 'delete', headers: { Authorization: cuToken }, muteHttpExceptions: true });
  Logger.log('delete -> ' + res.getResponseCode() + ': ' + res.getContentText());
}
