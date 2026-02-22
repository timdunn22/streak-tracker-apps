const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname);
const PORT = 9877;

let server;
let browser;
let extensionId;
let passed = 0;
let failed = 0;
const results = [];

function log(status, testName, detail = '') {
  const line = `${status} ${testName}${detail ? ' — ' + detail : ''}`;
  results.push(line);
  console.log(line);
  if (status === 'PASS') passed++;
  else failed++;
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><head><title>Test Page</title></head><body><h1>Test Page</h1><p>URL: ${req.url}</p></body></html>`);
    });
    server.on('error', reject);
    server.listen(PORT, () => resolve(PORT));
  });
}

let actualPort;

async function launchBrowser() {
  browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 30000,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const swTarget = await browser.waitForTarget(
    (target) => target.type() === 'service_worker' && target.url().includes('background'),
    { timeout: 10000 }
  );
  console.log('Service worker detected:', swTarget.url());

  const match = swTarget.url().match(/chrome-extension:\/\/([a-z]+)\//);
  if (match) {
    extensionId = match[1];
  } else {
    throw new Error('Could not parse extension ID from: ' + swTarget.url());
  }
  console.log('Extension ID:', extensionId);

  await new Promise((r) => setTimeout(r, 2000));
}

async function navigateAndGetUrl(page, url) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 8000 });
  } catch (e) {
    // Timeout is acceptable -- redirect may cause navigation restart
  }
  await new Promise((r) => setTimeout(r, 1000));
  return page.url();
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

async function test1_loadExtension() {
  const testName = 'Test 1: Extension loads successfully';
  try {
    if (extensionId && extensionId.length > 0) {
      log('PASS', testName, `Extension ID: ${extensionId}`);
    } else {
      log('FAIL', testName, 'Could not get extension ID');
    }
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test2_stripUtmAndFbclid() {
  const testName = 'Test 2: Strip utm_source, utm_medium, fbclid but keep q';
  try {
    const page = await browser.newPage();
    const finalUrl = await navigateAndGetUrl(
      page,
      `http://localhost:${actualPort}/page?utm_source=test&utm_medium=email&fbclid=abc123&q=search`
    );

    const urlObj = new URL(finalUrl);
    const hasUtmSource = urlObj.searchParams.has('utm_source');
    const hasUtmMedium = urlObj.searchParams.has('utm_medium');
    const hasFbclid = urlObj.searchParams.has('fbclid');
    const hasQ = urlObj.searchParams.has('q');
    const qValue = urlObj.searchParams.get('q');

    if (!hasUtmSource && !hasUtmMedium && !hasFbclid && hasQ && qValue === 'search') {
      log('PASS', testName, `Clean URL: ${finalUrl}`);
    } else {
      log('FAIL', testName, `URL: ${finalUrl} | utm_source=${hasUtmSource} utm_medium=${hasUtmMedium} fbclid=${hasFbclid} q=${qValue}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test3_stripGclid() {
  const testName = 'Test 3: Strip gclid';
  try {
    const page = await browser.newPage();
    const finalUrl = await navigateAndGetUrl(
      page,
      `http://localhost:${actualPort}/page?gclid=abc123&q=hello`
    );
    const urlObj = new URL(finalUrl);
    if (!urlObj.searchParams.has('gclid') && urlObj.searchParams.get('q') === 'hello') {
      log('PASS', testName, `Clean URL: ${finalUrl}`);
    } else {
      log('FAIL', testName, `gclid not stripped or q lost: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test4_stripMsclkid() {
  const testName = 'Test 4: Strip msclkid';
  try {
    const page = await browser.newPage();
    const finalUrl = await navigateAndGetUrl(
      page,
      `http://localhost:${actualPort}/page?msclkid=xyz789&id=42`
    );
    const urlObj = new URL(finalUrl);
    if (!urlObj.searchParams.has('msclkid') && urlObj.searchParams.get('id') === '42') {
      log('PASS', testName, `Clean URL: ${finalUrl}`);
    } else {
      log('FAIL', testName, `msclkid not stripped or id lost: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test5_stripGaGl() {
  const testName = 'Test 5: Strip _ga and _gl';
  try {
    const page = await browser.newPage();
    const finalUrl = await navigateAndGetUrl(
      page,
      `http://localhost:${actualPort}/page?_ga=12345&_gl=67890&search=puppies`
    );
    const urlObj = new URL(finalUrl);
    if (!urlObj.searchParams.has('_ga') && !urlObj.searchParams.has('_gl') && urlObj.searchParams.get('search') === 'puppies') {
      log('PASS', testName, `Clean URL: ${finalUrl}`);
    } else {
      log('FAIL', testName, `_ga/_gl not stripped or search lost: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test6_preserveLegitParams() {
  const testName = 'Test 6: Preserve legitimate params (q, page, id, search, sort, filter)';
  try {
    const page = await browser.newPage();
    const finalUrl = await navigateAndGetUrl(
      page,
      `http://localhost:${actualPort}/results?q=javascript&page=2&id=99&search=test&sort=date&filter=new`
    );
    const urlObj = new URL(finalUrl);
    const allPresent =
      urlObj.searchParams.get('q') === 'javascript' &&
      urlObj.searchParams.get('page') === '2' &&
      urlObj.searchParams.get('id') === '99' &&
      urlObj.searchParams.get('search') === 'test' &&
      urlObj.searchParams.get('sort') === 'date' &&
      urlObj.searchParams.get('filter') === 'new';
    if (allPresent) {
      log('PASS', testName, 'All legitimate params preserved');
    } else {
      log('FAIL', testName, `Params missing: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test7_onlyTrackingParams() {
  const testName = 'Test 7: URL with ONLY tracking params — clean base URL remains';
  try {
    const page = await browser.newPage();
    const finalUrl = await navigateAndGetUrl(
      page,
      `http://localhost:${actualPort}/article?utm_source=twitter&fbclid=xyz&gclid=abc`
    );
    const urlObj = new URL(finalUrl);
    const hasAnyTracking = urlObj.searchParams.has('utm_source') ||
      urlObj.searchParams.has('fbclid') ||
      urlObj.searchParams.has('gclid');
    const baseCorrect = urlObj.pathname === '/article';
    if (!hasAnyTracking && baseCorrect) {
      log('PASS', testName, `Clean base URL: ${finalUrl}`);
    } else {
      log('FAIL', testName, `Tracking params remain or base URL wrong: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test8_popupLoads() {
  const testName = 'Test 8: Popup loads and shows stats';
  try {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    await new Promise((r) => setTimeout(r, 1000));

    const title = await page.$eval('h1', (el) => el.textContent);
    const paramsEl = await page.$('#paramsToday');
    const urlsEl = await page.$('#urlsCleaned');
    const cleanBtn = await page.$('#cleanBtn');

    if (title === 'CleanLink' && paramsEl && urlsEl && cleanBtn) {
      log('PASS', testName, 'Popup loaded with all expected elements');
    } else {
      log('FAIL', testName, `Missing elements. Title: ${title}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test9_cleanUrlTool() {
  const testName = 'Test 9: "Clean a URL" tool in popup';
  try {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Use evaluate to set the textarea value directly instead of typing character by character
    const dirtyUrl = 'https://example.com/page?q=test&utm_source=google&fbclid=abc&sort=date';
    await page.evaluate((url) => {
      document.getElementById('dirtyUrl').value = url;
    }, dirtyUrl);

    await page.click('#cleanBtn');
    await new Promise((r) => setTimeout(r, 1000));

    const resultVisible = await page.$eval('#cleanResult', (el) => !el.classList.contains('hidden'));
    const cleanedValue = await page.$eval('#cleanedUrl', (el) => el.value);

    if (!resultVisible) {
      log('FAIL', testName, 'Result panel not visible');
      await page.close();
      return;
    }

    const cleanedObj = new URL(cleanedValue);
    const hasQ = cleanedObj.searchParams.get('q') === 'test';
    const hasSort = cleanedObj.searchParams.get('sort') === 'date';
    const noUtm = !cleanedObj.searchParams.has('utm_source');
    const noFbclid = !cleanedObj.searchParams.has('fbclid');

    if (hasQ && hasSort && noUtm && noFbclid) {
      log('PASS', testName, `Cleaned: ${cleanedValue}`);
    } else {
      log('FAIL', testName, `Result: cleaned=${cleanedValue}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test10_badgeCountIncreases() {
  const testName = 'Test 10: Badge count increases after navigating to URLs with tracking';
  try {
    // Navigate to 5 different URLs with tracking params
    const urls = [
      `http://localhost:${actualPort}/badge1?utm_source=a&utm_medium=b`,
      `http://localhost:${actualPort}/badge2?fbclid=abc123`,
      `http://localhost:${actualPort}/badge3?gclid=xyz&utm_campaign=test`,
      `http://localhost:${actualPort}/badge4?msclkid=ms1&_ga=ga1`,
      `http://localhost:${actualPort}/badge5?mc_cid=mc1&s_cid=s1&igshid=ig1`,
    ];

    for (const url of urls) {
      const page = await browser.newPage();
      await navigateAndGetUrl(page, url);
      await page.close();
      await new Promise((r) => setTimeout(r, 500));
    }

    // Give stats time to persist
    await new Promise((r) => setTimeout(r, 1000));

    // Check stats via popup
    const checkPage = await browser.newPage();
    await checkPage.goto(`chrome-extension://${extensionId}/popup.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    await new Promise((r) => setTimeout(r, 2000));

    const paramsCount = await checkPage.$eval('#paramsToday', (el) => parseInt(el.textContent, 10));
    const urlsCount = await checkPage.$eval('#urlsCleaned', (el) => parseInt(el.textContent, 10));

    // We accumulated params across the whole test run, so counts should be significant
    // At minimum these 5 URLs should have contributed
    if (urlsCount >= 5 && paramsCount >= 5) {
      log('PASS', testName, `URLs cleaned: ${urlsCount}, Params removed: ${paramsCount}`);
    } else {
      log('FAIL', testName, `URLs: ${urlsCount}, Params: ${paramsCount} (expected >= 5 each)`);
    }
    await checkPage.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test11_hubspotParams() {
  const testName = 'Test 11: Strip HubSpot params';
  try {
    const page = await browser.newPage();
    const finalUrl = await navigateAndGetUrl(
      page,
      `http://localhost:${actualPort}/page?hsa_cam=camp1&_hsenc=enc1&__hstc=tc1&q=keep`
    );
    const urlObj = new URL(finalUrl);
    if (!urlObj.searchParams.has('hsa_cam') && !urlObj.searchParams.has('_hsenc') &&
        !urlObj.searchParams.has('__hstc') && urlObj.searchParams.get('q') === 'keep') {
      log('PASS', testName, `Clean URL: ${finalUrl}`);
    } else {
      log('FAIL', testName, `HubSpot params not fully stripped: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

async function test12_multipleGoogleParams() {
  const testName = 'Test 12: Strip multiple Google params (gbraid, wbraid, gclsrc, dclid)';
  try {
    const page = await browser.newPage();
    const finalUrl = await navigateAndGetUrl(
      page,
      `http://localhost:${actualPort}/page?gbraid=gb1&wbraid=wb1&gclsrc=src1&dclid=dc1&category=shoes`
    );
    const urlObj = new URL(finalUrl);
    const stripped = !urlObj.searchParams.has('gbraid') && !urlObj.searchParams.has('wbraid') &&
      !urlObj.searchParams.has('gclsrc') && !urlObj.searchParams.has('dclid');
    const kept = urlObj.searchParams.get('category') === 'shoes';
    if (stripped && kept) {
      log('PASS', testName, `Clean URL: ${finalUrl}`);
    } else {
      log('FAIL', testName, `Not fully cleaned: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    log('FAIL', testName, e.message);
  }
}

// ─── RUNNER ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== CleanLink Extension Tests ===\n');

  try {
    actualPort = await startServer();
    console.log(`Test server running on http://localhost:${actualPort}`);
    await launchBrowser();

    await test1_loadExtension();
    await test2_stripUtmAndFbclid();
    await test3_stripGclid();
    await test4_stripMsclkid();
    await test5_stripGaGl();
    await test6_preserveLegitParams();
    await test7_onlyTrackingParams();
    await test8_popupLoads();
    await test9_cleanUrlTool();
    await test10_badgeCountIncreases();
    await test11_hubspotParams();
    await test12_multipleGoogleParams();

  } catch (e) {
    console.error('Fatal error:', e.message);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();

    console.log('\n=== Results ===');
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log(`TOTAL:  ${passed + failed}`);
    console.log('');
    results.forEach((r) => console.log('  ' + r));
    console.log('');

    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
