(() => {
  window.LikeFilter = window.LikeFilter || {};
  window.LikeFilter.platforms = window.LikeFilter.platforms || {};

  // data-pressable-container is currently the most stable post wrapper on Threads web.
  const POST_SELECTOR = 'div[data-pressable-container="true"]';
  const LIKE_HINT_REGEX =
    /(likes?|thích|thich|lượt thích|luot thich|me gusta|j’aime)/i;
  const ACTION_SIGNAL_REGEX =
    /(like|thích|reply|trả lời|tra loi|repost|đăng lại|dang lai|share|chia sẻ|chia se)/i;

  function getPosts(scope) {
    const found = scope.querySelectorAll(POST_SELECTOR);
    return Array.from(new Set(found));
  }

  function extractLikes(post, parseMetricCount) {
    const explicitNodes = post.querySelectorAll(
      [
        'a[href*="/likes"]',
        'a[href*="/liked_by"]',
        'button[aria-label*="like" i]',
        '[role="button"][aria-label*="like" i]',
        'button[aria-label*="thích" i]',
        '[role="button"][aria-label*="thích" i]',
        '[title*="like" i]',
        '[title*="thích" i]',
      ].join(","),
    );

    for (const node of explicitNodes) {
      const parsed = parseFromNodeSources(node, parseMetricCount, false);
      if (parsed !== null) {
        return parsed;
      }
    }

    const hintNodes = post.querySelectorAll(
      'span, div[dir="auto"], a, button, [role="button"]',
    );
    for (const node of hintNodes) {
      const parsed = parseFromNodeSources(node, parseMetricCount, true);
      if (parsed !== null) {
        return parsed;
      }
    }

    // Fallback: action bar usually exposes 3 metric counts where the 3rd is likes.
    const actionMetrics = [];
    const actionNodes = post.querySelectorAll('button, [role="button"], a');
    for (const node of actionNodes) {
      const label = readNodeSources(node).join(" ").trim();
      if (!label || label.length > 40) {
        continue;
      }

      const parsed = parseMetricCount(label);
      if (parsed !== null) {
        actionMetrics.push(parsed);
      }
    }

    if (actionMetrics.length >= 3) {
      return actionMetrics[2];
    }

    // When Threads shows a like action but no number, it effectively means 0 likes.
    if (hasLikeSignal(post, explicitNodes)) {
      return 0;
    }

    return null;
  }

  function hasLikeSignal(post, explicitNodes) {
    if (explicitNodes.length > 0) {
      return true;
    }

    const likeControls = post.querySelectorAll(
      [
        'button[aria-label*="like" i]',
        '[role="button"][aria-label*="like" i]',
        'button[aria-label*="thích" i]',
        '[role="button"][aria-label*="thích" i]',
        '[title*="like" i]',
        '[title*="thích" i]',
      ].join(","),
    );

    if (likeControls.length > 0) {
      return true;
    }

    const textNodes = post.querySelectorAll(
      'span, div[dir="auto"], a, button, [role="button"]',
    );
    for (const node of textNodes) {
      const signals = readNodeSources(node);
      if (signals.some((value) => LIKE_HINT_REGEX.test(value))) {
        return true;
      }
    }

    // New posts may hide the like count but still render the interaction row.
    const actionControls = post.querySelectorAll(
      'button[aria-label], [role="button"][aria-label], a[aria-label]',
    );
    let interactionHit = 0;
    for (const control of actionControls) {
      const ariaLabel = control.getAttribute("aria-label") || "";
      if (ACTION_SIGNAL_REGEX.test(ariaLabel)) {
        interactionHit += 1;
      }
    }

    return interactionHit >= 2;
  }

  function parseFromNodeSources(node, parseMetricCount, requireHint) {
    const sources = readNodeSources(node);
    for (const value of sources) {
      if (!value) {
        continue;
      }

      if (requireHint && !LIKE_HINT_REGEX.test(value)) {
        continue;
      }

      const parsed = parseMetricCount(value);
      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  }

  function readNodeSources(node) {
    const text = node.textContent ? node.textContent.trim() : "";
    const ariaLabel = node.getAttribute
      ? node.getAttribute("aria-label") || ""
      : "";
    const title = node.getAttribute ? node.getAttribute("title") || "" : "";
    return [text, ariaLabel, title];
  }

  window.LikeFilter.platforms.threads = {
    key: "threads",
    postSelector: POST_SELECTOR,
    getPosts,
    extractLikes,
  };
})();
