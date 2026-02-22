const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const WIDTH = 1280;
const HEIGHT = 800;

// Sample JSON data that looks realistic - a weather API response
const sampleJSON = JSON.stringify({
  "location": {
    "city": "San Francisco",
    "state": "California",
    "country": "US",
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "timezone": "America/Los_Angeles"
  },
  "current": {
    "temperature": 68.4,
    "feels_like": 65.2,
    "humidity": 72,
    "wind_speed": 12.5,
    "wind_direction": "NW",
    "uv_index": 6,
    "visibility": 10.0,
    "condition": "Partly Cloudy",
    "icon": "partly-cloudy-day",
    "last_updated": "2026-02-21T14:30:00-08:00"
  },
  "forecast": [
    {
      "date": "2026-02-22",
      "high": 71.0,
      "low": 55.3,
      "condition": "Sunny",
      "precipitation_chance": 10,
      "sunrise": "06:52",
      "sunset": "17:48"
    },
    {
      "date": "2026-02-23",
      "high": 69.5,
      "low": 54.1,
      "condition": "Partly Cloudy",
      "precipitation_chance": 25,
      "sunrise": "06:51",
      "sunset": "17:49"
    },
    {
      "date": "2026-02-24",
      "high": 63.2,
      "low": 51.8,
      "condition": "Light Rain",
      "precipitation_chance": 65,
      "sunrise": "06:50",
      "sunset": "17:50"
    }
  ],
  "alerts": [],
  "api": {
    "version": "2.1.0",
    "calls_remaining": 847,
    "rate_limit": 1000
  }
}, null, 2);

// Build full formatted page HTML using the extension's own styles
function buildFormattedPageHTML(theme) {
  const data = JSON.parse(sampleJSON);

  function renderValue(val, depth = 0) {
    if (val === null) return `<span class="jvp-value jvp-type-null">null</span>`;
    if (typeof val === 'boolean') return `<span class="jvp-value jvp-type-boolean">${val}</span>`;
    if (typeof val === 'number') return `<span class="jvp-value jvp-type-number">${val}</span>`;
    if (typeof val === 'string') return `<span class="jvp-value jvp-type-string">"${val.replace(/"/g, '&quot;').replace(/</g, '&lt;')}"</span>`;

    const isArray = Array.isArray(val);
    const entries = isArray ? val.map((v, i) => [i, v]) : Object.entries(val);
    const open = isArray ? '[' : '{';
    const close = isArray ? ']' : '}';
    const count = entries.length;
    const collapsed = depth >= 3;

    let html = `<div class="jvp-node jvp-collapsible${collapsed ? ' jvp-collapsed' : ''}" data-depth="${depth}">`;
    html += `<div class="jvp-line jvp-line-header">`;
    html += `<span class="jvp-toggle">${collapsed ? '\u25B6' : '\u25BC'}</span>`;
    html += `<span class="jvp-bracket">${open}</span>`;
    html += `<span class="jvp-badge">${count} ${isArray ? (count === 1 ? 'item' : 'items') : (count === 1 ? 'key' : 'keys')}</span>`;
    html += `<span class="jvp-preview"> \u2026 ${close}</span>`;
    html += `</div>`;
    html += `<div class="jvp-children">`;

    entries.forEach(([key, v], idx) => {
      if (typeof v === 'object' && v !== null) {
        html += `<div class="jvp-line jvp-line-header">`;
        html += `<span class="jvp-toggle">${depth + 1 >= 3 ? '\u25B6' : '\u25BC'}</span>`;
        html += `<span class="jvp-key">${key}</span>`;
        html += `<span class="jvp-colon">: </span>`;
        html += `</div>`;
        html += renderValue(v, depth + 1);
      } else {
        html += `<div class="jvp-line jvp-leaf" data-depth="${depth + 1}">`;
        html += `<span class="jvp-toggle jvp-toggle-spacer"> </span>`;
        html += `<span class="jvp-key">${key}</span>`;
        html += `<span class="jvp-colon">: </span>`;
        html += renderValue(v, depth + 1);
        if (idx < entries.length - 1) html += `<span class="jvp-comma">,</span>`;
        html += `</div>`;
      }
    });

    html += `</div>`;
    html += `<div class="jvp-line jvp-closing-line"><span class="jvp-bracket">${close}</span></div>`;
    html += `</div>`;
    return html;
  }

  // Render a proper structured tree
  function renderTree(data) {
    const isArray = Array.isArray(data);
    const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);
    const open = isArray ? '[' : '{';
    const close = isArray ? ']' : '}';
    let lines = [];
    let lineNum = 1;

    function addLine(indent, content) {
      lines.push(`<div class="jvp-line jvp-leaf" style="padding-left:${indent * 20}px">${content}</div>`);
      lineNum++;
    }

    function renderObj(obj, indent, isLast) {
      const isArr = Array.isArray(obj);
      const ents = isArr ? obj.map((v, i) => [String(i), v]) : Object.entries(obj);
      const o = isArr ? '[' : '{';
      const c = isArr ? ']' : '}';

      ents.forEach(([k, v], idx) => {
        const comma = idx < ents.length - 1 ? '<span class="jvp-comma">,</span>' : '';
        const keyHtml = `<span class="jvp-key">${isArr ? k : '"' + k + '"'}</span><span class="jvp-colon">: </span>`;

        if (v === null) {
          addLine(indent, keyHtml + `<span class="jvp-value jvp-type-null">null</span>${comma}`);
        } else if (typeof v === 'boolean') {
          addLine(indent, keyHtml + `<span class="jvp-value jvp-type-boolean">${v}</span>${comma}`);
        } else if (typeof v === 'number') {
          addLine(indent, keyHtml + `<span class="jvp-value jvp-type-number">${v}</span>${comma}`);
        } else if (typeof v === 'string') {
          const escaped = v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
          addLine(indent, keyHtml + `<span class="jvp-value jvp-type-string">"${escaped}"</span>${comma}`);
        } else if (typeof v === 'object') {
          const isChildArr = Array.isArray(v);
          const childEntries = isChildArr ? v : Object.entries(v);
          const childCount = isChildArr ? v.length : Object.keys(v).length;
          const co = isChildArr ? '[' : '{';
          const cc = isChildArr ? ']' : '}';

          addLine(indent, `${keyHtml}<span class="jvp-bracket">${co}</span> <span class="jvp-badge">${childCount} ${isChildArr ? 'items' : 'keys'}</span>`);
          renderObj(v, indent + 1, false);
          addLine(indent, `<span class="jvp-bracket">${cc}</span>${comma}`);
        }
      });
    }

    // Opening brace
    lines.push(`<div class="jvp-line jvp-leaf"><span class="jvp-bracket">${open}</span> <span class="jvp-badge">${Object.keys(data).length} keys</span></div>`);
    renderObj(data, 1, true);
    lines.push(`<div class="jvp-line jvp-leaf"><span class="jvp-bracket">${close}</span></div>`);

    // Generate line numbers
    const lineNums = Array.from({ length: lines.length }, (_, i) => i + 1).join('\n');

    return { tree: lines.join('\n'), lineNumbers: lineNums, totalLines: lines.length };
  }

  const { tree, lineNumbers, totalLines } = renderTree(data);
  const size = new Blob ? '2.1 KB' : '2.1 KB';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8')}

/* Chrome browser chrome simulation */
body { margin: 0; padding: 0; background: #202124; }
.chrome-bar {
  height: 72px;
  background: #35363a;
  display: flex;
  flex-direction: column;
  padding: 0;
}
.chrome-tabs {
  height: 36px;
  display: flex;
  align-items: flex-end;
  padding: 0 8px;
  gap: 0;
}
.chrome-tab {
  height: 32px;
  background: #202124;
  border-radius: 8px 8px 0 0;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #e8eaed;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-width: 200px;
  position: relative;
}
.chrome-tab.inactive {
  background: #35363a;
  color: #9aa0a6;
}
.chrome-tab .tab-close {
  margin-left: auto;
  color: #9aa0a6;
  font-size: 14px;
}
.chrome-tab .tab-icon {
  width: 16px;
  height: 16px;
  background: #bb9af7;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #1a1b26;
  font-weight: bold;
  font-family: monospace;
}
.chrome-nav {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 6px;
  background: #202124;
}
.chrome-nav-btn {
  color: #9aa0a6;
  font-size: 18px;
  padding: 4px;
  cursor: default;
}
.chrome-url-bar {
  flex: 1;
  height: 28px;
  background: #35363a;
  border-radius: 14px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  color: #e8eaed;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.chrome-url-bar .lock {
  color: #9aa0a6;
  margin-right: 8px;
  font-size: 14px;
}
.chrome-url-bar .url-host { color: #e8eaed; }
.chrome-url-bar .url-path { color: #9aa0a6; }
.chrome-dots {
  color: #9aa0a6;
  font-size: 18px;
  padding: 4px 8px;
}
.chrome-extensions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}
.chrome-ext-icon {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
}
.page-content {
  height: ${HEIGHT - 72}px;
  overflow: hidden;
}
</style>
</head>
<body>
<div class="chrome-bar">
  <div class="chrome-tabs">
    <div class="chrome-tab">
      <span class="tab-icon">{}</span>
      <span>api.weather.io/v2/forecast</span>
      <span class="tab-close">\u00D7</span>
    </div>
    <div class="chrome-tab inactive">
      <span style="font-size:14px">\uD83D\uDD0D</span>
      <span>Google</span>
      <span class="tab-close">\u00D7</span>
    </div>
  </div>
  <div class="chrome-nav">
    <span class="chrome-nav-btn">\u2190</span>
    <span class="chrome-nav-btn">\u2192</span>
    <span class="chrome-nav-btn">\u21BB</span>
    <div class="chrome-url-bar">
      <span class="lock">\uD83D\uDD12</span>
      <span class="url-host">api.weather.io</span><span class="url-path">/v2/forecast?city=san-francisco&units=imperial</span>
    </div>
    <div class="chrome-extensions">
      <div class="chrome-ext-icon" style="background:#bb9af7;color:#1a1b26;font-family:monospace;">{}</div>
    </div>
    <span class="chrome-dots">\u22EE</span>
  </div>
</div>
<div class="page-content">
  <div id="jvp-root" class="jvp-theme-${theme}" style="min-height:100%;overflow:auto;">
    <div class="jvp-toolbar">
      <div class="jvp-toolbar-left">
        <span class="jvp-logo">{}</span>
        <span class="jvp-title">JSONView Pro</span>
        <span class="jvp-meta">Object \u00B7 2.1 KB</span>
      </div>
      <div class="jvp-toolbar-right">
        <input type="text" class="jvp-search" placeholder="Search keys or values\u2026" readonly />
        <button class="jvp-btn">\u229E Expand</button>
        <button class="jvp-btn">\u229F Collapse</button>
        <button class="jvp-btn">\uD83D\uDCCB Raw</button>
        <button class="jvp-btn">\uD83D\uDCCB Pretty</button>
        <button class="jvp-btn">\uD83C\uDF13 Theme</button>
      </div>
    </div>
    <div class="jvp-content">
      <div class="jvp-line-numbers" style="white-space:pre">${lineNumbers}</div>
      <div class="jvp-tree" id="jvp-tree">
        ${tree}
      </div>
    </div>
  </div>
</div>
</body></html>`;
}

// Build the popup overlay screenshot
function buildPopupScreenshot() {
  const popupCSS = fs.readFileSync(path.join(__dirname, 'popup.css'), 'utf8');
  const pageCSS = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin: 0; padding: 0; background: #202124; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

.chrome-bar {
  height: 72px;
  background: #35363a;
  display: flex;
  flex-direction: column;
}
.chrome-tabs {
  height: 36px;
  display: flex;
  align-items: flex-end;
  padding: 0 8px;
}
.chrome-tab {
  height: 32px;
  background: #202124;
  border-radius: 8px 8px 0 0;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #e8eaed;
  min-width: 200px;
}
.chrome-tab .tab-icon {
  width: 16px; height: 16px; background: #bb9af7; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: #1a1b26; font-weight: bold; font-family: monospace;
}
.chrome-tab .tab-close { margin-left: auto; color: #9aa0a6; font-size: 14px; }
.chrome-nav {
  height: 36px; display: flex; align-items: center; padding: 0 8px; gap: 6px; background: #202124;
}
.chrome-nav-btn { color: #9aa0a6; font-size: 18px; padding: 4px; }
.chrome-url-bar {
  flex: 1; height: 28px; background: #35363a; border-radius: 14px;
  display: flex; align-items: center; padding: 0 12px; font-size: 13px; color: #e8eaed;
}
.chrome-url-bar .lock { color: #9aa0a6; margin-right: 8px; font-size: 14px; }
.chrome-url-bar .url-host { color: #e8eaed; }
.chrome-url-bar .url-path { color: #9aa0a6; }
.chrome-extensions { display: flex; align-items: center; gap: 8px; margin-left: 8px; }
.ext-icon-active {
  width: 20px; height: 20px; background: #bb9af7; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #1a1b26; font-weight: bold; font-family: monospace;
  box-shadow: 0 0 0 2px #7aa2f7;
}
.chrome-dots { color: #9aa0a6; font-size: 18px; padding: 4px 8px; }

.page-container {
  position: relative;
  height: ${HEIGHT - 72}px;
  overflow: hidden;
}

/* Background page content - dimmed */
.bg-page {
  position: absolute;
  inset: 0;
  filter: brightness(0.4);
}

${pageCSS}

/* Popup overlay */
.popup-overlay {
  position: absolute;
  top: 4px;
  right: 80px;
  width: 300px;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
  overflow: hidden;
  z-index: 1000;
}

/* Popup arrow */
.popup-overlay::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 24px;
  width: 12px;
  height: 12px;
  background: #1a1b26;
  transform: rotate(45deg);
  border-left: 1px solid rgba(255,255,255,0.1);
  border-top: 1px solid rgba(255,255,255,0.1);
}

${popupCSS.replace(/body\s*\{[^}]*width:\s*300px;/g, 'body { width: auto;')}

.popup-content {
  background: #1a1b26;
}
</style>
</head>
<body>
<div class="chrome-bar">
  <div class="chrome-tabs">
    <div class="chrome-tab">
      <span class="tab-icon">{}</span>
      <span>api.weather.io/v2/forecast</span>
      <span class="tab-close">\u00D7</span>
    </div>
  </div>
  <div class="chrome-nav">
    <span class="chrome-nav-btn">\u2190</span>
    <span class="chrome-nav-btn">\u2192</span>
    <span class="chrome-nav-btn">\u21BB</span>
    <div class="chrome-url-bar">
      <span class="lock">\uD83D\uDD12</span>
      <span class="url-host">api.weather.io</span><span class="url-path">/v2/forecast?city=san-francisco</span>
    </div>
    <div class="chrome-extensions">
      <div class="ext-icon-active">{}</div>
    </div>
    <span class="chrome-dots">\u22EE</span>
  </div>
</div>
<div class="page-container">
  <div class="bg-page">
    <div id="jvp-root" class="jvp-theme-dark" style="min-height:100%">
      <div class="jvp-toolbar">
        <div class="jvp-toolbar-left">
          <span class="jvp-logo">{}</span>
          <span class="jvp-title">JSONView Pro</span>
          <span class="jvp-meta">Object \u00B7 2.1 KB</span>
        </div>
      </div>
      <div class="jvp-content">
        <div class="jvp-line-numbers" style="white-space:pre">1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14</div>
        <div class="jvp-tree">
          <div class="jvp-line jvp-leaf"><span class="jvp-bracket">{</span></div>
          <div class="jvp-line jvp-leaf" style="padding-left:20px"><span class="jvp-key">"location"</span><span class="jvp-colon">: </span><span class="jvp-bracket">{</span> <span class="jvp-badge">5 keys</span></div>
          <div class="jvp-line jvp-leaf" style="padding-left:40px"><span class="jvp-key">"city"</span><span class="jvp-colon">: </span><span class="jvp-value jvp-type-string">"San Francisco"</span><span class="jvp-comma">,</span></div>
          <div class="jvp-line jvp-leaf" style="padding-left:40px"><span class="jvp-key">"state"</span><span class="jvp-colon">: </span><span class="jvp-value jvp-type-string">"California"</span><span class="jvp-comma">,</span></div>
          <div class="jvp-line jvp-leaf" style="padding-left:40px"><span class="jvp-key">"country"</span><span class="jvp-colon">: </span><span class="jvp-value jvp-type-string">"US"</span><span class="jvp-comma">,</span></div>
          <div class="jvp-line jvp-leaf" style="padding-left:40px"><span class="jvp-key">"coordinates"</span><span class="jvp-colon">: </span><span class="jvp-bracket">{</span> <span class="jvp-badge">2 keys</span></div>
          <div class="jvp-line jvp-leaf" style="padding-left:60px"><span class="jvp-key">"latitude"</span><span class="jvp-colon">: </span><span class="jvp-value jvp-type-number">37.7749</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="popup-overlay">
    <div class="popup-content">
      <div class="popup" style="padding:16px;background:#1a1b26;color:#c0caf5;">
        <div class="header" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #2f3348;">
          <span class="logo" style="font-size:24px;font-weight:700;color:#bb9af7;font-family:monospace;">{}</span>
          <h1 style="font-size:16px;font-weight:600;color:#c0caf5;margin:0;">JSONView Pro</h1>
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#565f89;margin-bottom:6px;font-weight:600;">Default Theme</label>
          <div style="display:flex;gap:4px;">
            <button style="flex:1;padding:6px 10px;border:1px solid #7aa2f7;background:#7aa2f7;color:#1a1b26;border-radius:4px;font-size:12px;cursor:pointer;">\uD83C\uDF19 Dark</button>
            <button style="flex:1;padding:6px 10px;border:1px solid #3b4261;background:#24283b;color:#c0caf5;border-radius:4px;font-size:12px;cursor:pointer;">\u2600\uFE0F Light</button>
          </div>
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#565f89;margin-bottom:6px;font-weight:600;">Default Collapse Depth</label>
          <div style="display:flex;gap:4px;">
            <button style="flex:1;padding:6px 10px;border:1px solid #3b4261;background:#24283b;color:#c0caf5;border-radius:4px;font-size:12px;">1</button>
            <button style="flex:1;padding:6px 10px;border:1px solid #7aa2f7;background:#7aa2f7;color:#1a1b26;border-radius:4px;font-size:12px;">2</button>
            <button style="flex:1;padding:6px 10px;border:1px solid #3b4261;background:#24283b;color:#c0caf5;border-radius:4px;font-size:12px;">3</button>
            <button style="flex:1;padding:6px 10px;border:1px solid #3b4261;background:#24283b;color:#c0caf5;border-radius:4px;font-size:12px;">All</button>
          </div>
        </div>
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;opacity:0.8;">Automatically format JSON pages</span>
            <div style="position:relative;display:inline-block;width:40px;height:22px;">
              <div style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#7aa2f7;border-radius:22px;">
                <div style="position:absolute;height:16px;width:16px;left:21px;bottom:3px;background:#c0caf5;border-radius:50%;"></div>
              </div>
            </div>
          </div>
        </div>
        <div style="background:#24283b;padding:12px;border-radius:6px;text-align:center;margin-bottom:12px;">
          <span style="font-size:24px;font-weight:700;color:#7aa2f7;display:block;">127</span>
          <span style="font-size:11px;color:#565f89;">Pages Formatted</span>
        </div>
        <div style="text-align:center;font-size:10px;color:#565f89;">JSONView Pro v1.0.0</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    // Screenshot 1: Dark theme formatted JSON
    const page1 = await browser.newPage();
    await page1.setViewport({ width: WIDTH, height: HEIGHT });
    const html1 = buildFormattedPageHTML('dark');
    await page1.setContent(html1, { waitUntil: 'load' });
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-1-dark-theme.png') });
    await page1.close();
    console.log('Screenshot 1: Dark theme - done');

    // Screenshot 2: Light theme formatted JSON
    const page2 = await browser.newPage();
    await page2.setViewport({ width: WIDTH, height: HEIGHT });
    const html2 = buildFormattedPageHTML('light');
    await page2.setContent(html2, { waitUntil: 'load' });
    await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-2-light-theme.png') });
    await page2.close();
    console.log('Screenshot 2: Light theme - done');

    // Screenshot 3: Popup overlay
    const page3 = await browser.newPage();
    await page3.setViewport({ width: WIDTH, height: HEIGHT });
    const html3 = buildPopupScreenshot();
    await page3.setContent(html3, { waitUntil: 'load' });
    await page3.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-3-popup.png') });
    await page3.close();
    console.log('Screenshot 3: Popup - done');

  } finally {
    await browser.close();
  }

  console.log(`\nAll screenshots saved to ${SCREENSHOTS_DIR}`);
}

run().catch(console.error);
