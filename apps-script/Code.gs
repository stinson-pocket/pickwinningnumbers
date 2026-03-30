const PWN_FEED_URL = 'http://www.lotterynumbersxml.com/lotterydata/me@ianstinson.com-test/5u2u5utu8/lottery.xml';
const PWN_RESULTS_PROPERTY_KEY = 'PWN_RESULTS_FEED_PAYLOAD';
const PWN_RESULTS_UPDATED_AT_KEY = 'PWN_RESULTS_FEED_UPDATED_AT';
const PWN_RESULTS_STATUS_KEY = 'PWN_RESULTS_FEED_STATUS';

// Replace this with the spreadsheet ID from your Google Sheet URL.
// Example:
// https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
const PWN_NEWSLETTER_SPREADSHEET_ID = '1-qCY7HDkY2bfG4-mNLXiR4tWawbc2XcNx22VF2sgqPY';
const PWN_NEWSLETTER_SHEET_NAME = 'Newsletter';

const PWN_MIN_EXPECTED_STATES = 10;
const PWN_MIN_EXPECTED_RESULTS = 25;
const PWN_NATIONAL_GAMES = {
  Powerball: true,
  'Powerball Double Play': true,
  'Mega Millions': true
};
const PWN_FEATURED_STATES = {
  GA: true,
  FL: true,
  AR: true
};

function doGet(e) {
  const format = e && e.parameter && e.parameter.format ? String(e.parameter.format).toLowerCase() : 'js';
  const view = e && e.parameter && e.parameter.view ? String(e.parameter.view).toLowerCase() : 'data';
  const payload = view === 'status' ? PWN_getFeedStatus_() : PWN_getStoredPayload_();
  const body = format === 'json'
    ? JSON.stringify(payload)
    : 'window.resultsFeedData = ' + JSON.stringify(payload) + ';';

  return ContentService
    .createTextOutput(body)
    .setMimeType(format === 'json' ? ContentService.MimeType.JSON : ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  const params = PWN_getRequestParameters_(e);
  const route = params.route ? String(params.route).toLowerCase() : '';

  try {
    if (route === 'newsletter') {
      return PWN_handleNewsletterSignup_(params);
    }

    return PWN_buildIframeHtmlResponse_({
      ok: false,
      requestId: params.requestId || '',
      message: 'Unsupported POST route.'
    });
  } catch (error) {
    console.error('Newsletter POST failed', error);
    return PWN_buildIframeHtmlResponse_({
      ok: false,
      requestId: params.requestId || '',
      message: 'Signup could not be saved right now. Please try again.'
    });
  }
}

function PWN_refreshLotteryResults() {
  const startedAt = new Date().toISOString();
  const xml = UrlFetchApp.fetch(PWN_FEED_URL, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      Accept: 'application/xml,text/xml'
    }
  });

  const statusCode = xml.getResponseCode();
  if (statusCode !== 200) {
    throw new Error('Lottery XML fetch failed with HTTP ' + statusCode);
  }

  const document = XmlService.parse(xml.getContentText());
  const payload = PWN_buildPayload_(document.getRootElement());
  PWN_validatePayload_(payload);
  PWN_storePayload_(payload);
  PWN_storeFeedStatus_({
    ok: true,
    checkedAt: startedAt,
    generatedAt: payload.generatedAt || null,
    sourceUrl: PWN_FEED_URL,
    stateCount: payload.meta ? payload.meta.stateCount : 0,
    resultCount: payload.meta ? payload.meta.resultCount : 0,
    nationalCount: payload.meta ? payload.meta.nationalCount : 0,
    stateGameCount: payload.meta ? payload.meta.stateGameCount : 0,
    featuredCount: payload.meta ? payload.meta.featuredCount : 0,
    gameNames: payload.meta ? payload.meta.gameNames : []
  });
  return payload;
}

function PWN_installHourlyTrigger() {
  PWN_deleteExistingRefreshTriggers_();
  ScriptApp.newTrigger('PWN_refreshLotteryResults')
    .timeBased()
    .everyHours(1)
    .create();
}

function PWN_deleteExistingRefreshTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'PWN_refreshLotteryResults') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function PWN_primeLotteryResults() {
  return PWN_refreshLotteryResults();
}

function PWN_prepareNewsletterSheet() {
  const sheet = PWN_getOrCreateNewsletterSheet_();
  return {
    spreadsheetId: sheet.getParent().getId(),
    spreadsheetUrl: sheet.getParent().getUrl(),
    spreadsheetName: sheet.getParent().getName(),
    sheetName: sheet.getName()
  };
}

function PWN_getStoredPayload_() {
  const properties = PropertiesService.getScriptProperties();
  const stored = properties.getProperty(PWN_RESULTS_PROPERTY_KEY);
  if (!stored) {
    return {
      heroStats: ['Feed not initialized yet', '0 states tracked', '0 active game records'],
      results: [],
      featuredResults: [],
      generatedFrom: PWN_FEED_URL,
      generatedAt: null,
      meta: {
        stateCount: 0,
        resultCount: 0,
        nationalCount: 0,
        stateGameCount: 0,
        featuredCount: 0,
        gameNames: []
      }
    };
  }

  return JSON.parse(stored);
}

function PWN_storePayload_(payload) {
  const properties = PropertiesService.getScriptProperties();
  const stamped = Object.assign({}, payload, {
    generatedAt: new Date().toISOString()
  });

  properties.setProperty(PWN_RESULTS_PROPERTY_KEY, JSON.stringify(stamped));
  properties.setProperty(PWN_RESULTS_UPDATED_AT_KEY, stamped.generatedAt);
}

function PWN_getFeedStatus_() {
  const properties = PropertiesService.getScriptProperties();
  const stored = properties.getProperty(PWN_RESULTS_STATUS_KEY);
  if (!stored) {
    return {
      ok: false,
      checkedAt: null,
      generatedAt: null,
      sourceUrl: PWN_FEED_URL,
      stateCount: 0,
      resultCount: 0,
      nationalCount: 0,
      stateGameCount: 0,
      featuredCount: 0,
      gameNames: [],
      message: 'Feed status not initialized yet'
    };
  }

  return JSON.parse(stored);
}

function PWN_storeFeedStatus_(status) {
  PropertiesService.getScriptProperties().setProperty(PWN_RESULTS_STATUS_KEY, JSON.stringify(status));
}

function PWN_handleNewsletterSignup_(params) {
  const requestId = params.requestId || '';
  const company = params.company ? String(params.company).trim() : '';
  const email = PWN_normalizeEmail_(params.email);
  const name = params.name ? String(params.name).trim() : '';
  const interest = params.interest ? String(params.interest).trim() : '';
  const sourcePage = params.sourcePage ? String(params.sourcePage).trim() : '';
  const formContext = params.formContext ? String(params.formContext).trim() : '';

  if (company) {
    console.log('Newsletter honeypot triggered for request %s', requestId);
    return PWN_buildIframeHtmlResponse_({
      ok: true,
      requestId: requestId,
      message: 'Thanks. Your signup was received.'
    });
  }

  if (!PWN_isValidEmail_(email)) {
    console.log('Newsletter invalid email for request %s: %s', requestId, email);
    return PWN_buildIframeHtmlResponse_({
      ok: false,
      requestId: requestId,
      message: 'Please enter a valid email address.'
    });
  }

  const sheet = PWN_getOrCreateNewsletterSheet_();
  const existingRow = PWN_findSubscriberRow_(sheet, email);
  const nowIso = new Date().toISOString();

  if (existingRow > 0) {
    sheet.getRange(existingRow, 3).setValue(name || sheet.getRange(existingRow, 3).getValue());
    sheet.getRange(existingRow, 4).setValue(interest || sheet.getRange(existingRow, 4).getValue());
    sheet.getRange(existingRow, 5).setValue(sourcePage || sheet.getRange(existingRow, 5).getValue());
    sheet.getRange(existingRow, 6).setValue(formContext || sheet.getRange(existingRow, 6).getValue());
    sheet.getRange(existingRow, 7).setValue(params.pageUrl || sheet.getRange(existingRow, 7).getValue());
    sheet.getRange(existingRow, 8).setValue(params.pageTitle || sheet.getRange(existingRow, 8).getValue());
    sheet.getRange(existingRow, 9).setValue(params.timezone || sheet.getRange(existingRow, 9).getValue());
    sheet.getRange(existingRow, 10).setValue(params.userAgent || sheet.getRange(existingRow, 10).getValue());
    sheet.getRange(existingRow, 11).setValue(nowIso);
    console.log('Newsletter existing subscriber updated: %s row %s', email, existingRow);
    return PWN_buildIframeHtmlResponse_({
      ok: true,
      requestId: requestId,
      message: 'That email is already subscribed. We updated your preferences.'
    });
  }

  sheet.appendRow([
    nowIso,
    email,
    name,
    interest,
    sourcePage,
    formContext,
    params.pageUrl || '',
    params.pageTitle || '',
    params.timezone || '',
    params.userAgent || '',
    ''
  ]);
  console.log('Newsletter subscriber added: %s on sheet %s', email, sheet.getParent().getId());

  return PWN_buildIframeHtmlResponse_({
    ok: true,
    requestId: requestId,
    message: 'Thanks for signing up. You are on the list.'
  });
}

function PWN_buildPayload_(root) {
  const states = root.getChildren('StateProv');
  const normalized = [];
  const seenNational = {};

  states.forEach(function (state) {
    state.getChildren('game').forEach(function (game) {
      const item = PWN_normalizeGame_(state, game);
      if (item.type === 'national') {
        if (seenNational[item.name]) {
          return;
        }
        seenNational[item.name] = true;
      }
      normalized.push(item);
    });
  });

  const featured = [];
  const national = normalized.filter(function (item) {
    return item.type === 'national';
  });
  Array.prototype.push.apply(featured, national.slice(0, 3));

  Object.keys(PWN_FEATURED_STATES).forEach(function (stateId) {
    const match = normalized.find(function (item) {
      return item.stateId === stateId && item.type === 'state';
    });
    if (match) {
      featured.push(match);
    }
  });

  const featuredIds = {};
  featured.forEach(function (item) {
    featuredIds[item.id] = true;
  });

  normalized.forEach(function (item) {
    if (!featuredIds[item.id] && featured.length < 6) {
      featured.push(item);
      featuredIds[item.id] = true;
    }
  });

  const nationalCount = normalized.filter(function (item) {
    return item.type === 'national';
  }).length;
  const stateGameCount = normalized.filter(function (item) {
    return item.type === 'state';
  }).length;
  const gameNames = normalized.map(function (item) {
    return item.name;
  }).filter(function (name, index, array) {
    return array.indexOf(name) === index;
  }).sort();

  return {
    heroStats: [
      featured[0] ? 'Updated ' + featured[0].detailC[1] : 'Feed update pending',
      states.length + ' states tracked',
      normalized.length + ' active game records'
    ],
    results: normalized,
    featuredResults: featured.slice(0, 6),
    generatedFrom: PWN_FEED_URL,
    meta: {
      stateCount: states.length,
      resultCount: normalized.length,
      nationalCount: nationalCount,
      stateGameCount: stateGameCount,
      featuredCount: featured.slice(0, 6).length,
      gameNames: gameNames
    }
  };
}

function PWN_validatePayload_(payload) {
  const stateCount = payload.meta ? payload.meta.stateCount : 0;
  const resultCount = payload.meta ? payload.meta.resultCount : 0;

  if (stateCount < PWN_MIN_EXPECTED_STATES) {
    throw new Error('Feed validation failed: expected at least ' + PWN_MIN_EXPECTED_STATES + ' states but found ' + stateCount);
  }

  if (resultCount < PWN_MIN_EXPECTED_RESULTS) {
    throw new Error('Feed validation failed: expected at least ' + PWN_MIN_EXPECTED_RESULTS + ' results but found ' + resultCount);
  }

  if (!payload.results || !payload.results.length) {
    throw new Error('Feed validation failed: no results were parsed');
  }
}

function PWN_normalizeGame_(state, game) {
  const lastDrawNumbersText = PWN_getChildText_(game, 'lastdraw_numbers');
  const parsed = PWN_parseNumbers_(lastDrawNumbersText);
  const nextDraw = PWN_getChild_(game, 'nextdraw_date');
  const jackpot = PWN_getChild_(game, 'jackpot');
  const stateId = state.getAttribute('stateprov_id') ? state.getAttribute('stateprov_id').getValue() : '';
  const stateName = state.getAttribute('stateprov_name') ? state.getAttribute('stateprov_name').getValue() : '';
  const gameName = game.getAttribute('game_name') ? game.getAttribute('game_name').getValue() : 'Lottery Game';
  const gameId = game.getAttribute('game_id') ? game.getAttribute('game_id').getValue() : gameName;
  const gameType = PWN_NATIONAL_GAMES[gameName] ? 'national' : 'state';
  const tag = gameType === 'national' ? 'National draw' : stateName + ' game';

  let jackpotText = 'Rolling';
  if (jackpot && jackpot.getText()) {
    jackpotText = PWN_formatJackpot_(jackpot.getText());
  } else if (nextDraw && nextDraw.getAttribute('top_prize')) {
    jackpotText = PWN_formatJackpot_(nextDraw.getAttribute('top_prize').getValue());
  }

  let detailALabel = parsed.special ? 'Special' : 'Numbers';
  let detailAValue = parsed.special ? 'Included' : parsed.numbers.length + ' drawn';
  const powerPlayMatch = lastDrawNumbersText.match(/Power Play:\s*([0-9Xx]+)/i);

  if (powerPlayMatch) {
    detailALabel = 'Power Play';
    detailAValue = powerPlayMatch[1];
  } else if (/Mega Ball/i.test(lastDrawNumbersText)) {
    detailALabel = 'Bonus';
    detailAValue = 'Mega Ball';
  } else if (/Bonus/i.test(lastDrawNumbersText)) {
    detailALabel = 'Bonus';
    detailAValue = 'Included';
  }

  return {
    id: stateId.toLowerCase() + '-' + PWN_slugify_(gameId),
    type: gameType,
    name: gameName,
    state: stateName,
    stateId: stateId,
    tag: tag,
    jackpot: jackpotText,
    lastDraw: PWN_getChildText_(game, 'lastdraw_date') || 'TBD',
    numbers: parsed.numbers,
    special: parsed.special,
    detailA: [detailALabel, detailAValue],
    detailB: ['Next draw', nextDraw ? nextDraw.getText() : 'TBD'],
    detailC: ['Updated', PWN_getAttributeValue_(game, 'update_time') || 'Feed update pending']
  };
}

function PWN_parseNumbers_(text) {
  if (!text) {
    return { numbers: [], special: null };
  }

  let mainText = text;
  let special = null;

  if (text.indexOf(',') !== -1) {
    const segments = text.split(',').map(function (segment) {
      return segment.trim();
    });
    mainText = segments[0];

    segments.slice(1).forEach(function (segment) {
      if (special || segment.indexOf(':') === -1) {
        return;
      }

      const parts = segment.split(':');
      const label = parts[0].trim().toLowerCase();
      const value = parts.slice(1).join(':').trim();
      const match = value.match(/(\d{1,2})\s*$/);
      if (!match) {
        return;
      }

      if (label === 'powerball' || label === 'mega ball' || label === 'bonus') {
        special = ('0' + match[1]).slice(-2);
      }
    });
  }

  const numbers = (mainText.match(/\d{1,2}/g) || []).map(function (value) {
    return ('0' + value).slice(-2);
  });

  return {
    numbers: numbers,
    special: special
  };
}

function PWN_formatJackpot_(value) {
  if (!value) {
    return 'Rolling';
  }

  const parsed = parseInt(String(value).replace(/[^\d]/g, ''), 10);
  if (isNaN(parsed)) {
    return String(value);
  }

  if (parsed >= 1000000) {
    const trimmedMillions = parsed / 1000000;
    return '$' + (trimmedMillions % 1 === 0 ? trimmedMillions.toFixed(0) : trimmedMillions.toFixed(1)) + 'M';
  }

  if (parsed >= 1000) {
    const trimmedThousands = parsed / 1000;
    return '$' + (trimmedThousands % 1 === 0 ? trimmedThousands.toFixed(0) : trimmedThousands.toFixed(1)) + 'K';
  }

  return '$' + parsed;
}

function PWN_slugify_(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'game';
}

function PWN_getChild_(element, name) {
  const children = element.getChildren(name);
  return children.length ? children[0] : null;
}

function PWN_getChildText_(element, name) {
  const child = PWN_getChild_(element, name);
  return child ? child.getText().trim() : '';
}

function PWN_getAttributeValue_(element, name) {
  const attribute = element.getAttribute(name);
  return attribute ? attribute.getValue() : '';
}

function PWN_getRequestParameters_(e) {
  if (!e) {
    return {};
  }

  if (e.parameter) {
    return e.parameter;
  }

  if (e.parameters) {
    const params = {};
    Object.keys(e.parameters).forEach(function (key) {
      params[key] = Array.isArray(e.parameters[key]) ? e.parameters[key][0] : e.parameters[key];
    });
    return params;
  }

  return {};
}

function PWN_getOrCreateNewsletterSheet_() {
  if (!PWN_NEWSLETTER_SPREADSHEET_ID || PWN_NEWSLETTER_SPREADSHEET_ID === 'PASTE_YOUR_NEWSLETTER_SPREADSHEET_ID_HERE') {
    throw new Error('Set PWN_NEWSLETTER_SPREADSHEET_ID before using newsletter signup.');
  }

  const spreadsheet = SpreadsheetApp.openById(PWN_NEWSLETTER_SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(PWN_NEWSLETTER_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(PWN_NEWSLETTER_SHEET_NAME);
  }

  PWN_ensureNewsletterSheetHeaders_(sheet);
  return sheet;
}

function PWN_ensureNewsletterSheetHeaders_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, 11);
  const existingHeaders = headerRange.getValues()[0];
  const expectedHeaders = [
    'subscribed_at',
    'email',
    'name',
    'interest',
    'source_page',
    'form_context',
    'page_url',
    'page_title',
    'timezone',
    'user_agent',
    'updated_at'
  ];

  const headersMatch = expectedHeaders.every(function (header, index) {
    return existingHeaders[index] === header;
  });

  if (!headersMatch) {
    headerRange.setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
  }
}

function PWN_findSubscriberRow_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 0;
  }

  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (var index = 0; index < values.length; index += 1) {
    if (PWN_normalizeEmail_(values[index][0]) === email) {
      return index + 2;
    }
  }

  return 0;
}

function PWN_normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function PWN_isValidEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

function PWN_buildIframeHtmlResponse_(payload) {
  return HtmlService
    .createHtmlOutput(PWN_buildIframeResponseHtml_(payload))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function PWN_buildIframeResponseHtml_(payload) {
  const safePayload = {
    source: 'pickwinningnumbers-newsletter',
    ok: !!payload.ok,
    requestId: payload.requestId || '',
    message: payload.message || ''
  };

  return '<!DOCTYPE html><html><body><script>' +
    'window.top.postMessage(' + JSON.stringify(safePayload) + ', "*");' +
    '</script></body></html>';
}
