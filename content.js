(() => {
  const SETTINGS = {
    useIntentGateOnHome: true,
    allowContinueAnyway: true,

    gateTitle: "Pause for 3 seconds.",
    gateBody:
      "Use YouTube intentionally: search for exactly what you need, or go to Subscriptions.",
  };

  const DEBUG = false;
  const log = (...args) => DEBUG && console.log("[NoShorts+Focus]", ...args);

  // --- Gate dismissal state (prevents re-adding after Continue)
  let gateDismissedForUrl = null;
  const dismissGateForCurrentUrl = () => {
    gateDismissedForUrl = location.href;
  };
  const isGateDismissedForCurrentUrl = () => gateDismissedForUrl === location.href;

  const isYouTubeHome = () => location.pathname === "/";

  function removeShorts() {
    document.querySelectorAll('a[href^="/shorts"]').forEach((a) => {
      const guideEntry =
        a.closest("ytd-guide-entry-renderer") ||
        a.closest("ytd-mini-guide-entry-renderer");
      if (guideEntry) {
        guideEntry.remove();
        return;
      }

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

    document.querySelectorAll("ytd-reel-shelf-renderer").forEach((el) => el.remove());
    document.querySelectorAll("ytd-rich-section-renderer").forEach((section) => {
      const hasShortsLink = section.querySelector('a[href^="/shorts/"], a[href="/shorts"]');
      if (hasShortsLink) section.remove();
    });

    if (location.pathname.startsWith("/shorts")) {
      location.replace("https://www.youtube.com/");
    }
  }

  // ---------------------------
  // Tier 3: Reminder Banner
  // ---------------------------
  function ensureBanner() {
    if (!SETTINGS.showReminderBanner) return;
    if (document.getElementById("focus-reminder-banner")) return;

    const banner = document.createElement("div");
    banner.id = "focus-reminder-banner";
    banner.textContent = SETTINGS.bannerText;

    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "999999",
      padding: "10px 14px",
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      background: "rgba(0,0,0,0.85)",
      color: "white",
      textAlign: "center",
      backdropFilter: "blur(6px)",
      borderBottom: "1px solid rgba(255,255,255,0.12)",
    });

    document.documentElement.appendChild(banner);

    const style = document.createElement("style");
    style.id = "focus-reminder-banner-padding";
    style.textContent = `html { scroll-padding-top: 44px !important; } body { padding-top: 44px !important; }`;
    document.documentElement.appendChild(style);
  }

  // ---------------------------
  // Tier 3: Intent Gate (Home)
  // ---------------------------
  function ensureIntentGate() {
    if (!SETTINGS.useIntentGateOnHome) return;
    if (!isYouTubeHome()) return;

    // If user already dismissed gate on this URL, don't re-add
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
        dismissGateForCurrentUrl(); // <-- key fix
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

  // ---------------------------
  // Scheduler / Observer
  // ---------------------------
  let scheduled = false;

  const sweep = () => {
    removeShorts();
    ensureBanner();
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

  const observer = new MutationObserver(() => scheduleSweep());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // new URL => gate can show again on home
      scheduleSweep();
    }
  }, 500);
})();
