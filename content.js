// Content script that runs on X.com, Facebook, YouTube, and Reddit pages to hide elements based on user settings

// Load settings (synced) and entry-gate passes (local to this device), then apply filters
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
}, function(settings) {
  chrome.storage.local.get({ gatePasses: {} }, function(local) {
    applyFilters(settings, local.gatePasses);
  });
});

function applyFilters(settings, gatePasses) {
  const isFacebook = window.location.hostname.endsWith('facebook.com');
  const isYouTube = window.location.hostname.endsWith('youtube.com');
  const isReddit = window.location.hostname.endsWith('reddit.com');
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

  // Function to hide the whole "For you / Following" tab bar on the home
  // page. Only the home tablist is touched (identified by its "Following"
  // tab), so tab bars on profiles, search, etc. stay. The tabs are still in
  // the DOM, so autoSwitchToFollowing can click them while they're hidden.
  function hideHomeTabs() {
    if (window.location.pathname !== '/home') {
      return;
    }
    document.querySelectorAll('[data-testid="primaryColumn"] [role="tablist"]').forEach(function(tabList) {
      const tabs = tabList.querySelectorAll('[role="tab"]');
      const isHomeTabs = Array.from(tabs).some(function(tab) {
        return tab.textContent.trim() === 'Following';
      });
      if (isHomeTabs) {
        const bar = tabList.closest('nav') || tabList;
        bar.style.display = 'none';
      }
    });
  }

  // Function to hide everything in the right sidebar column except the search bar.
  // This covers all the panes that appear there (Premium upsell, What's happening,
  // Who to follow, ad/promoted panes, the footer links, etc.) without needing a
  // selector for each one. It works by finding the search box and hiding every
  // branch of the sidebar that isn't an ancestor of it.
  function hideRightSidebar() {
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) {
      return;
    }

    // Locate the search input within the sidebar. Fall back through a few stable
    // selectors in case X changes the testid.
    const searchInput = sidebar.querySelector('[data-testid="SearchBox_Search_Input"]') ||
                        sidebar.querySelector('input[enterkeyhint="search"]') ||
                        sidebar.querySelector('[role="search"]');

    // If there's no search bar on this page, don't hide anything — better to leave
    // the sidebar intact than to guess and hide something we shouldn't.
    if (!searchInput) {
      return;
    }

    // The bits we keep are whole subtrees, never recursed into, so everything
    // inside them stays visible:
    //   1. The search component (the `role="search"` form), which also contains
    //      the magnifying-glass icon and clear button alongside the input.
    //   2. The typeahead dropdown that appears while typing. It renders as a
    //      sibling of the form (a `role="listbox"`), not a descendant, so it has
    //      to be preserved explicitly or it would be hidden as an "other" branch.
    const searchForm = searchInput.closest('[role="search"], form') || searchInput;
    const keep = [searchForm];
    sidebar.querySelectorAll('[role="listbox"]').forEach(function(listbox) {
      if (!searchForm.contains(listbox)) {
        keep.push(listbox);
      }
    });

    // Walk down from the sidebar. Keep any element we want to preserve as a whole
    // subtree, recurse through ancestors of those elements, and hide every other
    // branch entirely.
    function walk(el) {
      for (const child of el.children) {
        if (keep.indexOf(child) !== -1) {
          // A preserved subtree (search form or dropdown) — keep visible, stop.
          child.style.display = '';
        } else if (keep.some(function(k) { return child.contains(k); })) {
          // An ancestor of something we keep — stay visible, recurse to hide its
          // non-search siblings deeper down.
          child.style.display = '';
          walk(child);
        } else {
          // Not on the path to anything we keep — hide it.
          child.style.display = 'none';
        }
      }
    }
    walk(sidebar);
  }

  // Function to hide left sidebar
  // The whole left column is the `header[role="banner"]` landmark. Use
  // visibility rather than display so the column keeps its width and the
  // timeline doesn't shift left; hidden elements also can't be clicked.
  // (This used to target an inner div by X's generated class names, which
  // broke when X regenerated them.)
  function hideLeftSidebar() {
    const sidebar = document.querySelector('header[role="banner"]');
    if (sidebar) {
      sidebar.style.visibility = 'hidden';
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

  // ===== Facebook filters =====

  // Function to hide the news feed (the "wall") on the Facebook home page,
  // including the stories tray that sits above it. Only runs on the home page
  // so feeds on profiles, groups, etc. are left alone.
  //
  // Facebook's home feed no longer carries role="feed" (group feeds still do),
  // so the primary selectors are the obfuscated class combos of the feed and
  // stories containers. These are the same ones maintained filter lists
  // (News Feed Eradicator, uBlock social-media lists) currently use; if
  // Facebook rotates its class names they will need refreshing.
  function fbHideFeed() {
    const path = window.location.pathname;
    if (path !== '/' && path !== '/home.php') {
      return;
    }

    // The feed stream itself
    const feed = document.querySelector('div.x1hc1fzr.x1unhpq9.x6o7n8i') ||
                 document.querySelector('div[role="feed"]');
    if (feed) {
      feed.style.display = 'none';
    }

    // The stories/reels tray above the feed
    const stories = document.querySelector('div.x193iq5w.xgmub6v.x1ceravr.x1v0nzow') ||
                    document.querySelector('[data-pagelet="Stories"]');
    if (stories) {
      stories.style.display = 'none';
    }
  }

  // Function to hide the left sidebar (shortcuts: profile, groups, marketplace, etc.)
  // The left rail is a navigation landmark outside the top banner. Since its
  // class names are obfuscated and its aria-label is locale-dependent, identify
  // it geometrically: a tall, narrow navigation column hugging the left edge.
  function fbHideLeftSidebar() {
    // Old stable hook, kept in case Facebook brings it back
    const pagelet = document.querySelector('[data-pagelet="LeftRail"]');
    if (pagelet) {
      pagelet.style.display = 'none';
      return;
    }

    const banner = document.querySelector('div[role="banner"]');
    const navs = document.querySelectorAll('div[role="navigation"]');
    navs.forEach(function(nav) {
      // Skip the top bar's own navigation and anything inside overlays/right rail
      if (banner && banner.contains(nav)) {
        return;
      }
      if (nav.closest('[role="dialog"], [role="complementary"]')) {
        return;
      }

      const rect = nav.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return; // already hidden or not rendered yet
      }

      const onLeftEdge = rect.left < 100;
      const isColumn = rect.width < 600 && rect.height > window.innerHeight * 0.3;
      if (onLeftEdge && isColumn) {
        nav.style.display = 'none';
      }
    });
  }

  // Function to hide the right sidebar (contacts, birthdays, sponsored, group chats)
  function fbHideRightSidebar() {
    const rightRail = document.querySelector('[data-pagelet="RightRail"]') ||
                      document.querySelector('div[role="complementary"]');
    if (rightRail) {
      rightRail.style.display = 'none';
    }
  }

  // ===== YouTube filters =====

  // Function to block Shorts everywhere on YouTube. Shorts show up as:
  //   1. Dedicated Shorts shelves (a horizontal row of vertical thumbnails)
  //   2. Individual Shorts mixed in among regular videos (home, search,
  //      subscriptions, channel grids, the "up next" list beside a video)
  //   3. Navigation: the "Shorts" entry in the left menu, the channel "Shorts"
  //      tab, and the "Shorts" filter chip on search results
  //   4. The Shorts player itself (/shorts/<id>)
  // Content is identified by its links, which always point at /shorts/<id>,
  // rather than by "Shorts" text, which is locale-dependent. The navigation
  // entries carry no such link, so those fall back to the "Shorts" label
  // (YouTube keeps the brand name untranslated in most locales).
  function ytHideShorts() {
    // Opening a Short (directly or by SPA navigation) redirects to the regular
    // video player, which plays the same video without the endless swipe feed.
    const shortsMatch = window.location.pathname.match(/^\/shorts\/([^\/?#]+)/);
    if (shortsMatch) {
      window.location.replace('/watch?v=' + shortsMatch[1]);
      return;
    }

    const shortsLink = 'a[href^="/shorts/"]';

    // Shorts shelves. `is-shorts` / reel shelves are Shorts-only; the newer
    // grid-shelf-view-model is a generic shelf, so only hide it when it
    // actually contains Shorts.
    document.querySelectorAll('ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer, grid-shelf-view-model').forEach(function(shelf) {
      if (shelf.tagName === 'GRID-SHELF-VIEW-MODEL' && !shelf.querySelector(shortsLink)) {
        return;
      }
      // In grid layouts the shelf is wrapped in a full-width section row
      const container = shelf.closest('ytd-rich-section-renderer') || shelf;
      container.style.display = 'none';
    });

    // Individual Shorts in video grids and lists. YouTube recycles these
    // elements when the content changes (e.g. picking a filter chip), so also
    // un-hide any that no longer hold a Short.
    const itemSelector = [
      'ytd-rich-item-renderer',       // home, subscriptions, channel grids
      'ytd-video-renderer',           // search results
      'ytd-grid-video-renderer',      // older channel grids
      'ytd-compact-video-renderer',   // "up next" beside a video (older layout)
      'yt-lockup-view-model',         // "up next" beside a video (newer layout)
      'ytm-shorts-lockup-view-model',
      'ytm-shorts-lockup-view-model-v2'
    ].join(', ');
    document.querySelectorAll(itemSelector).forEach(function(item) {
      item.style.display = item.querySelector(shortsLink) ? 'none' : '';
    });

    // "Shorts" entry in the expanded and collapsed left menu
    document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer').forEach(function(entry) {
      const link = entry.querySelector('a');
      const isShorts = entry.getAttribute('aria-label') === 'Shorts' ||
                       (link && (link.getAttribute('title') === 'Shorts' ||
                                 (link.getAttribute('href') || '').startsWith('/shorts')));
      if (isShorts) {
        entry.style.display = 'none';
      }
    });

    // "Shorts" tab on channel pages
    document.querySelectorAll('yt-tab-shape[tab-title="Shorts"]').forEach(function(tab) {
      tab.style.display = 'none';
    });

    // "Shorts" filter chip on search results
    document.querySelectorAll('yt-chip-cloud-chip-renderer, chip-view-model').forEach(function(chip) {
      if (chip.textContent.trim() === 'Shorts') {
        chip.style.display = 'none';
      }
    });
  }

  // ===== Reddit filters =====

  // Feed pages: the front page (and its sort variants), r/popular, r/all,
  // Explore and News. Subreddits and individual posts are left alone.
  const RD_FEED_PAGETYPES = ['home', 'popular', 'all', 'explore', 'news'];
  function rdIsFeedPage() {
    const app = document.querySelector('shreddit-app');
    if (app && RD_FEED_PAGETYPES.indexOf(app.getAttribute('pagetype')) !== -1) {
      return true;
    }
    const path = window.location.pathname;
    return /^\/(best|hot|new|top|rising|controversial)?\/?$/.test(path) ||
           /^\/r\/(popular|all)(\/|$)/.test(path) ||
           /^\/(explore|news)(\/|$)/.test(path);
  }

  // Function to block Reddit's open-ended feeds. Hides the feed area on feed
  // pages and removes the left-menu links to Popular / All / Explore / News.
  // Selectors come from maintained filter lists (BevizLaszlo/UBlock-Filters-
  // for-Social-Media, News Feed Eradicator). Reddit sometimes navigates
  // without a full page load and reuses containers, so hidden elements are
  // tagged and restored when leaving a feed page.
  function rdHideFeeds() {
    if (rdIsFeedPage()) {
      document.querySelectorAll('shreddit-feed, .main-container, #subgrid-container, #main-content').forEach(function(el) {
        el.style.display = 'none';
        el.dataset.smfFeedHidden = '1';
      });
    } else {
      document.querySelectorAll('[data-smf-feed-hidden]').forEach(function(el) {
        el.style.display = '';
        delete el.dataset.smfFeedHidden;
      });
    }

    document.querySelectorAll('a[href="/r/popular/"], a[href="/r/all/"], a[href="/explore/"], a[href="/news/"]').forEach(function(link) {
      if (!link.closest('reddit-sidebar-nav, nav, [role="navigation"]')) {
        return; // only menu entries, not links inside posts/comments
      }
      const entry = link.closest('li') || link.closest('faceplate-tracker') || link;
      entry.style.display = 'none';
    });
  }

  // Function to hide Reddit's recommendation surfaces: suggested posts beside
  // a post, recently viewed posts, trending searches in the search dropdown,
  // the games drawer, and the popular-posts carousel.
  function rdHideRecommendations() {
    const selectors = [
      'faceplate-tracker[noun="discovery_unit"]',     // suggested posts (right side of a post)
      'recent-posts',                                 // recently viewed
      'faceplate-tracker[noun="games_drawer"]',       // games on Reddit
      'faceplate-tracker[noun="games_drawer"] + hr',
      'shreddit-gallery-carousel',                    // popular-posts carousel
      // Trending searches in the search dropdown (logged in / logged out)
      '#section_0_pipeline_1_trending_query',
      '#section_0_pipeline_1_trending_query ~ *',
      '#search-dropdown-results-container > div:has(svg[icon-name="trend"])',
      '#search-dropdown-results-container > div:has(svg[icon-name="trend"]) ~ *'
    ].join(', ');
    document.querySelectorAll(selectors).forEach(function(el) {
      el.style.display = 'none';
    });
  }

  // Infinite-scroll limit. Feeds (subreddits, profiles) show `rdFeedLimit`
  // posts, then end with a "Show N more" button, so loading more is a choice
  // rather than something scrolling does for you. Posts past the limit are
  // hidden, and the feed's "load next page" placeholders (faceplate-partial)
  // are detached so Reddit stops fetching in the background; they're put
  // back when the hidden buffer runs out. The limit resets on each page.
  let rdLimit = settings.rdFeedLimit;
  let rdLimitPath = window.location.pathname;
  const rdDetachedLoaders = [];

  function rdLimitFeed() {
    if (window.location.pathname !== rdLimitPath) {
      rdLimitPath = window.location.pathname;
      rdLimit = settings.rdFeedLimit;
      rdDetachedLoaders.length = 0;
    }

    document.querySelectorAll('shreddit-feed').forEach(function(feed) {
      const posts = feed.querySelectorAll('shreddit-post');
      posts.forEach(function(post, i) {
        const item = post.closest('article') || post;
        item.style.display = i < rdLimit ? '' : 'none';
      });

      const atLimit = posts.length >= rdLimit;
      if (atLimit) {
        feed.querySelectorAll('faceplate-partial').forEach(function(loader) {
          rdDetachedLoaders.push({ loader: loader, parent: loader.parentNode, next: loader.nextSibling });
          loader.remove();
        });
      }

      // End-of-feed note with a button to deliberately load the next batch
      let note = feed.nextElementSibling;
      if (!note || !note.dataset.smfFeedLimit) {
        note = document.createElement('div');
        note.dataset.smfFeedLimit = '1';
        note.style.cssText = 'padding: 24px 16px; text-align: center; font-size: 14px; opacity: 0.8;';
        const text = document.createElement('div');
        text.style.marginBottom = '12px';
        const button = document.createElement('button');
        button.style.cssText = 'padding: 8px 16px; border-radius: 20px; border: 1px solid currentColor; background: none; color: inherit; font: inherit; cursor: pointer;';
        button.addEventListener('click', function() {
          rdLimit += settings.rdFeedLimit;
          // Restore the page loaders if we've run out of already-loaded posts
          if (feed.querySelectorAll('shreddit-post').length < rdLimit) {
            rdDetachedLoaders.splice(0).forEach(function(saved) {
              if (saved.parent && saved.parent.isConnected) {
                saved.parent.insertBefore(saved.loader, saved.next && saved.next.parentNode === saved.parent ? saved.next : null);
              }
            });
          }
          runFilters();
        });
        note.append(text, button);
        feed.after(note);
      }
      note.style.display = atLimit ? '' : 'none';
      // Only touch the text when it changes: replacing text nodes is itself a
      // DOM mutation and would retrigger the observer in an endless loop
      const message = 'You\'ve seen ' + rdLimit + ' posts.';
      const label = 'Show ' + settings.rdFeedLimit + ' more';
      if (note.firstChild.textContent !== message) {
        note.firstChild.textContent = message;
      }
      if (note.lastChild.textContent !== label) {
        note.lastChild.textContent = label;
      }
    });
  }

  // Reddit page chrome. Tag names / ids are from the current www.reddit.com
  // ("shreddit") layout and the maintained filter lists cited in CLAUDE.md.

  // Function to hide the top bar (logo, search, sign-in / profile buttons)
  function rdHideTopBar() {
    document.querySelectorAll('reddit-header-large, reddit-header-small').forEach(function(el) {
      el.style.display = 'none';
    });
  }

  // Function to hide the left sidebar (navigation when logged in, the
  // sign-up panel when logged out)
  function rdHideLeftSidebar() {
    document.querySelectorAll('#left-sidebar-container, flex-left-nav-container, reddit-sidebar-nav').forEach(function(el) {
      el.style.display = 'none';
    });
  }

  // Function to hide the right sidebar (community info, rules, ads)
  function rdHideRightSidebar() {
    document.querySelectorAll('#right-sidebar-container, #right-sidebar-contents').forEach(function(el) {
      el.style.display = 'none';
    });
  }

  // ===== Entry gate (Reddit, YouTube, X) =====

  // Before using a gated site you have to type why you're there and wait out
  // a countdown. Passing grants access for `gateMinutes`, shared across tabs
  // via chrome.storage.local; when it runs out the gate comes back. The gate
  // lives in a shadow root so the site's CSS can't restyle it, and the page
  // underneath is frozen (no scrolling, media paused) while it's up.
  const GATE_SECONDS = 5;
  const GATE_MIN_REASON_LENGTH = 10;
  const isX = !isFacebook && !isYouTube && !isReddit;
  const gateSite = isReddit ? 'reddit' : isYouTube ? 'youtube' : isX ? 'x' : null;
  const gateEnabled = (isReddit && settings.rdGate) || (isYouTube && settings.ytGate) || (isX && settings.xGate);
  let gateHost = null;
  let gateExpiryTimer = null;
  let savedOverflow = '';

  function gatePassed() {
    return (gatePasses[gateSite] || 0) > Date.now();
  }

  // Pages opened from Inoreader (the RSS reader) skip the gate, but only the
  // page you landed on: navigating elsewhere in the tab brings the gate back.
  // YouTube keeps the video id in the query (/watch?v=…), so it's part of the
  // page identity. Detection uses the referrer when there is one, otherwise
  // asks background.js whether Inoreader opened this tab (Inoreader normally
  // sends no referrer). The gate is held back until that answer arrives so it
  // doesn't flash up and vanish.
  function currentPageKey() {
    return window.location.pathname + '|' + (new URLSearchParams(window.location.search).get('v') || '');
  }
  let gateBypassKey = null;
  let gateBypassChecked = !(gateEnabled && settings.gateSkipFromInoreader);

  function gateBypassed() {
    return gateBypassKey !== null && currentPageKey() === gateBypassKey;
  }

  if (!gateBypassChecked) {
    const landingKey = currentPageKey();
    let referrerHost = '';
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : '';
    } catch (e) {}

    if (referrerHost === 'inoreader.com' || referrerHost.endsWith('.inoreader.com')) {
      gateBypassKey = landingKey;
      gateBypassChecked = true;
    } else {
      const finishCheck = function(trusted) {
        if (gateBypassChecked) {
          return;
        }
        if (trusted) {
          gateBypassKey = landingKey;
        }
        gateBypassChecked = true;
        runFilters();
      };
      chrome.runtime.sendMessage({ type: 'openedFromTrustedSource' }, function(trusted) {
        // lastError is set if the background worker couldn't answer
        finishCheck(!chrome.runtime.lastError && trusted === true);
      });
      // Don't hold the gate back forever if the answer never comes
      setTimeout(function() { finishCheck(false); }, 1000);
    }
  }

  // Re-check when the current pass runs out, even if the page is idle
  function scheduleGateExpiry() {
    clearTimeout(gateExpiryTimer);
    const remaining = (gatePasses[gateSite] || 0) - Date.now();
    if (remaining > 0) {
      gateExpiryTimer = setTimeout(runFilters, remaining + 100);
    }
  }

  function showGate() {
    if (gateHost && gateHost.isConnected) {
      return;
    }
    // If the site's own code tore our overlay out of the page, rebuild it
    if (gateHost) {
      hideGate();
    }

    gateHost = document.createElement('div');
    // Keep the site's keyboard shortcuts (e.g. YouTube's k/f/space) from
    // reacting to typing in the gate
    ['keydown', 'keypress', 'keyup'].forEach(function(type) {
      gateHost.addEventListener(type, function(e) { e.stopPropagation(); });
    });

    const root = gateHost.attachShadow({ mode: 'closed' });
    const siteName = isReddit ? 'Reddit' : isYouTube ? 'YouTube' : 'X';
    // Built with createElement rather than innerHTML: YouTube enforces Trusted
    // Types, which rejects plain-string innerHTML assignments
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .overlay {
        position: fixed; inset: 0; z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        background: #0f1419; color: #e7e9ea;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      form { width: min(480px, calc(100vw - 32px)); }
      h1 { font-size: 24px; margin: 0 0 8px; }
      p { margin: 0 0 16px; color: #8b98a5; font-size: 15px; }
      textarea {
        box-sizing: border-box; width: 100%; min-height: 90px; padding: 12px;
        font: inherit; font-size: 16px; color: inherit; background: #1e2732;
        border: 1px solid #38444d; border-radius: 8px; resize: vertical;
      }
      textarea:focus { outline: 2px solid #1da1f2; border-color: transparent; }
      button {
        margin-top: 12px; width: 100%; padding: 12px; font: inherit; font-weight: bold;
        color: white; background: #1da1f2; border: none; border-radius: 20px; cursor: pointer;
      }
      button:disabled { background: #38444d; color: #8b98a5; cursor: not-allowed; }`;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const form = document.createElement('form');
    const heading = document.createElement('h1');
    heading.textContent = 'Why are you opening ' + siteName + '?';
    const hint = document.createElement('p');
    hint.textContent = 'Write down what you came here to do.';
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'I\'m here to…';
    const button = document.createElement('button');
    button.type = 'submit';
    form.append(heading, hint, textarea, button);
    overlay.appendChild(form);
    root.append(style, overlay);

    // Clicking anywhere on the gate puts the cursor back in the text box, in
    // case the site grabbed focus while loading
    overlay.addEventListener('mousedown', function(e) {
      if (e.target === overlay) {
        e.preventDefault();
        textarea.focus();
      }
    });

    let secondsLeft = GATE_SECONDS;

    function reasonOk() {
      return textarea.value.trim().length >= GATE_MIN_REASON_LENGTH;
    }
    function updateButton() {
      if (secondsLeft > 0) {
        button.textContent = 'Continue in ' + secondsLeft + 's';
      } else if (!reasonOk()) {
        button.textContent = 'Write a bit more to continue';
      } else {
        button.textContent = 'Continue to ' + siteName;
      }
      button.disabled = secondsLeft > 0 || !reasonOk();
    }

    // The countdown only runs while the tab is visible, so it can't be waited
    // out in a background tab
    const countdown = setInterval(function() {
      if (document.hidden) {
        return;
      }
      secondsLeft--;
      updateButton();
      if (secondsLeft <= 0) {
        clearInterval(countdown);
      }
    }, 1000);

    textarea.addEventListener('input', updateButton);
    // Enter submits; Shift+Enter adds a new line
    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!button.disabled) {
          form.requestSubmit();
        }
      }
    });
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      if (button.disabled) {
        return;
      }
      clearInterval(countdown);
      gatePasses[gateSite] = Date.now() + settings.gateMinutes * 60 * 1000;
      chrome.storage.local.set({ gatePasses: gatePasses });
      hideGate();
      scheduleGateExpiry();
      runFilters();
    });

    updateButton();
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.appendChild(gateHost);
    textarea.focus();
  }

  function hideGate() {
    if (!gateHost) {
      return;
    }
    gateHost.remove();
    gateHost = null;
    document.documentElement.style.overflow = savedOverflow;
  }

  // Returns true while the gate is blocking the page
  function enforceGate() {
    if (!gateBypassChecked) {
      return false; // still finding out whether this page came from Inoreader
    }
    if (!gateEnabled || gatePassed() || gateBypassed()) {
      hideGate();
      return false;
    }
    showGate();
    // Keep anything behind the gate from playing (YouTube autoplay, Reddit videos)
    document.querySelectorAll('video, audio').forEach(function(media) {
      if (!media.paused) {
        media.pause();
      }
    });
    return true;
  }

  // Passing the gate in one tab lets the other open tabs through too
  if (gateEnabled) {
    chrome.storage.onChanged.addListener(function(changes, area) {
      if (area === 'local' && changes.gatePasses) {
        gatePasses = changes.gatePasses.newValue || {};
        scheduleGateExpiry();
        runFilters();
      }
    });
    scheduleGateExpiry();
  }

  // Run the filters that apply to the current platform
  function runFilters() {
    enforceGate();

    if (isReddit) {
      if (settings.rdHideFeeds) {
        rdHideFeeds();
      }
      if (settings.rdHideRecommendations) {
        rdHideRecommendations();
      }
      if (settings.rdHideTopBar) {
        rdHideTopBar();
      }
      if (settings.rdHideLeftSidebar) {
        rdHideLeftSidebar();
      }
      if (settings.rdHideRightSidebar) {
        rdHideRightSidebar();
      }
      if (settings.rdLimitFeed) {
        rdLimitFeed();
      }
      return;
    }

    if (isYouTube) {
      if (settings.ytHideShorts) {
        ytHideShorts();
      }
      return;
    }

    if (isFacebook) {
      if (settings.fbHideFeed) {
        fbHideFeed();
      }
      if (settings.fbHideLeftSidebar) {
        fbHideLeftSidebar();
      }
      if (settings.fbHideRightSidebar) {
        fbHideRightSidebar();
      }
      return;
    }

    if (settings.autoSwitchToFollowing) {
      autoSwitchToFollowing();
    }
    if (settings.hideForYouTab) {
      hideForYouTab();
    }
    if (settings.hideHomeTabs) {
      hideHomeTabs();
    }
    if (settings.hideRightSidebar) {
      hideRightSidebar();
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
    if (settings.hideNonAuthorReplies) {
      hideNonAuthorReplies();
    }
  }

  // Observer to detect when DOM changes (all supported sites load content dynamically)
  const observer = new MutationObserver(function(mutations) {
    runFilters();
  });

  // Start observing the document. Observe the root element rather than
  // document.body: this script runs at document_start, and on large pages like
  // YouTube the settings can load before <body> exists, in which case
  // observing document.body (null) throws and no filters ever run.
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Apply filters immediately on page load
  function applyFiltersNow() {
    runFilters();
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
