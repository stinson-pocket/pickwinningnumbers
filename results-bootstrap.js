(function () {
  const config = window.resultsFeedConfig || {};
  const remoteScriptUrl = (config.remoteScriptUrl || "").trim();

  window.resultsFeedReady = new Promise((resolve) => {
    if (!remoteScriptUrl) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = remoteScriptUrl;
    script.async = true;
    script.onload = function () {
      resolve();
    };
    script.onerror = function () {
      console.warn("Remote results feed failed to load. Falling back to local results-feed.js.");
      resolve();
    };
    document.head.appendChild(script);
  });
})();
