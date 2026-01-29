(() => {
  const SETTINGS = {
    useIntentGateOnHome: true,
    allowContinueAnyway: true,
    gateTitle: "Pause for 3 seconds.",
    gateBody: "Use YouTube intentionally: search for exactly what you need, or go to Subscriptions.",
  };

  // Prevent gate from reappearing after you dismiss/continue on the same URL
  let gateDismissedForUrl = null;
  const dismissGateForCurrentUrl = () => (gateDismissedForUrl = location.href);
  const isGateDismissedForCurrentUrl = () => gateDismissedForUrl === location.href;

  const isYouTubeHome = () => location.pathname === "/";

  // --- Force search filter to Videos only (removes Shorts from search results)
  function enforceVideoSearchFilter() {
    if (location.pathname !== "/results") return;

    const url = new URL(location.href);
    const q = url.searchParams.get("search_query");
    if (!q) return;

    // "Videos" filter param on YouTube search
    const VIDEOS_SP = "EgIQAQ%3D%3D";

    if (url.searchParams.get("sp") === VIDEOS_SP) return;

    url.searchParams.set("sp", VIDEOS_SP);
    location.replace(url.toString());
  }

  // --- Remove Shorts UI/content
  function removeShorts() {
    // Remove direct Shorts links & their containers
    document.querySelectorAll('a[href^="/shorts/"], a[href="/shorts"]').forEach((a) => {
      // Left nav entries
      const guideEntry =
        a.closest("ytd-guide-entry-renderer") ||
        a.closest("ytd-mini-guide-entry-renderer");
      if (guideEntry) {
        guideEntry.remove();
        return;
      }

      // Remove only tile-level renderers (safe)
      const tile =
        a.closest("ytd-rich-item-renderer") ||
        a.closest("ytd-video-renderer") ||
        a.closest("ytd-grid-video-renderer") ||
        a.closest("ytd-compact-video-renderer") ||
        a.closest("ytd-reel-item-renderer");

      if (tile) tile.remove();
    });

    // Remove Shorts shelves (these show up on home/search sometimes)
    document
      .querySelectorAll("ytd-reel-shelf-renderer, ytd-reel-item-renderer")
      .forEach((el) => el.remove());

    // Remove shelves/sections whose header is exactly "Shorts"
    document.querySelectorAll("ytd-shelf-renderer, ytd-rich-section-renderer").forEach((el) => {
      const titleEl =
        el.querySelector("#title") ||
        el.querySelector("h2") ||
        el.querySelector("yt-formatted-string");

      const title = (titleEl?.textContent || "").trim().toLowerCase();
      if (title === "shorts") el.remove();
    });

    // If user navigates to /shorts directly, bounce to home
    if (location.pathname.startsWith("/shorts")) {
      location.replace("https://www.youtube.com/");
    }
  }

  // --- Intent gate on Home
  function ensureIntentGate() {
    if (!SETTINGS.useIntentGateOnHome) return;
    if (!isYouTubeHome()) return;
    if (isGateDismissedForCurrentUrl()) return;
    if (document.getElementById("focus-intent-gate")) return;

    const overlay = document.createElement("div");
    overlay.id = "focus-intent-gate";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "1000000",
      background: "rgba(0,0,0,0.88)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "18px",
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      width: "min(520px, 92vw)",
      borderRadius: "16px",
      padding: "18px",
      background: "rgba(20,20,20,0.95)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.12)",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    });

    const title = document.createElement("div");
    title.textContent = SETTINGS.gateTitle;
    Object.assign(title.style, { fontSize: "18px", fontWeight: "700", marginBottom: "8px" });

    const body = document.createElement("div");
    body.textContent = SETTINGS.gateBody;
    Object.assign(body.style, { fontSize: "14px", opacity: "0.9", marginBottom: "14px", lineHeight: "1.4" });

    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      justifyContent: "flex-end",
    });

    const mkBtn = (label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      Object.assign(b.style, {
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.08)",
        color: "#fff",
        cursor: "pointer",
        fontSize: "14px",
      });
      b.onmouseenter = () => (b.style.background = "rgba(255,255,255,0.14)");
      b.onmouseleave = () => (b.style.background = "rgba(255,255,255,0.08)");
      return b;
    };

    const btnSearch = mkBtn("Search intentionally");
    btnSearch.onclick = () => {
      dismissGateForCurrentUrl();
      overlay.remove();
      const input =
        document.querySelector('input#search') ||
        document.querySelector('input[name="search_query"]') ||
        document.querySelector("ytd-searchbox input");
      if (input) input.focus();
      else location.href = "https://www.youtube.com/results?search_query=";
    };

    const btnSubs = mkBtn("Go to Subscriptions");
    btnSubs.onclick = () => {
      dismissGateForCurrentUrl();
      location.href = "https://www.youtube.com/feed/subscriptions";
    };

    btnRow.appendChild(btnSearch);
    btnRow.appendChild(btnSubs);

    if (SETTINGS.allowContinueAnyway) {
      const btnContinue = mkBtn("Continue anyway");
      btnContinue.style.opacity = "0.85";
      btnContinue.onclick = () => {
        dismissGateForCurrentUrl();
        overlay.remove();
      };
      btnRow.appendChild(btnContinue);
    }

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.documentElement.appendChild(overlay);
  }

  // --- Scheduler / Observer (YouTube is SPA)
  let scheduled = false;

  const sweep = () => {
    enforceVideoSearchFilter();
    removeShorts();
    ensureIntentGate();
  };

  const scheduleSweep = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      sweep();
    });
  };

  scheduleSweep();

  new MutationObserver(scheduleSweep).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleSweep();
    }
  }, 500);
})();
