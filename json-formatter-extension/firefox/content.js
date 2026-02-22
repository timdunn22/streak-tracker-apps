(function () {
  "use strict";

  /* ───── 1. Detect JSON ───── */
  function isJSONContentType() {
    const ct = document.contentType || "";
    return /^application\/(json|[\w.+-]*\+json)/i.test(ct);
  }

  function extractRawText() {
    // Chrome shows JSON in a <pre> inside <body>
    const pre = document.querySelector("body > pre");
    if (pre) return pre.textContent || "";
    // Fallback
    const body = document.body;
    if (!body) return "";
    if (body.children.length === 0 || (body.children.length === 1 && body.children[0].tagName === "PRE")) {
      return body.textContent || "";
    }
    return "";
  }

  function tryParseJSON(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return null;
    // Must start with { or [
    if (trimmed[0] !== "{" && trimmed[0] !== "[") return null;
    try {
      return JSON.parse(trimmed);
    } catch (_) {
      return null;
    }
  }

  const rawText = extractRawText();
  if (!rawText.trim()) return;

  const isJSON = isJSONContentType();
  const parsed = tryParseJSON(rawText);

  if (!isJSON && parsed === null) return;
  if (parsed === null) return; // Content-Type says JSON but parsing fails

  /* ───── 2. Settings ───── */
  const DEFAULT_SETTINGS = { theme: "dark", collapseDepth: 2, autoFormat: true, pagesFormatted: 0 };
  let settings = { ...DEFAULT_SETTINGS };

  function loadSettings() {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (s) => {
          settings = { ...DEFAULT_SETTINGS, ...s };
          resolve(settings);
        });
      } else {
        resolve(settings);
      }
    });
  }

  function saveSettings(partial) {
    Object.assign(settings, partial);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(settings);
    }
  }

  /* ───── 3. Build UI ───── */
  loadSettings().then(() => {
    if (!settings.autoFormat) return;
    buildFormattedView(parsed, rawText);
    saveSettings({ pagesFormatted: (settings.pagesFormatted || 0) + 1 });
  });

  function buildFormattedView(data, raw) {
    // Clear page
    document.documentElement.innerHTML = "";
    const head = document.createElement("head");
    const body = document.createElement("body");
    document.documentElement.appendChild(head);
    document.documentElement.appendChild(body);

    // Re-inject our CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = (typeof chrome !== "undefined" && chrome.runtime)
      ? chrome.runtime.getURL("styles.css")
      : "";
    head.appendChild(link);

    // Meta
    const meta = document.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    head.appendChild(meta);
    const metaVP = document.createElement("meta");
    metaVP.name = "viewport";
    metaVP.content = "width=device-width, initial-scale=1";
    head.appendChild(metaVP);

    body.id = "jvp-root";
    body.className = "jvp-theme-" + settings.theme;

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "jvp-toolbar";
    toolbar.innerHTML = `
      <div class="jvp-toolbar-left">
        <span class="jvp-logo">{}</span>
        <span class="jvp-title">JSONView Pro</span>
        <span class="jvp-meta" id="jvp-meta"></span>
      </div>
      <div class="jvp-toolbar-right">
        <input type="text" id="jvp-search" class="jvp-search" placeholder="Search keys or values…" autocomplete="off" />
        <button id="jvp-expand-all" class="jvp-btn" title="Expand All">⊞ Expand</button>
        <button id="jvp-collapse-all" class="jvp-btn" title="Collapse All">⊟ Collapse</button>
        <button id="jvp-copy-raw" class="jvp-btn" title="Copy Raw JSON">📋 Raw</button>
        <button id="jvp-copy-formatted" class="jvp-btn" title="Copy Formatted JSON">📋 Pretty</button>
        <button id="jvp-theme-toggle" class="jvp-btn" title="Toggle Theme">🌓 Theme</button>
      </div>
    `;
    body.appendChild(toolbar);

    // Content wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "jvp-content";
    const lineCol = document.createElement("div");
    lineCol.className = "jvp-line-numbers";
    lineCol.id = "jvp-lines";
    const treeCol = document.createElement("div");
    treeCol.className = "jvp-tree";
    treeCol.id = "jvp-tree";
    wrapper.appendChild(lineCol);
    wrapper.appendChild(treeCol);
    body.appendChild(wrapper);

    // Render tree
    const tree = renderNode(data, "", 0);
    treeCol.appendChild(tree);

    // Line numbers
    updateLineNumbers();

    // Meta info
    const metaEl = document.getElementById("jvp-meta");
    const size = new Blob([raw]).size;
    const sizeStr = size > 1024 * 1024 ? (size / 1024 / 1024).toFixed(1) + " MB"
      : size > 1024 ? (size / 1024).toFixed(1) + " KB"
      : size + " B";
    metaEl.textContent = `${Array.isArray(data) ? "Array" : "Object"} · ${sizeStr}`;

    // Apply default collapse depth
    applyCollapseDepth(settings.collapseDepth);

    // ── Event listeners ──
    document.getElementById("jvp-expand-all").addEventListener("click", () => {
      treeCol.querySelectorAll(".jvp-collapsible").forEach((el) => el.classList.remove("jvp-collapsed"));
      treeCol.querySelectorAll(".jvp-toggle").forEach((el) => el.textContent = "▼");
      updateLineNumbers();
    });

    document.getElementById("jvp-collapse-all").addEventListener("click", () => {
      treeCol.querySelectorAll(".jvp-collapsible").forEach((el) => el.classList.add("jvp-collapsed"));
      treeCol.querySelectorAll(".jvp-toggle").forEach((el) => el.textContent = "▶");
      updateLineNumbers();
    });

    document.getElementById("jvp-copy-raw").addEventListener("click", function () {
      copyToClipboard(raw, this);
    });

    document.getElementById("jvp-copy-formatted").addEventListener("click", function () {
      copyToClipboard(JSON.stringify(data, null, 2), this);
    });

    document.getElementById("jvp-theme-toggle").addEventListener("click", () => {
      const newTheme = settings.theme === "dark" ? "light" : "dark";
      body.className = "jvp-theme-" + newTheme;
      saveSettings({ theme: newTheme });
    });

    // Search
    let searchTimeout = null;
    document.getElementById("jvp-search").addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(e.target.value.trim(), treeCol);
      }, 200);
    });
  }

  /* ───── 4. Recursive Tree Renderer ───── */
  function renderNode(value, key, depth, path) {
    path = path || (key ? key : "$");

    if (value === null) return createLeaf(key, "null", "null", depth, path);
    if (typeof value === "boolean") return createLeaf(key, String(value), "boolean", depth, path);
    if (typeof value === "number") return createLeaf(key, String(value), "number", depth, path);
    if (typeof value === "string") return createLeaf(key, JSON.stringify(value), "string", depth, path);

    // Object or Array
    const isArray = Array.isArray(value);
    const entries = isArray ? value.map((v, i) => [String(i), v]) : Object.entries(value);
    const count = entries.length;
    const openBracket = isArray ? "[" : "{";
    const closeBracket = isArray ? "]" : "}";

    const container = document.createElement("div");
    container.className = "jvp-node jvp-collapsible";
    container.dataset.depth = String(depth);
    container.dataset.path = path;

    // Header line
    const header = document.createElement("div");
    header.className = "jvp-line jvp-line-header";

    const toggle = document.createElement("span");
    toggle.className = "jvp-toggle";
    toggle.textContent = "▼";
    header.appendChild(toggle);

    if (key !== "" && key !== undefined) {
      const keySpan = document.createElement("span");
      keySpan.className = "jvp-key";
      keySpan.textContent = key;
      keySpan.dataset.path = path;
      keySpan.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(path, keySpan);
      });
      header.appendChild(keySpan);
      const colon = document.createElement("span");
      colon.className = "jvp-colon";
      colon.textContent = ": ";
      header.appendChild(colon);
    }

    const bracket = document.createElement("span");
    bracket.className = "jvp-bracket";
    bracket.textContent = openBracket;
    header.appendChild(bracket);

    const badge = document.createElement("span");
    badge.className = "jvp-badge";
    badge.textContent = count + (isArray ? (count === 1 ? " item" : " items") : (count === 1 ? " key" : " keys"));
    header.appendChild(badge);

    // Collapsed preview
    const preview = document.createElement("span");
    preview.className = "jvp-preview";
    preview.textContent = " … " + closeBracket;
    header.appendChild(preview);

    container.appendChild(header);

    // Children
    const children = document.createElement("div");
    children.className = "jvp-children";

    entries.forEach(([k, v], idx) => {
      const childPath = isArray ? path + "[" + k + "]" : path + "." + k;
      const child = renderNode(v, k, depth + 1, childPath);

      // Add comma logic
      if (idx < entries.length - 1) {
        const lastLine = child.querySelector(".jvp-line:last-child") || child;
        // We'll add a comma span
        if (child.classList && child.classList.contains("jvp-collapsible")) {
          // For collapsible: comma goes after closing bracket
          const closingLine = child.querySelector(".jvp-closing-line");
          if (closingLine) {
            const comma = document.createElement("span");
            comma.className = "jvp-comma";
            comma.textContent = ",";
            closingLine.appendChild(comma);
          }
        } else {
          // For leaf: add comma to the line
          const comma = document.createElement("span");
          comma.className = "jvp-comma";
          comma.textContent = ",";
          child.appendChild(comma);
        }
      }

      children.appendChild(child);
    });

    container.appendChild(children);

    // Closing bracket
    const closing = document.createElement("div");
    closing.className = "jvp-line jvp-closing-line";
    const closeBracketSpan = document.createElement("span");
    closeBracketSpan.className = "jvp-bracket";
    closeBracketSpan.textContent = closeBracket;
    closing.appendChild(closeBracketSpan);
    container.appendChild(closing);

    // Toggle click
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      container.classList.toggle("jvp-collapsed");
      toggle.textContent = container.classList.contains("jvp-collapsed") ? "▶" : "▼";
      updateLineNumbers();
    });

    return container;
  }

  function createLeaf(key, valueStr, type, depth, path) {
    const line = document.createElement("div");
    line.className = "jvp-line jvp-leaf";
    line.dataset.depth = String(depth);
    line.dataset.path = path || "";

    // Indent spacer
    const spacer = document.createElement("span");
    spacer.className = "jvp-toggle jvp-toggle-spacer";
    spacer.textContent = " ";
    line.appendChild(spacer);

    if (key !== "" && key !== undefined) {
      const keySpan = document.createElement("span");
      keySpan.className = "jvp-key";
      keySpan.textContent = key;
      keySpan.dataset.path = path || "";
      keySpan.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(path || key, keySpan);
      });
      line.appendChild(keySpan);
      const colon = document.createElement("span");
      colon.className = "jvp-colon";
      colon.textContent = ": ";
      line.appendChild(colon);
    }

    const valSpan = document.createElement("span");
    valSpan.className = "jvp-value jvp-type-" + type;
    valSpan.textContent = valueStr;
    line.appendChild(valSpan);

    return line;
  }

  /* ───── 5. Line Numbers ───── */
  function updateLineNumbers() {
    const lineCol = document.getElementById("jvp-lines");
    const treeCol = document.getElementById("jvp-tree");
    if (!lineCol || !treeCol) return;

    // Count visible lines
    const visibleLines = countVisibleLines(treeCol);
    const nums = [];
    for (let i = 1; i <= visibleLines; i++) {
      nums.push(i);
    }
    lineCol.textContent = nums.join("\n");
  }

  function countVisibleLines(el) {
    let count = 0;
    function walk(node) {
      if (!node) return;
      // Skip hidden children of collapsed nodes
      if (node.classList && node.classList.contains("jvp-children")) {
        const parent = node.parentElement;
        if (parent && parent.classList.contains("jvp-collapsed")) return;
      }

      if (node.classList && (node.classList.contains("jvp-line") || node.classList.contains("jvp-leaf"))) {
        // Check if it's inside a collapsed parent
        if (!isHidden(node)) {
          count++;
        }
      }

      const children = node.children;
      if (children) {
        for (let i = 0; i < children.length; i++) {
          walk(children[i]);
        }
      }
    }
    walk(el);
    return count;
  }

  function isHidden(el) {
    let current = el.parentElement;
    while (current && current.id !== "jvp-tree") {
      if (current.classList.contains("jvp-children")) {
        const parent = current.parentElement;
        if (parent && parent.classList.contains("jvp-collapsed")) return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  /* ───── 6. Collapse Depth ───── */
  function applyCollapseDepth(maxDepth) {
    const tree = document.getElementById("jvp-tree");
    if (!tree) return;
    tree.querySelectorAll(".jvp-collapsible").forEach((el) => {
      const d = parseInt(el.dataset.depth || "0", 10);
      const toggle = el.querySelector(":scope > .jvp-line-header > .jvp-toggle");
      if (maxDepth === "all" || maxDepth >= 99) {
        el.classList.remove("jvp-collapsed");
        if (toggle) toggle.textContent = "▼";
      } else if (d >= maxDepth) {
        el.classList.add("jvp-collapsed");
        if (toggle) toggle.textContent = "▶";
      } else {
        el.classList.remove("jvp-collapsed");
        if (toggle) toggle.textContent = "▼";
      }
    });
    updateLineNumbers();
  }

  /* ───── 7. Search ───── */
  function performSearch(query, treeCol) {
    // Clear previous highlights
    treeCol.querySelectorAll(".jvp-highlight").forEach((el) => {
      const parent = el.parentElement;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      }
    });
    treeCol.querySelectorAll(".jvp-search-match").forEach((el) => el.classList.remove("jvp-search-match"));

    if (!query) {
      updateLineNumbers();
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Search through keys and values
    const allKeys = treeCol.querySelectorAll(".jvp-key");
    const allValues = treeCol.querySelectorAll(".jvp-value");

    function highlightText(span) {
      const text = span.textContent;
      const lower = text.toLowerCase();
      const idx = lower.indexOf(lowerQuery);
      if (idx === -1) return false;

      span.classList.add("jvp-search-match");

      // Split text and insert highlight span
      const before = text.substring(0, idx);
      const match = text.substring(idx, idx + query.length);
      const after = text.substring(idx + query.length);

      span.textContent = "";
      if (before) span.appendChild(document.createTextNode(before));
      const hl = document.createElement("mark");
      hl.className = "jvp-highlight";
      hl.textContent = match;
      span.appendChild(hl);
      if (after) span.appendChild(document.createTextNode(after));

      // Expand parents so match is visible
      let parent = span.parentElement;
      while (parent && parent.id !== "jvp-tree") {
        if (parent.classList && parent.classList.contains("jvp-collapsible")) {
          parent.classList.remove("jvp-collapsed");
          const t = parent.querySelector(":scope > .jvp-line-header > .jvp-toggle");
          if (t) t.textContent = "▼";
        }
        parent = parent.parentElement;
      }

      return true;
    }

    allKeys.forEach(highlightText);
    allValues.forEach(highlightText);

    updateLineNumbers();
  }

  /* ───── 8. Copy ───── */
  function copyToClipboard(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showCopied(btn)).catch(() => fallbackCopy(text, btn));
    } else {
      fallbackCopy(text, btn);
    }
  }

  function fallbackCopy(text, btn) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showCopied(btn);
    } catch (_) { }
    document.body.removeChild(ta);
  }

  function showCopied(btn) {
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = "✓ Copied!";
    btn.classList.add("jvp-copied");
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove("jvp-copied");
    }, 1500);
  }

})();
