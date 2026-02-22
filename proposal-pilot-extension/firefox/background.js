/* ============================================================
   ProposalPilot — Background Service Worker (MV3)
   ============================================================ */

// --------------- Default Data ---------------

const DEFAULT_TEMPLATES = [
  {
    id: "web-dev-general",
    name: "Web Development — General",
    category: "Web Development",
    body: `Hi {client_name},

I read through your job post for "{project_title}" and I'm confident I can deliver exactly what you need.

With over [X] years of experience in {skills}, I've completed similar projects and understand the nuances involved. Here's how I'd approach this:

1. **Discovery** — I'll review your requirements in detail and ask clarifying questions up front so there are no surprises.
2. **Development** — Clean, well-documented code with regular progress updates.
3. **Delivery** — Thorough testing before handoff, plus a walkthrough so you're comfortable with everything.

I noticed your budget is around {budget} — I can work within that range and will give you a detailed estimate after our initial conversation.

I'd love to discuss this further. When's a good time to chat?

Best,
[Your Name]`,
    isDefault: true
  },
  {
    id: "design-ui-ux",
    name: "UI/UX Design",
    category: "Design",
    body: `Hi {client_name},

Your project "{project_title}" caught my eye — I love working on projects where great design can make a real impact.

My background in {skills} means I approach every project with both aesthetics and usability in mind. Here's what sets my work apart:

- **User-centered process** — I start with understanding your audience, not jumping straight to pixels.
- **Iteration** — You'll see concepts early and often, so we stay aligned.
- **Deliverables** — Production-ready files in whatever format your team needs.

I've attached a few relevant pieces from my portfolio. I'd be happy to walk you through them.

Looking forward to hearing from you!

Best,
[Your Name]`,
    isDefault: true
  },
  {
    id: "writing-content",
    name: "Content Writing",
    category: "Writing",
    body: `Hi {client_name},

I'd love to help with "{project_title}." Writing compelling content that actually drives results is what I do best.

A few things about my approach:
- I research your industry and audience before writing a single word.
- Every piece goes through my personal editing process — you'll get polished, publish-ready work.
- I'm flexible on revisions and committed to nailing your voice and tone.

My experience with {skills} makes me well-suited for this project, and I can comfortably work within your {budget} budget.

Happy to share relevant writing samples. Shall we set up a quick call?

Best,
[Your Name]`,
    isDefault: true
  }
];

const DEFAULT_SETTINGS = {
  premiumKey: "",
  isPremium: false,
  dailyProposalCount: 0,
  dailyResetDate: new Date().toDateString(),
  maxFreeProposals: 5,
  maxFreeTemplates: 3
};

// --------------- Installation ---------------

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // Sync storage: templates + settings
    await chrome.storage.sync.set({
      templates: DEFAULT_TEMPLATES,
      settings: DEFAULT_SETTINGS
    });

    // Local storage: proposal history + stats
    await chrome.storage.local.set({
      proposals: [],
      stats: {
        totalApplied: 0,
        totalSkipped: 0,
        totalWon: 0,
        totalLost: 0,
        proposalsByDate: {},
        templateUsage: {}
      }
    });
  }
});

// --------------- Message Handler ---------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // keep channel open for async
});

async function handleMessage(message) {
  switch (message.action) {
    case "getTemplates":
      return getTemplates();

    case "saveTemplate":
      return saveTemplate(message.template);

    case "deleteTemplate":
      return deleteTemplate(message.templateId);

    case "trackProposal":
      return trackProposal(message.proposal);

    case "updateProposalStatus":
      return updateProposalStatus(message.proposalId, message.status);

    case "getProposals":
      return getProposals();

    case "getStats":
      return getStats();

    case "getSettings":
      return getSettings();

    case "checkDailyLimit":
      return checkDailyLimit();

    case "incrementDailyCount":
      return incrementDailyCount();

    case "activatePremium":
      return activatePremium(message.key);

    case "exportAnalytics":
      return exportAnalytics();

    default:
      return { error: "Unknown action" };
  }
}

// --------------- Templates ---------------

async function getTemplates() {
  const data = await chrome.storage.sync.get("templates");
  return { templates: data.templates || [] };
}

async function saveTemplate(template) {
  const data = await chrome.storage.sync.get(["templates", "settings"]);
  const templates = data.templates || [];
  const settings = data.settings || DEFAULT_SETTINGS;

  // Free tier limit
  const customCount = templates.filter((t) => !t.isDefault).length;
  if (
    !settings.isPremium &&
    !template.isDefault &&
    customCount >= settings.maxFreeTemplates
  ) {
    const existing = templates.find((t) => t.id === template.id);
    if (!existing) {
      return {
        error: "Free plan limited to 3 custom templates. Upgrade to Premium for unlimited."
      };
    }
  }

  const idx = templates.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }

  await chrome.storage.sync.set({ templates });
  return { success: true, templates };
}

async function deleteTemplate(templateId) {
  const data = await chrome.storage.sync.get("templates");
  const templates = (data.templates || []).filter((t) => t.id !== templateId);
  await chrome.storage.sync.set({ templates });
  return { success: true, templates };
}

// --------------- Proposals ---------------

async function trackProposal(proposal) {
  const data = await chrome.storage.local.get(["proposals", "stats"]);
  const proposals = data.proposals || [];
  const stats = data.stats || {};

  proposal.id = proposal.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  proposal.trackedAt = new Date().toISOString();

  proposals.unshift(proposal); // newest first

  // Update stats
  const dateKey = new Date().toISOString().slice(0, 10);
  stats.proposalsByDate = stats.proposalsByDate || {};
  stats.proposalsByDate[dateKey] = (stats.proposalsByDate[dateKey] || 0) + 1;

  if (proposal.status === "applied") stats.totalApplied = (stats.totalApplied || 0) + 1;
  if (proposal.status === "skipped") stats.totalSkipped = (stats.totalSkipped || 0) + 1;

  if (proposal.templateId) {
    stats.templateUsage = stats.templateUsage || {};
    stats.templateUsage[proposal.templateId] =
      (stats.templateUsage[proposal.templateId] || 0) + 1;
  }

  await chrome.storage.local.set({ proposals, stats });
  return { success: true, proposal };
}

async function updateProposalStatus(proposalId, status) {
  const data = await chrome.storage.local.get(["proposals", "stats"]);
  const proposals = data.proposals || [];
  const stats = data.stats || {};

  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) return { error: "Proposal not found" };

  const oldStatus = proposal.status;
  proposal.status = status;
  proposal.updatedAt = new Date().toISOString();

  // Adjust stat counters
  const statusMap = { applied: "totalApplied", skipped: "totalSkipped", won: "totalWon", lost: "totalLost" };
  if (statusMap[oldStatus]) stats[statusMap[oldStatus]] = Math.max(0, (stats[statusMap[oldStatus]] || 0) - 1);
  if (statusMap[status]) stats[statusMap[status]] = (stats[statusMap[status]] || 0) + 1;

  await chrome.storage.local.set({ proposals, stats });
  return { success: true, proposal };
}

async function getProposals() {
  const data = await chrome.storage.local.get("proposals");
  return { proposals: data.proposals || [] };
}

// --------------- Stats ---------------

async function getStats() {
  const data = await chrome.storage.local.get("stats");
  const stats = data.stats || {
    totalApplied: 0,
    totalSkipped: 0,
    totalWon: 0,
    totalLost: 0,
    proposalsByDate: {},
    templateUsage: {}
  };

  const decided = stats.totalWon + stats.totalLost;
  stats.winRate = decided > 0 ? ((stats.totalWon / decided) * 100).toFixed(1) : "0.0";

  return { stats };
}

// --------------- Settings / Premium ---------------

async function getSettings() {
  const data = await chrome.storage.sync.get("settings");
  return { settings: data.settings || DEFAULT_SETTINGS };
}

async function checkDailyLimit() {
  const data = await chrome.storage.sync.get("settings");
  const settings = data.settings || DEFAULT_SETTINGS;

  // Reset daily counter if new day
  const today = new Date().toDateString();
  if (settings.dailyResetDate !== today) {
    settings.dailyProposalCount = 0;
    settings.dailyResetDate = today;
    await chrome.storage.sync.set({ settings });
  }

  if (settings.isPremium) return { allowed: true, remaining: Infinity };

  const remaining = settings.maxFreeProposals - settings.dailyProposalCount;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

async function incrementDailyCount() {
  const data = await chrome.storage.sync.get("settings");
  const settings = data.settings || DEFAULT_SETTINGS;
  settings.dailyProposalCount = (settings.dailyProposalCount || 0) + 1;
  await chrome.storage.sync.set({ settings });
  return { count: settings.dailyProposalCount };
}

// Premium license keys (simple validation)
const VALID_KEYS_PREFIX = "PP-PRO-";

async function activatePremium(key) {
  if (!key || !key.startsWith(VALID_KEYS_PREFIX) || key.length < 12) {
    return { error: "Invalid license key." };
  }

  const data = await chrome.storage.sync.get("settings");
  const settings = data.settings || DEFAULT_SETTINGS;
  settings.isPremium = true;
  settings.premiumKey = key;
  await chrome.storage.sync.set({ settings });
  return { success: true };
}

// --------------- Analytics Export ---------------

async function exportAnalytics() {
  const [statsData, proposalsData, templatesData] = await Promise.all([
    chrome.storage.local.get("stats"),
    chrome.storage.local.get("proposals"),
    chrome.storage.sync.get("templates")
  ]);

  return {
    exportDate: new Date().toISOString(),
    stats: statsData.stats,
    proposals: proposalsData.proposals,
    templates: (templatesData.templates || []).map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category
    }))
  };
}
