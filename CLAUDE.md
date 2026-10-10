# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chrome extension for filtering social media content. Currently supports X (formerly Twitter), Facebook, YouTube, and Reddit. Allows users to selectively hide UI elements like the "For you" tab, premium upsells, trending topics, recommended accounts, the Facebook news feed, the Facebook sidebars, YouTube Shorts, and Reddit's feeds and recommendations. It can also put a "why are you here?" gate in front of Reddit and YouTube.

## Architecture

### Manifest V3 Structure

- **manifest.json** - Extension configuration with permissions and content script definitions
- **content.js** - Content script injected into x.com, facebook.com, youtube.com, and www.reddit.com pages that performs DOM manipulation. Detects the platform via `window.location.hostname` and runs only that platform's filters (`runFilters()`).
- **options.html/options.js** - Settings page for users to configure which elements to hide

### Key Technical Approach

The extension uses:
- `chrome.storage.sync` API to persist user settings across devices
- DOM manipulation via `querySelector` and `style.display = 'none'` to hide elements
- `MutationObserver` to handle X's dynamic content loading (React-based SPA)
- Stable selectors (`data-testid`, `aria-label`, text content) instead of CSS classes

## Development Workflow

### Loading/Testing the Extension

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select this directory
4. After code changes, click the refresh icon on the extension card
5. Refresh x.com to see changes

### Testing Changes

- Open extension options (right-click extension icon → Options)
- Toggle checkboxes to enable/disable filters
- Click "Save Settings"
- Refresh x.com and verify elements are hidden/shown correctly
- Use Chrome DevTools Console to debug content script issues

## DOM Selectors Used (X/Twitter)

All selectors target stable attributes that are less likely to break with UI updates:

- **For you tab**: `a[role="tab"]` with text content "For you"
- **Home tab bar**: on `/home`, the `[role="tablist"]` inside `[data-testid="primaryColumn"]` that has a "Following" tab, hidden via its enclosing `nav` (auto-switch can still click the hidden tab)
- **Left sidebar (navigation)**: `header[role="banner"]`, hidden with `visibility: hidden` (not `display: none`) so the column keeps its width and the timeline doesn't jump left
- **Right sidebar column**: `[data-testid="sidebarColumn"]` — the entire right column. The "Hide right sidebar panes" option hides everything inside it except the search bar, covering the Premium upsell, trends, who-to-follow, ad/promoted panes, and footer links in one option (no per-pane selector needed).
- **Search bar (kept visible)**: `[data-testid="SearchBox_Search_Input"]`

## DOM Selectors Used (Facebook)

Facebook setting keys are prefixed with `fb` (e.g. `fbHideFeed`) to keep them distinct from X settings in the shared `chrome.storage.sync` namespace:

- **News feed ("the wall")**: `div.x1hc1fzr.x1unhpq9.x6o7n8i` (fallback `div[role="feed"]` — the home feed no longer has that role, only group feeds do) — only hidden on the home page (`/` or `/home.php`) so feeds on profiles/groups are unaffected
- **Stories tray**: `div.x193iq5w.xgmub6v.x1ceravr.x1v0nzow` (fallback `[data-pagelet="Stories"]`)
- **Left sidebar**: geometric detection — any `div[role="navigation"]` outside the banner/dialogs/right rail that renders as a tall (>30% viewport), narrow (<600px) column hugging the left edge (`rect.left < 100`). Avoids obfuscated class names and locale-dependent aria-labels. `[data-pagelet="LeftRail"]` is tried first in case Facebook restores it.
- **Right sidebar**: `[data-pagelet="RightRail"]`, falling back to `div[role="complementary"]` (the fallback is what currently matches)

Note: the obfuscated class combos are sourced from actively maintained filter lists (News Feed Eradicator's `src/sitelist/facebook.ts`, BevizLaszlo/UBlock-Filters-for-Social-Media). Facebook rotates these occasionally; if feed/stories hiding breaks, re-check those sources for the current combos.

## DOM Selectors Used (YouTube)

YouTube setting keys are prefixed with `yt` (e.g. `ytHideShorts`). Shorts are blocked on every page:

- **Shorts player**: any `/shorts/<id>` URL (direct load or SPA navigation) is redirected with `location.replace` to `/watch?v=<id>`
- **Shorts shelves**: `ytd-rich-shelf-renderer[is-shorts]` (hidden via its `ytd-rich-section-renderer` wrapper in grids), `ytd-reel-shelf-renderer`, and `grid-shelf-view-model` — the last is a generic shelf, so it's only hidden when it contains a `/shorts/` link
- **Individual Shorts**: `ytd-rich-item-renderer`, `ytd-video-renderer`, `ytd-grid-video-renderer`, `ytd-compact-video-renderer`, `yt-lockup-view-model`, `ytm-shorts-lockup-view-model(-v2)` containing `a[href^="/shorts/"]`. Visibility is re-evaluated each run because YouTube recycles these elements.
- **Navigation** (no `/shorts/` link to key on, so these match the "Shorts" label, which YouTube leaves untranslated in most locales): left menu `ytd-guide-entry-renderer` / `ytd-mini-guide-entry-renderer` (by `title`/`aria-label`/`href`), channel tab `yt-tab-shape[tab-title="Shorts"]`, search filter chip `yt-chip-cloud-chip-renderer` / `chip-view-model` by text

## DOM Selectors Used (Reddit)

Targets the current www.reddit.com UI ("shreddit", built from web components); old.reddit.com is not supported. Setting keys are prefixed with `rd`. Selectors come from News Feed Eradicator's `src/sitelist/reddit.ts` and BevizLaszlo/UBlock-Filters-for-Social-Media's `dist/reddit.txt`; re-check those if things break.

- **Feed pages**: detected by `shreddit-app[pagetype]` being `home`/`popular`/`all`/`explore`/`news`, or by path (`/`, `/best|hot|new|top|rising|controversial/`, `/r/popular`, `/r/all`, `/explore`, `/news`). On those pages `shreddit-feed`, `.main-container`, `#subgrid-container` and `#main-content` are hidden and tagged `data-smf-feed-hidden`, so they can be restored when Reddit navigates without a full page load.
- **Feed links in the left menu**: `a[href="/r/popular/"]`, `/r/all/`, `/explore/`, `/news/` inside a nav, hidden via their `li`/`faceplate-tracker`
- **Recommendations**: `faceplate-tracker[noun="discovery_unit"]` (suggested posts), `recent-posts`, `faceplate-tracker[noun="games_drawer"]`, `shreddit-gallery-carousel`, and trending searches (`#section_0_pipeline_1_trending_query` and its following siblings when logged in; `#search-dropdown-results-container > div:has(svg[icon-name="trend"])` and its following siblings when logged out)

- **Top bar**: `reddit-header-large`, `reddit-header-small`
- **Left sidebar** (nav when logged in, sign-up panel when logged out): `#left-sidebar-container`, `flex-left-nav-container`, `reddit-sidebar-nav`
- **Right sidebar** (community info, rules, ads): `#right-sidebar-container`, `#right-sidebar-contents`

- **Infinite-scroll limit** (`rdLimitFeed`, `rdFeedLimit`): counts `shreddit-post` inside each `shreddit-feed`, hides posts past the limit (via their `article` wrapper), and detaches the feed's `faceplate-partial` next-page loaders so Reddit stops fetching. A `data-smf-feed-limit` note after the feed offers "Show N more", which raises the limit and re-attaches the loaders once the already-loaded posts run out. The limit resets when the path changes.

## Entry Gate ("why are you here?")

`rdGate` / `ytGate` put a full-screen overlay in front of the site. You must type a reason (at least 10 characters), and a 5-second countdown must finish; it only counts down while the tab is visible. Passing stores an expiry time in `chrome.storage.local` under `gatePasses[site]` (local, not synced). The pass lasts `gateMinutes`, is shared across tabs via `chrome.storage.onChanged`, and the gate reappears when it expires. The overlay lives in a closed shadow root appended to `<html>`, so it can be shown at `document_start` before `<body>` exists. It's built with `createElement` (YouTube enforces Trusted Types, so `innerHTML` strings are rejected), stops key events from reaching site shortcuts, locks page scrolling, and pauses any `video`/`audio` while shown.

## Adding New Filters

To add a new element to hide:

1. Inspect the element on x.com to find a stable selector (prefer `data-testid` or `aria-label`)
2. Add checkbox to `options.html` with unique id
3. Add setting to both `options.js` functions (load and save)
4. Add setting to `content.js` storage.sync.get defaults
5. Create filter function in `content.js` using the selector
6. Call filter function from `runFilters()` in `content.js`, under the branch for the right platform

## Adding Support for Other Platforms

The extension is designed to support multiple social media platforms. To add a new platform:

1. Add host permissions in `manifest.json` (e.g., `*://instagram.com/*`)
2. Create platform-specific section in `options.html`
3. Inspect target platform's DOM to identify stable selectors
4. Add platform detection logic in `content.js` to apply appropriate filters
5. Consider creating separate content scripts per platform if logic becomes complex

## Known Limitations

- **Reply filtering not yet implemented** - The "hide non-author replies" feature requires more complex logic to distinguish reply authors
- **Selector fragility** - X may change their DOM structure or attributes in future updates, breaking selectors
- **SPA navigation** - MutationObserver handles most dynamic content, but some navigation events may require additional handling
- **Only X, Facebook, YouTube, and Reddit supported** - Other social media platforms not yet implemented
