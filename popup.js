const { DEFAULT_SETTINGS } = window.OGC_SHARED;

const fields = {
  enabled: document.getElementById("enabled"),
  keepRecentTurns: document.getElementById("keepRecentTurns"),
  revealBatchSize: document.getElementById("revealBatchSize"),
  useVisibilityBoost: document.getElementById("useVisibilityBoost"),
  compactActionBars: document.getElementById("compactActionBars")
};

const outputs = {
  keepRecentTurns: document.getElementById("keepRecentTurnsValue"),
  revealBatchSize: document.getElementById("revealBatchSizeValue")
};

const status = document.getElementById("status");
let timer = null;

function syncForm(settings) {
  fields.enabled.checked = Boolean(settings.enabled);
  fields.keepRecentTurns.value = settings.keepRecentTurns;
  fields.revealBatchSize.value = settings.revealBatchSize;
  fields.useVisibilityBoost.checked = Boolean(settings.useVisibilityBoost);
  fields.compactActionBars.checked = Boolean(settings.compactActionBars);
  outputs.keepRecentTurns.textContent = String(settings.keepRecentTurns);
  outputs.revealBatchSize.textContent = String(settings.revealBatchSize);
}

function readForm() {
  return {
    enabled: fields.enabled.checked,
    keepRecentTurns: Number(fields.keepRecentTurns.value),
    revealBatchSize: Number(fields.revealBatchSize.value),
    useVisibilityBoost: fields.useVisibilityBoost.checked,
    compactActionBars: fields.compactActionBars.checked
  };
}

function flash(message) {
  status.textContent = message;
  clearTimeout(timer);
  timer = setTimeout(() => {
    status.textContent = "";
  }, 1400);
}

function save() {
  const settings = readForm();
  outputs.keepRecentTurns.textContent = String(settings.keepRecentTurns);
  outputs.revealBatchSize.textContent = String(settings.revealBatchSize);
  chrome.storage.sync.set(settings, () => flash("Saved"));
}

chrome.storage.sync.get(DEFAULT_SETTINGS, syncForm);

Object.values(fields).forEach((field) => {
  field.addEventListener("input", save);
  field.addEventListener("change", save);
});
