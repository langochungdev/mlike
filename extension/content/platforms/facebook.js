(() => {
  window.LikeFilter = window.LikeFilter || {};
  window.LikeFilter.platforms = window.LikeFilter.platforms || {};

  // FeedUnit blocks are the main post containers in the modern Facebook feed.
  const POST_SELECTOR =
    'div[role="feed"] > div, div[data-pagelet^="FeedUnit_"]';
  const LIKE_HINT_REGEX =
    /(likes?|reactions?|thích|thich|lượt thích|luot thich)/i;

  function getPosts(scope) {
    const found = scope.querySelectorAll(POST_SELECTOR);
    return Array.from(new Set(found));
  }

  function extractLikes(post, parseMetricCount) {
    const nodes = post.querySelectorAll(
      'a[aria-label*="like" i], a[aria-label*="reaction" i], span, div[dir="auto"]',
    );

    for (const node of nodes) {
      const text = node.textContent ? node.textContent.trim() : "";
      if (!text || !LIKE_HINT_REGEX.test(text)) {
        continue;
      }

      const parsed = parseMetricCount(text);
      if (parsed !== null) {
        return parsed;
      }
    }

    const lines = (post.innerText || "").split("\n");
    for (const line of lines) {
      if (!LIKE_HINT_REGEX.test(line)) {
        continue;
      }

      const parsed = parseMetricCount(line);
      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  }

  window.LikeFilter.platforms.facebook = {
    key: "facebook",
    postSelector: POST_SELECTOR,
    getPosts,
    extractLikes,
  };
})();
