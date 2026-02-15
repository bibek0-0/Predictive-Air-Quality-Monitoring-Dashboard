/*
   Forecast Page Charts & Map
   Placeholder data will be replaced with ML model output later.
*/

let predictionChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initPredictionChart('24');
    initToggle();
    initHealthTimeline();
});

/*Chart Data*/
const chartData = {
    '24': {
        labels: Array.from({ length: 24 }, (_, i) => {
            return i === 0 ? '12 AM' : i === 12 ? '12 PM' : i < 12 ? i + ' AM' : (i - 12) + ' PM';
        }),
        data: [
            145, 140, 135, 130, 128, 125, 122, 128, 138, 150, 162, 170,
            175, 178, 172, 165, 158, 152, 148, 145, 140, 138, 135, 132
        ]
    },
    '48': {
        labels: Array.from({ length: 48 }, (_, i) => {
            const h = i % 24;
            return h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? h + ' AM' : (h - 12) + ' PM';
        }),
        data: [
            140, 138, 132, 128, 125, 120, 118, 122, 130, 142, 155, 162,
            168, 170, 167, 160, 155, 150, 148, 145, 142, 138, 135, 132,
            130, 128, 125, 122, 118, 115, 112, 118, 125, 135, 145, 152,
            158, 160, 155, 148, 142, 138, 134, 130, 128, 125, 122, 120
        ]
    }
};

/*Unified Prediction Chart*/
function initPredictionChart(range) {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) return;

    // Destroy previous chart if exists
    if (predictionChart) {
        predictionChart.destroy();
    }

    const source = chartData[range];

    // Create gradient fill
    const context = ctx.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.2)');
    gradient.addColorStop(0.5, 'rgba(124, 58, 237, 0.08)');
    gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');

    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: source.labels,
            datasets: [{
                label: 'Predicted AQI',
                data: source.data,
                borderColor: '#7c3aed',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#7c3aed',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 600,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Inter', size: 12, weight: '600' },
                    bodyFont: { family: 'Inter', size: 13, weight: '700' },
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        title: (items) => items[0].label,
                        label: (ctx) => `AQI: ${ctx.parsed.y}`
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
                    min: 80,
                    max: 200,
                    ticks: {
                        stepSize: 30,
                        font: { size: 10, family: 'Inter', weight: '500' },
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

/*Toggle Buttons*/
function initToggle() {
    const btn24 = document.getElementById('btn24h');
    const btn48 = document.getElementById('btn48h');
    if (!btn24 || !btn48) return;

    btn24.addEventListener('click', () => {
        btn24.classList.add('active');
        btn48.classList.remove('active');
        initPredictionChart('24');
    });

    btn48.addEventListener('click', () => {
        btn48.classList.add('active');
        btn24.classList.remove('active');
        initPredictionChart('48');
    });
}

/*Health Impact Timeline*/
function initHealthTimeline() {
    const container = document.getElementById('healthTimeline');
    const bestWindowEl = document.getElementById('bestWindow');
    if (!container) return;

    // Get current hour
    const now = new Date();
    const currentHour = now.getHours();

    // Hourly AQI data (placeholder — full 24h)
    const fullAQI = chartData['24'].data;

    // Slice from current hour to end of day
    const remainingAQI = fullAQI.slice(currentHour);
    const remainingHours = remainingAQI.length;

    if (remainingHours === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-family:Inter,sans-serif; padding:1rem;">No more forecast data for today.</p>';
        if (bestWindowEl) bestWindowEl.style.display = 'none';
        return;
    }

    // Build slots only from currentHour onward
    let html = '';
    remainingAQI.forEach((aqi, idx) => {
        const hour = currentHour + idx;
        const level = getTimelineLevel(aqi);
        const timeLabel = hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour < 12 ? hour + 'AM' : (hour - 12) + 'PM';
        const isNow = idx === 0;
        html += `
            <div class="timeline-slot slot-${level.cls}${isNow ? ' slot-now' : ''}">
                <span class="slot-aqi">${aqi}</span>
                <div class="slot-bar"></div>
                <span class="slot-time">${isNow ? 'Now' : timeLabel}</span>
                <span class="slot-status">${level.emoji}</span>
            </div>
        `;
    });
    container.innerHTML = html;

    // Find best window within remaining hours
    let bestStart = 0, bestEnd = 0, bestAvg = Infinity;
    for (let start = 0; start < remainingHours; start++) {
        for (let end = start + 1; end <= Math.min(start + 6, remainingHours); end++) {
            const slice = remainingAQI.slice(start, end);
            const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
            if (avg < bestAvg && (end - start) >= 2) {
                bestAvg = avg;
                bestStart = start;
                bestEnd = end;
            }
        }
    }

    const fmtHour = (h) => {
        const actual = h % 24;
        return actual === 0 ? '12:00 AM' : actual === 12 ? '12:00 PM' : actual < 12 ? actual + ':00 AM' : (actual - 12) + ':00 PM';
    };

    if (bestWindowEl) {
        if (bestAvg === Infinity || remainingHours < 2) {
            // Not enough hours left for a window
            bestWindowEl.innerHTML = `
                <span class="best-window-icon">🌙</span>
                <div class="best-window-text">
                    <span class="best-window-label">
                        <span class="best-window-dot"></span>
                        Limited forecast remaining
                    </span>
                    <span class="best-window-value">Check back tomorrow for full forecast</span>
                </div>
            `;
        } else {
            bestWindowEl.innerHTML = `
                <span class="best-window-icon">🌤️</span>
                <div class="best-window-text">
                    <span class="best-window-label">
                        <span class="best-window-dot"></span>
                        Best time to go outside
                    </span>
                    <span class="best-window-value">${fmtHour(currentHour + bestStart)} – ${fmtHour(currentHour + bestEnd)}</span>
                    <span class="best-window-detail">Predicted avg AQI: ~${Math.round(bestAvg)} · Ideal for outdoor activity</span>
                </div>
            `;
        }
    }
}

function getTimelineLevel(aqi) {
    if (aqi <= 100) return { cls: 'good', emoji: '✅' };
    if (aqi <= 140) return { cls: 'moderate', emoji: '😐' };
    if (aqi <= 160) return { cls: 'caution', emoji: '⚠️' };
    return { cls: 'unsafe', emoji: '❌' };
}


