# Apps Script Feed Setup

This project supports a middle-layer lottery feed using Google Apps Script.

The recommended flow is:

1. Apps Script fetches the XML feed on a timer.
2. Apps Script normalizes and stores the payload in Script Properties.
3. Apps Script serves that stored payload as a JavaScript file.
4. The website loads that JavaScript file instead of hitting the XML feed directly.

## Files included here

- `apps-script/Code.gs`
- `apps-script/appsscript.json`
- `feed-config.js`
- `results-bootstrap.js`
- newsletter signup support inside `apps-script/Code.gs`

## What the site expects

The site can keep using the local `results-feed.js` file as a fallback.

When your Apps Script web app is deployed, set the web app URL in:

`feed-config.js`

Example:

```js
window.resultsFeedConfig = window.resultsFeedConfig || {
  remoteScriptUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?format=js"
};
```

Once that is in place, the site will:

- try the Apps Script feed first
- fall back to local `results-feed.js` if the remote feed is unavailable
- submit newsletter signups to the same Apps Script web app URL

## Recommended schedule

Start with:

- every 1 hour, 24/7

That is a good production baseline. If you want fresher updates later, we can move to:

- every 15 minutes during draw windows
- hourly at other times

## Apps Script deployment steps

1. Open `script.google.com`
2. Create a new Apps Script project
3. Replace the default `Code.gs` with the contents of `apps-script/Code.gs`
4. Add or replace `appsscript.json` with the contents of `apps-script/appsscript.json`
5. Save the project
6. Run `PWN_primeLotteryResults` once
7. Authorize the script when Google asks
8. Run `PWN_installHourlyTrigger` once
9. Deploy the project as a Web App
10. Set access so anyone with the web app URL can access it
11. Copy the deployed web app URL
12. Add `?format=js` to that URL and paste it into `feed-config.js`
13. Run `PWN_prepareNewsletterSheet()` once to create or confirm the newsletter spreadsheet

## Important Apps Script functions

- `PWN_primeLotteryResults()`
  Runs the fetch once and stores the first payload.

- `PWN_installHourlyTrigger()`
  Creates the hourly refresh trigger.

- `PWN_refreshLotteryResults()`
  Fetches XML, normalizes it, and updates stored payload.

- `doGet(e)`
  Serves the stored payload.
  Use `?format=js` for website use.
  Use `?format=json` for inspection/testing.
  Use `?format=json&view=status` for feed health/status.

- `doPost(e)`
  Accepts newsletter signups from the website and stores them in a Google Sheet.

- `PWN_prepareNewsletterSheet()`
  Creates the newsletter spreadsheet the first time and returns its URL.

## Example endpoints

JavaScript for the website:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?format=js
```

JSON for testing:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?format=json
```

Status view:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?format=json&view=status
```

## Notes

- The site does not need to talk to the XML feed directly anymore.
- The XML source is only hit by Apps Script on the schedule you choose.
- If the Apps Script feed is temporarily unavailable, the local fallback file still lets the site render.
- The Apps Script layer validates the feed before replacing stored data.
- If the source suddenly returns a suspiciously small or incomplete result set, the last good payload stays in place.
- Newsletter signups are posted to the same deployed Apps Script URL, with duplicate emails updated instead of added twice.
