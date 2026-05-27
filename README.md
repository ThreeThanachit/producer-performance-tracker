# Producer Performance Tracker

> Live-streaming Producer performance tracking system built on Google Sheets + Apps Script.
> APPEND-ONLY data architecture, mobile web app for Senior Producer evaluations, and dashboards for HR decision-making.

Built to replace 6 months of vibes-based "ดุลพินิจ" with evidence-based promotion / freelancer→fulltime decisions.

---

## ✨ Features

- 📊 **APPEND-ONLY Master Log** — zero data loss guarantee, even on daily 7am rebuild triggers
- 📱 **Mobile Web App** — Senior Producers fill Pass/Fail on mobile (no more "เปิดคอมไม่สะดวก")
- 🔄 **Race-safe sync** — desktop Sheet + mobile WebApp + auto-triggers all write to the same source without conflict
- 👥 **Producer → Senior auto-assignment** — new sessions get assigned Senior PIC automatically based on a mapping table
- 📈 **Weekly / Monthly dashboards** — leaderboards, heatmaps, trend comparison, Senior accountability
- 🏆 **Producer scorecards** — individual history snapshots for promotion decisions
- 🌐 **Performance Dashboard** — separate Apps Script web app with 8 interactive views (GMV/CTR/funnel)

---

## 🏗 Architecture

```
┌─────────────────────────┐
│  Raw Schedule Sheet     │ (external, read-only)
└───────────┬─────────────┘
            │ buildSessionsSheet()
            ▼
┌─────────────────────────┐
│  Sessions tab           │ (intermediate, rebuildable)
└───────────┬─────────────┘
            │ buildMasterLog() [APPEND-ONLY]
            ▼
┌─────────────────────────┐      ┌──────────────────────┐
│  Master Log (ถาวร)      │◄─────│  WebApp_Tracker      │
│  source of truth        │      │  (mobile)            │
└───────────┬─────────────┘      └──────────────────────┘
            │ refreshViews()              ▲
            ▼                             │ google.script.run
┌──────────────┬──────────┐               │
│ Today tab    │ Overdue  │───────────────┘
│ (editable)   │ (view)   │
└──────┬───────┴──────────┘
       │ onEdit / syncCellToMasterLog_
       ▼
   back to Master Log (single-cell write, race-safe)
       │
       ▼
┌─────────────────────────────────────────┐
│ Weekly / Monthly Dashboards · History   │
│ Producer Scorecards · Senior Stats      │
└─────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Data store | Google Sheets (Master Log = source of truth) |
| Backend | Google Apps Script (JavaScript V8 runtime) |
| Mobile UI | HtmlService + vanilla JS + system fonts |
| Auth | Google Workspace (built-in) |
| Hosting | Apps Script Web App (free) |
| External deps | None |

---

## 📂 Project Structure

```
.
├── README.md
├── CLAUDE.md                          # AI assistant context (deep architectural notes)
├── .gitignore
│
├── SessionBuilder_AppsScript.js       # Main backend: ML, Today, Overdue, dashboards (2700 lines)
├── WebApp_Tracker_AppsScript.js       # Mobile WebApp backend (doGet, getSessions, saveEvaluation)
├── WebApp_Tracker.html                # Mobile WebApp frontend (sticky header, 3 tabs, autosave)
│
├── WebApp_AppsScript.js               # Performance Dashboard backend (8-view analytics)
├── WebApp.js                          # Performance Dashboard frontend (legacy filename)
├── ProducerDashboard.html             # Standalone HTML version (drop-CSV mode)
│
├── SmartAudit_AppsScript.js           # Data quality audit categorizer
├── ProducerInsights_AppsScript.js     # Sheet-based Producer scorecard
├── MCInsights_AppsScript.js           # Same for MC
├── PairChemistry_AppsScript.js        # Producer × MC chemistry score
├── EngagementFunnel_AppsScript.js     # Funnel scorecard with Coach Focus
├── UnifiedScorecard_AppsScript.js     # Legacy A×B join
└── MasterMenu_AppsScript.js           # Consolidates 6 menus → "📊 Team Analytics"
```

---

## 🚀 Deploy Guide

### A. Senior Tracker Sheet (Master Log + Mobile WebApp)

1. **Open the target Google Sheet** → Extensions → Apps Script
2. **Paste 3 files into the editor:**
   - `SessionBuilder_AppsScript.js` → Script file
   - `WebApp_Tracker_AppsScript.js` → Script file
   - `WebApp_Tracker.html` → HTML file (name it `WebApp_Tracker` without `.html`)
3. **Save** (Ctrl+S)
4. **Setup triggers** — open the sheet → menu `📊 Session Builder` → `⚙️ ตั้ง Triggers ทั้งหมด`
5. **Build initial Master Log** — menu → `▶ 1. Build Sessions` → `📋 2. Build Master Log + Views`
6. **Setup Producer assignments** — menu → `👥 Setup Producer → Senior assignments` → fill `Producer Assignments` tab
7. **Deploy WebApp** — Apps Script → Deploy → New deployment → Web app
   - Execute as: **Me**
   - Who has access: **Anyone in your organization**
   - Copy URL → share to Senior Producers' phones (Add to Home Screen)

### B. Performance Dashboard (separate Sheet)

See deploy notes in `WebApp_AppsScript.js` header.

---

## 🔑 Key Concepts

### APPEND-ONLY Master Log
The Master Log is a **append-only data store**. Sessions are appended when new ones appear in Raw data, but existing rows are **never modified or cleared** by automated processes. This guarantees data safety even when triggers run.

```javascript
// buildMasterLog() = dispatcher
if (hasExistingData) {
  _appendNewSessionsToMasterLog(...);   // Safe append
} else {
  _buildMasterLogFresh(...);             // Only on first build
}
```

### Race-safe Cell Sync
The mobile WebApp writes directly to Master Log. The desktop Today sheet also writes via `onEdit`. To avoid races where one wipes the other:

```javascript
// onEdit only writes the SPECIFIC cell the user edited
syncCellToMasterLog_(sheet, row, col, newValue);

// Bulk sync (manual menu) uses MERGE logic:
// if Today=N/A and ML=Pass/Fail → keep ML (don't overwrite WebApp's edits)
```

### Producer → Senior Auto-Assignment
A `Producer Assignments` tab maps each Producer to a default Senior PIC. When new sessions append to Master Log, column E auto-fills.

| Producer | Senior PIC |
|---|---|
| Ben | Peet |
| Boss | Mink |
| Praii | Nine |

---

## 📊 Master Log Schema

| Col | Field | Type |
|---|---|---|
| A | Date | Date |
| B | Time | String "20:00-22:00" |
| C | Producer | String |
| D | Brand | String |
| E | Senior PIC | Dropdown |
| F-K | Pre-live (6 items) | Pass / Fail / N/A |
| L-O | During-live base (4) | Pass / Fail / N/A |
| P | During bonus ★ Creativity | Pass / Fail / N/A |
| Q-T | Post-live base (4) | Pass / Fail / N/A |
| U | Post bonus ★ Feedback | Pass / Fail / N/A |
| V | Base Score (auto) | Formula 0-14 |
| W | Bonus Score (auto) | Formula 0-2 |
| X | Status (auto) | Formula: Done / Pending / Overdue / Upcoming |

---

## 🐛 Bugs Resolved

| Bug | Cause | Fix |
|---|---|---|
| ML cleared every 7am | `Utilities.formatDate` returned Thai month names; Sessions tab used English → key mismatch → preservation logic failed | Use locale-independent `formatDate()` helper |
| ML rebuild risk | clear-and-rebuild even with preservation logic | Full re-architecture to APPEND-ONLY |
| Today disappeared hourly | `nightlySafeUpdate` ran `refreshTodayView()` which cleared Today | Removed hourly refresh; Today refreshes only at 7am or on demand |
| WebApp data overwritten | `onEdit` synced all 17 cells from stale Today tab | Single-cell sync via `syncCellToMasterLog_` |
| Overdue blocked filling | Sync function rejected rows with Overdue status | Removed Overdue guard — users need to fill overdue retroactively |

---

## 🧪 Testing

UI was tested with Playwright on iPhone 14 + Pixel 7 viewports. Touch targets verified ≥38px.

```bash
cd /tmp/producer-tracker-mockup
npm install playwright
npx playwright install chromium
node test-tracker.mjs
```

---

## 🗺 Roadmap

- ✅ Phase 1 — APPEND-ONLY Senior Tracker
- ✅ Phase 2 — Smart Audit categorization
- ✅ Phase 3 — Sheet-based Insights tabs
- ✅ Phase 4 — Performance Dashboard Web App
- ✅ Phase 5 — Mobile WebApp for data entry
- ✅ Phase 6 — Producer→Senior auto-assignment
- 🟡 Phase 7 — Inter-rater reliability checks
- 🔵 Phase 8 — Voice input via Whisper + GPT (low-friction)
- 🔵 Phase 9 — Backend caching (CacheService, 5min TTL)

---

## 📝 License

MIT — feel free to fork and adapt for your team.

---

## 🙏 Credits

Built iteratively with [Claude Code](https://claude.com/claude-code) using:
- LLM Council methodology (Karpathy) for architectural decisions
- Playwright for mobile UI verification
