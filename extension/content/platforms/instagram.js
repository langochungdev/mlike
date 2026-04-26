(() => {
  window.LikeFilter = window.LikeFilter || {};
  window.LikeFilter.platforms = window.LikeFilter.platforms || {};

  // Instagram feed and reels both render content units inside article containers.
  const POST_SELECTOR = "article";
  const LIKE_HINT_REGEX = /(likes?|thích|thich|lượt thích|luot thich)/i;

  function getPosts(scope) {
    const found = scope.querySelectorAll(POST_SELECTOR);
    return Array.from(new Set(found));
  }

  function extractLikes(post, parseMetricCount) {
    const nodes = post.querySelectorAll(
      'a[href*="/liked_by/"], a[href*="/p/"], span, div[role="button"]',
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

  window.LikeFilter.platforms.instagram = {
    key: "instagram",
    postSelector: POST_SELECTOR,
    getPosts,
    extractLikes,
  };
})();
