// Content script that runs on X.com pages to hide elements based on user settings

// Load settings and apply filters
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
}, function(settings) {
  applyFilters(settings);
});

function applyFilters(settings) {
  // Function to hide "For you" tab
  function hideForYouTab() {
    // Strategy 1: Find tabs by role and text content
    const tabs = document.querySelectorAll('a[role="tab"], div[role="tab"]');
    tabs.forEach(tab => {
      const textContent = tab.textContent.trim();
      if (textContent === 'For you' || textContent === 'For You') {
        // Try hiding the tab itself
        tab.style.display = 'none';
        // Also try hiding parent presentation div
        const parentDiv = tab.closest('div[role="presentation"]');
        if (parentDiv) {
          parentDiv.style.display = 'none';
        }
        // Try hiding the parent list item if in a tablist
        const parentLi = tab.closest('li');
        if (parentLi) {
          parentLi.style.display = 'none';
        }
      }
    });

    // Strategy 2: Find by data-testid if available
    const forYouTab = document.querySelector('[data-testid="ScrollSnap-List"] a[href="/home"]');
    if (forYouTab && forYouTab.textContent.includes('For you')) {
      const parent = forYouTab.closest('div[role="presentation"]') || forYouTab.parentElement;
      if (parent) {
        parent.style.display = 'none';
      }
    }

    // Strategy 3: Look for tab in the home timeline header
    const tabList = document.querySelector('[role="tablist"]');
    if (tabList) {
      const allLinks = tabList.querySelectorAll('a');
      allLinks.forEach(link => {
        if (link.textContent.trim() === 'For you' || link.textContent.trim() === 'For You') {
          const container = link.closest('div[role="presentation"]') || link.parentElement;
          if (container) {
            container.style.display = 'none';
          }
        }
      });
    }
  }

  // Track if we've already switched to Following (to avoid repeated switches)
  let hasSwitchedToFollowing = false;
  let switchAttempts = 0;
  const MAX_SWITCH_ATTEMPTS = 20;

  // Function to auto-switch to "Following" tab
  function autoSwitchToFollowing() {
    // Only run on the home page
    if (window.location.pathname !== '/home') {
      return;
    }

    // Only switch once per page load
    if (hasSwitchedToFollowing) {
      return;
    }

    // Find the Following tab using multiple strategies
    let followingTab = null;

    // Strategy 1: Look in tablist
    const tabList = document.querySelector('[role="tablist"]');
    if (tabList) {
      const allLinks = tabList.querySelectorAll('a[role="tab"]');
      for (const link of allLinks) {
        const text = link.textContent.trim();
        if (text === 'Following') {
          followingTab = link;
          break;
        }
      }
    }

    // Strategy 2: Look for any tab-like element with "Following" text
    if (!followingTab) {
      const allTabs = document.querySelectorAll('a[role="tab"], div[role="tab"]');
      for (const tab of allTabs) {
        if (tab.textContent.trim() === 'Following') {
          followingTab = tab;
          break;
        }
      }
    }

    // Strategy 3: Look for navigation links in the header area
    if (!followingTab) {
      const navLinks = document.querySelectorAll('nav a, header a');
      for (const link of navLinks) {
        if (link.textContent.trim() === 'Following') {
          followingTab = link;
          break;
        }
      }
    }

    if (!followingTab) {
      // Tabs not loaded yet, will retry on next mutation
      switchAttempts++;
      if (switchAttempts < MAX_SWITCH_ATTEMPTS) {
        // Schedule a retry
        setTimeout(autoSwitchToFollowing, 200);
      }
      return;
    }

    // Check if Following tab is already selected
    const isSelected = followingTab.getAttribute('aria-selected') === 'true' ||
                       followingTab.closest('[aria-selected="true"]');
    if (isSelected) {
      hasSwitchedToFollowing = true;
      return;
    }

    // Click the Following tab
    followingTab.click();
    hasSwitchedToFollowing = true;
  }

  // Function to hide Premium subscription box
  function hidePremiumBox() {
    const premiumBox = document.querySelector('[data-testid="super-upsell-UpsellCardRenderProperties"]');
    if (premiumBox) {
      premiumBox.style.display = 'none';
      // Also hide parent container if it exists
      const parentContainer = premiumBox.closest('div.css-175oi2r.r-1ifxtd0');
      if (parentContainer) {
        parentContainer.style.display = 'none';
      }
    }
  }

  // Function to hide "What's happening" / Trending box
  function hideWhatsHappening() {
    const trendingBox = document.querySelector('[aria-label="Timeline: Trending now"]');
    if (trendingBox) {
      // Hide the parent section that contains the whole trending box
      const section = trendingBox.closest('section');
      if (section) {
        section.style.display = 'none';
        // Also hide the parent container
        const parentContainer = section.closest('div.css-175oi2r.r-14lw9ot');
        if (parentContainer) {
          parentContainer.style.display = 'none';
        }
      }
    }
  }

  // Function to hide "Who to follow" box
  function hideWhoToFollow() {
    const whoToFollowBox = document.querySelector('aside[aria-label="Who to follow"]');
    if (whoToFollowBox) {
      whoToFollowBox.style.display = 'none';
      // Also hide the parent container
      const parentContainer = whoToFollowBox.closest('div.css-175oi2r.r-14lw9ot');
      if (parentContainer) {
        parentContainer.style.display = 'none';
      }
    }
  }

  // Function to hide left sidebar
  function hideLeftSidebar() {
    // Target the inner container with navigation content
    const sidebarContent = document.querySelector('header[role="banner"] div.css-175oi2r.r-aqfbo4.r-1pi2tsx.r-1xcajam.r-ipm5af');
    if (sidebarContent) {
      sidebarContent.style.display = 'none';
    }
  }

  // Function to hide messages drawer
  function hideMessagesDrawer() {
    const messagesDrawer = document.querySelector('[data-testid="DMDrawer"]');
    if (messagesDrawer) {
      messagesDrawer.style.display = 'none';
    }
  }

  // Function to hide Grok button
  function hideGrokButton() {
    const grokButton = document.querySelector('[data-testid="GrokDrawerHeader"]');
    if (grokButton) {
      // Hide the parent container
      const grokContainer = grokButton.closest('div.css-175oi2r.r-105ug2t');
      if (grokContainer) {
        grokContainer.style.display = 'none';
      }
    }
  }

  // Function to hide bottom bar
  function hideBottomBar() {
    const bottomBar = document.querySelector('nav[aria-label="Footer"]');
    if (bottomBar) {
      bottomBar.style.display = 'none';
      // Also hide the parent container
      const parentContainer = bottomBar.closest('div.css-175oi2r.r-jxzhtn');
      if (parentContainer) {
        parentContainer.style.display = 'none';
      }
    }

    // Hide additional empty spacer divs associated with bottom bar
    const spacers = document.querySelectorAll('div.css-175oi2r.r-14lw9ot.r-jxzhtn.r-1867qdf.r-1phboty.r-rs99b7.r-1ifxtd0.r-1udh08x');
    spacers.forEach(spacer => {
      spacer.style.display = 'none';
    });
  }

  // Function to hide replies not in threads with the post author
  function hideNonAuthorReplies() {
    // Only run on post pages (URLs like /USERNAME/status/NUMBER)
    const pathname = window.location.pathname;
    const isPostPage = /^\/[^\/]+\/status\/\d+/.test(pathname);
    const isPhotoOverlay = pathname.includes('/photo/');

    if (!isPostPage) {
      // Restore any previously hidden tweets when not on a post page
      const hiddenTweets = document.querySelectorAll('article[data-testid="tweet"][style*="display: none"]');
      hiddenTweets.forEach(tweet => {
        tweet.style.display = '';
      });
      return;
    }

    // Determine the container to search within
    let container;
    if (isPhotoOverlay) {
      container = document.querySelector('div[role="dialog"]') ||
                  document.querySelector('div[aria-modal="true"]') ||
                  document.querySelector('[data-testid="mask"]')?.parentElement;

      if (!container) {
        return;
      }

      // Restore hidden tweets outside the overlay
      const allHiddenTweets = document.querySelectorAll('article[data-testid="tweet"][style*="display: none"]');
      allHiddenTweets.forEach(tweet => {
        if (!container.contains(tweet)) {
          tweet.style.display = '';
        }
      });
    } else {
      container = document;
    }

    // Get author username from URL (more reliable than DOM)
    const urlMatch = pathname.match(/^\/([^\/]+)\/status\/\d+/);
    const authorUsername = urlMatch ? urlMatch[1].toLowerCase() : null;

    if (!authorUsername) {
      return;
    }

    // Find all tweet articles
    const allTweets = container.querySelectorAll('article[data-testid="tweet"]');
    if (allTweets.length === 0) {
      return;
    }

    // Helper function to extract username from a tweet
    function getTweetUsername(tweet) {
      // Try multiple selectors for finding the username
      // Method 1: Look for user-name test id
      const userNameEl = tweet.querySelector('[data-testid="User-Name"]');
      if (userNameEl) {
        const usernameLink = userNameEl.querySelector('a[href^="/"]');
        if (usernameLink) {
          const href = usernameLink.getAttribute('href');
          const match = href.match(/^\/([^\/\?]+)/);
          if (match) return match[1].toLowerCase();
        }
      }

      // Method 2: Look for any profile link in the tweet header area
      const profileLinks = tweet.querySelectorAll('a[href^="/"][role="link"]');
      for (const link of profileLinks) {
        const href = link.getAttribute('href');
        // Skip status links, hashtags, etc
        if (href && !href.includes('/status/') && !href.includes('/hashtag/') &&
            !href.includes('/search') && !href.includes('/i/')) {
          const match = href.match(/^\/([^\/\?]+)/);
          if (match && match[1] !== 'home' && match[1] !== 'explore' && match[1] !== 'notifications') {
            return match[1].toLowerCase();
          }
        }
      }

      return null;
    }

    // Get the cell div for a tweet
    function getCellDiv(tweet) {
      return tweet.closest('[data-testid="cellInnerDiv"]');
    }

    // Find the main post - it's the tweet whose status ID matches the URL
    // The main post is typically the "focal" tweet that doesn't have a connector below it
    // pointing to another tweet in the parent thread
    let mainPostIndex = 0;
    const statusMatch = pathname.match(/\/status\/(\d+)/);
    const statusId = statusMatch ? statusMatch[1] : null;

    // Try to find the main post by looking for the status link
    if (statusId) {
      for (let i = 0; i < allTweets.length; i++) {
        const tweet = allTweets[i];
        const statusLink = tweet.querySelector(`a[href*="/status/${statusId}"]`);
        if (statusLink) {
          mainPostIndex = i;
          break;
        }
      }
    }

    // Tweets to keep visible
    const tweetsToShow = new Set();

    // Always show the main post
    tweetsToShow.add(allTweets[mainPostIndex]);

    // Show all parent context tweets (tweets before the main post - these are the thread context)
    for (let i = 0; i < mainPostIndex; i++) {
      tweetsToShow.add(allTweets[i]);
    }

    // For replies (tweets after the main post), only show:
    // 1. Tweets from the author
    // 2. The IMMEDIATE parent tweet that an author tweet is replying to

    // First, find all author tweets in the replies
    const authorTweetCells = [];
    for (let i = mainPostIndex + 1; i < allTweets.length; i++) {
      const tweet = allTweets[i];
      const tweetUsername = getTweetUsername(tweet);
      if (tweetUsername === authorUsername) {
        tweetsToShow.add(tweet);
        authorTweetCells.push({ tweet, index: i, cellDiv: getCellDiv(tweet) });
      }
    }

    // For each author tweet, find the immediate parent (the tweet they're replying to)
    // This is the tweet directly above in the visual thread
    authorTweetCells.forEach(({ cellDiv, index }) => {
      if (!cellDiv) return;

      // Look at the previous sibling cell to find the parent tweet
      let prevCell = cellDiv.previousElementSibling;

      // Skip non-tweet cells (like "Show replies" buttons)
      while (prevCell && !prevCell.querySelector('article[data-testid="tweet"]')) {
        prevCell = prevCell.previousElementSibling;
      }

      if (prevCell) {
        const parentTweet = prevCell.querySelector('article[data-testid="tweet"]');
        if (parentTweet) {
          // Only add if it's after the main post (it's a reply, not parent context)
          const parentIndex = Array.from(allTweets).indexOf(parentTweet);
          if (parentIndex > mainPostIndex) {
            tweetsToShow.add(parentTweet);
          }
        }
      }
    });

    // Apply visibility
    allTweets.forEach((tweet) => {
      if (tweetsToShow.has(tweet)) {
        tweet.style.display = '';
      } else {
        tweet.style.display = 'none';
      }
    });
  }

  // Observer to detect when DOM changes (X loads content dynamically)
  const observer = new MutationObserver(function(mutations) {
    if (settings.autoSwitchToFollowing) {
      autoSwitchToFollowing();
    }
    if (settings.hideForYouTab) {
      hideForYouTab();
    }
    if (settings.hidePremiumBox) {
      hidePremiumBox();
    }
    if (settings.hideWhatsHappening) {
      hideWhatsHappening();
    }
    if (settings.hideWhoToFollow) {
      hideWhoToFollow();
    }
    if (settings.hideLeftSidebar) {
      hideLeftSidebar();
    }
    if (settings.hideMessagesDrawer) {
      hideMessagesDrawer();
    }
    if (settings.hideGrokButton) {
      hideGrokButton();
    }
    if (settings.hideBottomBar) {
      hideBottomBar();
    }
    if (settings.hideNonAuthorReplies) {
      hideNonAuthorReplies();
    }
  });

  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Apply filters immediately on page load
  function applyFiltersNow() {
    if (settings.autoSwitchToFollowing) {
      autoSwitchToFollowing();
    }
    if (settings.hideForYouTab) {
      hideForYouTab();
    }
    if (settings.hidePremiumBox) {
      hidePremiumBox();
    }
    if (settings.hideWhatsHappening) {
      hideWhatsHappening();
    }
    if (settings.hideWhoToFollow) {
      hideWhoToFollow();
    }
    if (settings.hideLeftSidebar) {
      hideLeftSidebar();
    }
    if (settings.hideMessagesDrawer) {
      hideMessagesDrawer();
    }
    if (settings.hideGrokButton) {
      hideGrokButton();
    }
    if (settings.hideBottomBar) {
      hideBottomBar();
    }
    if (settings.hideNonAuthorReplies) {
      hideNonAuthorReplies();
    }
  }

  // Wait for DOM to be ready, then apply filters
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFiltersNow);
  } else {
    applyFiltersNow();
  }

  // Also apply after a short delay to catch dynamically loaded content
  setTimeout(applyFiltersNow, 1000);
  setTimeout(applyFiltersNow, 2000);
}
