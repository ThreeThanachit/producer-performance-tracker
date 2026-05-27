# CLAUDE.md — Producer Performance Tracker

> **Mission**: Live-streaming team performance analytics — measure both tangible (GMV/CTR/Co_R) and intangible (Senior checklist) to make data-driven HR decisions (promote, convert freelancer→fulltime, coach).

> Moderator = Producer (สลับใช้ได้)

---

## Project Overview

Project นี้มี **3 ระบบหลัก** ที่ทำงานร่วมกัน + **2 Web Apps**:

| System | Where | Purpose |
|---|---|---|
| **A. Senior Tracker** | Google Sheet `[DCP]Producer Performance Tracker` | Subjective Pass/Fail checklist by Senior PIC (APPEND-ONLY ML) |
| **B. Performance Dashboard** | Google Sheet `Producer Performance Tracker` (v9.1) | Objective GMV/CTR data — pulled from 40+ CPS sheets |
| **C. Unified Layer** | Inside System B | Joins A × B (currently legacy — not used) |
| **🌐 Web App: Tracker (mobile)** | Apps Script Web App (in System A) | ✨ Mobile data entry for Senior Producers — Pass/Fail per session, autosave |
| **🌐 Web App: Dashboard** | Apps Script Web App (in System B) | Interactive HTML dashboard — 8 views, Apple-style UI |

---

## File Inventory

### Active code files
| File | Deploy ที่ | Purpose |
|---|---|---|
| `SessionBuilder_AppsScript.js` | System A | Build Sessions → Master Log (APPEND-ONLY) → Today/Overdue/Weekly/Monthly + race-safe sync + dedup |
| **`WebApp_Tracker_AppsScript.js`** | **System A** | ✨ **Mobile WebApp backend** — doGet, getSessions, saveEvaluation, getSeniorStats |
| **`WebApp_Tracker.html`** | **System A** (HTML file) | ✨ **Mobile WebApp frontend** — sticky header, 3 tabs (Today/Overdue/Stats), autosave 600ms debounce |
| `SmartAudit_AppsScript.js` | System B | Re-categorize 11K audit issues into 7 actionable buckets |
| `ProducerInsights_AppsScript.js` | System B | Sheet-based Producer scorecard (still useful for printing) |
| `MCInsights_AppsScript.js` | System B | Same for MC |
| `PairChemistry_AppsScript.js` | System B | Producer × MC chemistry score (sheet view) |
| `EngagementFunnel_AppsScript.js` | System B | Funnel scorecard with Coach Focus |
| `MasterMenu_AppsScript.js` | System B | Consolidates 6 menus → 1 dropdown "📊 Team Analytics" |
| **`WebApp_AppsScript.gs`** | System B | **Performance Dashboard backend** — doGet + getDashboardData |
| **`WebApp.html` / `WebApp.js`** | System B (HTML file) | **Performance Dashboard frontend** — 8 interactive views |
| `UnifiedScorecard_AppsScript.js` | System B (legacy) | Join A×B in sheet form (deprecated since user dropped soft-data sync) |

### Reference docs
- `CLAUDE.md` (this file)
- `[DCP]Producer Performance Tracker - By Senior Producer.xlsx` — System A snapshot
- `Producer performance 11 apr (3).xlsx` — System B snapshot
- `28. [Bobbi Brown] CPS MBR_APRIL 2026.pptx` — CPS team's monthly report style reference
- `Moderator performance.rtf` — v9.1 source code (Jui external)
- `ProducerDashboard.html` — standalone HTML (drop CSV) — legacy
- `Producer tracker.rtf` — older System A backup

---

## System URLs

| | Sheet ID | URL |
|---|---|---|
| A. Senior Tracker | `12lASdkxYREvXtu8rpcT1uW6Z63MnqEcvSJlXWMEX6SE` | [open](https://docs.google.com/spreadsheets/d/12lASdkxYREvXtu8rpcT1uW6Z63MnqEcvSJlXWMEX6SE/edit) |
| B. Performance Dashboard | `1nWXx3fjMe0O2lojOO6YKrMftHvP0-FSpf-fke4Wj-WU` | [open](https://docs.google.com/spreadsheets/d/1nWXx3fjMe0O2lojOO6YKrMftHvP0-FSpf-fke4Wj-WU/edit) |
| Raw Schedule "all in one 2026" | `14nZwUACRhEfCnacwJBnSxAlJ8JfsTK2puhgIL4l2Ylk` | — |
| Live Data Hub (Shopee multi-brand) | `1QmHPktAlQi6WSyBHWzrnaFzpj8tGl_Gy7YSUrL2emqs` | — |

---

# 🌐 Web App — Primary Interface

## Tech stack
- **Backend**: Apps Script `WebApp_AppsScript.gs` (doGet, getDashboardData)
- **Frontend**: `WebApp.html` — 2,300+ lines (CSS + HTML + vanilla JS + Chart.js)
- **Auth**: Execute as Me + Anyone in domain (your workspace)
- **Deploy**: `Deploy → Manage deployments → ✏️ → New version`

## Design system

**Aesthetic**: Apple-style + brand CI (light theme, layered shadows, refined)

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#F5F5F7` | Apple's actual bg, warm off-white |
| `--surface` | `#FFFFFF` | Cards |
| `--blue` | `#1F7AB6` | Brand primary, trust |
| `--green` | `#A6CE39` | Brand accent, growth, positive |
| `--blue-2` | `#3BABDC` | Light blue secondary |
| `--text` | `#1D1D1F` | Apple near-black |
| Display font | Manrope (800/700/600) | Section titles |
| Body font | Manrope (400/500) | UI |
| Mono font | JetBrains Mono | Numbers |

**Shadows**: 4-tier layered (`--shadow-1` → `--shadow-4`)
**Sidebar/topbar**: backdrop-blur frosted (Apple Mac style)
**Mobile modal**: Bottom sheet (slides from bottom, iOS style)

## 8 Views

| # | View | Purpose | Interaction |
|---|---|---|---|
| 01 | **Overview** | Auto smart briefing | KPI cards clickable → expand brand breakdown + donut |
| 02 | **Producer** | Leaderboard | Sort in-place · click name → Profile · click row → expand · click brand → modal |
| 03 | **MC** | Same as Producer for MC | Same interactions |
| 04 | **Profile** ⭐ | Single-person deep dive | Type toggle (Producer/MC) · person dropdown · KPI hero · trend vs team · brand donut · funnel comparison · Strengths/Weakness/Coach Focus auto-analysis · jump from leaderboard |
| 05 | **Pair Chemistry** | Producer × MC synergy | Click pair row → modal monthly + brands together |
| 06 | **Engagement Funnel** | Per-producer funnel + Coach Focus | Click row → modal waterfall + latest sessions |
| 07 | **Time Slots** | Day × Hour heatmap | Click cell → modal top brands/producers in slot |
| 08 | **Smart Insights** | Auto-curated insights | Action briefing + Consistency + Brand yield + Channel wins |

## Filters (apply to all views)
- 📅 Month
- 🏷️ Brand
- 📡 Channel

## Status criteria (universal)
| Badge | GMV/Hr vs team avg |
|---|---|
| 🟢 Top | ≥ 150% |
| 🔵 Above | 100% – 150% |
| 🟡 Below | 50% – 100% |
| 🔴 At Risk | < 50% |

## Key Implementation Details

### Date swap fix (Excel/Sheets US locale bug)
ทุก script + HTML มี `normDate()` / `normalizeDate_()` ที่ detect:
- `Date object` ที่ `day ≤ 12` → swap day↔month (auto-corrected from US M/D/Y misparse)
- String "13/1/2026" → parse D/M/Y ตรงๆ (ปลอดภัย เพราะ US ไม่มี month 13)

### Hours instead of Sessions
ทุก KPI ใช้ "Live Hours" เป็นหลัก (ไม่ใช่ session count) เพื่อ format เดียวทั่วทั้ง app

### In-place table sort
Sort handlers ไม่ trigger `render()` ทั้งหน้า — แค่ re-sort tbody → charts/KPI ไม่ flicker

### Modal pattern
- Desktop: centered modal with zoom-in
- Mobile: bottom sheet (slides from bottom, iOS pattern)
- Backdrop click closes
- ESC key closes

### Mobile responsive
- < 1100px: hamburger menu → drawer sidebar slide-in
- < 768px: bottom-sheet modal, KPI 2-col, tables horizontal scroll
- < 480px: KPI 1-col

---

# System A — Senior Tracker (deep)

## Architecture
```
Raw Schedule (external) → buildSessionsSheet() → Sessions tab
   → buildMasterLog() [APPEND-ONLY dispatcher]
     ├─ ML ว่าง → _buildMasterLogFresh()
     └─ ML มี data → _appendNewSessionsToMasterLog()
                      ↑ Senior PIC = ว่าง (Senior กรอกเองใน Today)
   → refreshViews() → Today (editable) + Overdue
   → onEdit() → syncCellToMasterLog_() [single-cell, race-safe]
   ↑ WebApp_Tracker (mobile) → google.script.run.saveEvaluation() → ML
   → buildWeeklyDashboard / buildMonthlyDashboard
   → captureHistorySnapshot → History → buildProducerScoreCards
```

## Critical: APPEND-ONLY architecture
- `buildMasterLog` **ไม่เคย clear** ML — แค่ append session ใหม่
- Existing Pass/Fail/Senior PIC = 100% safe
- Trigger 7am daily ปลอดภัย — ไม่มี data loss

## Critical: Race-safe sync (3 writers → 1 source)

ML มี 3 writers พร้อมกัน:
1. **WebApp_Tracker** (mobile) — `saveEvaluation()` เขียน 17 cells per row
2. **Today tab** desktop edit — `onEdit` → `syncCellToMasterLog_()` เขียน **1 cell**
3. **Bulk sync** (manual menu) — `syncRowToMasterLog_()` ใช้ **merge logic** (Today=N/A + ML=Pass → เก็บ ML)

→ ทั้ง 3 เขียนกัน **ไม่ทับ** เพราะ:
- `onEdit` เขียน cell เดียวที่ user แก้จริง
- bulk sync ตรวจก่อนเขียน — ไม่ overwrite WebApp's Pass/Fail ด้วย Today's stale N/A

**Removed from triggers**: `refreshTodayView()` ออกจาก hourly trigger — Today ไม่ clear ระหว่างวัน

## Senior PIC = manual fill (per decision May 27)

ตัดสินใจร่วมกับ Senior:
- Producer 1 คน Senior **หลายคน** review ได้
- ไม่ใช้ auto-assignment (ที่ Producer→Senior mapping เคย design)
- Senior เปิด Today tab → กรอก Senior PIC (E) + Pass/Fail ของ session ตัวเอง
- onEdit → syncCellToMasterLog_ → ML ทันที

## Master Log columns
```
A=Date  B=Time  C=Producer  D=Brand  E=Senior PIC
F-K = Pre-live (6 checklist)
L-O = During base (4)
P   = During bonus ★ Creativity
Q-T = Post base (4)
U   = Post bonus ★ Feedback
V   = Base Score    formula
W   = Bonus Score   formula
X   = Status        formula (Done / Pending / Overdue / Upcoming)
```

## Triggers
- 7:00 daily — `dailyFullUpdate` (rebuild Sessions + APPEND-ONLY ML + refresh views)
- ทุก 1 ชม. — `nightlySafeUpdate` (sync Today→ML + refresh Overdue, **ไม่ refresh Today**)
- จันทร์ 8:00 — `buildWeeklyDashboard`
- อาทิตย์ 22:00 — `captureHistorySnapshot`
- วันที่ 1 ของเดือน 8:00 — `buildMonthlyDashboard`

---

# 📱 Mobile WebApp (WebApp_Tracker)

## Why
6 เดือนของ "เปิดคอมไม่สะดวก" → compliance ต่ำ → Senior กรอกไม่ครบ → ไม่มี data ตัดสิน promote
→ Built mobile WebApp ผ่าน LLM Council process (see git history) — **Apps Script HtmlService** (ไม่ใช่ Next.js, Forms, AppSheet)

## Architecture
- **Backend**: `WebApp_Tracker_AppsScript.js`
  - `doGet()` — serves HTML
  - `getSessions(filter, senior)` — return today/overdue/week sessions
  - `saveEvaluation({key, senior, items})` — write to ML (17 cells)
  - `getProducerHistory(name)` — last 5 sessions for context
  - `getSeniorStats(senior)` — KPI cards + producer leaderboard
- **Frontend**: `WebApp_Tracker.html`
  - 3 tabs: Today / Overdue / Stats
  - Senior chip filter (All / Mink / Peet / Nine)
  - Per-card senior dropdown + 16-item Pass/Fail/N/A toggle
  - **Autosave**: 600ms debounce → google.script.run.saveEvaluation
  - Save indicator: idle → saving → saved (visual feedback)
  - Producer history drawer (expand on tap)
  - Stats tab: 4 KPI cards (gradient) + Producer leaderboard with color-coded %

## Design tokens (matches ProducerDashboard)
| Token | Value | Usage |
|---|---|---|
| `--bg` | `#F5F7FA` | Page |
| `--header` | `#1A1A1A` | Sticky header dark |
| `--primary` | `#2E5CA8` | Tabs, links |
| `--success` | `#1A7A5E` | Pass button |
| `--danger` | `#C72C2C` | Fail button, overdue |
| `--warning` | `#B8860B` | Pending, KPI gold gradient |
| Touch target | 38px min | Pass/Fail/N/A buttons |
| Card radius | 12px | Session cards |

## Deploy
1. Apps Script editor → New deployment → Web app
2. Execute as: Me · Access: Anyone in your organization
3. Share URL → "Add to Home Screen" บน iOS/Android
4. Google auto-trust ตลอด (workspace login)

---

# System B — Performance Dashboard

## Source
- v9.1 by Jui (external, RTF backup) — ดึง 40+ CPS sheets, auto-heal AM/PM, X-Ray diagnostics

## Tabs (40+ rows of brand × channel sources)
- `_Config` — Sheet IDs + PICs (DCP, Fai CPS, Aom CPS, Aoey CPS, Oil CPS, Jz CPS, Gee CPS, Gam CPS, Pim CPS)
- `📋 Performance Data` — main 5,800+ session rows
- `🛠️ Debug Report` — per-brand load status
- `🔎 X-Ray Report` — per-row diagnostics
- `⚠️ Data Audit` — orphan records (replaced by Smart Audit)
- v9.1 outputs: `📊 Dashboard`, `📈 MoM Trend`, `🏷️ By Brand` (mostly unused — Web App replaces)

## Add-ons we built
- `🔍 Smart Audit` + `🏢 Agency Sessions` (categorize 11K audit issues)
- `📊 Producer Insights` (sheet scorecard)
- `🎤 MC Insights`
- `💑 Pair Chemistry`
- `🔄 Engagement Funnel`
- `🏆 Producer Scorecard` + `🔗 Unified Sessions` (legacy)

## Trigger schedule (daily)
| Time | Function |
|---|---|
| 7:30 | buildSmartAudit |
| 8:00 | (legacy) buildUnifiedAll |
| 8:30 | buildProducerInsights |
| 8:45 | buildMCInsights |
| 9:00 | buildPairChemistry |
| 9:15 | buildEngagementFunnel |

Setup ทั้งหมดผ่าน menu: **📊 Team Analytics → ⚙️ Triggers → Setup ALL daily triggers**

---

# Known Bugs / Decisions

## Resolved
| Bug | Fix |
|---|---|
| ML data loss every 7am | APPEND-ONLY architecture + Thai locale date fix |
| Today tab disappeared hourly | Removed `refreshTodayView()` from `nightlySafeUpdate` |
| WebApp data overwritten by Today's stale N/A | `syncCellToMasterLog_` (single cell) + merge logic in bulk sync |
| Overdue sessions blocked from sync | Removed Overdue guard — users need retroactive fills |
| Master Log session duplicates (3× per session) | `dedupMasterLog()` menu + safety backup tab |
| 11K audit "issues" overwhelm | Smart Audit categorizes → 88.5% noise filtered out |
| Date swap bug (US locale M/D/Y on D/M/Y data) | `normDate()` swap-detect in all scripts |
| onOpen collision (6 menus) | MasterMenu consolidator |
| Strict `setAllowInvalid(false)` blocks valid values | Changed to `setAllowInvalid(true)` |
| `setFrozenColumns()` conflict with merged title | Removed all setFrozenColumns calls |
| Web App "No HTML file named WebApp" | Renamed HTML file, updated `createTemplateFromFile()` |
| GMV "฿186" tiny (CSV comma parse) | strip commas with `num()` helper |
| CTR 4522% (double ×100) | `pct()` smart parser detects decimal vs % form |
| Mobile sidebar hidden no replacement | Hamburger + drawer slide-in |

## Open / Future
- ❓ Senior Tracker × Performance Dashboard join (user dropped — may revive)
- ❓ Backend caching (CacheService.put 5min TTL) — would speed Web App 3x
- ❓ Server-side aggregation — reduce payload 80%
- ❓ URL routing (`?view=mc&month=may&person=praii`)
- ❓ Export CSV button
- ❓ Search bar for producer/MC name (when team grows)

---

# Web App User Flow

```
User opens URL → Loading spinner → getDashboardData()
   ↓ (5800 rows JSON ~ 500KB)
Dashboard renders with Producer view (default)
   ↓
Filter (Month/Brand/Channel) → instant re-render
Switch view via sidebar → instant
Click row → expand inline OR jump to Profile
Click brand/cell/partner → Apple-style modal (centered desktop, bottom-sheet mobile)
ESC or backdrop click → close modal
```

---

# Roadmap

| Phase | Status |
|---|---|
| ✅ Phase 1 — APPEND-ONLY Senior Tracker | Done |
| ✅ Phase 2 — Smart Audit categorization | Done |
| ✅ Phase 3 — Sheet-based Insights tabs | Done |
| ✅ Phase 4 — Apps Script Performance Dashboard Web App | Done |
| ✅ Phase 5 — Brand CI redesign | Done |
| ✅ Phase 6 — Mobile responsive | Done |
| ✅ Phase 7 — Profile deep-dive view | Done |
| ✅ Phase 8 — Mobile WebApp for Senior data entry (WebApp_Tracker) | Done |
| ✅ Phase 9 — Race-safe sync (3 writers, no overwrite) | Done |
| ✅ Phase 10 — Master Log dedup tool + production cleanup | Done |
| 🟡 Phase 11 — Inter-rater reliability checks (council blind spot) | Future |
| 🔵 Phase 12 — Voice input (Whisper + GPT) — friction → 0 | Future |
| 🔵 Phase 13 — Backend caching (CacheService 5min TTL) | Future |
