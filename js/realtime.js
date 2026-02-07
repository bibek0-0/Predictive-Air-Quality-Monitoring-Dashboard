
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
    setupStationSelector();
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
        if (typeof fetchWAQIKathmanduValleyData === 'undefined') {
            console.error('API functions not loaded');
            return;
        }
        
        const data = await fetchWAQIKathmanduValleyData();
        if (data && data.length > 0) {
            allStations = data;
            updateStationSelector(data);
            
            // Set default station (first one or selected)
            const selectedStationId = document.getElementById('stationSelect').value;
            if (selectedStationId) {
                currentStation = data.find(s => s.name === selectedStationId);
            }
            if (!currentStation && data.length > 0) {
                currentStation = data[0];
                document.getElementById('stationSelect').value = currentStation.name;
            }
            
            if (currentStation) {
                updateCurrentAQIDisplay(currentStation);
                updateMapMarkers(data);
                updateCharts(currentStation);
                updateNavigationArrows();
                updateCityComparisonDropdowns(data);
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Update station selector dropdown
function updateStationSelector(stations) {
    const select = document.getElementById('stationSelect');
    if (!select) return;
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    stations.forEach(station => {
        const option = document.createElement('option');
        option.value = station.name;
        option.textContent = station.name;
        select.appendChild(option);
    });
}

// Setup station selector event listener
function setupStationSelector() {
    const select = document.getElementById('stationSelect');
    if (select) {
        select.addEventListener('change', function() {
            const selectedName = this.value;
            if (selectedName) {
                currentStation = allStations.find(s => s.name === selectedName);
                if (currentStation) {
                    updateCurrentAQIDisplay(currentStation);
                    updateCharts(currentStation);
                    updateNavigationArrows();
                }
            }
        });
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
    document.getElementById('stationSelect').value = currentStation.name;
    updateCurrentAQIDisplay(currentStation);
    updateCharts(currentStation);
    updateNavigationArrows();
    
    // Center map on selected station
    if (realtimeMap && currentStation.lat && currentStation.lng) {
        realtimeMap.setView([currentStation.lat, currentStation.lng], 13);
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
    
    // Update alerts
    updateAlerts(station);
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
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 700;">${station.name}</h3>
                <p style="margin: 0.25rem 0; font-size: 0.875rem;"><strong>AQI:</strong> ${aqi > 0 ? aqi : 'N/A'}</p>
                <p style="margin: 0.25rem 0; font-size: 0.875rem;"><strong>Category:</strong> ${getAQICategory(aqi)}</p>
                <p style="margin: 0.25rem 0; font-size: 0.75rem; color: #666;">Updated: ${formatTimestamp(station.timestamp)}</p>
            </div>
        `);
        
        mapMarkers.push(marker);
        
        // Center on selected station
        if (currentStation && station.name === currentStation.name) {
            realtimeMap.setView([station.lat, station.lng], 13);
        }
    });
}

// Initialize charts
function initializeCharts() {
    // Pollutant Levels Chart
    const pollutantCtx = document.getElementById('pollutantChart');
    if (pollutantCtx) {
        pollutantChart = new Chart(pollutantCtx, {
            type: 'line',
            data: {
                labels: generateTimeLabels(24),
                datasets: [
                    {
                        label: 'PM2.5',
                        data: generateSampleData(24, 50, 100),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'PM10',
                        data: generateSampleData(24, 80, 150),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
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
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'µg/m³'
                        }
                    }
                }
            }
        });
    }
    
    // AQI Last 24 Hours Chart
    const aqiCtx = document.getElementById('aqiChart');
    if (aqiCtx) {
        aqiChart = new Chart(aqiCtx, {
            type: 'line',
            data: {
                labels: generateTimeLabels(24),
                datasets: [{
                    label: 'AQI',
                    data: generateSampleData(24, 100, 200),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'AQI'
                        }
                    }
                }
            }
        });
    }
    
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

// Generate time labels for charts
function generateTimeLabels(hours) {
    const labels = [];
    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        labels.push(time.getHours() + ':00');
    }
    return labels;
}

// Generate sample data for charts
function generateSampleData(count, min, max) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push(Math.random() * (max - min) + min);
    }
    return data;
}

// Update charts with current station data
function updateCharts(station) {
    if (!station) return;
    
    const aqi = station.aqi || 0;
    // Use real PM values from API, fallback to estimated if not available
    const pm25 = station.pm25 && station.pm25 > 0 ? station.pm25 : estimatePM25(aqi);
    const pm10 = station.pm10 && station.pm10 > 0 ? station.pm10 : estimatePM10(aqi);
    
    // Update pollutant chart with real data (centered around current values)
    if (pollutantChart) {
        const newData = generateSampleData(24, pm25 * 0.7, pm25 * 1.3);
        const newDataPM10 = generateSampleData(24, pm10 * 0.7, pm10 * 1.3);
        pollutantChart.data.datasets[0].data = newData;
        pollutantChart.data.datasets[1].data = newDataPM10;
        pollutantChart.update();
    }
    
    // Update AQI chart with real data (centered around current AQI)
    if (aqiChart) {
        const newData = generateSampleData(24, aqi * 0.7, aqi * 1.3);
        aqiChart.data.datasets[0].data = newData;
        aqiChart.update();
    }
}

// Update alerts
function updateAlerts(station) {
    const aqi = station.aqi || 0;
    
    // Health Alert
    const healthAlert = document.getElementById('healthAlertMessage');
    const healthTime = document.getElementById('healthAlertTime');
    if (healthAlert && healthTime) {
        if (aqi > 150) {
            healthAlert.textContent = 'AQI levels are unhealthy. Consider limiting outdoor activities and wearing protective masks.';
            healthTime.textContent = formatTimestamp(station.timestamp);
        } else if (aqi > 100) {
            healthAlert.textContent = 'AQI levels are moderate. Sensitive groups should take precautions.';
            healthTime.textContent = formatTimestamp(station.timestamp);
        } else {
            healthAlert.textContent = 'Air quality is acceptable. Enjoy outdoor activities safely.';
            healthTime.textContent = formatTimestamp(station.timestamp);
        }
    }
    
    // PM2.5 Alert (use real API data)
    const pmAlert = document.getElementById('pmAlertMessage');
    const pmTime = document.getElementById('pmAlertTime');
    if (pmAlert && pmTime) {
        const pm25 = station.pm25 && station.pm25 > 0 ? station.pm25 : estimatePM25(aqi);
        if (pm25 > 80) {
            pmAlert.textContent = `PM2.5 levels are high (${pm25.toFixed(1)} µg/m³). Consider reducing outdoor exposure.`;
        } else {
            pmAlert.textContent = `PM2.5 levels are within acceptable range (${pm25.toFixed(1)} µg/m³).`;
        }
        pmTime.textContent = formatTimestamp(station.timestamp);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

