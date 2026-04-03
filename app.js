(function () {
  const NEWSLETTER_MESSAGE_SOURCE = "pickwinningnumbers-newsletter";

  function getBaseData() {
    return typeof siteData !== "undefined" ? siteData : {
      heroStats: [],
      results: [],
      featuredResults: [],
      news: [],
      tips: [],
    };
  }

  function getActiveData() {
    const baseData = getBaseData();
    return window.resultsFeedData
      ? {
          ...baseData,
          heroStats: window.resultsFeedData.heroStats || baseData.heroStats,
          results: window.resultsFeedData.results || baseData.results,
          featuredResults: window.resultsFeedData.featuredResults || baseData.results,
        }
      : baseData;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function renderNewsCard(item) {
    const href = item.href ? ` href="${item.href}"` : "";
    const target = item.target ? ` target="${item.target}"` : "";
    const rel = item.rel ? ` rel="${item.rel}"` : "";
    const classes = `news-card ${item.spotlight ? "spotlight" : ""}${item.href ? " news-card-link" : ""}`;
    const tagName = item.href ? "a" : "article";

    return `
      <${tagName} class="${classes}"${href}${target}${rel}>
        <p class="card-label">${item.category}</p>
        <h3>${item.title}</h3>
        ${item.summary ? `<p>${item.summary}</p>` : ""}
        <span>${item.source} · ${item.time}</span>
      </${tagName}>
    `;
  }

  function renderTipCard(tip) {
    return `
      <a class="tip-card tip-card-link" href="./articles/${tip.slug}.html" aria-label="Read ${tip.title}">
        <p class="card-label">From Tips</p>
        <h3>${tip.title}</h3>
        <p>${tip.summary}</p>
        <span class="tip-card-cta">Read article</span>
      </a>
    `;
  }

  function getNewsletterEndpoint() {
    const config = window.resultsFeedConfig || {};
    const explicitUrl = (config.newsletterSubmitUrl || "").trim();
    if (explicitUrl) return explicitUrl;

    const remoteScriptUrl = (config.remoteScriptUrl || "").trim();
    if (!remoteScriptUrl) return "";

    return remoteScriptUrl.split("?")[0];
  }

  function setFormStatus(form, message, state) {
    const status = form.parentElement ? form.parentElement.querySelector("[data-form-status]") : null;
    if (!status) return;

    status.textContent = message || "";
    status.classList.remove("is-error", "is-success");
    if (state === "error") {
      status.classList.add("is-error");
    }
    if (state === "success") {
      status.classList.add("is-success");
    }
  }

  function setFormBusy(form, isBusy) {
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Submitting..." : (submitButton.dataset.defaultLabel || submitButton.textContent);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function buildIframePayload(form, requestId) {
    const payload = new FormData(form);
    payload.set("requestId", requestId);
    payload.set("pageUrl", window.location.href);
    payload.set("pageTitle", document.title);
    payload.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    payload.set("userAgent", navigator.userAgent || "");
    return payload;
  }

  function submitNewsletterForm(form) {
    const endpoint = getNewsletterEndpoint();
    const emailField = form.querySelector('input[name="email"]');
    const email = emailField ? emailField.value.trim() : "";
    const honeypot = form.querySelector('input[name="company"]');

    if (!endpoint) {
      setFormStatus(form, "Newsletter signup is not configured yet. Add the Apps Script web app URL in feed-config.js.", "error");
      return;
    }

    if (!email || !isValidEmail(email)) {
      setFormStatus(form, "Enter a valid email address to join the list.", "error");
      if (emailField) emailField.focus();
      return;
    }

    if (honeypot && honeypot.value.trim()) {
      setFormStatus(form, "Thanks. Your signup was received.", "success");
      form.reset();
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton && !submitButton.dataset.defaultLabel) {
      submitButton.dataset.defaultLabel = submitButton.textContent;
    }

    setFormBusy(form, true);
    setFormStatus(form, "Submitting your signup...", "");

    const requestId = "newsletter-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const iframeName = "newsletter-target-" + requestId;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.title = "Newsletter signup submission";
    iframe.className = "visually-hidden";
    document.body.appendChild(iframe);

    const originalAction = form.getAttribute("action");
    const originalMethod = form.getAttribute("method");
    const originalTarget = form.getAttribute("target");
    form.setAttribute("action", endpoint);
    form.setAttribute("method", "post");
    form.setAttribute("target", iframeName);

    const payload = buildIframePayload(form, requestId);
    payload.forEach(function (value, key) {
      let field = form.querySelector('[name="' + key + '"]');
      if (!field) {
        field = document.createElement("input");
        field.type = "hidden";
        field.name = key;
        field.setAttribute("data-runtime-field", "true");
        form.appendChild(field);
      }
      field.value = value;
    });

    const cleanup = function () {
      if (originalAction === null) form.removeAttribute("action"); else form.setAttribute("action", originalAction);
      if (originalMethod === null) form.removeAttribute("method"); else form.setAttribute("method", originalMethod);
      if (originalTarget === null) form.removeAttribute("target"); else form.setAttribute("target", originalTarget);
      form.querySelectorAll("[data-runtime-field='true']").forEach(function (field) {
        field.remove();
      });
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeoutId);
      window.setTimeout(function () {
        iframe.remove();
      }, 400);
      setFormBusy(form, false);
    };

    const onMessage = function (event) {
      const data = event.data;
      if (!data || data.source !== NEWSLETTER_MESSAGE_SOURCE || data.requestId !== requestId) {
        return;
      }

      cleanup();
      if (data.ok) {
        setFormStatus(form, data.message || "You are on the list.", "success");
        form.reset();
        window.dispatchEvent(new CustomEvent("pwn:newsletter_signup_success", {
          detail: {
            formContext: form.dataset.formContext || ""
          }
        }));
      } else {
        setFormStatus(form, data.message || "The signup did not go through. Please try again.", "error");
      }
    };

    const timeoutId = window.setTimeout(function () {
      cleanup();
      setFormStatus(form, "The signup request timed out. Please try again in a moment.", "error");
    }, 15000);

    window.addEventListener("message", onMessage);
    form.submit();
  }

  function wireNewsletterForms() {
    const forms = document.querySelectorAll("[data-newsletter-form]");
    if (!forms.length) return;

    forms.forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitNewsletterForm(form);
      });
    });
  }

  function getGameUrl(name) {
    const map = {
      "Powerball": "./powerball.html",
      "Mega Millions": "./mega-millions.html",
    };
    return map[name] || null;
  }

  function renderBalls(numbers, special) {
    const balls = numbers.map((number) => `<span>${number}</span>`).join("");
    const extra = special ? `<span class="ball-special">${special}</span>` : "";
    return `<div class="ball-row">${balls}${extra}</div>`;
  }

  function renderResultCard(result) {
    const gameUrl = getGameUrl(result.name);
    const heading = gameUrl
      ? `<h3><a class="card-link" href="${gameUrl}">${result.name}</a></h3>`
      : `<h3>${result.name}</h3>`;
    return `
      <article class="result-card" data-type="${result.type}" data-state-id="${result.stateId || ""}" id="result-${result.id}">
        <div class="result-head">
          <div>
            <p class="card-label">${result.tag}</p>
            ${heading}
          </div>
          <span class="pill ${result.type === "national" ? "pill-gold" : ""}">${result.jackpot}</span>
        </div>
        <p class="result-meta">Last draw: ${result.lastDraw}</p>
        ${renderBalls(result.numbers, result.special)}
        <dl>
          <div><dt>${result.detailA[0]}</dt><dd>${result.detailA[1]}</dd></div>
          <div><dt>${result.detailB[0]}</dt><dd>${result.detailB[1]}</dd></div>
          <div><dt>${result.detailC[0]}</dt><dd>${result.detailC[1]}</dd></div>
        </dl>
      </article>
    `;
  }

  function renderHome() {
    const activeData = getActiveData();
    const heroMeta = byId("hero-meta");
    if (heroMeta) {
      heroMeta.innerHTML = activeData.heroStats.map((item) => `<span>${item}</span>`).join("");
    }

    const heroJackpot = byId("hero-jackpot");
    if (heroJackpot) {
      const featuredResults = activeData.featuredResults || activeData.results;
      const result = featuredResults[0];
      const gameUrl = getGameUrl(result.name);
      const nameMarkup = gameUrl
        ? `<a class="feature-link" href="${gameUrl}">${result.name}</a>`
        : result.name;
      heroJackpot.innerHTML = `
        <div class="card-label">Featured Jackpot</div>
        <div class="feature-game">${nameMarkup}</div>
        <div class="feature-amount">${result.jackpot}</div>
        <div class="feature-subline">${result.detailB[0]} ${result.detailB[1]}</div>
        ${renderBalls(result.numbers, result.special)}
      `;
    }

    const miniGrid = byId("hero-mini-grid");
    if (miniGrid) {
      const featuredResults = activeData.featuredResults || activeData.results;
      miniGrid.innerHTML = featuredResults.slice(1, 5).map((result, index) => `
        <article class="mini-card ${index === 3 ? "muted-card" : ""}">
          <div class="card-label">${index === 3 ? "News Pulse" : (getGameUrl(result.name) ? `<a class="mini-link" href="${getGameUrl(result.name)}">${result.name}</a>` : result.name)}</div>
          <strong>${index === 3 ? "6 fresh updates" : result.jackpot}</strong>
          <p>${index === 3 ? "Jackpot increase alerts, winner stories, and schedule changes." : result.numbers.join(" · ")}</p>
          <small>${index === 3 ? "Curated and structured for daily freshness" : result.detailC[1]}</small>
        </article>
      `).join("");
    }

    const homeResults = byId("home-results-grid");
    if (homeResults) {
      const featuredResults = activeData.featuredResults || activeData.results;
      homeResults.innerHTML = featuredResults.slice(0, 3).map(renderResultCard).join("");
    }

    const newsGrid = byId("news-grid");
    if (newsGrid) {
      newsGrid.innerHTML = activeData.news.slice(0, 3).map(renderNewsCard).join("");
    }

    const tipsGrid = byId("tips-grid");
    if (tipsGrid) {
      tipsGrid.innerHTML = activeData.tips.slice(0, 3).map(renderTipCard).join("");
    }
  }

  function renderResultsPage() {
    const activeData = getActiveData();
    const resultsGrid = byId("results-page-grid");
    if (!resultsGrid) return;
    const sectionNote = byId("results-section-note");
    const statePicker = byId("results-state-picker");
    let activeFilter = "all";
    let activeStateId = "";

    function getStateGames() {
      return activeData.results.filter((item) => item.type === "state" && item.stateId);
    }

    function populateStatePicker() {
      if (!statePicker) return;

      const states = getStateGames()
        .map((item) => ({ stateId: item.stateId, state: item.state }))
        .filter((item, index, array) => array.findIndex((entry) => entry.stateId === item.stateId) === index)
        .sort((left, right) => left.state.localeCompare(right.state));

      statePicker.innerHTML = [
        '<option value="">All states</option>',
        ...states.map((item) => `<option value="${item.stateId}">${item.state}</option>`)
      ].join("");
    }

    function draw() {
      let results = activeData.results;
      if (activeFilter === "national") results = results.filter((item) => item.type === "national");
      if (activeFilter === "state") results = results.filter((item) => item.type === "state");
      if (activeFilter === "jackpot") results = results.filter((item) => item.jackpot.includes("$"));
      if (activeStateId) results = results.filter((item) => item.type === "state" && item.stateId === activeStateId);
      resultsGrid.innerHTML = results.map(renderResultCard).join("");

      if (sectionNote) {
        if (activeStateId) {
          const selectedOption = statePicker ? statePicker.options[statePicker.selectedIndex] : null;
          const label = selectedOption ? selectedOption.textContent : "selected state";
          sectionNote.textContent = "Showing current results for " + label;
        } else if (activeFilter === "national") {
          sectionNote.textContent = "Showing national draws only";
        } else if (activeFilter === "state") {
          sectionNote.textContent = "Showing state games only";
        } else if (activeFilter === "jackpot") {
          sectionNote.textContent = "Showing jackpot-focused cards";
        } else {
          sectionNote.textContent = "Updated with the latest available draw data";
        }
      }
    }

    populateStatePicker();
    draw();

    const filterBar = byId("results-filters");
    if (filterBar) {
      filterBar.addEventListener("click", (event) => {
        const button = event.target.closest("[data-filter]");
        if (!button) return;

        filterBar.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("is-active"));
        button.classList.add("is-active");
        activeFilter = button.dataset.filter;
        if (activeFilter !== "state" && statePicker && statePicker.value) {
          statePicker.value = "";
          activeStateId = "";
        }
        draw();
      });
    }

    if (statePicker) {
      statePicker.addEventListener("change", () => {
        activeStateId = statePicker.value;
        if (activeStateId) {
          activeFilter = "state";
          if (filterBar) {
            filterBar.querySelectorAll(".filter-chip").forEach((chip) => {
              chip.classList.toggle("is-active", chip.dataset.filter === "state");
            });
          }
          resultsGrid.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        draw();
      });
    }
  }

  function renderTipsPage() {
    const activeData = getActiveData();
    const articleGrid = byId("article-grid");
    if (!articleGrid) return;

    articleGrid.innerHTML = activeData.tips.map((tip) => `
      <article class="article-card">
        <p class="card-label">Guide idea</p>
        <h2>${tip.title}</h2>
        <p>${tip.summary}</p>
        <a href="./articles/${tip.slug}.html">Read article</a>
      </article>
    `).join("");
  }

  function renderGamePage() {
    const activeData = getActiveData();
    const body = document.body;
    if (!body || body.dataset.page !== "game") return;

    const gameName = body.dataset.gameName;
    if (!gameName) return;

    const game = activeData.results.find((item) => item.name === gameName);
    if (!game) return;

    const heroMeta = byId("game-hero-meta");
    if (heroMeta) {
      heroMeta.innerHTML = `
        <span>${game.detailB[0]} ${game.detailB[1]}</span>
        <span>${game.detailC[1]}</span>
        <span>${game.jackpot}</span>
      `;
    }

    const gameCard = byId("game-latest-card");
    if (gameCard) {
      gameCard.innerHTML = renderResultCard(game);
    }

    const related = byId("related-results-links");
    if (related) {
      const picks = activeData.results
        .filter((item) => item.type === "national" && item.name !== gameName)
        .slice(0, 2);
      related.innerHTML = picks.map((item) => `
        <article class="value-card">
          <h3><a href="${getGameUrl(item.name) || "./results.html"}">${item.name}</a></h3>
          <p>Current jackpot: ${item.jackpot}. Last draw: ${item.lastDraw}. Next draw: ${item.detailB[1]}.</p>
        </article>
      `).join("");
    }
  }

  (window.resultsFeedReady || Promise.resolve()).then(() => {
    renderHome();
    renderResultsPage();
    renderTipsPage();
    renderGamePage();
    wireNewsletterForms();
  });
})();
