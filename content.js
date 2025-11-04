// Content script that runs on X.com pages to hide elements based on user settings

// Load settings and apply filters
chrome.storage.sync.get({
  hideForYouTab: false,
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
    // Find all tab links within the tab list
    const tabs = document.querySelectorAll('a[role="tab"]');
    tabs.forEach(tab => {
      const span = tab.querySelector('span');
      if (span && span.textContent.trim() === 'For you') {
        // Hide the parent presentation div
        const parentDiv = tab.closest('div[role="presentation"]');
        if (parentDiv) {
          parentDiv.style.display = 'none';
        }
      }
    });
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
    // Should NOT run on home page (/home) or user pages (/USERNAME)
    const pathname = window.location.pathname;

    // Check if URL matches the pattern /USERNAME/status/NUMBER
    const isPostPage = /^\/[^\/]+\/status\/\d+/.test(pathname);

    // Check if this is a photo overlay (URL contains /photo/)
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
      // On photo overlay, only filter tweets within the overlay (dialog/modal)
      // The overlay is typically in a div with role="dialog" or a layer container
      container = document.querySelector('div[role="dialog"]') ||
                  document.querySelector('div[aria-modal="true"]') ||
                  document.querySelector('div[data-testid="modal-dialog"]');

      if (!container) {
        return; // No overlay found, don't filter anything
      }

      // Restore any hidden tweets in the background (outside the overlay)
      const allHiddenTweets = document.querySelectorAll('article[data-testid="tweet"][style*="display: none"]');
      allHiddenTweets.forEach(tweet => {
        // Only restore if the tweet is NOT inside the overlay container
        if (!container.contains(tweet)) {
          tweet.style.display = '';
        }
      });
    } else {
      // On regular post page, use the entire document
      container = document;
    }

    // Find the main post author's username
    // The first article with data-testid="tweet" is the main post
    const mainPost = container.querySelector('article[data-testid="tweet"]');
    if (!mainPost) {
      return;
    }

    // Extract the author's username from the main post
    // Look for the link to the author's profile in format /username
    const authorLink = mainPost.querySelector('a[href^="/"][role="link"]');
    if (!authorLink) {
      return;
    }

    const authorUsername = authorLink.getAttribute('href').split('/')[1].split('?')[0];
    if (!authorUsername) {
      return;
    }

    // Find all tweet articles (these include both the main post and all replies)
    // Only search within the determined container
    const allTweets = container.querySelectorAll('article[data-testid="tweet"]');

    // Create a map to track which tweets are part of author threads
    const tweetsInAuthorThreads = new Set();

    // First pass: identify all tweets from the author
    allTweets.forEach((tweet, index) => {
      if (index === 0) {
        return; // Skip the main post
      }

      const tweetAuthorLink = tweet.querySelector('a[href^="/"][role="link"]');
      if (!tweetAuthorLink) {
        return;
      }

      const tweetUsername = tweetAuthorLink.getAttribute('href').split('/')[1].split('?')[0];

      if (tweetUsername === authorUsername) {
        tweetsInAuthorThreads.add(tweet);
      }
    });

    // Second pass: for each author tweet, find the thread it's part of
    // by traversing both up (to find parent tweets) and down (to find continuation)
    tweetsInAuthorThreads.forEach(authorTweet => {
      // Look at the visual thread connector to find parent tweets
      // Check if there's a connecting line element before this tweet
      let currentElement = authorTweet.closest('div[data-testid="cellInnerDiv"]');

      // Traverse backwards to find connected tweets (parent tweets in the thread)
      let prevSibling = currentElement?.previousElementSibling;
      let checkCount = 0;

      while (prevSibling && checkCount < 10) {
        const prevTweet = prevSibling.querySelector('article[data-testid="tweet"]');

        if (prevTweet) {
          // Check if this previous tweet has a visual connector (thread line)
          // The connector is indicated by specific CSS classes or structure
          const hasConnector = prevTweet.querySelector('div.css-175oi2r.r-1bimlpy.r-f8sm7e.r-m5arl1');

          if (hasConnector || prevSibling.querySelector('div[class*="r-1bimlpy"]')) {
            // This tweet is visually connected to the thread
            tweetsInAuthorThreads.add(prevTweet);
          } else {
            // No visual connector, so this tweet is not part of the thread
            break;
          }
        }

        prevSibling = prevSibling.previousElementSibling;
        checkCount++;
      }

      // Traverse forwards to find connected tweets (replies in the thread continuation)
      let nextSibling = currentElement?.nextElementSibling;
      checkCount = 0;

      while (nextSibling && checkCount < 10) {
        const nextTweet = nextSibling.querySelector('article[data-testid="tweet"]');

        if (nextTweet) {
          // Check if the next tweet has a visual connector indicating it's part of the thread
          const hasConnector = nextTweet.querySelector('div.css-175oi2r.r-1bimlpy.r-f8sm7e.r-m5arl1');

          if (hasConnector || nextSibling.querySelector('div[class*="r-1bimlpy"]')) {
            // This tweet is visually connected to the thread
            tweetsInAuthorThreads.add(nextTweet);
          } else {
            // No visual connector, this might be a separate reply branch
            break;
          }
        }

        nextSibling = nextSibling.nextElementSibling;
        checkCount++;
      }
    });

    // Third pass: hide tweets not in author threads
    allTweets.forEach((tweet, index) => {
      if (index === 0) {
        return; // Skip the main post
      }

      const tweetAuthorLink = tweet.querySelector('a[href^="/"][role="link"]');
      if (!tweetAuthorLink) {
        return;
      }

      const tweetUsername = tweetAuthorLink.getAttribute('href').split('/')[1].split('?')[0];

      // Keep if from author or in author threads
      const isFromAuthor = tweetUsername === authorUsername;
      const isInAuthorThread = tweetsInAuthorThreads.has(tweet);

      if (!isFromAuthor && !isInAuthorThread) {
        tweet.style.display = 'none';
      }
    });
  }

  // Observer to detect when DOM changes (X loads content dynamically)
  const observer = new MutationObserver(function(mutations) {
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
