// SHARED CODE - Used across all pages

// Theme Toggle Functionality
(function () {
  const currentTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
})();

// Navigation active link handling with enhanced animations
document.addEventListener("DOMContentLoaded", function () {
  // Theme toggle click handler
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });
  }
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      // Allow navigation for actual page links (not # or anchor links)
      if (href && href !== "#" && !href.startsWith("#")) {
        // Allow default navigation behavior for page links
        return; // Don't prevent default, let the browser navigate
      }

      // For anchor links or # links, prevent default and handle locally
      e.preventDefault();

      // Create ripple effect
      const ripple = document.createElement("span");
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";
      ripple.classList.add("ripple");

      this.appendChild(ripple);

      // Remove ripple after animation
      setTimeout(() => {
        ripple.remove();
      }, 600);

      // Remove active class from all links with fade out
      navLinks.forEach((l) => {
        if (l !== this) {
          l.style.opacity = "0.7";
          setTimeout(() => {
            l.classList.remove("active");
            l.style.opacity = "1";
          }, 150);
        }
      });

      // Add active class to clicked link
      this.style.opacity = "0.8";
      setTimeout(() => {
        this.classList.add("active");
        this.style.opacity = "1";
      }, 150);
    });

    // Add hover sound effect
    link.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px) scale(1.02)";
    });

    link.addEventListener("mouseleave", function () {
      if (!this.classList.contains("active")) {
        this.style.transform = "translateY(0) scale(1)";
      }
    });
  });

  // Crown Upgrade Button Logic
  const navUpgradeBtn = document.getElementById("navUpgradeBtn");
  if (navUpgradeBtn) {
    navUpgradeBtn.addEventListener("click", function () {
      const isAlertsPage = window.location.pathname.includes("alerts.html");

      if (isAlertsPage) {
        // If we're already on alerts.html, just click the existing upgrade button or show the popup
        const existingUpgradeBtn = document.getElementById("khaltiUpgradeBtn");
        const premiumPopup = document.getElementById("premiumPopup");

        // If they are Pro already, just show a message or let it be
        if (localStorage.getItem("airktmProActive") === "true") {
          alert("You are already an AirKTM Pro member!");
          return;
        }

        if (premiumPopup) {
          premiumPopup.style.display = "flex";
          setTimeout(() => premiumPopup.classList.add("active"), 50);
        }
      } else {
        // Redirect to alerts page with an intent to upgrade
        // Determine the correct path to alerts.html depending on current depth
        const isIndexPath =
          window.location.pathname.endsWith("index.html") ||
          window.location.pathname === "/";
        const alertsPath = isIndexPath
          ? "pages/alerts.html?action=upgrade"
          : "alerts.html?action=upgrade";
        window.location.href = alertsPath;
      }
    });

    // Hide crown if user is already PRO
    const isProUser = localStorage.getItem("airktmProActive") === "true";
    const isLoggedIn = !!localStorage.getItem("airktm_token");

    if (isProUser) {
      navUpgradeBtn.style.display = "none";
    } else {
      // Only auto-show tooltip on Home and Alerts pages for non-pro users
      const path = window.location.pathname;
      const isHomePage =
        path.endsWith("index.html") || path === "/" || path.endsWith("/");
      const isAlertsPage = path.includes("alerts.html");

      if (isHomePage || isAlertsPage) {
        // Auto-show tooltip for non-pro users for 3 seconds on page load
        setTimeout(() => {
          navUpgradeBtn.classList.add("show-tooltip");
          setTimeout(() => {
            navUpgradeBtn.classList.remove("show-tooltip");
          }, 3000);
        }, 500); // 500ms delay to ensure seamless load
      }
    }

    // Dynamically handle tooltip on login
    window.addEventListener("auth:success", function () {
      const isProUserNow = localStorage.getItem("airktmProActive") === "true";
      if (isProUserNow) {
        navUpgradeBtn.style.display = "none";
        navUpgradeBtn.classList.remove("show-tooltip");
      } else {
        navUpgradeBtn.style.display = "flex"; // Ensure button is visible
        const path = window.location.pathname;
        const isHomePage =
          path.endsWith("index.html") || path === "/" || path.endsWith("/");
        const isAlertsPage = path.includes("alerts.html");

        if (isHomePage || isAlertsPage) {
          setTimeout(() => {
            navUpgradeBtn.classList.add("show-tooltip");
            setTimeout(() => {
              navUpgradeBtn.classList.remove("show-tooltip");
            }, 3000);
          }, 500);
        }
      }
    });

    // Dynamically handle tooltip on logout
    window.addEventListener("auth:logout", function () {
      navUpgradeBtn.style.display = "flex"; // Ensure button comes back if logic hid it
      const path = window.location.pathname;
      const isHomePage =
        path.endsWith("index.html") || path === "/" || path.endsWith("/");
      const isAlertsPage = path.includes("alerts.html");

      if (isHomePage || isAlertsPage) {
        setTimeout(() => {
          navUpgradeBtn.classList.add("show-tooltip");
          setTimeout(() => {
            navUpgradeBtn.classList.remove("show-tooltip");
          }, 3000);
        }, 500);
      }
    });
  }
});
