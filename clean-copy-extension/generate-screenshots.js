const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const WIDTH = 1280;
const HEIGHT = 800;

function buildProtectedPageHTML() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin: 0; padding: 0; background: #202124; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

/* Chrome browser chrome */
.chrome-bar {
  height: 72px; background: #35363a; display: flex; flex-direction: column;
}
.chrome-tabs {
  height: 36px; display: flex; align-items: flex-end; padding: 0 8px;
}
.chrome-tab {
  height: 32px; background: #202124; border-radius: 8px 8px 0 0; padding: 0 16px;
  display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e8eaed; min-width: 280px;
}
.chrome-tab.inactive { background: #35363a; color: #9aa0a6; min-width: 160px; }
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
.chrome-extensions { display: flex; align-items: center; gap: 8px; margin-left: 8px; }
.ext-icon {
  width: 20px; height: 20px; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: bold;
}
.chrome-dots { color: #9aa0a6; font-size: 18px; padding: 4px 8px; }

/* Page content - article-style page */
.page-content {
  height: ${HEIGHT - 72}px;
  overflow: hidden;
  background: #ffffff;
}

.article-page {
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 32px;
  font-family: Georgia, 'Times New Roman', serif;
}

.article-site-name {
  font-family: -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #c41e3a;
  margin-bottom: 20px;
}

.article-title {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  color: #1a1a1a;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.article-subtitle {
  font-size: 20px;
  color: #555;
  line-height: 1.4;
  margin-bottom: 20px;
  font-weight: 400;
}

.article-byline {
  font-family: -apple-system, sans-serif;
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}
.article-byline strong { color: #333; }

.article-body p {
  font-size: 18px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 20px;
}

/* Selected text highlight */
.selected-text {
  background: #a78bfa40;
  border-bottom: 2px solid #a78bfa;
  padding: 2px 0;
}

/* Clean Copy active badge */
.cc-badge {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(26, 26, 46, 0.95);
  border: 1px solid rgba(167, 139, 250, 0.4);
  color: #a78bfa;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  z-index: 100;
}
.cc-badge-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
}

/* Right-click context menu */
.context-menu {
  position: absolute;
  top: 320px;
  left: 440px;
  width: 220px;
  background: #f8f8f8;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  font-family: -apple-system, sans-serif;
  font-size: 13px;
  z-index: 200;
  overflow: hidden;
}
.ctx-item {
  padding: 6px 16px;
  color: #333;
  display: flex;
  justify-content: space-between;
}
.ctx-item:hover, .ctx-highlight {
  background: #4a8df8;
  color: white;
}
.ctx-shortcut { color: #999; font-size: 12px; }
.ctx-highlight .ctx-shortcut { color: rgba(255,255,255,0.7); }
.ctx-separator {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}
</style>
</head>
<body>
<div class="chrome-bar">
  <div class="chrome-tabs">
    <div class="chrome-tab">
      <span style="font-size:14px;color:#c41e3a;">T</span>
      <span>The Future of AI in Healthcare - TechReview</span>
      <span class="tab-close">\u00D7</span>
    </div>
    <div class="chrome-tab inactive">
      <span style="font-size:14px;">\uD83D\uDD0D</span>
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
      <span style="color:#e8eaed;">www.techreview.com</span><span style="color:#9aa0a6;">/articles/future-of-ai-healthcare</span>
    </div>
    <div class="chrome-extensions">
      <div class="ext-icon" style="background:#7c3aed;color:white;font-size:9px;">\u2702</div>
    </div>
    <span class="chrome-dots">\u22EE</span>
  </div>
</div>
<div class="page-content" style="position:relative;">
  <div class="article-page">
    <div class="article-site-name">TechReview</div>
    <h1 class="article-title">The Future of AI in Healthcare: How Machine Learning Is Transforming Patient Care</h1>
    <p class="article-subtitle">From early diagnosis to personalized treatment plans, artificial intelligence is reshaping every aspect of modern medicine.</p>
    <div class="article-byline">By <strong>Dr. Sarah Mitchell</strong> | February 18, 2026 | 8 min read</div>
    <div class="article-body">
      <p>Artificial intelligence is no longer a futuristic concept in healthcare\u2014it\u2019s a present-day reality that\u2019s <span class="selected-text">fundamentally changing how physicians diagnose diseases, predict patient outcomes, and develop personalized treatment plans. Recent advances in deep learning have enabled AI systems</span> to analyze medical images with accuracy that rivals, and in some cases surpasses, human experts.</p>
      <p>A landmark study published in the New England Journal of Medicine demonstrated that AI algorithms could detect early-stage lung cancer from CT scans with 94.4% accuracy, compared to 88.2% for board-certified radiologists. These findings have profound implications for screening programs worldwide, potentially saving millions of lives through earlier intervention.</p>
    </div>
  </div>

  <!-- Right-click context menu -->
  <div class="context-menu">
    <div class="ctx-item">Back <span class="ctx-shortcut">Alt+\u2190</span></div>
    <div class="ctx-item">Forward <span class="ctx-shortcut">Alt+\u2192</span></div>
    <div class="ctx-item">Reload <span class="ctx-shortcut">\u2318R</span></div>
    <div class="ctx-separator"></div>
    <div class="ctx-item ctx-highlight">Copy <span class="ctx-shortcut">\u2318C</span></div>
    <div class="ctx-item">Select All <span class="ctx-shortcut">\u2318A</span></div>
    <div class="ctx-separator"></div>
    <div class="ctx-item">View Page Source <span class="ctx-shortcut">\u2318U</span></div>
    <div class="ctx-item">Inspect <span class="ctx-shortcut">\u2318\u21E7I</span></div>
  </div>

  <!-- Clean Copy badge -->
  <div class="cc-badge">
    <span class="cc-badge-dot"></span>
    Clean Copy Active \u2014 Restrictions removed
  </div>
</div>
</body></html>`;
}

function buildPopupScreenshot() {
  const popupCSS = fs.readFileSync(path.join(__dirname, 'popup.css'), 'utf8');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin: 0; padding: 0; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

.chrome-bar {
  height: 72px; background: #35363a; display: flex; flex-direction: column;
}
.chrome-tabs {
  height: 36px; display: flex; align-items: flex-end; padding: 0 8px;
}
.chrome-tab {
  height: 32px; background: #202124; border-radius: 8px 8px 0 0; padding: 0 16px;
  display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e8eaed; min-width: 280px;
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
.chrome-extensions { display: flex; align-items: center; gap: 8px; margin-left: 8px; }
.ext-icon-active {
  width: 20px; height: 20px; border-radius: 3px;
  background: #7c3aed; color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: bold;
  box-shadow: 0 0 0 2px #a78bfa;
}
.chrome-dots { color: #9aa0a6; font-size: 18px; padding: 4px 8px; }

.page-container {
  position: relative;
  height: ${HEIGHT - 72}px;
  overflow: hidden;
}

.bg-page {
  position: absolute;
  inset: 0;
  background: #fff;
  filter: brightness(0.5);
  padding: 40px;
  max-width: 780px;
  margin: 0 auto;
}
.bg-title { font-size: 32px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; font-family: Georgia, serif; }
.bg-subtitle { font-size: 18px; color: #555; margin-bottom: 16px; font-family: Georgia, serif; }
.bg-text { font-size: 16px; line-height: 1.8; color: #333; font-family: Georgia, serif; }

/* Popup overlay */
.popup-overlay {
  position: absolute;
  top: 4px;
  right: 80px;
  width: 320px;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
  overflow: hidden;
  z-index: 1000;
}
.popup-overlay::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 30px;
  width: 12px;
  height: 12px;
  background: #1a1a2e;
  transform: rotate(45deg);
  border-left: 1px solid rgba(255,255,255,0.1);
  border-top: 1px solid rgba(255,255,255,0.1);
}

/* Toggle switch inline */
.toggle-sw {
  position: relative;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}
.toggle-sw-on {
  position: absolute;
  inset: 0;
  background: #7c3aed;
  border-radius: 11px;
}
.toggle-sw-on .knob {
  position: absolute;
  top: 3px;
  left: 21px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
}
.toggle-sw-off {
  position: absolute;
  inset: 0;
  background: #374151;
  border-radius: 11px;
}
.toggle-sw-off .knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: #9ca3af;
  border-radius: 50%;
}
</style>
</head>
<body>
<div class="chrome-bar">
  <div class="chrome-tabs">
    <div class="chrome-tab">
      <span style="font-size:14px;color:#c41e3a;">T</span>
      <span>The Future of AI in Healthcare - TechReview</span>
      <span class="tab-close">\u00D7</span>
    </div>
  </div>
  <div class="chrome-nav">
    <span class="chrome-nav-btn">\u2190</span>
    <span class="chrome-nav-btn">\u2192</span>
    <span class="chrome-nav-btn">\u21BB</span>
    <div class="chrome-url-bar">
      <span class="lock">\uD83D\uDD12</span>
      <span style="color:#e8eaed;">www.techreview.com</span><span style="color:#9aa0a6;">/articles/future-of-ai-healthcare</span>
    </div>
    <div class="chrome-extensions">
      <div class="ext-icon-active">\u2702</div>
    </div>
    <span class="chrome-dots">\u22EE</span>
  </div>
</div>
<div class="page-container">
  <div class="bg-page">
    <div style="font-family:-apple-system,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#c41e3a;margin-bottom:20px;">TechReview</div>
    <div class="bg-title">The Future of AI in Healthcare</div>
    <div class="bg-subtitle">How Machine Learning Is Transforming Patient Care</div>
    <div class="bg-text">Artificial intelligence is no longer a futuristic concept in healthcare\u2014it\u2019s a present-day reality that\u2019s fundamentally changing how physicians diagnose diseases...</div>
  </div>

  <div class="popup-overlay">
    <div style="padding:16px;background:#1a1a2e;color:#e0e0e0;">
      <header style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:32px;height:32px;border-radius:6px;background:#7c3aed;display:flex;align-items:center;justify-content:center;font-size:16px;color:white;">\u2702</div>
        <h1 style="font-size:18px;font-weight:700;color:#ffffff;margin:0;letter-spacing:-0.3px;">Clean Copy</h1>
      </header>

      <div style="background:#16213e;border-radius:8px;padding:8px 12px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
        <span style="color:#8888aa;font-size:12px;">Current site:</span>
        <span style="color:#a78bfa;font-size:13px;font-weight:600;">www.techreview.com</span>
      </div>

      <!-- Main toggle -->
      <div style="background:#16213e;border-radius:8px;padding:10px 12px;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:14px;font-weight:600;color:#e0e0e0;">Global Enable</div>
          <div style="font-size:11px;color:#6b7280;margin-top:1px;">Master on/off switch</div>
        </div>
        <div class="toggle-sw"><div class="toggle-sw-on"><div class="knob"></div></div></div>
      </div>

      <div style="height:1px;background:#2d2d4a;margin:10px 0;"></div>

      <!-- Feature toggles -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
        <span style="font-size:13px;font-weight:500;">Enable Right-Click</span>
        <div class="toggle-sw"><div class="toggle-sw-on"><div class="knob"></div></div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
        <span style="font-size:13px;font-weight:500;">Enable Copy</span>
        <div class="toggle-sw"><div class="toggle-sw-on"><div class="knob"></div></div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
        <span style="font-size:13px;font-weight:500;">Enable Selection</span>
        <div class="toggle-sw"><div class="toggle-sw-on"><div class="knob"></div></div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
        <span style="font-size:13px;font-weight:500;">Enable Paste</span>
        <div class="toggle-sw"><div class="toggle-sw-on"><div class="knob"></div></div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
        <div>
          <div style="font-size:13px;font-weight:500;">Clean Paste</div>
          <div style="font-size:11px;color:#6b7280;margin-top:1px;">Strip formatting on paste</div>
        </div>
        <div class="toggle-sw"><div class="toggle-sw-off"><div class="knob"></div></div></div>
      </div>

      <div style="height:1px;background:#2d2d4a;margin:10px 0;"></div>

      <!-- Site toggle -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
        <div>
          <div style="font-size:13px;font-weight:500;">Enable for this site</div>
          <div style="font-size:11px;color:#6b7280;margin-top:1px;">www.techreview.com</div>
        </div>
        <div class="toggle-sw"><div class="toggle-sw-on"><div class="knob"></div></div></div>
      </div>

      <div style="text-align:center;padding-top:8px;">
        <span style="font-size:11px;color:#4a4a6a;">v1.0.0</span>
      </div>
    </div>
  </div>
</div>
</body></html>`;
}

function buildBeforeAfterHTML() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin: 0; padding: 0; background: #202124; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

.chrome-bar {
  height: 72px; background: #35363a; display: flex; flex-direction: column;
}
.chrome-tabs {
  height: 36px; display: flex; align-items: flex-end; padding: 0 8px;
}
.chrome-tab {
  height: 32px; background: #202124; border-radius: 8px 8px 0 0; padding: 0 16px;
  display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e8eaed; min-width: 280px;
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
.chrome-extensions { display: flex; align-items: center; gap: 8px; margin-left: 8px; }
.ext-icon {
  width: 20px; height: 20px; border-radius: 3px;
  background: #7c3aed; color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: bold;
}
.chrome-dots { color: #9aa0a6; font-size: 18px; padding: 4px 8px; }

.page-content {
  height: ${HEIGHT - 72}px;
  display: flex;
  background: #f5f5f5;
}

.split-panel {
  flex: 1;
  padding: 32px;
  position: relative;
}

.split-panel.before {
  background: #fafafa;
  border-right: 3px solid #e0e0e0;
}

.split-panel.after {
  background: #fafafa;
}

.panel-label {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 6px 20px;
  border-radius: 20px;
  z-index: 10;
}
.panel-label.before-label {
  background: #fee2e2;
  color: #dc2626;
}
.panel-label.after-label {
  background: #dcfce7;
  color: #16a34a;
}

.article-preview {
  margin-top: 48px;
  font-family: Georgia, serif;
}

.article-preview .site-name {
  font-family: -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #c41e3a;
  margin-bottom: 16px;
}

.article-preview h2 {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 10px;
  line-height: 1.2;
}

.article-preview .byline {
  font-family: -apple-system, sans-serif;
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
}

.article-preview p {
  font-size: 16px;
  line-height: 1.7;
  color: #333;
  margin-bottom: 14px;
}

/* Before panel: no-select cursor and restrictions */
.before .article-preview {
  cursor: not-allowed;
  user-select: none;
  -webkit-user-select: none;
}

.no-select-overlay {
  position: absolute;
  top: 200px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(220, 38, 38, 0.1);
  border: 2px dashed #dc2626;
  border-radius: 12px;
  padding: 20px 32px;
  text-align: center;
  font-family: -apple-system, sans-serif;
  z-index: 5;
}
.no-select-overlay .icon { font-size: 32px; margin-bottom: 8px; }
.no-select-overlay .msg { font-size: 14px; color: #dc2626; font-weight: 600; }
.no-select-overlay .sub { font-size: 12px; color: #999; margin-top: 4px; }

/* After panel: selected text */
.selected-text {
  background: #a78bfa40;
  border-bottom: 2px solid #a78bfa;
}

.after .cc-active-indicator {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(26, 26, 46, 0.95);
  border: 1px solid rgba(167, 139, 250, 0.4);
  color: #a78bfa;
  padding: 6px 12px;
  border-radius: 6px;
  font-family: -apple-system, sans-serif;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cc-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }

/* Divider arrow */
.divider-arrow {
  position: absolute;
  top: 50%;
  left: -18px;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #7c3aed;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
}
</style>
</head>
<body>
<div class="chrome-bar">
  <div class="chrome-tabs">
    <div class="chrome-tab">
      <span style="font-size:14px;color:#c41e3a;">T</span>
      <span>The Future of AI in Healthcare - TechReview</span>
      <span class="tab-close">\u00D7</span>
    </div>
  </div>
  <div class="chrome-nav">
    <span class="chrome-nav-btn">\u2190</span>
    <span class="chrome-nav-btn">\u2192</span>
    <span class="chrome-nav-btn">\u21BB</span>
    <div class="chrome-url-bar">
      <span class="lock">\uD83D\uDD12</span>
      <span style="color:#e8eaed;">www.techreview.com</span><span style="color:#9aa0a6;">/articles/future-of-ai-healthcare</span>
    </div>
    <div class="chrome-extensions">
      <div class="ext-icon">\u2702</div>
    </div>
    <span class="chrome-dots">\u22EE</span>
  </div>
</div>
<div class="page-content">
  <div class="split-panel before">
    <div class="panel-label before-label">\u2718 Without Clean Copy</div>
    <div class="article-preview">
      <div class="site-name">TechReview</div>
      <h2>The Future of AI in Healthcare</h2>
      <div class="byline">By Dr. Sarah Mitchell | Feb 18, 2026</div>
      <p>Artificial intelligence is no longer a futuristic concept in healthcare\u2014it\u2019s a present-day reality that\u2019s fundamentally changing how physicians diagnose diseases...</p>
      <p>A landmark study published in the New England Journal of Medicine demonstrated that AI algorithms could detect early-stage lung cancer...</p>
    </div>
    <div class="no-select-overlay">
      <div class="icon">\uD83D\uDEAB</div>
      <div class="msg">Text selection disabled</div>
      <div class="sub">Right-click and copy blocked by site</div>
    </div>
  </div>
  <div class="split-panel after">
    <div class="divider-arrow">\u2192</div>
    <div class="panel-label after-label">\u2714 With Clean Copy</div>
    <div class="article-preview">
      <div class="site-name">TechReview</div>
      <h2>The Future of AI in Healthcare</h2>
      <div class="byline">By Dr. Sarah Mitchell | Feb 18, 2026</div>
      <p>Artificial intelligence is no longer a futuristic concept in healthcare\u2014it\u2019s a present-day reality that\u2019s <span class="selected-text">fundamentally changing how physicians diagnose diseases, predict patient outcomes, and develop personalized</span> treatment plans.</p>
      <p>A landmark study published in the New England Journal of Medicine demonstrated that AI algorithms could detect early-stage lung cancer...</p>
    </div>
    <div class="cc-active-indicator">
      <span class="cc-dot"></span>
      Clean Copy Active
    </div>
  </div>
</div>
</body></html>`;
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    // Screenshot 1: Protected page with right-click menu and selection enabled
    const page1 = await browser.newPage();
    await page1.setViewport({ width: WIDTH, height: HEIGHT });
    await page1.setContent(buildProtectedPageHTML(), { waitUntil: 'load' });
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-1-selection-enabled.png') });
    await page1.close();
    console.log('Screenshot 1: Selection enabled - done');

    // Screenshot 2: Popup overlay
    const page2 = await browser.newPage();
    await page2.setViewport({ width: WIDTH, height: HEIGHT });
    await page2.setContent(buildPopupScreenshot(), { waitUntil: 'load' });
    await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-2-popup.png') });
    await page2.close();
    console.log('Screenshot 2: Popup - done');

    // Screenshot 3: Before/After comparison
    const page3 = await browser.newPage();
    await page3.setViewport({ width: WIDTH, height: HEIGHT });
    await page3.setContent(buildBeforeAfterHTML(), { waitUntil: 'load' });
    await page3.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-3-before-after.png') });
    await page3.close();
    console.log('Screenshot 3: Before/After - done');

  } finally {
    await browser.close();
  }

  console.log(`\nAll screenshots saved to ${SCREENSHOTS_DIR}`);
}

run().catch(console.error);
