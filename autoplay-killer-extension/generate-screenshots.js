const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const WIDTH = 1280;
const HEIGHT = 800;

function buildVideoPageHTML() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin: 0; padding: 0; background: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

/* Chrome browser chrome */
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
  min-width: 240px;
}
.chrome-tab.inactive {
  background: #35363a;
  color: #9aa0a6;
  min-width: 160px;
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
.ext-icon {
  width: 20px; height: 20px; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: bold;
}
.chrome-dots { color: #9aa0a6; font-size: 18px; padding: 4px 8px; }

/* Video page layout - YouTube-like */
.page-content {
  height: ${HEIGHT - 72}px;
  display: flex;
  background: #0f0f0f;
  overflow: hidden;
}

.video-main {
  flex: 1;
  padding: 24px 24px 24px 24px;
  max-width: 860px;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

/* Simulated video frame - nature scene */
.video-frame {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a3a2a 0%, #0d2b1e 30%, #1a4a35 60%, #0d3a28 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Mountains */
.video-frame::before {
  content: '';
  position: absolute;
  bottom: 30%;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(135deg, #2d5a3d 0%, #1a4028 25%, #3a6b4a 50%, #1a4028 75%, #2d5a3d 100%);
  clip-path: polygon(0% 100%, 5% 60%, 15% 80%, 25% 40%, 35% 70%, 45% 30%, 55% 60%, 65% 20%, 75% 50%, 85% 35%, 95% 55%, 100% 45%, 100% 100%);
}

/* Sky gradient */
.video-frame::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, #1a2a3a 0%, #2a4a5a 60%, #3a5a4a 100%);
}

/* Autoplay blocked overlay */
.blocked-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  backdrop-filter: blur(3px);
}

.blocked-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.2);
  border: 3px solid #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.blocked-icon .pause-bars {
  display: flex;
  gap: 6px;
}

.blocked-icon .pause-bar {
  width: 8px;
  height: 28px;
  background: #ef4444;
  border-radius: 2px;
}

.blocked-text {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.blocked-subtext {
  color: #9ca3af;
  font-size: 13px;
  margin-bottom: 20px;
}

.play-anyway-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  padding: 10px 28px;
  border-radius: 24px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

/* Video controls bar */
.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 12px;
  z-index: 5;
}

.progress-bar {
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  position: relative;
}

.progress-bar::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0%;
  background: #ef4444;
  border-radius: 2px;
}

.ctrl-icon { color: #fff; font-size: 16px; }
.ctrl-time { color: #aaa; font-size: 12px; font-family: monospace; }

/* Video info */
.video-title {
  font-size: 18px;
  font-weight: 600;
  color: #f1f1f1;
  margin-bottom: 8px;
  line-height: 1.3;
}
.video-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.video-views { font-size: 13px; color: #aaa; }
.video-dot { color: #aaa; font-size: 10px; }
.video-date { font-size: 13px; color: #aaa; }

.channel-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.channel-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #4a90d9, #357abd);
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 16px;
}
.channel-name { color: #f1f1f1; font-size: 14px; font-weight: 500; }
.channel-subs { color: #aaa; font-size: 12px; }
.subscribe-btn {
  background: #fff;
  color: #0f0f0f;
  border: none;
  padding: 8px 16px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 600;
  margin-left: auto;
}

/* Sidebar */
.video-sidebar {
  width: 370px;
  padding: 24px 24px 24px 0;
  overflow: hidden;
}
.sidebar-heading {
  color: #f1f1f1;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
}
.sidebar-item {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.sidebar-thumb {
  width: 168px;
  height: 94px;
  border-radius: 8px;
  flex-shrink: 0;
  position: relative;
}
.sidebar-thumb .duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0,0,0,0.8);
  color: #fff;
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 2px;
}
.sidebar-info { flex: 1; }
.sidebar-title { color: #f1f1f1; font-size: 13px; font-weight: 500; line-height: 1.3; margin-bottom: 4px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sidebar-channel { color: #aaa; font-size: 12px; margin-bottom: 2px; }
.sidebar-views { color: #aaa; font-size: 12px; }

/* AutoPlay Killer notification toast */
.apk-toast {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(30, 30, 50, 0.95);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 20;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.apk-toast-icon {
  width: 28px; height: 28px; border-radius: 6px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: white; font-weight: bold;
}
.apk-toast-text { color: #e0e0e0; font-size: 13px; font-weight: 500; }
.apk-toast-count { color: #22c55e; font-weight: 700; }
</style>
</head>
<body>
<div class="chrome-bar">
  <div class="chrome-tabs">
    <div class="chrome-tab">
      <span style="font-size:14px;color:#ff0000;">\u25B6</span>
      <span>4K Nature Scenery | Relaxing Music - StreamTube</span>
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
      <span class="url-host">www.streamtube.com</span><span class="url-path">/watch?v=dQw4w9WgXcQ</span>
    </div>
    <div class="chrome-extensions">
      <div class="ext-icon" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;font-size:9px;">\u23F8</div>
    </div>
    <span class="chrome-dots">\u22EE</span>
  </div>
</div>
<div class="page-content">
  <div class="video-main">
    <div class="video-container">
      <div class="video-frame"></div>
      <div class="blocked-overlay">
        <div class="blocked-icon">
          <div class="pause-bars">
            <div class="pause-bar"></div>
            <div class="pause-bar"></div>
          </div>
        </div>
        <div class="blocked-text">Autoplay Blocked</div>
        <div class="blocked-subtext">AutoPlay Killer prevented this video from auto-playing</div>
        <button class="play-anyway-btn">\u25B6 Play Anyway</button>
      </div>
      <div class="video-controls">
        <span class="ctrl-icon">\u25B6</span>
        <span class="ctrl-time">0:00</span>
        <div class="progress-bar"></div>
        <span class="ctrl-time">32:15</span>
        <span class="ctrl-icon">\uD83D\uDD0A</span>
        <span class="ctrl-icon">\u2699</span>
        <span class="ctrl-icon">\u26F6</span>
      </div>
    </div>
    <div class="video-title">4K Nature Scenery | Beautiful Relaxing Music | Stress Relief Meditation</div>
    <div class="video-meta">
      <span class="video-views">2.4M views</span>
      <span class="video-dot">\u00B7</span>
      <span class="video-date">3 weeks ago</span>
    </div>
    <div class="channel-row">
      <div class="channel-avatar">N</div>
      <div>
        <div class="channel-name">NatureVibes 4K</div>
        <div class="channel-subs">1.2M subscribers</div>
      </div>
      <button class="subscribe-btn">Subscribe</button>
    </div>
  </div>
  <div class="video-sidebar">
    <div class="sidebar-heading">Up next</div>
    <div class="sidebar-item">
      <div class="sidebar-thumb" style="background:linear-gradient(135deg,#1a4a7a,#2a3a5a);">
        <span class="duration">15:42</span>
      </div>
      <div class="sidebar-info">
        <div class="sidebar-title">Ocean Waves for Deep Sleep - 8 Hours</div>
        <div class="sidebar-channel">Sleep Sounds</div>
        <div class="sidebar-views">892K views \u00B7 1 month ago</div>
      </div>
    </div>
    <div class="sidebar-item">
      <div class="sidebar-thumb" style="background:linear-gradient(135deg,#4a2a1a,#3a4a2a);">
        <span class="duration">28:33</span>
      </div>
      <div class="sidebar-info">
        <div class="sidebar-title">Morning Forest Walk - Cinematic 4K</div>
        <div class="sidebar-channel">WildEarth</div>
        <div class="sidebar-views">1.1M views \u00B7 2 weeks ago</div>
      </div>
    </div>
    <div class="sidebar-item">
      <div class="sidebar-thumb" style="background:linear-gradient(135deg,#1a2a4a,#3a2a4a);">
        <span class="duration">45:10</span>
      </div>
      <div class="sidebar-info">
        <div class="sidebar-title">Northern Lights in Real Time - Iceland</div>
        <div class="sidebar-channel">ArcticLens</div>
        <div class="sidebar-views">3.2M views \u00B7 5 days ago</div>
      </div>
    </div>
    <div class="sidebar-item">
      <div class="sidebar-thumb" style="background:linear-gradient(135deg,#2a4a3a,#1a3a4a);">
        <span class="duration">1:02:15</span>
      </div>
      <div class="sidebar-info">
        <div class="sidebar-title">Tropical Rainforest Ambience - Rain & Birds</div>
        <div class="sidebar-channel">Ambient Worlds</div>
        <div class="sidebar-views">5.7M views \u00B7 3 months ago</div>
      </div>
    </div>
  </div>

  <!-- Toast notification -->
  <div class="apk-toast">
    <div class="apk-toast-icon">\u23F8</div>
    <div class="apk-toast-text">\u2714 Autoplay blocked &mdash; <span class="apk-toast-count">14</span> blocked today</div>
  </div>
</div>
</body></html>`;
}

function buildPopupScreenshot() {
  const popupCSS = fs.readFileSync(path.join(__dirname, 'popup.css'), 'utf8');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { margin: 0; padding: 0; background: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

.chrome-bar {
  height: 72px; background: #35363a; display: flex; flex-direction: column;
}
.chrome-tabs {
  height: 36px; display: flex; align-items: flex-end; padding: 0 8px;
}
.chrome-tab {
  height: 32px; background: #202124; border-radius: 8px 8px 0 0; padding: 0 16px;
  display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e8eaed; min-width: 240px;
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
  width: 20px; height: 20px; border-radius: 3px;
  background: linear-gradient(135deg,#ef4444,#dc2626);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; color: white; font-weight: bold;
  box-shadow: 0 0 0 2px #22c55e;
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
  background: #0f0f0f;
  filter: brightness(0.4);
  padding: 24px;
}

/* Fake video page bg */
.fake-video {
  width: 65%;
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, #1a3a2a, #0d2b1e);
  border-radius: 12px;
  margin-bottom: 16px;
  position: relative;
}
.fake-title { color: #f1f1f1; font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.fake-meta { color: #aaa; font-size: 13px; }

/* Popup */
.popup-overlay {
  position: absolute;
  top: 4px;
  right: 80px;
  width: 340px;
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

${popupCSS.replace(/body\s*{[^}]*width:\s*\d+px;/g, 'body { width: auto;')}
.popup-inner { background: #1a1a2e; }
</style>
</head>
<body>
<div class="chrome-bar">
  <div class="chrome-tabs">
    <div class="chrome-tab">
      <span style="font-size:14px;color:#ff0000;">\u25B6</span>
      <span>4K Nature Scenery | Relaxing Music - StreamTube</span>
      <span class="tab-close">\u00D7</span>
    </div>
  </div>
  <div class="chrome-nav">
    <span class="chrome-nav-btn">\u2190</span>
    <span class="chrome-nav-btn">\u2192</span>
    <span class="chrome-nav-btn">\u21BB</span>
    <div class="chrome-url-bar">
      <span class="lock">\uD83D\uDD12</span>
      <span class="url-host">www.streamtube.com</span><span class="url-path">/watch?v=dQw4w9WgXcQ</span>
    </div>
    <div class="chrome-extensions">
      <div class="ext-icon-active">\u23F8</div>
    </div>
    <span class="chrome-dots">\u22EE</span>
  </div>
</div>
<div class="page-container">
  <div class="bg-page">
    <div class="fake-video"></div>
    <div class="fake-title">4K Nature Scenery | Beautiful Relaxing Music</div>
    <div class="fake-meta">2.4M views \u00B7 3 weeks ago</div>
  </div>

  <div class="popup-overlay">
    <div class="popup-inner">
      <div class="popup" style="padding:16px;background:#1a1a2e;color:#e0e0e0;">
        <header style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #2a2a4a;">
          <div style="width:32px;height:32px;border-radius:6px;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;font-size:16px;color:white;font-weight:bold;">\u23F8</div>
          <h1 style="font-size:16px;font-weight:700;color:#fff;margin:0;">AutoPlay Killer</h1>
        </header>

        <section style="margin-bottom:14px;">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:2px;">Current site</p>
          <p style="font-size:14px;font-weight:600;color:#fff;margin-bottom:10px;">www.streamtube.com</p>
          <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:13px;">
            <span>Block autoplay on this site</span>
            <div style="position:relative;width:40px;height:22px;">
              <div style="position:absolute;inset:0;background:#22c55e;border-radius:11px;">
                <div style="position:absolute;top:3px;left:21px;width:16px;height:16px;background:#fff;border-radius:50%;"></div>
              </div>
            </div>
          </label>
        </section>

        <section style="margin-bottom:14px;">
          <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:13px;">
            <span>Block autoplay everywhere</span>
            <div style="position:relative;width:40px;height:22px;">
              <div style="position:absolute;inset:0;background:#22c55e;border-radius:11px;">
                <div style="position:absolute;top:3px;left:21px;width:16px;height:16px;background:#fff;border-radius:50%;"></div>
              </div>
            </div>
          </label>
        </section>

        <section style="background:#16213e;border-radius:8px;padding:10px 12px;text-align:center;font-size:13px;margin-bottom:14px;">
          <p><span style="font-weight:700;color:#22c55e;font-size:18px;">14</span> videos blocked today</p>
        </section>

        <section>
          <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:6px;">Whitelisted Sites</h2>
          <div style="background:#16213e;border-radius:6px;padding:6px 8px;margin-bottom:4px;font-size:12px;display:flex;justify-content:space-between;align-items:center;">
            <span>music.spotify.com</span>
            <span style="color:#ef4444;cursor:pointer;">\u2715</span>
          </div>
          <div style="background:#16213e;border-radius:6px;padding:6px 8px;font-size:12px;display:flex;justify-content:space-between;align-items:center;">
            <span>app.netflix.com</span>
            <span style="color:#ef4444;cursor:pointer;">\u2715</span>
          </div>
        </section>
      </div>
    </div>
  </div>
</div>
</body></html>`;
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    // Screenshot 1: Video page with autoplay blocked overlay
    const page1 = await browser.newPage();
    await page1.setViewport({ width: WIDTH, height: HEIGHT });
    await page1.setContent(buildVideoPageHTML(), { waitUntil: 'load' });
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-1-blocked-video.png') });
    await page1.close();
    console.log('Screenshot 1: Blocked video - done');

    // Screenshot 2: Popup overlay
    const page2 = await browser.newPage();
    await page2.setViewport({ width: WIDTH, height: HEIGHT });
    await page2.setContent(buildPopupScreenshot(), { waitUntil: 'load' });
    await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot-2-popup.png') });
    await page2.close();
    console.log('Screenshot 2: Popup - done');

  } finally {
    await browser.close();
  }

  console.log(`\nAll screenshots saved to ${SCREENSHOTS_DIR}`);
}

run().catch(console.error);
