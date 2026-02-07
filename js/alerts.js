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
