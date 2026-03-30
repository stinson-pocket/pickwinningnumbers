# Pick Winning Numbers

Static site build for the redesigned `pickwinningnumbers.com`.

## Current structure

- `index.html` - homepage
- `results.html` - results center
- `tips.html` - article/tips page
- `about.html` - project/about page
- `contact.html` - contact/signup page
- `styles.css` - shared styles
- `data.js` - fallback sample content for non-results sections
- `results-feed.js` - generated live results payload for the browser
- `feed-config.js` - remote feed configuration for Apps Script deployment
- `results-bootstrap.js` - optional remote feed loader with local fallback
- `app.js` - browser rendering logic
- `apps-script/` - Google Apps Script middle-layer source
- `HOSTINGER_PUBLISH_CHECKLIST.md` - upload checklist for going live

## Refresh the live results file

Run:

```bash
./scripts/update_results.sh
```

That pulls the XML feed and regenerates `results-feed.js`.

## Apps Script middle layer

This project now includes an Apps Script option so the website can load a cached, normalized feed instead of hitting the XML source directly from the browser.

See:

`APPS_SCRIPT_SETUP.md`

## Preview locally

Run:

```bash
./scripts/serve_preview.sh
```

Then open:

```text
http://127.0.0.1:4173
```

You can pass a different port if needed:

```bash
./scripts/serve_preview.sh 8080
```

## Automatic refresh on macOS

This project includes a LaunchAgent file:

`com.pickwinningnumbers.results-refresh.plist`

It is configured to refresh `results-feed.js` every 30 minutes and at login.

To install it for the current user:

```bash
mkdir -p ~/Library/LaunchAgents
cp com.pickwinningnumbers.results-refresh.plist ~/Library/LaunchAgents/
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.pickwinningnumbers.results-refresh.plist 2>/dev/null || true
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.pickwinningnumbers.results-refresh.plist
launchctl kickstart -k gui/$(id -u)/com.pickwinningnumbers.results-refresh
```

To check status:

```bash
launchctl print gui/$(id -u)/com.pickwinningnumbers.results-refresh
```

To remove it:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.pickwinningnumbers.results-refresh.plist
rm ~/Library/LaunchAgents/com.pickwinningnumbers.results-refresh.plist
```
