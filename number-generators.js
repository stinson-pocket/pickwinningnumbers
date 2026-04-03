(function () {
  const byId = (id) => document.getElementById(id);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeSeed(input) {
    return Array.from(String(input)).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 17), 0);
  }

  function createSeededRandom(seed) {
    let state = seed % 2147483647;
    if (state <= 0) state += 2147483646;
    return function next() {
      state = state * 16807 % 2147483647;
      return (state - 1) / 2147483646;
    };
  }

  function pickUniqueNumbers(random, count, min, max) {
    const picks = new Set();
    while (picks.size < count) {
      picks.add(Math.floor(random() * (max - min + 1)) + min);
    }
    return Array.from(picks).sort((left, right) => left - right);
  }

  function pickUniqueFromPool(random, count, pool) {
    const picks = new Set();
    const source = [...pool];
    if (!source.length) return [];

    while (picks.size < count && picks.size < source.length) {
      const candidate = source[Math.floor(random() * source.length)];
      picks.add(candidate);
    }

    return Array.from(picks).sort((left, right) => left - right);
  }

  function formatNumber(value) {
    return String(value).padStart(2, "0");
  }

  function renderNumberLine(values, specialLabel, specialValue) {
    const base = values.map((value) => `<span>${formatNumber(value)}</span>`).join("");
    const special = specialValue ? `<span class="ball-special" aria-label="${specialLabel} ${formatNumber(specialValue)}">${formatNumber(specialValue)}</span>` : "";
    return `<div class="ball-row">${base}${special}</div>`;
  }

  function renderOutput(shell, title, intro, lines, note) {
    shell.innerHTML = `
      <div class="generator-output-head">
        <div>
          <p class="card-label">Generated line${lines.length > 1 ? "s" : ""}</p>
          <h2>${title}</h2>
        </div>
        <p class="generator-output-copy">${intro}</p>
      </div>
      <div class="generator-output-grid">
        ${lines.map((line, index) => `
          <article class="generated-set">
            <p class="generated-set-label">Line ${index + 1}</p>
            ${renderNumberLine(line.main, line.specialLabel, line.special)}
          </article>
        `).join("")}
      </div>
      <p class="generator-disclaimer">${note}</p>
    `;
  }

  function fillLineFromSeedValues(config, seedValues, random) {
    const picks = new Set();

    seedValues.forEach((value) => {
      if (value == null || value === "") return;
      const normalized = ((Number(value) - config.mainMin) % (config.mainMax - config.mainMin + 1) + (config.mainMax - config.mainMin + 1)) % (config.mainMax - config.mainMin + 1) + config.mainMin;
      picks.add(normalized);
    });

    while (picks.size < config.mainCount) {
      picks.add(Math.floor(random() * (config.mainMax - config.mainMin + 1)) + config.mainMin);
    }

    return Array.from(picks).slice(0, config.mainCount).sort((left, right) => left - right);
  }

  function trackGeneratorEvent(name, lineCount) {
    if (!window.PWNAnalytics || typeof window.PWNAnalytics.track !== "function") return;
    window.PWNAnalytics.track("generator_generate", {
      generator_name: name,
      line_count: lineCount
    });
  }

  function getLineCount() {
    const field = byId("line-count");
    return clamp(Number(field ? field.value : 3) || 3, 1, 20);
  }

  function getGameConfig(game) {
    if (game === "mega-millions") {
      return {
        title: "Mega Millions number generator",
        intro: "Fresh lines built for the current Mega Millions number ranges.",
        mainCount: 5,
        mainMin: 1,
        mainMax: 70,
        specialMin: 1,
        specialMax: 25,
        specialLabel: "Mega Ball",
        note: "Use these as fun quick picks, not predictions. Mega Millions outcomes remain random."
      };
    }

    return {
      title: "Powerball number generator",
      intro: "Fresh lines built for the current Powerball number ranges.",
      mainCount: 5,
      mainMin: 1,
      mainMax: 69,
      specialMin: 1,
      specialMax: 26,
      specialLabel: "Powerball",
      note: "Use these as fun quick picks, not predictions. Powerball outcomes remain random."
    };
  }

  function generateGameLines(config, seedText, lineCount) {
    const random = createSeededRandom(normalizeSeed(seedText));
    const lines = [];

    for (let index = 0; index < lineCount; index += 1) {
      const lineRandom = createSeededRandom(normalizeSeed(`${seedText}-${index + 1}-${Math.round(random() * 100000)}`));
      lines.push({
        main: pickUniqueNumbers(lineRandom, config.mainCount, config.mainMin, config.mainMax),
        special: Math.floor(lineRandom() * config.specialMax) + config.specialMin,
        specialLabel: config.specialLabel
      });
    }

    return lines;
  }

  function wireGameGenerator() {
    const form = byId("game-generator-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    const pageGame = document.body.dataset.generatorGame || "powerball";
    const config = getGameConfig(pageGame);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const seedField = byId("seed-word");
      const lineCount = getLineCount();
      const seedText = seedField && seedField.value.trim()
        ? `${pageGame}-${seedField.value.trim().toLowerCase()}`
        : `${pageGame}-${new Date().toISOString().slice(0, 10)}-${lineCount}`;

      renderOutput(output, config.title, config.intro, generateGameLines(config, seedText, lineCount), config.note);
      trackGeneratorEvent(config.title, lineCount);
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  function wireQuickPickSimulator() {
    const form = byId("quick-pick-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const game = String(formData.get("game"));
      const config = getGameConfig(game);
      const pace = String(formData.get("pace") || "fresh");
      const lineCount = getLineCount();
      const seedText = [
        "quick-pick",
        game,
        pace,
        new Date().toISOString().slice(0, 10),
        lineCount
      ].join("-");

      renderOutput(
        output,
        "Quick Pick simulator",
        "These lines are built to feel like a fast batch of clean quick-pick tickets for the game you chose.",
        generateGameLines(config, seedText, lineCount),
        "This simulator is about speed and variety, not prediction. It simply gives you a cleaner way to spin up ready-to-check lines."
      );
      trackGeneratorEvent("Quick Pick simulator", lineCount);
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  function wireLuckyGenerator() {
    const form = byId("lucky-generator-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const game = String(formData.get("game"));
      const config = getGameConfig(game);
      const seedText = [
        "lucky",
        game,
        formData.get("birthMonth"),
        formData.get("birthDay"),
        formData.get("favoriteNumber"),
        formData.get("initials")
      ].join("-");

      renderOutput(
        output,
        "Lucky number generator",
        "These lines blend your date details and favorite-number input into game-ready picks.",
        generateGameLines(config, seedText, getLineCount()),
        "This tool is for fun and routine building. Personal inputs do not increase the true odds of a draw."
      );
      trackGeneratorEvent("Lucky number generator", getLineCount());
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  function getZodiacWeight(sign) {
    const weights = {
      aries: 19,
      taurus: 23,
      gemini: 31,
      cancer: 37,
      leo: 41,
      virgo: 43,
      libra: 47,
      scorpio: 53,
      sagittarius: 59,
      capricorn: 61,
      aquarius: 67,
      pisces: 71
    };

    return weights[sign] || 29;
  }

  function wireZodiacGenerator() {
    const form = byId("zodiac-generator-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const game = String(formData.get("game"));
      const config = getGameConfig(game);
      const sign = String(formData.get("sign"));
      const seedText = [
        "zodiac",
        game,
        sign,
        formData.get("birthMonth"),
        formData.get("luckyDay"),
        getZodiacWeight(sign)
      ].join("-");

      renderOutput(
        output,
        "Zodiac lucky number generator",
        "These lines use your sign plus a simple date seed for a repeatable zodiac-style quick-pick set.",
        generateGameLines(config, seedText, getLineCount()),
        "Zodiac-inspired picks are entertainment, not forecasting. Treat them like a themed quick-pick tool."
      );
      trackGeneratorEvent("Zodiac lucky number generator", getLineCount());
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  function buildBalancedMainNumbers(random, config, targetOddCount, targetLowCount) {
    const midpoint = Math.floor((config.mainMin + config.mainMax) / 2);
    const picks = new Set();

    while (picks.size < config.mainCount) {
      const candidate = Math.floor(random() * (config.mainMax - config.mainMin + 1)) + config.mainMin;
      const current = Array.from(picks);
      const oddCount = current.filter((value) => value % 2 !== 0).length;
      const lowCount = current.filter((value) => value <= midpoint).length;

      if (candidate % 2 !== 0 && oddCount >= targetOddCount) continue;
      if (candidate % 2 === 0 && current.length - oddCount >= config.mainCount - targetOddCount) continue;
      if (candidate <= midpoint && lowCount >= targetLowCount) continue;
      if (candidate > midpoint && current.length - lowCount >= config.mainCount - targetLowCount) continue;

      picks.add(candidate);
    }

    return Array.from(picks).sort((left, right) => left - right);
  }

  function wireCalculatorGenerator() {
    const form = byId("calculator-generator-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const game = String(formData.get("game"));
      const style = String(formData.get("style"));
      const anchor = Number(formData.get("anchor") || 0);
      const config = getGameConfig(game);
      const random = createSeededRandom(normalizeSeed(`calculator-${game}-${style}-${anchor}`));
      const lines = [];

      for (let index = 0; index < getLineCount(); index += 1) {
        const targetOddCount = style === "wide" ? 2 : 3;
        const targetLowCount = style === "compact" ? 4 : style === "wide" ? 2 : 3;
        const main = buildBalancedMainNumbers(random, config, targetOddCount, targetLowCount)
          .map((value, position) => clamp(value + ((anchor + index + position) % 3) - 1, config.mainMin, config.mainMax));
        const deduped = Array.from(new Set(main));

        while (deduped.length < config.mainCount) {
          const refill = Math.floor(random() * (config.mainMax - config.mainMin + 1)) + config.mainMin;
          if (!deduped.includes(refill)) deduped.push(refill);
        }

        deduped.sort((left, right) => left - right);
        lines.push({
          main: deduped,
          special: Math.floor(random() * config.specialMax) + config.specialMin,
          specialLabel: config.specialLabel
        });
      }

      renderOutput(
        output,
        "Lottery number calculator",
        "These lines are shaped around spread, odd-even balance, and a simple numeric anchor so they feel more structured than a pure random pick.",
        lines,
        "This calculator creates balanced patterns, not a mathematical edge. Real draw odds stay the same."
      );
      trackGeneratorEvent("Lottery number calculator", getLineCount());
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  function wireBalancedLineGenerator() {
    const form = byId("balanced-line-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const game = String(formData.get("game"));
      const oddEvenStyle = String(formData.get("oddEvenStyle") || "balanced");
      const spreadStyle = String(formData.get("spreadStyle") || "balanced");
      const config = getGameConfig(game);
      const random = createSeededRandom(normalizeSeed(`balanced-line-${game}-${oddEvenStyle}-${spreadStyle}`));
      const lineCount = getLineCount();
      const lines = [];

      for (let index = 0; index < lineCount; index += 1) {
        const lineRandom = createSeededRandom(normalizeSeed(`balanced-line-${game}-${oddEvenStyle}-${spreadStyle}-${index}`));
        const targetOddCount = oddEvenStyle === "odd-heavy" ? 3 : oddEvenStyle === "even-heavy" ? 2 : 3;
        const targetLowCount = spreadStyle === "wide" ? 2 : spreadStyle === "compact" ? 4 : 3;

        lines.push({
          main: buildBalancedMainNumbers(lineRandom, config, targetOddCount, targetLowCount),
          special: Math.floor(random() * config.specialMax) + config.specialMin,
          specialLabel: config.specialLabel
        });
      }

      renderOutput(
        output,
        "Balanced line generator",
        "These lines lean toward steadier odd-even and low-high spacing so the sets feel cleaner and less clustered.",
        lines,
        "Balanced-looking lines can make your picks feel more structured, but they do not create a mathematical edge."
      );
      trackGeneratorEvent("Balanced line generator", lineCount);
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  function wireBirthdayConverter() {
    const form = byId("birthday-converter-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const game = String(formData.get("game"));
      const config = getGameConfig(game);
      const lineCount = getLineCount();
      const seedValues = [
        Number(formData.get("birthMonth") || 0),
        Number(formData.get("birthDay") || 0),
        Number(formData.get("birthYear") || 0),
        Number(formData.get("partnerMonth") || 0),
        Number(formData.get("partnerDay") || 0),
      ];
      const random = createSeededRandom(normalizeSeed(`birthday-converter-${seedValues.join("-")}-${game}`));
      const lines = [];

      for (let index = 0; index < lineCount; index += 1) {
        const lineRandom = createSeededRandom(normalizeSeed(`birthday-converter-${seedValues.join("-")}-${game}-${index}`));
        const shiftedSeeds = seedValues.map((value, offset) => value + index + offset);
        lines.push({
          main: fillLineFromSeedValues(config, shiftedSeeds, lineRandom),
          special: ((Number(formData.get("birthDay") || 1) + Number(formData.get("partnerDay") || 0) + index) % config.specialMax) + config.specialMin,
          specialLabel: config.specialLabel
        });
      }

      renderOutput(
        output,
        "Birthday number converter",
        "These lines turn date-based inputs into game-ready picks while staying inside the official number ranges for the game you selected.",
        lines,
        "This converter keeps sentimental numbers playable, but it does not improve draw odds. It is a convenience and habit-building tool."
      );
      trackGeneratorEvent("Birthday number converter", lineCount);
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  function getOccasionWeight(occasion) {
    const weights = {
      birthday: 17,
      anniversary: 29,
      holiday: 41,
      milestone: 53,
      weekend: 61
    };

    return weights[occasion] || 23;
  }

  function wireOccasionGenerator() {
    const form = byId("occasion-generator-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const game = String(formData.get("game"));
      const occasion = String(formData.get("occasion"));
      const note = String(formData.get("occasionNote") || "").trim().toLowerCase();
      const lineCount = getLineCount();
      const config = getGameConfig(game);
      const seedText = [
        "occasion",
        game,
        occasion,
        formData.get("month"),
        formData.get("day"),
        getOccasionWeight(occasion),
        note
      ].join("-");

      renderOutput(
        output,
        "Lucky day / occasion generator",
        "These lines are built around your occasion type, date details, and a short note so the result feels more personal than a plain quick pick.",
        generateGameLines(config, seedText, lineCount),
        "Occasion-based picks are for fun, rituals, and shareable routines. They do not change the true odds of a drawing."
      );
      trackGeneratorEvent("Lucky day / occasion generator", lineCount);
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  function getRecentGameLine(game) {
    const gameName = game === "mega-millions" ? "Mega Millions" : "Powerball";
    const feedResults = window.resultsFeedData && Array.isArray(window.resultsFeedData.results)
      ? window.resultsFeedData.results
      : [];
    const fallbackResults = typeof siteData !== "undefined" && Array.isArray(siteData.results)
      ? siteData.results
      : [];
    const allResults = [...feedResults, ...fallbackResults];
    const result = allResults.find((item) => item.name === gameName);
    if (!result || !Array.isArray(result.numbers)) {
      return [];
    }

    return result.numbers.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  }

  function buildHotPool(config, recentLine) {
    if (!recentLine.length) {
      return pickUniqueNumbers(createSeededRandom(97), config.mainCount + 4, config.mainMin, config.mainMax);
    }

    const hot = new Set();
    recentLine.forEach((value) => {
      hot.add(value);
      if (value - 1 >= config.mainMin) hot.add(value - 1);
      if (value + 1 <= config.mainMax) hot.add(value + 1);
    });
    return Array.from(hot).sort((left, right) => left - right);
  }

  function wireHotColdGenerator() {
    const form = byId("hot-cold-generator-form");
    const output = byId("generator-output");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const game = String(formData.get("game"));
      const bias = String(formData.get("bias") || "mixed");
      const config = getGameConfig(game);
      const lineCount = getLineCount();
      const recentLine = getRecentGameLine(game);
      const hotPool = buildHotPool(config, recentLine);
      const coldPool = [];

      for (let value = config.mainMin; value <= config.mainMax; value += 1) {
        if (!hotPool.includes(value)) coldPool.push(value);
      }

      const random = createSeededRandom(normalizeSeed(`hot-cold-${game}-${bias}-${recentLine.join("-")}`));
      const lines = [];

      for (let index = 0; index < lineCount; index += 1) {
        const lineRandom = createSeededRandom(normalizeSeed(`hot-cold-${game}-${bias}-${index}-${recentLine.join("-")}`));
        const hotCount = bias === "hot" ? 3 : bias === "cold" ? 1 : 2;
        const coldCount = config.mainCount - hotCount;
        const main = [
          ...pickUniqueFromPool(lineRandom, hotCount, hotPool),
          ...pickUniqueFromPool(lineRandom, coldCount, coldPool)
        ];

        while (new Set(main).size < config.mainCount) {
          main.push(Math.floor(lineRandom() * (config.mainMax - config.mainMin + 1)) + config.mainMin);
        }

        lines.push({
          main: Array.from(new Set(main)).slice(0, config.mainCount).sort((left, right) => left - right),
          special: Math.floor(random() * config.specialMax) + config.specialMin,
          specialLabel: config.specialLabel
        });
      }

      renderOutput(
        output,
        "Hot and cold number generator",
        "These lines mix numbers from the most recently visible game line with colder untouched ranges, depending on the bias you selected.",
        lines,
        "This first version is a lightweight hot/cold tool based on the site's visible game data and range splits, not a long-term historical prediction model."
      );
      trackGeneratorEvent("Hot and cold number generator", lineCount);
    });

    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  wireGameGenerator();
  wireQuickPickSimulator();
  wireLuckyGenerator();
  wireZodiacGenerator();
  wireCalculatorGenerator();
  wireBalancedLineGenerator();
  wireBirthdayConverter();
  wireOccasionGenerator();
  wireHotColdGenerator();
})();
