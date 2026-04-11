// ALERTS JS CODES

// Premium Popup Modal - Auto Show and Close (Show Once Per Session)
document.addEventListener("DOMContentLoaded", function () {
  const popupOverlay = document.getElementById("premiumPopup");
  const closeBtn = document.getElementById("premiumPopupClose");

  if (!popupOverlay) {
    console.error("Premium popup overlay not found");
    return;
  }

  // Check if popup has been closed in this session
  let popupClosed = sessionStorage.getItem("premiumPopupClosed");

  // Skip popup entirely for Pro users
  const isProUser = localStorage.getItem("airktmProActive") === "true";
  if (isProUser) {
    popupOverlay.style.display = "none";
    return;
  }

  // Force show popup for non-logged-in users on every refresh
  const isLoggedIn = !!localStorage.getItem("airktm_token");
  if (!isLoggedIn) {
    popupClosed = null; // Ignore sessionStorage if not logged in
  }

  // Only show popup if it hasn't been closed before in this session (or if forced)
  if (!popupClosed) {
    // Make sure overlay is visible
    popupOverlay.style.display = "flex";
    setTimeout(function () {
      popupOverlay.classList.add("active");
    }, 300);

    // Show hint after 5 seconds, then hide after 3 more seconds
    const closeHint = document.getElementById("premiumCloseHint");
    let hintTimeout = setTimeout(function () {
      if (closeHint && popupOverlay.classList.contains("active")) {
        closeHint.classList.add("show");
        // Hide hint after 3 seconds
        setTimeout(function () {
          if (closeHint) {
            closeHint.classList.remove("show");
          }
        }, 3000);
      }
    }, 5000);
  } else {
    // Hide popup if it was already closed
    popupOverlay.style.display = "none";
  }

  // Close popup function
  function closePopup() {
    const closeHint = document.getElementById("premiumCloseHint");
    if (closeHint) {
      closeHint.classList.remove("show");
    }
    popupOverlay.classList.remove("active");
    // Save to sessionStorage that popup was closed
    sessionStorage.setItem("premiumPopupClosed", "true");
    setTimeout(function () {
      popupOverlay.style.display = "none";
    }, 400);
  }

  // Close on X button click
  if (closeBtn) {
    closeBtn.addEventListener("click", closePopup);
  }

  // Close on overlay click
  popupOverlay.addEventListener("click", function (e) {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && popupOverlay.classList.contains("active")) {
      closePopup();
    }
  });
});
// Typing animation for email placeholder
document.addEventListener("DOMContentLoaded", function () {
  const emailInput = document.getElementById("alertsEmailInput");
  if (!emailInput) return;

  const isProUser = localStorage.getItem("airktmProActive") === "true";
  const placeholderText = isProUser
    ? "You have already subscribed but you can refer others"
    : "Enter your email address";
  let currentIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  function typePlaceholder() {
    if (emailInput.value !== "") {
      // If user is typing, stop animation
      return;
    }

    if (isDeleting) {
      // Delete characters
      emailInput.placeholder = placeholderText.substring(0, currentIndex - 1);
      currentIndex--;
      typingSpeed = 50; // Faster when deleting

      if (currentIndex === 0) {
        isDeleting = false;
        typingSpeed = 100;
      }
    } else {
      // Type characters
      emailInput.placeholder = placeholderText.substring(0, currentIndex + 1);
      currentIndex++;
      typingSpeed = 100;

      if (currentIndex === placeholderText.length) {
        // Wait before deleting
        setTimeout(() => {
          isDeleting = true;
        }, 2000);
      }
    }

    setTimeout(typePlaceholder, typingSpeed);
  }

  // Start typing animation after a short delay
  setTimeout(typePlaceholder, 500);

  // Pause animation when user focuses on input
  emailInput.addEventListener("focus", function () {
    emailInput.placeholder = placeholderText;
  });

  // Resume animation when user blurs (if input is empty)
  emailInput.addEventListener("blur", function () {
    if (emailInput.value === "") {
      currentIndex = 0;
      isDeleting = false;
      setTimeout(typePlaceholder, 500);
    }
  });

  // Handle logout event
  window.addEventListener("auth:logout", function () {
    // Clear popup closed flag so it shows immediately
    sessionStorage.removeItem("premiumPopupClosed");

    // Find and show popup immediately since user is no longer logged in
    const popupOverlay = document.getElementById("premiumPopup");
    if (popupOverlay) {
      // Reset the upgrade button state from Pro Active
      const upgradeBtn = document.getElementById("khaltiUpgradeBtn");
      if (upgradeBtn) {
        upgradeBtn.classList.remove("khalti-pro-active");
        upgradeBtn.disabled = false;
        const btnText = upgradeBtn.querySelector(".upgrade-btn-text");
        if (btnText) {
          btnText.innerHTML = "Upgrade to AirKTM Pro";
        }
      }

      popupOverlay.style.display = "flex";
      setTimeout(() => popupOverlay.classList.add("active"), 50);

      // Show hint after 5 seconds
      const closeHint = document.getElementById("premiumCloseHint");
      setTimeout(function () {
        if (closeHint && popupOverlay.classList.contains("active")) {
          closeHint.classList.add("show");
          setTimeout(() => {
            if (closeHint) closeHint.classList.remove("show");
          }, 3000);
        }
      }, 5000);
    }

    // Update subscription placeholder for non-logged-in state
    const emailInput = document.getElementById("alertsEmailInput");
    if (emailInput) {
      emailInput.placeholder = "Enter your email address";
    }
  });

  // Handle login event
  window.addEventListener("auth:success", function () {
    const isProUserNow = localStorage.getItem("airktmProActive") === "true";
    const popupOverlay = document.getElementById("premiumPopup");

    if (isProUserNow) {
      // Hide popup immediately and update placeholder if pro
      if (popupOverlay) {
        popupOverlay.classList.remove("active");
        setTimeout(() => {
          popupOverlay.style.display = "none";
        }, 400);
      }
      const emailInput = document.getElementById("alertsEmailInput");
      if (emailInput) {
        emailInput.placeholder =
          "You have already subscribed but you can refer others";
      }
    } else {
      // If they just logged in/signed up and ARE NOT pro, show the premium popup after a delay
      sessionStorage.removeItem("premiumPopupClosed");
      if (popupOverlay) {
        // Wait for auth modal to fully close before showing premium popup
        setTimeout(() => {
          popupOverlay.style.display = "flex";
          setTimeout(() => popupOverlay.classList.add("active"), 50);

          // Show hint after 5 seconds
          const closeHint = document.getElementById("premiumCloseHint");
          setTimeout(function () {
            if (closeHint && popupOverlay.classList.contains("active")) {
              closeHint.classList.add("show");
              setTimeout(function () {
                if (closeHint) {
                  closeHint.classList.remove("show");
                }
              }, 3000);
            }
          }, 5000);
        }, 800);
      }
    }
  });
});
// Handle subscription form
document.addEventListener("DOMContentLoaded", function () {
  const subscriptionForm = document.getElementById("alertsSubscriptionForm");
  if (!subscriptionForm) {
    console.error("Subscription form not found");
    return;
  }

  subscriptionForm.addEventListener("submit", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const email = document.getElementById("alertsEmailInput").value.trim();
    const successMessage = document.getElementById("alertsSuccessMessage");
    const errorMessage = document.getElementById("alertsErrorMessage");
    const subscribeBtn = subscriptionForm.querySelector(
      ".alerts-page-subscribe-btn",
    );
    const emailInput = document.getElementById("alertsEmailInput");
    const emailWrapper = emailInput.closest(".alerts-page-email-input-wrapper");

    // Hide previous messages
    successMessage.style.display = "none";
    errorMessage.style.display = "none";
    emailInput.classList.remove("alerts-page-email-input-error");

    // Define showError function
    function showError(message) {
      errorMessage.querySelector("p").textContent = message;
      errorMessage.style.display = "flex";

      // Hide error message after 5 seconds
      setTimeout(() => {
        errorMessage.style.display = "none";
        emailInput.classList.remove("alerts-page-email-input-error");
        emailWrapper.classList.remove("alerts-page-email-input-wrapper-error");
      }, 5000);
    }

    // Validate email
    if (!email) {
      showError("Please enter your email address");
      return;
    }

    // Check if email ends with @gmail.com
    const emailLower = email.toLowerCase();
    if (!emailLower.endsWith("@gmail.com")) {
      showError("Please use a @gmail.com email address");
      emailInput.classList.add("alerts-page-email-input-error");
      emailWrapper.classList.add("alerts-page-email-input-wrapper-error");
      return;
    }

    // Valid email format - proceed to backend check
    emailInput.classList.remove("alerts-page-email-input-error");
    emailWrapper.classList.remove("alerts-page-email-input-wrapper-error");

    // Show loading state
    if (subscribeBtn) {
      subscribeBtn.disabled = true;
      subscribeBtn.textContent = "Subscribing...";
    }

    const authHeaders = { "Content-Type": "application/json" };
    try {
      const t = localStorage.getItem("airktm_token");
      if (t) authHeaders.Authorization = "Bearer " + t;
    } catch (e) {
      /* ignore */
    }

    // Check if user is already registered and get magic link
    fetch(window.location.origin + "/api/auth/subscribe-alert", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ email: email }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success === false && data.reason === "already_registered") {
          // User is already registered
          showError("You are already registered, buy pro by logging in.");
          emailInput.classList.add("alerts-page-email-input-error");
          emailWrapper.classList.add("alerts-page-email-input-wrapper-error");
          if (subscribeBtn) {
            subscribeBtn.disabled = false;
            subscribeBtn.textContent = "Subscribe";
          }
          return;
        }

        // Successfully generated magic link, now send email
        const magicLinkUrl =
          data.magicLink ||
          `${window.location.origin}/index.html?action=upgrade`;

        let referrer = data.referrer || null;
        // If a token was sent but API omitted referrer (e.g. edge DB/JWT), use logged-in profile for invite copy only when emails differ
        if (
          !referrer &&
          authHeaders.Authorization &&
          String(email).trim().toLowerCase()
        ) {
          try {
            const inviteeLower = String(email).trim().toLowerCase();
            const raw = localStorage.getItem("airktm_user");
            if (raw) {
              const u = JSON.parse(raw);
              if (u && u.email) {
                const refLower = String(u.email).trim().toLowerCase();
                if (refLower && refLower !== inviteeLower) {
                  const displayName =
                    u.name && String(u.name).trim()
                      ? String(u.name).trim()
                      : refLower.split("@")[0];
                  referrer = { name: displayName, email: u.email };
                }
              }
            }
          } catch (e) {
            /* ignore */
          }
        }

        sendWelcomeEmail(email, magicLinkUrl, referrer);

        successMessage.style.display = "flex";
        document.getElementById("alertsEmailInput").value = "";

        // Hide success message after 5 seconds
        setTimeout(() => {
          successMessage.style.display = "none";
        }, 5000);

        if (subscribeBtn) {
          subscribeBtn.disabled = false;
          subscribeBtn.textContent = "Subscribe";
        }
      })
      .catch((err) => {
        console.error("Subscription error:", err);
        showError("Something went wrong. Please try again later.");
        if (subscribeBtn) {
          subscribeBtn.disabled = false;
          subscribeBtn.textContent = "Subscribe";
        }
      });

    function escapeHtml(str) {
      if (str == null) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function sendWelcomeEmail(userEmail, magicLinkUrl, referrer) {
      // Validate and clean email address
      const cleanEmail = userEmail.trim().toLowerCase();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        console.error("Invalid email format:", cleanEmail);
        return;
      }

      // Get current time
      const now = new Date();
      const timeString = now.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Extract name from email
      const userName = cleanEmail.split("@")[0];

      const refNameHtml =
        referrer && referrer.name ? escapeHtml(referrer.name) : "";
      const headlineHtml = referrer
        ? `${refNameHtml} referred you to AirKTM`
        : "Thanks for subscribing AirKTM";
      const sublineHtml = referrer
        ? "You're receiving this because someone shared AirKTM with you. Welcome aboard!"
        : "We're excited to have you on board!";
      const rawRefName = referrer && referrer.name ? String(referrer.name) : "";
      const safeRefPlain = rawRefName.replace(/[\r\n]+/g, " ").slice(0, 120);
      const emailSubject = referrer
        ? `${safeRefPlain} invited you to AirKTM`
        : "Welcome to AirKTM - Thank You for Subscribing!";
      const plainMessage = referrer
        ? `${safeRefPlain} referred you to AirKTM — open this email to get started with Pro.`
        : "Thanks for subscribing AirKTM!";

      // Create premium styled HTML email content Optimized for both Windows and Mobile
      const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
        .benefit-cell {width: 50% !important;}
    </style>
    <![endif]-->
    <style type="text/css">
        @media only screen and (max-width: 600px) {
            .benefit-cell {width: 100% !important; display: block !important;}
            .benefit-row {display: block !important;}
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Thanks message - well formatted text -->
                    <tr>
                        <td align="center" style="padding: 30px 20px 35px 20px; background-color: #ffffff;">
                            <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px; line-height: 1.2;">${headlineHtml}</h1>
                            <p style="margin: 0; font-size: 16px; color: #64748b; font-weight: 500; line-height: 1.5;">${sublineHtml}</p>
                        </td>
                    </tr>
                    
                    <!-- Premium Popup Design -->
                    <tr>
                        <td style="background: #1e293b; border-radius: 16px; padding: 20px 15px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background: #0f172a; border-radius: 16px; border: 2px solid #334155; padding: 25px 20px;">
                                        <!-- PRO Badge -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding-bottom: 18px;">
                                                    <span style="display: inline-block; background: #ffd700; color: #1a1a1a; font-size: 11px; padding: 6px 14px; border-radius: 20px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700;">PRO</span>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Title -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding-bottom: 12px;">
                                                    <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; text-align: center; line-height: 1.3;">Unlock AirKTM Pro</h2>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Subtitle -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding-bottom: 22px;">
                                                    <p style="margin: 0; font-size: 15px; color: #e2e8f0; text-align: center; line-height: 1.5; font-weight: 500;">Get real-time AQI alerts, personalized health messages, and early warnings.</p>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Price Display -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding-bottom: 22px;">
                                                    <div style="background: #ffd700; border-radius: 12px; padding: 18px; text-align: center; border: 2px solid #ffed4e;">
                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                                            <tr>
                                                                <td align="right" style="padding-right: 6px;">
                                                                    <span style="font-size: 32px; font-weight: 800; color: #1a1a1a; line-height: 1;">NRS 100</span>
                                                                </td>
                                                                <td align="left" valign="bottom" style="padding-bottom: 4px;">
                                                                    <span style="font-size: 15px; color: #1a1a1a; font-weight: 600;">/ month</span>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Benefits List - Responsive: 2 columns desktop, 1 column mobile -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr class="benefit-row">
                                                <td class="benefit-cell" style="padding-bottom: 10px; padding-right: 5px; width: 50%;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 12px; background: #1e293b; border-radius: 10px; border: 1px solid #334155;">
                                                                <span style="color: #ffd700; font-weight: bold; font-size: 16px; padding-right: 8px;">✓</span>
                                                                <span style="font-size: 14px; color: #ffffff; font-weight: 500;">Instant AQI notifications</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td class="benefit-cell" style="padding-bottom: 10px; padding-left: 5px; width: 50%;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 12px; background: #1e293b; border-radius: 10px; border: 1px solid #334155;">
                                                                <span style="color: #ffd700; font-weight: bold; font-size: 16px; padding-right: 8px;">✓</span>
                                                                <span style="font-size: 14px; color: #ffffff; font-weight: 500;">Personalized health warnings</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr class="benefit-row">
                                                <td class="benefit-cell" style="padding-bottom: 10px; padding-right: 5px; width: 50%;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 12px; background: #1e293b; border-radius: 10px; border: 1px solid #334155;">
                                                                <span style="color: #ffd700; font-weight: bold; font-size: 16px; padding-right: 8px;">✓</span>
                                                                <span style="font-size: 14px; color: #ffffff; font-weight: 500;">High/low AQI alerts</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td class="benefit-cell" style="padding-bottom: 10px; padding-left: 5px; width: 50%;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 12px; background: #1e293b; border-radius: 10px; border: 1px solid #334155;">
                                                                <span style="color: #ffd700; font-weight: bold; font-size: 16px; padding-right: 8px;">✓</span>
                                                                <span style="font-size: 14px; color: #ffffff; font-weight: 500;">Forecast alerting</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr class="benefit-row">
                                                <td class="benefit-cell" style="padding-bottom: 18px; padding-right: 5px; width: 50%;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 12px; background: #1e293b; border-radius: 10px; border: 1px solid #334155;">
                                                                <span style="color: #ffd700; font-weight: bold; font-size: 16px; padding-right: 8px;">✓</span>
                                                                <span style="font-size: 14px; color: #ffffff; font-weight: 500;">Early spike detection</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td class="benefit-cell" style="padding-bottom: 18px; padding-left: 5px; width: 50%;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 12px; background: #1e293b; border-radius: 10px; border: 1px solid #334155;">
                                                                <span style="color: #ffd700; font-weight: bold; font-size: 16px; padding-right: 8px;">✓</span>
                                                                <span style="font-size: 14px; color: #ffffff; font-weight: 500;">Real-time updates</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Upgrade Button -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding-bottom: 18px;">
                                                    <a href="${magicLinkUrl}" style="display: inline-block; padding: 12px 24px; background: #ffd700; color: #1a1a1a; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Upgrade Now</a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Cancel Note -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center">
                                                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; font-weight: 500;">Cancel anytime • No hidden fees</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
            `;

      // Plain lines for EmailJS (use {{invite_headline}} / {{invite_subline}} / {{subject}} in the
      // dashboard if your template currently hardcodes "Thanks for subscribing…" or the subject).
      const inviteHeadlinePlain = referrer
        ? `${safeRefPlain} referred you to AirKTM`
        : "Thanks for subscribing AirKTM";
      const inviteSublinePlain = referrer
        ? "You're receiving this because someone shared AirKTM with you. Welcome aboard!"
        : "We're excited to have you on board!";

      // EmailJS template parameters
      const templateParams = {
        user_email: cleanEmail, // For "To Email" field
        user_name: userName, // For "From Name" field
        to_name: userName, // For display in content
        name: userName, // For message content
        email: cleanEmail, // For "Reply To" field
        subject: emailSubject, // For "Subject" field — map in template as {{subject}}
        invite_headline: inviteHeadlinePlain,
        invite_subline: inviteSublinePlain,
        message: htmlMessage, // Full HTML — template should be one {{{message}}} or no duplicate title
        message_html: htmlMessage, // Alternative HTML field
        message_text: plainMessage, // Plain text fallback
        time: timeString, // For time display in content
      };

      // Log the parameters being sent
      console.log("Sending email with parameters:", templateParams);
      console.log("Email address being sent:", cleanEmail);
      console.log("Email validation:", emailRegex.test(cleanEmail));

      // Send email using EmailJS
      emailjs.send("service_w7ts8ar", "template_a615bmk", templateParams).then(
        function (response) {
          console.log(
            "✅ Email sent successfully!",
            response.status,
            response.text,
          );
        },
        function (error) {
          console.error("❌ Failed to send email:", error);
          console.error("Error status:", error.status);
          console.error("Error text:", error.text);
          console.error("Error details:", JSON.stringify(error, null, 2));

          // Specific error handling
          if (error.text && error.text.includes("template ID not found")) {
            console.error(
              "⚠️ Template ID not found. Please verify your template ID in EmailJS dashboard:",
            );
            console.error(
              "Visit: https://dashboard.emailjs.com/admin/templates",
            );
            console.error("Current template ID: template_a615bmk");
          } else if (
            error.text &&
            error.text.includes("recipients address is corrupted")
          ) {
            console.error("⚠️ Recipients address error. Please check:");
            console.error(
              "1. Your EmailJS service is properly connected (Gmail/Outlook)",
            );
            console.error(
              '2. The "To Email" field in template contains exactly: {{user_email}}',
            );
            console.error("3. The email address format is valid:", cleanEmail);
            console.error(
              "4. Go to: https://dashboard.emailjs.com/admin/integration",
            );
            console.error(
              "   and verify your email service is active and connected",
            );
          }
        },
      );
    }
  });
});
// How Alerts Work Cards Auto-Hover Animation All Cards Together
document.addEventListener("DOMContentLoaded", function () {
  const howAlertsWorkCards = document.querySelectorAll(".how-alerts-work-card");
  if (howAlertsWorkCards.length === 0) return;

  let autoHoverInterval = null;
  let resumeTimeout = null;
  let isUserHovering = false;
  let isHovered = false;

  function setAutoHover(state) {
    howAlertsWorkCards.forEach((card) => {
      if (state) {
        card.classList.add("auto-hover");
      } else {
        card.classList.remove("auto-hover");
      }
    });
  }

  function startAutoHover() {
    // Clear any existing intervals/timeouts
    if (autoHoverInterval) {
      clearInterval(autoHoverInterval);
    }
    if (resumeTimeout) {
      clearTimeout(resumeTimeout);
    }

    // Initial state hover on
    setAutoHover(true);

    // Toggle every 4 seconds simple on/off cycle
    autoHoverInterval = setInterval(function () {
      if (!isUserHovering && !isHovered) {
        const currentState =
          howAlertsWorkCards[0].classList.contains("auto-hover");
        setAutoHover(!currentState);
      }
    }, 4000);
  }

  function stopAutoHover() {
    if (autoHoverInterval) {
      clearInterval(autoHoverInterval);
      autoHoverInterval = null;
    }
    if (resumeTimeout) {
      clearTimeout(resumeTimeout);
      resumeTimeout = null;
    }
    setAutoHover(false);
  }

  // Add hover event listeners to all cards
  howAlertsWorkCards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      isUserHovering = true;
      isHovered = true;
      stopAutoHover();
    });

    card.addEventListener("mouseleave", function () {
      isHovered = false;
      // Debounce resume
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
      }
      resumeTimeout = setTimeout(() => {
        isUserHovering = false;
        if (!isHovered) {
          startAutoHover();
        }
      }, 300);
    });
  });

  // Start after page load
  setTimeout(startAutoHover, 1000);
});

// ============================================
// KHALTI PAYMENT INTEGRATION
// ============================================

// Khalti Payment Callback Handler - Runs on page load to check if user was redirected back from Khalti
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status");
  const pidx = urlParams.get("pidx");

  // Only respond to actual Khalti URL callback params (popup polling handles everything else)
  if (status && pidx) {
    const banner = document.getElementById("khaltiCallbackBanner");
    const icon = document.getElementById("khaltiCallbackIcon");
    const title = document.getElementById("khaltiCallbackTitle");
    const message = document.getElementById("khaltiCallbackMessage");
    const closeBtn = document.getElementById("khaltiCallbackClose");

    if (!banner || !icon || !title || !message) return;

    // Clear the pending flag
    localStorage.removeItem("khaltiPaymentPending");

    // Hide the premium popup if it's showing
    const premiumPopup = document.getElementById("premiumPopup");
    if (premiumPopup) {
      premiumPopup.classList.remove("active");
      premiumPopup.style.display = "none";
      sessionStorage.setItem("premiumPopupClosed", "true");
    }

    if (status === "Completed") {
      const txnId =
        urlParams.get("transaction_id") || urlParams.get("tidx") || "";
      const amount = urlParams.get("amount") || "";
      const amountNRS = amount ? "NRS " + parseInt(amount) / 100 : "NRS 100";

      icon.innerHTML =
        '<svg width="72" height="72" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#10b981"/><path d="M8 12l3 3 5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      title.textContent = "Payment Successful!";
      message.textContent =
        "Your AirKTM Pro subscription is now active. Enjoy premium features!";
      banner.className = "khalti-status-overlay khalti-callback-success";

      // Show transaction details
      var detailsEl = document.getElementById("khaltiStatusDetails");
      if (detailsEl) {
        detailsEl.style.display = "block";
        detailsEl.innerHTML =
          "<p>Amount <strong>" +
          amountNRS +
          "</strong></p>" +
          (txnId
            ? "<p>Transaction <strong>" +
              txnId.substring(0, 16) +
              "</strong></p>"
            : "");
      }

      // Store Pro status
      localStorage.setItem("airktmProActive", "true");
      localStorage.setItem("airktmProTxn", txnId);
      localStorage.setItem("airktmProDate", new Date().toISOString());
    } else if (status === "User canceled") {
      icon.innerHTML =
        '<svg width="72" height="72" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#f59e0b"/><path d="M12 8v4M12 16h.01" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>';
      title.textContent = "Payment Canceled";
      message.textContent =
        "No worries! You can upgrade to Pro anytime from the Alerts page.";
      banner.className = "khalti-status-overlay khalti-callback-canceled";
    } else if (status === "Pending") {
      icon.innerHTML =
        '<svg width="72" height="72" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#3b82f6"/><circle cx="12" cy="12" r="6" stroke="white" stroke-width="2"/><path d="M12 9v3l2 1" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>';
      title.textContent = "Payment Pending";
      message.textContent =
        "Your payment is being processed. This may take a moment.";
      banner.className = "khalti-status-overlay khalti-callback-pending";
    }

    // Show overlay with animation
    banner.style.display = "flex";
    requestAnimationFrame(function () {
      banner.classList.add("show");
    });

    // Close button logic
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        banner.classList.remove("show");
        setTimeout(function () {
          banner.style.display = "none";
          // Auto reload to apply Pro status everywhere if payment was successful
          if (status === "Completed") {
            window.location.reload();
          }
        }, 400);
      });
    }

    // Auto-hide after 8 seconds
    setTimeout(function () {
      banner.classList.remove("show");
      setTimeout(function () {
        banner.style.display = "none";
        // Auto reload to apply Pro status everywhere if payment was successful
        if (status === "Completed") {
          window.location.reload();
        }
      }, 400);
    }, 8000);

    // Clean URL params without reloading the page
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {
      /* file:// protocol may not support this */
    }
  }
});

// Handle auto-continue Khalti after login
document.addEventListener("DOMContentLoaded", function () {
  window.addEventListener("auth:success", function () {
    if (sessionStorage.getItem("khaltiIntent") === "true") {
      sessionStorage.removeItem("khaltiIntent");

      // Check pro status from database before proceeding to payment
      const token = localStorage.getItem("airktm_token");
      if (token) {
        fetch(window.location.origin + "/api/auth/pro-status", {
          headers: { Authorization: "Bearer " + token },
        })
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            if (data.isPro) {
              // User already has Pro — sync localStorage and redirect to home
              localStorage.setItem("airktmProActive", "true");
              alert("You already have AirKTM Pro! Redirecting to homepage.");
              window.location.href = "/index.html";
              return;
            }

            // User is NOT pro — continue to Khalti payment
            const upgradeBtn = document.getElementById("khaltiUpgradeBtn");
            if (upgradeBtn) {
              // Ensure popup is shown so the user sees what's happening
              const popup = document.getElementById("premiumPopup");
              if (popup) {
                popup.style.display = "flex";
                popup.classList.add("active");
              }

              // Prompt user to click the button to bypass popup blockers
              const btnText = upgradeBtn.querySelector(".upgrade-btn-text");
              if (btnText) {
                btnText.innerHTML = "Logged In! Click to Pay";
              }

              // Add a pulse animation class to draw attention
              upgradeBtn.classList.add("pulse-animation");

              // Remove pulse after they click it
              upgradeBtn.addEventListener("click", function removePulse() {
                upgradeBtn.classList.remove("pulse-animation");
                upgradeBtn.removeEventListener("click", removePulse);
              });
            }
          })
          .catch(function (err) {
            console.error("Error checking pro status:", err);
            // On error, still show payment flow as fallback
            const upgradeBtn = document.getElementById("khaltiUpgradeBtn");
            if (upgradeBtn) {
              const popup = document.getElementById("premiumPopup");
              if (popup) {
                popup.style.display = "flex";
                popup.classList.add("active");
              }
              const btnText = upgradeBtn.querySelector(".upgrade-btn-text");
              if (btnText) {
                btnText.innerHTML = "Logged In! Click to Pay";
              }
              upgradeBtn.classList.add("pulse-animation");
            }
          });
      }
    }
  });

  // Check if the user was directed to this page with action=upgrade (e.g., from a magic link or homepage redirect)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("action") === "upgrade") {
    const upgradeBtn = document.getElementById("khaltiUpgradeBtn");
    const token = localStorage.getItem("airktm_token");

    // Only trigger this if the user is authenticated (which they should be via the auth:success flow or magic link)
    if (upgradeBtn && token) {
      // First clear the param to prevent loops on refresh
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      // Check pro status to prevent showing popup to active pro users
      fetch(window.location.origin + "/api/auth/pro-status", {
        headers: { Authorization: "Bearer " + token },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.isPro) {
            localStorage.setItem("airktmProActive", "true");
            alert("You already have AirKTM Pro!");
            return;
          }

          // Show the popup explicitly
          const popup = document.getElementById("premiumPopup");
          if (popup) {
            popup.style.display = "flex";
            // Need small delay for transition
            setTimeout(() => popup.classList.add("active"), 50);
          }

          const btnText = upgradeBtn.querySelector(".upgrade-btn-text");
          if (btnText) {
            btnText.innerHTML = "Click to Pay";
          }
          upgradeBtn.classList.add("pulse-animation");

          // Remove pulse after they click it
          upgradeBtn.addEventListener("click", function removePulse() {
            upgradeBtn.classList.remove("pulse-animation");
            upgradeBtn.removeEventListener("click", removePulse);
          });
        })
        .catch(console.error);
    }
  }
});

// Khalti Payment Initiation - Upgrade Button Click Handler
document.addEventListener("DOMContentLoaded", function () {
  const upgradeBtn = document.getElementById("khaltiUpgradeBtn");
  if (!upgradeBtn) return;

  // Check if already a Pro user (localStorage first, then verify from DB)
  const isProUser = localStorage.getItem("airktmProActive") === "true";
  if (isProUser) {
    const btnText = upgradeBtn.querySelector(".upgrade-btn-text");
    if (btnText) {
      btnText.innerHTML = "✓ AirKTM Pro Active";
    }
    upgradeBtn.classList.add("khalti-pro-active");
    upgradeBtn.disabled = true;

    // Also suppress popup on next visit
    sessionStorage.setItem("premiumPopupClosed", "true");
  }

  // Also check from database if user is logged in (handles cross-device sync)
  var dbCheckToken = localStorage.getItem("airktm_token");
  if (dbCheckToken && !isProUser) {
    fetch(window.location.origin + "/api/auth/pro-status", {
      headers: { Authorization: "Bearer " + dbCheckToken },
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.isPro) {
          localStorage.setItem("airktmProActive", "true");
          var btnText = upgradeBtn.querySelector(".upgrade-btn-text");
          if (btnText) {
            btnText.innerHTML = "✓ AirKTM Pro Active";
          }
          upgradeBtn.classList.add("khalti-pro-active");
          upgradeBtn.disabled = true;
          sessionStorage.setItem("premiumPopupClosed", "true");

          // Suppress popup if showing
          var popup = document.getElementById("premiumPopup");
          if (popup) {
            popup.classList.remove("active");
            popup.style.display = "none";
          }
        }
      })
      .catch(function (err) {
        console.error("DB pro-status check failed:", err);
      });
  }

  upgradeBtn.addEventListener("click", function () {
    // Prevent double-clicks
    if (
      upgradeBtn.disabled ||
      upgradeBtn.classList.contains("khalti-processing")
    )
      return;

    // If already pro, do nothing
    if (localStorage.getItem("airktmProActive") === "true") return;

    // --- AUTHENTICATION CHECK ---
    const token = localStorage.getItem("airktm_token");
    if (!token) {
      // Not logged in -> show login modal
      const authModal = document.getElementById("authModalOverlay");
      if (authModal) {
        // First close the premium popup
        const premiumPopup = document.getElementById("premiumPopup");
        if (premiumPopup) {
          premiumPopup.classList.remove("active");
          setTimeout(function () {
            premiumPopup.style.display = "none";
          }, 400);
        }

        // Show login modal
        authModal.classList.add("active");

        // Switch to login tab
        const loginTab = document.getElementById("authTabLogin");
        if (loginTab) loginTab.click();

        // Update subtitle to guide the user
        const subtitleEl = document.getElementById("authModalSubtitle");
        if (subtitleEl)
          subtitleEl.textContent = "Log in to upgrade to AirKTM Pro";

        // Set intent flag so we can auto-continue after login
        sessionStorage.setItem("khaltiIntent", "true");

        // Update Google login to include khaltiIntent in returnTo
        document.querySelectorAll(".auth-google-btn").forEach(function (btn) {
          btn.onclick = function (e) {
            e.preventDefault();
            const currentPath =
              window.location.pathname + window.location.search;
            const separator = currentPath.includes("?") ? "&" : "?";
            const returnTo = currentPath + separator + "khaltiIntent=true";
            window.location.href =
              window.location.origin +
              "/api/auth/google?returnTo=" +
              encodeURIComponent(returnTo);
          };
        });
      }
      return;
    }
    // -----------------------------

    const btnText = upgradeBtn.querySelector(".upgrade-btn-text");
    const btnLoading = upgradeBtn.querySelector(".upgrade-btn-loading");
    const feedback = document.getElementById("khaltiPaymentFeedback");
    const feedbackText = document.getElementById("khaltiFeedbackText");

    // Show loading state
    if (btnText) btnText.style.display = "none";
    if (btnLoading) btnLoading.style.display = "inline-flex";
    upgradeBtn.classList.add("khalti-processing");
    upgradeBtn.disabled = true;

    // Hide previous feedback
    if (feedback) feedback.style.display = "none";

    // Capture selected alert location before payment
    var selectedLocationDropdown = document.getElementById(
      "alertLocationSelect",
    );
    var selectedAlertLocation = selectedLocationDropdown
      ? selectedLocationDropdown.value
      : "Ratnapark";
    localStorage.setItem("airktmPendingAlertLocation", selectedAlertLocation);

    // Generate unique order ID
    const orderId = "AIRKTM-PRO-" + Date.now();

    // Build proper return URL pointing to the lightweight callback page
    var currentPath = window.location.href.split("?")[0];
    var basePath = currentPath.substring(0, currentPath.lastIndexOf("/") + 1);
    var callbackUrl = basePath + "payment-callback.html";
    var siteUrl =
      window.location.origin !== "null" ? window.location.origin : basePath;

    // Get current user details for Khalti payload
    let userName = "AirKTM User";
    let userEmail = "user@airktm.com";
    try {
      const userStr = localStorage.getItem("airktm_user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.name) userName = userObj.name;
        if (userObj.email) userEmail = userObj.email;
      }
    } catch (e) {}

    // Khalti Sandbox Configuration
    const khaltiConfig = {
      return_url: callbackUrl,
      website_url: siteUrl,
      amount: 10000, // NRS 100 in paisa
      purchase_order_id: orderId,
      purchase_order_name: "AirKTM Pro Subscription",
      customer_info: {
        name: userName,
        email: userEmail,
        phone: "9800000000",
      },
      product_details: [
        {
          identity: "airktm-pro-monthly",
          name: "AirKTM Pro Monthly Subscription",
          total_price: 10000,
          quantity: 1,
          unit_price: 10000,
        },
      ],
    };

    // Initiate payment via Khalti Sandbox API (via CORS proxy for file:// compatibility)
    const khaltiApiUrl = "https://dev.khalti.com/api/v2/epayment/initiate/";
    const proxyUrl =
      "https://corsproxy.io/?" + encodeURIComponent(khaltiApiUrl);

    fetch(proxyUrl, {
      method: "POST",
      headers: {
        Authorization: "key 05bf95cc57244045b8df5fad06748dab",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(khaltiConfig),
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (err) {
            throw new Error(
              err.detail || err.message || "Payment initiation failed",
            );
          });
        }
        return response.json();
      })
      .then(function (data) {
        if (data.payment_url) {
          // Set pending flag before opening payment
          localStorage.setItem("khaltiPaymentPending", "true");

          // Open Khalti in a centered popup window instead of full redirect
          var popupWidth = 620;
          var popupHeight = 780;
          var left = Math.max(0, (window.screen.width - popupWidth) / 2);
          var top = Math.max(0, (window.screen.height - popupHeight) / 2);
          var popupFeatures =
            "width=" +
            popupWidth +
            ",height=" +
            popupHeight +
            ",left=" +
            left +
            ",top=" +
            top +
            ",scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=yes,status=yes";

          var khaltiPopup = window.open(
            data.payment_url,
            "KhaltiPayment",
            popupFeatures,
          );

          // If popup was blocked, fall back to full redirect
          if (!khaltiPopup || khaltiPopup.closed) {
            window.location.href = data.payment_url;
            return;
          }

          // Poll to detect when popup is closed (payment done or canceled)
          var pollTimer = setInterval(function () {
            try {
              if (khaltiPopup.closed) {
                clearInterval(pollTimer);

                // Reset button state
                if (btnText) btnText.style.display = "inline";
                if (btnLoading) btnLoading.style.display = "none";
                upgradeBtn.classList.remove("khalti-processing");
                upgradeBtn.disabled = false;

                // Check payment result from the callback page (stored in localStorage)
                var paymentResult = localStorage.getItem("khaltiPaymentResult");
                localStorage.removeItem("khaltiPaymentResult");
                localStorage.removeItem("khaltiPaymentPending");

                if (paymentResult === "success") {
                  // Update button to Pro Active
                  if (btnText) btnText.innerHTML = "✓ AirKTM Pro Active";
                  upgradeBtn.classList.add("khalti-pro-active");
                  upgradeBtn.disabled = true;

                  // Persist Pro status to database (including alert location)
                  var proToken = localStorage.getItem("airktm_token");
                  var proTxnId = localStorage.getItem("airktmProTxn") || "";
                  var pendingAlertLocation =
                    localStorage.getItem("airktmPendingAlertLocation") ||
                    "Ratnapark";
                  localStorage.removeItem("airktmPendingAlertLocation");
                  localStorage.setItem(
                    "airktmAlertLocation",
                    pendingAlertLocation,
                  );
                  if (proToken) {
                    fetch(window.location.origin + "/api/auth/pro-activate", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + proToken,
                      },
                      body: JSON.stringify({
                        transactionId: proTxnId,
                        alertLocation: pendingAlertLocation,
                      }),
                    })
                      .then(function (res) {
                        return res.json();
                      })
                      .then(function (data) {
                        console.log("Pro status saved to DB:", data);
                      })
                      .catch(function (err) {
                        console.error("Failed to save pro status to DB:", err);
                      });
                  }

                  // Also subscribe to Flask email alert system
                  var storedUserData = localStorage.getItem("airktm_user");
                  var userEmail = "";
                  if (storedUserData) {
                    try {
                      userEmail = JSON.parse(storedUserData).email || "";
                    } catch (e) {}
                  }
                  if (userEmail && pendingAlertLocation) {
                    var flaskBase =
                      window.location.protocol +
                      "//" +
                      window.location.hostname +
                      ":5050";
                    fetch(flaskBase + "/api/subscribe", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: userEmail,
                        station: pendingAlertLocation,
                      }),
                    })
                      .then(function (res) {
                        return res.json();
                      })
                      .then(function (data) {
                        console.log("Flask alert subscription:", data);
                      })
                      .catch(function (err) {
                        console.error(
                          "Flask subscribe failed (non-critical):",
                          err,
                        );
                      });
                  }

                  // Show success banner
                  var banner = document.getElementById("khaltiCallbackBanner");
                  var bannerIcon =
                    document.getElementById("khaltiCallbackIcon");
                  var bannerTitle = document.getElementById(
                    "khaltiCallbackTitle",
                  );
                  var bannerMessage = document.getElementById(
                    "khaltiCallbackMessage",
                  );

                  if (banner && bannerIcon && bannerTitle && bannerMessage) {
                    bannerIcon.innerHTML =
                      '<svg width="72" height="72" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#10b981"/><path d="M8 12l3 3 5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                    bannerTitle.textContent = "Payment Successful!";
                    bannerMessage.textContent =
                      "Your AirKTM Pro subscription is now active. Enjoy premium features!";
                    banner.className =
                      "khalti-status-overlay khalti-callback-success";
                    banner.style.display = "flex";
                    requestAnimationFrame(function () {
                      banner.classList.add("show");
                    });

                    // Close the premium popup
                    var premiumPopup = document.getElementById("premiumPopup");
                    if (premiumPopup) {
                      premiumPopup.classList.remove("active");
                      setTimeout(function () {
                        premiumPopup.style.display = "none";
                      }, 400);
                      sessionStorage.setItem("premiumPopupClosed", "true");
                    }

                    // Auto-hide overlay after 8s
                    setTimeout(function () {
                      banner.classList.remove("show");
                      setTimeout(function () {
                        banner.style.display = "none";
                        window.location.reload();
                      }, 400);
                    }, 8000);

                    var bannerClose = document.getElementById(
                      "khaltiCallbackClose",
                    );
                    if (bannerClose) {
                      bannerClose.addEventListener("click", function () {
                        banner.classList.remove("show");
                        setTimeout(function () {
                          banner.style.display = "none";
                          window.location.reload();
                        }, 400);
                      });
                    }
                  }
                } else if (paymentResult === "canceled") {
                  // Show canceled feedback
                  if (feedback && feedbackText) {
                    feedbackText.textContent =
                      "Payment was canceled. You can try again anytime.";
                    feedback.style.display = "block";
                    feedback.className =
                      "khalti-payment-feedback khalti-feedback-canceled";
                    setTimeout(function () {
                      feedback.style.display = "none";
                    }, 6000);
                  }
                }
              }
            } catch (e) {
              // Cross-origin access error is expected, just keep polling
            }
          }, 500);
        } else {
          throw new Error("No payment URL received from Khalti");
        }
      })
      .catch(function (error) {
        console.error("Khalti payment error:", error);

        // Reset button
        if (btnText) btnText.style.display = "inline";
        if (btnLoading) btnLoading.style.display = "none";
        upgradeBtn.classList.remove("khalti-processing");
        upgradeBtn.disabled = false;

        // Show error feedback
        if (feedback && feedbackText) {
          feedbackText.textContent =
            "⚠ " +
            (error.message || "Payment initiation failed. Please try again.");
          feedback.style.display = "block";
          feedback.className = "khalti-payment-feedback khalti-feedback-error";

          setTimeout(function () {
            feedback.style.display = "none";
          }, 6000);
        }
      });
  });
});

// Suppress Premium Popup for Pro Users
document.addEventListener("DOMContentLoaded", function () {
  if (localStorage.getItem("airktmProActive") === "true") {
    const popup = document.getElementById("premiumPopup");
    if (popup) {
      popup.classList.remove("active");
      popup.style.display = "none";
      sessionStorage.setItem("premiumPopupClosed", "true");
    }
  }
});

// Dynamic Recent Alerts
document.addEventListener("DOMContentLoaded", function () {
  loadDynamicAlerts();
});

function formatAlertTimestamp(timestamp) {
  if (!timestamp) return "Unknown";
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return "Unknown";
  }
}

async function loadDynamicAlerts() {
  const alertsContainer = document.getElementById("alertsRecentList");
  if (!alertsContainer) return;

  if (typeof fetchAirQualityData === "undefined") {
    alertsContainer.innerHTML =
      '<div style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load alerts. API not available.</div>';
    return;
  }

  try {
    // Fetch real data
    const stations = await fetchAirQualityData();

    if (!stations || stations.length === 0) {
      alertsContainer.innerHTML =
        '<div style="text-align: center; color: #64748b; padding: 2rem;">No recent alerts available.</div>';
      return;
    }

    // Initialize Banner Carousel
    initBannerCarousel(stations);

    // Sort by highest AQI first (most critical alerts)
    stations.sort((a, b) => b.aqi - a.aqi);

    // Take top 3 stations for alerts
    const topStations = stations.slice(0, 3);
    let alertsHTML = "";

    topStations.forEach((station) => {
      const aqi = station.aqi || 0;

      // Determine alert styling class based on AQI
      let alertClass = "";
      let styleOverride = "";

      if (aqi > 200) {
        alertClass = "alerts-page-alert-hazardous";
        styleOverride = "border-left-color: #9333ea;"; // Purple
      } else if (aqi > 150) {
        alertClass = "alerts-page-alert-very-unhealthy";
        styleOverride = "border-left-color: #ef4444;"; // Red
      } else if (aqi > 100) {
        alertClass = "alerts-page-alert-unhealthy";
        styleOverride = "border-left-color: #f97316;"; // Orange
      } else if (aqi > 50) {
        alertClass = "alerts-page-alert-moderate";
        styleOverride = "border-left-color: #eab308;"; // Yellow
      } else {
        alertClass = "alerts-page-alert-good";
        styleOverride = "border-left-color: #22c55e;"; // Green
      }

      // Using api.js helper functions for emoji and messages
      const emoji = station.emoji || "💬";

      // Generate title and message
      let title = `${station.category} Air Quality`;
      if (aqi <= 50) title = "Good Air Quality";
      else if (aqi > 300) title = "Hazardous Air Quality";

      // Specific health message override for alerts card format
      let healthMsg = station.message;
      if (aqi > 150) {
        healthMsg = `AQI reached ${aqi} in ${station.name}. ${station.message}`;
      } else if (aqi > 50) {
        healthMsg = `AQI is ${aqi} in ${station.name}. ${station.message}`;
      } else {
        healthMsg = `AQI is an excellent ${aqi} in ${station.name}. ${station.message}`;
      }

      const timeString = formatAlertTimestamp(station.timestamp);
      const statusClass =
        aqi > 100 ? "alerts-page-status-active" : "alerts-page-status-resolved";

      alertsHTML += `
                <div class="alerts-page-alert-card ${alertClass}" style="${styleOverride}">
                    <div class="alerts-page-alert-emoji">${emoji}</div>
                    <div class="alerts-page-alert-content">
                        <h4 class="alerts-page-alert-card-title">${title}</h4>
                        <p class="alerts-page-alert-card-description">${healthMsg}</p>
                        <div class="alerts-page-alert-meta">
                            <span class="alerts-page-alert-time"></span>
                            <span class="alerts-page-alert-status ${statusClass}" style="text-transform: uppercase;">${timeString}</span>
                        </div>
                    </div>
                </div>
            `;
    });

    alertsContainer.innerHTML = alertsHTML;
  } catch (error) {
    console.error("Error loading dynamic alerts:", error);
    alertsContainer.innerHTML =
      '<div style="text-align: center; color: #ef4444; padding: 2rem;">Error loading alerts. Please try again later.</div>';
  }
}

function initBannerCarousel(stations) {
  const banner = document.getElementById("alertsPageBanner");
  const emojiEl = document.getElementById("alertsPageBannerEmoji");
  const aqiEl = document.getElementById("alertsPageBannerAqi");
  const msgEl = document.getElementById("alertsPageBannerMessage");

  if (
    !banner ||
    !emojiEl ||
    !aqiEl ||
    !msgEl ||
    !stations ||
    stations.length === 0
  )
    return;

  // Sort highest to lowest AQI, filter out invalid/0 ones
  const sortedStations = [...stations]
    .filter((s) => s.aqi > 0)
    .sort((a, b) => b.aqi - a.aqi);
  if (sortedStations.length === 0) return;

  let currentIndex = 0;

  function updateBanner() {
    const currentStation = sortedStations[currentIndex];

    // Add fade out
    banner.style.opacity = "0";

    setTimeout(() => {
      // Update content
      emojiEl.textContent = currentStation.emoji || "💬";
      aqiEl.textContent = `AQI: ${currentStation.aqi} in ${currentStation.name}`;
      msgEl.textContent =
        currentStation.category + " - " + currentStation.message;

      // Set background color based on severity (using gradient matched to the severity)
      if (currentStation.aqi > 200) {
        banner.style.background =
          "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)"; // Purple
      } else if (currentStation.aqi > 150) {
        banner.style.background =
          "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"; // Red
      } else if (currentStation.aqi > 100) {
        banner.style.background =
          "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"; // Orange
      } else if (currentStation.aqi > 50) {
        banner.style.background =
          "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)"; // Yellow
      } else {
        banner.style.background =
          "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"; // Green
      }

      // Fade in
      banner.style.opacity = "1";

      currentIndex = (currentIndex + 1) % sortedStations.length;
    }, 300); // Wait for fade out
  }

  // Initial setup for transitions
  banner.style.transition =
    "opacity 0.3s ease, background 0.3s ease, transform 0.3s ease";
  updateBanner();

  // Auto slide every 5 seconds
  setInterval(updateBanner, 5000);
}

// Pro users: show total AQI alert emails received (Mongo subscriber)
function showProEmailAlertStatsToast(total) {
  var prev = document.getElementById("proAlertStatsToast");
  if (prev) prev.remove();

  var el = document.createElement("div");
  el.id = "proAlertStatsToast";
  el.className = "pro-alert-stats-toast";
  el.setAttribute("role", "status");

  var msg =
    total === 0
      ? "You have not received any automated AQI alert emails from our monitoring system yet"
      : "You have received <strong>" +
        total +
        "</strong> air quality alert email" +
        (total === 1 ? "" : "s") +
        " to your inbox so far.";

  el.innerHTML =
    '<div class="pro-alert-stats-toast-inner"><span class="pro-alert-stats-badge">PRO</span><p class="pro-alert-stats-text">' +
    msg +
    "</p></div>";
  document.body.appendChild(el);

  requestAnimationFrame(function () {
    el.classList.add("pro-alert-stats-toast--visible");
  });

  setTimeout(function () {
    el.classList.remove("pro-alert-stats-toast--visible");
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 400);
  }, 3000);
}

document.addEventListener("DOMContentLoaded", function () {
  var token = localStorage.getItem("airktm_token");
  if (!token) return;

  function flaskApiBase() {
    return (
      window.location.protocol +
      "//" +
      window.location.hostname +
      ":5050"
    );
  }

  function sumAlertCountsFromSubscriptions(payload) {
    var subs = (payload && payload.subscriptions) || [];
    return subs.reduce(function (acc, row) {
      return acc + (Number(row.email_alerts_sent) || 0);
    }, 0);
  }

  // Defer so auth UI / premium modal layout settle; toast z-index is above modals
  setTimeout(function () {
    fetch(window.location.origin + "/api/auth/user", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (user) {
        if (!user || !user.isPro) return null;
        var email = (user.email || "").trim();
        if (!email) return null;

        return fetch(
          flaskApiBase() +
            "/api/subscribe/status?email=" +
            encodeURIComponent(email),
        ).then(function (fr) {
          if (fr.ok) {
            return fr.json().then(function (subData) {
              return { total: sumAlertCountsFromSubscriptions(subData) };
            });
          }
          return fetch(
            window.location.origin + "/api/auth/email-alert-count",
            { headers: { Authorization: "Bearer " + token } },
          ).then(function (nr) {
            if (!nr.ok) return null;
            return nr.json();
          });
        });
      })
      .then(function (data) {
        if (!data || typeof data.total !== "number") return;
        showProEmailAlertStatsToast(data.total);
      })
      .catch(function () {
        /* non-critical */
      });
  }, 800);
});
