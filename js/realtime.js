
// REALTIME PAGE JAVASCRIPT

// Global variables
let realtimeMap = null;
let mapMarkers = [];
let allStations = [];
let currentStation = null;
let pollutantChart = null;
let aqiChart = null;
let comparisonChart = null;
let updateInterval = null;
let autoRotateInterval = null;

// AQI color mapping
function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
}

function getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

function getAQIEmoji(aqi) {
    if (aqi <= 50) return '😊';
    if (aqi <= 100) return '😐';
    if (aqi <= 150) return '😷';
    if (aqi <= 200) return '⚠️';
    return '🚨';
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return date.toLocaleString();
    } catch (e) {
        return 'Unknown';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeCharts();
    setupNavigationArrows();
    setupCityComparison();
    loadInitialData();
    
    // Start auto-refresh
    if (typeof API_CONFIG !== 'undefined') {
        updateInterval = setInterval(() => {
            loadInitialData();
        }, API_CONFIG.updateInterval || 60000);
    }
});

// Initialize Leaflet map
function initializeMap() {
    const mapContainer = document.getElementById('realtimeMap');
    if (!mapContainer) return;
    
    realtimeMap = L.map('realtimeMap', {
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true
    }).setView([27.7172, 85.3240], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(realtimeMap);
    
    setTimeout(() => {
        realtimeMap.invalidateSize();
    }, 100);
}

// Load initial data from API
async function loadInitialData() {
    try {
        if (typeof fetchAirQualityData === 'undefined') {
            console.error('API functions not loaded');
            return;
        }
        
        const data = await fetchAirQualityData();
        if (data && data.length > 0) {
            allStations = data;
            
            // Set default station (first one)
            if (!currentStation && data.length > 0) {
                currentStation = data[0];
            }
            
            if (currentStation) {
                updateCurrentAQIDisplay(currentStation);
                updateMapMarkers(data);
                renderRankings(data);
                updateCharts(currentStation);
                updateNavigationArrows();
                updateCityComparisonDropdowns(data);
                
                // Start auto-rotation after data is loaded
                startAutoRotation();
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}



// Setup navigation arrows
function setupNavigationArrows() {
    const prevBtn = document.getElementById('prevStationBtn');
    const nextBtn = document.getElementById('nextStationBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            navigateToStation(-1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            navigateToStation(1);
        });
    }
}

// Navigate to previous or next station
function navigateToStation(direction) {
    if (!currentStation || allStations.length === 0) return;
    
    const currentIndex = allStations.findIndex(s => s.name === currentStation.name);
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex + direction;
    
    // Wrap around
    if (newIndex < 0) {
        newIndex = allStations.length - 1;
    } else if (newIndex >= allStations.length) {
        newIndex = 0;
    }
    
    currentStation = allStations[newIndex];
    updateCurrentAQIDisplay(currentStation);
    updateCharts(currentStation);
    updateNavigationArrows();
    
    // Pause auto-rotation and restart after 5 seconds of inactivity
    stopAutoRotation();
    setTimeout(() => {
        startAutoRotation();
    }, 5000);
    
    // Center map on selected station
    if (realtimeMap && currentStation.lat && currentStation.lng) {
        realtimeMap.setView([currentStation.lat, currentStation.lng], 13);
    }
}

// Start auto-rotation
function startAutoRotation() {
    // Clear any existing interval
    stopAutoRotation();
    
    // Only start if there are multiple stations
    if (allStations.length > 1) {
        autoRotateInterval = setInterval(() => {
            navigateToStation(1); // Move to next station
        }, 3000); // 3 seconds per station
    }
}

// Stop auto-rotation
function stopAutoRotation() {
    if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
        autoRotateInterval = null;
    }
}

// Update navigation arrows state
function updateNavigationArrows() {
    const prevBtn = document.getElementById('prevStationBtn');
    const nextBtn = document.getElementById('nextStationBtn');
    
    if (allStations.length <= 1) {
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
    } else {
        if (prevBtn) prevBtn.disabled = false;
        if (nextBtn) nextBtn.disabled = false;
    }
}

// Setup city comparison dropdowns
function setupCityComparison() {
    const cityA = document.getElementById('cityA');
    const cityB = document.getElementById('cityB');
    
    if (cityA) {
        cityA.addEventListener('change', function() {
            updateComparisonChart();
        });
    }
    
    if (cityB) {
        cityB.addEventListener('change', function() {
            updateComparisonChart();
        });
    }
}

// Update city comparison dropdowns with station data
function updateCityComparisonDropdowns(stations) {
    const cityA = document.getElementById('cityA');
    const cityB = document.getElementById('cityB');
    
    // Clear existing options except the first one
    if (cityA) {
        while (cityA.options.length > 1) {
            cityA.remove(1);
        }
    }
    
    if (cityB) {
        while (cityB.options.length > 1) {
            cityB.remove(1);
        }
    }
    
    // Populate dropdowns with stations
    stations.forEach(station => {
        if (cityA) {
            const optionA = document.createElement('option');
            optionA.value = station.name;
            optionA.textContent = station.name;
            cityA.appendChild(optionA);
        }
        
        if (cityB) {
            const optionB = document.createElement('option');
            optionB.value = station.name;
            optionB.textContent = station.name;
            cityB.appendChild(optionB);
        }
    });
    
    // Set default selections if not already set
    if (cityA && !cityA.value && stations.length > 0) {
        cityA.value = stations[0].name;
    }
    if (cityB && !cityB.value && stations.length > 1) {
        cityB.value = stations.length > 1 ? stations[1].name : stations[0].name;
    }
    
    updateComparisonChart();
}

// Update comparison chart with selected cities
function updateComparisonChart() {
    const cityASelect = document.getElementById('cityA');
    const cityBSelect = document.getElementById('cityB');
    
    if (!cityASelect || !cityBSelect || !comparisonChart || allStations.length === 0) return;
    
    const cityAName = cityASelect.value;
    const cityBName = cityBSelect.value;
    
    if (!cityAName || !cityBName) return;
    
    const stationA = allStations.find(s => s.name === cityAName);
    const stationB = allStations.find(s => s.name === cityBName);
    
    if (!stationA || !stationB) return;
    
    // Get real PM values or estimate
    const pm25A = stationA.pm25 && stationA.pm25 > 0 ? stationA.pm25 : estimatePM25(stationA.aqi || 0);
    const pm10A = stationA.pm10 && stationA.pm10 > 0 ? stationA.pm10 : estimatePM10(stationA.aqi || 0);
    const pm25B = stationB.pm25 && stationB.pm25 > 0 ? stationB.pm25 : estimatePM25(stationB.aqi || 0);
    const pm10B = stationB.pm10 && stationB.pm10 > 0 ? stationB.pm10 : estimatePM10(stationB.aqi || 0);
    
    // Update chart data
    comparisonChart.data.datasets[0].data = [
        stationA.aqi || 0,
        pm25A,
        pm10A,
        0, // O3 (not available)
        0  // NO2 (not available)
    ];
    
    comparisonChart.data.datasets[1].data = [
        stationB.aqi || 0,
        pm25B,
        pm10B,
        0, // O3 (not available)
        0  // NO2 (not available)
    ];
    
    comparisonChart.data.datasets[0].label = cityAName;
    comparisonChart.data.datasets[1].label = cityBName;
    
    comparisonChart.update();
}

// Update current AQI display section
function updateCurrentAQIDisplay(station) {
    const aqi = station.aqi || 0;
    const category = getAQICategory(aqi);
    const emoji = getAQIEmoji(aqi);
    
    // Update AQI section background color (dim yellow for moderate)
    const aqiSection = document.getElementById('currentAQISection');
    if (aqiSection) {
        if (aqi <= 50) {
            aqiSection.style.background = 'linear-gradient(135deg, #00e400 0%, #00c400 100%)';
        } else if (aqi <= 100) {
            // Dim/night-type yellow for moderate
            aqiSection.style.background = 'linear-gradient(135deg, #b8860b 0%, #9a7209 100%)';
        } else if (aqi <= 150) {
            aqiSection.style.background = 'linear-gradient(135deg, #ff7e00 0%, #e66e00 100%)';
        } else if (aqi <= 200) {
            aqiSection.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        } else {
            aqiSection.style.background = 'linear-gradient(135deg, #8f3f97 0%, #7e2f87 100%)';
        }
    }
    
    // Update values
    document.getElementById('locationName').textContent = station.name || 'Unknown Location';
    document.getElementById('lastUpdated').textContent = `Last updated: ${formatTimestamp(station.timestamp)}`;
    document.getElementById('aqiNumber').textContent = aqi > 0 ? aqi : 'N/A';
    document.getElementById('aqiCategory').textContent = aqi > 0 ? category : 'No Data';
    document.getElementById('currentAQIEmoji').textContent = emoji;
    
    // Update pollutants (use real API data, fallback to estimated if not available)
    const pm25 = station.pm25 && station.pm25 > 0 ? station.pm25 : estimatePM25(aqi);
    const pm10 = station.pm10 && station.pm10 > 0 ? station.pm10 : estimatePM10(aqi);
    document.getElementById('pm25Value').textContent = `${pm25.toFixed(1)} µg/m³`;
    document.getElementById('pm10Value').textContent = `${pm10.toFixed(1)} µg/m³`;
}

// Estimate PM2.5 from AQI (rough approximation)
function estimatePM25(aqi) {
    if (aqi <= 50) return aqi * 0.5;
    if (aqi <= 100) return 25 + (aqi - 50) * 0.5;
    if (aqi <= 150) return 50 + (aqi - 100) * 0.75;
    if (aqi <= 200) return 87.5 + (aqi - 150) * 0.75;
    return 125 + (aqi - 200) * 1.0;
}

// Estimate PM10 from AQI (rough approximation)
function estimatePM10(aqi) {
    if (aqi <= 50) return aqi * 0.8;
    if (aqi <= 100) return 40 + (aqi - 50) * 0.8;
    if (aqi <= 150) return 80 + (aqi - 100) * 1.2;
    if (aqi <= 200) return 140 + (aqi - 150) * 1.2;
    return 200 + (aqi - 200) * 1.5;
}

// Update map markers
function updateMapMarkers(stations) {
    if (!realtimeMap) return;
    
    // Clear existing markers
    mapMarkers.forEach(marker => realtimeMap.removeLayer(marker));
    mapMarkers = [];
    
    stations.forEach(station => {
        if (!station.lat || !station.lng) return;
        
        const aqi = station.aqi || 0;
        const color = getAQIColor(aqi);
        
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 24px;
                height: 24px;
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([station.lat, station.lng], {
            icon: customIcon
        }).addTo(realtimeMap);
        
        const aqiDisplay = aqi > 0 ? `AQI ${aqi}` : "AQI N/A";
        const textColor = (color === '#ffff00' || color === '#00e400') ? '#000000' : '#ffffff';
        const emojiVal = getAQIEmoji(aqi);
        const categoryVal = getAQICategory(aqi);
        const messageVal = station.message || "No recent data available.";

        marker.bindPopup(`
            <div class="aqi-popup" style="color: ${textColor};">
                    <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid currentColor; padding-bottom: 4px; padding-top: 2px;">${station.name}</div>
                    <span class="aqi-emoji">${emojiVal}</span>
                    <span class="aqi-value">${aqiDisplay}</span>
                    <div class="aqi-category">${categoryVal}</div>
                    <div class="aqi-message" style="margin-top: 5px; font-size: 0.85em;">${messageVal}</div>
            </div>
        `, {
            className: "aqi-popup-wrapper aqi-popup-bottom",
            maxWidth: 260,
            minWidth: 200,
            autoPan: true,
            autoPanPadding: [50, 50],
            offset: [0, 20]
        });
        
        mapMarkers.push(marker);

        // Style the popup based on AQI color when it opens
        marker.on("popupopen", function () {
            const popup = marker.getPopup();
            const popupElement = popup.getElement();
            if (popupElement) {
                const contentWrapper = popupElement.querySelector(".leaflet-popup-content-wrapper");
                if (contentWrapper) {
                    contentWrapper.style.backgroundColor = color;
                    contentWrapper.style.border = "none";
                    contentWrapper.style.boxShadow = `0 8px 32px ${color}40`;
                }
                const tip = popupElement.querySelector(".leaflet-popup-tip");
                if (tip) {
                    tip.style.backgroundColor = color;
                }
            }
        });
        
        // Center on selected station
        if (currentStation && station.name === currentStation.name) {
            realtimeMap.setView([station.lat, station.lng], 13);
        }
    });
}

// Render Live Station Rankings
function renderRankings(stations) {
    const listContainer = document.getElementById('rankingList');
    if (!listContainer) return;
    
    // Sort stations by AQI descending (highest pollution first)
    // Filter out stations with exactly 0 AQI (no data for them yet)
    const validStations = stations.filter(s => s.aqi > 0);
    const sorted = validStations.sort((a, b) => b.aqi - a.aqi);
    
    if (sorted.length === 0) {
        listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">No live data available right now.</div>';
        return;
    }

    listContainer.innerHTML = '';
    
    const getTextColor = (hex) => {
        if (hex === '#ffff00' || hex === '#00e400') return '#000000';
        return '#ffffff';
    };
    
    sorted.forEach((station, index) => {
        const aqi = station.aqi;
        const color = getAQIColor(aqi);
        const category = getAQICategory(aqi);
        
        const itemDom = document.createElement('div');
        itemDom.className = 'ranking-item';
        
        itemDom.innerHTML = `
            <div class="ranking-number">#${index + 1}</div>
            <div class="ranking-details">
                <div class="ranking-name">${station.name}</div>
                <div class="ranking-badge" style="background-color: ${color}; color: ${getTextColor(color)};">${category}</div>
            </div>
            <div class="ranking-aqi" style="color: ${color};">${aqi}</div>
        `;
        
        // Add click integration to interactive map
        itemDom.addEventListener('click', () => {
             currentStation = station;
             updateCurrentAQIDisplay(currentStation);
             updateCharts(currentStation);
             updateNavigationArrows();
             
             stopAutoRotation();
             setTimeout(() => { startAutoRotation(); }, 5000);
             
             if (realtimeMap && station.lat && station.lng) {
                 realtimeMap.setView([station.lat, station.lng], 14);
                 
                 // Open corresponding popup
                 const mkr = mapMarkers.find(m => m.getLatLng().lat === station.lat && m.getLatLng().lng === station.lng);
                 if (mkr) mkr.openPopup();
                 
                 // Scroll map into view on mobile
                 document.getElementById('realtimeMap').scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
        });
        
        listContainer.appendChild(itemDom);
    });
}

// Initialize charts
function initializeCharts() {
    // City Comparison Chart
    const comparisonCtx = document.getElementById('comparisonChart');
    if (comparisonCtx) {
        comparisonChart = new Chart(comparisonCtx, {
            type: 'bar',
            data: {
                labels: ['AQI', 'PM2.5', 'PM10', 'O3', 'NO2'],
                datasets: [
                    {
                        label: 'City A',
                        data: [175, 87.5, 142.8, 45, 30],
                        backgroundColor: '#ef4444'
                    },
                    {
                        label: 'City B',
                        data: [175, 87.5, 142.8, 45, 30],
                        backgroundColor: '#3b82f6'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}
// Update charts with current station data
function updateCharts(station) {
    if (!station) return;
    
    // The previous history charts have been removed. 
    // This function can be used to update other chart elements in the future.
}


// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
    }
});

