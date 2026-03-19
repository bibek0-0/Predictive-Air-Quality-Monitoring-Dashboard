/*
   Forecast Page — Live API Integration
   Fetches real XGBoost forecasts from Flask API (http://localhost:5050)
*/

const API_BASE = 'http://localhost:5050';

let predictionChart = null;
let currentForecast = null;   // full 48-item array for the selected station
let currentRange = '24';
let refreshTimer = null;

// ── Bootstrap ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const stationSelect = document.getElementById('stationSelect');
    if (stationSelect) {
        stationSelect.addEventListener('change', () => {
            loadStationForecast(stationSelect.value);
        });
    }
    initToggle();

    // Initial load
    loadStationForecast(stationSelect ? stationSelect.value : 'Ratnapark');
    loadAllStationsSummary();

    // Auto-refresh every 5 minutes
    refreshTimer = setInterval(() => {
        const sel = document.getElementById('stationSelect');
        loadStationForecast(sel ? sel.value : 'Ratnapark');
        loadAllStationsSummary();
    }, 5 * 60 * 1000);
});

// ── API Fetch Helpers ───────────────────────────────────────
async function apiFetch(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
}

// ── Load Single Station Forecast ────────────────────────────
async function loadStationForecast(station) {
    showLoading();
    hideError();
    try {
        const data = await apiFetch(`/api/forecast/${station}`);
        currentForecast = data.forecast;

        // Update "last updated"
        const lastEl = document.getElementById('lastUpdatedText');
        if (lastEl) lastEl.textContent = `Updated: ${data.generated_at}`;

        // Update chart station name
        const nameEl = document.getElementById('chartStationName');
        if (nameEl) nameEl.textContent = station;

        updateSummaryCards(currentForecast);
        updateAlertBanner(currentForecast);
        initHealthTimeline(currentForecast);
        initPredictionChart(currentRange);
        hideLoading();
    } catch (err) {
        console.error('Forecast fetch error:', err);
        hideLoading();
        showError(err.message);
    }
}

// ── Load All-Stations Summary ───────────────────────────────
async function loadAllStationsSummary() {
    try {
        const data = await apiFetch('/api/forecast/all/summary');
        renderAllStationCards(data);
    } catch (err) {
        console.error('Summary fetch error:', err);
    }
}



// ── Summary Cards (24h / 48h) ───────────────────────────────
function updateSummaryCards(forecast) {
    if (!forecast || forecast.length === 0) return;

    const first24 = forecast.slice(0, 24);
    const full48  = forecast;

    // 24-hour stats
    const avg24Val  = Math.round(first24.reduce((s, f) => s + f.aqi, 0) / first24.length);
    const high24Val = Math.max(...first24.map(f => f.aqi));
    const cat24     = aqiCategory(avg24Val);

    document.getElementById('avg24').textContent  = avg24Val;
    document.getElementById('high24').textContent = high24Val;
    applyCategoryStyle('avg24',  avg24Val);
    applyCategoryStyle('high24', high24Val);
    applyCategoryCard('indicator24', 'category24', cat24, avg24Val);

    // 48-hour stats
    const avg48Val  = Math.round(full48.reduce((s, f) => s + f.aqi, 0) / full48.length);
    const high48Val = Math.max(...full48.map(f => f.aqi));
    const cat48     = aqiCategory(avg48Val);

    document.getElementById('avg48').textContent  = avg48Val;
    document.getElementById('high48').textContent = high48Val;
    applyCategoryStyle('avg48',  avg48Val);
    applyCategoryStyle('high48', high48Val);
    applyCategoryCard('indicator48', 'category48', cat48, avg48Val);
}

function applyCategoryStyle(elId, aqi) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.className = 'forecast-stat-value';
    if (aqi <= 50)       el.classList.add('aqi-good');
    else if (aqi <= 100) el.classList.add('aqi-moderate');
    else if (aqi <= 150) el.classList.add('aqi-unhealthy');
    else if (aqi <= 200) el.classList.add('aqi-unhealthy');
    else                 el.classList.add('aqi-hazardous');
}

function applyCategoryCard(indicatorId, categoryId, label, aqi) {
    const ind = document.getElementById(indicatorId);
    const cat = document.getElementById(categoryId);
    if (ind) {
        ind.className = 'forecast-card-indicator';
        if (aqi <= 50)       ind.classList.add('indicator-good');
        else if (aqi <= 100) ind.classList.add('indicator-moderate');
        else if (aqi <= 200) ind.classList.add('indicator-unhealthy');
        else                 ind.classList.add('indicator-hazardous');
    }
    if (cat) {
        cat.textContent = label;
        cat.className = 'forecast-card-category';
        if (aqi <= 50)       cat.classList.add('category-good');
        else if (aqi <= 100) cat.classList.add('category-moderate');
        else if (aqi <= 200) cat.classList.add('category-unhealthy');
        else                 cat.classList.add('category-hazardous');
    }
}

function aqiCategory(aqi) {
    if (aqi <= 50)  return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

// ── Alert Banner ────────────────────────────────────────────
function updateAlertBanner(forecast) {
    const banner = document.getElementById('forecastAlertBanner');
    if (!banner) return;

    const first24 = forecast.slice(0, 24);
    const maxAqi  = Math.max(...first24.map(f => f.aqi));

    if (maxAqi > 150) {
        const titleEl = document.getElementById('alertBannerTitle');
        const msgEl   = document.getElementById('alertBannerMsg');
        if (maxAqi > 300) {
            if (titleEl) titleEl.textContent = '🚨 Hazardous Air Quality Expected';
            if (msgEl)   msgEl.textContent   = 'Everyone should avoid all outdoor exertion. Stay indoors with air purification.';
        } else if (maxAqi > 200) {
            if (titleEl) titleEl.textContent = '⚠ Very Unhealthy Air Quality Expected';
            if (msgEl)   msgEl.textContent   = 'Everyone may experience health effects. Sensitive groups should stay indoors.';
        } else {
            if (titleEl) titleEl.textContent = '⚠ High Pollution Expected in the Next 24 Hours';
            if (msgEl)   msgEl.textContent   = 'Sensitive groups should stay indoors and avoid outdoor activities.';
        }
        banner.style.display = '';
    } else {
        banner.style.display = 'none';
    }
}

// ── AQI Reference Color ─────────────────────────────────────
function aqiColor(aqi) {
    if (aqi <= 50)  return '#00e400';   // Good — green
    if (aqi <= 100) return '#ffff00';   // Moderate — yellow
    if (aqi <= 150) return '#ff7e00';   // USG — orange
    if (aqi <= 200) return '#ff0000';   // Unhealthy — red
    if (aqi <= 300) return '#8f3f97';   // Very Unhealthy — purple
    return '#7e0023';                   // Hazardous — maroon
}

// ── Prediction Chart ────────────────────────────────────────
function initPredictionChart(range) {
    const ctx = document.getElementById('predictionChart');
    if (!ctx || !currentForecast) return;

    if (predictionChart) predictionChart.destroy();

    const items = range === '24' ? currentForecast.slice(0, 24) : currentForecast;
    const labels = items.map(f => {
        const d = new Date(f.timestamp);
        const h = d.getHours();
        return h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? h + ' AM' : (h - 12) + ' PM';
    });
    const dataPoints = items.map(f => f.aqi);

    // Per-point AQI colors
    const segColors = items.map(f => aqiColor(f.aqi));

    const context = ctx.getContext('2d');

    // Dynamic Y axis range
    const minAqi = Math.min(...dataPoints);
    const maxAqi = Math.max(...dataPoints);
    const yMin = Math.max(0, Math.floor((minAqi - 20) / 10) * 10);
    const yMax = Math.ceil((maxAqi + 20) / 10) * 10;

    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted AQI',
                data: dataPoints,
                // Segment coloring — each line segment picks color from end point
                segment: {
                    borderColor: (seg) => aqiColor(seg.p1.parsed.y),
                    backgroundColor: (seg) => {
                        const c = aqiColor(seg.p1.parsed.y);
                        return c + '18'; // ~10% opacity hex
                    }
                },
                borderColor: segColors,
                pointBackgroundColor: segColors,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx: c, chartArea } = chart;
                    if (!chartArea) return 'rgba(0,0,0,0)';
                    const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    // Sample dominant color from data midpoint
                    const midColor = aqiColor(dataPoints[Math.floor(dataPoints.length / 2)]);
                    grad.addColorStop(0, midColor + '30');
                    grad.addColorStop(0.6, midColor + '10');
                    grad.addColorStop(1, midColor + '00');
                    return grad;
                },
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: (ctx) => segColors[ctx.dataIndex] || '#7c3aed',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeInOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Inter', size: 12, weight: '600' },
                    bodyFont: { family: 'Inter', size: 13, weight: '700' },
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,
                    usePointStyle: true,
                    callbacks: {
                        title: (tips) => tips[0].label,
                        label: (tip) => {
                            const item = items[tip.dataIndex];
                            return [`AQI: ${tip.parsed.y}`, `PM2.5: ${item.pm25} µg/m³`, `${item.category}`];
                        },
                        labelColor: (tip) => ({
                            borderColor: segColors[tip.dataIndex],
                            backgroundColor: segColors[tip.dataIndex],
                            borderRadius: 3
                        })
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: {
                        maxTicksLimit: range === '24' ? 8 : 10,
                        font: { size: 10, family: 'Inter', weight: '500' },
                        color: '#9ca3af'
                    },
                    grid: { display: false }
                },
                y: {
                    display: true,
                    min: yMin,
                    max: yMax,
                    ticks: {
                        stepSize: Math.ceil((yMax - yMin) / 5),
                        font: { size: 10, family: 'Inter', weight: '500' },
                        color: '#9ca3af'
                    },
                    grid: { color: 'rgba(0, 0, 0, 0.04)', drawBorder: false }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

// ── Toggle Buttons ──────────────────────────────────────────
function initToggle() {
    const btn24 = document.getElementById('btn24h');
    const btn48 = document.getElementById('btn48h');
    if (!btn24 || !btn48) return;

    btn24.addEventListener('click', () => {
        btn24.classList.add('active');
        btn48.classList.remove('active');
        currentRange = '24';
        initPredictionChart('24');
    });

    btn48.addEventListener('click', () => {
        btn48.classList.add('active');
        btn24.classList.remove('active');
        currentRange = '48';
        initPredictionChart('48');
    });
}

// ── Health Impact Timeline ──────────────────────────────────
function initHealthTimeline(forecast) {
    const container = document.getElementById('healthTimeline');
    const bestWindowEl = document.getElementById('bestWindow');
    if (!container || !forecast) return;

    const now = new Date();
    const currentHour = now.getHours();

    // Filter to today's remaining hours
    const todayItems = forecast.filter(f => {
        const d = new Date(f.timestamp);
        return d.getDate() === now.getDate() && d.getHours() >= currentHour;
    });

    if (todayItems.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-family:Inter,sans-serif; padding:1rem;">No more forecast data for today.</p>';
        if (bestWindowEl) bestWindowEl.style.display = 'none';
        return;
    }

    let html = '';
    todayItems.forEach((item, idx) => {
        const d = new Date(item.timestamp);
        const h = d.getHours();
        const level = getTimelineLevel(item.aqi);
        const timeLabel = h === 0 ? '12AM' : h === 12 ? '12PM' : h < 12 ? h + 'AM' : (h - 12) + 'PM';
        const isNow = idx === 0;
        html += `
            <div class="timeline-slot slot-${level.cls}${isNow ? ' slot-now' : ''}">
                <span class="slot-aqi">${item.aqi}</span>
                <div class="slot-bar"></div>
                <span class="slot-time">${isNow ? 'Now' : timeLabel}</span>
                <span class="slot-status">${level.emoji}</span>
            </div>
        `;
    });
    container.innerHTML = html;

    // Find best window
    const aqiArr = todayItems.map(f => f.aqi);
    let bestStart = 0, bestEnd = 0, bestAvg = Infinity;
    for (let start = 0; start < aqiArr.length; start++) {
        for (let end = start + 1; end <= Math.min(start + 6, aqiArr.length); end++) {
            const slice = aqiArr.slice(start, end);
            const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
            if (avg < bestAvg && (end - start) >= 2) {
                bestAvg = avg;
                bestStart = start;
                bestEnd = end;
            }
        }
    }

    const fmtHour = (item) => {
        const d = new Date(item.timestamp);
        const h = d.getHours();
        return h === 0 ? '12:00 AM' : h === 12 ? '12:00 PM' : h < 12 ? h + ':00 AM' : (h - 12) + ':00 PM';
    };

    if (bestWindowEl) {
        if (bestAvg === Infinity || aqiArr.length < 2) {
            bestWindowEl.innerHTML = `
                <span class="best-window-icon">🌙</span>
                <div class="best-window-text">
                    <span class="best-window-label"><span class="best-window-dot"></span>Limited forecast remaining</span>
                    <span class="best-window-value">Check back tomorrow for full forecast</span>
                </div>
            `;
        } else {
            bestWindowEl.innerHTML = `
                <span class="best-window-icon">🌤️</span>
                <div class="best-window-text">
                    <span class="best-window-label"><span class="best-window-dot"></span>Best time to go outside</span>
                    <span class="best-window-value">${fmtHour(todayItems[bestStart])} – ${fmtHour(todayItems[bestEnd - 1])}</span>
                    <span class="best-window-detail">Predicted avg AQI: ~${Math.round(bestAvg)} · Ideal for outdoor activity</span>
                </div>
            `;
        }
        bestWindowEl.style.display = '';
    }
}

function getTimelineLevel(aqi) {
    if (aqi <= 100) return { cls: 'good', emoji: '✅' };
    if (aqi <= 140) return { cls: 'moderate', emoji: '😐' };
    if (aqi <= 160) return { cls: 'caution', emoji: '⚠️' };
    return { cls: 'unsafe', emoji: '❌' };
}

// ── All Stations Cards ──────────────────────────────────────
function renderAllStationCards(summary) {
    const grid = document.getElementById('allStationsGrid');
    if (!grid || !summary) return;

    const selectedStation = document.getElementById('stationSelect');
    const selectedVal = selectedStation ? selectedStation.value : '';

    grid.innerHTML = summary.map(s => `
        <div class="station-card ${s.station === selectedVal ? 'station-card-active' : ''}"
             data-station="${s.station}"
             style="--card-accent: ${s.color}">
            <div class="station-card-aqi" style="color: ${s.color}">${s.aqi}</div>
            <div class="station-card-name">${s.station}</div>
            <div class="station-card-category" style="color: ${s.color}">${s.category}</div>
            <div class="station-card-pm25">PM2.5: ${s.pm25.toFixed(1)} µg/m³</div>
        </div>
    `).join('');

    // Click to switch station and scroll to chart
    grid.querySelectorAll('.station-card').forEach(card => {
        card.addEventListener('click', () => {
            const st = card.dataset.station;
            if (selectedStation) selectedStation.value = st;
            loadStationForecast(st);

            // Highlight active card
            grid.querySelectorAll('.station-card').forEach(c => c.classList.remove('station-card-active'));
            card.classList.add('station-card-active');

            // Find the predicted AQI section or chart container and scroll to it smoothly
            const chartSection = document.querySelector('.predicted-aqi-section');
            if (chartSection) {
                // Add a small delay so the scroll happens after the new data fetch is initiated
                setTimeout(() => {
                    chartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        });
    });
}



// ── Loading / Error States ──────────────────────────────────
function showLoading() {
    const overlay = document.getElementById('forecastLoadingOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('forecastLoadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

function showError(msg) {
    const container = document.getElementById('forecastErrorContainer');
    const main      = document.getElementById('forecastMainContent');
    const msgEl     = document.getElementById('forecastErrorMsg');
    if (container) container.style.display = 'flex';
    if (main)      main.style.display = 'none';
    if (msgEl)     msgEl.textContent = msg || 'Could not connect to the forecast API.';

    // Wire retry button
    const retryBtn = document.getElementById('forecastRetryBtn');
    if (retryBtn) {
        retryBtn.onclick = () => {
            container.style.display = 'none';
            if (main) main.style.display = '';
            const sel = document.getElementById('stationSelect');
            loadStationForecast(sel ? sel.value : 'Ratnapark');
            loadAllStationsSummary();

        };
    }
}

function hideError() {
    const container = document.getElementById('forecastErrorContainer');
    const main      = document.getElementById('forecastMainContent');
    if (container) container.style.display = 'none';
    if (main)      main.style.display = '';
}
