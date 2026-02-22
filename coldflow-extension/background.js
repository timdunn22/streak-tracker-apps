/* ==========================================================
   background.js  —  ColdFlow Service Worker
   Handles: alarm-based sequence scheduling, daily send
   limit resets, and message passing to content script.
   ========================================================== */

'use strict';

/* ---------- Constants ---------- */
const ALARM_SEQUENCE_CHECK = 'cf-sequence-check';
const ALARM_DAILY_RESET    = 'cf-daily-reset';
const CHECK_INTERVAL_MIN   = 1;  // check pending follow-ups every minute

/* ---------- Install / Startup ---------- */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await _seedDefaults();
  }
  _ensureAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  _ensureAlarms();
});

/* ---------- Alarm Listener ---------- */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_SEQUENCE_CHECK) {
    await processSequences();
  }
  if (alarm.name === ALARM_DAILY_RESET) {
    await resetDailySendCount();
  }
});

/* ---------- Message Listener ---------- */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handlers = {
    'get-templates':       handleGetTemplates,
    'save-template':       handleSaveTemplate,
    'delete-template':     handleDeleteTemplate,
    'get-contacts':        handleGetContacts,
    'save-contacts':       handleSaveContacts,
    'delete-contact':      handleDeleteContact,
    'get-sequences':       handleGetSequences,
    'save-sequence':       handleSaveSequence,
    'delete-sequence':     handleDeleteSequence,
    'pause-sequence':      handlePauseSequence,
    'resume-sequence':     handleResumeSequence,
    'stop-sequence':       handleStopSequence,
    'record-send':         handleRecordSend,
    'record-reply':        handleRecordReply,
    'get-send-stats':      handleGetSendStats,
    'get-settings':        handleGetSettings,
    'save-settings':       handleSaveSettings,
    'get-premium':         handleGetPremium,
    'set-premium':         handleSetPremium,
    'check-limits':        handleCheckLimits,
    'get-dashboard-data':  handleGetDashboardData,
  };

  const handler = handlers[msg.type];
  if (handler) {
    handler(msg.data).then(sendResponse).catch(err => {
      console.error('[ColdFlow BG]', err);
      sendResponse({ error: err.message });
    });
    return true; // keep channel open for async
  }
});

/* ==========================================================
   Handlers
   ========================================================== */

async function handleGetTemplates() {
  const { cf_templates = [] } = await chrome.storage.local.get('cf_templates');
  return cf_templates;
}

async function handleSaveTemplate(template) {
  const { cf_templates = [] } = await chrome.storage.local.get('cf_templates');
  const idx = cf_templates.findIndex(t => t.id === template.id);
  if (idx >= 0) {
    cf_templates[idx] = template;
  } else {
    cf_templates.push(template);
  }
  await chrome.storage.local.set({ cf_templates });
  return { ok: true };
}

async function handleDeleteTemplate(data) {
  let { cf_templates = [] } = await chrome.storage.local.get('cf_templates');
  cf_templates = cf_templates.filter(t => t.id !== data.id);
  await chrome.storage.local.set({ cf_templates });
  return { ok: true };
}

async function handleGetContacts() {
  const { cf_contacts = [] } = await chrome.storage.local.get('cf_contacts');
  return cf_contacts;
}

async function handleSaveContacts(data) {
  const { cf_contacts = [] } = await chrome.storage.local.get('cf_contacts');
  const incoming = Array.isArray(data) ? data : [data];
  incoming.forEach(c => {
    const idx = cf_contacts.findIndex(x => x.id === c.id);
    if (idx >= 0) cf_contacts[idx] = c;
    else cf_contacts.push(c);
  });
  await chrome.storage.local.set({ cf_contacts });
  return { ok: true, count: cf_contacts.length };
}

async function handleDeleteContact(data) {
  let { cf_contacts = [] } = await chrome.storage.local.get('cf_contacts');
  cf_contacts = cf_contacts.filter(c => c.id !== data.id);
  await chrome.storage.local.set({ cf_contacts });
  return { ok: true };
}

async function handleGetSequences() {
  const { cf_sequences = [] } = await chrome.storage.local.get('cf_sequences');
  return cf_sequences;
}

async function handleSaveSequence(seq) {
  const { cf_sequences = [] } = await chrome.storage.local.get('cf_sequences');
  const idx = cf_sequences.findIndex(s => s.id === seq.id);
  if (idx >= 0) {
    cf_sequences[idx] = seq;
  } else {
    cf_sequences.push(seq);
  }
  await chrome.storage.local.set({ cf_sequences });
  return { ok: true };
}

async function handleDeleteSequence(data) {
  let { cf_sequences = [] } = await chrome.storage.local.get('cf_sequences');
  cf_sequences = cf_sequences.filter(s => s.id !== data.id);
  await chrome.storage.local.set({ cf_sequences });
  return { ok: true };
}

async function handlePauseSequence(data) {
  const { cf_sequences = [] } = await chrome.storage.local.get('cf_sequences');
  const seq = cf_sequences.find(s => s.id === data.id);
  if (seq) seq.status = 'paused';
  await chrome.storage.local.set({ cf_sequences });
  return { ok: true };
}

async function handleResumeSequence(data) {
  const { cf_sequences = [] } = await chrome.storage.local.get('cf_sequences');
  const seq = cf_sequences.find(s => s.id === data.id);
  if (seq) seq.status = 'active';
  await chrome.storage.local.set({ cf_sequences });
  return { ok: true };
}

async function handleStopSequence(data) {
  const { cf_sequences = [] } = await chrome.storage.local.get('cf_sequences');
  const seq = cf_sequences.find(s => s.id === data.id);
  if (seq) {
    seq.status = 'stopped';
    seq.stoppedAt = Date.now();
  }
  await chrome.storage.local.set({ cf_sequences });
  return { ok: true };
}

async function handleRecordSend(data) {
  const { cf_send_log = [], cf_daily_sends = 0 } = await chrome.storage.local.get(['cf_send_log', 'cf_daily_sends']);
  cf_send_log.push({
    to: data.to,
    subject: data.subject,
    sentAt: Date.now(),
    sequenceId: data.sequenceId || null,
    step: data.step || 0,
    contactId: data.contactId || null
  });
  await chrome.storage.local.set({
    cf_send_log,
    cf_daily_sends: cf_daily_sends + 1
  });
  return { ok: true, dailySends: cf_daily_sends + 1 };
}

async function handleRecordReply(data) {
  const { cf_send_log = [], cf_sequences = [] } = await chrome.storage.local.get(['cf_send_log', 'cf_sequences']);

  // Mark in send log
  const entry = cf_send_log.find(e => e.to === data.from && e.subject === data.subject);
  if (entry) entry.repliedAt = Date.now();

  // Stop sequence for this contact if there's an active one
  if (data.from) {
    cf_sequences.forEach(seq => {
      if (seq.status === 'active') {
        const enrollment = (seq.enrollments || []).find(e => e.email === data.from);
        if (enrollment) {
          enrollment.status = 'replied';
          enrollment.repliedAt = Date.now();
        }
      }
    });
  }

  await chrome.storage.local.set({ cf_send_log, cf_sequences });
  return { ok: true };
}

async function handleGetSendStats() {
  const { cf_send_log = [], cf_daily_sends = 0, cf_settings = {} } = await chrome.storage.local.get(['cf_send_log', 'cf_daily_sends', 'cf_settings']);
  const limit = cf_settings.dailySendLimit || 50;
  return {
    totalSent: cf_send_log.length,
    dailySends: cf_daily_sends,
    dailyLimit: limit,
    remaining: Math.max(0, limit - cf_daily_sends)
  };
}

async function handleGetSettings() {
  const { cf_settings = {} } = await chrome.storage.local.get('cf_settings');
  return {
    dailySendLimit: 50,
    ...cf_settings
  };
}

async function handleSaveSettings(data) {
  const { cf_settings = {} } = await chrome.storage.local.get('cf_settings');
  Object.assign(cf_settings, data);
  await chrome.storage.local.set({ cf_settings });
  return { ok: true };
}

async function handleGetPremium() {
  const { cf_premium = false } = await chrome.storage.local.get('cf_premium');
  return { premium: cf_premium };
}

async function handleSetPremium(data) {
  await chrome.storage.local.set({ cf_premium: !!data.premium });
  return { ok: true };
}

async function handleCheckLimits() {
  const { cf_premium = false, cf_templates = [], cf_contacts = [], cf_sequences = [] } = await chrome.storage.local.get(['cf_premium', 'cf_templates', 'cf_contacts', 'cf_sequences']);

  if (cf_premium) {
    return { allowed: true };
  }

  const activeSeqs = cf_sequences.filter(s => s.status === 'active').length;
  return {
    allowed: true,
    limits: {
      templates:       { current: cf_templates.length,   max: 3,  hit: cf_templates.length >= 3 },
      contacts:        { current: cf_contacts.length,    max: 10, hit: cf_contacts.length >= 10 },
      activeSequences: { current: activeSeqs,            max: 1,  hit: activeSeqs >= 1 }
    },
    premium: false
  };
}

async function handleGetDashboardData() {
  const { cf_sequences = [], cf_send_log = [], cf_contacts = [], cf_daily_sends = 0, cf_settings = {} } =
    await chrome.storage.local.get(['cf_sequences', 'cf_send_log', 'cf_contacts', 'cf_daily_sends', 'cf_settings']);

  const active    = cf_sequences.filter(s => s.status === 'active');
  const paused    = cf_sequences.filter(s => s.status === 'paused');
  const completed = cf_sequences.filter(s => s.status === 'completed');
  const stopped   = cf_sequences.filter(s => s.status === 'stopped');

  // Pending follow-ups count
  let pendingFollowUps = 0;
  active.forEach(seq => {
    (seq.enrollments || []).forEach(en => {
      if (en.status === 'active' && en.nextStepAt && en.nextStepAt <= Date.now()) {
        pendingFollowUps++;
      }
    });
  });

  const replied = cf_send_log.filter(e => e.repliedAt).length;
  const limit = cf_settings.dailySendLimit || 50;

  return {
    sequences: { active: active.length, paused: paused.length, completed: completed.length, stopped: stopped.length },
    pendingFollowUps,
    totalSent: cf_send_log.length,
    totalReplied: replied,
    replyRate: cf_send_log.length > 0 ? Math.round((replied / cf_send_log.length) * 100) : 0,
    contactCount: cf_contacts.length,
    dailySends: cf_daily_sends,
    dailyLimit: limit
  };
}

/* ==========================================================
   Sequence Processor  —  runs on alarm
   ========================================================== */

async function processSequences() {
  const { cf_sequences = [], cf_daily_sends = 0, cf_settings = {} } = await chrome.storage.local.get(['cf_sequences', 'cf_daily_sends', 'cf_settings']);
  const limit = cf_settings.dailySendLimit || 50;

  let sendsToday = cf_daily_sends;
  let mutated = false;

  for (const seq of cf_sequences) {
    if (seq.status !== 'active') continue;

    for (const enrollment of (seq.enrollments || [])) {
      if (enrollment.status !== 'active') continue;
      if (!enrollment.nextStepAt || enrollment.nextStepAt > Date.now()) continue;
      if (sendsToday >= limit) {
        console.log('[ColdFlow] Daily send limit reached, deferring.');
        break;
      }

      const stepIndex = enrollment.currentStep || 0;
      const step = (seq.steps || [])[stepIndex];
      if (!step) {
        enrollment.status = 'completed';
        mutated = true;
        continue;
      }

      // Instead of actually sending (we can't send via Gmail API without OAuth),
      // we notify the content script to compose and send.
      try {
        const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*', active: true });
        if (tabs.length > 0) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: 'send-sequence-email',
            data: {
              sequenceId: seq.id,
              enrollmentId: enrollment.id,
              to: enrollment.email,
              subject: _mergePlaceholders(step.subject, enrollment.fields),
              body: _mergePlaceholders(step.body, enrollment.fields),
              step: stepIndex
            }
          });
          sendsToday++;
        }
      } catch (err) {
        console.warn('[ColdFlow] Could not send to content script:', err.message);
      }

      // Advance to next step
      const nextStepIndex = stepIndex + 1;
      if (nextStepIndex < seq.steps.length) {
        const nextStep = seq.steps[nextStepIndex];
        enrollment.currentStep = nextStepIndex;
        enrollment.nextStepAt = Date.now() + (nextStep.delayDays || 2) * 86400000;
      } else {
        enrollment.status = 'completed';
      }
      mutated = true;
    }

    // Check if all enrollments are done
    const allDone = (seq.enrollments || []).every(e => e.status !== 'active');
    if (allDone && seq.enrollments && seq.enrollments.length > 0) {
      seq.status = 'completed';
      mutated = true;
    }
  }

  if (mutated) {
    await chrome.storage.local.set({ cf_sequences, cf_daily_sends: sendsToday });
  }
}

/* ---------- Helpers ---------- */

function _mergePlaceholders(text, fields) {
  if (!text || !fields) return text || '';
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : match;
  });
}

async function _seedDefaults() {
  const defaults = {
    cf_templates: _getBuiltInTemplates(),
    cf_contacts: [],
    cf_sequences: [],
    cf_send_log: [],
    cf_daily_sends: 0,
    cf_premium: false,
    cf_settings: { dailySendLimit: 50 }
  };
  await chrome.storage.local.set(defaults);
}

function _ensureAlarms() {
  chrome.alarms.create(ALARM_SEQUENCE_CHECK, { periodInMinutes: CHECK_INTERVAL_MIN });
  // Reset daily sends at midnight-ish (every 1440 min = 24h)
  chrome.alarms.create(ALARM_DAILY_RESET, { periodInMinutes: 1440 });
}

async function resetDailySendCount() {
  await chrome.storage.local.set({ cf_daily_sends: 0 });
}

/* ---------- Built-in Templates ---------- */
function _getBuiltInTemplates() {
  return [
    {
      id: 'tpl-sales-intro',
      name: 'Sales Introduction',
      category: 'Sales',
      subject: 'Quick question about {company}',
      body: `Hi {first_name},\n\nI came across {company} and was impressed by what you're building.\n\nI work with companies like yours to help them [specific value prop]. We recently helped a similar company achieve [specific result].\n\nWould you be open to a quick 15-minute call this week to see if there's a fit?\n\nBest,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-sales-followup',
      name: 'Sales Follow-up',
      category: 'Sales',
      subject: 'Re: Quick question about {company}',
      body: `Hi {first_name},\n\nI wanted to follow up on my previous email. I know you're busy, so I'll keep this brief.\n\nI'd love to show you how we've helped companies like {company} solve [pain point]. It would only take 15 minutes.\n\nWould Tuesday or Thursday work better for a quick call?\n\nBest,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-link-building',
      name: 'Link Building Outreach',
      category: 'Link Building',
      subject: 'Content collaboration idea for {company}',
      body: `Hi {first_name},\n\nI've been reading {company}'s blog and really enjoyed your recent post on [topic].\n\nI just published a comprehensive guide on [related topic] that I think your readers would find valuable. Here's the link: [URL]\n\nWould you be interested in linking to it from your [specific page]? Happy to share it with our audience as well.\n\nCheers,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-partnership',
      name: 'Partnership Proposal',
      category: 'Partnership',
      subject: 'Partnership idea: {company} x [Your Company]',
      body: `Hi {first_name},\n\nI'm reaching out because I think there's a great opportunity for {company} and [Your Company] to collaborate.\n\nWe serve a similar audience but with complementary products. A partnership could help us both reach new customers without competing.\n\nHere's what I had in mind:\n- [Partnership idea 1]\n- [Partnership idea 2]\n\nWould you be open to exploring this further?\n\nBest regards,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-recruitment',
      name: 'Recruitment Outreach',
      category: 'Recruitment',
      subject: '{first_name}, exciting {title} opportunity',
      body: `Hi {first_name},\n\nI came across your profile and was impressed by your experience as a {title} at {company}.\n\nWe're building something exciting at [Your Company] and are looking for talented people like you to join our team. The role offers:\n\n- [Key benefit 1]\n- [Key benefit 2]\n- [Key benefit 3]\n\nWould you be interested in learning more? Even if the timing isn't right, I'd love to connect.\n\nBest,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-podcast-guest',
      name: 'Podcast Guest Pitch',
      category: 'PR',
      subject: 'Guest spot on [Podcast Name]?',
      body: `Hi {first_name},\n\nI host [Podcast Name], a podcast about [topic] with [X] listeners per episode.\n\nI've been following your work at {company} and think our audience would love to hear your perspective on [specific topic].\n\nThe format is a casual 30-45 minute conversation. Recent guests include [Name 1] and [Name 2].\n\nWould you be interested in being a guest?\n\nBest,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-breakup',
      name: 'Breakup Email (Final Follow-up)',
      category: 'Sales',
      subject: 'Should I close your file?',
      body: `Hi {first_name},\n\nI've reached out a few times and haven't heard back, which is totally fine — I know you're busy.\n\nI don't want to keep bothering you, so this will be my last email. If you're ever interested in [value prop], feel free to reach out anytime.\n\nWishing you and {company} all the best.\n\nCheers,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-event-invite',
      name: 'Event Invitation',
      category: 'Events',
      subject: '{first_name}, you\'re invited to [Event Name]',
      body: `Hi {first_name},\n\nI'd like to personally invite you to [Event Name] on [Date].\n\nWe're bringing together leaders from companies like {company} to discuss [topic]. The agenda includes:\n\n- [Speaker/Session 1]\n- [Speaker/Session 2]\n- Networking reception\n\nIt's a small, curated group (limited to [X] attendees) and I think you'd be a great addition.\n\nInterested? I can hold a spot for you.\n\nBest,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-feedback-request',
      name: 'Product Feedback Request',
      category: 'Product',
      subject: '{first_name}, quick favor?',
      body: `Hi {first_name},\n\nI'm the founder of [Your Company] and we're building [product description].\n\nAs a {title} at {company}, you're exactly the kind of person we're building this for. I'd love to get your honest feedback on our approach.\n\nWould you have 10 minutes for a quick chat? I'm happy to share early access as a thank you.\n\nAppreciate it,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    },
    {
      id: 'tpl-investor-cold',
      name: 'Investor Cold Email',
      category: 'Fundraising',
      subject: '{company} — [traction metric] in [timeframe]',
      body: `Hi {first_name},\n\nI'm the CEO of [Your Company]. We're [one-line description].\n\nIn the last [timeframe], we've achieved:\n- [Traction metric 1]\n- [Traction metric 2]\n- [Traction metric 3]\n\nWe're raising our [round] to [use of funds]. Given your investments in [relevant portfolio company], I think we'd be a great fit for your portfolio.\n\nCould I send over our deck?\n\nBest,\n[Your name]`,
      isBuiltIn: true,
      createdAt: Date.now()
    }
  ];
}
