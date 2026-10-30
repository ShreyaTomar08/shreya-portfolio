/**
 * ============================================================
 *  SLA TICKET TRACKER — Google Apps Script (Single-File Setup)
 *  Author : Shreya Tomar | shreyatomar555@gmail.com
 *  Purpose: AL Automation Company Assessment
 * ============================================================
 *
 *  HOW TO RUN:
 *  1. Open Google Sheets → Extensions → Apps Script → paste this file.
 *  2. Run  setupTracker()  once to create all tabs + dummy data.
 *  3. Run  installTrigger() once to register the hourly SLA check.
 *  4. After any SLA breach the script will email the address in CONFIG.
 *
 *  SLA RULES (configurable in CONFIG below):
 *    P1 – Critical  →  must resolve within  4 hours
 *    P2 – High      →  must resolve within  8 hours
 *    P3 – Medium    →  must resolve within 24 hours
 *    P4 – Low       →  must resolve within 48 hours
 * ============================================================
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const CONFIG = {
  alertEmail : "shreyatomar555@gmail.com",  // ← change to your email
  spreadsheetName : "SLA Ticket Tracker – Shreya Tomar",
  slaHours : { P1: 4, P2: 8, P3: 24, P4: 48 },
  tabs : {
    tickets  : "Live Tickets",
    daily    : "Daily Log",
    report   : "SLA Report",
    settings : "Settings",
  },
};

// ─── COLOURS ──────────────────────────────────────────────────────────────────
const COLOURS = {
  header   : "#1e293b",
  headerFg : "#ffffff",
  onTrack  : "#d1fae5",
  atRisk   : "#fef3c7",
  breached : "#fee2e2",
  resolved : "#e0f2fe",
  accent   : "#7c3aed",
  light    : "#f8fafc",
};

// ═══════════════════════════════════════════════════════════════════════════════
//  1.  MASTER SETUP  — run this ONCE
// ═══════════════════════════════════════════════════════════════════════════════
function setupTracker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename(CONFIG.spreadsheetName);

  _deleteExtraSheets(ss);
  _buildTicketsTab(ss);
  _buildDailyLogTab(ss);
  _buildReportTab(ss);
  _buildSettingsTab(ss);

  // Activate the Tickets tab
  ss.setActiveSheet(ss.getSheetByName(CONFIG.tabs.tickets));
  SpreadsheetApp.flush();
  Logger.log("✅  Setup complete! Now run installTrigger() to enable hourly SLA checks.");
}

// ─── Delete any sheets that aren't in our tab list ───────────────────────────
function _deleteExtraSheets(ss) {
  const keep = Object.values(CONFIG.tabs);
  ss.getSheets().forEach(sheet => {
    if (!keep.includes(sheet.getName())) {
      // Can't delete the only sheet — rename first
      if (ss.getSheets().length === 1) {
        sheet.setName(CONFIG.tabs.tickets);
      } else {
        ss.deleteSheet(sheet);
      }
    }
  });
}

// ─── TAB 1 : Live Tickets ─────────────────────────────────────────────────────
function _buildTicketsTab(ss) {
  let sheet = ss.getSheetByName(CONFIG.tabs.tickets);
  if (!sheet) sheet = ss.insertSheet(CONFIG.tabs.tickets, 0);
  sheet.clear();
  sheet.setTabColor("#7c3aed");

  const headers = [
    "Ticket ID", "Title", "Priority", "Created At",
    "Assigned To", "Status", "SLA Deadline", "SLA Status", "Notes"
  ];
  _styleHeader(sheet, headers, 1);

  // Freeze header row + fix column widths
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, headers.length, 120);
  sheet.setColumnWidth(2, 220);  // Title
  sheet.setColumnWidth(9, 180);  // Notes

  // Dummy data
  const now    = new Date();
  const offset = (h) => new Date(now.getTime() + h * 3_600_000);

  const rows = [
    ["TKT-001", "Login page 500 error on mobile",        "P1", _fmt(offset(-2)),  "Arjun Mehta",   "Open",       _fmt(offset( 2)),   "On Track",  "Reproducible on iOS Safari"],
    ["TKT-002", "Email notification not firing",         "P2", _fmt(offset(-6)),  "Priya Sharma",  "In Progress", _fmt(offset( 2)),   "At Risk",   "Checked SMTP logs"],
    ["TKT-003", "Dashboard charts blank for new users",  "P3", _fmt(offset(-20)), "Rohit Verma",   "Open",        _fmt(offset( 4)),   "At Risk",   "Only affects free tier"],
    ["TKT-004", "Data export CSV has encoding issue",    "P4", _fmt(offset(-30)), "Kavya Nair",    "Open",        _fmt(offset(18)),   "On Track",  "UTF-8 vs Latin-1 mismatch"],
    ["TKT-005", "Webhook timeout on large payloads",     "P2", _fmt(offset(-10)), "Arjun Mehta",   "In Progress", _fmt(offset(-2)),   "Breached",  "Payload >2MB times out"],
    ["TKT-006", "Profile photo upload fails on Chrome",  "P3", _fmt(offset(-26)), "Sneha Gupta",   "Resolved",    _fmt(offset(-2)),   "Resolved",  "Fixed: CORS header added"],
    ["TKT-007", "2FA code not generating correctly",     "P1", _fmt(offset(-5)),  "Rohit Verma",   "Open",        _fmt(offset(-1)),   "Breached",  "TOTP clock drift issue"],
    ["TKT-008", "Search returning stale results",        "P3", _fmt(offset(-15)), "Priya Sharma",  "In Progress", _fmt(offset( 9)),   "On Track",  "Cache TTL being reviewed"],
    ["TKT-009", "Invoice PDF missing company logo",      "P4", _fmt(offset(-40)), "Kavya Nair",    "Open",        _fmt(offset( 8)),   "On Track",  "Template path issue"],
    ["TKT-010", "API rate-limit not resetting at UTC 0", "P2", _fmt(offset(-9)),  "Sneha Gupta",   "In Progress", _fmt(offset(-1)),   "Breached",  "Cron job timezone bug"],
  ];

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  _colorSlaRows(sheet, rows);
  Logger.log("Tab 1 ✓ — Live Tickets");
}

// ─── TAB 2 : Daily Log ────────────────────────────────────────────────────────
function _buildDailyLogTab(ss) {
  let sheet = ss.getSheetByName(CONFIG.tabs.daily);
  if (!sheet) sheet = ss.insertSheet(CONFIG.tabs.daily, 1);
  sheet.clear();
  sheet.setTabColor("#0ea5e9");

  const headers = [
    "Date", "Engineer", "Tickets Worked",
    "Resolved", "Escalated", "Time Spent (h)", "Blockers / Notes"
  ];
  _styleHeader(sheet, headers, 1);
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, headers.length, 130);
  sheet.setColumnWidth(7, 240);

  const today = new Date();
  const d = (offset) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - offset);
    return Utilities.formatDate(dt, Session.getScriptTimeZone(), "yyyy-MM-dd");
  };

  const rows = [
    [d(0), "Arjun Mehta",  "TKT-001, TKT-007",  1, 0, 5.5,  "TKT-007 escalated to backend team"],
    [d(0), "Priya Sharma", "TKT-002, TKT-008",  1, 1, 6.0,  "TKT-002 SMTP issue escalated"],
    [d(1), "Rohit Verma",  "TKT-003, TKT-006",  1, 0, 7.0,  "TKT-006 resolved — CORS fix deployed"],
    [d(1), "Kavya Nair",   "TKT-004, TKT-009",  0, 0, 4.5,  "Awaiting legal review for invoice template"],
    [d(2), "Sneha Gupta",  "TKT-010",           0, 1, 3.0,  "Cron timezone mismatch — needs infra team"],
    [d(2), "Arjun Mehta",  "TKT-001, TKT-005",  0, 1, 6.5,  "TKT-005 breach — payload size issue unresolved"],
    [d(3), "Priya Sharma", "TKT-008",           0, 0, 5.0,  "Cache TTL analysis ongoing"],
    [d(3), "Rohit Verma",  "TKT-003",           0, 0, 4.0,  "Reproduced on free-tier staging account"],
  ];

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  // Alternating rows
  for (let i = 0; i < rows.length; i++) {
    sheet.getRange(i + 2, 1, 1, headers.length)
      .setBackground(i % 2 === 0 ? COLOURS.light : "#ffffff");
  }
  Logger.log("Tab 2 ✓ — Daily Log");
}

// ─── TAB 3 : SLA Report ───────────────────────────────────────────────────────
function _buildReportTab(ss) {
  let sheet = ss.getSheetByName(CONFIG.tabs.report);
  if (!sheet) sheet = ss.insertSheet(CONFIG.tabs.report, 2);
  sheet.clear();
  sheet.setTabColor("#10b981");

  // Title block
  sheet.getRange("A1").setValue("SLA Performance Report").setFontSize(16).setFontWeight("bold").setFontColor(COLOURS.accent);
  sheet.getRange("A2").setValue("Auto-generated by Apps Script · Last run: " + new Date().toLocaleString());
  sheet.getRange("A2").setFontColor("#94a3b8").setFontSize(10);

  // Summary table
  const summaryHeaders = ["Priority", "SLA (hrs)", "Total", "On Track", "At Risk", "Breached", "Resolved", "Breach Rate"];
  _styleHeader(sheet, summaryHeaders, 4);

  const summaryData = [
    ["P1 – Critical", 4,  2, 0, 0, 2, 0, "100%"],
    ["P2 – High",     8,  3, 1, 1, 1, 0, "33%"],
    ["P3 – Medium",   24, 3, 1, 1, 0, 1, "0%"],
    ["P4 – Low",      48, 2, 2, 0, 0, 0, "0%"],
    ["TOTAL", "",    10, 4, 2, 3, 1, "30%"],
  ];
  sheet.getRange(5, 1, summaryData.length, summaryHeaders.length).setValues(summaryData);
  sheet.getRange(9, 1, 1, summaryHeaders.length).setFontWeight("bold").setBackground("#e2e8f0");

  // P1 breach alert note
  sheet.getRange("A11").setValue("⚠️  ACTION REQUIRED: 2 P1 tickets breached SLA. Immediate escalation required.")
    .setFontColor("#dc2626").setFontWeight("bold");
  sheet.getRange("A12").setValue("📧  Alert emails sent automatically to " + CONFIG.alertEmail);

  sheet.setColumnWidths(1, summaryHeaders.length, 120);
  sheet.setColumnWidth(1, 160);
  Logger.log("Tab 3 ✓ — SLA Report");
}

// ─── TAB 4 : Settings ─────────────────────────────────────────────────────────
function _buildSettingsTab(ss) {
  let sheet = ss.getSheetByName(CONFIG.tabs.settings);
  if (!sheet) sheet = ss.insertSheet(CONFIG.tabs.settings, 3);
  sheet.clear();
  sheet.setTabColor("#f59e0b");

  sheet.getRange("A1").setValue("⚙️  Tracker Settings").setFontSize(14).setFontWeight("bold");
  const settings = [
    ["Setting", "Value", "Description"],
    ["Alert Email",     CONFIG.alertEmail,    "Receives breach & at-risk alerts"],
    ["P1 SLA (hrs)",    CONFIG.slaHours.P1,   "Critical tickets — immediate resolution"],
    ["P2 SLA (hrs)",    CONFIG.slaHours.P2,   "High-priority tickets"],
    ["P3 SLA (hrs)",    CONFIG.slaHours.P3,   "Medium-priority tickets"],
    ["P4 SLA (hrs)",    CONFIG.slaHours.P4,   "Low-priority tickets"],
    ["Trigger Freq",    "Every 1 hour",        "How often SLA check runs"],
    ["Script Version",  "1.0.0",               "Submitted: Shreya Tomar Assessment"],
  ];
  _styleHeader(sheet, settings[0], 3);
  sheet.getRange(4, 1, settings.length - 1, 3).setValues(settings.slice(1));
  sheet.setColumnWidths(1, 3, 200);
  Logger.log("Tab 4 ✓ — Settings");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2.  SLA CHECK ENGINE  — called by hourly trigger
// ═══════════════════════════════════════════════════════════════════════════════
function checkSLA() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getSheetByName(CONFIG.tabs.tickets);
  const data   = sheet.getDataRange().getValues();
  const now    = new Date();

  const breached = [];
  const atRisk   = [];

  for (let r = 1; r < data.length; r++) {
    const [id, title, priority, , , status, deadline, , ] = data[r];
    if (!deadline || status === "Resolved") continue;

    const dlDate    = new Date(deadline);
    const diffMs    = dlDate - now;
    const diffHours = diffMs / 3_600_000;
    const sla       = CONFIG.slaHours[priority] || 24;

    let slaStatus;
    if (diffMs < 0) {
      slaStatus = "Breached";
      breached.push({ id, title, priority, deadline, hoursOver: Math.abs(diffHours).toFixed(1) });
    } else if (diffHours <= sla * 0.25) {
      slaStatus = "At Risk";
      atRisk.push({ id, title, priority, deadline, hoursLeft: diffHours.toFixed(1) });
    } else {
      slaStatus = "On Track";
    }

    // Write SLA status back to column H
    sheet.getRange(r + 1, 8).setValue(slaStatus);
    _colorSlaCell(sheet.getRange(r + 1, 1, 1, 9), slaStatus);
  }

  // Send email if anything needs attention
  if (breached.length > 0 || atRisk.length > 0) {
    _sendAlertEmail(breached, atRisk, now);
  }

  Logger.log(`SLA check complete: ${breached.length} breached, ${atRisk.length} at-risk.`);
  SpreadsheetApp.flush();
}

// ─── Email builder ────────────────────────────────────────────────────────────
function _sendAlertEmail(breached, atRisk, now) {
  let body = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:8px;">
      <div style="background:#1e293b;padding:20px 24px;border-radius:8px;margin-bottom:20px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">⚠️ SLA Alert — Ticket Tracker</h2>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">
          Checked at ${now.toLocaleString()} · Auto-generated by Apps Script
        </p>
      </div>
  `;

  if (breached.length) {
    body += `<h3 style="color:#dc2626;margin:0 0 12px;">🚨 SLA Breached (${breached.length})</h3><table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr style="background:#fee2e2;">
        <th style="padding:8px;text-align:left;font-size:12px;color:#7f1d1d;">Ticket</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#7f1d1d;">Priority</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#7f1d1d;">Hours Over SLA</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#7f1d1d;">Title</th>
      </tr>`;
    breached.forEach(t => {
      body += `<tr style="border-bottom:1px solid #fecaca;">
        <td style="padding:8px;font-size:13px;font-weight:600;">${t.id}</td>
        <td style="padding:8px;font-size:13px;">${t.priority}</td>
        <td style="padding:8px;font-size:13px;color:#dc2626;">+${t.hoursOver}h</td>
        <td style="padding:8px;font-size:13px;">${t.title}</td>
      </tr>`;
    });
    body += `</table>`;
  }

  if (atRisk.length) {
    body += `<h3 style="color:#d97706;margin:0 0 12px;">⚡ At Risk — Act Now (${atRisk.length})</h3><table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr style="background:#fef3c7;">
        <th style="padding:8px;text-align:left;font-size:12px;color:#78350f;">Ticket</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#78350f;">Priority</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#78350f;">Hours Remaining</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#78350f;">Title</th>
      </tr>`;
    atRisk.forEach(t => {
      body += `<tr style="border-bottom:1px solid #fde68a;">
        <td style="padding:8px;font-size:13px;font-weight:600;">${t.id}</td>
        <td style="padding:8px;font-size:13px;">${t.priority}</td>
        <td style="padding:8px;font-size:13px;color:#d97706;">${t.hoursLeft}h left</td>
        <td style="padding:8px;font-size:13px;">${t.title}</td>
      </tr>`;
    });
    body += `</table>`;
  }

  body += `<p style="font-size:12px;color:#94a3b8;margin-top:16px;">
    This alert was sent automatically by the SLA Tracker Apps Script.<br>
    Built by Shreya Tomar · shreyatomar555@gmail.com
  </p></div>`;

  MailApp.sendEmail({
    to      : CONFIG.alertEmail,
    subject : `[SLA Alert] ${breached.length} Breached · ${atRisk.length} At Risk — ${new Date().toDateString()}`,
    htmlBody: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3.  TRIGGER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/** Run once to install the hourly trigger */
function installTrigger() {
  // Remove existing duplicates first
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "checkSLA")
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("checkSLA")
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("✅  Hourly trigger installed for checkSLA().");
}

/** Remove all triggers */
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log("All triggers removed.");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4.  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function _fmt(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
}

function _styleHeader(sheet, headers, row) {
  const range = sheet.getRange(row, 1, 1, headers.length);
  range.setValues([headers])
    .setBackground(COLOURS.header)
    .setFontColor(COLOURS.headerFg)
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("left");
  sheet.setRowHeight(row, 36);
}

function _colorSlaRows(sheet, rows) {
  rows.forEach((row, i) => {
    const slaStatus = row[7];
    _colorSlaCell(sheet.getRange(i + 2, 1, 1, row.length), slaStatus);
  });
}

function _colorSlaCell(range, slaStatus) {
  const colorMap = {
    "On Track" : COLOURS.onTrack,
    "At Risk"  : COLOURS.atRisk,
    "Breached" : COLOURS.breached,
    "Resolved" : COLOURS.resolved,
  };
  range.setBackground(colorMap[slaStatus] || "#ffffff");
}
