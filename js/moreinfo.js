
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

    // Matter Cards Auto-Hover Animation All Cards Together (Optimized)
    const matterCards = document.querySelectorAll('.matter-card');
    if (matterCards.length === 0) return;
    
        let autoHoverInterval = null;
    let resumeTimeout = null;
        let isUserHovering = false;
    let isHovered = false;
        
    function setAutoHover(state) {
                matterCards.forEach(card => {
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
        
        // Initial state: hover on
        setAutoHover(true);
                
        // Toggle every 4 seconds - simple on/off cycle
        autoHoverInterval = setInterval(function() {
            if (!isUserHovering && !isHovered) {
                const currentState = matterCards[0].classList.contains('auto-hover');
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
        matterCards.forEach(card => {
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

    // AQI Gauge Needle Animation with Color Change
    const needleGroup = document.querySelector('.needle-group');
    const innerCircle = document.getElementById('gaugeInnerCircle');
    
    if (needleGroup && innerCircle) {
        // Segment colors matching the gauge
        const segmentColors = {
            green: '#4ade80',      // Good (0-50)
            yellow: '#fde047',     // Moderate (50-100)
            orange: '#fb923c',     // Unhealthy for Sensitive (100-150)
            red: '#ef4444',        // Unhealthy (150-200)
            purple: '#a855f7',     // Very Unhealthy (200-300)
            darkRed: '#991b1b'     // Hazardous (300-500)
        };

        // Function to determine color based on rotation angle
        function getColorForAngle(angle) {
            // Normalize angle to -90 to 90 range
            if (angle < -90) angle = -90;
            if (angle > 90) angle = 90;
            
            if (angle >= -90 && angle < -60) return segmentColors.green;      // Good
            if (angle >= -60 && angle < -30) return segmentColors.yellow;     // Moderate
            if (angle >= -30 && angle < 0) return segmentColors.orange;       // Unhealthy for Sensitive
            if (angle >= 0 && angle < 30) return segmentColors.red;           // Unhealthy
            if (angle >= 30 && angle < 60) return segmentColors.purple;       // Very Unhealthy
            if (angle >= 60 && angle <= 90) return segmentColors.darkRed;     // Hazardous
            return segmentColors.green;
        }

        // Update color based on computed transform
        function updateGaugeColor() {
            const computedStyle = window.getComputedStyle(needleGroup);
            const transform = computedStyle.transform;
            
            if (transform && transform !== 'none') {
                // Extract rotation angle from matrix
                const matrix = transform.match(/matrix\(([^)]+)\)/);
                if (matrix) {
                    const values = matrix[1].split(',');
                    const a = parseFloat(values[0]);
                    const b = parseFloat(values[1]);
                    const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
                    
                    // Determine color based on angle
                    const color = getColorForAngle(angle);
                    innerCircle.setAttribute('fill', color);
                }
            }
        }

        // Update color continuously during animation
        setInterval(updateGaugeColor, 100);
        
        // Initial color
        innerCircle.setAttribute('fill', segmentColors.green);
    }
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
