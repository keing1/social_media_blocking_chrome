// Load saved settings when the options page opens
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get({
    hideForYouTab: false,
    autoSwitchToFollowing: false,
    hidePremiumBox: false,
    hideWhatsHappening: false,
    hideWhoToFollow: false,
    hideLeftSidebar: false,
    hideMessagesDrawer: false,
    hideGrokButton: false,
    hideBottomBar: false,
    hideNonAuthorReplies: false
  }, function(items) {
    document.getElementById('hideForYouTab').checked = items.hideForYouTab;
    document.getElementById('autoSwitchToFollowing').checked = items.autoSwitchToFollowing;
    document.getElementById('hidePremiumBox').checked = items.hidePremiumBox;
    document.getElementById('hideWhatsHappening').checked = items.hideWhatsHappening;
    document.getElementById('hideWhoToFollow').checked = items.hideWhoToFollow;
    document.getElementById('hideLeftSidebar').checked = items.hideLeftSidebar;
    document.getElementById('hideMessagesDrawer').checked = items.hideMessagesDrawer;
    document.getElementById('hideGrokButton').checked = items.hideGrokButton;
    document.getElementById('hideBottomBar').checked = items.hideBottomBar;
    document.getElementById('hideNonAuthorReplies').checked = items.hideNonAuthorReplies;
  });
});

// Save settings when the save button is clicked
document.getElementById('save').addEventListener('click', function() {
  const settings = {
    hideForYouTab: document.getElementById('hideForYouTab').checked,
    autoSwitchToFollowing: document.getElementById('autoSwitchToFollowing').checked,
    hidePremiumBox: document.getElementById('hidePremiumBox').checked,
    hideWhatsHappening: document.getElementById('hideWhatsHappening').checked,
    hideWhoToFollow: document.getElementById('hideWhoToFollow').checked,
    hideLeftSidebar: document.getElementById('hideLeftSidebar').checked,
    hideMessagesDrawer: document.getElementById('hideMessagesDrawer').checked,
    hideGrokButton: document.getElementById('hideGrokButton').checked,
    hideBottomBar: document.getElementById('hideBottomBar').checked,
    hideNonAuthorReplies: document.getElementById('hideNonAuthorReplies').checked
  };

  chrome.storage.sync.set(settings, function() {
    // Show success message
    const status = document.getElementById('status');
    status.textContent = 'Settings saved! Refresh X.com to see changes.';
    status.className = 'status success show';

    // Hide the message after 3 seconds
    setTimeout(function() {
      status.className = 'status';
    }, 3000);
  });
});
