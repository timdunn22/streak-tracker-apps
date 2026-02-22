/**
 * LinkedBoost Background Service Worker
 * Handles alarms for follow-up reminders and premium state management.
 */

// --- Premium / Freemium Limits ---
const FREE_LIMITS = {
  maxTemplates: 3,
  maxCRMContacts: 10,
  analyticsEnabled: false,
  remindersEnabled: false
};

// Initialize default storage on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.sync.set({
      premium: false,
      postTemplates: getDefaultPostTemplates(),
      dmTemplates: getDefaultDMTemplates()
    });
    await chrome.storage.local.set({
      crmContacts: {},
      trackedPosts: [],
      postAnalytics: { posts: [], bestTimes: {} }
    });
  }
});

// --- Follow-up Reminder Alarms ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('followup_')) {
    const profileUrl = alarm.name.replace('followup_', '');
    const { crmContacts } = await chrome.storage.local.get('crmContacts');
    const contact = crmContacts[profileUrl];
    if (contact) {
      // Send notification via the active LinkedIn tab
      const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*', active: true });
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'FOLLOWUP_REMINDER',
          contact
        });
      }
    }
  }
});

// --- Message Handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_FOLLOWUP_REMINDER') {
    const { profileUrl, reminderDate } = message;
    const when = new Date(reminderDate).getTime();
    chrome.alarms.create(`followup_${profileUrl}`, { when });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_LIMITS') {
    chrome.storage.sync.get('premium', (result) => {
      sendResponse(result.premium ? null : FREE_LIMITS);
    });
    return true;
  }

  if (message.type === 'CHECK_PREMIUM') {
    chrome.storage.sync.get('premium', (result) => {
      sendResponse({ premium: !!result.premium });
    });
    return true;
  }

  if (message.type === 'TRACK_POST') {
    handleTrackPost(message.postData).then(sendResponse);
    return true;
  }
});

async function handleTrackPost(postData) {
  const { trackedPosts } = await chrome.storage.local.get('trackedPosts');
  const posts = trackedPosts || [];
  const existing = posts.findIndex(p => p.id === postData.id);
  if (existing >= 0) {
    posts[existing] = { ...posts[existing], ...postData, updatedAt: Date.now() };
  } else {
    posts.push({ ...postData, createdAt: Date.now(), updatedAt: Date.now() });
  }
  // Keep only last 100 posts
  const trimmed = posts.slice(-100);
  await chrome.storage.local.set({ trackedPosts: trimmed });
  return { success: true };
}

// --- Default Templates ---
function getDefaultPostTemplates() {
  return [
    {
      id: 'hook_controversial',
      name: 'Controversial Hook',
      category: 'hook',
      content: 'Unpopular opinion:\n\n{your_take}\n\nHere\'s why:\n\n1. {reason_1}\n2. {reason_2}\n3. {reason_3}\n\nDo you agree? Drop your thoughts below.\n\n#Leadership #Growth'
    },
    {
      id: 'story_framework',
      name: 'Story Framework',
      category: 'story',
      content: '{time_period} ago, I {situation}.\n\nI felt {emotion}.\n\nThen I realized {lesson}.\n\nHere\'s what changed:\n\n\u2022 {change_1}\n\u2022 {change_2}\n\u2022 {change_3}\n\nThe biggest takeaway?\n\n{takeaway}\n\n\u2014\n\nRepost if this resonates. \u267B\uFE0F'
    },
    {
      id: 'list_post',
      name: 'List Post',
      category: 'list',
      content: '{number} {things} that {result}:\n\n1. {item_1}\n2. {item_2}\n3. {item_3}\n4. {item_4}\n5. {item_5}\n\nWhich one hits hardest?\n\nSave this for later. \uD83D\uDD16'
    }
  ];
}

function getDefaultDMTemplates() {
  return [
    {
      id: 'connection_request',
      name: 'Connection Request',
      category: 'connection',
      content: 'Hi {first_name}, I came across your profile and was impressed by your work at {company}. As a fellow {role} professional, I\'d love to connect and share insights. Looking forward to it!'
    },
    {
      id: 'followup',
      name: 'Follow-Up',
      category: 'follow-up',
      content: 'Hi {first_name}, thanks for connecting! I noticed you\'re doing great things at {company}. I\'d love to learn more about your work in {role}. Would you be open to a quick chat sometime?'
    },
    {
      id: 'pitch',
      name: 'Pitch',
      category: 'pitch',
      content: 'Hi {first_name}, I hope this message finds you well. I\'ve been following {company}\'s growth and believe we might be able to help with {pain_point}. Would you have 15 minutes this week to explore this?'
    }
  ];
}
