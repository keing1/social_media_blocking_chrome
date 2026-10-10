// Background service worker: notices links opened from Inoreader so the
// content script can skip the "why are you here?" gate for them.
//
// Inoreader sends no referrer (it sets `<meta name="referrer" content="no-referrer">`),
// so a page opened from it can't tell where it came from by itself. Instead,
// when a tab opens a new tab, check whether the opener is on inoreader.com
// (readable thanks to the inoreader host permission) and remember the new tab
// for a short window. The content script asks about its own tab on load.
//
// The record lives in chrome.storage.session because MV3 service workers are
// shut down when idle and lose in-memory state.

const TRUSTED_SOURCES = ['inoreader.com'];
// Long enough to cover the page load plus any immediate redirect (e.g. a
// YouTube /shorts/ link being redirected to /watch), short enough that later
// browsing in the same tab isn't exempt.
const TRUSTED_WINDOW_MS = 15000;

function isTrustedUrl(url) {
  try {
    const host = new URL(url).hostname;
    return TRUSTED_SOURCES.some(function(domain) {
      return host === domain || host.endsWith('.' + domain);
    });
  } catch (e) {
    return false;
  }
}

chrome.webNavigation.onCreatedNavigationTarget.addListener(function(details) {
  chrome.tabs.get(details.sourceTabId, function(sourceTab) {
    if (chrome.runtime.lastError || !sourceTab || !isTrustedUrl(sourceTab.url)) {
      return;
    }
    chrome.storage.session.get({ trustedTabs: {} }, function(data) {
      data.trustedTabs[details.tabId] = Date.now() + TRUSTED_WINDOW_MS;
      chrome.storage.session.set({ trustedTabs: data.trustedTabs });
    });
  });
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  chrome.storage.session.get({ trustedTabs: {} }, function(data) {
    if (data.trustedTabs[tabId]) {
      delete data.trustedTabs[tabId];
      chrome.storage.session.set({ trustedTabs: data.trustedTabs });
    }
  });
});

// Content script asks: "was my tab just opened from a trusted source?"
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type !== 'openedFromTrustedSource' || !sender.tab) {
    return;
  }
  chrome.storage.session.get({ trustedTabs: {} }, function(data) {
    sendResponse((data.trustedTabs[sender.tab.id] || 0) > Date.now());
  });
  return true; // respond asynchronously
});
