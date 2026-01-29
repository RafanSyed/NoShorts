// content.js
(() => {
  const DEBUG = false;

  const log = (...args) => DEBUG && console.log("[NoShorts]", ...args);

  // Remove elements that are clearly Shorts-related
  function removeShorts() {
    // 1) Remove left nav "Shorts" entries
    // Desktop guide entries often have href="/shorts"
    document.querySelectorAll('a[href^="/shorts"]').forEach((a) => {
      // If it’s inside the left guide / mini-guide, remove the whole entry container
      const guideEntry =
        a.closest("ytd-guide-entry-renderer") ||
        a.closest("ytd-mini-guide-entry-renderer");

      if (guideEntry) {
        guideEntry.remove();
        return;
      }

      // Otherwise, if it’s a video tile linking to shorts, remove the tile/container
      const tile =
        a.closest("ytd-rich-item-renderer") ||
        a.closest("ytd-video-renderer") ||
        a.closest("ytd-grid-video-renderer") ||
        a.closest("ytd-compact-video-renderer") ||
        a.closest("ytd-reel-item-renderer");

      if (tile) {
        tile.remove();
        return;
      }
    });

    // 2) Remove Shorts shelves (common homepage shelf container)
    // The Shorts shelf is often ytd-rich-section-renderer or ytd-reel-shelf-renderer
    document.querySelectorAll("ytd-reel-shelf-renderer").forEach((el) => el.remove());

    // Some Shorts shelves appear as "rich-section" with internal shorts links
    document.querySelectorAll("ytd-rich-section-renderer").forEach((section) => {
      const hasShortsLink = section.querySelector('a[href^="/shorts/"], a[href="/shorts"]');
      if (hasShortsLink) section.remove();
    });

    // 3) If user directly navigates to /shorts, bounce them to home
    // (Optional but often desired)
    if (location.pathname.startsWith("/shorts")) {
      log("Redirecting away from /shorts");
      location.replace("https://www.youtube.com/");
    }
  }

  // Run repeatedly because YouTube is SPA + lazy-load
  let scheduled = false;
  const scheduleSweep = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      removeShorts();
    });
  };

  // Initial run
  scheduleSweep();

  // Observe DOM changes
  const observer = new MutationObserver(() => scheduleSweep());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Also re-run on navigation changes (YouTube SPA)
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleSweep();
    }
  }, 500);
})();
