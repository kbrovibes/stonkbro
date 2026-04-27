#!/usr/bin/env node
/**
 * Parses BACKLOG.md and generates docs/backlog.html — a static status page
 * for GitHub Pages showing shipped items, upcoming work, and in-progress items.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BACKLOG_PATH = path.join(ROOT, "BACKLOG.md");
const OUTPUT_PATH = path.join(ROOT, "docs", "backlog.html");

function parseBacklog(md) {
  const sections = {
    inProgress: [],
    p1: [],
    p2: [],
    ideas: [],
    done: [],
    removed: [],
  };

  let currentSection = null;
  for (const line of md.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      if (trimmed.includes("In Progress")) currentSection = "inProgress";
      else if (trimmed.includes("P1")) currentSection = "p1";
      else if (trimmed.includes("P2")) currentSection = "p2";
      else if (trimmed.includes("IDEAS")) currentSection = "ideas";
      else if (trimmed.includes("Done")) currentSection = "done";
      else if (trimmed.includes("Removed")) currentSection = "removed";
      else currentSection = null;
      continue;
    }
    if (!currentSection) continue;
    if (trimmed.startsWith("<!--")) continue;

    // Parse items: - [ ] **NN — Title** · Description  OR  - [x] **NN — Title** · Description (date)
    const itemMatch = trimmed.match(
      /^- \[[ x]\] \*\*(\d+)\s*—\s*(.+?)\*\*\s*·\s*(.+?)(?:\s*\((.+?)\))?$/
    );
    if (itemMatch) {
      sections[currentSection].push({
        number: parseInt(itemMatch[1]),
        title: itemMatch[2].trim(),
        description: itemMatch[3].trim(),
        date: itemMatch[4]?.trim() || null,
      });
      continue;
    }

    // Parse removed items: - ~~**Title**~~ — Reason
    const removedMatch = trimmed.match(/^- ~~\*\*(.+?)\*\*~~\s*—\s*(.+)$/);
    if (removedMatch) {
      sections.removed.push({
        title: removedMatch[1].trim(),
        reason: removedMatch[2].trim(),
      });
    }
  }

  return sections;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderItem(item, statusBadge) {
  return `
    <div class="item">
      <div class="item-header">
        <span class="item-number">#${item.number}</span>
        ${statusBadge}
        <span class="item-title">${escapeHtml(item.title)}</span>
      </div>
      <p class="item-desc">${escapeHtml(item.description)}</p>
      ${item.date ? `<span class="item-date">${escapeHtml(item.date)}</span>` : ""}
    </div>`;
}

function generateHtml(sections) {
  const now = new Date();
  const timestamp = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalDone = sections.done.length;
  const totalQueued = sections.p1.length + sections.p2.length;
  const totalInProgress = sections.inProgress.length;

  // Recently shipped = last 5 done items (they appear newest first in BACKLOG.md)
  const recentlyShipped = sections.done.slice(0, 5);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>stonkbro — Backlog Status</title>
  <meta name="description" content="Live backlog status for stonkbro: what's shipped, what's next, what's in progress.">
  <style>
    :root {
      --bg: #fafaf9;
      --surface: #ffffff;
      --surface-alt: #f5f5f4;
      --border: #e7e5e4;
      --text: #1c1917;
      --text-muted: #78716c;
      --accent: #16a34a;
      --accent-light: #dcfce7;
      --blue: #2563eb;
      --blue-light: #dbeafe;
      --amber: #d97706;
      --amber-light: #fef3c7;
      --red: #dc2626;
      --red-light: #fee2e2;
      --purple: #7c3aed;
      --purple-light: #ede9fe;
      --sky: #0284c7;
      --sky-light: #e0f2fe;
      --radius: 12px;
      --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    nav {
      position: sticky; top: 0; z-index: 100;
      background: rgba(250,250,249,0.85); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border); padding: 0 2rem;
    }
    nav .inner {
      max-width: 900px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; height: 56px;
    }
    nav .logo { font-weight: 800; font-size: 1.2rem; letter-spacing: -0.5px; color: #15803d; text-decoration: none; }
    nav .links { display: flex; gap: 1.5rem; }
    nav .links a { color: var(--text-muted); text-decoration: none; font-size: 0.875rem; font-weight: 500; }
    nav .links a:hover { color: var(--text); }

    .container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

    .hero { text-align: center; padding: 2rem 0 2.5rem; }
    .hero h1 { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.5px; }
    .hero .subtitle { color: var(--text-muted); font-size: 0.95rem; margin-top: 0.25rem; }

    .stats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .stat {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 1.25rem; text-align: center;
      box-shadow: var(--shadow);
    }
    .stat .num { font-size: 2rem; font-weight: 800; line-height: 1; }
    .stat .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-top: 0.25rem; }
    .stat.green .num { color: var(--accent); }
    .stat.blue .num { color: var(--blue); }
    .stat.amber .num { color: var(--amber); }

    .section { margin-bottom: 2.5rem; }
    .section-header {
      display: flex; align-items: center; gap: 0.5rem;
      margin-bottom: 1rem; padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--border);
    }
    .section-header h2 { font-size: 1rem; font-weight: 700; }
    .section-header .count {
      font-size: 0.7rem; font-weight: 600; background: var(--surface-alt);
      padding: 2px 8px; border-radius: 999px; color: var(--text-muted);
    }

    .item {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 1rem 1.25rem;
      margin-bottom: 0.625rem; box-shadow: var(--shadow);
      transition: border-color 0.15s;
    }
    .item:hover { border-color: #d6d3d1; }
    .item-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .item-number {
      font-size: 0.7rem; font-weight: 700; color: var(--text-muted);
      background: var(--surface-alt); padding: 1px 6px; border-radius: 4px;
      font-variant-numeric: tabular-nums;
    }
    .item-title { font-weight: 600; font-size: 0.9375rem; }
    .item-desc { color: var(--text-muted); font-size: 0.8125rem; margin-top: 0.25rem; }
    .item-date { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem; display: inline-block; }

    .badge {
      font-size: 0.625rem; font-weight: 700; padding: 2px 8px;
      border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .badge-progress { background: var(--amber-light); color: var(--amber); }
    .badge-p1 { background: var(--red-light); color: var(--red); }
    .badge-p2 { background: var(--blue-light); color: var(--blue); }
    .badge-done { background: var(--accent-light); color: var(--accent); }
    .badge-idea { background: var(--purple-light); color: var(--purple); }

    .removed-item {
      padding: 0.5rem 0; border-bottom: 1px solid var(--surface-alt);
      font-size: 0.8125rem;
    }
    .removed-item:last-child { border-bottom: none; }
    .removed-title { text-decoration: line-through; color: var(--text-muted); font-weight: 500; }
    .removed-reason { color: var(--text-muted); font-size: 0.75rem; }

    .footer {
      text-align: center; padding: 2rem 0; color: var(--text-muted);
      font-size: 0.75rem; border-top: 1px solid var(--border);
    }
    .footer a { color: var(--accent); text-decoration: none; }

    .empty { color: var(--text-muted); font-size: 0.875rem; font-style: italic; padding: 1rem 0; }

    @media (max-width: 600px) {
      .container { padding: 1rem 1rem 3rem; }
      .stats { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
      .stat { padding: 0.75rem; }
      .stat .num { font-size: 1.5rem; }
      .hero h1 { font-size: 1.375rem; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="inner">
      <a class="logo" href="index.html">stonkbro</a>
      <div class="links">
        <a href="index.html">Home</a>
        <a href="backlog.html" style="color: var(--text); font-weight: 600;">Backlog</a>
      </div>
    </div>
  </nav>

  <div class="container">
    <div class="hero">
      <h1>Backlog Status</h1>
      <p class="subtitle">Updated ${escapeHtml(timestamp)}</p>
    </div>

    <div class="stats">
      <div class="stat green">
        <div class="num">${totalDone}</div>
        <div class="label">Shipped</div>
      </div>
      <div class="stat amber">
        <div class="num">${totalInProgress}</div>
        <div class="label">Building</div>
      </div>
      <div class="stat blue">
        <div class="num">${totalQueued}</div>
        <div class="label">Queued</div>
      </div>
    </div>

    ${
      sections.inProgress.length > 0
        ? `
    <div class="section">
      <div class="section-header">
        <h2>In Progress</h2>
        <span class="count">${sections.inProgress.length}</span>
      </div>
      ${sections.inProgress.map((i) => renderItem(i, '<span class="badge badge-progress">Building</span>')).join("")}
    </div>`
        : ""
    }

    ${
      recentlyShipped.length > 0
        ? `
    <div class="section">
      <div class="section-header">
        <h2>Recently Shipped</h2>
        <span class="count">${recentlyShipped.length} of ${totalDone}</span>
      </div>
      ${recentlyShipped.map((i) => renderItem(i, '<span class="badge badge-done">Shipped</span>')).join("")}
    </div>`
        : ""
    }

    <div class="section">
      <div class="section-header">
        <h2>P1 — Up Next</h2>
        <span class="count">${sections.p1.length}</span>
      </div>
      ${sections.p1.length > 0 ? sections.p1.map((i) => renderItem(i, '<span class="badge badge-p1">P1</span>')).join("") : '<p class="empty">No P1 items queued.</p>'}
    </div>

    <div class="section">
      <div class="section-header">
        <h2>P2 — Future</h2>
        <span class="count">${sections.p2.length}</span>
      </div>
      ${sections.p2.length > 0 ? sections.p2.map((i) => renderItem(i, '<span class="badge badge-p2">P2</span>')).join("") : '<p class="empty">No P2 items queued.</p>'}
    </div>

    ${
      sections.ideas.length > 0
        ? `
    <div class="section">
      <div class="section-header">
        <h2>Ideas</h2>
        <span class="count">${sections.ideas.length}</span>
      </div>
      ${sections.ideas.map((i) => renderItem(i, '<span class="badge badge-idea">Idea</span>')).join("")}
    </div>`
        : ""
    }

    <div class="section">
      <div class="section-header">
        <h2>All Shipped</h2>
        <span class="count">${totalDone}</span>
      </div>
      ${sections.done.map((i) => renderItem(i, '<span class="badge badge-done">Shipped</span>')).join("")}
    </div>

    ${
      sections.removed.length > 0
        ? `
    <div class="section">
      <div class="section-header">
        <h2>Removed</h2>
        <span class="count">${sections.removed.length}</span>
      </div>
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.75rem 1.25rem;">
        ${sections.removed
          .map(
            (r) => `
          <div class="removed-item">
            <span class="removed-title">${escapeHtml(r.title)}</span>
            <br><span class="removed-reason">${escapeHtml(r.reason)}</span>
          </div>`
          )
          .join("")}
      </div>
    </div>`
        : ""
    }
  </div>

  <div class="footer">
    <p>stonkbro backlog &middot; auto-generated from <a href="https://github.com/kbrovibes/stonkbro/blob/main/BACKLOG.md">BACKLOG.md</a></p>
  </div>
</body>
</html>`;
}

// Main
const md = fs.readFileSync(BACKLOG_PATH, "utf8");
const sections = parseBacklog(md);
const html = generateHtml(sections);
fs.writeFileSync(OUTPUT_PATH, html);
console.log(`Generated ${OUTPUT_PATH} (${sections.done.length} done, ${sections.p1.length} P1, ${sections.p2.length} P2)`);
