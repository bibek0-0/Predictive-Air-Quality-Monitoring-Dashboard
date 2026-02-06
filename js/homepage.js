// ============================================
// HOMEPAGE JS CODES
// ============================================

// Global variables for map and data management
let mapInstance = null;
let mapMarkers = [];
let updateIntervalId = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    // Explore button functionality - scroll to map
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
            // Navigate to More Info page (will be implemented later)
            const moreInfoLink = Array.from(document.querySelectorAll('.nav-link')).find(
                link => link.textContent === 'More Info'
            );
            if (moreInfoLink) {
                // For now, just show an alert
                // Later this will navigate to the more info page
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
    startRealTimeUpdates();

    // Intersection Observer for scroll animations
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

    // Intersection Observer for combined actions & capabilities section
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

    // Scroll Indicator - Show/Hide based on scroll position
    const scrollIndicator = document.getElementById('scrollIndicator');
    if (scrollIndicator) {
        function checkScrollPosition() {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollBottom = scrollTop + windowHeight;
            
            // Show indicator if not at bottom (with 100px threshold)
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

// ============================================
// HOMEPAGE JS CODES - Functions
// ============================================

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

// No fallback data - using API data only

// Helper Functions for Map
// Get AQI color based on value
function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400'; // Green - Good
    if (aqi <= 100) return '#ffff00'; // Yellow - Moderate
    if (aqi <= 150) return '#ff7e00'; // Orange - Unhealthy
    if (aqi <= 200) return '#ff0000'; // Red - Very Unhealthy
    return '#8f3f97'; // Purple - Hazardous
}

// Get text color based on background (for contrast)
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
    
    // Initialize map centered on Nepal (showing entire country)
    mapInstance = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: false, // Disabled by default
        doubleClickZoom: true
    }).setView([28.3949, 84.1240], 7);  // Center of Nepal, zoom level 7 to show entire country
    
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
    loadAirQualityData();
}

/**
 * Load air quality data from API or use fallback
 */
async function loadAirQualityData() {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingState();
    
    try {
        let data = [];
        
        if (typeof API_CONFIG !== 'undefined' && API_CONFIG.waqi && API_CONFIG.waqi.enabled) {
            const waqiData = await fetchWAQINepalData();
            if (waqiData && waqiData.length > 0) {
                data = waqiData;
                console.log(`✓ WAQI API: ${data.length} stations found across Nepal`);
            } else {
                throw new Error('No data received from WAQI API');
            }
        } else {
            throw new Error('WAQI API is not enabled');
        }
        
        if (data.length === 0) {
            throw new Error('No data received from API');
        }
        
        console.log(`✓ Total stations: ${data.length}`);
        
        if (data && data.length > 0) {
            const fetchedAt = new Date().toISOString();
            data.forEach(station => {
                station.fetchedAt = fetchedAt;
            });
            updateMapMarkers(data);
            hideLoadingState();
            showLastUpdateTime();
        } else {
            throw new Error('No data received from API');
        }
    } catch (error) {
        console.error('Error loading air quality data:', error);
        hideLoadingState();
        showErrorState(`Unable to load air quality data: ${error.message}. Please check your internet connection and API configuration.`);
        // Don't update map markers if API fails - show error instead
    } finally {
        isLoading = false;
    }
}

/**
 * Format timestamp for display (relative time)
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        return date.toLocaleString();
    } catch (e) {
        return new Date(timestamp).toLocaleTimeString();
    }
}

/**
 * Update map markers with new data
 */
function updateMapMarkers(data) {
    if (!mapInstance) return;
    
    // Clear existing markers and intervals
    mapMarkers.forEach(marker => {
        if (marker._timestampInterval) {
            clearInterval(marker._timestampInterval);
        }
        mapInstance.removeLayer(marker);
    });
    mapMarkers = [];
    
    // Filter out stations with invalid coordinates, but keep those with AQI = 0
    const validData = data.filter(location => 
        location && 
        location.lat && 
        location.lng && 
        !isNaN(location.lat) && 
        !isNaN(location.lng) &&
        location.lat !== 0 && 
        location.lng !== 0
    );
    
    console.log(`Displaying ${validData.length} stations on map`);
    
    // Add new markers
    validData.forEach(location => {
        // Use gray color for stations with no AQI data
        const aqiColor = location.aqi > 0 ? getAQIColor(location.aqi) : '#9ca3af';
        const textColor = getTextColor(aqiColor);

        // Create custom icon
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 24px;
                height: 24px;
                background-color: ${aqiColor};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        // Create marker
        const marker = L.marker([location.lat, location.lng], {
            icon: customIcon
        }).addTo(mapInstance);

        // Function to create popup content with current timestamps
        const createPopupContent = (loc) => {
            const aqiDisplay = loc.aqi > 0 ? `AQI ${loc.aqi}` : 'AQI N/A';
            const apiTime = loc.timestamp ? formatTimestamp(loc.timestamp) : 'Unknown';
            const fetchedTime = loc.fetchedAt ? formatTimestamp(loc.fetchedAt) : 'Just now';
            
            return `
            <div class="aqi-popup" style="color: ${textColor};">
                    <span class="aqi-emoji">${loc.emoji}</span>
                    <span class="aqi-value">${aqiDisplay}</span>
                    <div class="aqi-category">${loc.category}</div>
                    <div class="aqi-message">${loc.message}</div>
                    <div class="aqi-timestamp" style="font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.9; line-height: 1.4;">
                        ${loc.timestamp ? `<div>Data from API: ${apiTime}</div>` : ''}
                        <div>Fetched: ${fetchedTime}</div>
                    </div>
            </div>
        `;
        };
        
        const popupContent = createPopupContent(location);

        // Add popup (will be shown on hover)
        marker.bindPopup(popupContent, {
            className: 'aqi-popup-wrapper',
            maxWidth: 140,
            minWidth: 120,
            autoPan: true,
            autoPanPadding: [50, 50],
            closeOnClick: false,
            autoClose: false,
            closeButton: false
        });

        // Store location data in marker for dynamic timestamp updates
        marker._locationData = location;

        // Style the popup based on AQI color when it opens
        marker.on('popupopen', function() {
            const popup = marker.getPopup();
            const popupElement = popup.getElement();
            if (popupElement && marker._locationData) {
                // Update popup content with fresh timestamps (calculated in real-time)
                const updatedContent = createPopupContent(marker._locationData);
                popup.setContent(updatedContent);
                
                const contentWrapper = popupElement.querySelector('.leaflet-popup-content-wrapper');
                if (contentWrapper) {
                    contentWrapper.style.backgroundColor = aqiColor;
                    contentWrapper.style.border = 'none';
                    contentWrapper.style.boxShadow = `0 8px 32px ${aqiColor}40`;
                }
                const tip = popupElement.querySelector('.leaflet-popup-tip');
                if (tip) {
                    tip.style.backgroundColor = aqiColor;
                }
            }
        });
        
        // Update popup timestamps every 30 seconds if popup is open
        marker._timestampInterval = setInterval(() => {
            if (marker.isPopupOpen() && marker._locationData) {
                const popup = marker.getPopup();
                const updatedContent = createPopupContent(marker._locationData);
                popup.setContent(updatedContent);
            }
        }, 30000);

        // Show popup on hover (mouseover)
        marker.on('mouseover', function() {
            marker.openPopup();
        });

        // Hide popup when hover out (mouseout)
        marker.on('mouseout', function() {
            marker.closePopup();
        });
        
        mapMarkers.push(marker);
    });
}

/**
 * Start real-time data updates
 */
function startRealTimeUpdates() {
    // Clear any existing interval
    if (updateIntervalId) {
        clearInterval(updateIntervalId);
    }
    
    const interval = (typeof API_CONFIG !== 'undefined' && API_CONFIG.updateInterval) ? API_CONFIG.updateInterval : 60000;
    
    updateIntervalId = setInterval(() => {
        loadAirQualityData();
    }, interval);
}

/**
 * Stop real-time updates
 */
function stopRealTimeUpdates() {
    if (updateIntervalId) {
        clearInterval(updateIntervalId);
        updateIntervalId = null;
    }
}

/**
 * Show loading state on map
 */
function showLoadingState() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // Create or update loading indicator
    let loadingIndicator = document.getElementById('map-loading-indicator');
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'map-loading-indicator';
        loadingIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95);
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 600;
            color: #1f2937;
        `;
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(loadingIndicator);
    }
    
    loadingIndicator.innerHTML = `
        <div style="
            width: 20px;
            height: 20px;
            border: 3px solid #e5e7eb;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        "></div>
        <span>Loading real-time data...</span>
    `;
    
    // Add spin animation if not already in styles
    if (!document.getElementById('loading-spin-style')) {
        const style = document.createElement('style');
        style.id = 'loading-spin-style';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    const loadingIndicator = document.getElementById('map-loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

/**
 * Show error state
 */
function showErrorState(message) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    let errorIndicator = document.getElementById('map-error-indicator');
    if (!errorIndicator) {
        errorIndicator = document.createElement('div');
        errorIndicator.id = 'map-error-indicator';
        errorIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 0.75rem 1.25rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-size: 0.875rem;
            font-weight: 500;
            max-width: 300px;
        `;
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(errorIndicator);
    }
    
    errorIndicator.textContent = message;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorIndicator) {
            errorIndicator.style.opacity = '0';
            errorIndicator.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (errorIndicator) errorIndicator.remove();
            }, 300);
        }
    }, 5000);
}

/**
 * Show last update time with refresh button
 */
function showLastUpdateTime() {
    const mapHeader = document.querySelector('.map-header');
    if (!mapHeader) return;
    
    let updateContainer = document.getElementById('update-container');
    if (!updateContainer) {
        updateContainer = document.createElement('div');
        updateContainer.id = 'update-container';
        updateContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 0.5rem;
        `;
        mapHeader.appendChild(updateContainer);
        
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refresh-btn';
        refreshBtn.innerHTML = '🔄';
        refreshBtn.title = 'Refresh data now';
        refreshBtn.style.cssText = `
            background: var(--primary-color, #10b981);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        refreshBtn.onmouseover = () => refreshBtn.style.opacity = '0.8';
        refreshBtn.onmouseout = () => refreshBtn.style.opacity = '1';
        refreshBtn.onclick = () => {
            refreshBtn.style.transform = 'rotate(360deg)';
            refreshBtn.style.transition = 'transform 0.5s';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
            loadAirQualityData();
        };
        updateContainer.appendChild(refreshBtn);
    }
    
    let updateTimeElement = document.getElementById('last-update-time');
    if (!updateTimeElement) {
        updateTimeElement = document.createElement('div');
        updateTimeElement.id = 'last-update-time';
        updateTimeElement.style.cssText = `
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        `;
        updateContainer.appendChild(updateTimeElement);
    }
    
    updateTimeElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}
