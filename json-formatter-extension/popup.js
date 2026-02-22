(function () {
  const DEFAULTS = { theme: "dark", collapseDepth: 2, autoFormat: true, pagesFormatted: 0 };

  function load(cb) {
    chrome.storage.sync.get(DEFAULTS, cb);
  }

  function save(data) {
    chrome.storage.sync.set(data);
  }

  document.addEventListener("DOMContentLoaded", () => {
    load((settings) => {
      // Theme buttons
      const darkBtn = document.getElementById("theme-dark");
      const lightBtn = document.getElementById("theme-light");

      function setThemeUI(theme) {
        darkBtn.classList.toggle("active", theme === "dark");
        lightBtn.classList.toggle("active", theme === "light");
      }
      setThemeUI(settings.theme);

      darkBtn.addEventListener("click", () => { save({ theme: "dark" }); setThemeUI("dark"); });
      lightBtn.addEventListener("click", () => { save({ theme: "light" }); setThemeUI("light"); });

      // Depth buttons
      const depthBtns = document.querySelectorAll(".depth-btn");
      function setDepthUI(depth) {
        depthBtns.forEach((b) => {
          b.classList.toggle("active", parseInt(b.dataset.depth) === depth);
        });
      }
      setDepthUI(settings.collapseDepth);

      depthBtns.forEach((b) => {
        b.addEventListener("click", () => {
          const d = parseInt(b.dataset.depth);
          save({ collapseDepth: d });
          setDepthUI(d);
        });
      });

      // Auto-format toggle
      const autoFmt = document.getElementById("auto-format");
      autoFmt.checked = settings.autoFormat;
      autoFmt.addEventListener("change", () => {
        save({ autoFormat: autoFmt.checked });
      });

      // Stats
      document.getElementById("pages-count").textContent = settings.pagesFormatted || 0;
    });
  });
})();
