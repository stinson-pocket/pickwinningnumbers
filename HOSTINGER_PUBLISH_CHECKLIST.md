# Hostinger Publish Checklist

Use this checklist when you are ready to replace the current site with the new build.

## Files to upload

Upload the full contents of:

`/Users/ianstinson/Library/CloudStorage/GoogleDrive-signup06@gmail.com/My Drive/aWebSites/PickWinningNumbers`

Key files include:

- `index.html`
- `results.html`
- `tips.html`
- `about.html`
- `contact.html`
- `powerball.html`
- `mega-millions.html`
- `styles.css`
- `app.js`
- `data.js`
- `feed-config.js`
- `results-bootstrap.js`
- `results-feed.js`
- `robots.txt`
- `sitemap.xml`
- `logo-from-user.png`
- `articles/` folder

Do not upload:

- `scripts/`
- `apps-script/`
- local log files
- preview images

## Before publishing

1. Confirm the Apps Script web app returns data:
   `.../exec?format=json`
2. Confirm `feed-config.js` points to the live Apps Script URL.
3. Confirm the local site preview still loads results.
4. Confirm the logo and article links still work.

## After publishing

1. Open the homepage on the live domain.
2. Open `results.html` on the live domain.
3. Open `powerball.html` and `mega-millions.html`.
4. Check browser dev tools for missing files or script errors.
5. Open the live `robots.txt`.
6. Open the live `sitemap.xml`.
7. Confirm the live site is showing current lottery data.

## Feed validation checks

The Apps Script feed now exposes status at:

`YOUR_WEB_APP_URL?format=json&view=status`

Check that:

- `ok` is `true`
- `generatedAt` is recent
- `stateCount` looks reasonable
- `resultCount` looks reasonable
- `gameNames` includes expected major games

## Notes

- The website will try the Apps Script feed first.
- If the remote feed fails, the local `results-feed.js` file still gives you a fallback.
- The Apps Script layer now validates the feed before replacing stored data, so a bad or partial XML response is less likely to wipe out good data.
