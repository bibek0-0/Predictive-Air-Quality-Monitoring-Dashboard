
// REALTIME PAGE JAVASCRIPT
79
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

// Update current AQI display section
function updateCurrentAQIDisplay(station) {
    const aqi = station.aqi || 0;
    const category = getAQICategory(aqi);
    const emoji = getAQIEmoji(aqi);
    
    // Update AQI section background color 
    const aqiSection = document.getElementById('currentAQISection');
    if (aqiSection) {
        if (aqi <= 50) {
            aqiSection.style.background = 'linear-gradient(135deg, #00e400 0%, #00c400 100%)';
        } else if (aqi <= 100) {
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

// Estimate PM2.5 from AQI 
function estimatePM25(aqi) {
    if (aqi <= 50) return aqi * 0.5;
    if (aqi <= 100) return 25 + (aqi - 50) * 0.5;
    if (aqi <= 150) return 50 + (aqi - 100) * 0.75;
    if (aqi <= 200) return 87.5 + (aqi - 150) * 0.75;
    return 125 + (aqi - 200) * 1.0;
}

// Estimate PM10 from AQI 
function estimatePM10(aqi) {
    if (aqi <= 50) return aqi * 0.8;
    if (aqi <= 100) return 40 + (aqi - 50) * 0.8;
    if (aqi <= 150) return 80 + (aqi - 100) * 1.2;
    if (aqi <= 200) return 140 + (aqi - 150) * 1.2;
    return 200 + (aqi - 200) * 1.5;
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
    
    // PM2.5 Alert
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
