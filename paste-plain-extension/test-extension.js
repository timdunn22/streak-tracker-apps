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
      if (req.url === "/paste-test") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html><html><body>
<textarea id="textarea" rows="10" cols="50"></textarea>
<input id="input" type="text">
<div id="editable" contenteditable="true" style="border:1px solid #ccc;padding:10px;min-height:50px;"></div>
</body></html>`);
      } else {
        res.writeHead(200, {"Content-Type":"text/html"}); res.end("<html><body>OK</body></html>");
      }
    });
    server.listen(0, () => resolve(server.address().port));
  });
}

async function simulatePaste(page, selector, html, plain) {
  await page.focus(selector);
  await page.evaluate((sel, h, p) => {
    const el = document.querySelector(sel);
    const dt = new DataTransfer();
    dt.setData("text/html", h);
    dt.setData("text/plain", p);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, selector, html, plain);
}

async function run() {
  console.log("\n\x1b[1m=== PastePure Extension Tests ===\x1b[0m\n");
  const port = await startServer();
  const BASE = `http://localhost:${port}`;
  try {
    browser = await puppeteer.launch({ headless: "new", args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, "--no-sandbox"] });
    log((await browser.pages()).length > 0, "Extension loads in browser");

    const page = await browser.newPage();
    await page.goto(`${BASE}/paste-test`, { waitUntil: "networkidle0", timeout: 10000 });
    await new Promise(r => setTimeout(r, 500));

    const richHtml = '<b>Bold</b> <i>Italic</i> <a href="https://example.com">Link</a>';
    const plainText = "Bold Italic Link";

    // Test: paste into textarea
    await simulatePaste(page, "#textarea", richHtml, plainText);
    await new Promise(r => setTimeout(r, 200));
    const tv = await page.evaluate(() => document.getElementById("textarea").value);
    log(tv === plainText, "Textarea gets plain text", `got "${tv}"`);
    log(!tv.includes("<b>") && !tv.includes("<i>"), "No HTML tags in textarea");

    // Test: paste into input
    await simulatePaste(page, "#input", richHtml, plainText);
    await new Promise(r => setTimeout(r, 200));
    const iv = await page.evaluate(() => document.getElementById("input").value);
    log(iv === plainText, "Input gets plain text", `got "${iv}"`);

    // Test: paste into contenteditable
    await simulatePaste(page, "#editable", richHtml, plainText);
    await new Promise(r => setTimeout(r, 200));
    const eh = await page.evaluate(() => document.getElementById("editable").innerHTML);
    log(!eh.includes("<b>") && !eh.includes("<i>"), "Contenteditable has no rich formatting", `html="${eh}"`);
    log((await page.evaluate(() => document.getElementById("editable").textContent)).includes(plainText), "Contenteditable has plain text");

    // Test: visual feedback
    const feedback = await page.evaluate(() => {
      return new Promise(resolve => {
        const el = document.getElementById("textarea");
        const obs = new MutationObserver(muts => { for (const m of muts) { if (m.attributeName === "style" && el.style.boxShadow.includes("rgba")) { obs.disconnect(); resolve(true); } } });
        obs.observe(el, { attributes: true, attributeFilter: ["style"] });
        const dt = new DataTransfer(); dt.setData("text/html", "<b>t</b>"); dt.setData("text/plain", "t");
        el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
        setTimeout(() => { obs.disconnect(); resolve(false); }, 1000);
      });
    });
    log(feedback, "Visual feedback on paste");

    // Test: popup
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
    const cjs = fs.readFileSync(path.join(EXT_PATH, "content.js"), "utf8");
    log(cjs.includes("handlePaste") && cjs.includes("clipboardData"), "Content script has paste handler");
    log(cjs.includes("htmlToSmartText"), "Smart mode conversion exists");

    await page.close();
  } catch (err) { log(false, "Test execution", err.message); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log(`\n  \x1b[1m${passed}/${passed + failed} passed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
