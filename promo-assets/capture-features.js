const { chromium } = require('playwright');

const apps = [
  { id: 'vapefree', url: 'https://vapefree-app.vercel.app', name: 'VapeFree', dailyCost: 8 },
  { id: 'sober', url: 'https://sober-app-theta.vercel.app', name: 'Sober', dailyCost: 15 },
  { id: 'rewire', url: 'https://rewire-psi.vercel.app', name: 'Rewire', dailyCost: null },
  { id: 'clearlungs', url: 'https://clearlungs-app.vercel.app', name: 'ClearLungs', dailyCost: 12 },
  { id: 'decaf', url: 'https://decaf-app-black.vercel.app', name: 'Decaf', dailyCost: 5 },
  { id: 'sugarfree', url: 'https://sugarfree-app.vercel.app', name: 'SugarFree', dailyCost: 10 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  for (const app of apps) {
    console.log(`\n=== ${app.name} ===`);
    const page = await context.newPage();

    try {
      // First load the page to get it initialized
      await page.goto(app.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Inject proper streak data matching the StreakData interface
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const storageKey = `${app.id}-streak-data`;
      const streakData = {
        startDate: sevenDaysAgo,
        streaks: [3, 5, 14],
        totalCleanDays: 29,
        freezesAvailable: 2,
        freezesUsed: 0,
        lastFreezeRecharge: null,
        dailyCost: app.dailyCost,
        journal: [
          {
            id: 'demo-1',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            mood: 4,
            text: 'Feeling great today. The cravings are getting weaker.',
            triggers: ['stress']
          },
          {
            id: 'demo-2',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            mood: 3,
            text: 'Had a tough day but stayed strong.',
            triggers: ['boredom', 'social']
          }
        ]
      };

      await page.evaluate(({ key, data }) => {
        localStorage.setItem(key, JSON.stringify(data));
      }, { key: storageKey, data: streakData });

      // Reload to pick up the streak data
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Screenshot 1: Main streak counter
      await page.screenshot({ path: `promo-assets/${app.id}-streak.png`, fullPage: false });
      console.log(`  ✓ ${app.id}-streak.png`);

      // Navigate to Timeline tab
      const timelineBtn = page.locator('nav button, nav a, [role="tab"]').filter({ hasText: 'Timeline' });
      if (await timelineBtn.count() > 0) {
        await timelineBtn.first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `promo-assets/${app.id}-timeline.png`, fullPage: false });
        console.log(`  ✓ ${app.id}-timeline.png`);
      }

      // Navigate to Stats tab
      const statsBtn = page.locator('nav button, nav a, [role="tab"]').filter({ hasText: 'Stats' });
      if (await statsBtn.count() > 0) {
        await statsBtn.first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `promo-assets/${app.id}-stats.png`, fullPage: false });
        console.log(`  ✓ ${app.id}-stats.png`);
      }

      // Navigate to Share tab
      const shareBtn = page.locator('nav button, nav a, [role="tab"]').filter({ hasText: 'Share' });
      if (await shareBtn.count() > 0) {
        await shareBtn.first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `promo-assets/${app.id}-share.png`, fullPage: false });
        console.log(`  ✓ ${app.id}-share.png`);
      }

    } catch (err) {
      console.error(`  ✗ ${app.name}: ${err.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\nDone!');
})();
