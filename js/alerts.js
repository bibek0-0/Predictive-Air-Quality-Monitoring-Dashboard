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
        