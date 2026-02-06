
// FAQ Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            // Close all other FAQ items
            faqQuestions.forEach(q => {
                if (q !== this) {
                    q.setAttribute('aria-expanded', 'false');
                    q.parentElement.classList.remove('active');
                }
            });
            
            // Toggle current FAQ item
            this.setAttribute('aria-expanded', !isExpanded);
            faqItem.classList.toggle('active');
        });
    });
});

// PHCC Popup Modal - Show on page load
document.addEventListener('DOMContentLoaded', function() {
    const popupOverlay = document.getElementById('phccPopup');
    const closeBtn = document.getElementById('phccPopupClose');
    
    if (!popupOverlay) {
        console.error('PHCC popup overlay not found');
        return;
    }
    
    // Check if popup has been closed in this session
    const popupClosed = sessionStorage.getItem('phccPopupClosed');
    
    // Only show popup if it hasn't been closed before in this session
    if (!popupClosed) {
        // Make sure overlay is visible
        popupOverlay.style.display = 'flex';
        setTimeout(function() {
            popupOverlay.classList.add('active');
        }, 100);
        
        // Show hint after 5 seconds, then hide after 3 more seconds
        const closeHint = document.getElementById('phccCloseHint');
        let hintTimeout = setTimeout(function() {
            if (closeHint && popupOverlay.classList.contains('active')) {
                closeHint.classList.add('show');
                // Hide hint after 3 seconds
                setTimeout(function() {
                    if (closeHint) {
                        closeHint.classList.remove('show');
                    }
                }, 3000);
            }
        }, 5000);
    } else {
        // Hide popup if it was already closed
        popupOverlay.style.display = 'none';
    }
    
    // Close popup function
    function closePopup() {
        const closeHint = document.getElementById('phccCloseHint');
        if (closeHint) {
            closeHint.classList.remove('show');
        }
        popupOverlay.classList.remove('active');
        // Save to sessionStorage that popup was closed
        sessionStorage.setItem('phccPopupClosed', 'true');
        setTimeout(function() {
            popupOverlay.style.display = 'none';
        }, 300);
    }
    
    // Close on X button click
    if (closeBtn) {
        closeBtn.addEventListener('click', closePopup);
    }
    
    // Close on overlay click (outside the image)
    popupOverlay.addEventListener('click', function(e) {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && popupOverlay.classList.contains('active')) {
            closePopup();
        }
    });
});
