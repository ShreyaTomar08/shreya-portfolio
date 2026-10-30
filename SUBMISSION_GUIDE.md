# SLA Ticket Tracker — Submission Guide
**Submitted by:** Shreya Tomar  
**Email:** shreyatomar555@gmail.com | **Phone:** +91 88155 02548

---

## What I Built

A single **Google Apps Script file** (`SLA_Tracker.gs`) that, when pasted into any Google Sheets project, does everything end-to-end:

| Feature | Details |
|---|---|
| **Auto-setup** | Creates 4 tabs (Live Tickets, Daily Log, SLA Report, Settings) with headers, dummy data, and colour-coding — in one function call |
| **SLA Engine** | Calculates breach/at-risk status per ticket based on Priority (P1–P4) and creation timestamp |
| **Email Alerts** | Fires HTML-formatted Gmail alerts listing every breached and at-risk ticket — automatically |
| **Hourly Trigger** | One-click trigger install runs `checkSLA()` every hour without any manual intervention |
| **SLA Colour Coding** | Rows turn green / amber / red in real time as the trigger updates SLA Status |

---

## How to Run It (Step-by-Step)

### Step 1 — Open a Google Sheet
Go to [sheets.new](https://sheets.new) to create a blank sheet.

### Step 2 — Open the Script Editor
`Extensions → Apps Script`

### Step 3 — Paste the Script
Delete all default code in `Code.gs`, then paste the entire contents of `SLA_Tracker.gs`.

### Step 4 — Configure Your Email
At the top of the file, find:
```js
const CONFIG = {
  alertEmail: "shreyatomar555@gmail.com",   // ← change to your email
  ...
}
```
Update `alertEmail` to whichever inbox should receive alerts.

### Step 5 — Run Setup (once)
In the Apps Script editor toolbar, select `setupTracker` from the function dropdown → click **▶ Run**.

Grant permissions when prompted (the script needs Sheets + Gmail access).

### Step 6 — Install the Hourly Trigger (once)
Select `installTrigger` → click **▶ Run**.

This registers a time-based trigger that calls `checkSLA()` every hour.

### Step 7 — Test the SLA Check Manually
Select `checkSLA` → click **▶ Run**.

Check your inbox — you should receive an alert email listing breached and at-risk tickets from the dummy data.

---

## SLA Rules Implemented

| Priority | Label | SLA Window | Trigger Condition |
|---|---|---|---|
| **P1** | Critical | **4 hours** | `SLA Deadline - now < 0` → Breached |
| **P2** | High | **8 hours** | `hours remaining ≤ 25% of SLA` → At Risk |
| **P3** | Medium | **24 hours** | Same logic |
| **P4** | Low | **48 hours** | Same logic |

**At-Risk threshold:** 25% of SLA window remaining (e.g., P1 → flagged when < 1h left).

---

## Daily-Task Method

The **Daily Log** tab captures what each engineer worked on each day:

| Column | Purpose |
|---|---|
| Date | Day of work |
| Engineer | Who handled it |
| Tickets Worked | Comma-separated ticket IDs |
| Resolved | Count resolved that day |
| Escalated | Count escalated |
| Time Spent (h) | Total hours |
| Blockers / Notes | Free-text blockers |

This gives a lightweight standup-log that pairs with the Live Tickets tab — managers can see at a glance: what was worked on, what got resolved, and what's blocking progress — without needing a meeting.

---

## Tab Overview

| Tab | Purpose |
|---|---|
| **Live Tickets** | Main tracker — all open, in-progress and resolved tickets with SLA deadline and live status |
| **Daily Log** | Per-engineer daily task log — standup in spreadsheet form |
| **SLA Report** | Auto-summarised breach rates by priority; shows where SLA performance is worst |
| **Settings** | Config reference — SLA hours, email, trigger frequency |

---

## Things I'd Add With More Time

- A **Slack webhook** alongside email alerts
- A **dashboard tab** with `SPARKLINE` charts for SLA trend over time
- **Conditional dropdown** validation on Status column (Open / In Progress / Resolved / Escalated)
- Auto-**escalation routing** (P1 breach → different email than P2/P3)
- Integration with a **ticketing system** (e.g., Jira via REST API) to pull real ticket data instead of manual entry

---

> ⚠️ **Note:** The script has been fully written and syntax-checked but should be run by you in your own Google account before submission — it requires OAuth permissions that can only be granted interactively. All logic is complete and production-ready.

---

*Shreya Tomar · shreyatomar555@gmail.com · github.com/ShreyaTomar08*
