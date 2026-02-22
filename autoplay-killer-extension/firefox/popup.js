document.addEventListener("DOMContentLoaded", async () => {
  const siteDomain = document.getElementById("siteDomain");
  const siteToggle = document.getElementById("siteToggle");
  const globalToggle = document.getElementById("globalToggle");
  const blockedCount = document.getElementById("blockedCount");
  const whitelistContainer = document.getElementById("whitelistContainer");
  const emptyMsg = document.getElementById("emptyMsg");

  let currentHostname = "";
  let whitelist = [];

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      currentHostname = url.hostname;
      siteDomain.textContent = currentHostname || "N/A";
    }
  } catch (_) {
    siteDomain.textContent = "N/A";
  }

  async function loadState() {
    const gRes = await sendMessage({ type: "getGlobalBlock" });
    globalToggle.checked = gRes.globalBlock;

    const wRes = await sendMessage({ type: "getWhitelist" });
    whitelist = wRes.whitelist || [];
    siteToggle.checked = !whitelist.includes(currentHostname);

    const bRes = await sendMessage({ type: "getTodayBlocked" });
    blockedCount.textContent = bRes.count || 0;

    renderWhitelist();
  }

  function renderWhitelist() {
    whitelistContainer.innerHTML = "";
    if (whitelist.length === 0) {
      emptyMsg.style.display = "block";
      return;
    }
    emptyMsg.style.display = "none";
    whitelist.forEach((site) => {
      const li = document.createElement("li");
      li.innerHTML =
        '<span class="wl-site">' + site + '</span>' +
        '<button class="wl-remove" data-site="' + site + '" aria-label="Remove ' + site + '">&#10005;</button>';
      whitelistContainer.appendChild(li);
    });

    whitelistContainer.querySelectorAll(".wl-remove").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const site = btn.dataset.site;
        whitelist = whitelist.filter((s) => s !== site);
        await sendMessage({ type: "setWhitelist", whitelist });
        if (site === currentHostname) {
          siteToggle.checked = true;
          notifyContentScript(true);
        }
        renderWhitelist();
      });
    });
  }

  siteToggle.addEventListener("change", async () => {
    const shouldBlock = siteToggle.checked;
    if (shouldBlock) {
      whitelist = whitelist.filter((s) => s !== currentHostname);
    } else {
      if (!whitelist.includes(currentHostname)) {
        whitelist.push(currentHostname);
      }
    }
    await sendMessage({ type: "setWhitelist", whitelist });
    notifyContentScript(shouldBlock);
    renderWhitelist();
  });

  globalToggle.addEventListener("change", async () => {
    await sendMessage({ type: "setGlobalBlock", value: globalToggle.checked });
    notifyContentScript(globalToggle.checked && siteToggle.checked);
  });

  async function notifyContentScript(blocking) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: "setBlocking", value: blocking });
      }
    } catch (_) {}
  }

  function sendMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (res) => resolve(res || {}));
    });
  }

  loadState();
});
