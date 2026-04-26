const app = window.ViewFilterPopup;
const render = window.ViewFilterPopupRender;

const state = {
  settings: { ...app.DEFAULT_SETTINGS },
  logs: [],
  blockedToday: 0,
  logFilter: "ALL",
  logsOpen: true,
  saveTimer: null
};

const elements = {
  minLikesInput: document.getElementById("minLikesInput"),
  minLikesRange: document.getElementById("minLikesRange"),
  likesHint: document.getElementById("likesHint"),
  modeRadios: document.querySelectorAll('input[name="filterMode"]'),
  platformThreads: document.getElementById("platformThreads"),
  platformInstagram: document.getElementById("platformInstagram"),
  platformFacebook: document.getElementById("platformFacebook"),
  blockedToday: document.getElementById("blockedToday"),
  toggleLogs: document.getElementById("toggleLogs"),
  logChevron: document.getElementById("logChevron"),
  logBody: document.getElementById("logBody"),
  logFilter: document.getElementById("logFilter"),
  logList: document.getElementById("logList"),
  copyLogsBtn: document.getElementById("copyLogsBtn"),
  clearLogsBtn: document.getElementById("clearLogsBtn")
};

init();

function init() {
  bindEvents();
  loadInitialState();
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}

function handleRuntimeMessage(message) {
  if (message?.type === "LOG_EVENT" && message.entry) {
    state.logs.push(message.entry);
    state.logs = state.logs.slice(-app.MAX_LOGS);
    if (Number.isFinite(message.blockedToday)) state.blockedToday = message.blockedToday;
    render.renderStats(state, elements, app);
    render.renderLogs(state, elements);
    return;
  }

  if (message?.type === "LOGS_CLEARED") {
    state.logs = [];
    state.blockedToday = Number(message.blockedToday || 0);
    render.renderStats(state, elements, app);
    render.renderLogs(state, elements);
    return;
  }

  if (message?.type === "SETTINGS_UPDATED" && message.settings) {
    state.settings = app.sanitizeSettings(message.settings);
    render.renderSettings(state, elements, app);
  }
}

async function loadInitialState() {
  try {
    const [settings, logState] = await Promise.all([
      app.sendMessage({ type: "GET_SETTINGS" }),
      app.sendMessage({ type: "GET_LOG_STATE" })
    ]);
    state.settings = app.sanitizeSettings(settings || app.DEFAULT_SETTINGS);
    state.logs = Array.isArray(logState?.logs) ? logState.logs.slice(-app.MAX_LOGS) : [];
    state.blockedToday = Number(logState?.blockedToday || 0);
  } catch (error) {
    console.error("ViewFilter popup init failed", error);
  }
  render.renderAll(state, elements, app);
}

function bindEvents() {
  elements.minLikesRange.addEventListener("input", (event) => setMinLikes(Number(event.target.value), true));
  elements.minLikesInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) setMinLikes(value, true);
  });
  elements.minLikesInput.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    setMinLikes(Number.isFinite(value) ? value : state.settings.minLikes, true);
  });

  for (const radio of elements.modeRadios) {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      state.settings.filterMode = radio.value === "hide" ? "hide" : "blur";
      scheduleSave();
    });
  }

  bindPlatformToggle(elements.platformThreads, "threads");
  bindPlatformToggle(elements.platformInstagram, "instagram");
  bindPlatformToggle(elements.platformFacebook, "facebook");

  elements.toggleLogs.addEventListener("click", () => {
    state.logsOpen = !state.logsOpen;
    render.renderLogPanel(state, elements);
  });
  elements.logFilter.addEventListener("change", () => {
    state.logFilter = elements.logFilter.value;
    render.renderLogs(state, elements);
  });
  elements.copyLogsBtn.addEventListener("click", copyAllLogs);
  elements.clearLogsBtn.addEventListener("click", clearLogs);
}

function bindPlatformToggle(element, key) {
  element.addEventListener("change", () => {
    state.settings.platforms[key] = element.checked;
    scheduleSave();
  });
}

function setMinLikes(value, persist) {
  state.settings.minLikes = app.clampMinLikes(value, state.settings.minLikes);
  render.renderSettings(state, elements, app);
  if (persist) scheduleSave();
}

function scheduleSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveSettings, 150);
}

async function saveSettings() {
  try {
    const saved = await app.sendMessage({ type: "UPDATE_SETTINGS", settings: state.settings });
    state.settings = app.sanitizeSettings(saved || state.settings);
    render.renderSettings(state, elements, app);
  } catch (error) {
    console.error("ViewFilter save settings failed", error);
  }
}

async function copyAllLogs() {
  const text = state.logs.map(app.formatLogLine).join("\n");
  if (!text) {
    flashButton(elements.copyLogsBtn, "Empty");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    flashButton(elements.copyLogsBtn, "Copied");
  } catch (error) {
    console.error("ViewFilter copy logs failed", error);
    flashButton(elements.copyLogsBtn, "Failed");
  }
}

async function clearLogs() {
  try {
    const payload = await app.sendMessage({ type: "CLEAR_LOGS" });
    state.logs = [];
    state.blockedToday = Number(payload?.blockedToday || 0);
    render.renderStats(state, elements, app);
    render.renderLogs(state, elements);
  } catch (error) {
    console.error("ViewFilter clear logs failed", error);
  }
}

function flashButton(button, text) {
  const previous = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = previous;
  }, 900);
}
