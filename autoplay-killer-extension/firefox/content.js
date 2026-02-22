(() => {
  "use strict";

  // -- State --
  let blocking = true;
  let userInteracting = false;
  let userInteractionTimer = null;
  let blockedCount = 0;
  let configLoaded = false;

  // -- User-interaction tracking --
  const markUserInteraction = () => {
    userInteracting = true;
    clearTimeout(userInteractionTimer);
    userInteractionTimer = setTimeout(() => {
      userInteracting = false;
    }, 1000);
  };

  document.addEventListener("click", markUserInteraction, true);
  document.addEventListener("touchstart", markUserInteraction, true);
  document.addEventListener("keydown", markUserInteraction, true);

  // -- Override HTMLMediaElement.prototype.play --
  const originalPlay = HTMLMediaElement.prototype.play;

  HTMLMediaElement.prototype.play = function () {
    if (!blocking) {
      return originalPlay.call(this);
    }

    if (userInteracting || this.dataset.apkUserPlay === "true") {
      delete this.dataset.apkUserPlay;
      return originalPlay.call(this);
    }

    // Block autoplay
    blockedCount++;
    reportBlocked();
    this.pause();
    // Mark that this element had its play blocked, so we can show overlay
    this.dataset.apkBlocked = "true";
    addOverlay(this);
    return Promise.reject(new DOMException("Blocked by AutoPlay Killer", "NotAllowedError"));
  };

  // -- Report blocked count to background --
  function reportBlocked() {
    try {
      chrome.runtime.sendMessage({ type: "blocked", count: 1 });
    } catch (_) {}
  }

  // -- Overlay --
  function addOverlay(video) {
    if (!(video instanceof HTMLVideoElement)) return;
    if (video.dataset.apkOverlay === "true") return;
    video.dataset.apkOverlay = "true";

    const wrapper = document.createElement("div");
    wrapper.className = "apk-overlay-wrapper";

    const btn = document.createElement("button");
    btn.className = "apk-play-btn";
    btn.setAttribute("aria-label", "Play video");
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36"><polygon points="5,3 19,12 5,21" fill="#fff"/></svg>';

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      video.dataset.apkUserPlay = "true";
      video.play().catch(() => {});
      removeOverlay(video);
    });

    wrapper.appendChild(btn);

    if (video.parentElement) {
      const parent = video.parentElement;
      const parentPos = getComputedStyle(parent).position;
      if (parentPos === "static") {
        parent.style.position = "relative";
      }
      parent.appendChild(wrapper);
      video._apkOverlayWrapper = wrapper;
    }
  }

  function removeOverlay(video) {
    if (video._apkOverlayWrapper) {
      video._apkOverlayWrapper.remove();
      delete video._apkOverlayWrapper;
    }
    delete video.dataset.apkOverlay;
    delete video.dataset.apkBlocked;
  }

  // -- Process a media element --
  function processMedia(el) {
    if (!blocking) return;

    if (el.hasAttribute("autoplay")) {
      el.removeAttribute("autoplay");
    }

    if (el.getAttribute("preload") !== "none") {
      el.setAttribute("preload", "none");
    }

    // Pause if playing
    if (!el.paused) {
      el.pause();
      blockedCount++;
      reportBlocked();
      el.dataset.apkBlocked = "true";
      addOverlay(el);
    }

    // Add play event listener to catch native autoplay that bypasses JS override
    if (!el.dataset.apkPlayListener) {
      el.dataset.apkPlayListener = "true";
      el.addEventListener("play", function () {
        if (blocking && !userInteracting && this.dataset.apkUserPlay !== "true") {
          this.pause();
          blockedCount++;
          reportBlocked();
          this.dataset.apkBlocked = "true";
          addOverlay(this);
        }
      });
    }
  }

  // -- Scan existing + future elements --
  function scanAll() {
    document.querySelectorAll("video, audio").forEach(processMedia);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAll);
  } else {
    scanAll();
  }
  window.addEventListener("load", scanAll);

  // MutationObserver for dynamically injected media
  const observer = new MutationObserver((mutations) => {
    if (!blocking) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches("video, audio")) {
          processMedia(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll("video, audio").forEach(processMedia);
        }
      }
      if (m.type === "attributes" && m.attributeName === "autoplay") {
        processMedia(m.target);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["autoplay"],
  });

  // -- Messages from popup / background --
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "setBlocking") {
      blocking = msg.value;
      if (blocking) {
        scanAll();
      }
      sendResponse({ ok: true });
    }
    if (msg.type === "getStatus") {
      sendResponse({ blocking, blockedCount });
    }
  });

  // -- Initial config fetch --
  const hostname = location.hostname;
  try {
    chrome.storage.local.get(["globalBlock", "whitelist"], (data) => {
      const globalBlock = data.globalBlock !== undefined ? data.globalBlock : true;
      const whitelist = data.whitelist || [];
      if (!globalBlock || whitelist.includes(hostname)) {
        blocking = false;
      } else {
        blocking = true;
        scanAll();
      }
      configLoaded = true;
    });
  } catch (_) {
    configLoaded = true;
  }
})();
