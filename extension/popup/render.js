(() => {
  function renderAll(state, elements, app) {
    renderSettings(state, elements, app);
    renderStats(state, elements, app);
    renderLogPanel(state, elements);
    renderLogs(state, elements);
  }

  function renderSettings(state, elements, app) {
    elements.minLikesInput.value = String(state.settings.minLikes);
    elements.minLikesRange.max = String(Math.max(10000000, state.settings.minLikes));
    elements.minLikesRange.value = String(state.settings.minLikes);
    elements.likesHint.textContent = `Threshold: ${app.formatNumber(state.settings.minLikes)} likes`;

    for (const radio of elements.modeRadios) {
      radio.checked = radio.value === state.settings.filterMode;
    }

    elements.platformThreads.checked = Boolean(state.settings.platforms.threads);
    elements.platformInstagram.checked = Boolean(state.settings.platforms.instagram);
    elements.platformFacebook.checked = Boolean(state.settings.platforms.facebook);
  }

  function renderStats(state, elements, app) {
    elements.blockedToday.textContent = app.formatNumber(state.blockedToday);
  }

  function renderLogPanel(state, elements) {
    elements.logBody.classList.toggle("is-open", state.logsOpen);
    elements.logChevron.textContent = state.logsOpen ? "▼" : "▲";
    elements.toggleLogs.setAttribute("aria-expanded", String(state.logsOpen));
  }

  function renderLogs(state, elements) {
    const selected = state.logFilter || "ALL";
    const visibleLogs = selected === "ALL"
      ? state.logs
      : state.logs.filter((entry) => entry.level === selected);

    elements.logList.textContent = "";

    if (!visibleLogs.length) {
      const empty = document.createElement("li");
      empty.className = "log-empty";
      empty.textContent = "No logs for this filter.";
      elements.logList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const entry of [...visibleLogs].reverse()) {
      const item = document.createElement("li");
      item.className = `log-item is-${entry.level || "INFO"}`;

      const meta = document.createElement("div");
      meta.className = "log-meta";
      meta.textContent = `${entry.time || "--"}  ${entry.level || "INFO"}  ${entry.platform || "-"}`;

      const message = document.createElement("p");
      message.className = "log-msg";
      message.textContent = entry.msg || "";

      item.append(meta, message);
      fragment.appendChild(item);
    }

    elements.logList.appendChild(fragment);
  }

  window.ViewFilterPopupRender = {
    renderAll,
    renderSettings,
    renderStats,
    renderLogPanel,
    renderLogs
  };
})();
