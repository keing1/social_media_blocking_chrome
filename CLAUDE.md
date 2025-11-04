# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chrome extension for filtering social media content. Designed to support multiple social media platforms, though currently only X (formerly Twitter) is implemented. Allows users to selectively hide UI elements like the "For you" tab, premium upsells, trending topics, and recommended accounts.

## Architecture

### Manifest V3 Structure

- **manifest.json** - Extension configuration with permissions and content script definitions
- **content.js** - Content script injected into x.com pages that performs DOM manipulation
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
- **Premium box**: `[data-testid="super-upsell-UpsellCardRenderProperties"]`
- **What's happening**: `[aria-label="Timeline: Trending now"]`
- **Who to follow**: `aside[aria-label="Who to follow"]`
- **Bottom bar**: `nav[aria-label="Footer"]`

## Adding New Filters

To add a new element to hide:

1. Inspect the element on x.com to find a stable selector (prefer `data-testid` or `aria-label`)
2. Add checkbox to `options.html` with unique id
3. Add setting to both `options.js` functions (load and save)
4. Add setting to `content.js` storage.sync.get defaults
5. Create filter function in `content.js` using the selector
6. Call filter function in both `observer` callback and `applyFiltersNow()`

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
- **Only X supported** - Other social media platforms not yet implemented
