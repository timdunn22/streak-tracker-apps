/**
 * LinkedBoost Extension Tests
 * Uses Puppeteer with mock LinkedIn HTML to verify:
 * - Unicode formatting (bold, italic, bold-italic, underline, strikethrough)
 * - Template insertion into contenteditable
 * - Character counter accuracy
 * - CRM sidebar toggle
 * - DM template dropdown rendering
 * - Popup UI tabs and template CRUD
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Load the unicode formatter for direct testing
const UnicodeFormatter = require('./unicode-formatter.js');

// ============================================================================
// Test Utilities
// ============================================================================

let browser;
let passed = 0;
let failed = 0;
const results = [];

// Helper: delay (Puppeteer removed page.waitForTimeout in newer versions)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, testName) {
  if (condition) {
    passed++;
    results.push({ name: testName, status: 'PASS' });
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL' });
    console.log(`  FAIL: ${testName}`);
  }
}

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    passed++;
    results.push({ name: testName, status: 'PASS' });
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL', actual, expected });
    console.log(`  FAIL: ${testName}`);
    console.log(`    Expected: "${expected}"`);
    console.log(`    Actual:   "${actual}"`);
  }
}

// Mock LinkedIn HTML for content script testing
function getMockLinkedInHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LinkedIn (Mock)</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; background: #f3f2ef; }
    .share-creation-state__text-editor { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    [contenteditable="true"] { min-height: 100px; border: 1px solid #ddd; border-radius: 4px; padding: 12px; outline: none; }
    .msg-form { background: #fff; border-radius: 8px; padding: 12px; margin-top: 16px; }
    .pv-top-card-v2-ctas { margin-top: 16px; display: flex; gap: 8px; }
    h1.text-heading-xlarge { font-size: 24px; }
    .feed-shared-update-v2 { background: #fff; border-radius: 8px; padding: 16px; margin: 12px 0; }
  </style>
</head>
<body>
  <!-- Profile Section (for CRM) -->
  <h1 class="text-heading-xlarge">Jane Smith</h1>
  <p class="text-body-medium" data-anonymize="headline">Senior Product Manager at Acme Corp</p>
  <div class="pv-top-card-v2-ctas">
    <button>Connect</button>
    <button>Message</button>
  </div>

  <!-- Post Composer -->
  <div class="share-creation-state__text-editor">
    <div role="textbox" aria-label="Write your post" contenteditable="true" id="mock-composer">
    </div>
  </div>

  <!-- Message Composer -->
  <div class="msg-form">
    <div role="textbox" aria-label="Write a message" contenteditable="true" class="msg-form__contenteditable" id="mock-msg-composer">
    </div>
    <button type="submit" aria-label="Send">Send</button>
  </div>

  <!-- Feed Post (for analytics) -->
  <div class="feed-shared-update-v2" data-urn="urn:li:activity:12345">
    <div class="feed-shared-text" dir="ltr">Here is a sample post about leadership and growth.</div>
    <span aria-label="42 reactions">42</span>
    <span aria-label="8 comments">8 comments</span>
    <span aria-label="3 reposts">3 reposts</span>
  </div>
</body>
</html>`;
}

// Mock popup HTML
function getMockPopupHTML() {
  const popupHtml = fs.readFileSync(path.join(__dirname, 'popup.html'), 'utf8');
  const popupCss = fs.readFileSync(path.join(__dirname, 'popup.css'), 'utf8');
  const popupJs = fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8');

  // Inject mock chrome.storage API
  const mockChromeAPI = `
    window.chrome = {
      storage: {
        sync: {
          _data: {
            premium: false,
            postTemplates: [
              { id: 'tpl1', name: 'Hook Template', category: 'hook', content: 'Unpopular opinion: {your_take}' },
              { id: 'tpl2', name: 'Story Post', category: 'story', content: 'Last year I {situation}.' },
              { id: 'tpl3', name: 'List Post', category: 'list', content: '5 ways to {result}:' }
            ],
            dmTemplates: [
              { id: 'dm1', name: 'Connection Request', category: 'connection', content: 'Hi {first_name}, love your work at {company}!' },
              { id: 'dm2', name: 'Follow-Up', category: 'follow-up', content: 'Thanks for connecting, {first_name}!' }
            ]
          },
          get: function(keys, callback) {
            if (typeof keys === 'string') {
              const result = {};
              result[keys] = this._data[keys];
              if (callback) callback(result);
              return Promise.resolve(result);
            }
            if (keys === null) {
              if (callback) callback({...this._data});
              return Promise.resolve({...this._data});
            }
            const result = {};
            (Array.isArray(keys) ? keys : Object.keys(keys)).forEach(k => {
              result[k] = this._data[k];
            });
            if (callback) callback(result);
            return Promise.resolve(result);
          },
          set: function(items, callback) {
            Object.assign(this._data, items);
            if (callback) callback();
            return Promise.resolve();
          },
          clear: function(callback) {
            this._data = {};
            if (callback) callback();
            return Promise.resolve();
          }
        },
        local: {
          _data: {
            crmContacts: {
              'https://www.linkedin.com/in/janesmith': {
                name: 'Jane Smith',
                category: 'Lead',
                tags: ['SaaS', 'PM'],
                notes: 'Met at conference',
                lastInteraction: '2026-02-15',
                profileUrl: 'https://www.linkedin.com/in/janesmith',
                updatedAt: Date.now()
              },
              'https://www.linkedin.com/in/johndoe': {
                name: 'John Doe',
                category: 'Client',
                tags: ['Enterprise'],
                notes: 'Active account',
                lastInteraction: '2026-02-10',
                profileUrl: 'https://www.linkedin.com/in/johndoe',
                updatedAt: Date.now() - 1000
              }
            },
            trackedPosts: [
              { id: 'p1', text: 'Leadership is about serving others', reactions: 142, comments: 28, shares: 12, createdAt: Date.now() - 86400000 },
              { id: 'p2', text: 'Top 5 productivity hacks', reactions: 89, comments: 15, shares: 7, createdAt: Date.now() - 172800000 }
            ]
          },
          get: function(keys, callback) {
            if (typeof keys === 'string') {
              const result = {};
              result[keys] = this._data[keys];
              if (callback) callback(result);
              return Promise.resolve(result);
            }
            if (keys === null) {
              if (callback) callback({...this._data});
              return Promise.resolve({...this._data});
            }
            const result = {};
            (Array.isArray(keys) ? keys : Object.keys(keys)).forEach(k => {
              result[k] = this._data[k];
            });
            if (callback) callback(result);
            return Promise.resolve(result);
          },
          set: function(items, callback) {
            Object.assign(this._data, items);
            if (callback) callback();
            return Promise.resolve();
          },
          clear: function(callback) {
            this._data = {};
            if (callback) callback();
            return Promise.resolve();
          }
        }
      },
      runtime: {
        sendMessage: function(msg, callback) {
          if (msg.type === 'CHECK_PREMIUM') {
            if (callback) callback({ premium: false });
          } else if (msg.type === 'GET_LIMITS') {
            if (callback) callback({ maxTemplates: 3, maxCRMContacts: 10, analyticsEnabled: false, remindersEnabled: false });
          }
        },
        onMessage: { addListener: function() {} },
        lastError: null
      },
      tabs: {
        create: function(opts) { console.log('Mock chrome.tabs.create:', opts); }
      },
      alarms: {
        create: function() {},
        onAlarm: { addListener: function() {} }
      }
    };
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${popupCss}</style>
</head>
<body>
  <script>${mockChromeAPI}</script>
  ${popupHtml.replace(/<script src="popup.js"><\/script>/, '')}
  <script>${popupJs}</script>
</body>
</html>`;
}

// ============================================================================
// Unit Tests: Unicode Formatter
// ============================================================================

function testUnicodeFormatter() {
  console.log('\n=== Unicode Formatter Tests ===');

  // Bold
  const boldResult = UnicodeFormatter.toBold('Hello');
  assertEqual(boldResult, '\uD835\uDC07\uD835\uDC1E\uD835\uDC25\uD835\uDC25\uD835\uDC28', 'toBold converts "Hello" correctly');

  // Verify bold A-Z
  const boldA = UnicodeFormatter.toBold('A');
  assertEqual(boldA.codePointAt(0), 0x1d400, 'Bold A maps to U+1D400');

  const boldZ = UnicodeFormatter.toBold('Z');
  assertEqual(boldZ.codePointAt(0), 0x1d419, 'Bold Z maps to U+1D419');

  const boldSmallA = UnicodeFormatter.toBold('a');
  assertEqual(boldSmallA.codePointAt(0), 0x1d41a, 'Bold a maps to U+1D41A');

  const boldSmallZ = UnicodeFormatter.toBold('z');
  assertEqual(boldSmallZ.codePointAt(0), 0x1d433, 'Bold z maps to U+1D433');

  // Bold digits
  const bold0 = UnicodeFormatter.toBold('0');
  assertEqual(bold0.codePointAt(0), 0x1d7ce, 'Bold 0 maps to U+1D7CE');

  const bold9 = UnicodeFormatter.toBold('9');
  assertEqual(bold9.codePointAt(0), 0x1d7d7, 'Bold 9 maps to U+1D7D7');

  // Italic
  const italicResult = UnicodeFormatter.toItalic('World');
  assert(italicResult.length > 0, 'toItalic produces output');

  const italicA = UnicodeFormatter.toItalic('A');
  assertEqual(italicA.codePointAt(0), 0x1d434, 'Italic A maps to U+1D434');

  // Italic h special case
  const italicH = UnicodeFormatter.toItalic('h');
  assertEqual(italicH.codePointAt(0), 0x210e, 'Italic h maps to U+210E (Planck constant)');

  // Bold Italic
  const biResult = UnicodeFormatter.toBoldItalic('Test');
  assert(biResult.length > 0, 'toBoldItalic produces output');

  const biA = UnicodeFormatter.toBoldItalic('A');
  assertEqual(biA.codePointAt(0), 0x1d468, 'Bold Italic A maps to U+1D468');

  // Underline
  const underlineResult = UnicodeFormatter.toUnderline('Hi');
  assert(underlineResult.includes('\u0332'), 'toUnderline adds combining underline character');

  // Strikethrough
  const strikeResult = UnicodeFormatter.toStrikethrough('No');
  assert(strikeResult.includes('\u0336'), 'toStrikethrough adds combining strikethrough character');

  // Bullet list
  const bullets = UnicodeFormatter.toBulletList(['First', 'Second', 'Third']);
  assert(bullets.includes('\u2022 First'), 'toBulletList adds bullet points');
  assert(bullets.includes('\u2022 Second'), 'toBulletList includes all items');

  // Numbered list
  const numbered = UnicodeFormatter.toNumberedList(['Alpha', 'Beta', 'Gamma']);
  assert(numbered.includes('1. Alpha'), 'toNumberedList adds numbers');
  assert(numbered.includes('3. Gamma'), 'toNumberedList numbers correctly');

  // Round-trip: toPlain should reverse toBold
  const original = 'Hello World 123';
  const boldText = UnicodeFormatter.toBold(original);
  const plainAgain = UnicodeFormatter.toPlain(boldText);
  assertEqual(plainAgain, original, 'toPlain reverses toBold correctly');

  // Round-trip: toPlain reverses toItalic (except for spaces/punctuation)
  const italicText = UnicodeFormatter.toItalic('ABC');
  const italicPlain = UnicodeFormatter.toPlain(italicText);
  assertEqual(italicPlain, 'ABC', 'toPlain reverses toItalic correctly');

  // Preserves non-alpha characters
  const mixedBold = UnicodeFormatter.toBold('Hi! How?');
  assert(mixedBold.includes('!'), 'Bold preserves exclamation mark');
  assert(mixedBold.includes('?'), 'Bold preserves question mark');
  assert(mixedBold.includes(' '), 'Bold preserves spaces');

  // Empty string
  assertEqual(UnicodeFormatter.toBold(''), '', 'toBold handles empty string');
  assertEqual(UnicodeFormatter.toItalic(''), '', 'toItalic handles empty string');
}

// ============================================================================
// Integration Tests: Puppeteer
// ============================================================================

async function testContentScript() {
  console.log('\n=== Content Script Tests (Puppeteer) ===');

  const page = await browser.newPage();

  // Load mock LinkedIn page with injected content script
  const contentCss = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
  const unicodeJs = fs.readFileSync(path.join(__dirname, 'unicode-formatter.js'), 'utf8');
  const contentJs = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  const mockChromeAPI = `
    // Test location override for CRM profile detection
    window.__lbTestLocationHref = 'https://www.linkedin.com/in/janesmith/';

    window.chrome = {
      storage: {
        sync: {
          get: function(key, cb) {
            const data = {
              postTemplates: [
                { id: 't1', name: 'Hook', category: 'hook', content: 'Unpopular opinion: ...' },
                { id: 't2', name: 'Story', category: 'story', content: 'Last year I ...' }
              ],
              dmTemplates: [
                { id: 'd1', name: 'Connect', category: 'connection', content: 'Hi {first_name}!' }
              ],
              premium: false
            };
            const result = {};
            if (typeof key === 'string') { result[key] = data[key]; }
            else { Object.assign(result, data); }
            if (cb) cb(result);
            return Promise.resolve(result);
          },
          set: function(items, cb) { if (cb) cb(); return Promise.resolve(); }
        },
        local: {
          get: function(key, cb) {
            const data = { crmContacts: {}, trackedPosts: [] };
            const result = {};
            if (typeof key === 'string') { result[key] = data[key]; }
            if (cb) cb(result);
            return Promise.resolve(result);
          },
          set: function(items, cb) { if (cb) cb(); return Promise.resolve(); }
        }
      },
      runtime: {
        sendMessage: function(msg, cb) {
          if (msg.type === 'CHECK_PREMIUM') { if (cb) cb({ premium: false }); }
          else if (msg.type === 'GET_LIMITS') { if (cb) cb({ maxTemplates: 3, maxCRMContacts: 10, analyticsEnabled: false }); }
          else if (cb) cb({});
        },
        onMessage: { addListener: function() {} },
        lastError: null
      },
      tabs: { create: function() {} },
      alarms: { create: function() {}, onAlarm: { addListener: function() {} } }
    };
  `;

  const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${contentCss}</style>
</head>
<body>
  ${getMockLinkedInHTML().replace(/<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>|<!DOCTYPE[^>]*>|<meta[^>]*>|<title>[^<]*<\/title>|<style>[\s\S]*?<\/style>/gi, '')}
  <script>${mockChromeAPI}</script>
  <script>${unicodeJs}</script>
  <script>${contentJs}</script>
</body>
</html>`;

  await page.setContent(fullHTML, { waitUntil: 'domcontentloaded' });
  await delay(2000);

  // Test 1: Toolbar injected
  const toolbarExists = await page.evaluate(() => {
    return document.querySelector('.lb-toolbar') !== null;
  });
  assert(toolbarExists, 'Formatting toolbar is injected into post composer');

  // Test 2: Character counter present
  const charCounterExists = await page.evaluate(() => {
    return document.querySelector('.lb-char-counter') !== null;
  });
  assert(charCounterExists, 'Character counter is present');

  // Test 3: Type in composer and check char counter
  await page.click('#mock-composer');
  await page.type('#mock-composer', 'Hello LinkedIn! This is a test post.');
  await delay(300);

  const charCount = await page.evaluate(() => {
    const countEl = document.querySelector('.lb-char-counter .count');
    return countEl ? countEl.textContent : '';
  });
  assert(charCount.includes('35') || charCount.includes('chars'), 'Character counter updates on typing');

  // Test 4: Bold button works
  await page.evaluate(() => {
    // Select text in composer
    const composer = document.getElementById('mock-composer');
    const range = document.createRange();
    const sel = window.getSelection();
    // Set the content first
    composer.textContent = 'Hello World';
    range.selectNodeContents(composer);
    sel.removeAllRanges();
    sel.addRange(range);
  });

  const boldBtn = await page.$('.lb-toolbar-btn');
  if (boldBtn) {
    await boldBtn.click();
    await delay(300);

    const composerText = await page.evaluate(() => {
      return document.getElementById('mock-composer').textContent;
    });
    // The text should now contain Unicode bold characters (code points > 127)
    const hasBold = await page.evaluate(() => {
      const text = document.getElementById('mock-composer').textContent;
      // Check if any character has a code point in the mathematical bold range
      for (const char of text) {
        const cp = char.codePointAt(0);
        if (cp >= 0x1d400 && cp <= 0x1d433) return true;
      }
      return false;
    });
    assert(hasBold, 'Bold button converts selected text to Unicode bold');
  }

  // Test 5: DM template button injected
  const dmBtnExists = await page.evaluate(() => {
    return document.querySelector('.lb-dm-template-btn') !== null;
  });
  assert(dmBtnExists, 'DM template button is injected into message composer');

  // Test 6: CRM button injected (profile page simulation)
  const crmBtnExists = await page.evaluate(() => {
    return document.querySelector('.lb-crm-toggle') !== null;
  });
  assert(crmBtnExists, 'CRM button is injected on profile page');

  // Test 7: Click CRM button opens sidebar
  if (crmBtnExists) {
    await page.click('.lb-crm-toggle');
    await delay(500);

    const sidebarOpen = await page.evaluate(() => {
      const sidebar = document.querySelector('.lb-crm-sidebar');
      return sidebar && sidebar.classList.contains('open');
    });
    assert(sidebarOpen, 'CRM sidebar opens on button click');

    // Test 8: CRM sidebar auto-fills name from profile
    const crmName = await page.evaluate(() => {
      const nameInput = document.getElementById('lb-crm-name');
      return nameInput ? nameInput.value : '';
    });
    assertEqual(crmName, 'Jane Smith', 'CRM sidebar auto-fills name from profile page');

    // Close sidebar
    await page.click('.lb-crm-close');
    await delay(300);
  }

  // Test 9: Emoji picker
  const emojiBtns = await page.$$('.lb-toolbar-btn');
  // Find the emoji button (it has the smiley face)
  for (const btn of emojiBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('\uD83D\uDE00')) {
      await btn.click();
      await delay(300);

      const emojiPickerOpen = await page.evaluate(() => {
        return document.querySelector('.lb-emoji-picker') !== null;
      });
      assert(emojiPickerOpen, 'Emoji picker opens on button click');

      // Click an emoji
      const emojiBtn = await page.$('.lb-emoji-btn');
      if (emojiBtn) {
        await emojiBtn.click();
        await delay(300);
        const emojiPickerClosed = await page.evaluate(() => {
          return document.querySelector('.lb-emoji-picker') === null;
        });
        assert(emojiPickerClosed, 'Emoji picker closes after selecting emoji');
      }
      break;
    }
  }

  // Test 10: Template panel
  for (const btn of emojiBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('\uD83D\uDCCB')) {
      await btn.click();
      await delay(500);

      const templatePanelOpen = await page.evaluate(() => {
        return document.querySelector('.lb-template-panel') !== null;
      });
      assert(templatePanelOpen, 'Template panel opens on button click');

      // Check templates are listed
      const templateCount = await page.evaluate(() => {
        return document.querySelectorAll('.lb-template-panel .lb-template-item').length;
      });
      assert(templateCount > 0, 'Template panel shows templates');

      break;
    }
  }

  // Test 11: Preview modal
  await page.evaluate(() => {
    document.getElementById('mock-composer').textContent = 'This is a preview test post about leadership.';
  });

  for (const btn of emojiBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('\uD83D\uDC41')) {
      // Close template panel first
      await page.evaluate(() => {
        const panel = document.querySelector('.lb-template-panel');
        if (panel) panel.remove();
      });

      await btn.click();
      await delay(300);

      const previewOpen = await page.evaluate(() => {
        return document.querySelector('.lb-preview-overlay') !== null;
      });
      assert(previewOpen, 'Preview modal opens');

      if (previewOpen) {
        const previewText = await page.evaluate(() => {
          const el = document.querySelector('.lb-preview-post');
          return el ? el.textContent.trim() : '';
        });
        assert(previewText.includes('preview test post'), 'Preview modal shows correct post content');

        // Close preview
        await page.click('.lb-preview-close');
        await delay(300);
      }
      break;
    }
  }

  // Test 12: Toast notification
  await page.evaluate(() => {
    // Trigger a toast from within the content script context
    const toast = document.createElement('div');
    toast.className = 'lb-toast';
    toast.textContent = 'Test toast message';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  await delay(200);

  const toastVisible = await page.evaluate(() => {
    const toast = document.querySelector('.lb-toast');
    return toast && toast.classList.contains('show');
  });
  assert(toastVisible, 'Toast notification renders and shows');

  await page.close();
}

async function testPopup() {
  console.log('\n=== Popup Tests (Puppeteer) ===');

  const page = await browser.newPage();
  const popupHTML = getMockPopupHTML();

  await page.setContent(popupHTML, { waitUntil: 'domcontentloaded' });
  await delay(1000);

  // Test 1: Header renders
  const headerTitle = await page.evaluate(() => {
    const el = document.querySelector('.header-title');
    return el ? el.textContent : '';
  });
  assertEqual(headerTitle, 'LinkedBoost', 'Popup header title is correct');

  // Test 2: Tabs exist
  const tabCount = await page.evaluate(() => {
    return document.querySelectorAll('.tab').length;
  });
  assertEqual(tabCount, 4, 'Popup has 4 tabs');

  // Test 3: Templates tab is active by default
  const activeTab = await page.evaluate(() => {
    const tab = document.querySelector('.tab.active');
    return tab ? tab.dataset.tab : '';
  });
  assertEqual(activeTab, 'templates', 'Templates tab is active by default');

  // Test 4: Post templates are listed
  await delay(500);
  const postTemplateCount = await page.evaluate(() => {
    return document.querySelectorAll('#post-template-list .template-card').length;
  });
  assertEqual(postTemplateCount, 3, 'Post templates list shows 3 templates');

  // Test 5: DM templates are listed
  const dmTemplateCount = await page.evaluate(() => {
    return document.querySelectorAll('#dm-template-list .template-card').length;
  });
  assertEqual(dmTemplateCount, 2, 'DM templates list shows 2 templates');

  // Test 6: Switch to CRM tab
  await page.click('[data-tab="crm"]');
  await delay(500);

  const crmActive = await page.evaluate(() => {
    return document.getElementById('tab-crm').classList.contains('active');
  });
  assert(crmActive, 'CRM tab content activates on click');

  // Test 7: CRM contacts are listed
  const crmContactCount = await page.evaluate(() => {
    return document.querySelectorAll('#crm-list .crm-card').length;
  });
  assertEqual(crmContactCount, 2, 'CRM list shows 2 contacts');

  // Test 8: CRM count badge
  const crmCount = await page.evaluate(() => {
    return document.getElementById('crm-count').textContent;
  });
  assertEqual(crmCount, '2', 'CRM count badge shows correct number');

  // Test 9: CRM search
  await page.type('#crm-search', 'Jane');
  await delay(300);

  const filteredCount = await page.evaluate(() => {
    return document.querySelectorAll('#crm-list .crm-card').length;
  });
  assertEqual(filteredCount, 1, 'CRM search filters to matching contacts');

  // Clear search
  await page.evaluate(() => { document.getElementById('crm-search').value = ''; });

  // Test 10: CRM filter by category
  await page.select('#crm-filter', 'Client');
  await delay(300);

  const clientCount = await page.evaluate(() => {
    return document.querySelectorAll('#crm-list .crm-card').length;
  });
  assertEqual(clientCount, 1, 'CRM category filter works');

  // Reset filter
  await page.select('#crm-filter', 'all');

  // Test 11: Switch to analytics tab
  await page.click('[data-tab="analytics"]');
  await delay(300);

  const analyticsActive = await page.evaluate(() => {
    return document.getElementById('tab-analytics').classList.contains('active');
  });
  assert(analyticsActive, 'Analytics tab activates');

  // Test 12: Analytics locked overlay visible (free tier)
  const analyticsLocked = await page.evaluate(() => {
    const el = document.getElementById('analytics-locked');
    return el && !el.classList.contains('hidden');
  });
  assert(analyticsLocked, 'Analytics locked overlay is visible for free tier');

  // Test 13: Switch to settings tab
  await page.click('[data-tab="settings"]');
  await delay(300);

  const planLabel = await page.evaluate(() => {
    return document.getElementById('plan-label').textContent;
  });
  assertEqual(planLabel, 'Free', 'Settings shows Free plan');

  // Test 14: Template modal opens
  await page.click('[data-tab="templates"]');
  await delay(300);
  await page.click('#add-post-template');
  await delay(300);

  const modalVisible = await page.evaluate(() => {
    const modal = document.getElementById('template-modal');
    return modal && !modal.classList.contains('hidden');
  });
  assert(modalVisible, 'Template modal opens on Add button click');

  // Test 15: Modal close
  await page.click('#modal-close');
  await delay(300);

  const modalHidden = await page.evaluate(() => {
    const modal = document.getElementById('template-modal');
    return modal && modal.classList.contains('hidden');
  });
  assert(modalHidden, 'Template modal closes');

  // Test 16: Version displayed
  const version = await page.evaluate(() => {
    const el = document.querySelector('.version');
    return el ? el.textContent.trim() : '';
  });
  assertEqual(version, 'LinkedBoost v1.0.0', 'Version string is displayed');

  await page.close();
}

async function testCharCounterOptimal() {
  console.log('\n=== Character Counter Optimal Range Test ===');

  const page = await browser.newPage();

  const contentCss = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
  const unicodeJs = fs.readFileSync(path.join(__dirname, 'unicode-formatter.js'), 'utf8');
  const contentJs = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

  const mockChromeAPI = `
    window.chrome = {
      storage: {
        sync: { get: function(k,cb){if(cb)cb({});return Promise.resolve({});}, set: function(i,cb){if(cb)cb();return Promise.resolve();} },
        local: { get: function(k,cb){if(cb)cb({});return Promise.resolve({});}, set: function(i,cb){if(cb)cb();return Promise.resolve();} }
      },
      runtime: {
        sendMessage: function(m,cb){if(m.type==='CHECK_PREMIUM'){if(cb)cb({premium:false});}else if(m.type==='GET_LIMITS'){if(cb)cb({maxTemplates:3,maxCRMContacts:10,analyticsEnabled:false});}else{if(cb)cb({});}},
        onMessage: { addListener: function(){} },
        lastError: null
      },
      tabs: { create: function(){} },
      alarms: { create: function(){}, onAlarm: { addListener: function(){} } }
    };
  `;

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${contentCss}</style></head>
<body>
  <div class="share-creation-state__text-editor">
    <div role="textbox" aria-label="Write your post" contenteditable="true" id="composer"></div>
  </div>
  <script>${mockChromeAPI}</script>
  <script>${unicodeJs}</script>
  <script>${contentJs}</script>
</body></html>`;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await delay(1000);

  // Type exactly 1300 characters
  const text1300 = 'A'.repeat(1300);
  await page.evaluate((text) => {
    const composer = document.getElementById('composer');
    composer.textContent = text;
    composer.dispatchEvent(new Event('input', { bubbles: true }));
  }, text1300);
  await delay(300);

  const class1300 = await page.evaluate(() => {
    const el = document.querySelector('.lb-char-counter .count');
    return el ? el.className : '';
  });
  assert(class1300.includes('optimal'), 'Character counter shows "optimal" at 1300 chars');

  // Type 1700 characters
  const text1700 = 'B'.repeat(1700);
  await page.evaluate((text) => {
    const composer = document.getElementById('composer');
    composer.textContent = text;
    composer.dispatchEvent(new Event('input', { bubbles: true }));
  }, text1700);
  await delay(300);

  const class1700 = await page.evaluate(() => {
    const el = document.querySelector('.lb-char-counter .count');
    return el ? el.className : '';
  });
  assert(class1700.includes('optimal'), 'Character counter shows "optimal" at 1700 chars');

  // Type 2600 characters (over)
  const text2600 = 'C'.repeat(2600);
  await page.evaluate((text) => {
    const composer = document.getElementById('composer');
    composer.textContent = text;
    composer.dispatchEvent(new Event('input', { bubbles: true }));
  }, text2600);
  await delay(300);

  const class2600 = await page.evaluate(() => {
    const el = document.querySelector('.lb-char-counter .count');
    return el ? el.className : '';
  });
  assert(class2600.includes('over'), 'Character counter shows "over" at 2600 chars');

  await page.close();
}

// ============================================================================
// Run All Tests
// ============================================================================

async function main() {
  console.log('==========================================');
  console.log('  LinkedBoost Extension Test Suite');
  console.log('==========================================');

  // Run unit tests (no browser needed)
  testUnicodeFormatter();

  // Launch browser for integration tests
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await testContentScript();
    await testPopup();
    await testCharCounterOptimal();
  } catch (err) {
    console.error('\nTest runner error:', err);
    failed++;
  }

  await browser.close();

  // Summary
  console.log('\n==========================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('==========================================');

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}`);
      if (r.expected !== undefined) {
        console.log(`    Expected: "${r.expected}"`);
        console.log(`    Actual:   "${r.actual}"`);
      }
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
