(() => {
  function createDebouncedObserver({ target, onChange, delay = 150 }) {
    if (!target || typeof onChange !== "function") {
      throw new Error("Invalid observer setup");
    }

    let timeoutId = null;

    const observer = new MutationObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(onChange, delay);
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return {
      disconnect() {
        observer.disconnect();
        clearTimeout(timeoutId);
      },
      trigger() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(onChange, delay);
      }
    };
  }

  window.ViewFilter = window.ViewFilter || {};
  window.ViewFilter.createDebouncedObserver = createDebouncedObserver;
})();
