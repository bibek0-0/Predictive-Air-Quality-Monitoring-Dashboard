/*
   Forecast Page - Charts & Map
   Placeholder data; will be replaced with ML model output later.
*/

document.addEventListener('DOMContentLoaded', () => {
    initChart48Hour();
    initChart24Hour();
    initComparisonChart();
    initForecastMap();
});

/* ===== 48-Hour AQI Prediction Line Chart ===== */
function initChart48Hour() {
    const ctx = document.getElementById('chart48Hour');
    if (!ctx) return;

    const labels = Array.from({ length: 48 }, (_, i) => {
        const h = i % 24;
        return h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? h + ' AM' : (h - 12) + ' PM';
    });

    const data = [
        140, 138, 132, 128, 125, 120, 118, 122, 130, 142, 155, 162,
        168, 170, 167, 160, 155, 150, 148, 145, 142, 138, 135, 132,
        130, 128, 125, 122, 118, 115, 112, 118, 125, 135, 145, 152,
        158, 160, 155, 148, 142, 138, 134, 130, 128, 125, 122, 120
    ];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted AQI',
                data: data,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#7c3aed',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { family: 'Inter', size: 12 },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `AQI: ${ctx.parsed.y}`
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: {
                        maxTicksLimit: 8,
                        font: { size: 10, family: 'Inter' },
                        color: '#9ca3af'
                    },
                    grid: { display: false }
                },
                y: {
                    display: true,
                    min: 80,
                    max: 200,
                    ticks: {
                        stepSize: 40,
                        font: { size: 10, family: 'Inter' },
                        color: '#9ca3af'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.04)',
                        drawBorder: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/* ===== 24-Hour AQI Prediction Line Chart ===== */
function initChart24Hour() {
    const ctx = document.getElementById('chart24Hour');
    if (!ctx) return;

    const labels = Array.from({ length: 24 }, (_, i) => {
        return i === 0 ? '12 AM' : i === 12 ? '12 PM' : i < 12 ? i + ' AM' : (i - 12) + ' PM';
    });

    const data = [
        145, 140, 135, 130, 128, 125, 122, 128, 138, 150, 162, 170,
        175, 178, 172, 165, 158, 152, 148, 145, 140, 138, 135, 132
    ];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted AQI',
                data: data,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#7c3aed',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { family: 'Inter', size: 12 },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `AQI: ${ctx.parsed.y}`
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: {
                        maxTicksLimit: 8,
                        font: { size: 10, family: 'Inter' },
                        color: '#9ca3af'
                    },
                    grid: { display: false }
                },
                y: {
                    display: true,
                    min: 80,
                    max: 200,
                    ticks: {
                        stepSize: 40,
                        font: { size: 10, family: 'Inter' },
                        color: '#9ca3af'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.04)',
                        drawBorder: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/* ===== Real vs Predicted AQI Bar Chart ===== */
function initComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const actualData = [145, 160, 155, 170, 180, 165, 175];
    const predictedData = [140, 155, 150, 168, 175, 160, 170];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Actual AQI',
                    data: actualData,
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.7,
                    categoryPercentage: 0.6
                },
                {
                    label: 'Predicted AQI',
                    data: predictedData,
                    backgroundColor: '#a855f7',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.7,
                    categoryPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { family: 'Inter', size: 12, weight: '500' },
                        color: '#6b7280'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { family: 'Inter', size: 12 },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: {
                        font: { size: 12, family: 'Inter', weight: '500' },
                        color: '#9ca3af'
                    },
                    grid: { display: false }
                },
                y: {
                    display: true,
                    min: 0,
                    max: 220,
                    ticks: {
                        stepSize: 50,
                        font: { size: 11, family: 'Inter' },
                        color: '#9ca3af'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.04)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

/* ===== Leaflet Map (Kathmandu Valley) ===== */
function initForecastMap() {
    const mapContainer = document.getElementById('forecastMap');
    if (!mapContainer) return;

    const map = L.map('forecastMap', {
        center: [27.7172, 85.324],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Placeholder AQI markers for Kathmandu Valley locations
    const locations = [
        { name: 'Thamel', lat: 27.7154, lng: 85.3123, aqi: 156 },
        { name: 'Ratnapark', lat: 27.7050, lng: 85.3145, aqi: 168 },
        { name: 'Kirtipur', lat: 27.6788, lng: 85.2778, aqi: 142 },
        { name: 'Lalitpur', lat: 27.6644, lng: 85.3188, aqi: 138 },
        { name: 'Bhaktapur', lat: 27.6710, lng: 85.4298, aqi: 150 },
        { name: 'Budhanilkantha', lat: 27.7636, lng: 85.3625, aqi: 120 }
    ];

    locations.forEach(loc => {
        const color = getAQIColor(loc.aqi);
        const marker = L.circleMarker([loc.lat, loc.lng], {
            radius: 10,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85
        }).addTo(map);

        marker.bindPopup(`
            <div style="text-align:center; font-family: Inter, sans-serif;">
                <strong style="font-size:14px;">${loc.name}</strong><br>
                <span style="font-size:24px; font-weight:800; color:${color};">${loc.aqi}</span><br>
                <span style="font-size:11px; color:#6b7280;">Predicted AQI</span>
            </div>
        `);
    });

    // Force map to recalculate size after render
    setTimeout(() => map.invalidateSize(), 300);
}

/* Helper: AQI level → color */
function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
}
