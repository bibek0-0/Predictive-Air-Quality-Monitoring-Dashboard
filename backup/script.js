// ============================================
// SHARED CODE - Used across all pages
// ============================================

// Theme Toggle Functionality - Initialize immediately to prevent flash
(function() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
})();

// Navigation active link handling with enhanced animations
document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle click handler
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Allow navigation for actual page links (not # or anchor links)
            if (href && href !== '#' && !href.startsWith('#')) {
                // Allow default navigation behavior for page links
                return; // Don't prevent default, let the browser navigate
            }
            
            // For anchor links or # links, prevent default and handle locally
            e.preventDefault();
            
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            // Remove ripple after animation
            setTimeout(() => {
                ripple.remove();
            }, 600);
            
            // Remove active class from all links with fade out
            navLinks.forEach(l => {
                if (l !== this) {
                    l.style.opacity = '0.7';
                    setTimeout(() => {
                        l.classList.remove('active');
                        l.style.opacity = '1';
                    }, 150);
                }
            });
            
            // Add active class to clicked link
            this.style.opacity = '0.8';
            setTimeout(() => {
                this.classList.add('active');
                this.style.opacity = '1';
            }, 150);
        });
        
        // Add hover sound effect (optional - can be removed)
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        link.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateY(0) scale(1)';
            }
        });
    });
});

// ============================================
// MOREINFO JS CODES
// ============================================
// Note: More Info page specific JavaScript is embedded in more-info.html
// This section is reserved for any shared more-info functionality if needed in the future

// ============================================
// ALERTS JS CODES
// ============================================
// Note: Alerts page specific JavaScript is embedded in alerts.html
// This section is reserved for any shared alerts functionality if needed in the future

