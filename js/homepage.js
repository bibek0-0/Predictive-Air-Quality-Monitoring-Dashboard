
// HOMEPAGE JS CODES

// Global variables for map and data management
let mapInstance = null;
let mapMarkers = [];
let updateIntervalId = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    // Explore button functionality 
    const exploreBtn = document.querySelector('.btn-primary');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', function() {
            scrollToMap();
        });
    }

    // Learn More button functionality
    const learnMoreBtn = document.querySelector('.btn-secondary');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function() {
            // Navigate to More Info page 
            const moreInfoLink = Array.from(document.querySelectorAll('.nav-link')).find(
                link => link.textContent === 'More Info'
            );
            if (moreInfoLink) {
                console.log('Navigate to More Info page');
            }
        });
    }

    // Smooth scroll for any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Initialize Air Quality Map with API integration
    initAirQualityMap();
    
    // Start real-time data updates 
    // startRealTimeUpdates();

    // for scroll animations
    const mapSection = document.getElementById('air-quality-map');
    if (mapSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });
        observer.observe(mapSection);
    }

    // for combined actions & capabilities section
    const combinedSection = document.getElementById('actions-capabilities');
    if (combinedSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });
        observer.observe(combinedSection);
    }

    // Scroll Indicator Show/Hide based on scroll position
    const scrollIndicator = document.getElementById('scrollIndicator');
    if (scrollIndicator) {
        function checkScrollPosition() {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollBottom = scrollTop + windowHeight;
            
            // Show indicator if not at bottom 
            if (scrollBottom < documentHeight - 100) {
                scrollIndicator.classList.add('visible');
            } else {
                scrollIndicator.classList.remove('visible');
            }
        }

        // Check on scroll
        window.addEventListener('scroll', checkScrollPosition);
        
        // Check on resize
        window.addEventListener('resize', checkScrollPosition);
        
        // Initial check with delay to ensure page is loaded
        setTimeout(() => {
            checkScrollPosition();
        }, 300);

        // Make indicator clickable to scroll down
        scrollIndicator.addEventListener('click', function() {
            window.scrollBy({
                top: window.innerHeight * 0.9,
                behavior: 'smooth'
            });
        });
    }
});

// HOMEPAGE JS CODES - Functions

// Scroll to map function
function scrollToMap() {
    const mapSection = document.getElementById('air-quality-map');
    if (mapSection) {
        const offset = 75; // Navbar height
        const elementPosition = mapSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// Initialize Leaflet Map
function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400'; // Green - Good
    if (aqi <= 100) return '#ffff00'; // Yellow - Moderate
    if (aqi <= 150) return '#ff7e00'; // Orange - Unhealthy
    if (aqi <= 200) return '#ff0000'; // Red - Very Unhealthy
    return '#8f3f97'; // Purple - Hazardous
}

// Get text color based on background 
function getTextColor(bgColor) {
    // For light colors (yellow), use dark text
    if (bgColor === '#ffff00' || bgColor === '#00e400') {
        return '#1f2937';
    }
    // For dark colors, use white text
    return '#ffffff';
}

// Initialize Leaflet Map
function initAirQualityMap() {
    // Wait for map container to be visible
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // Initialize map centered on Nepal 
    mapInstance = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: false, // Disabled by default
        doubleClickZoom: true
    }).setView([28.3949, 84.1240], 7);  // Center of Nepal, zoom level 7 
    
    // Enable scroll wheel zoom only when Ctrl (Windows/Linux) or Cmd (Mac) is held
    // This allows normal page scrolling when cursor is over map
    mapContainer.addEventListener('wheel', function(e) {
        if (e.ctrlKey || e.metaKey) {
            // Temporarily enable zoom when modifier key is held
            if (!mapInstance.scrollWheelZoom.enabled()) {
                mapInstance.scrollWheelZoom.enable();
            }
            // Allow the event to propagate to Leaflet for zooming
        } else {
            // Disable zoom and prevent event from reaching map
            if (mapInstance.scrollWheelZoom.enabled()) {
                mapInstance.scrollWheelZoom.disable();
            }
            // Stop propagation to allow normal page scrolling
            e.stopPropagation();
        }
    }, { passive: false, capture: true });
    
    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
        mapInstance.invalidateSize();
    }, 100);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(mapInstance);

    // Load initial data (try API first, fallback to static data)
}
