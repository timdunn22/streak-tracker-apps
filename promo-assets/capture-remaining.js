const { chromium } = require('playwright');

const apps = [
  { id: 'fasttrack', url: 'https://fasttrack-app-three.vercel.app', name: 'FastTrack', dailyCost: null },
  { id: 'greenday', url: 'https://greenday-app.vercel.app', name: 'GreenDay', dailyCost: 15 },
  { id: 'iceplunge', url: 'https://iceplunge-app.vercel.app', name: 'IcePlunge', dailyCost: null },
  { id: 'primal', url: 'https://primal-app.vercel.app', name: 'Primal', dailyCost: null },
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
      await page.goto(app.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

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
          { id: 'demo-1', date: new Date(Date.now() - 2 * 86400000).toISOString(), mood: 4, text: 'Feeling great today.', triggers: ['stress'] },
          { id: 'demo-2', date: new Date(Date.now() - 5 * 86400000).toISOString(), mood: 3, text: 'Had a tough day but stayed strong.', triggers: ['boredom'] }
        ]
      };

      await page.evaluate(({ key, data }) => { localStorage.setItem(key, JSON.stringify(data)); }, { key: storageKey, data: streakData });
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: `promo-assets/${app.id}-streak.png`, fullPage: false });
      console.log(`  ✓ ${app.id}-streak.png`);

      for (const tab of ['Timeline', 'Stats', 'Share']) {
        const btn = page.locator('nav button, nav a, [role="tab"]').filter({ hasText: tab });
        if (await btn.count() > 0) {
          await btn.first().click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: `promo-assets/${app.id}-${tab.toLowerCase()}.png`, fullPage: false });
          console.log(`  ✓ ${app.id}-${tab.toLowerCase()}.png`);
        }
      }
    } catch (err) {
      console.error(`  ✗ ${app.name}: ${err.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('\nDone!');
})();
