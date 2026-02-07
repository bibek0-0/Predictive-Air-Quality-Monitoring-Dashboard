
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
