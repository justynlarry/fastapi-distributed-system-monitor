const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");

// Resize canvas dynamically
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Colors
const WHITE = "rgb(255,255,255)";
const GOLD = "rgb(255,215,0)";
const GREEN = "rgb(100,255,100)";
const BLUE = "rgb(0,47,167)";
const RED = "rgb(255,0,0)";

// API endpoints
const API_URL_GOLD = "http://100.121.87.54:8000/system-status";
const API_URL_BLUE = "http://100.79.53.58:8000/system-status";

// Layout constants (percent-based)
const LINE_DIAGONAL_LENGTH = 15;
const LINE_HORIZONTAL_LENGTH = 25;
const TEXT_PADDING_X = 10;
const TEXT_PADDING_Y = -5;

// Utility: Fetch metrics
async function fetchMetrics(url) {
    try {
        const res = await fetch(url);
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

// Draw one metric
function drawMetric(baseX, yOffset, color, label, percent, hostname) {
    const Y_START = canvas.height * 0.9; // place near bottom

    // Use relative positioning
    const xPos = baseX + yOffset;
    const yPos = Y_START - (percent * (canvas.height / 300)); // scale with screen

    const radius = Math.max(5, Math.floor(5 + percent * 0.5));

    // Circle
    ctx.beginPath();
    ctx.arc(xPos, yPos, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Line
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
    ctx.font = `${Math.floor(canvas.width * 0.007)}px Arial`; // scale font
    ctx.fillText(`${hostname}`, lineHorizEndX + TEXT_PADDING_X, lineHorizEndY + TEXT_PADDING_Y);
    ctx.fillText(`${label}: ${percent.toFixed(1)}%`, lineHorizEndX + TEXT_PADDING_X, lineHorizEndY + 16);
}

// Main loop
async function mainLoop() {
    // Clear screen
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fetch metrics
    const [metricsGold, metricsBlue] = await Promise.all([
        fetchMetrics(API_URL_GOLD),
        fetchMetrics(API_URL_BLUE)
    ]);

    // GOLD server (left side ~20% of width)
    const BASE_X_GOLD = canvas.width * 0.2;
    drawMetric(BASE_X_GOLD, 0, GOLD, "CPU", metricsGold.cpu, metricsGold.hostname);
    drawMetric(BASE_X_GOLD, canvas.width * 0.15, GREEN, "RAM", metricsGold.ram, metricsGold.hostname);
    drawMetric(BASE_X_GOLD, canvas.width * 0.3, WHITE, "DISK", metricsGold.disk, metricsGold.hostname);

    // BLUE server (right side ~60% of width)
    const BASE_X_BLUE = canvas.width * 0.6;
    drawMetric(BASE_X_BLUE, 0, BLUE, "CPU", metricsBlue.cpu, metricsBlue.hostname);
    drawMetric(BASE_X_BLUE, canvas.width * 0.2, GREEN, "RAM", metricsBlue.ram, metricsBlue.hostname);
    drawMetric(BASE_X_BLUE, canvas.width * 0.35, WHITE, "DISK", metricsBlue.disk, metricsBlue.hostname);
}

// Run at ~2 FPS (500ms)
setInterval(mainLoop, 500);
