// --- Setup ---
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");

// Colors
const WHITE = "rgb(255,255,255)";
const GOLD = "rgb(255,215,0)";
const GREEN = "rgb(100,255,100)";
const BLUE = "rgb(0,47,167)";
const RED = "rgb(255,0,0)";

// API endpoints
const API_URL_GOLD = "http://100.121.87.54:8000/system-status";
const API_URL_BLUE = "http://100.79.53.58:8000/system-status";

// Layout constants
const LINE_DIAGONAL_LENGTH = 15;
const LINE_HORIZONTAL_LENGTH = 25;
const TEXT_PADDING_X = 10;
const TEXT_PADDING_Y = -5;
const BASE_X_GOLD = 100;
const BASE_X_BLUE = 800;
const Y_START = 1000;

// --- Utility: Fetch metrics ---
async function fetchMetrics(url) {
    try {
        const res = await fetch(url, { timeout: 2000 });
        const metrics = await res.json();
        return {
            cpu: metrics.cpu_usage_percent || 0,
            ram: metrics.memory_usage_percent || 0,
            disk: metrics.disk_usage_percent || 0,
            hostname: metrics.hostname || "Error",
            statusColor: WHITE
        };
    } catch (err) {
        console.error(`Error fetching ${url}:`, err);
        return {
            cpu: 0, ram: 0, disk: 0,
            hostname: "Error",
            statusColor: RED
        };
    }
}

// --- Draw one metric ---
function drawMetric(baseX, yOffset, color, label, percent, hostname) {
    const xPos = baseX + yOffset;
    const yPos = Y_START - (percent * 4);

    const radius = Math.max(5, Math.floor(5 + percent * 1.5));

    // Draw circle
    ctx.beginPath();
    ctx.arc(xPos, yPos, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Styled line
    const lineStartX = xPos + radius;
    const lineStartY = yPos;
    const lineDiagEndX = lineStartX + LINE_DIAGONAL_LENGTH;
    const lineDiagEndY = lineStartY - LINE_DIAGONAL_LENGTH;
    const lineHorizEndX = lineDiagEndX + LINE_HORIZONTAL_LENGTH;
    const lineHorizEndY = lineDiagEndY;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineStartY);
    ctx.lineTo(lineDiagEndX, lineDiagEndY);
    ctx.lineTo(lineHorizEndX, lineHorizEndY);
    ctx.stroke();

    // Text
    ctx.fillStyle = color;
    ctx.font = "14px Arial";
    ctx.fillText(`${hostname}`, lineHorizEndX + TEXT_PADDING_X, lineHorizEndY + TEXT_PADDING_Y);
    ctx.fillText(`${label}: ${percent.toFixed(1)}%`, lineHorizEndX + TEXT_PADDING_X, lineHorizEndY + 16);
}

// --- Main loop ---
async function mainLoop() {
    // Clear screen
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fetch data
    const [metricsGold, metricsBlue] = await Promise.all([
        fetchMetrics(API_URL_GOLD),
        fetchMetrics(API_URL_BLUE)
    ]);

    // Draw GOLD
    drawMetric(BASE_X_GOLD, 0, GOLD, "CPU", metricsGold.cpu, metricsGold.hostname);
    drawMetric(BASE_X_GOLD, 300, GREEN, "RAM", metricsGold.ram, metricsGold.hostname);
    drawMetric(BASE_X_GOLD, 500, WHITE, "DISK", metricsGold.disk, metricsGold.hostname);

    // Draw BLUE
    drawMetric(BASE_X_BLUE, 100, BLUE, "CPU", metricsBlue.cpu, metricsBlue.hostname);
    drawMetric(BASE_X_BLUE, 400, GREEN, "RAM", metricsBlue.ram, metricsBlue.hostname);
    drawMetric(BASE_X_BLUE, 600, WHITE, "DISK", metricsBlue.disk, metricsBlue.hostname);
}

// Run at 2 FPS (like clock.tick(2) in pygame)
setInterval(mainLoop, 500);
