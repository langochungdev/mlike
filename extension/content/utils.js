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

  function parseMetricCount(rawText) {
    if (typeof rawText !== "string") {
      return null;
    }

    const normalized = rawText
      .toLowerCase()
      .replace(/\u00a0/g, " ")
      .trim();
    if (!normalized) {
      return null;
    }

    const match = normalized.match(
      /(\d[\d.,\s]*)(?:\s*)(k|m|b|nghìn|ngan|triệu|tr|tỷ|ty)?/i,
    );
    if (!match) {
      return null;
    }

    const suffix = (match[2] || "").toLowerCase();
    const numberValue = parseNumberToken(match[1], Boolean(suffix));
    if (!Number.isFinite(numberValue)) {
      return null;
    }

    const multipliers = {
      k: 1e3,
      m: 1e6,
      b: 1e9,
      nghìn: 1e3,
      ngan: 1e3,
      triệu: 1e6,
      tr: 1e6,
      tỷ: 1e9,
      ty: 1e9,
    };

    return Math.round(numberValue * (multipliers[suffix] || 1));
  }

  function parseNumberToken(token, hasSuffix) {
    const compact = token.replace(/\s+/g, "");

    if (hasSuffix) {
      return parseFloat(compact.replace(",", "."));
    }

    if (!compact.includes(",") && !compact.includes(".")) {
      return parseInt(compact, 10);
    }

    if (compact.includes(",") && compact.includes(".")) {
      return parseInt(compact.replace(/[.,]/g, ""), 10);
    }

    if (/[.,]\d{3}$/.test(compact) && compact.length > 4) {
      return parseInt(compact.replace(/[.,]/g, ""), 10);
    }

    return parseFloat(compact.replace(",", "."));
  }

  function detectPlatform(hostname) {
    if (hostname.includes("threads.net") || hostname.includes("threads.com")) {
      return "threads";
    }

    if (hostname.includes("instagram.com")) {
      return "instagram";
    }

    if (hostname.includes("facebook.com")) {
      return "facebook";
    }

    return null;
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
    return new Intl.NumberFormat("en-US").format(value);
  }

  window.LikeFilter = window.LikeFilter || {};
  Object.assign(window.LikeFilter, {
    DEFAULT_SETTINGS,
    sanitizeSettings,
    parseMetricCount,
    parseViewCount: parseMetricCount,
    detectPlatform,
    sendMessage,
    formatNumber,
  });
})();
