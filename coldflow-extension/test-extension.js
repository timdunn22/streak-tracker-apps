/**
 * test-extension.js  —  ColdFlow Chrome Extension Tests
 *
 * Uses Puppeteer to load a mock Gmail page and verify:
 *  1. Content script injects the template button
 *  2. Template dropdown opens / closes
 *  3. Template insertion fills compose body + highlights merge fields
 *  4. CSV parser handles various CSV formats
 *  5. Popup loads and renders tabs
 *  6. Background message handlers respond correctly
 *
 * Run:  node test-extension.js
 */

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

/* ---------- Helpers ---------- */
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}`);
  }
}

function summary() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('='.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
}

/* ---------- Mock Gmail HTML ---------- */

const MOCK_GMAIL_HTML = `<!DOCTYPE html>
<html>
<head><title>Gmail Mock</title></head>
<body>
  <div id="app">
    <!-- Top bar -->
    <div class="top-bar">
      <div gh="cm" data-tooltip="Compose" class="T-I T-I-KE L3"
           style="padding:8px 16px;background:#4f46e5;color:#fff;border-radius:8px;cursor:pointer;display:inline-block;">
        Compose
      </div>
    </div>

    <!-- Compose window -->
    <div class="compose-window" data-message-id="mock-msg-1">
      <div class="compose-header">
        <input name="to" type="text" aria-label="To" placeholder="Recipients">
        <input name="subjectbox" type="text" aria-label="Subject" placeholder="Subject">
      </div>
      <div class="compose-body">
        <div role="textbox" aria-label="Message Body" contenteditable="true"
             style="min-height:200px;border:1px solid #ccc;padding:8px;">
        </div>
      </div>
      <div class="compose-toolbar btC">
        <div data-tooltip="Send" aria-label="Send"
             style="padding:6px 16px;background:#4f46e5;color:#fff;border-radius:4px;display:inline-block;cursor:pointer;">
          Send
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

/* ---------- Main Test Runner ---------- */

(async () => {
  console.log('ColdFlow Extension Test Suite\n');

  // =============================================
  // Test 1: CSV Parser
  // =============================================
  console.log('--- CSV Parser Tests ---');

  // We load csv-parser.js in a page context
  const csvParserCode = fs.readFileSync(path.join(__dirname, 'csv-parser.js'), 'utf-8');

  const browser = await puppeteer.launch({ headless: 'new' });

  // CSV parser tests in a blank page
  const csvPage = await browser.newPage();
  await csvPage.setContent('<html><body></body></html>');
  await csvPage.evaluate(csvParserCode);

  // Basic CSV
  const basicResult = await csvPage.evaluate(() => {
    return ColdFlowCSV.parse('email,first_name,company\njohn@example.com,John,Acme\njane@example.com,Jane,Widget Co');
  });
  assert(basicResult.headers.length === 3, 'CSV: parses 3 headers');
  assert(basicResult.rows.length === 2, 'CSV: parses 2 rows');
  assert(basicResult.rows[0].email === 'john@example.com', 'CSV: first email correct');
  assert(basicResult.rows[1].first_name === 'Jane', 'CSV: second first_name correct');

  // Quoted fields with commas
  const quotedResult = await csvPage.evaluate(() => {
    return ColdFlowCSV.parse('email,company\njohn@example.com,"Acme, Inc."\njane@example.com,"Widget Co, LLC"');
  });
  assert(quotedResult.rows[0].company === 'Acme, Inc.', 'CSV: handles quoted commas');

  // Empty CSV
  const emptyResult = await csvPage.evaluate(() => {
    return ColdFlowCSV.parse('');
  });
  assert(emptyResult.headers.length === 0, 'CSV: empty string returns empty');

  // Validation
  const validResult = await csvPage.evaluate(() => {
    return ColdFlowCSV.validate(['email', 'first_name']);
  });
  assert(validResult.valid === true, 'CSV validate: email column present');

  const invalidResult = await csvPage.evaluate(() => {
    return ColdFlowCSV.validate(['name', 'company']);
  });
  assert(invalidResult.valid === false, 'CSV validate: missing email column');

  // Header normalization
  const normalizedHeaders = await csvPage.evaluate(() => {
    return ColdFlowCSV.normalizeHeaders(['First Name', 'e-mail', 'company name', 'job title']);
  });
  assert(normalizedHeaders[0] === 'first_name', 'CSV normalize: First Name -> first_name');
  assert(normalizedHeaders[1] === 'email', 'CSV normalize: e-mail -> email');
  assert(normalizedHeaders[2] === 'company', 'CSV normalize: company name -> company');
  assert(normalizedHeaders[3] === 'title', 'CSV normalize: job title -> title');

  await csvPage.close();

  // =============================================
  // Test 2: Content Script — Template Injection
  // =============================================
  console.log('\n--- Content Script Tests ---');

  const contentPage = await browser.newPage();
  await contentPage.setContent(MOCK_GMAIL_HTML);

  // Inject styles
  const stylesCSS = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');
  await contentPage.addStyleTag({ content: stylesCSS });

  // Mock chrome.runtime API
  await contentPage.evaluate(() => {
    window._mockTemplates = [
      {
        id: 'tpl-test-1',
        name: 'Test Sales Template',
        category: 'Sales',
        subject: 'Hey {first_name}, quick question about {company}',
        body: 'Hi {first_name},\\n\\nI noticed {company} is doing great things.\\n\\nBest,\\n[Your name]',
        isBuiltIn: false,
        createdAt: Date.now()
      },
      {
        id: 'tpl-test-2',
        name: 'Test Link Building',
        category: 'SEO',
        subject: 'Content collaboration for {company}',
        body: 'Hi {first_name},\\n\\nLove your work at {company}.\\n\\nCheers',
        isBuiltIn: true,
        createdAt: Date.now()
      }
    ];

    window.chrome = {
      runtime: {
        sendMessage: (msg) => {
          return new Promise((resolve) => {
            if (msg.type === 'get-templates') {
              resolve(window._mockTemplates);
            } else if (msg.type === 'record-send') {
              resolve({ ok: true, dailySends: 1 });
            } else {
              resolve({});
            }
          });
        },
        onMessage: {
          addListener: () => {}
        }
      }
    };
  });

  // Inject content script
  const contentJS = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf-8');
  await contentPage.evaluate(contentJS);

  // Wait for mutation observer to detect compose
  await new Promise(r => setTimeout(r, 500));

  // Check template button was injected
  const templateBtn = await contentPage.$('[data-coldflow="template-btn"]');
  assert(templateBtn !== null, 'Content: template button injected into compose');

  // Click the template button to open dropdown
  if (templateBtn) {
    await templateBtn.click();
    await new Promise(r => setTimeout(r, 300));
  }

  const dropdownVisible = await contentPage.$('[data-coldflow="dropdown"].cf-show');
  assert(dropdownVisible !== null, 'Content: dropdown opens on button click');

  // Check templates are listed
  const templateItems = await contentPage.$$('[data-coldflow="tpl-item"]');
  assert(templateItems.length === 2, 'Content: 2 templates listed in dropdown');

  // Search templates
  const searchInput = await contentPage.$('[data-coldflow="search"]');
  if (searchInput) {
    await searchInput.type('Sales');
    await new Promise(r => setTimeout(r, 200));
  }

  const filteredItems = await contentPage.$$('[data-coldflow="tpl-item"]');
  assert(filteredItems.length === 1, 'Content: search filters to 1 template');

  // Clear search and click a template
  if (searchInput) {
    await searchInput.click({ clickCount: 3 });
    await searchInput.type('');
    await new Promise(r => setTimeout(r, 200));
  }

  // Click first template item
  const firstItem = await contentPage.$('[data-coldflow="tpl-item"]');
  if (firstItem) {
    await firstItem.click();
    await new Promise(r => setTimeout(r, 300));
  }

  // Check subject was filled
  const subjectValue = await contentPage.$eval('input[name="subjectbox"]', el => el.value);
  assert(subjectValue.includes('{first_name}'), 'Content: subject line populated with merge fields');

  // Check body has merge field highlighting
  const mergeFields = await contentPage.$$('.cf-merge-field');
  assert(mergeFields.length > 0, 'Content: merge fields highlighted in body');

  // Check dropdown closed after selection
  const dropdownAfter = await contentPage.$('[data-coldflow="dropdown"].cf-show');
  assert(dropdownAfter === null, 'Content: dropdown closes after template selection');

  // Check toast appeared
  const toast = await contentPage.$('.cf-toast');
  assert(toast !== null, 'Content: toast notification shown after insertion');

  await contentPage.close();

  // =============================================
  // Test 3: Popup UI
  // =============================================
  console.log('\n--- Popup UI Tests ---');

  const popupPage = await browser.newPage();

  // Mock chrome APIs for popup
  await popupPage.evaluateOnNewDocument(() => {
    window.chrome = {
      runtime: {
        sendMessage: (msg) => {
          return new Promise((resolve) => {
            const handlers = {
              'get-dashboard-data': () => ({
                sequences: { active: 1, paused: 0, completed: 2, stopped: 0 },
                pendingFollowUps: 3,
                totalSent: 47,
                totalReplied: 8,
                replyRate: 17,
                contactCount: 25,
                dailySends: 12,
                dailyLimit: 50
              }),
              'get-templates': () => [
                { id: 'tpl-1', name: 'Sales Intro', category: 'Sales', subject: 'Hey {first_name}', body: 'Hi there', isBuiltIn: true, createdAt: Date.now() },
                { id: 'tpl-2', name: 'Follow-up', category: 'Sales', subject: 'Following up', body: 'Just checking in', isBuiltIn: false, createdAt: Date.now() }
              ],
              'get-contacts': () => [
                { id: 'ct-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', company: 'Acme', title: 'CEO', status: 'sent' },
                { id: 'ct-2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', company: 'Widget', title: 'CTO', status: 'replied' }
              ],
              'get-sequences': () => [
                { id: 'seq-1', name: 'Q1 Outreach', status: 'active', steps: [{}, {}], enrollments: [{ status: 'active' }, { status: 'completed' }], createdAt: Date.now() },
                { id: 'seq-2', name: 'Old Campaign', status: 'completed', steps: [{}], enrollments: [{ status: 'completed' }], createdAt: Date.now() }
              ],
              'get-settings': () => ({ dailySendLimit: 50 }),
              'get-premium': () => ({ premium: false }),
              'check-limits': () => ({ allowed: true, limits: { templates: { current: 2, max: 3, hit: false }, contacts: { current: 2, max: 10, hit: false }, activeSequences: { current: 1, max: 1, hit: true } }, premium: false }),
              'save-template': () => ({ ok: true }),
              'delete-template': () => ({ ok: true }),
              'save-contacts': () => ({ ok: true, count: 3 }),
              'delete-contact': () => ({ ok: true }),
              'save-sequence': () => ({ ok: true }),
              'delete-sequence': () => ({ ok: true }),
              'pause-sequence': () => ({ ok: true }),
              'resume-sequence': () => ({ ok: true }),
              'stop-sequence': () => ({ ok: true }),
              'save-settings': () => ({ ok: true }),
              'set-premium': () => ({ ok: true }),
            };

            const handler = handlers[msg.type];
            resolve(handler ? handler() : {});
          });
        },
        onMessage: {
          addListener: () => {}
        }
      },
      storage: {
        local: {
          get: (keys) => {
            return new Promise((resolve) => {
              resolve({});
            });
          }
        }
      },
      tabs: {
        query: () => Promise.resolve([])
      }
    };
  });

  // Load popup
  const popupPath = 'file://' + path.join(__dirname, 'popup.html');
  await popupPage.goto(popupPath, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 500));

  // Check header
  const headerText = await popupPage.$eval('.header h1', el => el.textContent);
  assert(headerText === 'ColdFlow', 'Popup: header shows "ColdFlow"');

  // Check tabs exist
  const tabCount = await popupPage.$$eval('.tab', els => els.length);
  assert(tabCount === 5, 'Popup: 5 navigation tabs present');

  // Dashboard stats
  const sentStat = await popupPage.$eval('#stat-sent', el => el.textContent);
  assert(sentStat === '47', 'Popup: dashboard shows 47 emails sent');

  const replyStat = await popupPage.$eval('#stat-replied', el => el.textContent);
  assert(replyStat === '8', 'Popup: dashboard shows 8 replies');

  const rateStat = await popupPage.$eval('#stat-rate', el => el.textContent);
  assert(rateStat === '17%', 'Popup: dashboard shows 17% reply rate');

  // Switch to Templates tab
  await popupPage.click('[data-tab="templates"]');
  await new Promise(r => setTimeout(r, 300));

  const templatesPanel = await popupPage.$eval('#panel-templates', el => el.classList.contains('active'));
  assert(templatesPanel, 'Popup: templates panel active after tab click');

  const templateCards = await popupPage.$$('.template-card');
  assert(templateCards.length === 2, 'Popup: 2 template cards rendered');

  // Switch to Contacts tab
  await popupPage.click('[data-tab="contacts"]');
  await new Promise(r => setTimeout(r, 300));

  const contactCards = await popupPage.$$('.contact-card');
  assert(contactCards.length === 2, 'Popup: 2 contact cards rendered');

  // Switch to Sequences tab
  await popupPage.click('[data-tab="sequences"]');
  await new Promise(r => setTimeout(r, 800));

  const seqCards = await popupPage.$$('#sequence-list .sequence-card');
  assert(seqCards.length === 2, 'Popup: 2 sequence cards rendered');

  // Check active badge
  const activeBadge = await popupPage.$('.badge-active');
  assert(activeBadge !== null, 'Popup: active sequence has badge');

  // Switch to Settings tab
  await popupPage.click('[data-tab="settings"]');
  await new Promise(r => setTimeout(r, 300));

  const limitInput = await popupPage.$eval('#setting-daily-limit', el => el.value);
  assert(limitInput === '50', 'Popup: daily limit default is 50');

  await popupPage.close();

  // =============================================
  // Test 4: Background Script Logic (Unit-style)
  // =============================================
  console.log('\n--- Background Script Logic Tests ---');

  const bgPage = await browser.newPage();
  await bgPage.setContent('<html><body></body></html>');

  // Mock chrome APIs for background
  await bgPage.evaluate(() => {
    window._storage = {};

    window.chrome = {
      storage: {
        local: {
          get: (keys) => {
            return new Promise((resolve) => {
              if (typeof keys === 'string') keys = [keys];
              if (Array.isArray(keys)) {
                const result = {};
                keys.forEach(k => {
                  if (window._storage[k] !== undefined) result[k] = window._storage[k];
                });
                resolve(result);
              } else {
                resolve(window._storage);
              }
            });
          },
          set: (obj) => {
            return new Promise((resolve) => {
              Object.assign(window._storage, obj);
              resolve();
            });
          },
          clear: () => {
            return new Promise((resolve) => {
              window._storage = {};
              resolve();
            });
          }
        }
      },
      runtime: {
        onInstalled: { addListener: (cb) => { window._onInstalled = cb; } },
        onStartup:   { addListener: () => {} },
        onMessage:   { addListener: (cb) => { window._onMessage = cb; } }
      },
      alarms: {
        create: () => {},
        onAlarm: { addListener: (cb) => { window._onAlarm = cb; } }
      },
      tabs: {
        query: () => Promise.resolve([]),
        sendMessage: () => Promise.resolve({})
      }
    };
  });

  // Load background script
  const bgCode = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf-8');
  await bgPage.evaluate(bgCode);

  // Trigger install
  await bgPage.evaluate(() => {
    if (window._onInstalled) window._onInstalled({ reason: 'install' });
  });
  await new Promise(r => setTimeout(r, 300));

  // Test: default templates seeded
  const seededTemplates = await bgPage.evaluate(() => window._storage.cf_templates);
  assert(Array.isArray(seededTemplates) && seededTemplates.length === 10, 'BG: 10 built-in templates seeded on install');

  // Test: message handler - get-templates
  const getTemplatesResult = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-templates' }, {}, resolve);
    });
  });
  assert(getTemplatesResult.length === 10, 'BG: get-templates returns 10 templates');

  // Test: save a custom template
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({
        type: 'save-template',
        data: { id: 'tpl-custom', name: 'Custom', category: 'Test', subject: 'Hello', body: 'World', isBuiltIn: false, createdAt: Date.now() }
      }, {}, resolve);
    });
  });

  const afterSave = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-templates' }, {}, resolve);
    });
  });
  assert(afterSave.length === 11, 'BG: template count is 11 after save');

  // Test: delete template
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'delete-template', data: { id: 'tpl-custom' } }, {}, resolve);
    });
  });

  const afterDelete = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-templates' }, {}, resolve);
    });
  });
  assert(afterDelete.length === 10, 'BG: template count back to 10 after delete');

  // Test: save contacts
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({
        type: 'save-contacts',
        data: [
          { id: 'ct-1', email: 'a@test.com', first_name: 'Alice' },
          { id: 'ct-2', email: 'b@test.com', first_name: 'Bob' }
        ]
      }, {}, resolve);
    });
  });

  const contacts = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-contacts' }, {}, resolve);
    });
  });
  assert(contacts.length === 2, 'BG: 2 contacts saved');

  // Test: record send and check stats
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({
        type: 'record-send',
        data: { to: 'a@test.com', subject: 'Hello', sequenceId: null, step: 0 }
      }, {}, resolve);
    });
  });

  const stats = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-send-stats' }, {}, resolve);
    });
  });
  assert(stats.totalSent === 1, 'BG: totalSent is 1 after recording');
  assert(stats.dailySends === 1, 'BG: dailySends is 1');
  assert(stats.remaining === 49, 'BG: 49 remaining out of 50');

  // Test: record reply
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({
        type: 'record-reply',
        data: { from: 'a@test.com', subject: 'Hello' }
      }, {}, resolve);
    });
  });

  const dashData = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-dashboard-data' }, {}, resolve);
    });
  });
  assert(dashData.totalReplied === 1, 'BG: 1 reply recorded in dashboard');
  assert(dashData.replyRate === 100, 'BG: 100% reply rate (1/1)');

  // Test: check limits (free plan)
  const limits = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'check-limits' }, {}, resolve);
    });
  });
  assert(limits.premium === false, 'BG: not premium by default');
  assert(limits.limits.templates.max === 3, 'BG: free plan template limit is 3');
  assert(limits.limits.contacts.max === 10, 'BG: free plan contact limit is 10');

  // Test: activate premium
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'set-premium', data: { premium: true } }, {}, resolve);
    });
  });

  const premiumResult = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-premium' }, {}, resolve);
    });
  });
  assert(premiumResult.premium === true, 'BG: premium activated');

  // Test: sequence save
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({
        type: 'save-sequence',
        data: {
          id: 'seq-1',
          name: 'Test Sequence',
          status: 'active',
          steps: [
            { subject: 'Step 1: {first_name}', body: 'Hello {first_name}', delayDays: 0 },
            { subject: 'Step 2 follow-up', body: 'Following up', delayDays: 2 }
          ],
          enrollments: [
            { id: 'enr-1', contactId: 'ct-1', email: 'a@test.com', fields: { first_name: 'Alice' }, status: 'active', currentStep: 0, nextStepAt: Date.now() }
          ],
          createdAt: Date.now()
        }
      }, {}, resolve);
    });
  });

  const sequences = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-sequences' }, {}, resolve);
    });
  });
  assert(sequences.length === 1, 'BG: 1 sequence saved');
  assert(sequences[0].steps.length === 2, 'BG: sequence has 2 steps');
  assert(sequences[0].enrollments[0].email === 'a@test.com', 'BG: enrollment has correct email');

  // Test: pause sequence
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'pause-sequence', data: { id: 'seq-1' } }, {}, resolve);
    });
  });

  const pausedSeqs = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-sequences' }, {}, resolve);
    });
  });
  assert(pausedSeqs[0].status === 'paused', 'BG: sequence paused');

  // Test: resume sequence
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'resume-sequence', data: { id: 'seq-1' } }, {}, resolve);
    });
  });

  const resumedSeqs = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-sequences' }, {}, resolve);
    });
  });
  assert(resumedSeqs[0].status === 'active', 'BG: sequence resumed');

  // Test: daily reset
  await bgPage.evaluate(() => {
    return new Promise(resolve => {
      // Simulate the alarm handler
      window._onAlarm({ name: 'cf-daily-reset' });
      setTimeout(resolve, 100);
    });
  });

  const afterReset = await bgPage.evaluate(() => {
    return new Promise(resolve => {
      window._onMessage({ type: 'get-send-stats' }, {}, resolve);
    });
  });
  assert(afterReset.dailySends === 0, 'BG: daily sends reset to 0');

  await bgPage.close();
  await browser.close();

  summary();
})().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
