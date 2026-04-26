const STORAGE_KEYS = {
  SETTINGS: "vf_settings",
  LOGS: "vf_logs",
  STATS: "vf_stats"
};
const MAX_LOGS = 300;

const DEFAULT_SETTINGS = {
  minLikes: 5000,
  filterMode: "blur",
  platforms: {
    threads: true,
    instagram: true,
    facebook: false
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaultSettings();
  await ensureStatsShape();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaultSettings();
  await ensureStatsShape();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function handleMessage(message, sender) {
  switch (message?.type) {
    case "GET_SETTINGS":
      return getSettings();
    case "UPDATE_SETTINGS":
      return updateSettings(message.settings);
    case "VF_LOG":
      return appendLog(message.entry, sender);
    case "GET_LOG_STATE":
      return getLogState();
    case "CLEAR_LOGS":
      return clearLogs();
    default:
      throw new Error("Unknown message type");
  }
}

async function ensureDefaultSettings() {
  const current = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
  if (!current[STORAGE_KEYS.SETTINGS]) {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
    });
    return DEFAULT_SETTINGS;
  }

  const merged = sanitizeSettings(current[STORAGE_KEYS.SETTINGS]);
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: merged });
  return merged;
}

async function getSettings() {
  const current = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
  return sanitizeSettings(current[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS);
}

async function updateSettings(nextSettings) {
  const sanitized = sanitizeSettings(nextSettings);
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: sanitized });
  broadcast({ type: "SETTINGS_UPDATED", settings: sanitized });
  return sanitized;
}

function sanitizeSettings(input) {
  const rawMinLikes = Number.isFinite(input?.minLikes) ? input.minLikes : input?.minViews;
  const minLikes = Number.isFinite(rawMinLikes)
    ? Math.max(0, Math.round(rawMinLikes))
    : DEFAULT_SETTINGS.minLikes;

  const filterMode = input?.filterMode === "hide" ? "hide" : "blur";

  const platforms = {
    threads:
      typeof input?.platforms?.threads === "boolean"
        ? input.platforms.threads
        : DEFAULT_SETTINGS.platforms.threads,
    instagram:
      typeof input?.platforms?.instagram === "boolean"
        ? input.platforms.instagram
        : DEFAULT_SETTINGS.platforms.instagram,
    facebook:
      typeof input?.platforms?.facebook === "boolean"
        ? input.platforms.facebook
        : DEFAULT_SETTINGS.platforms.facebook
  };

  return { minLikes, filterMode, platforms };
}

async function appendLog(entry, sender) {
  const normalizedEntry = normalizeEntry(entry, sender);
  const logs = await getLogs();

  logs.push(normalizedEntry);
  const trimmedLogs = logs.slice(-MAX_LOGS);
  await chrome.storage.local.set({ [STORAGE_KEYS.LOGS]: trimmedLogs });

  let stats = await ensureStatsShape();
  if (normalizedEntry.level === "BLOCK") {
    stats = await incrementBlockedToday();
  }

  broadcast({
    type: "LOG_EVENT",
    entry: normalizedEntry,
    blockedToday: stats.blockedToday
  });

  return { entry: normalizedEntry, blockedToday: stats.blockedToday };
}

function normalizeEntry(entry, sender) {
  const safeEntry = entry && typeof entry === "object" ? entry : {};

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    time: typeof safeEntry.time === "string" ? safeEntry.time : formatTime(),
    level: typeof safeEntry.level === "string" ? safeEntry.level : "INFO",
    platform: typeof safeEntry.platform === "string" ? safeEntry.platform : "unknown",
    msg: typeof safeEntry.msg === "string" ? safeEntry.msg : "",
    selector: typeof safeEntry.selector === "string" ? safeEntry.selector : "",
    element: typeof safeEntry.element === "string" ? safeEntry.element : "",
    tabId: sender?.tab?.id || null
  };
}

async function getLogs() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.LOGS);
  return Array.isArray(data[STORAGE_KEYS.LOGS]) ? data[STORAGE_KEYS.LOGS] : [];
}

async function getLogState() {
  const [logs, stats] = await Promise.all([getLogs(), ensureStatsShape()]);
  return { logs, blockedToday: stats.blockedToday };
}

async function clearLogs() {
  const stats = { date: getTodayKey(), blockedToday: 0 };
  await chrome.storage.local.set({
    [STORAGE_KEYS.LOGS]: [],
    [STORAGE_KEYS.STATS]: stats
  });

  broadcast({ type: "LOGS_CLEARED", blockedToday: 0 });
  return { logs: [], blockedToday: 0 };
}

async function ensureStatsShape() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.STATS);
  const today = getTodayKey();

  if (!data[STORAGE_KEYS.STATS] || data[STORAGE_KEYS.STATS].date !== today) {
    const freshStats = { date: today, blockedToday: 0 };
    await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: freshStats });
    return freshStats;
  }

  return data[STORAGE_KEYS.STATS];
}

async function incrementBlockedToday() {
  const stats = await ensureStatsShape();
  const nextStats = {
    date: stats.date,
    blockedToday: Number(stats.blockedToday || 0) + 1
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: nextStats });
  return nextStats;
}

function broadcast(message) {
  chrome.runtime.sendMessage(message, () => {
    void chrome.runtime.lastError;
  });
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime() {
  const value = new Date();
  const ms = String(value.getMilliseconds()).padStart(3, "0");
  return `${value.toLocaleTimeString("en-GB", { hour12: false })}.${ms}`;
}
