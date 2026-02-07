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
