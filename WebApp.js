<!DOCTYPE html>
<html lang="en">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <title>Performance Intelligence</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <style>
    :root {
      /* ─── Apple-inspired warm off-white ─── */
      --bg:           #F5F5F7;
      --surface:      #FFFFFF;
      --surface-2:    #FBFBFD;
      --surface-3:    #F0F0F3;
      --surface-4:    #E8E8ED;
      --border:       #D2D2D7;
      --border-soft:  #E5E5EA;

      /* ─── Apple shadows: layered depth ─── */
      --shadow-1: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02);
      --shadow-2: 0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
      --shadow-3: 0 8px 24px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
      --shadow-4: 0 24px 60px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06);

      /* ─── Apple text scale ─── */
      --text:         #1D1D1F;
      --text-2:       #424245;
      --text-3:       #6E6E73;
      --text-4:       #86868B;
      --text-5:       #B4B4B7;

      /* ─── Brand tokens ─── */
      --green:        #A6CE39;
      --green-dark:   #8AB02E;
      --green-light:  #EEF6D7;
      --green-bg:     rgba(166, 206, 57, 0.10);

      --blue:         #1F7AB6;
      --blue-dark:    #155985;
      --blue-light:   #E1F0FA;
      --blue-bg:      rgba(31, 122, 182, 0.08);

      --blue-2:       #3BABDC;
      --blue-2-dark:  #2A8FBE;
      --blue-2-light: #DCF0F9;

      /* ─── Semantic ─── */
      --positive:     #5BB832;
      --positive-bg:  rgba(91, 184, 50, 0.12);
      --negative:     #E54848;
      --negative-bg:  rgba(229, 72, 72, 0.08);
      --caution:      #F0A030;
      --caution-bg:   rgba(240, 160, 48, 0.12);

      /* ─── Heatmap ─── */
      --h-90: #2D8F4A;
      --h-75: #76C459;
      --h-50: #F0C040;
      --h-25: #EE8030;
      --h-0:  #D94040;

      --sans: 'Manrope', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      --mono: 'JetBrains Mono', 'SF Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: var(--sans);
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.5;
      font-weight: 400;
      letter-spacing: -0.01em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  LAYOUT                                                       */
    /* ═══════════════════════════════════════════════════════════ */
    .app { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }

    /* Sidebar — Apple frosted feel */
    .sidebar {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      border-right: 1px solid var(--border);
      padding: 24px 0 24px;
      position: sticky; top: 0; height: 100vh;
      display: flex; flex-direction: column;
    }

    .brand {
      padding: 0 22px 24px;
      border-bottom: 1px solid var(--border-soft);
      margin-bottom: 20px;
    }
    .brand-logo {
      display: flex; align-items: center; gap: 11px;
      margin-bottom: 4px;
    }
    .brand-mark {
      width: 36px; height: 36px;
      object-fit: contain;
      display: block;
      flex-shrink: 0;
    }
    .brand-text {
      font-family: var(--sans);
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.022em;
      color: var(--text);
    }
    .brand-text .accent { color: var(--green-dark); }
    .brand-tag {
      font-family: var(--mono);
      font-size: 9px;
      letter-spacing: 0.2em;
      color: var(--text-4);
      text-transform: uppercase;
      margin-top: 4px;
      padding-left: 48px;
      font-weight: 600;
    }

    .live-indicator {
      display: flex; align-items: center; gap: 7px;
      padding: 0 22px;
      margin-bottom: 18px;
    }
    .live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--green-dark);
      box-shadow: 0 0 0 0 rgba(138, 176, 46, 0.6);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(138, 176, 46, 0.5); }
      50%      { box-shadow: 0 0 0 7px rgba(138, 176, 46, 0); }
    }
    .live-text {
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-3);
      font-weight: 600;
    }

    .nav-section {
      font-family: var(--mono);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--text-5);
      padding: 0 22px;
      margin: 22px 0 6px;
      font-weight: 700;
    }
    .nav-item {
      display: flex; align-items: center; gap: 11px;
      padding: 10px 22px;
      cursor: pointer;
      color: var(--text-2);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: -0.005em;
      transition: all 0.18s ease;
      position: relative;
      border-left: 3px solid transparent;
      user-select: none;
    }
    .nav-item:hover {
      color: var(--blue);
      background: var(--blue-bg);
    }
    .nav-item.active {
      color: var(--blue-dark);
      background: var(--blue-bg);
      border-left-color: var(--blue);
      font-weight: 600;
    }
    .nav-icon { font-size: 14px; color: var(--text-4); width: 18px; display: inline-flex; justify-content: center; }
    .nav-item:hover .nav-icon,
    .nav-item.active .nav-icon { color: var(--blue); }

    .nav-spacer { flex: 1; }
    .nav-footer {
      padding: 16px 22px 0;
      border-top: 1px solid var(--border-soft);
      font-size: 10.5px;
      color: var(--text-4);
      font-family: var(--mono);
      line-height: 1.7;
      font-weight: 500;
    }

    /* Main */
    .main { padding: 0 36px 60px; min-width: 0; }

    /* Topbar — frosted */
    .topbar {
      padding: 20px 0 18px;
      display: flex; align-items: center; gap: 12px;
      border-bottom: 1px solid var(--border-soft);
      margin-bottom: 32px;
      position: sticky; top: 0;
      background: rgba(245, 245, 247, 0.92);
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      z-index: 10;
    }
    .topbar-meta {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-3);
      letter-spacing: 0.01em;
      font-weight: 500;
    }
    .topbar-spacer { flex: 1; }

    .filter-group { display: flex; align-items: center; gap: 6px; }
    .filter-label {
      font-family: var(--mono);
      font-size: 9px;
      color: var(--text-4);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      font-weight: 700;
    }
    select {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--sans);
      font-size: 12.5px;
      font-weight: 500;
      padding: 7px 28px 7px 11px;
      border-radius: 8px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236E6E73' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      transition: all 0.15s;
      box-shadow: var(--shadow-1);
    }
    select:hover { border-color: var(--text-4); }
    select:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-bg); }

    button {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--sans);
      font-size: 12.5px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      letter-spacing: -0.01em;
      transition: all 0.15s;
      box-shadow: var(--shadow-1);
    }
    button:hover { border-color: var(--text-4); }
    button.primary {
      background: var(--blue); border-color: var(--blue); color: white;
      box-shadow: 0 1px 2px rgba(31, 122, 182, 0.30), 0 2px 6px rgba(31, 122, 182, 0.15);
    }
    button.primary:hover { background: var(--blue-dark); border-color: var(--blue-dark); }

    /* ═══════════════════════════════════════════════════════════ */
    /*  SECTION HEADER                                               */
    /* ═══════════════════════════════════════════════════════════ */
    .section-header {
      margin: 0 0 28px;
      display: flex; align-items: baseline; gap: 16px;
    }
    .section-number {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--blue);
      letter-spacing: 0.15em;
      font-weight: 700;
    }
    .section-title {
      font-family: var(--sans);
      font-size: 36px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.028em;
      color: var(--text);
    }
    .section-title .accent { color: var(--green-dark); }
    .section-subtitle {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-3);
      letter-spacing: 0.04em;
      margin-left: auto;
      align-self: end;
      padding-bottom: 8px;
      font-weight: 500;
    }

    .subsection {
      font-family: var(--mono);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--text-3);
      margin: 0 0 14px;
      display: flex; align-items: center; gap: 12px;
      font-weight: 700;
    }
    .subsection::after { content: ''; flex: 1; height: 1px; background: var(--border-soft); }

    /* ═══════════════════════════════════════════════════════════ */
    /*  KPI — clickable cards                                        */
    /* ═══════════════════════════════════════════════════════════ */
    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 14px; margin-bottom: 16px;
    }
    .kpi {
      background: var(--surface);
      padding: 20px 22px 18px;
      border-radius: 14px;
      box-shadow: var(--shadow-1);
      position: relative;
      overflow: hidden;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: 1px solid var(--border-soft);
    }
    .kpi:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-3);
      border-color: var(--blue);
    }
    .kpi.expanded { border-color: var(--blue); box-shadow: var(--shadow-3); }
    .kpi-label {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 12px;
      font-weight: 700;
      display: flex; align-items: center; gap: 6px;
    }
    .kpi-label .info { font-size: 10px; color: var(--text-4); margin-left: auto; }
    .kpi-value {
      font-family: var(--sans);
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.025em;
      line-height: 1.05;
    }
    .kpi-value.mono { font-family: var(--mono); font-weight: 600; font-size: 26px; }
    .kpi-sub {
      font-size: 11px;
      color: var(--text-3);
      margin-top: 8px;
      font-weight: 400;
    }
    .kpi-stripe {
      position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
      background: var(--blue);
    }
    .kpi:nth-child(1) .kpi-stripe { background: var(--blue); }
    .kpi:nth-child(2) .kpi-stripe { background: var(--green); }
    .kpi:nth-child(3) .kpi-stripe { background: var(--blue-2); }
    .kpi:nth-child(4) .kpi-stripe { background: var(--caution); }

    /* Inline expand panel under KPI row */
    .kpi-expand {
      background: var(--surface);
      border: 1px solid var(--blue);
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 32px;
      box-shadow: var(--shadow-2);
      animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .kpi-expand .close-btn {
      float: right;
      background: var(--surface-3);
      border: none; padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      color: var(--text-3);
    }
    .kpi-expand .close-btn:hover { background: var(--surface-4); color: var(--text); }
    .kpi-expand h3 {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 16px;
      color: var(--text);
    }
    .kpi-expand .breakdown-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  PANELS                                                       */
    /* ═══════════════════════════════════════════════════════════ */
    .chart-row {
      display: grid; grid-template-columns: 1.6fr 1fr; gap: 14px;
      margin-bottom: 32px;
    }
    .panel {
      background: var(--surface);
      border-radius: 14px;
      box-shadow: var(--shadow-1);
      border: 1px solid var(--border-soft);
      overflow: hidden;
    }
    .panel-head {
      padding: 18px 24px 16px;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid var(--border-soft);
    }
    .panel-title {
      font-family: var(--sans);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.015em;
      color: var(--text);
    }
    .panel-sub {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
      letter-spacing: 0.04em;
      font-weight: 500;
    }
    .panel-body { padding: 22px 24px; }
    .chart-container { position: relative; height: 290px; }

    /* ═══════════════════════════════════════════════════════════ */
    /*  TABLES                                                       */
    /* ═══════════════════════════════════════════════════════════ */
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 12.5px;
    }
    .data-table thead th {
      position: sticky; top: 0; z-index: 2;
      background: var(--surface-2);
      color: var(--text-3);
      font-family: var(--mono);
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      font-weight: 700;
      padding: 13px 14px;
      text-align: left;
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid var(--border);
      transition: color 0.1s;
    }
    .data-table thead th:hover { color: var(--blue); }
    .data-table thead th.num,
    .data-table tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .data-table thead th .sort-ind { color: var(--blue); margin-left: 4px; font-size: 10px; }
    .data-table tbody td {
      padding: 11px 14px;
      border-bottom: 1px solid var(--border-soft);
      color: var(--text);
    }
    .data-table tbody td.num,
    .data-table tbody td.mono { font-family: var(--mono); font-size: 12px; font-weight: 500; }
    .data-table tbody td.name { font-weight: 600; }
    .data-table tbody tr:hover td { background: var(--surface-2); }
    .data-table .rank {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-4);
      width: 38px;
      font-weight: 600;
    }
    .data-table .rank.top1 { color: var(--green-dark); font-weight: 800; }
    .data-table .rank.top2 { color: var(--blue); font-weight: 700; }
    .data-table .rank.top3 { color: var(--blue-2-dark); font-weight: 700; }

    .table-scroll { max-height: 620px; overflow: auto; }

    /* MoM indicators */
    .mom { font-family: var(--mono); font-size: 11px; font-weight: 600; }
    .mom-up   { color: var(--positive); }
    .mom-down { color: var(--negative); }
    .mom-flat { color: var(--text-3); }

    /* Status badges */
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-family: var(--mono);
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: help;
    }
    .badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .badge-top    { background: var(--positive-bg); color: var(--positive); }
    .badge-above  { background: var(--blue-bg); color: var(--blue); }
    .badge-below  { background: var(--caution-bg); color: var(--caution); }
    .badge-risk   { background: var(--negative-bg); color: var(--negative); }

    /* Tooltip (CSS only) */
    .tooltip-trigger { position: relative; }
    .tooltip-trigger .tip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--text);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-family: var(--sans);
      font-weight: 500;
      letter-spacing: -0.005em;
      line-height: 1.4;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s;
      z-index: 100;
      box-shadow: var(--shadow-3);
    }
    .tooltip-trigger .tip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: var(--text);
    }
    .tooltip-trigger:hover .tip { opacity: 1; }

    /* Heatmap cells */
    .hm { font-family: var(--mono); font-size: 11px; font-weight: 600; padding: 8px 10px; text-align: center; border-radius: 5px; cursor: pointer; transition: transform 0.15s; }
    .hm:hover { transform: scale(1.05); }
    .hm-90 { background: var(--h-90); color: white; }
    .hm-75 { background: var(--h-75); color: white; }
    .hm-50 { background: var(--h-50); color: var(--text); }
    .hm-25 { background: var(--h-25); color: white; }
    .hm-0  { background: var(--h-0); color: white; }
    .hm-na { background: transparent; color: var(--text-5); cursor: default; }

    /* Expand rows */
    tr.expand-row { cursor: pointer; }
    tr.expand-row td:first-child .expand-arrow {
      display: inline-block; transition: transform 0.18s;
      color: var(--text-4); margin-right: 6px; font-size: 9px;
    }
    tr.expand-row.expanded td:first-child .expand-arrow { transform: rotate(90deg); color: var(--blue); }
    tr.expand-row.expanded td { background: var(--surface-2); }
    tr.detail-row td {
      background: var(--surface-2) !important;
      padding: 24px 28px;
      border-top: none;
      border-bottom: 2px solid var(--border-soft);
    }
    .detail-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 28px;
    }
    .detail-block h4 {
      font-family: var(--mono);
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--blue);
      margin-bottom: 12px;
      font-weight: 700;
    }
    .detail-block .data-table { font-size: 11.5px; background: var(--surface); border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-1); }
    .detail-block .data-table thead th { background: var(--surface-3); padding: 9px 12px; font-size: 9px; }
    .detail-block .data-table tbody td { padding: 8px 12px; }

    /* Brand clickable in detail rows */
    .clickable {
      color: var(--blue);
      cursor: pointer;
      border-bottom: 1px dotted var(--blue);
      transition: color 0.1s;
    }
    .clickable:hover { color: var(--blue-dark); border-bottom-color: var(--blue-dark); }

    /* ═══════════════════════════════════════════════════════════ */
    /*  INSIGHT CARDS                                                */
    /* ═══════════════════════════════════════════════════════════ */
    .insight-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
      margin-bottom: 32px;
    }
    .insight-card {
      background: var(--surface);
      border-radius: 14px;
      box-shadow: var(--shadow-1);
      padding: 22px 24px;
      position: relative;
      overflow: hidden;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid var(--border-soft);
      border-top: 3px solid var(--blue);
    }
    .insight-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-3); }
    .insight-card.tone-positive { border-top-color: var(--green); }
    .insight-card.tone-action   { border-top-color: var(--blue); }
    .insight-card.tone-warning  { border-top-color: var(--negative); }
    .insight-card.tone-info     { border-top-color: var(--blue-2); }
    .insight-card.tone-gold     { border-top-color: var(--caution); }
    .insight-card .tag {
      font-family: var(--mono);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      padding: 3px 10px;
      border-radius: 999px;
      display: inline-block;
      margin-bottom: 14px;
      font-weight: 700;
    }
    .tag-positive { background: var(--positive-bg); color: var(--positive); }
    .tag-action   { background: var(--blue-bg); color: var(--blue); }
    .tag-warning  { background: var(--negative-bg); color: var(--negative); }
    .tag-info     { background: var(--blue-2-light); color: var(--blue-2-dark); }
    .tag-gold     { background: var(--caution-bg); color: var(--caution); }
    .insight-card .headline {
      font-family: var(--sans);
      font-size: 19px;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: var(--text);
    }
    .insight-card .body { color: var(--text-2); font-size: 13px; line-height: 1.55; }
    .insight-card .body strong { color: var(--text); font-weight: 700; }
    .insight-card .stat {
      font-family: var(--mono);
      font-size: 26px;
      font-weight: 700;
      color: var(--blue);
      margin-top: 16px;
      letter-spacing: -0.02em;
    }
    .insight-card.tone-positive .stat { color: var(--positive); }
    .insight-card.tone-warning .stat { color: var(--negative); }
    .insight-card.tone-gold .stat { color: var(--caution); }
    .insight-card.tone-info .stat { color: var(--blue-2-dark); }
    .insight-card.large { grid-column: span 2; }

    /* ═══════════════════════════════════════════════════════════ */
    /*  MODAL — Apple sheet style                                    */
    /* ═══════════════════════════════════════════════════════════ */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: none; align-items: center; justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }
    .modal-backdrop.active { display: flex; }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    .modal {
      background: var(--surface);
      border-radius: 18px;
      width: 90%; max-width: 720px; max-height: 80vh;
      overflow: hidden;
      box-shadow: var(--shadow-4);
      display: flex; flex-direction: column;
      animation: zoomIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes zoomIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
    .modal-head {
      padding: 22px 26px;
      border-bottom: 1px solid var(--border-soft);
      display: flex; justify-content: space-between; align-items: flex-start;
    }
    .modal-title {
      font-size: 20px; font-weight: 700; letter-spacing: -0.025em; color: var(--text);
    }
    .modal-sub {
      font-family: var(--mono); font-size: 11px; color: var(--text-3); margin-top: 4px;
      font-weight: 500;
    }
    .modal-close {
      background: var(--surface-3); border: none;
      width: 30px; height: 30px; border-radius: 50%;
      cursor: pointer; font-size: 14px; color: var(--text-3);
      display: flex; align-items: center; justify-content: center;
      box-shadow: none;
      padding: 0;
    }
    .modal-close:hover { background: var(--surface-4); color: var(--text); }
    .modal-body { padding: 22px 26px; overflow-y: auto; flex: 1; }
    .modal-body h4 {
      font-family: var(--mono);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--text-3);
      margin: 16px 0 10px;
      font-weight: 700;
    }
    .modal-body h4:first-child { margin-top: 0; }
    .modal-body .modal-kpi {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      margin-bottom: 18px;
    }
    .modal-body .modal-kpi-cell {
      background: var(--surface-2);
      padding: 14px 16px;
      border-radius: 10px;
    }
    .modal-body .modal-kpi-cell .label {
      font-family: var(--mono); font-size: 9px;
      color: var(--text-3); text-transform: uppercase;
      letter-spacing: 0.15em; font-weight: 600;
      margin-bottom: 6px;
    }
    .modal-body .modal-kpi-cell .value {
      font-family: var(--mono); font-size: 16px;
      font-weight: 700; color: var(--text);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  PROFILE VIEW                                                 */
    /* ═══════════════════════════════════════════════════════════ */
    .profile-selector {
      background: var(--surface);
      border-radius: 14px;
      box-shadow: var(--shadow-2);
      border: 1px solid var(--border-soft);
      padding: 20px 24px;
      margin-bottom: 22px;
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .type-pill {
      display: inline-flex;
      background: var(--surface-2);
      border-radius: 10px;
      padding: 3px;
      gap: 2px;
    }
    .type-pill button {
      background: transparent;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-3);
      box-shadow: none;
      letter-spacing: -0.005em;
      transition: all 0.18s;
    }
    .type-pill button.active {
      background: var(--surface);
      color: var(--blue-dark);
      box-shadow: var(--shadow-1);
    }
    .profile-selector .person-select {
      flex: 1; min-width: 220px;
    }
    .profile-selector .person-select select {
      width: 100%; padding: 10px 32px 10px 14px;
      font-size: 14px; font-weight: 600;
    }
    .profile-selector .empty-hint {
      flex: 1;
      font-family: var(--mono); font-size: 11px;
      color: var(--text-3); letter-spacing: 0.05em;
    }
    .profile-hero {
      background: var(--surface);
      border-radius: 14px;
      box-shadow: var(--shadow-2);
      padding: 28px 32px;
      margin-bottom: 18px;
      position: relative;
      overflow: hidden;
      border: 1px solid var(--border-soft);
    }
    .profile-hero::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, var(--blue), var(--green));
    }
    .profile-hero .role {
      font-family: var(--mono); font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.2em;
      color: var(--text-3); font-weight: 700;
      margin-bottom: 8px;
    }
    .profile-hero .name {
      font-family: var(--sans); font-size: 36px; font-weight: 800;
      letter-spacing: -0.03em; line-height: 1; color: var(--text);
      margin-bottom: 10px;
    }
    .profile-hero .summary {
      font-size: 14px; color: var(--text-2);
      font-weight: 500;
    }
    .profile-hero .summary strong { color: var(--text); font-weight: 700; }
    .sw-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
      margin-bottom: 22px;
    }
    .sw-card {
      background: var(--surface);
      border-radius: 12px;
      box-shadow: var(--shadow-1);
      padding: 20px 22px;
      border: 1px solid var(--border-soft);
      border-left: 3px solid var(--blue);
    }
    .sw-card.strength { border-left-color: var(--green); }
    .sw-card.weakness { border-left-color: var(--negative); }
    .sw-card.coach    { border-left-color: var(--caution); }
    .sw-card .sw-label {
      font-family: var(--mono); font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--text-3); font-weight: 700; margin-bottom: 10px;
    }
    .sw-card .sw-headline {
      font-size: 17px; font-weight: 700; letter-spacing: -0.02em;
      color: var(--text); margin-bottom: 6px;
    }
    .sw-card .sw-body { font-size: 12.5px; color: var(--text-2); line-height: 1.5; }
    .sw-card.strength .sw-headline { color: var(--green-dark); }
    .sw-card.weakness .sw-headline { color: var(--negative); }
    .sw-card.coach    .sw-headline { color: var(--caution); }

    .funnel-compare {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
      margin-bottom: 22px;
    }
    .fc-cell {
      background: var(--surface);
      border-radius: 10px;
      padding: 14px 14px;
      box-shadow: var(--shadow-1);
      border: 1px solid var(--border-soft);
    }
    .fc-label {
      font-family: var(--mono); font-size: 9px;
      text-transform: uppercase; letter-spacing: 0.15em;
      color: var(--text-3); font-weight: 700; margin-bottom: 8px;
    }
    .fc-val { font-family: var(--mono); font-size: 15px; font-weight: 700; color: var(--text); }
    .fc-vs { font-family: var(--mono); font-size: 11px; font-weight: 600; margin-top: 4px; }
    .fc-vs.up   { color: var(--positive); }
    .fc-vs.down { color: var(--negative); }
    .fc-vs.flat { color: var(--text-3); }

    .rank-link {
      cursor: pointer;
      transition: color 0.1s;
    }
    .rank-link:hover { color: var(--blue) !important; }
    .rank-link::after { content: ' ↗'; font-size: 9px; opacity: 0; transition: opacity 0.1s; }
    .rank-link:hover::after { opacity: 1; }

    @media (max-width: 768px) {
      .profile-hero { padding: 22px 22px; }
      .profile-hero .name { font-size: 28px; }
      .sw-grid { grid-template-columns: 1fr; }
      .funnel-compare { grid-template-columns: repeat(2, 1fr); }
      .profile-selector { padding: 14px 16px; gap: 10px; }
      .profile-selector .person-select { width: 100%; }
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  GAMIFICATION                                                 */
    /* ═══════════════════════════════════════════════════════════ */

    /* Tier badge in hero */
    .tier-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 999px;
      font-family: var(--mono); font-size: 10px;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;
      margin-left: 10px; vertical-align: middle;
    }
    .tier-rookie  { background: rgba(184, 115, 51, 0.12); color: #8B5A2B; border: 1px solid rgba(184, 115, 51, 0.25); }
    .tier-pro     { background: rgba(113, 121, 126, 0.12); color: #595F62; border: 1px solid rgba(113, 121, 126, 0.30); }
    .tier-elite   { background: rgba(255, 200, 87, 0.18); color: #A07825; border: 1px solid rgba(255, 200, 87, 0.45); }
    .tier-diamond { background: rgba(59, 171, 220, 0.15); color: #1B6F8C; border: 1px solid rgba(59, 171, 220, 0.40); }
    .tier-legend  {
      background: linear-gradient(135deg, rgba(31,122,182,0.15), rgba(166,206,57,0.20));
      color: var(--blue-dark); border: 1px solid rgba(31,122,182,0.35);
    }

    /* Tier inline indicator on leaderboard */
    .tier-mark {
      display: inline-block;
      font-size: 11px;
      margin-right: 6px;
      vertical-align: middle;
    }

    /* Streaks row on Profile */
    .streaks-row {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      margin-bottom: 22px;
    }
    .streak-card {
      background: var(--surface);
      border-radius: 12px;
      box-shadow: var(--shadow-1);
      border: 1px solid var(--border-soft);
      padding: 18px 22px;
      display: flex; align-items: center; gap: 16px;
    }
    .streak-card .icon { font-size: 28px; line-height: 1; }
    .streak-card .info { flex: 1; }
    .streak-card .stat {
      font-family: var(--mono); font-size: 22px; font-weight: 800;
      letter-spacing: -0.02em; color: var(--text); line-height: 1;
    }
    .streak-card .label {
      font-size: 11px; color: var(--text-3); margin-top: 4px;
      font-weight: 500;
    }

    /* Achievement badge grid */
    .badge-section {
      background: var(--surface);
      border-radius: 14px;
      box-shadow: var(--shadow-1);
      border: 1px solid var(--border-soft);
      padding: 22px 24px;
      margin-bottom: 22px;
    }
    .badge-section h4 {
      font-family: var(--mono); font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--text-3); font-weight: 700;
      margin-bottom: 16px; display: flex; align-items: center; gap: 10px;
    }
    .badge-section h4 .count {
      font-family: var(--mono); color: var(--blue);
      font-size: 11px; margin-left: auto;
    }
    .badge-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    .badge-item {
      background: var(--surface-2);
      border: 1px solid var(--border-soft);
      border-radius: 12px;
      padding: 16px 14px;
      text-align: center;
      transition: all 0.2s;
      cursor: default;
      position: relative;
    }
    .badge-item.earned {
      background: linear-gradient(135deg, #FFFFFF, var(--green-light));
      border-color: var(--green);
      box-shadow: 0 2px 8px rgba(166, 206, 57, 0.15);
    }
    .badge-item.earned:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(166, 206, 57, 0.25); }
    .badge-item.locked { opacity: 0.40; filter: grayscale(0.7); }
    .badge-icon { font-size: 30px; line-height: 1; margin-bottom: 8px; }
    .badge-name {
      font-size: 12px; font-weight: 700; color: var(--text);
      letter-spacing: -0.01em; margin-bottom: 3px;
    }
    .badge-desc {
      font-size: 10.5px; color: var(--text-3); line-height: 1.3;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  PRODUCER TRADING CARD                                        */
    /* ═══════════════════════════════════════════════════════════ */
    .card-wrap {
      background: var(--surface);
      border-radius: 14px;
      box-shadow: var(--shadow-1);
      border: 1px solid var(--border-soft);
      padding: 22px 24px;
      margin-bottom: 22px;
    }
    .card-wrap-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .card-wrap-head h4 {
      font-family: var(--mono); font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--text-3); font-weight: 700;
    }

    /* The actual card (exportable) */
    .producer-card {
      width: 100%; max-width: 460px; margin: 0 auto;
      background: linear-gradient(160deg, #FAFAFA 0%, #FFFFFF 50%, #F5F5F7 100%);
      border-radius: 20px;
      padding: 28px 30px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(13, 41, 75, 0.15), 0 2px 8px rgba(13, 41, 75, 0.06);
      border: 1px solid rgba(13, 41, 75, 0.08);
      font-family: var(--sans);
    }
    .producer-card.tier-rookie   { background: linear-gradient(160deg, #FAF4ED 0%, #FFFFFF 50%, #F5EBE0 100%); }
    .producer-card.tier-pro      { background: linear-gradient(160deg, #F2F4F6 0%, #FFFFFF 50%, #E8ECEF 100%); }
    .producer-card.tier-elite    { background: linear-gradient(160deg, #FFF8E1 0%, #FFFFFF 50%, #FFF3D0 100%); }
    .producer-card.tier-diamond  { background: linear-gradient(160deg, #E1F0FA 0%, #FFFFFF 50%, #DCF0F9 100%); }
    .producer-card.tier-legend   { background: linear-gradient(160deg, #E1F0FA 0%, #FFFFFF 40%, #EEF6D7 100%); }

    .producer-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, var(--blue), var(--green));
    }
    .pc-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 22px;
    }
    .pc-logo {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 700; letter-spacing: -0.02em;
      color: var(--text-2);
    }
    .pc-logo-mark {
      width: 24px; height: 24px;
      object-fit: contain;
      display: block;
      flex-shrink: 0;
    }
    .pc-logo-text { font-weight: 700; color: var(--text); }
    .pc-logo-text .accent { color: var(--green-dark); }

    .pc-tier-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 11px; border-radius: 999px;
      font-family: var(--mono); font-size: 10px;
      font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
      background: rgba(255,255,255,0.7); backdrop-filter: blur(6px);
      border: 1px solid rgba(13, 41, 75, 0.1);
    }

    .pc-name {
      font-size: 36px; font-weight: 800; letter-spacing: -0.03em;
      color: var(--text); line-height: 1.05; margin-bottom: 4px;
    }
    .pc-role {
      font-family: var(--mono); font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--text-3); font-weight: 600; margin-bottom: 20px;
    }
    .pc-stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
      margin-bottom: 18px;
    }
    .pc-stat {
      background: rgba(255,255,255,0.65);
      border-radius: 9px; padding: 11px 8px;
      text-align: center;
      border: 1px solid rgba(13, 41, 75, 0.06);
    }
    .pc-stat .v {
      font-family: var(--mono); font-size: 15px; font-weight: 700;
      color: var(--text); letter-spacing: -0.02em;
    }
    .pc-stat .l {
      font-size: 9px; color: var(--text-3); text-transform: uppercase;
      letter-spacing: 0.12em; margin-top: 3px; font-weight: 600;
    }
    .pc-meta {
      font-size: 12px; color: var(--text-2);
      margin-bottom: 14px; font-weight: 500;
    }
    .pc-meta strong { color: var(--text); font-weight: 700; }

    .pc-achievements {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 14px;
      padding: 10px 14px;
      background: rgba(255,255,255,0.55);
      border-radius: 10px;
      border: 1px solid rgba(13, 41, 75, 0.06);
    }
    .pc-achievements .label {
      font-family: var(--mono); font-size: 9px;
      text-transform: uppercase; letter-spacing: 0.15em;
      color: var(--text-3); font-weight: 700;
      margin-right: 8px;
    }
    .pc-achievements .icons {
      font-size: 18px; letter-spacing: 4px;
    }

    .pc-streak {
      font-family: var(--mono); font-size: 11px;
      color: var(--blue-dark); font-weight: 600;
      text-align: center; padding-top: 8px;
      border-top: 1px solid rgba(13, 41, 75, 0.08);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  AWARDS — Overview                                            */
    /* ═══════════════════════════════════════════════════════════ */
    .awards-row {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
      margin-bottom: 22px;
    }
    .award {
      background: var(--surface);
      border-radius: 14px;
      box-shadow: var(--shadow-2);
      border: 1px solid var(--border-soft);
      padding: 22px 24px;
      position: relative;
      overflow: hidden;
      transition: all 0.2s;
    }
    .award:hover { transform: translateY(-2px); box-shadow: var(--shadow-3); }
    .award.gold   { border-top: 4px solid var(--caution); }
    .award.green  { border-top: 4px solid var(--green); }
    .award.blue   { border-top: 4px solid var(--blue-2); }
    .award .icon { font-size: 24px; margin-bottom: 8px; }
    .award .tag {
      font-family: var(--mono); font-size: 9px;
      text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--text-3); font-weight: 700; margin-bottom: 4px;
    }
    .award .name {
      font-size: 24px; font-weight: 800; letter-spacing: -0.025em;
      color: var(--text); line-height: 1; margin-bottom: 8px;
    }
    .award .stat {
      font-family: var(--mono); font-size: 13px;
      color: var(--text-2); font-weight: 600;
    }
    .award .stat strong { color: var(--text); }

    /* Multi-category champions */
    .champ-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      margin-bottom: 22px;
    }
    .champ-card {
      background: var(--surface);
      border-radius: 12px;
      box-shadow: var(--shadow-1);
      border: 1px solid var(--border-soft);
      padding: 16px 18px;
      transition: all 0.18s;
      cursor: pointer;
      border-left: 3px solid var(--blue);
    }
    .champ-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-2); }
    .champ-card .cat {
      font-family: var(--mono); font-size: 9px;
      text-transform: uppercase; letter-spacing: 0.15em;
      color: var(--text-3); font-weight: 700; margin-bottom: 8px;
      display: flex; align-items: center; gap: 6px;
    }
    .champ-card .who {
      font-size: 16px; font-weight: 700; letter-spacing: -0.02em;
      color: var(--text); margin-bottom: 4px;
    }
    .champ-card .stat {
      font-family: var(--mono); font-size: 11px;
      color: var(--text-2); font-weight: 600;
    }

    @media (max-width: 768px) {
      .streaks-row { grid-template-columns: 1fr; }
      .awards-row { grid-template-columns: 1fr; }
      .champ-grid { grid-template-columns: repeat(2, 1fr); }
      .producer-card { padding: 22px 22px; }
      .pc-name { font-size: 28px; }
      .pc-stats { grid-template-columns: repeat(2, 1fr); }
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  LOADING                                                      */
    /* ═══════════════════════════════════════════════════════════ */
    .loading {
      padding: 100px 0; text-align: center;
      font-family: var(--mono);
      color: var(--text-3);
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-weight: 600;
    }
    .loading .spinner {
      display: inline-block; width: 32px; height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--blue);
      border-right-color: var(--green);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 18px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Entrance animation */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .view.active > * { animation: fadeUp 0.35s ease-out backwards; }
    .view.active > *:nth-child(1) { animation-delay: 0.00s; }
    .view.active > *:nth-child(2) { animation-delay: 0.05s; }
    .view.active > *:nth-child(3) { animation-delay: 0.10s; }
    .view.active > *:nth-child(4) { animation-delay: 0.15s; }
    .view.active > *:nth-child(5) { animation-delay: 0.20s; }
    .view.active > *:nth-child(6) { animation-delay: 0.25s; }

    .view { display: none; }
    .view.active { display: block; }

    /* ═══════════════════════════════════════════════════════════ */
    /*  MOBILE                                                       */
    /* ═══════════════════════════════════════════════════════════ */
    .hamburger {
      display: none;
      width: 40px; height: 40px;
      border-radius: 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      cursor: pointer;
      align-items: center; justify-content: center;
      box-shadow: var(--shadow-1);
      padding: 0;
    }
    .hamburger svg { width: 18px; height: 18px; stroke: var(--text); }
    .drawer-backdrop {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      z-index: 99;
      animation: fadeIn 0.2s ease;
    }
    .drawer-backdrop.active { display: block; }

    /* Tablet (1100px) */
    @media (max-width: 1100px) {
      .app { grid-template-columns: 1fr; }
      .sidebar {
        position: fixed; left: 0; top: 0; bottom: 0;
        width: 260px; z-index: 100;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: var(--shadow-4);
      }
      .sidebar.open { transform: translateX(0); }
      .main { padding: 0 24px 60px; }
      .hamburger { display: inline-flex; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .chart-row { grid-template-columns: 1fr; }
      .insight-grid { grid-template-columns: 1fr; }
      .insight-card.large { grid-column: span 1; }
      .section-title { font-size: 28px; }
      .topbar-meta { display: none; }
    }

    /* Phone (768px) */
    @media (max-width: 768px) {
      .main { padding: 0 16px 60px; }
      .topbar {
        flex-wrap: wrap; gap: 8px; padding: 14px 0;
      }
      .topbar > button { padding: 8px 10px; font-size: 11px; }
      .filter-group { flex: 1; min-width: 100px; }
      .filter-group select { width: 100%; min-width: 0; font-size: 12px; padding: 8px 26px 8px 10px; }
      .filter-label { display: none; }
      .section-header { gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
      .section-title { font-size: 24px; }
      .section-subtitle { margin-left: 0; padding-bottom: 0; font-size: 10px; }
      .kpi { padding: 16px 16px 14px; }
      .kpi-label { font-size: 9px; margin-bottom: 8px; }
      .kpi-value { font-size: 22px; }
      .kpi-value.mono { font-size: 20px; }
      .kpi-sub { font-size: 10px; }
      .insight-card { padding: 18px 18px; }
      .insight-card .headline { font-size: 16px; }
      .insight-card .stat { font-size: 22px; }
      .data-table { font-size: 11.5px; }
      .data-table thead th { padding: 10px 9px; font-size: 8.5px; }
      .data-table tbody td { padding: 9px 9px; }
      .data-table tbody td.num,
      .data-table tbody td.mono { font-size: 11px; }
      .panel-head { padding: 14px 16px 12px; flex-wrap: wrap; gap: 4px; }
      .panel-body { padding: 14px 12px; }
      .chart-container { height: 220px; }
      .table-scroll { -webkit-overflow-scrolling: touch; }
      .detail-grid { grid-template-columns: 1fr; gap: 18px; }
      tr.detail-row td { padding: 16px 14px; }
      .kpi-expand { padding: 16px 16px; }
      .kpi-expand .breakdown-grid { grid-template-columns: 1fr; gap: 16px; }
      .modal { width: 100%; max-width: 100%; max-height: 92vh; border-radius: 16px 16px 0 0; align-self: flex-end; margin-bottom: 0; }
      .modal-backdrop { align-items: flex-end; }
      .modal-head { padding: 18px 20px; }
      .modal-title { font-size: 17px; }
      .modal-body { padding: 18px 20px; }
      .modal-body .modal-kpi { grid-template-columns: repeat(2, 1fr); }
      .modal-body .modal-kpi-cell { padding: 12px 14px; }
      .modal-body .modal-kpi-cell .value { font-size: 14px; }
      /* Touch targets ≥44pt */
      button, .nav-item, select { min-height: 40px; }
      .nav-item { padding: 12px 22px; }
    }

    /* Very small (480px) */
    @media (max-width: 480px) {
      .kpi-grid { grid-template-columns: 1fr; gap: 10px; }
      .section-title { font-size: 22px; }
      .data-table { font-size: 10.5px; }
      .data-table thead th { padding: 8px 7px; font-size: 8px; letter-spacing: 0.1em; }
      .data-table tbody td { padding: 8px 7px; }
      .modal-body .modal-kpi { grid-template-columns: 1fr 1fr; gap: 8px; }
      .modal-body .modal-kpi-cell { padding: 10px 12px; }
    }
  </style>
</head>
<body>

<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo">
        <img class="brand-mark" id="brandMarkImg" alt="Logo" />
        <div>
          <div class="brand-text">a<span class="accent">commerce</span></div>
        </div>
      </div>
      <div class="brand-tag">Live Ops</div>
    </div>

    <div class="live-indicator">
      <span class="live-dot"></span>
      <span class="live-text">LIVE · <span id="liveTimestamp">—</span></span>
    </div>

    <div class="nav-section">Analytics</div>
    <div class="nav-item" data-view="overview"><span class="nav-icon">◐</span> Overview</div>
    <div class="nav-item active" data-view="producer"><span class="nav-icon">⬢</span> Producer</div>
    <div class="nav-item" data-view="mc"><span class="nav-icon">⬡</span> MC</div>
    <div class="nav-item" data-view="profile"><span class="nav-icon">●</span> Profile</div>
    <div class="nav-item" data-view="pair"><span class="nav-icon">⤬</span> Pair Chemistry</div>
    <div class="nav-item" data-view="funnel"><span class="nav-icon">⌖</span> Engagement Funnel</div>

    <div class="nav-section">Operations</div>
    <div class="nav-item" data-view="time"><span class="nav-icon">⏚</span> Time Slots</div>
    <div class="nav-item" data-view="insights"><span class="nav-icon">✦</span> Smart Insights</div>

    <div class="nav-spacer"></div>
    <div class="nav-footer" id="footerMeta">Loading…</div>
  </aside>

  <main class="main">
    <div class="topbar">
      <button class="hamburger" id="hamburger" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <div class="topbar-meta">Performance Intelligence · v1.3</div>
      <div class="topbar-spacer"></div>
      <div class="filter-group">
        <div class="filter-label">Month</div>
        <select id="filterMonth"></select>
      </div>
      <div class="filter-group">
        <div class="filter-label">Brand</div>
        <select id="filterBrand"><option value="">All</option></select>
      </div>
      <div class="filter-group">
        <div class="filter-label">Channel</div>
        <select id="filterChannel"><option value="">All</option></select>
      </div>
      <div class="filter-group">
        <div class="filter-label">Category</div>
        <select id="filterCategory"><option value="">All</option></select>
      </div>
      <button id="resetBtn">↻ Reset</button>
      <button class="primary" id="refreshBtn">⟲ Refresh</button>
    </div>

    <div id="content">
      <div class="loading">
        <div class="spinner"></div>
        <div>Streaming data from sheet…</div>
      </div>
    </div>
  </main>
</div>

<!-- Drawer backdrop (mobile) -->
<div class="drawer-backdrop" id="drawerBackdrop"></div>

<!-- Modal -->
<div class="modal-backdrop" id="modalBackdrop">
  <div class="modal">
    <div class="modal-head">
      <div>
        <div class="modal-title" id="modalTitle">—</div>
        <div class="modal-sub" id="modalSub"></div>
      </div>
      <button class="modal-close" id="modalClose">✕</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<script>
// ═══════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════
const LOGO_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const BRAND_CATEGORY = {"ensure": {"category": "Healthcare","cluster": "FMCG"},"l'oreal": {"category": "Beauty & Personal","cluster": "HB"},"torriden": {"category": "Beauty & Personal","cluster": "HB"},"nestle nhs": {"category": "Grocery","cluster": "FMCG"},"nestle fnb": {"category": "Grocery","cluster": "FMCG"},"bobbi brown": {"category": "Prestige Beauty","cluster": "HB"},"wyeth s26": {"category": "Mother & Baby","cluster": "FMCG"},"nestle milk": {"category": "Mother & Baby","cluster": "FMCG"},"estee lauder": {"category": "Beauty & Personal","cluster": "HB"},"cerave": {"category": "Beauty & Personal","cluster": "HB"},"la roche-posay": {"category": "Beauty & Personal","cluster": "HB"},"vichy": {"category": "Beauty & Personal","cluster": "HB"},"mac": {"category": "Prestige Beauty","cluster": "HB"},"royal canin": {"category": "Pets","cluster": "FMCG"},"boots": {"category": "Beauty & Personal","cluster": "HB"},"youthlabo": {"category": "Beauty & Personal","cluster": "HB"},"anessa": {"category": "Beauty & Personal","cluster": "HB"},"garnier": {"category": "Beauty & Personal","cluster": "HB"},"l'occitane": {"category": "Beauty & Personal","cluster": "HB"},"eucerin": {"category": "Healthcare","cluster": "HB"},"maybelline": {"category": "Beauty & Personal","cluster": "HB"},"3ce": {"category": "Beauty & Personal","cluster": "HB"},"elemis": {"category": "Beauty & Personal","cluster": "HB"},"philips ha": {"category": "Consumer Electronics","cluster": "EL"},"cafe amazon": {"category": "Grocery","cluster": "FMCG"},"darlie": {"category": "Grocery","cluster": "FMCG"},"d program": {"category": "Beauty & Personal","cluster": "HB"},"moleculogy": {"category": "Beauty & Personal","cluster": "HB"},"cerave x watsons": {"category": "Beauty & Personal","cluster": "HB"},"lego": {"category": "Toys","cluster": "FMCG"}};
let allData = null;
let charts = {};
let currentView = 'producer';
let sortState = { producer: { key: 'gmv', dir: 'desc' }, mc: { key: 'gmv', dir: 'desc' } };
let expandedKpi = null;  // 'gmv' | 'hours' | 'gmvHr' | 'viewers' | null
let profileState = { type: 'producer', name: null };  // current Profile selection

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Set logo image src (sidebar)
  const brandImg = document.getElementById('brandMarkImg');
  if (brandImg) brandImg.src = LOGO_DATA_URL;
  document.querySelectorAll('.nav-item').forEach(n => {
    n.addEventListener('click', () => { switchView(n.dataset.view); closeDrawer(); });
  });
  document.getElementById('refreshBtn').addEventListener('click', loadData);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  ['filterMonth','filterBrand','filterChannel','filterCategory'].forEach(id => {
    document.getElementById(id).addEventListener('change', render);
  });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    // Close only if click exactly on backdrop (not bubbled from modal content)
    if (e.target === e.currentTarget) closeModal();
  });
  // Drawer (mobile)
  document.getElementById('hamburger').addEventListener('click', openDrawer);
  document.getElementById('drawerBackdrop').addEventListener('click', closeDrawer);
  // Escape closes modal or drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeDrawer(); }
  });
  loadData();
});

function openDrawer() {
  document.querySelector('.sidebar').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('drawerBackdrop').classList.remove('active');
  document.body.style.overflow = '';
}

function loadData() {
  document.getElementById('content').innerHTML =
    '<div class="loading"><div class="spinner"></div><div>Streaming data from sheet…</div></div>';
  google.script.run
    .withSuccessHandler(onDataLoaded)
    .withFailureHandler(onDataError)
    .getDashboardData();
}

function onDataLoaded(data) {
  allData = data;
  allData.sessions.forEach(s => {
    s.startHour = parseStartHour(s.slot);
    // Enrich with brand category + cluster
    const bk = (s.brand || '').toLowerCase().trim();
    const meta = BRAND_CATEGORY[bk];
    s.category = meta ? meta.category : 'Other';
    s.cluster  = meta ? meta.cluster  : 'Other';
    // Parse "2026-05-15" as local date (TZ-safe: avoid Date() UTC midnight shift)
    const parts = String(s.date).split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      s.dow = d.getDay();
    } else {
      s.dow = new Date(s.date).getDay();
    }
  });
  // Derive categories + clusters from enriched sessions
  const catSet = new Set(), clSet = new Set();
  allData.sessions.forEach(s => { if (s.category) catSet.add(s.category); if (s.cluster) clSet.add(s.cluster); });
  allData.meta.categories = [...catSet].sort();
  allData.meta.clusters = [...clSet].sort();
  document.getElementById('liveTimestamp').textContent = data.meta.lastUpdated;
  document.getElementById('footerMeta').innerHTML =
    `<div>${data.meta.totalRows.toLocaleString()} sessions</div>
     <div>${data.meta.producers.length} producers · ${data.meta.mcs.length} MCs</div>
     <div>${data.meta.brands.length} brands · ${data.meta.channels.length} channels</div>`;
  initFilters();
  render();
}

function onDataError(err) {
  document.getElementById('content').innerHTML =
    `<div class="loading" style="color:var(--negative)">Error: ${err}</div>`;
}

function initFilters() {
  fillSelect('filterMonth', allData.meta.months.map(m => [m, fmtMonthLabel(m)]), allData.meta.months[allData.meta.months.length - 1]);
  fillSelect('filterBrand', allData.meta.brands.map(b => [b, b]), '');
  fillSelect('filterChannel', allData.meta.channels.map(c => [c, c]), '');
  fillSelect('filterCategory', (allData.meta.categories || []).map(c => [c, c]), '');
}

function fillSelect(id, items, selected) {
  const el = document.getElementById(id);
  el.innerHTML = '<option value="">All</option>';
  for (const [val, label] of items) {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    if (val === selected) opt.selected = true;
    el.appendChild(opt);
  }
}

function resetFilters() {
  document.getElementById('filterMonth').value = allData.meta.months[allData.meta.months.length - 1];
  document.getElementById('filterBrand').value = '';
  document.getElementById('filterChannel').value = '';
  document.getElementById('filterCategory').value = '';
  expandedKpi = null;
  render();
}

function switchView(v) {
  currentView = v;
  expandedKpi = null;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === v));
  render();
}

function getFiltered() {
  const m = document.getElementById('filterMonth').value;
  const b = document.getElementById('filterBrand').value;
  const c = document.getElementById('filterChannel').value;
  const cat = document.getElementById('filterCategory') ? document.getElementById('filterCategory').value : '';
  return allData.sessions.filter(s =>
    (!m || s.ym === m) && (!b || s.brand === b) && (!c || s.channel === c) &&
    (!cat || s.category === cat)
  );
}

function render() {
  if (!allData) return;
  const f = getFiltered();
  if (currentView === 'overview') renderOverview(f);
  else if (currentView === 'producer') renderProducer(f);
  else if (currentView === 'mc') renderMC(f);
  else if (currentView === 'profile') renderProfile();
  else if (currentView === 'pair') renderPair(f);
  else if (currentView === 'funnel') renderFunnel(f);
  else if (currentView === 'time') renderTime(f);
  else if (currentView === 'insights') renderInsights(f);
  setTimeout(() => document.querySelector('#content .view')?.classList.add('active'), 10);
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════════════
function openModal(title, sub, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalSub').textContent = sub || '';
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalBackdrop').classList.add('active');
}
function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('active');
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SKIP_MCS = new Set(['', 'tbcp', 'cancel', 'brand', 'n/a', 'na', '-']);

function fmtMonthLabel(ym) {
  const [y, m] = ym.split('-');
  return MONTH_NAMES[parseInt(m)] + " '" + y.slice(2);
}
function fmtMoney(n) {
  if (!n || n === 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}
function fmtPct(n) { return ((n || 0) * 100).toFixed(2) + '%'; }
function fmtNum(n) { return Math.round(n || 0).toLocaleString(); }
function fmtHours(n) { return (n || 0).toFixed(1); }

function parseStartHour(slot) {
  const m = String(slot || '').match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1]) : null;
}

function aggregate(rows, keyFn) {
  const m = {};
  rows.forEach(r => {
    const k = keyFn(r);
    if (!k) return;
    if (!m[k]) m[k] = { sessions: 0, hours: 0, gmv: 0, orders: 0, viewers: 0, engaged: 0, comments: 0, ctrSum: 0, ctrN: 0, coRSum: 0, coRN: 0, gmvs: [], brands: {}, mcs: {}, producers: {}, channels: {} };
    const a = m[k];
    a.sessions++; a.hours += r.dur; a.gmv += r.gmv;
    a.orders += r.orders; a.viewers += r.viewers; a.engaged += r.engaged;
    a.comments += r.comments;
    a.gmvs.push(r.gmv);
    if (r.ctr > 0) { a.ctrSum += r.ctr; a.ctrN++; }
    if (r.coR > 0) { a.coRSum += r.coR; a.coRN++; }
    if (r.brand) a.brands[r.brand] = (a.brands[r.brand] || 0) + r.gmv;
    if (r.mc && !SKIP_MCS.has(r.mc.toLowerCase())) a.mcs[r.mc] = (a.mcs[r.mc] || 0) + r.gmv;
    if (r.producer) a.producers[r.producer] = (a.producers[r.producer] || 0) + r.gmv;
    if (r.channel) a.channels[r.channel] = (a.channels[r.channel] || 0) + r.gmv;
  });
  return m;
}

function topKey(obj) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return '—';
  return keys.sort((a, b) => obj[b] - obj[a])[0];
}

function pctTier(val, sorted) {
  if (sorted.length === 0) return -1;
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  if (val >= p90) return 4;
  if (val >= p75) return 3;
  if (val >= p50) return 2;
  if (val >= p25) return 1;
  return 0;
}

Chart.defaults.font.family = "'Manrope', sans-serif";
Chart.defaults.color = '#6E6E73';
Chart.defaults.borderColor = '#E5E5EA';

// Status tooltip text (used in headers and badges)
const STATUS_TIP =
  "Status = GMV/Hr vs team average:\n" +
  "Top: ≥150% of team avg\n" +
  "Above: 100–150%\n" +
  "Below: 50–100%\n" +
  "At Risk: <50%";

function statusBadge(ratio) {
  if (ratio >= 1.5) return '<span class="badge badge-top tooltip-trigger">Top<span class="tip" style="white-space:pre-line">Top: GMV/Hr ≥ 150% of team avg</span></span>';
  if (ratio >= 1.0) return '<span class="badge badge-above tooltip-trigger">Above<span class="tip" style="white-space:pre-line">Above: GMV/Hr 100–150% of team avg</span></span>';
  if (ratio >= 0.5) return '<span class="badge badge-below tooltip-trigger">Below<span class="tip" style="white-space:pre-line">Below: GMV/Hr 50–100% of team avg</span></span>';
  return '<span class="badge badge-risk tooltip-trigger">At Risk<span class="tip" style="white-space:pre-line">At Risk: GMV/Hr < 50% of team avg</span></span>';
}
function rankClass(i) {
  if (i === 0) return 'rank top1';
  if (i === 1) return 'rank top2';
  if (i === 2) return 'rank top3';
  return 'rank';
}
function momCell(m) {
  if (m === null || m === undefined) return '<span class="mom mom-flat">—</span>';
  const arrow = m > 0.01 ? '↑' : m < -0.01 ? '↓' : '→';
  const cls = m > 0.01 ? 'mom-up' : m < -0.01 ? 'mom-down' : 'mom-flat';
  const sign = m >= 0 ? '+' : '';
  return `<span class="mom ${cls}">${arrow} ${sign}${Math.round(m*100)}%</span>`;
}
function prevMonth() {
  const m = document.getElementById('filterMonth').value;
  if (!m) return null;
  const idx = allData.meta.months.indexOf(m);
  return idx > 0 ? allData.meta.months[idx - 1] : null;
}

// ═══════════════════════════════════════════════════════════════════
//  GAMIFICATION — badges, tiers, streaks, awards
// ═══════════════════════════════════════════════════════════════════

const BADGE_DEFS = [
  { id: 'million',    icon: '🏆', name: '฿1M Club',      desc: 'GMV ≥ ฿1M in a session',          check: (s) => s.bestGmv >= 1e6 },
  { id: 'speed',      icon: '⚡', name: 'Speed Demon',    desc: '฿100K/hr in a session',           check: (s) => s.bestGmvHr >= 1e5 },
  { id: 'centurion',  icon: '🔥', name: 'Centurion',      desc: '100+ total live hours',           check: (s) => s.totalHours >= 100 },
  { id: 'halfm',      icon: '💎', name: 'Half-M Power',   desc: '฿500K/hr in a session',           check: (s) => s.bestGmvHr >= 5e5 },
  { id: 'versatile',  icon: '🌐', name: 'Versatile',      desc: 'Worked 10+ brands',               check: (s) => s.brandCount >= 10 },
  { id: 'engagement', icon: '💚', name: 'Engagement Pro', desc: '30%+ engagement in a session',    check: (s) => s.bestEng >= 0.30 },
  { id: 'pair',       icon: '🤝', name: 'Power Pair',     desc: '20+ sessions with one partner',   check: (s) => s.maxPartnerCount >= 20 },
  { id: 'rising',     icon: '📈', name: 'Rising Star',    desc: '3 consecutive months ↑ GMV',      check: (s) => s.maxConsecUp >= 3 },
  { id: 'orders',     icon: '💯', name: 'Order Master',   desc: '100+ orders in a session',        check: (s) => s.bestOrders >= 100 },
  { id: 'veteran',    icon: '🎬', name: 'Veteran',        desc: 'Active 6+ months',                check: (s) => s.activeMonths >= 6 },
  // Category badges
  { id: 'beauty',     icon: '💄', name: 'Beauty Master',  desc: '10+ sessions in Beauty & Personal', check: (s) => (s.categoryCount['Beauty & Personal']||0) >= 10 },
  { id: 'health',     icon: '💊', name: 'Healthcare Hero',desc: '10+ sessions in Healthcare',        check: (s) => (s.categoryCount['Healthcare']||0) >= 10 },
  { id: 'prestige',   icon: '👑', name: 'Prestige Pro',   desc: '10+ sessions in Prestige Beauty',   check: (s) => (s.categoryCount['Prestige Beauty']||0) >= 10 },
  { id: 'grocery',    icon: '🛒', name: 'Grocery Guru',   desc: '10+ sessions in Grocery',           check: (s) => (s.categoryCount['Grocery']||0) >= 10 },
  { id: 'mother',     icon: '👶', name: 'M&B Specialist', desc: '10+ sessions in Mother & Baby',     check: (s) => (s.categoryCount['Mother & Baby']||0) >= 10 },
  { id: 'pets',       icon: '🐾', name: 'Pet Champion',   desc: '10+ sessions in Pets',              check: (s) => (s.categoryCount['Pets']||0) >= 10 },
  // Platform badges
  { id: 'shopee',     icon: '🟠', name: 'Shopee Specialist', desc: '50+ sessions on Shopee',         check: (s) => (s.channelCount['Shopee']||0) >= 50 },
  { id: 'tiktok',     icon: '🎬', name: 'TikTok Master',   desc: '50+ sessions on TikTok',           check: (s) => (s.channelCount['TikTok']||0) >= 50 },
  { id: 'cross',      icon: '🌐', name: 'Cross-Platform Pro', desc: '20+ on both Shopee AND TikTok',check: (s) => (s.channelCount['Shopee']||0) >= 20 && (s.channelCount['TikTok']||0) >= 20 },
];

// Compute everything needed per person in 1 pass
function computePersonStats(name, type) {
  const sessions = allData.sessions.filter(s =>
    type === 'producer' ? s.producer === name : s.mc === name
  );
  if (sessions.length === 0) return null;

  let totalHours = 0, totalGmv = 0, bestGmv = 0, bestGmvHr = 0, bestOrders = 0, bestEng = 0;
  const brandSet = new Set();
  const partnerCount = {};
  const monthGmv = {};
  sessions.forEach(s => {
    totalHours += s.dur; totalGmv += s.gmv;
    if (s.gmv > bestGmv) bestGmv = s.gmv;
    const ghr = s.dur > 0 ? s.gmv / s.dur : 0;
    if (ghr > bestGmvHr) bestGmvHr = ghr;
    if (s.orders > bestOrders) bestOrders = s.orders;
    const er = s.viewers > 0 ? s.engaged / s.viewers : 0;
    if (er > bestEng) bestEng = er;
    if (s.brand) brandSet.add(s.brand);
    const partner = type === 'producer' ? s.mc : s.producer;
    if (partner && !SKIP_MCS.has(String(partner).toLowerCase())) {
      partnerCount[partner] = (partnerCount[partner] || 0) + 1;
    }
    monthGmv[s.ym] = (monthGmv[s.ym] || 0) + s.gmv;
  });
  const maxPartnerCount = Math.max(0, ...Object.values(partnerCount));
  const sortedMonths = Object.keys(monthGmv).sort();
  let consecUp = 0, maxConsecUp = 0;
  for (let i = 1; i < sortedMonths.length; i++) {
    if (monthGmv[sortedMonths[i]] > monthGmv[sortedMonths[i-1]]) {
      consecUp++; if (consecUp > maxConsecUp) maxConsecUp = consecUp;
    } else { consecUp = 0; }
  }
  // Category + channel counts
  const categoryCount = {}, channelCount = {};
  const categoryGmv = {}, channelGmv = {}, channelHrs = {};
  sessions.forEach(s => {
    if (s.category) categoryCount[s.category] = (categoryCount[s.category]||0) + 1;
    if (s.channel)  channelCount[s.channel]   = (channelCount[s.channel]||0)   + 1;
    if (s.category) categoryGmv[s.category] = (categoryGmv[s.category]||0) + s.gmv;
    if (s.channel)  { channelGmv[s.channel] = (channelGmv[s.channel]||0) + s.gmv; channelHrs[s.channel] = (channelHrs[s.channel]||0) + s.dur; }
  });
  return {
    totalSessions: sessions.length,
    totalHours, totalGmv, bestGmv, bestGmvHr, bestOrders, bestEng,
    brandCount: brandSet.size,
    activeMonths: sortedMonths.length,
    maxPartnerCount, maxConsecUp,
    firstMonth: sortedMonths[0],
    lastMonth: sortedMonths[sortedMonths.length - 1],
    categoryCount, channelCount, categoryGmv, channelGmv, channelHrs,
  };
}

function computeBadges(name, type) {
  const stats = computePersonStats(name, type);
  if (!stats) return BADGE_DEFS.map(b => ({ ...b, earned: false }));
  return BADGE_DEFS.map(b => ({ ...b, earned: b.check(stats) }));
}

function computeTier(name, type) {
  const stats = computePersonStats(name, type);
  if (!stats || stats.activeMonths < 1) {
    return { tier: 'rookie', label: 'Rookie', icon: '🥉' };
  }

  // Last 3 months GMV/Hr percentile vs team
  const lastMonths = allData.meta.months.slice(-3);
  const personSess = allData.sessions.filter(s =>
    lastMonths.includes(s.ym) && (type === 'producer' ? s.producer === name : s.mc === name)
  );
  if (personSess.length < 3) return { tier: 'rookie', label: 'Rookie', icon: '🥉' };
  const personHrs = personSess.reduce((s,r) => s+r.dur, 0);
  const personGmv = personSess.reduce((s,r) => s+r.gmv, 0);
  const personGmvHr = personHrs > 0 ? personGmv / personHrs : 0;

  const teamAgg = {};
  allData.sessions.filter(s => lastMonths.includes(s.ym)).forEach(s => {
    const k = type === 'producer' ? s.producer : s.mc;
    if (!k || SKIP_MCS.has(String(k).toLowerCase())) return;
    if (!teamAgg[k]) teamAgg[k] = { gmv: 0, hrs: 0 };
    teamAgg[k].gmv += s.gmv; teamAgg[k].hrs += s.dur;
  });
  const rates = Object.values(teamAgg).map(a => a.hrs > 0 ? a.gmv/a.hrs : 0).sort((a,b) => a-b);
  if (rates.length === 0) return { tier: 'rookie', label: 'Rookie', icon: '🥉' };
  const rank = rates.findIndex(v => v >= personGmvHr);
  const pct = rank < 0 ? 1 : rank / rates.length;

  // All-time top 3 → Legend (if ≥6 months active)
  if (stats.activeMonths >= 6) {
    const allTimeAgg = {};
    allData.sessions.forEach(s => {
      const k = type === 'producer' ? s.producer : s.mc;
      if (!k || SKIP_MCS.has(String(k).toLowerCase())) return;
      allTimeAgg[k] = (allTimeAgg[k] || 0) + s.gmv;
    });
    const sorted = Object.entries(allTimeAgg).sort((a,b) => b[1]-a[1]);
    const idx = sorted.findIndex(([n]) => n === name);
    if (idx >= 0 && idx < 3) return { tier: 'legend', label: 'Legend', icon: '👑' };
  }
  if (pct >= 0.9) return { tier: 'diamond', label: 'Diamond', icon: '💎' };
  if (pct >= 0.7) return { tier: 'elite',   label: 'Elite',   icon: '🥇' };
  if (pct >= 0.4) return { tier: 'pro',     label: 'Pro',     icon: '🥈' };
  return                  { tier: 'rookie',  label: 'Rookie',  icon: '🥉' };
}

function computeStreaks(name, type) {
  const months = allData.meta.months;
  let currentStreak = 0, maxStreak = 0;
  let monthlyBestGmv = 0, monthlyBestLabel = null;
  months.forEach(m => {
    const personSess = allData.sessions.filter(s =>
      s.ym === m && (type === 'producer' ? s.producer === name : s.mc === name)
    );
    if (personSess.length === 0) {
      currentStreak = 0;
      return;
    }
    const teamSess = allData.sessions.filter(s => s.ym === m &&
      (type === 'producer' ? true : (s.mc && !SKIP_MCS.has(s.mc.toLowerCase())))
    );
    const pH = personSess.reduce((s,r) => s+r.dur, 0);
    const pG = personSess.reduce((s,r) => s+r.gmv, 0);
    const tH = teamSess.reduce((s,r) => s+r.dur, 0);
    const tG = teamSess.reduce((s,r) => s+r.gmv, 0);
    const pRate = pH > 0 ? pG / pH : 0;
    const tRate = tH > 0 ? tG / tH : 0;
    if (pRate > tRate) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
    if (pG > monthlyBestGmv) { monthlyBestGmv = pG; monthlyBestLabel = m; }
  });
  return {
    currentAboveTeam: currentStreak,
    maxAboveTeam: maxStreak,
    bestMonth: monthlyBestLabel,
    bestMonthGmv: monthlyBestGmv,
  };
}

// Monthly awards: MVP, Most Improved, Rookie of the month
function computeMonthlyAwards(month) {
  if (!month) return { mvp: null, mostImproved: null, rookie: null };
  const rows = allData.sessions.filter(s => s.ym === month);
  const prev = prevMonth();
  const prevRows = prev ? allData.sessions.filter(s => s.ym === prev) : [];
  const agg = aggregate(rows, r => r.producer);
  const prevAgg = aggregate(prevRows, r => r.producer);

  // MVP — top GMV
  const sorted = Object.entries(agg).sort((a,b) => b[1].gmv - a[1].gmv);
  const mvp = sorted[0] ? { name: sorted[0][0], data: sorted[0][1] } : null;

  // Most Improved
  let mostImproved = null, bestGain = 0;
  Object.entries(agg).forEach(([n, a]) => {
    const p = prevAgg[n];
    if (!p || p.gmv === 0 || a.hours < 3) return;
    const ch = (a.gmv - p.gmv) / p.gmv;
    if (ch > bestGain) { bestGain = ch; mostImproved = { name: n, change: ch, data: a }; }
  });

  // Rookie of the month — first appearance this month with significant GMV
  let rookie = null;
  Object.entries(agg).forEach(([n, a]) => {
    if (prevAgg[n]) return;
    const before = allData.sessions.some(s => s.producer === n && s.ym < month);
    if (before) return;
    if (a.gmv > (rookie ? rookie.data.gmv : 0)) {
      rookie = { name: n, data: a };
    }
  });
  return { mvp, mostImproved, rookie };
}

// Multi-category champions
function computeChampions(rows) {
  const prodAgg = aggregate(rows, r => r.producer);
  const mcAgg = aggregate(rows.filter(r => r.mc && !SKIP_MCS.has(r.mc.toLowerCase())), r => r.mc);
  const prev = prevMonth();
  const prevAgg = prev ? aggregate(allData.sessions.filter(s => s.ym === prev), r => r.producer) : {};

  const topEarner = Object.entries(prodAgg).sort((a,b) => b[1].gmv - a[1].gmv)[0];

  const speedStar = Object.entries(prodAgg)
    .filter(([n,a]) => a.hours >= 5)
    .sort((a,b) => (b[1].gmv/b[1].hours) - (a[1].gmv/a[1].hours))[0];

  const engKing = Object.entries(prodAgg)
    .filter(([n,a]) => a.sessions >= 5 && a.viewers > 0)
    .sort((a,b) => (b[1].engaged/b[1].viewers) - (a[1].engaged/a[1].viewers))[0];

  const versatile = Object.entries(prodAgg)
    .map(([n,a]) => ({ name: n, brands: Object.keys(a.brands).length, agg: a }))
    .sort((a,b) => b.brands - a.brands)[0];

  let biggestRiser = null, bestCh = 0;
  Object.entries(prodAgg).forEach(([n,a]) => {
    const p = prevAgg[n];
    if (!p || p.gmv === 0 || a.hours < 3) return;
    const ch = (a.gmv - p.gmv) / p.gmv;
    if (ch > bestCh) { bestCh = ch; biggestRiser = { name: n, change: ch }; }
  });

  let champion = null, lowestCV = Infinity;
  Object.entries(prodAgg).forEach(([n,a]) => {
    if (a.sessions < 5) return;
    const mean = a.gmv / a.sessions;
    if (mean <= 0) return;
    const variance = a.gmvs.reduce((s,x) => s + Math.pow(x-mean,2), 0) / a.sessions;
    const cv = Math.sqrt(variance) / mean;
    if (cv < lowestCV) { lowestCV = cv; champion = { name: n, cv, mean }; }
  });

  const topMC = Object.entries(mcAgg).sort((a,b) => b[1].gmv - a[1].gmv)[0];

  return { topEarner, speedStar, engKing, versatile, biggestRiser, champion, topMC };
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: OVERVIEW (clickable KPIs)
// ═══════════════════════════════════════════════════════════════════
function renderOverview(rows) {
  const month = document.getElementById('filterMonth').value;
  const prodAgg = aggregate(rows, r => r.producer);
  const mcAgg = aggregate(rows.filter(r => r.mc && !SKIP_MCS.has(r.mc.toLowerCase())), r => r.mc);
  const brandAgg = aggregate(rows, r => r.brand);

  const totalGmv = rows.reduce((s, r) => s + r.gmv, 0);
  const totalHrs = rows.reduce((s, r) => s + r.dur, 0);
  const totalViewers = rows.reduce((s, r) => s + r.viewers, 0);
  const gmvPerHour = totalHrs > 0 ? totalGmv / totalHrs : 0;
  const insights = computeInsights(rows, prodAgg, mcAgg, month);

  document.getElementById('content').innerHTML = `
    <div class="view">
      <div class="section-header">
        <span class="section-number">01 / OVERVIEW</span>
        <h2 class="section-title">at a <span class="accent">glance</span></h2>
        <span class="section-subtitle">${fmtMonthLabel(month)} · click any card</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi ${expandedKpi==='gmv'?'expanded':''}" data-kpi="gmv">
          <div class="kpi-stripe"></div>
          <div class="kpi-label">Total GMV <span class="info">↗ click</span></div>
          <div class="kpi-value mono">฿${fmtMoney(totalGmv)}</div>
          <div class="kpi-sub">${Object.keys(prodAgg).length} producers · ${Object.keys(mcAgg).length} MCs</div>
        </div>
        <div class="kpi ${expandedKpi==='hours'?'expanded':''}" data-kpi="hours">
          <div class="kpi-stripe"></div>
          <div class="kpi-label">Live Hours <span class="info">↗ click</span></div>
          <div class="kpi-value mono">${fmtHours(totalHrs)}</div>
          <div class="kpi-sub">${rows.length.toLocaleString()} session blocks</div>
        </div>
        <div class="kpi ${expandedKpi==='gmvHr'?'expanded':''}" data-kpi="gmvHr">
          <div class="kpi-stripe"></div>
          <div class="kpi-label">GMV / Hour <span class="info">↗ click</span></div>
          <div class="kpi-value mono">฿${fmtMoney(gmvPerHour)}</div>
          <div class="kpi-sub">team average</div>
        </div>
        <div class="kpi ${expandedKpi==='viewers'?'expanded':''}" data-kpi="viewers">
          <div class="kpi-stripe"></div>
          <div class="kpi-label">Total Viewers <span class="info">↗ click</span></div>
          <div class="kpi-value mono">${fmtMoney(totalViewers)}</div>
          <div class="kpi-sub">reach this month</div>
        </div>
      </div>

      <div id="kpiExpandSlot"></div>

      <div class="subsection">🏆 Monthly Awards — ${fmtMonthLabel(month)}</div>
      <div class="awards-row" id="awardsRow"></div>

      <div class="subsection">⚡ Champions — multi-category leaders</div>
      <div class="champ-grid" id="champGrid"></div>

      <div class="subsection">Smart Briefing — Auto-generated</div>
      <div class="insight-grid" id="insightFeed"></div>
    </div>
  `;

  // Awards
  const awards = computeMonthlyAwards(month);
  const awardsRow = document.getElementById('awardsRow');
  if (awards.mvp) {
    awardsRow.insertAdjacentHTML('beforeend', `
      <div class="award gold">
        <div class="icon">🌟</div>
        <div class="tag">MVP of ${fmtMonthLabel(month)}</div>
        <div class="name"><span class="rank-link" data-profile-producer="${awards.mvp.name}">${awards.mvp.name}</span></div>
        <div class="stat">฿${fmtMoney(awards.mvp.data.gmv)} · ${fmtHours(awards.mvp.data.hours)} hrs</div>
      </div>`);
  }
  if (awards.mostImproved) {
    awardsRow.insertAdjacentHTML('beforeend', `
      <div class="award green">
        <div class="icon">📈</div>
        <div class="tag">Most Improved</div>
        <div class="name"><span class="rank-link" data-profile-producer="${awards.mostImproved.name}">${awards.mostImproved.name}</span></div>
        <div class="stat"><strong>+${Math.round(awards.mostImproved.change*100)}%</strong> vs last month</div>
      </div>`);
  }
  if (awards.rookie) {
    awardsRow.insertAdjacentHTML('beforeend', `
      <div class="award blue">
        <div class="icon">🆕</div>
        <div class="tag">Rookie of Month</div>
        <div class="name"><span class="rank-link" data-profile-producer="${awards.rookie.name}">${awards.rookie.name}</span></div>
        <div class="stat">฿${fmtMoney(awards.rookie.data.gmv)} · first month</div>
      </div>`);
  }
  if (awardsRow.children.length === 0) {
    awardsRow.innerHTML = '<div class="loading" style="grid-column:1/-1;color:var(--text-3)">ยังไม่มี data พอประกาศ awards ของเดือนนี้</div>';
  }

  // Champions
  const champs = computeChampions(rows);
  const champGrid = document.getElementById('champGrid');
  const champConfig = [
    { key: 'topEarner',    icon: '💰', cat: 'Top Earner',          fmt: (c) => `฿${fmtMoney(c[1].gmv)} GMV` },
    { key: 'speedStar',    icon: '⚡', cat: 'Speed Star',           fmt: (c) => `฿${fmtMoney(c[1].gmv/c[1].hours)}/hr` },
    { key: 'engKing',      icon: '💗', cat: 'Engagement King',     fmt: (c) => `${(c[1].engaged/c[1].viewers*100).toFixed(1)}% eng rate` },
    { key: 'versatile',    icon: '🌐', cat: 'Brand Versatility',   fmt: (c) => `${c.brands} brands worked`, who: (c) => c.name, isObj: true },
    { key: 'biggestRiser', icon: '🚀', cat: 'Biggest Riser',       fmt: (c) => `+${Math.round(c.change*100)}% MoM`, who: (c) => c.name, isObj: true },
    { key: 'champion',     icon: '🎯', cat: 'Consistency Champion',fmt: (c) => `CV ${(c.cv*100).toFixed(0)}% · ฿${fmtMoney(c.mean)}/sess`, who: (c) => c.name, isObj: true },
    { key: 'topMC',        icon: '🎤', cat: 'Top MC',               fmt: (c) => `฿${fmtMoney(c[1].gmv)} GMV`, isMc: true },
  ];
  champConfig.forEach(cfg => {
    const c = champs[cfg.key];
    if (!c) return;
    const name = cfg.isObj ? cfg.who(c) : c[0];
    const dataAttr = cfg.isMc ? 'data-profile-mc' : 'data-profile-producer';
    champGrid.insertAdjacentHTML('beforeend', `
      <div class="champ-card">
        <div class="cat"><span>${cfg.icon}</span> ${cfg.cat}</div>
        <div class="who"><span class="rank-link" ${dataAttr}="${name}">${name}</span></div>
        <div class="stat">${cfg.fmt(c)}</div>
      </div>`);
  });
  // Wire jump-to-profile clicks
  document.querySelectorAll('[data-profile-producer]').forEach(el => {
    el.addEventListener('click', () => jumpToProfile('producer', el.dataset.profileProducer));
  });
  document.querySelectorAll('[data-profile-mc]').forEach(el => {
    el.addEventListener('click', () => jumpToProfile('mc', el.dataset.profileMc));
  });

  // KPI click handlers
  document.querySelectorAll('.kpi[data-kpi]').forEach(card => {
    card.addEventListener('click', () => {
      const k = card.dataset.kpi;
      expandedKpi = expandedKpi === k ? null : k;
      renderKpiExpand(brandAgg, totalGmv, totalHrs);
      document.querySelectorAll('.kpi').forEach(c => c.classList.toggle('expanded', c.dataset.kpi === expandedKpi));
    });
  });
  renderKpiExpand(brandAgg, totalGmv, totalHrs);

  const feed = document.getElementById('insightFeed');
  insights.forEach(i => {
    const card = document.createElement('div');
    card.className = 'insight-card tone-' + i.tone + (i.large ? ' large' : '');
    card.innerHTML = `
      <span class="tag tag-${i.tone}">${i.label}</span>
      <div class="headline">${i.headline}</div>
      <div class="body">${i.body}</div>
      ${i.stat ? `<div class="stat">${i.stat}</div>` : ''}
    `;
    feed.appendChild(card);
  });
}

function renderKpiExpand(brandAgg, totalGmv, totalHrs) {
  const slot = document.getElementById('kpiExpandSlot');
  if (!slot) return;
  if (!expandedKpi) { slot.innerHTML = ''; return; }

  // Sort brands per KPI type
  const brands = Object.entries(brandAgg);
  let sorted, valFn, labelFn, title;
  if (expandedKpi === 'gmv') {
    sorted = brands.sort((a,b) => b[1].gmv - a[1].gmv);
    valFn = a => '฿' + fmtMoney(a.gmv);
    labelFn = a => ((a.gmv / totalGmv) * 100).toFixed(1) + '% of total';
    title = 'Total GMV — by Brand';
  } else if (expandedKpi === 'hours') {
    sorted = brands.sort((a,b) => b[1].hours - a[1].hours);
    valFn = a => fmtHours(a.hours) + ' hrs';
    labelFn = a => ((a.hours / totalHrs) * 100).toFixed(1) + '% of hours';
    title = 'Live Hours — by Brand';
  } else if (expandedKpi === 'gmvHr') {
    sorted = brands.filter(b => b[1].hours > 0).sort((a,b) => (b[1].gmv/b[1].hours) - (a[1].gmv/a[1].hours));
    valFn = a => '฿' + fmtMoney(a.gmv / a.hours);
    labelFn = a => a.sessions + ' sessions · ' + fmtHours(a.hours) + ' hrs';
    title = 'GMV / Hour — by Brand (highest yield first)';
  } else if (expandedKpi === 'viewers') {
    sorted = brands.sort((a,b) => b[1].viewers - a[1].viewers);
    valFn = a => fmtMoney(a.viewers);
    labelFn = a => a.sessions + ' sessions';
    title = 'Total Viewers — by Brand';
  }

  const tableHtml = sorted.slice(0, 15).map(([brand, a], i) => `
    <tr>
      <td class="${rankClass(i)}">${i + 1}</td>
      <td class="name clickable" data-brand="${brand}">${brand}</td>
      <td class="num mono">${valFn(a)}</td>
      <td class="num" style="color:var(--text-3);font-size:11px">${labelFn(a)}</td>
    </tr>
  `).join('');

  slot.innerHTML = `
    <div class="kpi-expand">
      <button class="close-btn" onclick="expandedKpi=null;document.getElementById('kpiExpandSlot').innerHTML='';document.querySelectorAll('.kpi').forEach(c=>c.classList.remove('expanded'))">✕ Close</button>
      <h3>${title}</h3>
      <div class="breakdown-grid">
        <div>
          <table class="data-table">
            <thead><tr><th>#</th><th>Brand</th><th class="num">Value</th><th class="num">Share</th></tr></thead>
            <tbody>${tableHtml}</tbody>
          </table>
        </div>
        <div>
          <div class="chart-container" style="height:380px"><canvas id="kpiChart"></canvas></div>
        </div>
      </div>
    </div>
  `;

  // Donut chart
  const top8 = sorted.slice(0, 8);
  const others = sorted.slice(8);
  const labels = top8.map(x => x[0]);
  let values;
  if (expandedKpi === 'gmv') values = top8.map(x => x[1].gmv);
  else if (expandedKpi === 'hours') values = top8.map(x => x[1].hours);
  else if (expandedKpi === 'gmvHr') values = top8.map(x => x[1].gmv / x[1].hours);
  else values = top8.map(x => x[1].viewers);

  if (others.length > 0) {
    labels.push('Others');
    let othersSum;
    if (expandedKpi === 'gmv') othersSum = others.reduce((s,x) => s + x[1].gmv, 0);
    else if (expandedKpi === 'hours') othersSum = others.reduce((s,x) => s + x[1].hours, 0);
    else if (expandedKpi === 'gmvHr') othersSum = others.reduce((s,x) => s + (x[1].gmv/x[1].hours), 0) / others.length;
    else othersSum = others.reduce((s,x) => s + x[1].viewers, 0);
    values.push(othersSum);
  }

  if (charts.kpiChart) charts.kpiChart.destroy();
  charts.kpiChart = new Chart(document.getElementById('kpiChart'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: ['#1F7AB6','#A6CE39','#3BABDC','#F0A030','#5BB832','#155985','#8AB02E','#2A8FBE','#B4B4B7'], borderWidth: 2, borderColor: '#FFFFFF' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#1D1D1F', font: { size: 11, weight: '500' }, boxWidth: 12, padding: 10 } },
        tooltip: { backgroundColor: '#1D1D1F', titleColor: 'white', bodyColor: 'white' }
      }
    }
  });

  // Brand click → modal
  document.querySelectorAll('#kpiExpandSlot .clickable[data-brand]').forEach(el => {
    el.addEventListener('click', () => openBrandModal(el.dataset.brand));
  });
}

function computeInsights(rows, prodAgg, mcAgg, month) {
  const insights = [];
  const prev = prevMonth();
  const prevRows = prev ? allData.sessions.filter(s => s.ym === prev) : [];
  const prevProdAgg = aggregate(prevRows, r => r.producer);

  const topProd = Object.entries(prodAgg).sort((a, b) => b[1].gmv - a[1].gmv)[0];
  if (topProd) {
    const prev = prevProdAgg[topProd[0]];
    let momText = '';
    if (prev && prev.gmv > 0) {
      const ch = (topProd[1].gmv - prev.gmv) / prev.gmv;
      momText = ` — ${ch >= 0 ? 'up' : 'down'} <strong>${Math.abs(Math.round(ch*100))}%</strong> vs last month.`;
    }
    insights.push({
      label: 'Top Performer', tone: 'gold',
      headline: `${topProd[0]} leads the board`,
      body: `Generated <strong>฿${fmtMoney(topProd[1].gmv)}</strong> across <strong>${fmtHours(topProd[1].hours)}</strong> live hours${momText}`,
      stat: `฿${fmtMoney(topProd[1].hours > 0 ? topProd[1].gmv/topProd[1].hours : 0)}/hr`
    });
  }

  let bestMover = null, bestMoverCh = 0;
  Object.entries(prodAgg).forEach(([name, agg]) => {
    const p = prevProdAgg[name];
    if (!p || p.gmv === 0 || agg.hours < 3) return;
    const ch = (agg.gmv - p.gmv) / p.gmv;
    if (ch > bestMoverCh) { bestMoverCh = ch; bestMover = { name, agg, change: ch }; }
  });
  if (bestMover && bestMover.change > 0.3) {
    insights.push({
      label: 'Promotion Watch', tone: 'positive',
      headline: `${bestMover.name} is climbing fast`,
      body: `GMV grew <strong>+${Math.round(bestMover.change*100)}%</strong> month-over-month. If this holds 1 more month, schedule formal promotion review.`,
      stat: `+${Math.round(bestMover.change*100)}%`
    });
  }

  let worstDecline = null, worstChange = 0;
  Object.entries(prodAgg).forEach(([name, agg]) => {
    const p = prevProdAgg[name];
    if (!p || p.gmv === 0 || agg.hours < 3) return;
    const ch = (agg.gmv - p.gmv) / p.gmv;
    if (ch < worstChange) { worstChange = ch; worstDecline = { name, agg, change: ch }; }
  });
  if (worstDecline && worstDecline.change < -0.3) {
    insights.push({
      label: 'Intervention', tone: 'warning',
      headline: `${worstDecline.name} is slipping`,
      body: `GMV down <strong>${Math.round(worstDecline.change*100)}%</strong> MoM. Schedule 1:1 this week — check engagement funnel for root cause.`,
      stat: `${Math.round(worstDecline.change*100)}%`
    });
  }

  const allHrs = Object.values(prodAgg).map(a => a.hours);
  const medianHrs = allHrs.sort((a, b) => a - b)[Math.floor(allHrs.length / 2)] || 0;
  let hiddenGem = null, hgRate = 0;
  Object.entries(prodAgg).forEach(([name, agg]) => {
    if (agg.hours < 3 || agg.hours > medianHrs * 0.5) return;
    const rate = agg.gmv / agg.hours;
    if (rate > hgRate) { hgRate = rate; hiddenGem = { name, agg, rate }; }
  });
  if (hiddenGem) {
    insights.push({
      label: 'Hidden Gem', tone: 'info',
      headline: `${hiddenGem.name} is under-scheduled`,
      body: `Hits <strong>฿${fmtMoney(hiddenGem.rate)}/hr</strong> in only ${fmtHours(hiddenGem.agg.hours)} live hours. Consider increasing slots — high upside.`,
      stat: `฿${fmtMoney(hiddenGem.rate)}/hr`
    });
  }

  const brandAgg = aggregate(rows, r => r.brand);
  let bestBrand = null, bestBrandRate = 0;
  Object.entries(brandAgg).forEach(([brand, agg]) => {
    if (agg.hours < 5) return;
    const rate = agg.gmv / agg.hours;
    if (rate > bestBrandRate) { bestBrandRate = rate; bestBrand = { brand, agg, rate }; }
  });
  if (bestBrand) {
    insights.push({
      label: 'Brand Opportunity', tone: 'action',
      headline: `${bestBrand.brand} is the cash brand`,
      body: `Yields <strong>฿${fmtMoney(bestBrand.rate)}/hr</strong> — highest of all active brands. Allocate top producers here for max output.`,
      stat: `${fmtHours(bestBrand.agg.hours)} hrs`
    });
  }

  const hourAgg = aggregate(rows.filter(r => r.startHour !== null), r => String(r.startHour));
  let bestHour = null, bestHourRate = 0;
  Object.entries(hourAgg).forEach(([h, agg]) => {
    if (agg.hours < 5) return;
    const rate = agg.gmv / agg.hours;
    if (rate > bestHourRate) { bestHourRate = rate; bestHour = { h: parseInt(h), agg, rate }; }
  });
  if (bestHour) {
    const endH = (bestHour.h + 2) % 24;
    const baseline = rows.reduce((s,r)=>s+r.gmv,0)/rows.reduce((s,r)=>s+r.dur,0);
    insights.push({
      label: 'Prime Time', tone: 'gold',
      headline: `${String(bestHour.h).padStart(2,'0')}:00–${String(endH).padStart(2,'0')}:00 is peak`,
      body: `This slot generates <strong>฿${fmtMoney(bestHour.rate)}/hr</strong> across ${fmtHours(bestHour.agg.hours)} live hours. Schedule strongest pairs here.`,
      stat: `${Math.round(bestHourRate / baseline * 100 - 100)}% vs avg`
    });
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════
//  BRAND MODAL — monthly + producer + MC breakdown per brand
// ═══════════════════════════════════════════════════════════════════
function openBrandModal(brand, scopedTo) {
  // scopedTo: { type: 'producer'|'mc', name: '...' } — optional
  let data = allData.sessions.filter(s => s.brand === brand);
  let scopeText = '';
  if (scopedTo) {
    data = data.filter(s => s[scopedTo.type] === scopedTo.name);
    scopeText = ` · ${scopedTo.type === 'producer' ? 'Producer' : 'MC'}: ${scopedTo.name}`;
  }

  const totGmv = data.reduce((s, r) => s + r.gmv, 0);
  const totHrs = data.reduce((s, r) => s + r.dur, 0);
  const totOrders = data.reduce((s, r) => s + r.orders, 0);
  const gmvHr = totHrs > 0 ? totGmv / totHrs : 0;

  const byMonth = aggregate(data, r => r.ym);
  const months = Object.keys(byMonth).sort();
  const monthRows = months.map(m => {
    const v = byMonth[m]; const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr>
      <td class="name">${fmtMonthLabel(m)}</td>
      <td class="num mono">${fmtHours(v.hours)}</td>
      <td class="num mono">฿${fmtMoney(v.gmv)}</td>
      <td class="num mono">฿${fmtMoney(gh)}</td>
      <td class="num mono">${fmtNum(v.orders)}</td>
    </tr>`;
  }).join('');

  // Top producers / MCs for this brand
  let extraSection = '';
  if (!scopedTo) {
    const byProd = aggregate(data, r => r.producer);
    const topProds = Object.entries(byProd).sort((a,b) => b[1].gmv - a[1].gmv).slice(0, 8);
    const prodRows = topProds.map(([n, v]) => {
      const gh = v.hours > 0 ? v.gmv / v.hours : 0;
      return `<tr><td class="name">${n}</td><td class="num mono">${fmtHours(v.hours)}</td><td class="num mono">฿${fmtMoney(v.gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
    }).join('');
    extraSection = `
      <h4>Top Producers on ${brand}</h4>
      <table class="data-table">
        <thead><tr><th>Producer</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
        <tbody>${prodRows}</tbody>
      </table>`;
  }

  const body = `
    <div class="modal-kpi">
      <div class="modal-kpi-cell"><div class="label">Total GMV</div><div class="value">฿${fmtMoney(totGmv)}</div></div>
      <div class="modal-kpi-cell"><div class="label">Live Hours</div><div class="value">${fmtHours(totHrs)}</div></div>
      <div class="modal-kpi-cell"><div class="label">GMV/Hr</div><div class="value">฿${fmtMoney(gmvHr)}</div></div>
      <div class="modal-kpi-cell"><div class="label">Orders</div><div class="value">${fmtNum(totOrders)}</div></div>
    </div>
    <h4>Monthly breakdown</h4>
    <table class="data-table">
      <thead><tr><th>Month</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th><th class="num">Orders</th></tr></thead>
      <tbody>${monthRows}</tbody>
    </table>
    ${extraSection}
  `;
  openModal(brand, scopeText.trim() || 'All-time data, no filter applied', body);
}

// ═══════════════════════════════════════════════════════════════════
//  IN-PLACE TABLE SORT — no full re-render
// ═══════════════════════════════════════════════════════════════════
function attachInPlaceSort(tableId, type, dataArray, rebuildRowFn) {
  document.querySelectorAll(`#${tableId} th[data-k]`).forEach(th => {
    th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (sortState[type].key === k) sortState[type].dir = sortState[type].dir === 'asc' ? 'desc' : 'asc';
      else { sortState[type].key = k; sortState[type].dir = (k === 'name') ? 'asc' : 'desc'; }

      // Sort
      const sk = sortState[type].key, sd = sortState[type].dir;
      dataArray.sort((a, b) => {
        const va = a[sk], vb = b[sk];
        if (typeof va === 'string') return sd === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return sd === 'asc' ? va - vb : vb - va;
      });

      // Rebuild only tbody (keep charts + KPI intact)
      const tbody = document.querySelector(`#${tableId} tbody`);
      tbody.innerHTML = '';
      dataArray.forEach((r, i) => tbody.appendChild(rebuildRowFn(r, i)));

      // Update sort indicator
      document.querySelectorAll(`#${tableId} th .sort-ind`).forEach(s => s.remove());
      const ind = document.createElement('span');
      ind.className = 'sort-ind';
      ind.textContent = sd === 'asc' ? '↑' : '↓';
      th.appendChild(ind);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Platform Split panel — fair ranking by channel
// ═══════════════════════════════════════════════════════════════════
function buildPlatformSplit(rows, type) {
  const isProd = type === 'producer';
  const channels = ['Shopee', 'TikTok'];
  const colors = { Shopee: '#FF6F2C', TikTok: '#000000' };
  const blocks = channels.map(ch => {
    const chanRows = rows.filter(r => r.channel === ch);
    if (type === 'mc') chanRows.splice(0, 0); // keep
    const agg = aggregate(chanRows.filter(r => isProd ? true : (r.mc && !SKIP_MCS.has(r.mc.toLowerCase()))), r => isProd ? r.producer : r.mc);
    const list = Object.entries(agg).map(([name, a]) => ({
      name, hours: a.hours, gmv: a.gmv,
      gmvHr: a.hours > 0 ? a.gmv/a.hours : 0,
    })).sort((a, b) => b.gmv - a.gmv).slice(0, 10);
    const totalHrs = Object.values(agg).reduce((s, a) => s + a.hours, 0);
    const totalGmv = Object.values(agg).reduce((s, a) => s + a.gmv, 0);
    const chanAvg = totalHrs > 0 ? totalGmv / totalHrs : 0;
    if (list.length === 0) return '';
    const rowsHtml = list.map((r, i) => {
      const ratio = chanAvg > 0 ? r.gmvHr / chanAvg : 0;
      const badge = ratio >= 1.5 ? 'top' : ratio >= 1.0 ? 'above' : ratio >= 0.5 ? 'below' : 'risk';
      const badgeLabel = ratio >= 1.5 ? 'Top' : ratio >= 1.0 ? 'Above' : ratio >= 0.5 ? 'Below' : 'Risk';
      return `<tr>
        <td class="${rankClass(i)}">${i+1}</td>
        <td class="name"><span class="rank-link" data-profile-${type}="${r.name}">${r.name}</span></td>
        <td class="num mono">${fmtHours(r.hours)}</td>
        <td class="num mono">฿${fmtMoney(r.gmv)}</td>
        <td class="num mono">฿${fmtMoney(r.gmvHr)}</td>
        <td><span class="badge badge-${badge}">${badgeLabel}</span></td>
      </tr>`;
    }).join('');
    return `
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title"><span style="color:${colors[ch]}">●</span> ${ch} Top 10</div>
          <div class="panel-sub">channel avg: ฿${fmtMoney(chanAvg)}/hr</div>
        </div>
        <div class="table-scroll" style="max-height:480px">
          <table class="data-table">
            <thead><tr><th>#</th><th>${isProd?'Producer':'MC'}</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th><th>vs Ch Avg</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>`;
  }).filter(Boolean).join('');
  if (!blocks) return '';
  return `
    <div class="subsection">📡 Platform Split — fair ranking per channel (avoids Shopee vs TikTok scale bias)</div>
    <div class="chart-row">${blocks}</div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: PRODUCER
// ═══════════════════════════════════════════════════════════════════
function renderProducer(rows) {
  const month = document.getElementById('filterMonth').value;
  const agg = aggregate(rows, r => r.producer);
  const prev = prevMonth();
  const prevAgg = prev ? aggregate(allData.sessions.filter(s => s.ym === prev), r => r.producer) : {};

  const totalGmv = Object.values(agg).reduce((s, a) => s + a.gmv, 0);
  const totalHrs = Object.values(agg).reduce((s, a) => s + a.hours, 0);
  const teamAvg = totalHrs > 0 ? totalGmv / totalHrs : 0;

  const data = Object.entries(agg).map(([name, a]) => {
    const gmvHr = a.hours > 0 ? a.gmv / a.hours : 0;
    return {
      name, sessions: a.sessions, hours: a.hours, gmv: a.gmv, orders: a.orders,
      gmvHr,
      ctr: a.ctrN > 0 ? a.ctrSum / a.ctrN : 0,
      coR: a.coRN > 0 ? a.coRSum / a.coRN : 0,
      vsAvg: teamAvg > 0 ? gmvHr / teamAvg - 1 : 0,
      momChange: (prevAgg[name] && prevAgg[name].gmv > 0) ? (a.gmv - prevAgg[name].gmv) / prevAgg[name].gmv : null,
      ratio: teamAvg > 0 ? gmvHr / teamAvg : 0,
    };
  });

  const sk = sortState.producer.key, sd = sortState.producer.dir;
  data.sort((a, b) => sd === 'asc' ? a[sk] - b[sk] : b[sk] - a[sk]);
  const top = [...data].sort((a, b) => b.gmv - a.gmv)[0];

  document.getElementById('content').innerHTML = `
    <div class="view">
      <div class="section-header">
        <span class="section-number">02 / PRODUCER</span>
        <h2 class="section-title">producer <span class="accent">leaderboard</span></h2>
        <span class="section-subtitle">click row → expand · click brand → modal</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Active Producers</div><div class="kpi-value">${data.length}</div><div class="kpi-sub">${fmtMonthLabel(month)}</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Total GMV</div><div class="kpi-value mono">฿${fmtMoney(totalGmv)}</div><div class="kpi-sub">฿${fmtMoney(teamAvg)}/hr team avg</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Total Hours</div><div class="kpi-value mono">${fmtHours(totalHrs)}</div><div class="kpi-sub">across team</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Top Producer</div><div class="kpi-value">${top ? top.name : '—'}</div><div class="kpi-sub">${top ? '฿' + fmtMoney(top.gmv) : ''}</div></div>
      </div>

      <div class="chart-row">
        <div class="panel">
          <div class="panel-head"><div class="panel-title">Monthly GMV Trend</div><div class="panel-sub">team total</div></div>
          <div class="panel-body"><div class="chart-container"><canvas id="chartTrend"></canvas></div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div class="panel-title">Top 10 by GMV</div><div class="panel-sub">${fmtMonthLabel(month)}</div></div>
          <div class="panel-body"><div class="chart-container"><canvas id="chartTop"></canvas></div></div>
        </div>
      </div>

      ${buildPlatformSplit(rows, 'producer')}

      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Producer Leaderboard</div>
          <div class="panel-sub">${data.length} rows · click column to sort · hover Status to see criteria</div>
        </div>
        <div class="table-scroll">
          <table class="data-table" id="prodTable">
            <thead><tr>
              <th data-k="name">#</th><th data-k="name">Producer</th>
              <th class="num" data-k="hours">Hrs</th>
              <th class="num" data-k="gmv">GMV</th>
              <th class="num" data-k="gmvHr">GMV/Hr</th>
              <th class="num" data-k="ctr">CTR</th>
              <th class="num" data-k="coR">Co_R</th>
              <th class="num" data-k="orders">Orders</th>
              <th class="num" data-k="vsAvg">vs Avg</th>
              <th class="num" data-k="momChange">MoM</th>
              <th class="tooltip-trigger">Status<span class="tip" style="white-space:pre-line">${STATUS_TIP}</span></th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tbody = document.querySelector('#prodTable tbody');
  function buildProdRow(r, i) {
    const tr = document.createElement('tr');
    tr.className = 'expand-row';
    const tier = computeTier(r.name, 'producer');
    tr.innerHTML = `
      <td class="${rankClass(i)}"><span class="expand-arrow">▶</span>${i + 1}</td>
      <td class="name"><span class="tier-mark" title="${tier.label}">${tier.icon}</span><span class="rank-link" data-profile="${r.name}">${r.name}</span></td>
      <td class="num mono">${fmtHours(r.hours)}</td>
      <td class="num mono">฿${fmtMoney(r.gmv)}</td>
      <td class="num mono">฿${fmtMoney(r.gmvHr)}</td>
      <td class="num mono">${fmtPct(r.ctr)}</td>
      <td class="num mono">${fmtPct(r.coR)}</td>
      <td class="num mono">${fmtNum(r.orders)}</td>
      <td class="num mono">${(r.vsAvg >= 0 ? '+' : '') + Math.round(r.vsAvg * 100)}%</td>
      <td class="num">${momCell(r.momChange)}</td>
      <td>${statusBadge(r.ratio)}</td>
    `;
    tr.addEventListener('click', (e) => {
      if (e.target.classList.contains('clickable')) return;
      if (e.target.classList.contains('rank-link')) {
        e.stopPropagation();
        jumpToProfile('producer', e.target.dataset.profile);
        return;
      }
      toggleDetail(tr, r.name, 'producer');
    });
    return tr;
  }
  data.forEach((r, i) => tbody.appendChild(buildProdRow(r, i)));
  attachInPlaceSort('prodTable', 'producer', data, buildProdRow);

  // Platform-split + champion rank-link clicks
  document.querySelectorAll('#content [data-profile-producer]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); jumpToProfile('producer', el.dataset.profileProducer); });
  });
  document.querySelectorAll('#content [data-profile-mc]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); jumpToProfile('mc', el.dataset.profileMc); });
  });

  drawTrendChart('chartTrend');
  drawTopChart('chartTop', data, 'gmv');
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: MC
// ═══════════════════════════════════════════════════════════════════
function renderMC(rows) {
  const month = document.getElementById('filterMonth').value;
  const mcRows = rows.filter(r => r.mc && !SKIP_MCS.has(r.mc.toLowerCase()));
  const agg = aggregate(mcRows, r => r.mc);
  const prev = prevMonth();
  const prevAgg = prev ? aggregate(allData.sessions.filter(s => s.ym === prev && s.mc && !SKIP_MCS.has(s.mc.toLowerCase())), r => r.mc) : {};

  const totalGmv = Object.values(agg).reduce((s, a) => s + a.gmv, 0);
  const totalHrs = Object.values(agg).reduce((s, a) => s + a.hours, 0);
  const teamAvg = totalHrs > 0 ? totalGmv / totalHrs : 0;

  const data = Object.entries(agg).map(([name, a]) => {
    const gmvHr = a.hours > 0 ? a.gmv / a.hours : 0;
    return {
      name, sessions: a.sessions, hours: a.hours, gmv: a.gmv, orders: a.orders,
      gmvHr,
      ctr: a.ctrN > 0 ? a.ctrSum / a.ctrN : 0,
      coR: a.coRN > 0 ? a.coRSum / a.coRN : 0,
      vsAvg: teamAvg > 0 ? gmvHr / teamAvg - 1 : 0,
      momChange: (prevAgg[name] && prevAgg[name].gmv > 0) ? (a.gmv - prevAgg[name].gmv) / prevAgg[name].gmv : null,
      ratio: teamAvg > 0 ? gmvHr / teamAvg : 0,
    };
  });

  const sk = sortState.mc.key, sd = sortState.mc.dir;
  data.sort((a, b) => sd === 'asc' ? a[sk] - b[sk] : b[sk] - a[sk]);
  const top = [...data].sort((a, b) => b.gmv - a.gmv)[0];

  document.getElementById('content').innerHTML = `
    <div class="view">
      <div class="section-header">
        <span class="section-number">03 / MC</span>
        <h2 class="section-title">live <span class="accent">talent</span></h2>
        <span class="section-subtitle">${data.length} MCs · click row → expand · click brand → modal</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Active MCs</div><div class="kpi-value">${data.length}</div><div class="kpi-sub">${fmtMonthLabel(month)}</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">MC-driven GMV</div><div class="kpi-value mono">฿${fmtMoney(totalGmv)}</div><div class="kpi-sub">฿${fmtMoney(teamAvg)}/hr</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Live Hours</div><div class="kpi-value mono">${fmtHours(totalHrs)}</div><div class="kpi-sub">on screen</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Top MC</div><div class="kpi-value">${top ? top.name : '—'}</div><div class="kpi-sub">${top ? '฿' + fmtMoney(top.gmv) : ''}</div></div>
      </div>

      <div class="chart-row">
        <div class="panel">
          <div class="panel-head"><div class="panel-title">MC-driven GMV Trend</div><div class="panel-sub">monthly</div></div>
          <div class="panel-body"><div class="chart-container"><canvas id="chartMCTrend"></canvas></div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div class="panel-title">Top 10 MCs</div><div class="panel-sub">by GMV</div></div>
          <div class="panel-body"><div class="chart-container"><canvas id="chartMCTop"></canvas></div></div>
        </div>
      </div>

      ${buildPlatformSplit(rows, 'mc')}

      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">MC Leaderboard</div>
          <div class="panel-sub">${data.length} rows · click column to sort · hover Status</div>
        </div>
        <div class="table-scroll">
          <table class="data-table" id="mcTable">
            <thead><tr>
              <th data-k="name">#</th><th data-k="name">MC</th>
              <th class="num" data-k="hours">Hrs</th>
              <th class="num" data-k="gmv">GMV</th>
              <th class="num" data-k="gmvHr">GMV/Hr</th>
              <th class="num" data-k="ctr">CTR</th>
              <th class="num" data-k="coR">Co_R</th>
              <th class="num" data-k="orders">Orders</th>
              <th class="num" data-k="vsAvg">vs Avg</th>
              <th class="num" data-k="momChange">MoM</th>
              <th class="tooltip-trigger">Status<span class="tip" style="white-space:pre-line">${STATUS_TIP}</span></th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tbody = document.querySelector('#mcTable tbody');
  function buildMCRow(r, i) {
    const tr = document.createElement('tr');
    tr.className = 'expand-row';
    const tier = computeTier(r.name, 'mc');
    tr.innerHTML = `
      <td class="${rankClass(i)}"><span class="expand-arrow">▶</span>${i + 1}</td>
      <td class="name"><span class="tier-mark" title="${tier.label}">${tier.icon}</span><span class="rank-link" data-profile="${r.name}">${r.name}</span></td>
      <td class="num mono">${fmtHours(r.hours)}</td>
      <td class="num mono">฿${fmtMoney(r.gmv)}</td>
      <td class="num mono">฿${fmtMoney(r.gmvHr)}</td>
      <td class="num mono">${fmtPct(r.ctr)}</td>
      <td class="num mono">${fmtPct(r.coR)}</td>
      <td class="num mono">${fmtNum(r.orders)}</td>
      <td class="num mono">${(r.vsAvg >= 0 ? '+' : '') + Math.round(r.vsAvg * 100)}%</td>
      <td class="num">${momCell(r.momChange)}</td>
      <td>${statusBadge(r.ratio)}</td>
    `;
    tr.addEventListener('click', (e) => {
      if (e.target.classList.contains('clickable')) return;
      if (e.target.classList.contains('rank-link')) {
        e.stopPropagation();
        jumpToProfile('mc', e.target.dataset.profile);
        return;
      }
      toggleDetail(tr, r.name, 'mc');
    });
    return tr;
  }
  data.forEach((r, i) => tbody.appendChild(buildMCRow(r, i)));
  attachInPlaceSort('mcTable', 'mc', data, buildMCRow);

  // Platform-split rank-link clicks
  document.querySelectorAll('#content [data-profile-producer]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); jumpToProfile('producer', el.dataset.profileProducer); });
  });
  document.querySelectorAll('#content [data-profile-mc]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); jumpToProfile('mc', el.dataset.profileMc); });
  });

  drawTrendChart('chartMCTrend', allData.sessions.filter(s => s.mc && !SKIP_MCS.has(s.mc.toLowerCase())));
  drawTopChart('chartMCTop', data, 'gmv', '#3BABDC');
}

// ═══════════════════════════════════════════════════════════════════
//  Expand row
// ═══════════════════════════════════════════════════════════════════
function toggleDetail(tr, name, type) {
  const next = tr.nextElementSibling;
  if (next && next.classList.contains('detail-row')) {
    next.remove(); tr.classList.remove('expanded'); return;
  }
  document.querySelectorAll('tr.detail-row').forEach(d => d.remove());
  document.querySelectorAll('tr.expand-row.expanded').forEach(t => t.classList.remove('expanded'));
  tr.classList.add('expanded');
  const detail = document.createElement('tr');
  detail.className = 'detail-row';
  detail.innerHTML = `<td colspan="11">${buildEntityDetail(name, type)}</td>`;
  tr.parentNode.insertBefore(detail, tr.nextSibling);

  // Wire brand clicks → modal
  detail.querySelectorAll('.clickable[data-brand]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openBrandModal(el.dataset.brand, { type, name });
    });
  });
}

function buildEntityDetail(name, type) {
  const brand = document.getElementById('filterBrand').value;
  const channel = document.getElementById('filterChannel').value;
  const data = allData.sessions.filter(s =>
    (type === 'producer' ? s.producer === name : s.mc === name) &&
    (!brand || s.brand === brand) && (!channel || s.channel === channel)
  );

  const byMonth = aggregate(data, r => r.ym);
  const byBrand = aggregate(data, r => r.brand);
  const byChannel = aggregate(data, r => r.channel);
  const byPartner = aggregate(data, r => type === 'producer' ? r.mc : r.producer);

  const monthRows = Object.keys(byMonth).sort().map(m => {
    const v = byMonth[m]; const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr><td class="name">${fmtMonthLabel(m)}</td><td class="num mono">${fmtHours(v.hours)}</td><td class="num mono">฿${fmtMoney(v.gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
  }).join('');

  const brandRows = Object.entries(byBrand).sort((a,b) => b[1].gmv - a[1].gmv).slice(0, 10).map(([b, v]) => {
    const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr>
      <td class="name"><span class="clickable" data-brand="${b}">${b}</span></td>
      <td class="num mono">${fmtHours(v.hours)}</td>
      <td class="num mono">฿${fmtMoney(v.gmv)}</td>
      <td class="num mono">฿${fmtMoney(gh)}</td>
    </tr>`;
  }).join('');

  const partnerLabel = type === 'producer' ? 'Top MC partners' : 'Top Producer partners';
  const partnerRows = Object.entries(byPartner).filter(([k]) => !SKIP_MCS.has(String(k).toLowerCase())).sort((a,b) => b[1].gmv - a[1].gmv).slice(0, 8).map(([n, v]) => {
    const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr><td class="name">${n}</td><td class="num mono">${fmtHours(v.hours)}</td><td class="num mono">฿${fmtMoney(v.gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
  }).join('');

  const chanRows = Object.entries(byChannel).filter(([c]) => c).sort((a,b) => b[1].gmv - a[1].gmv).map(([c, v]) => {
    const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr><td class="name">${c}</td><td class="num mono">${fmtHours(v.hours)}</td><td class="num mono">฿${fmtMoney(v.gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
  }).join('');

  return `
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Monthly Trajectory</h4>
        <table class="data-table">
          <thead><tr><th>Month</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
          <tbody>${monthRows}</tbody>
        </table>
      </div>
      <div class="detail-block">
        <h4>Top Brands — click brand for detail</h4>
        <table class="data-table">
          <thead><tr><th>Brand</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
          <tbody>${brandRows}</tbody>
        </table>
      </div>
      <div class="detail-block">
        <h4>${partnerLabel}</h4>
        <table class="data-table">
          <thead><tr><th>Name</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
          <tbody>${partnerRows || '<tr><td colspan="4" style="color:var(--text-3)">No data</td></tr>'}</tbody>
        </table>
      </div>
      <div class="detail-block">
        <h4>Channel Performance</h4>
        <table class="data-table">
          <thead><tr><th>Channel</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
          <tbody>${chanRows || '<tr><td colspan="4" style="color:var(--text-3)">No data</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: PAIR — click row → modal session detail
// ═══════════════════════════════════════════════════════════════════
function renderPair(rows) {
  const valid = rows.filter(r => r.mc && !SKIP_MCS.has(r.mc.toLowerCase()));
  const prodS = {}, mcS = {}, pairS = {};
  valid.forEach(r => {
    if (!prodS[r.producer]) prodS[r.producer] = { gmv: 0, hrs: 0 };
    prodS[r.producer].gmv += r.gmv; prodS[r.producer].hrs += r.dur;
    if (!mcS[r.mc]) mcS[r.mc] = { gmv: 0, hrs: 0 };
    mcS[r.mc].gmv += r.gmv; mcS[r.mc].hrs += r.dur;
    const k = r.producer + '|' + r.mc;
    if (!pairS[k]) pairS[k] = { producer: r.producer, mc: r.mc, gmv: 0, hrs: 0, sess: 0, brands: {} };
    pairS[k].gmv += r.gmv; pairS[k].hrs += r.dur; pairS[k].sess++;
    if (r.brand) pairS[k].brands[r.brand] = (pairS[k].brands[r.brand] || 0) + r.gmv;
  });

  const MIN = 3;
  const pairs = Object.values(pairS).filter(p => p.sess >= MIN).map(p => {
    const ph = p.hrs > 0 ? p.gmv / p.hrs : 0;
    const pa = prodS[p.producer].hrs > 0 ? prodS[p.producer].gmv / prodS[p.producer].hrs : 0;
    const ma = mcS[p.mc].hrs > 0 ? mcS[p.mc].gmv / mcS[p.mc].hrs : 0;
    const exp = (pa + ma) / 2;
    const chem = exp > 0 ? ph / exp - 1 : 0;
    return { ...p, ph, pa, ma, chem, topBrand: topKey(p.brands) };
  }).sort((a, b) => b.chem - a.chem);

  const top = pairs.slice(0, 20);
  const bot = pairs.slice(-15).reverse();

  function pairRow(p, i, isWorst) {
    return `<tr class="pair-row" data-producer="${p.producer}" data-mc="${p.mc}" style="cursor:pointer">
      <td class="${isWorst ? 'rank' : rankClass(i)}">${i+1}</td>
      <td class="name">${p.producer}</td><td class="name">${p.mc}</td>
      <td class="num mono">${fmtHours(p.hrs)}</td>
      <td class="num mono">฿${fmtMoney(p.ph)}</td>
      <td class="num mono">฿${fmtMoney(p.pa)}</td>
      <td class="num mono">฿${fmtMoney(p.ma)}</td>
      <td class="num mono"><span style="background:${chemBg(p.chem)};color:white;font-weight:700;padding:3px 9px;border-radius:6px">${p.chem >= 0 ? '+' : ''}${Math.round(p.chem*100)}%</span></td>
      <td class="name" style="color:var(--text-3)">${p.topBrand}</td>
    </tr>`;
  }

  document.getElementById('content').innerHTML = `
    <div class="view">
      <div class="section-header">
        <span class="section-number">04 / CHEMISTRY</span>
        <h2 class="section-title">producer × <span class="accent">mc</span></h2>
        <span class="section-subtitle">min ${MIN} sessions · click any pair for detail</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Unique Pairs</div><div class="kpi-value">${Object.keys(pairS).length}</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Qualifying</div><div class="kpi-value">${pairs.length}</div><div class="kpi-sub">≥${MIN} sessions</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Best Chemistry</div><div class="kpi-value mono" style="color:var(--positive)">${top[0] ? '+' + Math.round(top[0].chem*100) + '%' : '—'}</div><div class="kpi-sub">${top[0] ? top[0].producer + ' + ' + top[0].mc : ''}</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Worst Chemistry</div><div class="kpi-value mono" style="color:var(--negative)">${bot[0] ? Math.round(bot[0].chem*100) + '%' : '—'}</div><div class="kpi-sub">${bot[0] ? bot[0].producer + ' + ' + bot[0].mc : ''}</div></div>
      </div>

      <div class="panel">
        <div class="panel-head"><div class="panel-title">🚀 Synergy Pairs — Top 20</div><div class="panel-sub">click row → session detail</div></div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>#</th><th>Producer</th><th>MC</th><th class="num">Hrs</th><th class="num">Pair/Hr</th><th class="num">P avg</th><th class="num">MC avg</th><th class="num">Chemistry</th><th>Top Brand</th></tr></thead>
            <tbody id="topPairsBody">${top.map((p, i) => pairRow(p, i, false)).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="panel" style="margin-top:18px">
        <div class="panel-head"><div class="panel-title">⚠️ Anti-Synergy — Bottom 15</div><div class="panel-sub">click row → session detail</div></div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>#</th><th>Producer</th><th>MC</th><th class="num">Hrs</th><th class="num">Pair/Hr</th><th class="num">P avg</th><th class="num">MC avg</th><th class="num">Chemistry</th><th>Top Brand</th></tr></thead>
            <tbody id="botPairsBody">${bot.map((p, i) => pairRow(p, i, true)).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.pair-row').forEach(tr => {
    tr.addEventListener('click', () => openPairModal(tr.dataset.producer, tr.dataset.mc));
  });
}

function chemBg(c) {
  if (c >= 0.5) return '#2D8F4A';
  if (c >= 0.2) return '#5BB832';
  if (c >= 0) return '#A6CE39';
  if (c >= -0.2) return '#F0A030';
  if (c >= -0.5) return '#EE8030';
  return '#D94040';
}

function openPairModal(producer, mc) {
  const data = allData.sessions.filter(s => s.producer === producer && s.mc === mc);
  const totGmv = data.reduce((s, r) => s + r.gmv, 0);
  const totHrs = data.reduce((s, r) => s + r.dur, 0);
  const gmvHr = totHrs > 0 ? totGmv / totHrs : 0;

  const byMonth = aggregate(data, r => r.ym);
  const byBrand = aggregate(data, r => r.brand);

  const monthRows = Object.keys(byMonth).sort().map(m => {
    const v = byMonth[m]; const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr><td class="name">${fmtMonthLabel(m)}</td><td class="num mono">${v.sessions}</td><td class="num mono">${fmtHours(v.hours)}</td><td class="num mono">฿${fmtMoney(v.gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
  }).join('');
  const brandRows = Object.entries(byBrand).sort((a,b) => b[1].gmv - a[1].gmv).map(([b, v]) => {
    const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr><td class="name">${b}</td><td class="num mono">${v.sessions}</td><td class="num mono">${fmtHours(v.hours)}</td><td class="num mono">฿${fmtMoney(v.gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
  }).join('');

  openModal(`${producer} + ${mc}`, `${data.length} sessions together`, `
    <div class="modal-kpi">
      <div class="modal-kpi-cell"><div class="label">Sessions</div><div class="value">${data.length}</div></div>
      <div class="modal-kpi-cell"><div class="label">Total Hrs</div><div class="value">${fmtHours(totHrs)}</div></div>
      <div class="modal-kpi-cell"><div class="label">Total GMV</div><div class="value">฿${fmtMoney(totGmv)}</div></div>
      <div class="modal-kpi-cell"><div class="label">Pair GMV/Hr</div><div class="value">฿${fmtMoney(gmvHr)}</div></div>
    </div>
    <h4>Monthly Together</h4>
    <table class="data-table">
      <thead><tr><th>Month</th><th class="num">Sess</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
      <tbody>${monthRows}</tbody>
    </table>
    <h4>Brands Done Together</h4>
    <table class="data-table">
      <thead><tr><th>Brand</th><th class="num">Sess</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
      <tbody>${brandRows}</tbody>
    </table>
  `);
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: PROFILE — deep dive per Producer or MC
// ═══════════════════════════════════════════════════════════════════
function jumpToProfile(type, name) {
  profileState = { type, name };
  switchView('profile');
}

function renderProfile() {
  // Determine name list based on type
  const month = document.getElementById('filterMonth').value;
  const brand = document.getElementById('filterBrand').value;
  const channel = document.getElementById('filterChannel').value;
  const isProducer = profileState.type === 'producer';
  const nameList = isProducer
    ? allData.meta.producers
    : allData.meta.mcs;

  // Default name = first in list (sorted by GMV) if not set
  if (!profileState.name || nameList.indexOf(profileState.name) === -1) {
    // sort by all-time GMV
    const agg = aggregate(allData.sessions, r => isProducer ? r.producer : r.mc);
    const sorted = nameList.filter(n => agg[n]).sort((a, b) => (agg[b].gmv || 0) - (agg[a].gmv || 0));
    profileState.name = sorted[0] || nameList[0] || null;
  }

  const name = profileState.name;
  if (!name) {
    document.getElementById('content').innerHTML = `
      <div class="view">
        <div class="section-header">
          <span class="section-number">08 / PROFILE</span>
          <h2 class="section-title">person <span class="accent">deep dive</span></h2>
        </div>
        <div class="loading" style="color:var(--text-3)">No ${profileState.type}s available</div>
      </div>`;
    return;
  }

  // Filter all sessions for this person (respect brand/channel filters; ignore month for trend, use it for current period KPI)
  const allSessions = allData.sessions.filter(s =>
    (isProducer ? s.producer === name : s.mc === name) &&
    (!brand || s.brand === brand) &&
    (!channel || s.channel === channel)
  );
  const monthSessions = month ? allSessions.filter(s => s.ym === month) : allSessions;

  // Aggregates
  const sumAll = sumSessions(allSessions);
  const sumMonth = sumSessions(monthSessions);
  const teamSumMonth = sumSessions(allData.sessions.filter(s =>
    (!month || s.ym === month) &&
    (!brand || s.brand === brand) &&
    (!channel || s.channel === channel) &&
    (isProducer ? true : (s.mc && !SKIP_MCS.has(s.mc.toLowerCase())))
  ));

  // Rank in team (by GMV this month)
  const teamAgg = aggregate(
    allData.sessions.filter(s =>
      (!month || s.ym === month) &&
      (!brand || s.brand === brand) &&
      (!channel || s.channel === channel) &&
      (isProducer ? true : (s.mc && !SKIP_MCS.has(s.mc.toLowerCase())))
    ),
    r => isProducer ? r.producer : r.mc
  );
  const ranking = Object.entries(teamAgg).sort((a, b) => b[1].gmv - a[1].gmv);
  const rank = ranking.findIndex(([n]) => n === name) + 1;
  const totalInTeam = ranking.length;

  // MoM
  const prev = prevMonth();
  let momChange = null;
  if (prev) {
    const prevSum = sumSessions(allSessions.filter(s => s.ym === prev));
    if (prevSum.gmv > 0) momChange = (sumMonth.gmv - prevSum.gmv) / prevSum.gmv;
  }

  // Activity span
  const personMonths = [...new Set(allSessions.map(s => s.ym))].sort();
  const firstM = personMonths[0];
  const lastM = personMonths[personMonths.length - 1];

  // KPI values
  const gmvHr = sumMonth.hours > 0 ? sumMonth.gmv / sumMonth.hours : 0;
  const teamGmvHr = teamSumMonth.hours > 0 ? teamSumMonth.gmv / teamSumMonth.hours : 0;
  const vsTeam = teamGmvHr > 0 ? gmvHr / teamGmvHr - 1 : 0;

  // Funnel metrics
  const engRate = sumMonth.viewers > 0 ? sumMonth.engaged / sumMonth.viewers : 0;
  const cmt1K = sumMonth.viewers > 0 ? sumMonth.comments / sumMonth.viewers * 1000 : 0;
  const orderCR = sumMonth.viewers > 0 ? sumMonth.orders / sumMonth.viewers : 0;
  const aov = sumMonth.orders > 0 ? sumMonth.gmv / sumMonth.orders : 0;
  const vph = sumMonth.hours > 0 ? sumMonth.viewers / sumMonth.hours : 0;

  const teamEng = teamSumMonth.viewers > 0 ? teamSumMonth.engaged / teamSumMonth.viewers : 0;
  const teamCmt = teamSumMonth.viewers > 0 ? teamSumMonth.comments / teamSumMonth.viewers * 1000 : 0;
  const teamCR = teamSumMonth.viewers > 0 ? teamSumMonth.orders / teamSumMonth.viewers : 0;
  const teamAOV = teamSumMonth.orders > 0 ? teamSumMonth.gmv / teamSumMonth.orders : 0;
  const teamVph = teamSumMonth.hours > 0 ? teamSumMonth.viewers / teamSumMonth.hours : 0;

  // Strengths & weaknesses based on month metrics
  const metricCompare = [
    { name: 'Viewer pull (V/hr)', val: vph, team: teamVph },
    { name: 'Engagement rate', val: engRate, team: teamEng },
    { name: 'Comments per 1K', val: cmt1K, team: teamCmt },
    { name: 'Order conversion', val: orderCR, team: teamCR },
    { name: 'AOV (upsell)', val: aov, team: teamAOV },
    { name: 'GMV per hour', val: gmvHr, team: teamGmvHr },
  ].filter(m => m.team > 0).map(m => ({ ...m, gap: m.val / m.team - 1 }));
  const sortedGaps = [...metricCompare].sort((a, b) => b.gap - a.gap);
  const topStrength = sortedGaps[0];
  const topWeakness = sortedGaps[sortedGaps.length - 1];
  const coachFocus = topWeakness && topWeakness.gap < 0 ? topWeakness : null;

  // Gamification — tier, streaks, badges
  const profileTier = computeTier(name, profileState.type);
  const streaks = computeStreaks(name, profileState.type);
  const badges = computeBadges(name, profileState.type);
  const badgesEarned = badges.filter(b => b.earned).length;
  const personStats = computePersonStats(name, profileState.type);

  // Brand mix
  const brandAgg = aggregate(allSessions, r => r.brand);
  const brandRows = Object.entries(brandAgg).sort((a, b) => b[1].gmv - a[1].gmv).slice(0, 10);

  // Partners
  const partnerAgg = aggregate(allSessions, r => isProducer ? r.mc : r.producer);
  const partnerRows = Object.entries(partnerAgg)
    .filter(([k]) => !SKIP_MCS.has(String(k).toLowerCase()))
    .sort((a, b) => b[1].gmv - a[1].gmv).slice(0, 8);

  // Build HTML
  const typePill = `
    <div class="type-pill">
      <button class="${isProducer ? 'active' : ''}" data-type="producer">Producer</button>
      <button class="${!isProducer ? 'active' : ''}" data-type="mc">MC</button>
    </div>`;

  const personDropdown = `
    <div class="person-select">
      <select id="profilePerson">
        ${nameList.map(n => `<option value="${n}" ${n === name ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
    </div>`;

  document.getElementById('content').innerHTML = `
    <div class="view">
      <div class="section-header">
        <span class="section-number">08 / PROFILE</span>
        <h2 class="section-title">person <span class="accent">deep dive</span></h2>
        <span class="section-subtitle">${fmtMonthLabel(month)}</span>
      </div>

      <div class="profile-selector">
        ${typePill}
        ${personDropdown}
        <span class="empty-hint">Active ${personMonths.length} months · ${fmtMonthLabel(firstM)} → ${fmtMonthLabel(lastM)}</span>
      </div>

      <div class="profile-hero">
        <div class="role">${isProducer ? 'Producer' : 'MC'} Profile</div>
        <div class="name">${name}<span class="tier-badge tier-${profileTier.tier}">${profileTier.icon} ${profileTier.label}</span></div>
        <div class="summary">
          <strong>${allSessions.length}</strong> total sessions ·
          <strong>${fmtHours(sumAll.hours)}</strong> live hours ·
          <strong>${Object.keys(brandAgg).length}</strong> brands worked ·
          <strong>${Object.keys(partnerAgg).filter(k => !SKIP_MCS.has(String(k).toLowerCase())).length}</strong> ${isProducer ? 'MCs' : 'producers'} partnered
        </div>
      </div>

      <div class="streaks-row">
        <div class="streak-card">
          <div class="icon">🔥</div>
          <div class="info">
            <div class="stat">${streaks.currentAboveTeam}</div>
            <div class="label">months in a row above team avg</div>
          </div>
        </div>
        <div class="streak-card">
          <div class="icon">🏆</div>
          <div class="info">
            <div class="stat">฿${fmtMoney(streaks.bestMonthGmv)}</div>
            <div class="label">personal best · ${streaks.bestMonth ? fmtMonthLabel(streaks.bestMonth) : '—'}</div>
          </div>
        </div>
        <div class="streak-card">
          <div class="icon">${badgesEarned >= 5 ? '🌟' : badgesEarned >= 3 ? '✨' : '⭐'}</div>
          <div class="info">
            <div class="stat">${badgesEarned} / ${BADGE_DEFS.length}</div>
            <div class="label">achievements unlocked</div>
          </div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-stripe"></div>
          <div class="kpi-label">GMV · ${fmtMonthLabel(month)}</div>
          <div class="kpi-value mono">฿${fmtMoney(sumMonth.gmv)}</div>
          <div class="kpi-sub">${fmtHours(sumMonth.hours)} hrs · ${monthSessions.length} sessions</div>
        </div>
        <div class="kpi"><div class="kpi-stripe"></div>
          <div class="kpi-label">GMV / Hour</div>
          <div class="kpi-value mono">฿${fmtMoney(gmvHr)}</div>
          <div class="kpi-sub">${(vsTeam >= 0 ? '+' : '') + Math.round(vsTeam*100)}% vs team avg</div>
        </div>
        <div class="kpi"><div class="kpi-stripe"></div>
          <div class="kpi-label">Rank</div>
          <div class="kpi-value">#${rank || '—'}<span style="font-size:14px;color:var(--text-3);font-weight:500"> / ${totalInTeam}</span></div>
          <div class="kpi-sub">${rank ? 'Top ' + Math.round(rank/totalInTeam*100) + '%' : 'no data'}</div>
        </div>
        <div class="kpi"><div class="kpi-stripe"></div>
          <div class="kpi-label">MoM Change</div>
          <div class="kpi-value mono" style="color:${momChange === null ? 'var(--text-3)' : momChange > 0 ? 'var(--positive)' : 'var(--negative)'}">
            ${momChange === null ? '—' : (momChange >= 0 ? '+' : '') + Math.round(momChange*100) + '%'}
          </div>
          <div class="kpi-sub">vs ${prev ? fmtMonthLabel(prev) : 'previous'}</div>
        </div>
      </div>

      <div class="chart-row">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">Performance Trend</div>
            <div class="panel-sub">${name} vs team avg (GMV/Hr)</div>
          </div>
          <div class="panel-body"><div class="chart-container"><canvas id="profileTrend"></canvas></div></div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">Brand Mix</div>
            <div class="panel-sub">all-time</div>
          </div>
          <div class="panel-body"><div class="chart-container"><canvas id="profileBrandDonut"></canvas></div></div>
        </div>
      </div>

      <div class="subsection">Funnel — ${name} vs team average (${fmtMonthLabel(month)})</div>
      <div class="funnel-compare">
        ${funnelCell('Viewers / Hr', fmtNum(vph), vph, teamVph)}
        ${funnelCell('Engagement', fmtPct(engRate), engRate, teamEng)}
        ${funnelCell('Cmt / 1K', cmt1K.toFixed(1), cmt1K, teamCmt)}
        ${funnelCell('Order CR', fmtPct(orderCR), orderCR, teamCR)}
        ${funnelCell('AOV', '฿' + fmtNum(aov), aov, teamAOV)}
      </div>

      <div class="subsection">Strengths & Improvement areas</div>
      <div class="sw-grid">
        <div class="sw-card strength">
          <div class="sw-label">✓ Strongest</div>
          <div class="sw-headline">${topStrength ? topStrength.name : '—'}</div>
          <div class="sw-body">${topStrength ? Math.round(topStrength.gap*100) + '% vs team average' : 'Not enough data'}</div>
        </div>
        <div class="sw-card weakness">
          <div class="sw-label">⚠ Weakest</div>
          <div class="sw-headline">${topWeakness ? topWeakness.name : '—'}</div>
          <div class="sw-body">${topWeakness ? Math.round(topWeakness.gap*100) + '% vs team average' : 'Not enough data'}</div>
        </div>
        <div class="sw-card coach">
          <div class="sw-label">🎯 1:1 Coach Focus</div>
          <div class="sw-headline">${coachFocus ? coachFocus.name : 'No critical gap'}</div>
          <div class="sw-body">${coachFocus ? 'Bring this up in next 1:1 — gap of ' + Math.round(coachFocus.gap*100) + '%' : 'On par or above team in all areas'}</div>
        </div>
      </div>

      <div class="chart-row">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">Top Brands</div>
            <div class="panel-sub">click brand → detail</div>
          </div>
          <div class="table-scroll" style="max-height:380px">
            <table class="data-table">
              <thead><tr><th>Brand</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
              <tbody>
                ${brandRows.map(([b, v]) => {
                  const gh = v.hours > 0 ? v.gmv / v.hours : 0;
                  return `<tr>
                    <td class="name"><span class="clickable" data-brand="${b}">${b}</span></td>
                    <td class="num mono">${fmtHours(v.hours)}</td>
                    <td class="num mono">฿${fmtMoney(v.gmv)}</td>
                    <td class="num mono">฿${fmtMoney(gh)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">${isProducer ? 'Top MC Partners' : 'Top Producer Partners'}</div>
            <div class="panel-sub">click → switch profile</div>
          </div>
          <div class="table-scroll" style="max-height:380px">
            <table class="data-table">
              <thead><tr><th>Name</th><th class="num">Hrs</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
              <tbody>
                ${partnerRows.map(([n, v]) => {
                  const gh = v.hours > 0 ? v.gmv / v.hours : 0;
                  return `<tr>
                    <td class="name"><span class="clickable" data-partner="${n}">${n}</span></td>
                    <td class="num mono">${fmtHours(v.hours)}</td>
                    <td class="num mono">฿${fmtMoney(v.gmv)}</td>
                    <td class="num mono">฿${fmtMoney(gh)}</td>
                  </tr>`;
                }).join('')}
                ${partnerRows.length === 0 ? '<tr><td colspan="4" style="color:var(--text-3)">No data</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      ${personStats && Object.keys(personStats.categoryGmv).length > 0 ? `
      <div class="chart-row">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">🏷️ Category Strengths</div>
            <div class="panel-sub">where this ${isProducer ? 'producer' : 'MC'} excels</div>
          </div>
          <div class="panel-body">
            <table class="data-table">
              <thead><tr><th>Category</th><th class="num">Sessions</th><th class="num">GMV</th><th class="num">Share</th></tr></thead>
              <tbody>
                ${Object.entries(personStats.categoryGmv).sort((a,b) => b[1]-a[1]).map(([cat, gmv]) => {
                  const sess = personStats.categoryCount[cat] || 0;
                  const share = ((gmv / personStats.totalGmv) * 100).toFixed(1);
                  return `<tr><td class="name">${cat}</td><td class="num mono">${sess}</td><td class="num mono">฿${fmtMoney(gmv)}</td><td class="num mono">${share}%</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">📡 Platform Split</div>
            <div class="panel-sub">Shopee vs TikTok performance</div>
          </div>
          <div class="panel-body">
            <table class="data-table">
              <thead><tr><th>Channel</th><th class="num">Sessions</th><th class="num">Hours</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
              <tbody>
                ${Object.keys(personStats.channelGmv).sort().map(ch => {
                  const sess = personStats.channelCount[ch] || 0;
                  const gmv = personStats.channelGmv[ch] || 0;
                  const hrs = personStats.channelHrs[ch] || 0;
                  const gh = hrs > 0 ? gmv/hrs : 0;
                  return `<tr><td class="name">${ch}</td><td class="num mono">${sess}</td><td class="num mono">${fmtHours(hrs)}</td><td class="num mono">฿${fmtMoney(gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="badge-section">
        <h4>🏅 Achievements <span class="count">${badgesEarned} / ${BADGE_DEFS.length} unlocked</span></h4>
        <div class="badge-grid">
          ${badges.map(b => `
            <div class="badge-item ${b.earned ? 'earned' : 'locked'}">
              <div class="badge-icon">${b.icon}</div>
              <div class="badge-name">${b.name}</div>
              <div class="badge-desc">${b.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card-wrap">
        <div class="card-wrap-head">
          <h4>🎴 Player Card — shareable</h4>
          <button class="primary" id="exportCardBtn">↓ Export PNG</button>
        </div>
        <div class="producer-card tier-${profileTier.tier}" id="producerCard">
          <div class="pc-head">
            <div class="pc-logo">
              <img class="pc-logo-mark" alt="Logo" src="${LOGO_DATA_URL}" />
              <div class="pc-logo-text">a<span class="accent">commerce</span></div>
            </div>
            <span class="pc-tier-badge">${profileTier.icon} ${profileTier.label}</span>
          </div>
          <div class="pc-name">${name}</div>
          <div class="pc-role">${isProducer ? 'Producer' : 'MC'} · Active since ${personStats && personStats.firstMonth ? fmtMonthLabel(personStats.firstMonth) : '—'}</div>
          <div class="pc-stats">
            <div class="pc-stat"><div class="v">฿${fmtMoney(personStats ? personStats.totalHours > 0 ? personStats.totalGmv/personStats.totalHours : 0 : 0)}</div><div class="l">GMV/Hr</div></div>
            <div class="pc-stat"><div class="v">${fmtHours(personStats ? personStats.totalHours : 0)}</div><div class="l">Hours</div></div>
            <div class="pc-stat"><div class="v">${personStats ? personStats.totalSessions : 0}</div><div class="l">Sessions</div></div>
            <div class="pc-stat"><div class="v">${personStats ? personStats.brandCount : 0}</div><div class="l">Brands</div></div>
          </div>
          <div class="pc-meta">
            Top brand: <strong>${topKey(brandAgg) || '—'}</strong> · <strong>#${rank || '—'}</strong> of ${totalInTeam}
          </div>
          <div class="pc-achievements">
            <span class="label">Unlocked</span>
            <span class="icons">${badges.filter(b => b.earned).slice(0, 6).map(b => b.icon).join(' ') || '—'}</span>
          </div>
          ${streaks.currentAboveTeam >= 2 ? `<div class="pc-streak">🔥 ${streaks.currentAboveTeam} months above team avg</div>` : ''}
        </div>
      </div>
    </div>
  `;

  // Card export
  const exportBtn = document.getElementById('exportCardBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const card = document.getElementById('producerCard');
      if (!card || typeof html2canvas === 'undefined') {
        alert('Export library not loaded.');
        return;
      }
      exportBtn.disabled = true; exportBtn.textContent = 'Generating...';
      html2canvas(card, { backgroundColor: null, scale: 2, logging: false }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${name.replace(/[^a-zA-Z0-9]+/g,'_')}_card.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        exportBtn.disabled = false; exportBtn.textContent = '↓ Export PNG';
      }).catch(e => {
        alert('Export failed: ' + e.message);
        exportBtn.disabled = false; exportBtn.textContent = '↓ Export PNG';
      });
    });
  }

  // Bind type pill
  document.querySelectorAll('.type-pill button').forEach(b => {
    b.addEventListener('click', () => {
      profileState.type = b.dataset.type;
      profileState.name = null;  // reset
      render();
    });
  });
  // Bind name dropdown
  document.getElementById('profilePerson').addEventListener('change', (e) => {
    profileState.name = e.target.value;
    render();
  });
  // Brand clicks → modal
  document.querySelectorAll('#content .clickable[data-brand]').forEach(el => {
    el.addEventListener('click', () => openBrandModal(el.dataset.brand, profileState));
  });
  // Partner clicks → switch profile to that partner (toggle type)
  document.querySelectorAll('#content .clickable[data-partner]').forEach(el => {
    el.addEventListener('click', () => {
      profileState = { type: isProducer ? 'mc' : 'producer', name: el.dataset.partner };
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Render charts
  drawProfileTrend(name, isProducer);
  drawProfileBrandDonut(brandRows);
}

function sumSessions(arr) {
  return arr.reduce((s, r) => {
    s.sessions++; s.hours += r.dur; s.gmv += r.gmv; s.orders += r.orders;
    s.viewers += r.viewers; s.engaged += r.engaged; s.comments += r.comments;
    return s;
  }, { sessions: 0, hours: 0, gmv: 0, orders: 0, viewers: 0, engaged: 0, comments: 0 });
}

function funnelCell(label, valDisplay, personVal, teamVal) {
  if (!teamVal || teamVal === 0) {
    return `<div class="fc-cell"><div class="fc-label">${label}</div><div class="fc-val">${valDisplay}</div><div class="fc-vs flat">—</div></div>`;
  }
  const gap = personVal / teamVal - 1;
  const cls = gap > 0.05 ? 'up' : gap < -0.05 ? 'down' : 'flat';
  const arrow = gap > 0.05 ? '↑' : gap < -0.05 ? '↓' : '→';
  return `<div class="fc-cell">
    <div class="fc-label">${label}</div>
    <div class="fc-val">${valDisplay}</div>
    <div class="fc-vs ${cls}">${arrow} ${gap >= 0 ? '+' : ''}${Math.round(gap*100)}% vs team</div>
  </div>`;
}

function drawProfileTrend(name, isProducer) {
  const brand = document.getElementById('filterBrand').value;
  const channel = document.getElementById('filterChannel').value;
  const filt = s => (!brand || s.brand === brand) && (!channel || s.channel === channel);
  const personSessions = allData.sessions.filter(s => (isProducer ? s.producer === name : s.mc === name) && filt(s));
  const teamSessions = allData.sessions.filter(s => (isProducer ? true : (s.mc && !SKIP_MCS.has(s.mc.toLowerCase()))) && filt(s));

  const months = allData.meta.months;
  const personRate = months.map(m => {
    const ms = personSessions.filter(s => s.ym === m);
    const h = ms.reduce((s,r) => s + r.dur, 0);
    const g = ms.reduce((s,r) => s + r.gmv, 0);
    return h > 0 ? g / h : null;
  });
  const teamRate = months.map(m => {
    const ms = teamSessions.filter(s => s.ym === m);
    const h = ms.reduce((s,r) => s + r.dur, 0);
    const g = ms.reduce((s,r) => s + r.gmv, 0);
    return h > 0 ? g / h : null;
  });

  if (charts.profileTrend) charts.profileTrend.destroy();
  charts.profileTrend = new Chart(document.getElementById('profileTrend'), {
    type: 'line',
    data: {
      labels: months.map(fmtMonthLabel),
      datasets: [
        {
          label: name, data: personRate,
          borderColor: '#1F7AB6', backgroundColor: 'rgba(31, 122, 182, 0.10)',
          tension: 0.35, fill: true,
          pointRadius: 5, pointBackgroundColor: '#A6CE39', pointBorderColor: '#1F7AB6', pointBorderWidth: 2,
          borderWidth: 2.5, spanGaps: true,
        },
        {
          label: 'Team avg', data: teamRate,
          borderColor: '#86868B', borderDash: [4, 4],
          tension: 0.3, fill: false,
          pointRadius: 3, pointBackgroundColor: '#86868B',
          borderWidth: 1.5, spanGaps: true,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#1D1D1F', font: { size: 11, weight: '600' }, boxWidth: 14 } },
        tooltip: { backgroundColor: '#1D1D1F', titleColor: '#FFF', bodyColor: '#FFF',
          callbacks: { label: ctx => ctx.dataset.label + ': ฿' + (ctx.parsed.y == null ? '—' : fmtMoney(ctx.parsed.y)) + '/hr' } }
      },
      scales: {
        y: { ticks: { callback: v => '฿' + fmtMoney(v), color: '#6E6E73' }, grid: { color: '#E5E5EA' } },
        x: { ticks: { color: '#6E6E73' }, grid: { display: false } }
      }
    }
  });
}

function drawProfileBrandDonut(brandRows) {
  const top = brandRows.slice(0, 7);
  const others = brandRows.slice(7);
  const labels = top.map(x => x[0]);
  const values = top.map(x => x[1].gmv);
  if (others.length > 0) {
    labels.push('Others');
    values.push(others.reduce((s, x) => s + x[1].gmv, 0));
  }
  if (charts.profileBrandDonut) charts.profileBrandDonut.destroy();
  charts.profileBrandDonut = new Chart(document.getElementById('profileBrandDonut'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: ['#1F7AB6','#A6CE39','#3BABDC','#F0A030','#5BB832','#155985','#8AB02E','#B4B4B7'], borderWidth: 2, borderColor: '#FFFFFF' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#1D1D1F', font: { size: 10.5, weight: '500' }, boxWidth: 11, padding: 8 } },
        tooltip: { backgroundColor: '#1D1D1F', titleColor: 'white', bodyColor: 'white',
          callbacks: { label: ctx => ctx.label + ': ฿' + fmtMoney(ctx.parsed) } }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: FUNNEL — click row → detail
// ═══════════════════════════════════════════════════════════════════
function renderFunnel(rows) {
  const agg = aggregate(rows, r => r.producer);
  const MIN = 3;
  const producers = Object.entries(agg).filter(([n, a]) => a.sessions >= MIN).map(([name, a]) => ({
    name, ...a,
    engRate: a.viewers > 0 ? a.engaged / a.viewers : 0,
    cmt1K: a.viewers > 0 ? a.comments / a.viewers * 1000 : 0,
    orderCR: a.viewers > 0 ? a.orders / a.viewers : 0,
    aov: a.orders > 0 ? a.gmv / a.orders : 0,
    revPerV: a.viewers > 0 ? a.gmv / a.viewers : 0,
  }));

  const tot = producers.reduce((s, p) => {
    s.viewers += p.viewers; s.engaged += p.engaged; s.comments += p.comments;
    s.orders += p.orders; s.gmv += p.gmv; s.hours += p.hours; return s;
  }, { viewers: 0, engaged: 0, comments: 0, orders: 0, gmv: 0, hours: 0 });

  const teamAvg = {
    engRate: tot.viewers > 0 ? tot.engaged / tot.viewers : 0,
    cmt1K: tot.viewers > 0 ? tot.comments / tot.viewers * 1000 : 0,
    orderCR: tot.viewers > 0 ? tot.orders / tot.viewers : 0,
    aov: tot.orders > 0 ? tot.gmv / tot.orders : 0,
    vph: tot.hours > 0 ? tot.viewers / tot.hours : 0,
  };

  producers.forEach(p => {
    const vph = p.hours > 0 ? p.viewers / p.hours : 0;
    const metrics = [
      ['Viewer pull', vph, teamAvg.vph],
      ['Engagement', p.engRate, teamAvg.engRate],
      ['Comments/1K', p.cmt1K, teamAvg.cmt1K],
      ['Conversion', p.orderCR, teamAvg.orderCR],
      ['AOV (upsell)', p.aov, teamAvg.aov],
    ];
    let worst = null, gap = 0;
    metrics.forEach(m => { if (m[2] === 0) return; const g = m[1] / m[2] - 1; if (g < gap) { gap = g; worst = m[0]; } });
    p.coach = worst ? `${worst} ${Math.round(gap*100)}%` : '—';
    p.viewersPerHr = vph;
  });
  producers.sort((a, b) => b.revPerV - a.revPerV);

  const sVph = producers.map(p => p.viewersPerHr).sort((a, b) => a - b);
  const sEng = producers.map(p => p.engRate).sort((a, b) => a - b);
  const sCmt = producers.map(p => p.cmt1K).sort((a, b) => a - b);
  const sCR  = producers.map(p => p.orderCR).sort((a, b) => a - b);
  const sAOV = producers.map(p => p.aov).sort((a, b) => a - b);
  const sRV  = producers.map(p => p.revPerV).sort((a, b) => a - b);

  document.getElementById('content').innerHTML = `
    <div class="view">
      <div class="section-header">
        <span class="section-number">05 / FUNNEL</span>
        <h2 class="section-title">engagement <span class="accent">funnel</span></h2>
        <span class="section-subtitle">viewers → engaged → comments → orders → GMV · click row</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Viewers / Hour</div><div class="kpi-value mono">${fmtNum(teamAvg.vph)}</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Engagement Rate</div><div class="kpi-value mono">${fmtPct(teamAvg.engRate)}</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Order Conversion</div><div class="kpi-value mono">${fmtPct(teamAvg.orderCR)}</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">AOV</div><div class="kpi-value mono">฿${fmtNum(teamAvg.aov)}</div></div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Producer Funnel — Coach Focus shows weakest metric</div>
          <div class="panel-sub">sorted by Rev/Viewer · click any row → deep funnel</div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>Producer</th><th class="num">Hrs</th>
              <th class="num">Viewers/Hr</th><th class="num">Engaged</th><th class="num">Cmt/1K</th>
              <th class="num">Order CR</th><th class="num">AOV</th><th class="num">Rev/Viewer</th>
              <th>Coach Focus</th>
            </tr></thead>
            <tbody>${producers.map((p, i) => `<tr class="funnel-row" data-producer="${p.name}" style="cursor:pointer">
              <td class="${rankClass(i)}">${i + 1}</td>
              <td class="name">${p.name}</td>
              <td class="num mono">${fmtHours(p.hours)}</td>
              <td class="num"><span class="${hmCls(pctTier(p.viewersPerHr, sVph))}">${fmtNum(p.viewersPerHr)}</span></td>
              <td class="num"><span class="${hmCls(pctTier(p.engRate, sEng))}">${fmtPct(p.engRate)}</span></td>
              <td class="num"><span class="${hmCls(pctTier(p.cmt1K, sCmt))}">${p.cmt1K.toFixed(1)}</span></td>
              <td class="num"><span class="${hmCls(pctTier(p.orderCR, sCR))}">${fmtPct(p.orderCR)}</span></td>
              <td class="num"><span class="${hmCls(pctTier(p.aov, sAOV))}">฿${fmtNum(p.aov)}</span></td>
              <td class="num"><span class="${hmCls(pctTier(p.revPerV, sRV))}">฿${fmtNum(p.revPerV)}</span></td>
              <td style="color:var(--negative);font-family:var(--mono);font-size:10px;letter-spacing:0.05em;font-weight:600">${p.coach}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.funnel-row').forEach(tr => {
    tr.addEventListener('click', () => openFunnelModal(tr.dataset.producer));
  });
}

function hmCls(t) {
  if (t === 4) return 'hm hm-90';
  if (t === 3) return 'hm hm-75';
  if (t === 2) return 'hm hm-50';
  if (t === 1) return 'hm hm-25';
  if (t === 0) return 'hm hm-0';
  return 'hm hm-na';
}

function openFunnelModal(producer) {
  const month = document.getElementById('filterMonth').value;
  const data = allData.sessions.filter(s => s.producer === producer && (!month || s.ym === month));
  const tot = data.reduce((s, r) => { s.viewers += r.viewers; s.engaged += r.engaged; s.comments += r.comments; s.orders += r.orders; s.gmv += r.gmv; s.hours += r.dur; return s; }, { viewers:0,engaged:0,comments:0,orders:0,gmv:0,hours:0 });

  const engRate = tot.viewers > 0 ? tot.engaged / tot.viewers : 0;
  const orderCR = tot.viewers > 0 ? tot.orders / tot.viewers : 0;
  const aov = tot.orders > 0 ? tot.gmv / tot.orders : 0;
  const revPerV = tot.viewers > 0 ? tot.gmv / tot.viewers : 0;

  // Per-session breakdown (latest 12)
  const sessions = data.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 12);
  const sessRows = sessions.map(s => {
    const er = s.viewers > 0 ? s.engaged/s.viewers : 0;
    const cr = s.viewers > 0 ? s.orders/s.viewers : 0;
    return `<tr><td class="name">${s.date}</td><td class="name" style="color:var(--text-3)">${s.brand}</td><td class="num mono">${fmtNum(s.viewers)}</td><td class="num mono">${fmtPct(er)}</td><td class="num mono">${fmtPct(cr)}</td><td class="num mono">฿${fmtMoney(s.gmv)}</td></tr>`;
  }).join('');

  openModal(producer, `${fmtMonthLabel(month)} · funnel breakdown`, `
    <div class="modal-kpi">
      <div class="modal-kpi-cell"><div class="label">Viewers</div><div class="value">${fmtNum(tot.viewers)}</div></div>
      <div class="modal-kpi-cell"><div class="label">Engagement</div><div class="value">${fmtPct(engRate)}</div></div>
      <div class="modal-kpi-cell"><div class="label">Order CR</div><div class="value">${fmtPct(orderCR)}</div></div>
      <div class="modal-kpi-cell"><div class="label">AOV</div><div class="value">฿${fmtNum(aov)}</div></div>
    </div>
    <h4>Funnel waterfall</h4>
    <div style="background:var(--surface-2);padding:18px;border-radius:10px;margin-bottom:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;font-family:var(--mono);font-size:11px">
        <div><strong>${fmtNum(tot.viewers)}</strong> viewers</div>
        <div style="color:var(--text-3)">→</div>
        <div><strong>${fmtNum(tot.engaged)}</strong> engaged (${fmtPct(engRate)})</div>
        <div style="color:var(--text-3)">→</div>
        <div><strong>${fmtNum(tot.orders)}</strong> orders (${fmtPct(orderCR)})</div>
        <div style="color:var(--text-3)">→</div>
        <div><strong>฿${fmtMoney(tot.gmv)}</strong> GMV</div>
      </div>
    </div>
    <h4>Latest 12 sessions</h4>
    <table class="data-table">
      <thead><tr><th>Date</th><th>Brand</th><th class="num">Viewers</th><th class="num">Eng</th><th class="num">CR</th><th class="num">GMV</th></tr></thead>
      <tbody>${sessRows}</tbody>
    </table>
  `);
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: TIME — click cell → detail modal
// ═══════════════════════════════════════════════════════════════════
function renderTime(rows) {
  const matrix = {};
  rows.forEach(r => {
    if (r.startHour === null || r.dow === undefined) return;
    if (!matrix[r.dow]) matrix[r.dow] = {};
    if (!matrix[r.dow][r.startHour]) matrix[r.dow][r.startHour] = { gmv: 0, hrs: 0, sess: 0 };
    const c = matrix[r.dow][r.startHour];
    c.gmv += r.gmv; c.hrs += r.dur; c.sess++;
  });

  const allVals = [];
  Object.values(matrix).forEach(d => Object.values(d).forEach(c => { if (c.hrs > 0) allVals.push(c.gmv / c.hrs); }));
  allVals.sort((a, b) => a - b);

  const activeHours = new Set();
  Object.values(matrix).forEach(d => Object.keys(d).forEach(h => activeHours.add(parseInt(h))));
  const hours = [...activeHours].sort((a, b) => a - b);

  let bestSlot = { val: 0, dow: 0, h: 0, sess: 0 };
  Object.entries(matrix).forEach(([d, ds]) => {
    Object.entries(ds).forEach(([h, c]) => {
      if (c.sess < 3) return;
      const v = c.hrs > 0 ? c.gmv / c.hrs : 0;
      if (v > bestSlot.val) bestSlot = { val: v, dow: parseInt(d), h: parseInt(h), sess: c.sess };
    });
  });

  const dayTotals = {};
  for (let d = 0; d < 7; d++) {
    let gmv = 0, hrs = 0, sess = 0;
    if (matrix[d]) Object.values(matrix[d]).forEach(c => { gmv += c.gmv; hrs += c.hrs; sess += c.sess; });
    dayTotals[d] = { gmv, hrs, sess, rate: hrs > 0 ? gmv/hrs : 0 };
  }
  const bestDay = Object.entries(dayTotals).sort((a,b) => b[1].rate - a[1].rate)[0];

  document.getElementById('content').innerHTML = `
    <div class="view">
      <div class="section-header">
        <span class="section-number">06 / SLOTS</span>
        <h2 class="section-title">when to <span class="accent">live</span></h2>
        <span class="section-subtitle">click any cell for detail</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Best Day</div><div class="kpi-value">${DAY_NAMES[bestDay[0]]}day</div><div class="kpi-sub">฿${fmtMoney(bestDay[1].rate)}/hr</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Prime Slot</div><div class="kpi-value mono">${String(bestSlot.h).padStart(2,'0')}:00</div><div class="kpi-sub">${DAY_NAMES[bestSlot.dow]} · ฿${fmtMoney(bestSlot.val)}/hr</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Slots Tested</div><div class="kpi-value mono">${allVals.length}</div><div class="kpi-sub">unique day×hour cells</div></div>
        <div class="kpi"><div class="kpi-stripe"></div><div class="kpi-label">Coverage</div><div class="kpi-value mono">${hours.length}h</div><div class="kpi-sub">${hours[0]}:00 → ${hours[hours.length-1]}:00</div></div>
      </div>

      <div class="panel">
        <div class="panel-head"><div class="panel-title">Day × Hour Heatmap</div><div class="panel-sub">GMV per hour · darker = stronger · click cell</div></div>
        <div class="panel-body" style="overflow:auto">
          <table class="data-table" style="font-size:10.5px">
            <thead><tr>
              <th>Day</th>
              ${hours.map(h => `<th class="num">${String(h).padStart(2,'0')}</th>`).join('')}
              <th class="num">Day Σ</th>
            </tr></thead>
            <tbody>${[1,2,3,4,5,6,0].map(d => `<tr>
              <td class="name">${DAY_NAMES[d]}</td>
              ${hours.map(h => {
                const c = matrix[d] && matrix[d][h];
                if (!c || c.hrs === 0) return '<td class="hm hm-na">—</td>';
                const v = c.gmv / c.hrs;
                const cls = hmCls(pctTier(v, allVals));
                return `<td class="${cls} time-cell" data-dow="${d}" data-hour="${h}">${fmtMoney(v)}</td>`;
              }).join('')}
              <td class="num mono" style="color:var(--text-2);font-weight:700">${fmtMoney(dayTotals[d].rate)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.time-cell').forEach(c => {
    c.addEventListener('click', () => openTimeSlotModal(parseInt(c.dataset.dow), parseInt(c.dataset.hour)));
  });
}

function openTimeSlotModal(dow, hour) {
  const data = allData.sessions.filter(s => s.dow === dow && s.startHour === hour);
  const totGmv = data.reduce((s, r) => s + r.gmv, 0);
  const totHrs = data.reduce((s, r) => s + r.dur, 0);
  const gmvHr = totHrs > 0 ? totGmv / totHrs : 0;

  const byBrand = aggregate(data, r => r.brand);
  const byProducer = aggregate(data, r => r.producer);

  const brandRows = Object.entries(byBrand).sort((a,b) => b[1].gmv - a[1].gmv).slice(0,10).map(([b, v]) => {
    const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr><td class="name">${b}</td><td class="num mono">${v.sessions}</td><td class="num mono">฿${fmtMoney(v.gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
  }).join('');
  const prodRows = Object.entries(byProducer).sort((a,b) => b[1].gmv - a[1].gmv).slice(0,10).map(([p, v]) => {
    const gh = v.hours > 0 ? v.gmv / v.hours : 0;
    return `<tr><td class="name">${p}</td><td class="num mono">${v.sessions}</td><td class="num mono">฿${fmtMoney(v.gmv)}</td><td class="num mono">฿${fmtMoney(gh)}</td></tr>`;
  }).join('');

  openModal(`${DAY_NAMES[dow]} · ${String(hour).padStart(2,'0')}:00`, `${data.length} sessions in this slot`, `
    <div class="modal-kpi">
      <div class="modal-kpi-cell"><div class="label">Sessions</div><div class="value">${data.length}</div></div>
      <div class="modal-kpi-cell"><div class="label">Hours</div><div class="value">${fmtHours(totHrs)}</div></div>
      <div class="modal-kpi-cell"><div class="label">Total GMV</div><div class="value">฿${fmtMoney(totGmv)}</div></div>
      <div class="modal-kpi-cell"><div class="label">GMV/Hr</div><div class="value">฿${fmtMoney(gmvHr)}</div></div>
    </div>
    <h4>Top Brands in this slot</h4>
    <table class="data-table">
      <thead><tr><th>Brand</th><th class="num">Sess</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
      <tbody>${brandRows}</tbody>
    </table>
    <h4>Top Producers in this slot</h4>
    <table class="data-table">
      <thead><tr><th>Producer</th><th class="num">Sess</th><th class="num">GMV</th><th class="num">GMV/Hr</th></tr></thead>
      <tbody>${prodRows}</tbody>
    </table>
  `);
}

// ═══════════════════════════════════════════════════════════════════
//  VIEW: SMART INSIGHTS
// ═══════════════════════════════════════════════════════════════════
function renderInsights(rows) {
  const month = document.getElementById('filterMonth').value;
  const prodAgg = aggregate(rows, r => r.producer);
  const mcAgg = aggregate(rows.filter(r => r.mc && !SKIP_MCS.has(r.mc.toLowerCase())), r => r.mc);
  const brandAgg = aggregate(rows, r => r.brand);
  const insights = computeInsights(rows, prodAgg, mcAgg, month);

  const consistencyLeaders = Object.entries(prodAgg)
    .filter(([n, a]) => a.sessions >= 5)
    .map(([n, a]) => {
      const mean = a.gmv / a.sessions;
      const variance = a.gmvs.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / a.sessions;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 999;
      return { name: n, mean, cv, sessions: a.sessions, hours: a.hours };
    })
    .filter(p => p.mean > 0)
    .sort((a, b) => a.cv - b.cv)
    .slice(0, 5);

  const brandDiff = Object.entries(brandAgg)
    .filter(([b, a]) => a.sessions >= 3)
    .map(([b, a]) => ({ brand: b, rate: a.hours > 0 ? a.gmv/a.hours : 0, hours: a.hours }))
    .sort((a, b) => b.rate - a.rate);

  const brandChannel = {};
  rows.forEach(r => {
    if (!r.brand || !r.channel) return;
    if (!brandChannel[r.brand]) brandChannel[r.brand] = {};
    if (!brandChannel[r.brand][r.channel]) brandChannel[r.brand][r.channel] = { gmv: 0, hrs: 0 };
    brandChannel[r.brand][r.channel].gmv += r.gmv;
    brandChannel[r.brand][r.channel].hrs += r.dur;
  });
  const channelWins = Object.entries(brandChannel)
    .filter(([b, ch]) => Object.keys(ch).length >= 2)
    .map(([b, ch]) => {
      const sorted = Object.entries(ch).sort((a,b) => {
        const ra = a[1].hrs > 0 ? a[1].gmv/a[1].hrs : 0;
        const rb = b[1].hrs > 0 ? b[1].gmv/b[1].hrs : 0;
        return rb - ra;
      });
      const r1 = sorted[0][1].hrs > 0 ? sorted[0][1].gmv/sorted[0][1].hrs : 0;
      const r2 = sorted[1][1].hrs > 0 ? sorted[1][1].gmv/sorted[1][1].hrs : 0;
      return { brand: b, winner: sorted[0][0], winnerRate: r1, loserRate: r2, gap: r2 > 0 ? r1/r2 - 1 : 0 };
    })
    .filter(x => x.gap > 0.3)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

  document.getElementById('content').innerHTML = `
    <div class="view">
      <div class="section-header">
        <span class="section-number">07 / INSIGHTS</span>
        <h2 class="section-title">data <span class="accent">tells</span></h2>
        <span class="section-subtitle">${fmtMonthLabel(month)} · auto-curated</span>
      </div>

      <div class="subsection">Action Briefing</div>
      <div class="insight-grid">
        ${insights.map(i => `
          <div class="insight-card tone-${i.tone} ${i.large ? 'large' : ''}">
            <span class="tag tag-${i.tone}">${i.label}</span>
            <div class="headline">${i.headline}</div>
            <div class="body">${i.body}</div>
            ${i.stat ? `<div class="stat">${i.stat}</div>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="subsection">Consistency Champions — low variance, high mean</div>
      <div class="panel" style="margin-bottom:32px">
        <div class="table-scroll" style="max-height:300px">
          <table class="data-table">
            <thead><tr><th>#</th><th>Producer</th><th class="num">Hours</th><th class="num">Avg GMV/Session</th><th class="num">Variation</th><th>Verdict</th></tr></thead>
            <tbody>${consistencyLeaders.map((p, i) => `<tr>
              <td class="${rankClass(i)}">${i+1}</td>
              <td class="name">${p.name}</td>
              <td class="num mono">${fmtHours(p.hours)}</td>
              <td class="num mono">฿${fmtMoney(p.mean)}</td>
              <td class="num mono">${(p.cv * 100).toFixed(0)}%</td>
              <td>${p.cv < 0.5 ? '<span class="badge badge-top">Rock Solid</span>' : p.cv < 1 ? '<span class="badge badge-above">Stable</span>' : '<span class="badge badge-below">Variable</span>'}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="subsection">Brand Yield Ranking — where to allocate top talent</div>
      <div class="panel" style="margin-bottom:32px">
        <div class="table-scroll" style="max-height:400px">
          <table class="data-table">
            <thead><tr><th>#</th><th>Brand</th><th class="num">Hours</th><th class="num">GMV/Hr</th><th class="num">vs Median</th></tr></thead>
            <tbody>${brandDiff.map((b, i) => {
              const median = brandDiff[Math.floor(brandDiff.length / 2)].rate;
              const vs = median > 0 ? b.rate / median - 1 : 0;
              return `<tr>
                <td class="${rankClass(i)}">${i+1}</td>
                <td class="name"><span class="clickable" data-brand="${b.brand}">${b.brand}</span></td>
                <td class="num mono">${fmtHours(b.hours)}</td>
                <td class="num mono">฿${fmtMoney(b.rate)}</td>
                <td class="num mono ${vs >= 0 ? 'mom-up' : 'mom-down'}">${vs >= 0 ? '+' : ''}${Math.round(vs * 100)}%</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>

      ${channelWins.length > 0 ? `
      <div class="subsection">Channel Wins — same brand, big gap</div>
      <div class="panel">
        <div class="table-scroll" style="max-height:300px">
          <table class="data-table">
            <thead><tr><th>Brand</th><th>Winning Channel</th><th class="num">Winner GMV/Hr</th><th class="num">Other GMV/Hr</th><th class="num">Gap</th></tr></thead>
            <tbody>${channelWins.map(c => `<tr>
              <td class="name"><span class="clickable" data-brand="${c.brand}">${c.brand}</span></td>
              <td><span class="badge badge-top">${c.winner}</span></td>
              <td class="num mono">฿${fmtMoney(c.winnerRate)}</td>
              <td class="num mono" style="color:var(--text-3)">฿${fmtMoney(c.loserRate)}</td>
              <td class="num mono mom-up">+${Math.round(c.gap*100)}%</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>` : ''}
    </div>
  `;

  // Brand clicks
  document.querySelectorAll('.clickable[data-brand]').forEach(el => {
    el.addEventListener('click', () => openBrandModal(el.dataset.brand));
  });
}

// ═══════════════════════════════════════════════════════════════════
//  CHARTS
// ═══════════════════════════════════════════════════════════════════
function drawTrendChart(canvasId, sourceRows) {
  const source = sourceRows || allData.sessions;
  const brand = document.getElementById('filterBrand').value;
  const channel = document.getElementById('filterChannel').value;
  const data = source.filter(s => (!brand || s.brand === brand) && (!channel || s.channel === channel));
  const monthly = {};
  data.forEach(r => monthly[r.ym] = (monthly[r.ym] || 0) + r.gmv);
  const months = Object.keys(monthly).sort();
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'line',
    data: {
      labels: months.map(fmtMonthLabel),
      datasets: [{
        data: months.map(m => monthly[m]),
        borderColor: '#1F7AB6',
        backgroundColor: 'rgba(31, 122, 182, 0.08)',
        tension: 0.35, fill: true,
        pointRadius: 5, pointBackgroundColor: '#A6CE39', pointBorderColor: '#1F7AB6', pointBorderWidth: 2,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1D1D1F', borderColor: '#1F7AB6', borderWidth: 1, titleColor: '#FFFFFF', bodyColor: '#E1F0FA' } },
      scales: {
        y: { ticks: { callback: v => '฿' + fmtMoney(v), color: '#6E6E73' }, grid: { color: '#E5E5EA' } },
        x: { ticks: { color: '#6E6E73' }, grid: { display: false } }
      }
    }
  });
}

function drawTopChart(canvasId, data, key, color) {
  const top = [...data].sort((a, b) => b[key] - a[key]).slice(0, 10);
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: {
      labels: top.map(d => d.name),
      datasets: [{ data: top.map(d => d[key]), backgroundColor: color || '#A6CE39', borderRadius: 5, borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1D1D1F', borderColor: color || '#A6CE39', borderWidth: 1, titleColor: '#FFFFFF', bodyColor: '#E1F0FA' } },
      scales: {
        x: { ticks: { callback: v => '฿' + fmtMoney(v), color: '#6E6E73' }, grid: { color: '#E5E5EA' } },
        y: { ticks: { color: '#1D1D1F', font: { size: 11, weight: '600' } }, grid: { display: false } }
      }
    }
  });
}
</script>
</body>
</html>
