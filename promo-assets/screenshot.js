const { chromium } = require('playwright');

const apps = [
  { id: 'vapefree', url: 'https://vapefree-app.vercel.app', name: 'VapeFree' },
  { id: 'sober', url: 'https://sober-app-theta.vercel.app', name: 'Sober' },
  { id: 'rewire', url: 'https://rewire-psi.vercel.app', name: 'Rewire' },
  { id: 'clearlungs', url: 'https://clearlungs-app.vercel.app', name: 'ClearLungs' },
  { id: 'greenday', url: 'https://greenday-app.vercel.app', name: 'GreenDay' },
  { id: 'decaf', url: 'https://decaf-app-black.vercel.app', name: 'Decaf' },
  { id: 'sugarfree', url: 'https://sugarfree-app.vercel.app', name: 'SugarFree' },
  { id: 'fasttrack', url: 'https://fasttrack-app-three.vercel.app', name: 'FastTrack' },
  { id: 'iceplunge', url: 'https://iceplunge-app.vercel.app', name: 'IcePlunge' },
  { id: 'primal', url: 'https://primal-app.vercel.app', name: 'Primal' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  // iPhone 14 Pro viewport
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  for (const app of apps) {
    console.log(`Capturing ${app.name}...`);
    const page = await context.newPage();

    try {
      await page.goto(app.url, { waitUntil: 'networkidle', timeout: 30000 });
      // Wait for animations to settle
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `promo-assets/${app.id}-main.png`,
        fullPage: false
      });
      console.log(`  ✓ ${app.id}-main.png`);
    } catch (err) {
      console.error(`  ✗ ${app.name}: ${err.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('Done!');
})();
