// Clean Copy — Popup Script

const DEFAULT_SETTINGS = {
  globalEnabled: true,
  enableRightClick: true,
  enableCopy: true,
  enableSelection: true,
  enablePaste: true,
  cleanPaste: false,
  perSite: {}
};

let currentSettings = null;
let currentHostname = null;

const globalToggle = document.getElementById('globalToggle');
const rightClickToggle = document.getElementById('rightClickToggle');
const copyToggle = document.getElementById('copyToggle');
const selectionToggle = document.getElementById('selectionToggle');
const pasteToggle = document.getElementById('pasteToggle');
const cleanPasteToggle = document.getElementById('cleanPasteToggle');
const siteToggle = document.getElementById('siteToggle');
const siteName = document.getElementById('siteName');
const siteToggleLabel = document.getElementById('siteToggleLabel');
const featureToggles = document.getElementById('featureToggles');

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      return new URL(tab.url).hostname;
    } catch (e) { return null; }
  }
  return null;
}

async function loadSettings() {
  currentHostname = await getCurrentTab();
  chrome.runtime.sendMessage(
    { type: 'getSettings', hostname: currentHostname },
    (response) => {
      if (chrome.runtime.lastError || !response) {
        currentSettings = DEFAULT_SETTINGS;
      } else {
        currentSettings = response.settings || DEFAULT_SETTINGS;
      }
      renderUI();
    }
  );
}

function renderUI() {
  siteName.textContent = currentHostname || 'N/A';
  siteToggleLabel.textContent = currentHostname || '—';
  globalToggle.checked = currentSettings.globalEnabled;
  rightClickToggle.checked = currentSettings.enableRightClick;
  copyToggle.checked = currentSettings.enableCopy;
  selectionToggle.checked = currentSettings.enableSelection;
  pasteToggle.checked = currentSettings.enablePaste;
  cleanPasteToggle.checked = currentSettings.cleanPaste;
  featureToggles.classList.toggle('disabled', !currentSettings.globalEnabled);

  if (currentHostname) {
    const siteConfig = currentSettings.perSite[currentHostname];
    siteToggle.checked = siteConfig ? siteConfig.enabled !== false : true;
    document.getElementById('siteToggleSection').style.display = '';
  } else {
    document.getElementById('siteToggleSection').style.display = 'none';
  }
}

function saveSettings() {
  chrome.runtime.sendMessage({ type: 'updateSettings', settings: currentSettings });
}

globalToggle.addEventListener('change', () => {
  currentSettings.globalEnabled = globalToggle.checked;
  featureToggles.classList.toggle('disabled', !globalToggle.checked);
  saveSettings();
});
rightClickToggle.addEventListener('change', () => { currentSettings.enableRightClick = rightClickToggle.checked; saveSettings(); });
copyToggle.addEventListener('change', () => { currentSettings.enableCopy = copyToggle.checked; saveSettings(); });
selectionToggle.addEventListener('change', () => { currentSettings.enableSelection = selectionToggle.checked; saveSettings(); });
pasteToggle.addEventListener('change', () => { currentSettings.enablePaste = pasteToggle.checked; saveSettings(); });
cleanPasteToggle.addEventListener('change', () => { currentSettings.cleanPaste = cleanPasteToggle.checked; saveSettings(); });
siteToggle.addEventListener('change', () => {
  if (currentHostname) {
    if (!currentSettings.perSite[currentHostname]) currentSettings.perSite[currentHostname] = {};
    currentSettings.perSite[currentHostname].enabled = siteToggle.checked;
    saveSettings();
  }
});

loadSettings();
