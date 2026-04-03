(function () {
  const config = window.PWNAnalyticsConfig || {};
  const measurementId = String(config.measurementId || "").trim();

  function isConfigured() {
    return measurementId && measurementId !== "G-XXXXXXXXXX";
  }

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function loadGtag() {
    if (!isConfigured() || window.__pwnAnalyticsLoaded) return;
    window.__pwnAnalyticsLoaded = true;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", measurementId, {
      page_title: document.title,
      page_location: window.location.href
    });
  }

  function track(eventName, params) {
    if (!isConfigured() || typeof window.gtag !== "function") return;
    window.gtag("event", eventName, params || {});
  }

  loadGtag();

  window.PWNAnalytics = {
    track: track,
    isConfigured: isConfigured
  };

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[href]");
    if (!link) return;

    if (link.href.indexOf("number-generator") !== -1 || link.href.indexOf("lottery-number-calculator") !== -1) {
      track("generator_link_click", {
        link_text: (link.textContent || "").trim(),
        link_url: link.href
      });
    }
  });

  window.addEventListener("pwn:newsletter_signup_success", function (event) {
    const detail = event.detail || {};
    track("newsletter_signup_success", {
      form_context: detail.formContext || "",
      page_path: window.location.pathname
    });
  });
})();
