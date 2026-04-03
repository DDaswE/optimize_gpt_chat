const { DEFAULT_SETTINGS } = window.OGC_SHARED;
const ROOT = document.documentElement;

const state = {
  settings: { ...DEFAULT_SETTINGS },
  currentThread: null,
  hiddenTurns: [],
  banner: null,
  lastUrl: window.location.href,
  scheduled: false
};

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, num));
}

function normalizeSettings(raw = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  return {
    enabled: Boolean(merged.enabled),
    keepRecentTurns: clampNumber(merged.keepRecentTurns, 8, 120, DEFAULT_SETTINGS.keepRecentTurns),
    revealBatchSize: clampNumber(merged.revealBatchSize, 1, 40, DEFAULT_SETTINGS.revealBatchSize),
    useVisibilityBoost: Boolean(merged.useVisibilityBoost),
    compactActionBars: Boolean(merged.compactActionBars)
  };
}

function applyRootState() {
  ROOT.dataset.ogcEnabled = state.settings.enabled ? "true" : "false";
  ROOT.dataset.ogcCompactActions = state.settings.compactActionBars ? "true" : "false";
}

function isNearBottom() {
  const scrollBottom = window.scrollY + window.innerHeight;
  const pageBottom = document.documentElement.scrollHeight;
  return pageBottom - scrollBottom < 320;
}

function getThreadRoot() {
  return document.getElementById("thread");
}

function getVisibleTurns(root = getThreadRoot()) {
  if (!root) {
    return [];
  }

  return Array.from(root.querySelectorAll("section[data-turn]"));
}

function removeBanner() {
  if (state.banner?.isConnected) {
    state.banner.remove();
  }
  state.banner = null;
}

function markVisibleTurns() {
  const turns = getVisibleTurns();
  turns.forEach((turn) => {
    turn.classList.toggle("ogc-visible-turn", state.settings.enabled && state.settings.useVisibilityBoost);
  });
}

function ensureBanner() {
  if (!state.settings.enabled || state.hiddenTurns.length === 0) {
    removeBanner();
    return;
  }

  const visibleTurns = getVisibleTurns();
  if (visibleTurns.length === 0) {
    removeBanner();
    return;
  }

  const parent = visibleTurns[0].parentElement;
  if (!parent) {
    return;
  }

  if (!state.banner) {
    const banner = document.createElement("div");
    banner.className = "ogc-banner";
    banner.innerHTML = `
      <div class="ogc-banner-inner">
        <div class="ogc-banner-copy">
          <p class="ogc-banner-title">Long chat optimization is active</p>
          <p class="ogc-banner-text"></p>
        </div>
        <div class="ogc-banner-actions">
          <button type="button" class="ogc-banner-button" data-ogc-action="reveal-batch"></button>
          <button type="button" class="ogc-banner-button" data-ogc-action="reveal-all">Show all hidden</button>
          <button type="button" class="ogc-banner-button ogc-banner-primary" data-ogc-action="rehide">Re-hide older turns</button>
        </div>
      </div>
    `;

    banner.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ogc-action]");
      if (!button) {
        return;
      }

      const action = button.dataset.ogcAction;
      if (action === "reveal-batch") {
        revealTurns(state.settings.revealBatchSize);
      } else if (action === "reveal-all") {
        revealTurns(state.hiddenTurns.length);
      } else if (action === "rehide") {
        scheduleOptimize("rehide");
      }
    });

    state.banner = banner;
  }

  const hiddenCount = state.hiddenTurns.length;
  state.banner.querySelector(".ogc-banner-text").textContent =
    `Hidden ${hiddenCount} older turns so the browser only renders the recent part of this chat. The conversation itself stays in the same thread.`;
  state.banner.querySelector("[data-ogc-action='reveal-batch']").textContent =
    `Show ${Math.min(state.settings.revealBatchSize, hiddenCount)} older`;

  if (parent.firstChild !== state.banner) {
    parent.insertBefore(state.banner, visibleTurns[0]);
  }
}

function captureThreadChange(root) {
  if (state.currentThread === root) {
    return;
  }

  state.currentThread = root;
  state.hiddenTurns = [];
  removeBanner();
}

function restoreAllTurns() {
  if (!state.currentThread || state.hiddenTurns.length === 0) {
    removeBanner();
    return;
  }

  const visibleTurns = getVisibleTurns(state.currentThread);
  const anchor = visibleTurns[0] || null;
  const topBefore = anchor ? anchor.getBoundingClientRect().top : 0;

  const fragment = document.createDocumentFragment();
  state.hiddenTurns.forEach((turn) => fragment.appendChild(turn));

  if (anchor?.parentElement) {
    anchor.parentElement.insertBefore(fragment, anchor);
  }

  state.hiddenTurns = [];
  removeBanner();
  markVisibleTurns();

  if (anchor) {
    const topAfter = anchor.getBoundingClientRect().top;
    window.scrollBy({ top: topAfter - topBefore, behavior: "auto" });
  }
}

function revealTurns(count) {
  if (!state.currentThread || state.hiddenTurns.length === 0) {
    return;
  }

  const revealCount = Math.min(count, state.hiddenTurns.length);
  const chunk = state.hiddenTurns.splice(state.hiddenTurns.length - revealCount, revealCount);
  const visibleTurns = getVisibleTurns(state.currentThread);
  const anchor = visibleTurns[0] || null;
  const topBefore = anchor ? anchor.getBoundingClientRect().top : 0;
  const fragment = document.createDocumentFragment();

  chunk.forEach((turn) => fragment.appendChild(turn));

  if (anchor?.parentElement) {
    anchor.parentElement.insertBefore(fragment, anchor);
  } else if (state.currentThread) {
    state.currentThread.appendChild(fragment);
  }

  markVisibleTurns();
  ensureBanner();

  if (anchor) {
    const topAfter = anchor.getBoundingClientRect().top;
    window.scrollBy({ top: topAfter - topBefore, behavior: "auto" });
  }
}

function hideExcessTurns(reason = "auto") {
  const root = getThreadRoot();
  if (!root) {
    return;
  }

  captureThreadChange(root);

  if (!state.settings.enabled) {
    restoreAllTurns();
    return;
  }

  markVisibleTurns();

  if (reason === "mutation" && !isNearBottom()) {
    ensureBanner();
    return;
  }

  const visibleTurns = getVisibleTurns(root);
  const excess = visibleTurns.length - state.settings.keepRecentTurns;

  if (excess <= 0) {
    ensureBanner();
    return;
  }

  const toHide = visibleTurns.slice(0, excess);
  const anchor = visibleTurns[excess] || null;
  const topBefore = anchor ? anchor.getBoundingClientRect().top : 0;

  toHide.forEach((turn) => {
    turn.classList.remove("ogc-visible-turn");
    state.hiddenTurns.push(turn);
    turn.remove();
  });

  ensureBanner();
  markVisibleTurns();

  if (anchor) {
    const topAfter = anchor.getBoundingClientRect().top;
    window.scrollBy({ top: topAfter - topBefore, behavior: "auto" });
  }
}

function scheduleOptimize(reason = "mutation") {
  if (state.scheduled) {
    return;
  }

  state.scheduled = true;
  requestAnimationFrame(() => {
    state.scheduled = false;
    hideExcessTurns(reason);
  });
}

function loadSettings() {
  applyRootState();
  chrome.storage.sync.get(DEFAULT_SETTINGS, (raw) => {
    state.settings = normalizeSettings(raw);
    applyRootState();
    scheduleOptimize("settings");
  });
}

function setupObservers() {
  const observer = new MutationObserver(() => {
    if (window.location.href !== state.lastUrl) {
      state.lastUrl = window.location.href;
      state.currentThread = null;
      state.hiddenTurns = [];
      removeBanner();
    }

    scheduleOptimize("mutation");
  });

  observer.observe(document, {
    childList: true,
    subtree: true
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  chrome.storage.sync.get(DEFAULT_SETTINGS, (raw) => {
    state.settings = normalizeSettings(raw);
    applyRootState();
    scheduleOptimize("settings");
  });
});

function boot() {
  loadSettings();
  setupObservers();
  window.addEventListener("load", () => scheduleOptimize("load"), { once: true });
  setTimeout(() => scheduleOptimize("initial"), 1500);
}

boot();
