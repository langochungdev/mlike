(() => {
  const LOG_LEVELS = Object.freeze({
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
    BLOCK: "BLOCK",
    SKIP: "SKIP",
  });

  function formatTime() {
    const value = new Date();
    const ms = String(value.getMilliseconds()).padStart(3, "0");
    return `${value.toLocaleTimeString("en-GB", { hour12: false })}.${ms}`;
  }

  function truncateElement(element) {
    if (!(element instanceof Element)) {
      return "";
    }

    const html = element.outerHTML || "";
    return html.length > 220 ? `${html.slice(0, 220)}...` : html;
  }

  function sendLog(entry) {
    chrome.runtime.sendMessage({ type: "VF_LOG", entry }, () => {
      void chrome.runtime.lastError;
    });
  }

  function createLogger(platform) {
    const source = typeof platform === "string" ? platform : "unknown";

    function log(level, msg, meta = {}) {
      const entry = {
        time: formatTime(),
        level,
        platform: source,
        msg: typeof msg === "string" ? msg : String(msg || ""),
        selector: typeof meta.selector === "string" ? meta.selector : "",
        element: truncateElement(meta.element),
      };

      sendLog(entry);
      return entry;
    }

    return {
      log,
      info: (msg, meta) => log(LOG_LEVELS.INFO, msg, meta),
      warn: (msg, meta) => log(LOG_LEVELS.WARN, msg, meta),
      error: (msg, meta) => log(LOG_LEVELS.ERROR, msg, meta),
      block: (msg, meta) => log(LOG_LEVELS.BLOCK, msg, meta),
      skip: (msg, meta) => log(LOG_LEVELS.SKIP, msg, meta),
    };
  }

  window.LikeFilter = window.LikeFilter || {};
  window.LikeFilter.LOG_LEVELS = LOG_LEVELS;
  window.LikeFilter.createLogger = createLogger;
})();
