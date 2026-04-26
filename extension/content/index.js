(() => {
  const api = window.LikeFilter || {};
  const required = [
    "platforms",
    "createDebouncedObserver",
    "createLogger",
    "DEFAULT_SETTINGS",
    "sanitizeSettings",
    "parseMetricCount",
    "detectPlatform",
    "sendMessage",
    "formatNumber",
  ];
  if (required.some((key) => !api[key])) return;

  const CLASS_BLUR = "ext-filtered";
  const CLASS_HIDE = "ext-filtered-hide";
  const CLASS_DEBUG_OPEN = "ext-filtered-debug-open";
  const STYLE_ID = "LikeFilter-style";
  const ATTR_REVISION = "data-vf-revision";
  const ATTR_STATE = "data-vf-state";
  const ATTR_LIKES = "data-vf-likes";
  const ATTR_DEBUG_OPEN = "data-vf-debug-open";

  const platformKey = api.detectPlatform(window.location.hostname);
  if (!platformKey || !api.platforms[platformKey]) return;

  const adapter = api.platforms[platformKey];
  const logger = api.createLogger(platformKey);
  const state = {
    settings: api.DEFAULT_SETTINGS,
    revision: "",
    observer: null,
  };

  injectStyles();
  init();

  function init() {
    bindDebugInteractions();

    api
      .sendMessage({ type: "GET_SETTINGS" })
      .then((settings) => applySettings(settings, true))
      .catch((error) => {
        logger.error(`Failed to load settings: ${error.message}`);
        applySettings(api.DEFAULT_SETTINGS, true);
      });

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "SETTINGS_UPDATED" && message.settings)
        applySettings(message.settings, false);
    });
  }

  function applySettings(nextSettings, isInitial) {
    state.settings = api.sanitizeSettings(nextSettings);
    state.revision = `${state.settings.minLikes}:${state.settings.filterMode}:${isPlatformEnabled()}`;
    clearRevisionFlags();

    if (!isPlatformEnabled()) {
      stopObserver();
      clearAllFilters();
      if (!isInitial) logger.info("Platform disabled from popup settings.");
      return;
    }

    startObserver();
    scanPosts();
    if (!isInitial) {
      logger.info(
        `Settings updated - threshold: ${api.formatNumber(state.settings.minLikes)} likes, mode: ${state.settings.filterMode}`,
      );
    }
  }

  function isPlatformEnabled() {
    return Boolean(state.settings.platforms[platformKey]);
  }

  function startObserver() {
    if (state.observer || !document.body) return;
    state.observer = api.createDebouncedObserver({
      target: document.body,
      delay: 150,
      onChange: scanPosts,
    });
    state.observer.trigger();
  }

  function stopObserver() {
    if (!state.observer) return;
    state.observer.disconnect();
    state.observer = null;
  }

  function scanPosts() {
    if (!isPlatformEnabled()) return;
    let posts = [];
    try {
      posts = adapter.getPosts(document);
    } catch (error) {
      logger.error(`Post scan failed: ${error.message}`);
      return;
    }
    for (const post of posts) processPost(post);
  }

  function processPost(post) {
    if (
      !(post instanceof HTMLElement) ||
      post.getAttribute(ATTR_REVISION) === state.revision
    )
      return;

    const previousState = post.getAttribute(ATTR_STATE) || "";
    const likes = adapter.extractLikes(post, api.parseMetricCount);

    if (!Number.isFinite(likes)) {
      clearClasses(post);
      post.removeAttribute(ATTR_DEBUG_OPEN);
      post.setAttribute(ATTR_STATE, "unknown");
      post.setAttribute(ATTR_REVISION, state.revision);
      post.removeAttribute(ATTR_LIKES);
      if (previousState !== "unknown") {
        logger.warn("Skipped post - unable to read like count.", {
          selector: adapter.postSelector,
          element: post,
        });
      }
      return;
    }

    const shouldBlock = likes < state.settings.minLikes;
    if (shouldBlock) {
      applyFilter(post);
    } else {
      clearClasses(post);
      post.removeAttribute(ATTR_DEBUG_OPEN);
    }

    const nextState = shouldBlock ? "blocked" : "allowed";
    post.setAttribute(ATTR_STATE, nextState);
    post.setAttribute(ATTR_REVISION, state.revision);
    post.setAttribute(ATTR_LIKES, String(likes));
    if (nextState === previousState) return;

    const msg = shouldBlock
      ? `Blocked post - likes: ${api.formatNumber(likes)} < threshold: ${api.formatNumber(state.settings.minLikes)}`
      : `Skipped post - likes: ${api.formatNumber(likes)} >= threshold: ${api.formatNumber(state.settings.minLikes)}`;
    const meta = { selector: adapter.postSelector, element: post };
    shouldBlock ? logger.block(msg, meta) : logger.skip(msg, meta);
  }

  function applyFilter(post) {
    if (post.getAttribute(ATTR_DEBUG_OPEN) === "1") {
      post.classList.remove(CLASS_BLUR, CLASS_HIDE);
      post.classList.add(CLASS_DEBUG_OPEN);
      return;
    }

    if (state.settings.filterMode === "hide") {
      post.classList.add(CLASS_HIDE);
      post.classList.remove(CLASS_BLUR, CLASS_DEBUG_OPEN);
      return;
    }

    post.classList.add(CLASS_BLUR);
    post.classList.remove(CLASS_HIDE, CLASS_DEBUG_OPEN);
  }

  function clearClasses(post) {
    post.classList.remove(CLASS_BLUR, CLASS_HIDE, CLASS_DEBUG_OPEN);
  }

  function clearAllFilters() {
    const filtered = document.querySelectorAll(
      `.${CLASS_BLUR}, .${CLASS_HIDE}`,
    );
    for (const item of filtered) item.classList.remove(CLASS_BLUR, CLASS_HIDE);

    const tracked = document.querySelectorAll(
      `[${ATTR_STATE}], [${ATTR_REVISION}], [${ATTR_LIKES}]`,
    );
    for (const item of tracked) {
      item.removeAttribute(ATTR_STATE);
      item.removeAttribute(ATTR_REVISION);
      item.removeAttribute(ATTR_LIKES);
      item.removeAttribute(ATTR_DEBUG_OPEN);
    }
  }

  function clearRevisionFlags() {
    const tracked = document.querySelectorAll(`[${ATTR_REVISION}]`);
    for (const item of tracked) item.removeAttribute(ATTR_REVISION);
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".ext-filtered{filter:blur(8px)!important;pointer-events:auto!important;user-select:none!important;position:relative!important;cursor:pointer!important;}" +
      ".ext-filtered-debug-open{filter:none!important;pointer-events:auto!important;user-select:text!important;outline:2px dashed #10b981!important;outline-offset:2px!important;}" +
      ".ext-filtered-hide{height:0!important;overflow:hidden!important;opacity:0!important;margin:0!important;padding:0!important;}";
    (document.head || document.documentElement).appendChild(style);
  }

  function bindDebugInteractions() {
    document.addEventListener("click", onDebugUnblurClick, true);
  }

  function onDebugUnblurClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const blockedPost = target.closest(
      `.${CLASS_BLUR}[${ATTR_STATE}="blocked"]`,
    );
    if (!(blockedPost instanceof HTMLElement)) {
      return;
    }

    blockedPost.setAttribute(ATTR_DEBUG_OPEN, "1");
    blockedPost.classList.remove(CLASS_BLUR);
    blockedPost.classList.add(CLASS_DEBUG_OPEN);
    event.preventDefault();
    event.stopPropagation();

    const likes = blockedPost.getAttribute(ATTR_LIKES);
    logger.info(
      `Debug unblur - likes: ${likes || "unknown"}, threshold: ${api.formatNumber(state.settings.minLikes)}`,
      { selector: adapter.postSelector, element: blockedPost },
    );
  }
})();
