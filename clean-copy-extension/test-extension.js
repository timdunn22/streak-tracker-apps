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
      if (req.url === "/blocked-page") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html><html><head>
<style>body { user-select: none; -webkit-user-select: none; } .no-select { user-select: none; }</style>
</head><body oncontextmenu="return false" oncopy="return false" onselectstart="return false" onpaste="return false">
<p id="text" style="user-select: none;">Protected text.</p>
<input id="input" type="text" value="test input" onpaste="return false">
<textarea id="textarea" onpaste="return false">test textarea</textarea>
<script>
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.addEventListener('copy', function(e) { e.preventDefault(); });
document.addEventListener('selectstart', function(e) { e.preventDefault(); });
document.addEventListener('paste', function(e) { e.preventDefault(); });
</script></body></html>`);
      } else {
        res.writeHead(200, {"Content-Type":"text/html"}); res.end("<html><body>OK</body></html>");
      }
    });
    server.listen(0, () => resolve(server.address().port));
  });
}

async function run() {
  console.log("\n\x1b[1m=== Clean Copy Extension Tests ===\x1b[0m\n");
  const port = await startServer();
  const BASE = `http://localhost:${port}`;
  try {
    browser = await puppeteer.launch({ headless: "new", args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, "--no-sandbox"] });
    log((await browser.pages()).length > 0, "Extension loads in browser");

    // Wait for extension service worker to start
    await new Promise(r => setTimeout(r, 1000));

    const page = await browser.newPage();
    await page.goto(`${BASE}/blocked-page`, { waitUntil: "networkidle0", timeout: 10000 });
    // Give content scripts time to run (MAIN world + isolated + message passing)
    await new Promise(r => setTimeout(r, 1500));

    log(!(await page.evaluate(() => document.body.hasAttribute("oncontextmenu"))), "oncontextmenu removed");
    log(!(await page.evaluate(() => document.body.hasAttribute("oncopy"))), "oncopy removed");
    log(!(await page.evaluate(() => document.body.hasAttribute("onselectstart"))), "onselectstart removed");
    log(!(await page.evaluate(() => document.body.hasAttribute("onpaste"))), "onpaste removed from body");
    log(!(await page.evaluate(() => document.getElementById("input").hasAttribute("onpaste"))), "onpaste removed from input");

    log(await page.evaluate(() => { const s = document.getElementById("__clean_copy_style__"); return s && s.textContent.includes("user-select: text"); }), "user-select CSS override injected");
    log((await page.evaluate(() => document.getElementById("text").style.userSelect)) !== "none", "Inline user-select:none removed");
    log((await page.evaluate(() => window.getComputedStyle(document.getElementById("text")).userSelect)) === "text", "Computed user-select is 'text'");

    // Test that events are not prevented (prototype overrides in MAIN world)
    log(await page.evaluate(() => { const e = new MouseEvent("contextmenu", {bubbles:true,cancelable:true}); return document.getElementById("text").dispatchEvent(e); }), "Context menu not prevented");
    log(await page.evaluate(() => { const e = new ClipboardEvent("copy", {bubbles:true,cancelable:true}); return document.getElementById("text").dispatchEvent(e); }), "Copy event not prevented");
    log(await page.evaluate(() => { const e = new Event("selectstart", {bubbles:true,cancelable:true}); return document.getElementById("text").dispatchEvent(e); }), "Selectstart not prevented");

    // Test that config object is exposed in MAIN world
    log(await page.evaluate(() => window.__cleanCopyConfig && window.__cleanCopyConfig.active === true), "MAIN world config exposed and active");

    const targets = browser.targets();
    const ext = targets.find(t => t.type() === "service_worker" && t.url().includes("chrome-extension://"));
    if (ext) {
      const id = ext.url().split("/")[2];
      const pp = await browser.newPage();
      await pp.goto(`chrome-extension://${id}/popup.html`, { timeout: 5000 });
      log((await pp.evaluate(() => document.body.textContent)).length > 0, "Popup loads");
      await pp.close();
    } else { log(false, "Popup loads", "no service worker"); }

    // Validate required files exist
    log(fs.existsSync(path.join(EXT_PATH, "content-main.js")), "content-main.js exists");
    log(fs.existsSync(path.join(EXT_PATH, "content-isolated.js")), "content-isolated.js exists");
    log(JSON.parse(fs.readFileSync(path.join(EXT_PATH, "manifest.json"), "utf8")).manifest_version === 3, "Manifest V3 valid");

    await page.close();
  } catch (err) { log(false, "Test execution", err.message); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log(`\n  \x1b[1m${passed}/${passed + failed} passed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
