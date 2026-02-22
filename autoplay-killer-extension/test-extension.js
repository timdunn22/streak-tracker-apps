const puppeteer = require("puppeteer");
const path = require("path");
const http = require("http");
const fs = require("fs");

const EXT_PATH = path.resolve(__dirname);
let server, browser, passed = 0, failed = 0;

function log(ok, name, detail) {
  console.log(`  ${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}  ${name}${detail ? " — " + detail : ""}`);
  ok ? passed++ : failed++;
}

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (req.url === "/autoplay-video") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html><html><body>
<video id="vid" autoplay muted loop width="320" height="240"><source src="/video.mp4" type="video/mp4"></video>
<audio id="aud" autoplay loop><source src="/audio.mp3" type="audio/mpeg"></audio>
<script>setTimeout(() => { document.getElementById('vid').play().catch(() => {}); }, 100);</script>
</body></html>`);
      } else if (req.url === "/no-autoplay") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html><html><body><video id="vid" muted width="320" height="240" controls><source src="/video.mp4" type="video/mp4"></video></body></html>`);
      } else if (req.url === "/dynamic-video") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html><html><body><div id="container"></div>
<script>setTimeout(() => { const v = document.createElement('video'); v.id = 'dynamic'; v.autoplay = true; v.muted = true; v.src = '/video.mp4'; document.getElementById('container').appendChild(v); }, 200);</script>
</body></html>`);
      } else if (req.url === "/video.mp4") {
        const vp = path.join(__dirname, "test-video.mp4");
        if (fs.existsSync(vp)) { const s = fs.statSync(vp); res.writeHead(200, {"Content-Type":"video/mp4","Content-Length":s.size}); fs.createReadStream(vp).pipe(res); }
        else { res.writeHead(200, {"Content-Type":"video/mp4"}); res.end(Buffer.alloc(100)); }
      } else {
        res.writeHead(200, {"Content-Type":"text/html"}); res.end("<html><body>OK</body></html>");
      }
    });
    server.listen(0, () => resolve(server.address().port));
  });
}

async function run() {
  console.log("\n\x1b[1m=== AutoPlay Killer Extension Tests ===\x1b[0m\n");
  const port = await startServer();
  const BASE = `http://localhost:${port}`;
  try {
    browser = await puppeteer.launch({ headless: "new", args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, "--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
    log((await browser.pages()).length > 0, "Extension loads in browser");

    const page1 = await browser.newPage();
    await page1.goto(`${BASE}/autoplay-video`, { waitUntil: "networkidle0", timeout: 10000 });
    await new Promise(r => setTimeout(r, 500));

    log(await page1.evaluate(() => document.getElementById("vid")?.paused) === true, "Autoplay video is paused");
    log(await page1.evaluate(() => !document.getElementById("vid")?.hasAttribute("autoplay")), "Autoplay attribute removed");
    log(await page1.evaluate(() => document.getElementById("vid")?.getAttribute("preload")) === "none", "Preload set to none");
    log(await page1.evaluate(() => document.getElementById("aud")?.paused) === true, "Autoplay audio is paused");
    log(await page1.evaluate(() => !!document.querySelector(".apk-overlay-wrapper")), "Play overlay added");

    const btn = await page1.$(".apk-play-btn");
    if (btn) { await btn.click(); await new Promise(r => setTimeout(r, 300)); }
    log(await page1.evaluate(() => !document.querySelector(".apk-overlay-wrapper")), "Overlay removed after click");

    const page2 = await browser.newPage();
    await page2.goto(`${BASE}/no-autoplay`, { waitUntil: "networkidle0", timeout: 10000 });
    await new Promise(r => setTimeout(r, 300));
    log(await page2.evaluate(() => !document.querySelector(".apk-overlay-wrapper")), "No overlay on non-autoplay video");

    const page3 = await browser.newPage();
    await page3.goto(`${BASE}/dynamic-video`, { waitUntil: "domcontentloaded", timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
    log(await page3.evaluate(() => document.getElementById("dynamic")?.paused) === true, "Dynamic autoplay video blocked");
    log(await page3.evaluate(() => !document.getElementById("dynamic")?.hasAttribute("autoplay")), "Dynamic video autoplay attr removed");

    const targets = browser.targets();
    const ext = targets.find(t => t.type() === "service_worker" && t.url().includes("chrome-extension://"));
    if (ext) {
      const id = ext.url().split("/")[2];
      const pp = await browser.newPage();
      await pp.goto(`chrome-extension://${id}/popup.html`, { timeout: 5000 });
      log((await pp.evaluate(() => document.body.textContent)).length > 0, "Popup loads");
      await pp.close();
    } else { log(false, "Popup loads", "no service worker"); }

    log(JSON.parse(fs.readFileSync(path.join(EXT_PATH, "manifest.json"), "utf8")).manifest_version === 3, "Manifest V3 valid");
    await page1.close(); await page2.close(); await page3.close();
  } catch (err) { log(false, "Test execution", err.message); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log(`\n  \x1b[1m${passed}/${passed + failed} passed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
