// Load saved settings when the options page opens
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get({
    hideForYouTab: false,
    autoSwitchToFollowing: false,
    hideHomeTabs: false,
    hideRightSidebar: false,
    hideLeftSidebar: false,
    hideMessagesDrawer: false,
    hideGrokButton: false,
    hideNonAuthorReplies: false,
    xGate: false,
    fbHideFeed: false,
    fbHideLeftSidebar: false,
    fbHideRightSidebar: false,
    ytHideShorts: false,
    ytGate: false,
    rdHideFeeds: false,
    rdHideRecommendations: false,
    rdGate: false,
    rdHideTopBar: false,
    rdHideLeftSidebar: false,
    rdHideRightSidebar: false,
    rdLimitFeed: false,
    rdFeedLimit: 25,
    gateMinutes: 30,
    gateSkipFromInoreader: true
  }, function(items) {
    document.getElementById('hideForYouTab').checked = items.hideForYouTab;
    document.getElementById('autoSwitchToFollowing').checked = items.autoSwitchToFollowing;
    document.getElementById('hideHomeTabs').checked = items.hideHomeTabs;
    document.getElementById('hideRightSidebar').checked = items.hideRightSidebar;
    document.getElementById('hideLeftSidebar').checked = items.hideLeftSidebar;
    document.getElementById('hideMessagesDrawer').checked = items.hideMessagesDrawer;
    document.getElementById('hideGrokButton').checked = items.hideGrokButton;
    document.getElementById('hideNonAuthorReplies').checked = items.hideNonAuthorReplies;
    document.getElementById('xGate').checked = items.xGate;
    document.getElementById('fbHideFeed').checked = items.fbHideFeed;
    document.getElementById('fbHideLeftSidebar').checked = items.fbHideLeftSidebar;
    document.getElementById('fbHideRightSidebar').checked = items.fbHideRightSidebar;
    document.getElementById('ytHideShorts').checked = items.ytHideShorts;
    document.getElementById('ytGate').checked = items.ytGate;
    document.getElementById('rdHideFeeds').checked = items.rdHideFeeds;
    document.getElementById('rdHideRecommendations').checked = items.rdHideRecommendations;
    document.getElementById('rdGate').checked = items.rdGate;
    document.getElementById('rdHideTopBar').checked = items.rdHideTopBar;
    document.getElementById('rdHideLeftSidebar').checked = items.rdHideLeftSidebar;
    document.getElementById('rdHideRightSidebar').checked = items.rdHideRightSidebar;
    document.getElementById('rdLimitFeed').checked = items.rdLimitFeed;
    document.getElementById('rdFeedLimit').value = items.rdFeedLimit;
    document.getElementById('gateMinutes').value = items.gateMinutes;
    document.getElementById('gateSkipFromInoreader').checked = items.gateSkipFromInoreader;
  });
});

// Save settings when the save button is clicked
document.getElementById('save').addEventListener('click', function() {
  const settings = {
    hideForYouTab: document.getElementById('hideForYouTab').checked,
    autoSwitchToFollowing: document.getElementById('autoSwitchToFollowing').checked,
    hideHomeTabs: document.getElementById('hideHomeTabs').checked,
    hideRightSidebar: document.getElementById('hideRightSidebar').checked,
    hideLeftSidebar: document.getElementById('hideLeftSidebar').checked,
    hideMessagesDrawer: document.getElementById('hideMessagesDrawer').checked,
    hideGrokButton: document.getElementById('hideGrokButton').checked,
    hideNonAuthorReplies: document.getElementById('hideNonAuthorReplies').checked,
    xGate: document.getElementById('xGate').checked,
    fbHideFeed: document.getElementById('fbHideFeed').checked,
    fbHideLeftSidebar: document.getElementById('fbHideLeftSidebar').checked,
    fbHideRightSidebar: document.getElementById('fbHideRightSidebar').checked,
    ytHideShorts: document.getElementById('ytHideShorts').checked,
    ytGate: document.getElementById('ytGate').checked,
    rdHideFeeds: document.getElementById('rdHideFeeds').checked,
    rdHideRecommendations: document.getElementById('rdHideRecommendations').checked,
    rdGate: document.getElementById('rdGate').checked,
    rdHideTopBar: document.getElementById('rdHideTopBar').checked,
    rdHideLeftSidebar: document.getElementById('rdHideLeftSidebar').checked,
    rdHideRightSidebar: document.getElementById('rdHideRightSidebar').checked,
    rdLimitFeed: document.getElementById('rdLimitFeed').checked,
    // Fall back to 25 posts if the box is empty or nonsensical
    rdFeedLimit: Math.max(5, parseInt(document.getElementById('rdFeedLimit').value, 10) || 25),
    // Fall back to 30 minutes if the box is empty or nonsensical
    gateMinutes: Math.max(1, parseInt(document.getElementById('gateMinutes').value, 10) || 30),
    gateSkipFromInoreader: document.getElementById('gateSkipFromInoreader').checked
  };

  chrome.storage.sync.set(settings, function() {
    // Show success message
    const status = document.getElementById('status');
    status.textContent = 'Settings saved! Refresh X.com, Facebook, YouTube, or Reddit to see changes.';
    status.className = 'status success show';

    // Hide the message after 3 seconds
    setTimeout(function() {
      status.className = 'status';
    }, 3000);
  });
});
