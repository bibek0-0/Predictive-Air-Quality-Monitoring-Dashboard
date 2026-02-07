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
  const popupClosed = sessionStorage.getItem("premiumPopupClosed");

  // Only show popup if it hasn't been closed before in this session
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
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('alertsEmailInput');
    if (!emailInput) return;
    
    const placeholderText = 'Enter your email address';
    let currentIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    
    function typePlaceholder() {
        if (emailInput.value !== '') {
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
    emailInput.addEventListener('focus', function() {
        emailInput.placeholder = placeholderText;
    });
    
    // Resume animation when user blurs (if input is empty)
    emailInput.addEventListener('blur', function() {
        if (emailInput.value === '') {
            currentIndex = 0;
            isDeleting = false;
            setTimeout(typePlaceholder, 500);
        }
    });
});
// Handle subscription form
document.addEventListener('DOMContentLoaded', function() {
    const subscriptionForm = document.getElementById('alertsSubscriptionForm');
    if (!subscriptionForm) {
        console.error('Subscription form not found');
        return;
    }
    
    subscriptionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const email = document.getElementById('alertsEmailInput').value.trim();
        const successMessage = document.getElementById('alertsSuccessMessage');
        const errorMessage = document.getElementById('alertsErrorMessage');
        const emailInput = document.getElementById('alertsEmailInput');
        const emailWrapper = emailInput.closest('.alerts-page-email-input-wrapper');
        
        // Hide previous messages
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';
        emailInput.classList.remove('alerts-page-email-input-error');
        
        // Define showError function
        function showError(message) {
            errorMessage.querySelector('p').textContent = message;
            errorMessage.style.display = 'flex';
            
            // Hide error message after 5 seconds
            setTimeout(() => {
                errorMessage.style.display = 'none';
                emailInput.classList.remove('alerts-page-email-input-error');
                emailWrapper.classList.remove('alerts-page-email-input-wrapper-error');
            }, 5000);
        }
        
        // Validate email
        if (!email) {
            showError('Please enter your email address');
            return;
        }
        
        // Check if email ends with @gmail.com
        const emailLower = email.toLowerCase();
        if (!emailLower.endsWith('@gmail.com')) {
            showError('Please use a @gmail.com email address');
            emailInput.classList.add('alerts-page-email-input-error');
            emailWrapper.classList.add('alerts-page-email-input-wrapper-error');
            return;
        }
        
        // Valid email - send email and show success
        emailInput.classList.remove('alerts-page-email-input-error');
        emailWrapper.classList.remove('alerts-page-email-input-wrapper-error');
        
        // Send welcome email
        sendWelcomeEmail(email);
        
        successMessage.style.display = 'flex';
        document.getElementById('alertsEmailInput').value = '';
        
        // Hide success message after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    
        function sendWelcomeEmail(userEmail) {
            // Validate and clean email address
            const cleanEmail = userEmail.trim().toLowerCase();
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanEmail)) {
                console.error('Invalid email format:', cleanEmail);
                return;
            }
            
            // Get current time
            const now = new Date();
            const timeString = now.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Extract name from email
            const userName = cleanEmail.split('@')[0];
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
                            <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px; line-height: 1.2;">Thanks for subscribing AirKTM</h1>
                            <p style="margin: 0; font-size: 16px; color: #64748b; font-weight: 500; line-height: 1.5;">We're excited to have you on board!</p>
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
                                                    <a href="#" style="display: inline-block; padding: 12px 24px; background: #ffd700; color: #1a1a1a; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Upgrade Now</a>
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
            
            // Plain text fallback
            const plainMessage = 'Thanks for subscribing AirKTM!';
            
            // EmailJS template parameters 
            const templateParams = {
                user_email: cleanEmail,            // For "To Email" field  
                user_name: userName,                // For "From Name" field
                to_name: userName,                  // For display in content
                name: userName,                     // For message content
                email: cleanEmail,                  // For "Reply To" field 
                subject: 'Welcome to AirKTM - Thank You for Subscribing!',  // For "Subject" field
                message: htmlMessage,               // HTML email content with premium styling
                message_html: htmlMessage,          // Alternative HTML field 
                message_text: plainMessage,         // Plain text fallback
                time: timeString                    // For time display in content 
            };
            
            // Log the parameters being sent
            console.log('Sending email with parameters:', templateParams);
            console.log('Email address being sent:', cleanEmail);
            console.log('Email validation:', emailRegex.test(cleanEmail));
            
            // Send email using EmailJS
            emailjs.send('service_w7ts8ar', 'template_a615bmk', templateParams)
                .then(function(response) {
                    console.log('✅ Email sent successfully!', response.status, response.text);
                }, function(error) {
                    console.error('❌ Failed to send email:', error);
                    console.error('Error status:', error.status);
                    console.error('Error text:', error.text);
                    console.error('Error details:', JSON.stringify(error, null, 2));
                    
                    // Specific error handling
                    if (error.text && error.text.includes('template ID not found')) {
                        console.error('⚠️ Template ID not found. Please verify your template ID in EmailJS dashboard:');
                        console.error('Visit: https://dashboard.emailjs.com/admin/templates');
                        console.error('Current template ID: template_a615bmk');
                    } else if (error.text && error.text.includes('recipients address is corrupted')) {
                        console.error('⚠️ Recipients address error. Please check:');
                        console.error('1. Your EmailJS service is properly connected (Gmail/Outlook)');
                        console.error('2. The "To Email" field in template contains exactly: {{user_email}}');
                        console.error('3. The email address format is valid:', cleanEmail);
                        console.error('4. Go to: https://dashboard.emailjs.com/admin/integration');
                        console.error('   and verify your email service is active and connected');
                    }
                    
                });
        }
    });
});
// How Alerts Work Cards Auto-Hover Animation All Cards Together 
document.addEventListener('DOMContentLoaded', function() {
    const howAlertsWorkCards = document.querySelectorAll('.how-alerts-work-card');
    if (howAlertsWorkCards.length === 0) return;
    
    let autoHoverInterval = null;
    let resumeTimeout = null;
    let isUserHovering = false;
    let isHovered = false;
    
    function setAutoHover(state) {
        howAlertsWorkCards.forEach(card => {
            if (state) {
                card.classList.add('auto-hover');
            } else {
                card.classList.remove('auto-hover');
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
        autoHoverInterval = setInterval(function() {
            if (!isUserHovering && !isHovered) {
                const currentState = howAlertsWorkCards[0].classList.contains('auto-hover');
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
    howAlertsWorkCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            isUserHovering = true;
            isHovered = true;
            stopAutoHover();
        });
        
        card.addEventListener('mouseleave', function() {
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
