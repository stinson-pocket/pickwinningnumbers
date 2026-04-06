const siteData = {
  heroStats: [
    "Updated March 29, 2026",
    "47 states tracked",
    "529 active game records"
  ],
  results: [
    {
      id: "powerball",
      type: "national",
      name: "Powerball",
      tag: "National draw",
      jackpot: "$180M",
      lastDraw: "Mar 28, 2026",
      numbers: ["11", "42", "43", "59", "61"],
      special: "25",
      detailA: ["Power Play", "4x"],
      detailB: ["Next draw", "Mar 30"],
      detailC: ["Updated", "11:01 PM ET"]
    },
    {
      id: "mega-millions",
      type: "national",
      name: "Mega Millions",
      tag: "National draw",
      jackpot: "$80M",
      lastDraw: "Mar 27, 2026",
      numbers: ["13", "27", "28", "41", "62"],
      special: "16",
      detailA: ["Bonus", "Mega Ball"],
      detailB: ["Next draw", "Mar 31"],
      detailC: ["Updated", "11:05 PM ET"]
    },
    {
      id: "arkansas-lotto",
      type: "state",
      name: "Arkansas Lotto",
      tag: "State feature",
      jackpot: "$1.1M",
      lastDraw: "Mar 28, 2026",
      numbers: ["14", "15", "19", "27", "29", "37"],
      special: "16",
      detailA: ["Bonus", "Yes"],
      detailB: ["Next draw", "Apr 1"],
      detailC: ["Updated", "10:06 PM ET"]
    },
    {
      id: "georgia-fantasy-5",
      type: "state",
      name: "Georgia Fantasy 5",
      tag: "State game",
      jackpot: "Tonight",
      lastDraw: "Mar 29, 2026",
      numbers: ["12", "14", "22", "31", "35"],
      special: null,
      detailA: ["Status", "Rolling"],
      detailB: ["Next draw", "Tonight"],
      detailC: ["Updated", "11:02 PM ET"]
    },
    {
      id: "florida-lotto",
      type: "state",
      name: "Florida Lotto",
      tag: "State game",
      jackpot: "$4.2M",
      lastDraw: "Mar 29, 2026",
      numbers: ["07", "13", "19", "21", "40", "45"],
      special: null,
      detailA: ["Cash option", "Available"],
      detailB: ["Next draw", "Wednesday"],
      detailC: ["Updated", "9:44 PM ET"]
    }
  ],
  videos: [
    {
      title: "Tonight's Powerball and Mega Millions breakdown",
      description: "A featured recap slot for the newest draw results, jackpot momentum, and quick commentary.",
      type: "featured"
    },
    {
      title: "3 lottery patterns people keep watching",
      description: "Short-form educational content that pairs well with the results module."
    },
    {
      title: "What changed in this week's jackpot race",
      description: "A fast update format tied directly to current news and draw movement."
    },
    {
      title: "State-by-state picks worth watching",
      description: "Rotating regional content for visitors who care about state lottery coverage."
    }
  ],
  news: [
    {
      title: "Powerball climbs to $231M ahead of tonight's draw",
      category: "Jackpot update",
      summary: "Saturday's 03-06-13-41-65 + 01 pull pushed the pot to $231 million for the April 6 drawing, keeping national focus on Powerball's streak.",
      source: "Pick Winning Numbers desk",
      time: "April 6, 2026",
      href: "./powerball.html",
      spotlight: true
    },
    {
      title: "Mega Millions holds at $100M after April 3 lineup",
      category: "Jackpot watch",
      summary: "The 31-45-62-63-68 + 15 lineup kept Mega Millions in nine digits, setting up another $100 million drawing on Tuesday night.",
      source: "Pick Winning Numbers desk",
      time: "April 6, 2026",
      href: "./mega-millions.html"
    },
    {
      title: "Georgia Lottery confirms $2 million scratcher win",
      category: "Winner story",
      summary: "An official Georgia Lottery release details how a Rex player turned a scratcher into a $2 million prize, a perfect story to pair with state coverage.",
      source: "Georgia Lottery",
      time: "March 12, 2026",
      href: "https://www.galottery.com/en-us/media-center/pressreleaseinput/2026/march/rex-player-wins-2-million-on-georgia-lottery-scratcher.html",
      target: "_blank",
      rel: "noreferrer"
    },
    {
      title: "Arkansas player claims $250.8M Powerball jackpot",
      category: "Winner story",
      summary: "The Arkansas winner of the March 2 Powerball drawing has officially claimed the $250.8 million prize, giving the homepage a timely national story.",
      source: "Pick Winning Numbers story",
      time: "March 31, 2026",
      href: "./articles/arkansas-player-claims-250-8m-powerball-jackpot.html"
    },
    {
      title: "Illinois player claims $536M Mega Millions jackpot",
      category: "Winner story",
      summary: "The anonymous Illinois winner of the March 10 Mega Millions drawing has officially claimed the $536 million prize, adding another major win to the mix.",
      source: "Pick Winning Numbers story",
      time: "March 18, 2026",
      href: "./articles/illinois-player-claims-536m-mega-millions-jackpot.html"
    }
  ],
  tips: [
    {
      slug: "how-to-choose-lottery-numbers",
      title: "How to choose lottery numbers",
      summary: "Evergreen guidance that can link naturally to game pages and current result modules."
    },
    {
      slug: "quick-pick-vs-self-picked-numbers",
      title: "Quick Pick vs. self-picked numbers",
      summary: "Comparison content built to answer common user questions and support search demand."
    },
    {
      slug: "how-jackpots-roll-over",
      title: "How jackpots roll over",
      summary: "A clear Q&A explainer that helps readers understand how jackpots grow from draw to draw."
    },
    {
      slug: "what-power-play-and-mega-ball-do",
      title: "What Power Play and Mega Ball actually do",
      summary: "A plain-language explainer that supports trust and keeps readers in the product experience."
    },
    {
      slug: "best-ways-to-compare-state-games",
      title: "Best ways to compare state games",
      summary: "A practical guide that connects results data with useful decision support for players comparing state games."
    },
    {
      slug: "why-draw-day-updates-matter",
      title: "Why draw-day updates matter",
      summary: "A bridge article tying results freshness, news coverage, and email alerts together."
    }
  ]
};
