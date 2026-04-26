(() => {
  const DEFAULT_SETTINGS = {
    minLikes: 5000,
    filterMode: "blur",
    platforms: {
      threads: true,
      instagram: true,
      facebook: false,
    },
  };

  const MAX_LOGS = 300;

  function sanitizeSettings(input) {
    const rawMinLikes = Number.isFinite(input?.minLikes)
      ? input.minLikes
      : input?.minViews;
    return {
      minLikes: Number.isFinite(rawMinLikes)
        ? Math.max(0, Math.round(rawMinLikes))
        : DEFAULT_SETTINGS.minLikes,
      filterMode: input?.filterMode === "hide" ? "hide" : "blur",
      platforms: {
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
            : DEFAULT_SETTINGS.platforms.facebook,
      },
    };
  }

  function sendMessage(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.error || "Unknown runtime error"));
          return;
        }

        resolve(response.data);
      });
    });
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Number(value) || 0);
  }

  function clampMinLikes(value, fallback) {
    if (!Number.isFinite(value)) {
      return Number.isFinite(fallback) ? fallback : DEFAULT_SETTINGS.minLikes;
    }

    return Math.max(0, Math.round(value));
  }

  function formatLogLine(entry) {
    const time = entry.time || "--";
    const level = entry.level || "INFO";
    const platform = entry.platform || "unknown";
    const selector = entry.selector ? ` selector:${entry.selector}` : "";
    return `${time} [${level}] [${platform}] ${entry.msg || ""}${selector}`;
  }

  window.LikeFilterPopup = {
    DEFAULT_SETTINGS,
    MAX_LOGS,
    sanitizeSettings,
    sendMessage,
    formatNumber,
    clampMinLikes,
    formatLogLine,
  };
})();
