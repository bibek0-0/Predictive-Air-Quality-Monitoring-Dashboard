// ============================================
// Auth Module - Login, Signup, Google OAuth
// ============================================

(function () {
  const API_BASE = window.location.origin;
  const TOKEN_KEY = "airktm_token";
  const USER_KEY = "airktm_user";

  // ---- State ----
  let currentUser = null;

  // ---- DOM References (lazy) ----
  function getEl(id) {
    return document.getElementById(id);
  }

  // ---- Token helpers ----
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function setUser(user) {
    currentUser = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function getCachedUser() {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  // ---- API Helpers ----
  async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || "Something went wrong");
    return data;
  }

  async function apiGet(path) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || "Something went wrong");
    return data;
  }

  // ---- Modal logic ----
  function openModal() {
    const overlay = getEl("authModalOverlay");
    if (overlay) overlay.classList.add("active");
    clearMessages();
  }

  function closeModal() {
    const overlay = getEl("authModalOverlay");
    if (overlay) overlay.classList.remove("active");
    clearMessages();
  }

  function switchTab(tab) {
    // Tabs
    document
      .querySelectorAll(".auth-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".auth-form")
      .forEach((f) => f.classList.remove("active"));

    if (tab === "login") {
      getEl("authTabLogin")?.classList.add("active");
      getEl("authFormLogin")?.classList.add("active");
      const titleEl = getEl("authModalTitle");
      if (titleEl) titleEl.textContent = "Welcome back";
      const subtitleEl = getEl("authModalSubtitle");
      if (subtitleEl) subtitleEl.textContent = "Login to your account";
    } else {
      getEl("authTabSignup")?.classList.add("active");
      getEl("authFormSignup")?.classList.add("active");
      const titleEl = getEl("authModalTitle");
      if (titleEl) titleEl.textContent = "Create account";
      const subtitleEl = getEl("authModalSubtitle");
      if (subtitleEl) subtitleEl.textContent = "Sign up to get started";
    }
    clearMessages();
  }

  let messageTimeout;

  function showMessage(formId, msg, type) {
    const el = document.querySelector(`#${formId} .auth-message`);
    if (!el) return;

    // Clear any existing timeout
    if (messageTimeout) clearTimeout(messageTimeout);

    el.textContent = msg;
    el.className = `auth-message ${type} show`;

    // Auto-dismiss after 4 seconds
    messageTimeout = setTimeout(() => {
      el.className = "auth-message";
    }, 4000);
  }

  function clearMessages() {
    if (messageTimeout) clearTimeout(messageTimeout);
    document.querySelectorAll(".auth-message").forEach((el) => {
      el.className = "auth-message";
      el.textContent = "";
    });
  }

  // ---- Registration ----
  async function handleSignup(e) {
    e.preventDefault();
    const name = getEl("signupName")?.value.trim();
    const email = getEl("signupEmail")?.value.trim();
    const password = getEl("signupPassword")?.value;

    if (!name || !email || !password) {
      return showMessage(
        "authFormSignup",
        "Please fill in all fields",
        "error",
      );
    }
    if (password.length < 6) {
      return showMessage(
        "authFormSignup",
        "Password must be at least 6 characters",
        "error",
      );
    }
    if (!/[A-Z]/.test(password)) {
      return showMessage(
        "authFormSignup",
        "Password must contain at least one uppercase letter",
        "error",
      );
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return showMessage(
        "authFormSignup",
        "Password must contain at least one special character (!@#$%^&* etc.)",
        "error",
      );
    }

    const btn = document.querySelector("#authFormSignup .auth-submit-btn");
    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
      const data = await apiPost("/api/auth/register", {
        name,
        email,
        password,
      });
      setToken(data.token);
      setUser(data.user);
      // Sync pro status from DB
      if (data.user.isPro) {
        localStorage.setItem("airktmProActive", "true");
      }
      showMessage("authFormSignup", "Account created successfully!", "success");
      setTimeout(() => {
        getEl("signupPassword").value = ""; // clear password
        closeModal();
        updateNavbar();
        window.dispatchEvent(new CustomEvent("auth:success"));
      }, 700);
    } catch (err) {
      showMessage("authFormSignup", err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Create Account";
    }
  }

  // ---- Login ----
  async function handleLogin(e) {
    e.preventDefault();
    const email = getEl("loginEmail")?.value.trim();
    const password = getEl("loginPassword")?.value;

    if (!email || !password) {
      return showMessage("authFormLogin", "Please fill in all fields", "error");
    }

    const btn = document.querySelector("#authFormLogin .auth-submit-btn");
    btn.disabled = true;
    btn.textContent = "Logging in...";

    try {
      const data = await apiPost("/api/auth/login", { email, password });
      setToken(data.token);
      setUser(data.user);
      // Sync pro status from DB
      if (data.user.isPro) {
        localStorage.setItem("airktmProActive", "true");
      }
      showMessage("authFormLogin", "Logged in successfully!", "success");
      setTimeout(() => {
        getEl("loginPassword").value = ""; // clear password
        closeModal();
        updateNavbar();
        window.dispatchEvent(new CustomEvent("auth:success"));
      }, 700);
    } catch (err) {
      showMessage("authFormLogin", err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Log In";
    }
  }

  // ---- Google OAuth ----
  function handleGoogleLogin() {
    // Pass the current page path so Google Login knows where to return the user
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `${API_BASE}/api/auth/google?returnTo=${encodeURIComponent(currentPath)}`;
  }

  // ---- Logout ----
  function handleLogout() {
    removeToken();
    currentUser = null;
    // Clear Pro status on logout so next user doesn't inherit it
    localStorage.removeItem("airktmProActive");
    localStorage.removeItem("airktmProTxn");
    localStorage.removeItem("airktmProDate");
    updateNavbar();
    // Close dropdown
    document.querySelector(".user-menu-container")?.classList.remove("open");
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }

  // ---- Navbar update ----
  function updateNavbar() {
    const authBtnContainer = getEl("authBtnContainer");
    const userMenuContainer = getEl("userMenuContainer");
    if (!authBtnContainer || !userMenuContainer) return;

    const user = currentUser || getCachedUser();

    if (user) {
      authBtnContainer.style.display = "none";
      userMenuContainer.style.display = "block";

      // Avatar
      const avatarArea = userMenuContainer.querySelector(".user-avatar-area");
      if (avatarArea) {
        if (user.avatar) {
          avatarArea.innerHTML = `<img src="${user.avatar}" alt="${user.name}" class="user-avatar-img" referrerpolicy="no-referrer">`;
        } else {
          const initial = user.name ? user.name.charAt(0).toUpperCase() : "?";
          avatarArea.innerHTML = `<span class="user-avatar-placeholder">${initial}</span>`;
        }
      }

      // Name + Pro badge
      const nameEl = userMenuContainer.querySelector(".user-avatar-name");
      if (nameEl) {
        const isPro = user.isPro === true;
        nameEl.innerHTML =
          (user.name || "User") +
          (isPro ? ' <span class="pro-name-badge">PRO</span>' : "");
      }

      // Dropdown info
      const ddName = userMenuContainer.querySelector(".user-dropdown-name");
      if (ddName) {
        const isPro = user.isPro === true;
        ddName.innerHTML =
          (user.name || "User") +
          (isPro ? ' <span class="pro-name-badge">PRO</span>' : "");
      }
      const ddEmail = userMenuContainer.querySelector(".user-dropdown-email");
      if (ddEmail) ddEmail.textContent = user.email || "";

      // Inject "Change Alert Location" button for Pro users
      const dropdown = userMenuContainer.querySelector(".user-dropdown");
      const existingLocBtn = dropdown ? dropdown.querySelector(".change-location-btn") : null;
      if (dropdown && user.isPro === true) {
        if (!existingLocBtn) {
          const logoutBtn = dropdown.querySelector(".logout-btn");
          const locBtn = document.createElement("button");
          locBtn.className = "user-dropdown-item change-location-btn";
          locBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> Alert Locations';
          locBtn.addEventListener("click", function() {
            showLocationChangeModal(user);
          });
          if (logoutBtn) {
            dropdown.insertBefore(locBtn, logoutBtn);
          } else {
            dropdown.appendChild(locBtn);
          }
        }
      } else if (existingLocBtn) {
        existingLocBtn.remove();
      }

      // Handle Nav Upgrade (Pro Crown) Button Visibility based on Pro status
      const navUpgradeBtn = document.getElementById("navUpgradeBtn");
      if (navUpgradeBtn) {
        if (user.isPro === true) {
          navUpgradeBtn.style.display = "none";
        } else {
          navUpgradeBtn.style.display = "flex";
        }
      }
    } else {
      authBtnContainer.style.display = "";
      userMenuContainer.style.display = "none";
      // User logged out: show crown if it exists
      const navUpgradeBtn = document.getElementById("navUpgradeBtn");
      if (navUpgradeBtn) {
        navUpgradeBtn.style.display = "flex";
      }
    }
  }

  // ---- Check for token from Google OAuth redirect ----
  function checkForOAuthToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const khaltiIntentFromUrl = urlParams.get("khaltiIntent");
    if (token) {
      setToken(token);
      // If khaltiIntent was passed through Google OAuth redirect, restore it to sessionStorage
      if (khaltiIntentFromUrl === "true") {
        sessionStorage.setItem("khaltiIntent", "true");
      }
      // Clean URL
      const url = new URL(window.location);
      url.searchParams.delete("token");
      url.searchParams.delete("khaltiIntent");
      window.history.replaceState(
        {},
        document.title,
        url.pathname + url.search,
      );
      // Fetch user info and trigger success event so that Khalti logic can continue
      fetchCurrentUser().then(() => {
        // If user is Pro, immediately hide the premium popup (it may have already shown)
        if (currentUser && currentUser.isPro) {
          localStorage.setItem("airktmProActive", "true");
          const premiumPopup = document.getElementById("premiumPopup");
          if (premiumPopup) {
            premiumPopup.classList.remove("active");
            premiumPopup.style.display = "none";
            sessionStorage.setItem("premiumPopupClosed", "true");
          }
        }
        window.dispatchEvent(new CustomEvent("auth:success"));
      });
    }
  }

  // ---- Fetch current user from API ----
  async function fetchCurrentUser() {
    const token = getToken();
    if (!token) return;

    try {
      const user = await apiGet("/api/auth/user");
      setUser(user);
      updateNavbar();
    } catch (err) {
      // Token might be expired
      removeToken();
      updateNavbar();
    }
  }

  // ---- Password visibility toggle ----
  function setupPasswordToggles() {
    document.querySelectorAll(".auth-password-toggle").forEach((btn) => {
      btn.addEventListener("click", function () {
        const input = this.parentElement.querySelector(".auth-input");
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        // Toggle icon
        this.innerHTML = isPassword
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      });
    });
  }

  // ---- Init ----
  function init() {
    // Tab switching
    getEl("authTabLogin")?.addEventListener("click", () => switchTab("login"));
    getEl("authTabSignup")?.addEventListener("click", () =>
      switchTab("signup"),
    );

    // Open modal
    getEl("authNavBtn")?.addEventListener("click", openModal);

    // Close modal
    getEl("authModalClose")?.addEventListener("click", closeModal);
    getEl("authModalOverlay")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Escape key closes modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    // Form submissions
    getEl("authFormLogin")?.addEventListener("submit", handleLogin);
    getEl("authFormSignup")?.addEventListener("submit", handleSignup);

    // Google login buttons
    document.querySelectorAll(".auth-google-btn").forEach((btn) => {
      btn.addEventListener("click", handleGoogleLogin);
    });

    // Logout
    getEl("authLogoutBtn")?.addEventListener("click", handleLogout);

    // User menu toggle
    const userBtn = document.querySelector(".user-avatar-btn");
    if (userBtn) {
      userBtn.addEventListener("click", () => {
        document
          .querySelector(".user-menu-container")
          ?.classList.toggle("open");
      });
    }

    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
      const container = document.querySelector(".user-menu-container");
      if (container && !container.contains(e.target)) {
        container.classList.remove("open");
      }
    });

    // Password toggles
    setupPasswordToggles();

    // Check for Google OAuth redirect token
    checkForOAuthToken();

    // Load existing user
    const cached = getCachedUser();
    if (cached) {
      currentUser = cached;
      updateNavbar();
      // Refresh user from API in background
      fetchCurrentUser();
    } else if (getToken()) {
      fetchCurrentUser();
    } else {
      updateNavbar();
    }
  }

  // ---- Change Alert Location Modal (Pro Users) ----
  function showLocationChangeModal(user) {
    // Remove existing modal if any
    var existing = document.getElementById("changeLocationModal");
    if (existing) existing.remove();

    var stations = ["Ratnapark", "Pulchowk", "Bhaisipati", "Shankapark", "Bhaktapur"];
    var currentLoc = user.alertLocation || localStorage.getItem("airktmAlertLocation") || "";

    var overlay = document.createElement("div");
    overlay.id = "changeLocationModal";
    overlay.className = "change-loc-overlay";

    var card = document.createElement("div");
    card.className = "change-loc-card";

    // Header
    card.innerHTML = '<div class="change-loc-header">' +
      '<h3 class="change-loc-title">Alert Locations</h3>' +
      '<button class="change-loc-close" id="changeLocClose">&times;</button>' +
      '</div>' +
      '<p class="change-loc-subtitle">Select a station to change your alerts' +
      (currentLoc ? '<br><span class="change-loc-current">Current: ' + currentLoc + '</span>' : '') +
      '</p>' +
      '<div class="change-loc-stations"></div>';

    var stationsDiv = card.querySelector(".change-loc-stations");

    stations.forEach(function(station) {
      var btn = document.createElement("button");
      btn.className = "change-loc-station-btn" + (station === currentLoc ? " active" : "");
      btn.textContent = station;
      btn.addEventListener("click", function() {
        // Store the selected location as pending
        localStorage.setItem('airktmPendingAlertLocation', station);

        // Show loading state on the button
        btn.textContent = "Processing...";
        btn.disabled = true;

        // --- Initiate Khalti Payment ---
        var orderId = 'AIRKTM-LOC-' + Date.now();

        // Build callback URL
        var currentPath = window.location.href.split('?')[0];
        var basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        // Try pages/ subfolder for subpages, root for index
        var callbackUrl;
        if (currentPath.indexOf('/pages/') !== -1) {
          callbackUrl = basePath + 'payment-callback.html';
        } else {
          callbackUrl = basePath + 'pages/payment-callback.html';
        }
        var siteUrl = window.location.origin !== 'null' ? window.location.origin : basePath;

        // User details
        var userName = user.name || 'AirKTM User';
        var userEmail = user.email || 'user@airktm.com';

        var khaltiConfig = {
          return_url: callbackUrl,
          website_url: siteUrl,
          amount: 10000, // NRS 100 in paisa
          purchase_order_id: orderId,
          purchase_order_name: 'AirKTM Location Change - ' + station,
          customer_info: {
            name: userName,
            email: userEmail,
            phone: '9800000000'
          },
          product_details: [
            {
              identity: 'airktm-loc-change',
              name: 'AirKTM Alert Location Change to ' + station,
              total_price: 10000,
              quantity: 1,
              unit_price: 10000
            }
          ]
        };

        var khaltiApiUrl = 'https://dev.khalti.com/api/v2/epayment/initiate/';
        var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(khaltiApiUrl);

        fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'key 05bf95cc57244045b8df5fad06748dab',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(khaltiConfig)
        })
        .then(function(response) {
          if (!response.ok) {
            return response.json().then(function(err) {
              throw new Error(err.detail || err.message || 'Payment initiation failed');
            });
          }
          return response.json();
        })
        .then(function(data) {
          if (data.payment_url) {
            localStorage.setItem('khaltiPaymentPending', 'true');

            // Open Khalti popup (compact)
            var popupWidth = 420;
            var popupHeight = 550;
            var left = Math.max(0, (window.screen.width - popupWidth) / 2);
            var top = Math.max(0, (window.screen.height - popupHeight) / 2);
            var popupFeatures = 'width=' + popupWidth + ',height=' + popupHeight +
              ',left=' + left + ',top=' + top +
              ',scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=yes,status=yes';

            var khaltiPopup = window.open(data.payment_url, 'KhaltiPayment', popupFeatures);

            if (!khaltiPopup || khaltiPopup.closed) {
              window.location.href = data.payment_url;
              return;
            }

            // Poll to detect popup close
            var pollTimer = setInterval(function() {
              try {
                if (khaltiPopup.closed) {
                  clearInterval(pollTimer);
                  localStorage.removeItem('khaltiPaymentPending');

                  var paymentResult = localStorage.getItem('khaltiPaymentResult');
                  localStorage.removeItem('khaltiPaymentResult');

                  if (paymentResult === 'success') {
                    // Payment successful — now update location
                    var pendingLoc = localStorage.getItem('airktmPendingAlertLocation') || station;
                    localStorage.removeItem('airktmPendingAlertLocation');
                    localStorage.setItem('airktmAlertLocation', pendingLoc);

                    // Update MongoDB
                    var token = getToken();
                    if (token) {
                      fetch(window.location.origin + "/api/auth/alert-location", {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": "Bearer " + token
                        },
                        body: JSON.stringify({ alertLocation: pendingLoc })
                      })
                      .then(function(res) { return res.json(); })
                      .then(function(d) {
                        console.log("Alert location updated:", d);
                        if (currentUser) {
                          currentUser.alertLocation = pendingLoc;
                          localStorage.setItem("airktm_user", JSON.stringify(currentUser));
                        }
                      })
                      .catch(function(err) {
                        console.error("Failed to update location:", err);
                      });
                    }

                    // Update Flask subscriber
                    if (userEmail) {
                      var flaskBase = window.location.protocol + "//" + window.location.hostname + ":5050";
                      fetch(flaskBase + "/api/subscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: userEmail, station: pendingLoc })
                      }).catch(function(err) {
                        console.error("Flask subscribe update failed:", err);
                      });
                    }

                    // Show success in the modal
                    card.innerHTML = '<div class="change-loc-success">' +
                      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#10b981"/><path d="M8 12l3 3 5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                      '<h3 class="change-loc-title">Location Updated</h3>' +
                      '<p class="change-loc-subtitle">You will now receive alerts for <strong>' + pendingLoc + '</strong></p>' +
                      '</div>';

                    setTimeout(function() { overlay.remove(); }, 2500);
                  } else {
                    // Payment canceled or failed — reset button
                    btn.textContent = station;
                    btn.disabled = false;
                  }
                }
              } catch(e) {
                // Cross-origin — popup still open, keep polling
              }
            }, 500);
          }
        })
        .catch(function(err) {
          console.error("Khalti payment error:", err);
          btn.textContent = station;
          btn.disabled = false;
          alert("Payment initiation failed: " + err.message);
        });
      });
      stationsDiv.appendChild(btn);
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(function() {
      overlay.classList.add("active");
    });

    // Close handlers
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) overlay.remove();
    });
    card.querySelector("#changeLocClose").addEventListener("click", function() {
      overlay.remove();
    });
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
