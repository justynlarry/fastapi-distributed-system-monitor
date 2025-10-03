const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");

// Global storage for last known good metrics
let metricsGold = { cpu: 0, ram: 0, disk: 0, hostname: "Error", statusColor: "rgb(255,0,0)" };
let metricsBlue = { cpu: 0, ram: 0, disk: 0, hostname: "Error", statusColor: "rgb(255,0,0)" };


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

// API endpoints (now using /metrics instead of /system-status)
const API_URL_GOLD = "http://100.121.87.54:8000/metrics";
const API_URL_BLUE = "http://100.79.53.58:8000/metrics";

// Layout constants (percent-based)
const LINE_DIAGONAL_LENGTH = 15;
const LINE_HORIZONTAL_LENGTH = 25;
const TEXT_PADDING_X = 10;
const TEXT_PADDING_Y = -5;

// Utility: Fetch metrics
async function fetchMetrics(url, lastMetrics = null) {
    // Set explicit timeout to 4 seconds, shorter than the 5-second poll interval
    const TIMEOUT_MS = 4000;

    try {
        // Create a controller to abort the fetch if it takes too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId); // Clear timeout if fetch succeeds

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const metrics = await res.json();
        return {
            cpu: metrics.cpu_usage_percent || 0,
            ram: metrics.memory_usage_percent || 0,
            disk: metrics.disk_usage_percent || 0,
            hostname: metrics.hostname || "Unknown",
            // Use the statusColor of the server's primary color if successful
            statusColor: (url === API_URL_GOLD) ? GOLD : BLUE
        };
    } catch (err) {
        console.error(`Error fetching ${url}:`, err.name || err);

        // **CRITICAL CHANGE:** If a fetch fails, return the *last known good data*.
        // This prevents the graph from resetting and blinking.
        if (lastMetrics) {
            // Return previous metrics but set the statusColor to RED to indicate failure
            // Note: We keep the RAM (GREEN) and DISK (WHITE) metrics as they are drawn 
            // separately based on the hardcoded color constants, but the CPU color
            // will reflect the connection status.
            return { ...lastMetrics, statusColor: RED };
        }

        // If this is the *first* failed poll, return the default error state
        return {
            cpu: 0,
            ram: 0,
            disk: 0,
            hostname: "Error",
            statusColor: RED
        };
    }
}

// Draw one metric
function drawMetric(baseX, yOffset, color, label, percent, hostname, statusColor) {
    const Y_START = canvas.height * 0.9; // place near bottom

    // Use relative positioning
    const xPos = baseX + yOffset;
    const yPos = Y_START - (percent * (canvas.height / 300)); // scale with screen

    const radius = Math.max(5, Math.floor(5 + percent * 0.5));

    // Circle
    ctx.beginPath();
    // Use statusColor for the CPU metric circle/line (label == "CPU")
    const drawColor = (label === "CPU") ? statusColor : color;

    ctx.arc(xPos, yPos, radius, 0, Math.PI * 2);
    ctx.fillStyle = drawColor;
    ctx.fill();

    // Line
    const lineStartX = xPos + radius;
    const lineStartY = yPos;
    const lineDiagEndX = lineStartX + LINE_DIAGONAL_LENGTH;
    const lineDiagEndY = lineStartY - LINE_DIAGONAL_LENGTH;
    const lineHorizEndX = lineDiagEndX + LINE_HORIZONTAL_LENGTH;
    const lineHorizEndY = lineDiagEndY;

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineStartY);
    ctx.lineTo(lineDiagEndX, lineDiagEndY);
    ctx.lineTo(lineHorizEndX, lineHorizEndY);
    ctx.stroke();

    // Text
    ctx.fillStyle = drawColor;
    ctx.font = `${Math.floor(canvas.width * 0.007)}px Arial`; // scale font
    ctx.fillText(`${hostname}`, lineHorizEndX + TEXT_PADDING_X, lineHorizEndY + TEXT_PADDING_Y);
    ctx.fillText(`${label}: ${percent.toFixed(1)}%`, lineHorizEndX + TEXT_PADDING_X, lineHorizEndY + 16);
}

// Main loop
async function mainLoop() {
    // Clear screen
    ctx.fillStyle = "rgba(0,0,0,0.6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fetch metrics, passing the last good data
    const [newMetricsGold, newMetricsBlue] = await Promise.all([
        fetchMetrics(API_URL_GOLD, metricsGold),
        fetchMetrics(API_URL_BLUE, metricsBlue)
    ]);

    // Update global storage with the results (new or old if fetch failed)
    metricsGold = newMetricsGold;
    metricsBlue = newMetricsBlue;

    // GOLD server (left side ~20% of width)
    const BASE_X_GOLD = canvas.width * 0.05;
    // Pass the statusColor for the CPU metric
    drawMetric(BASE_X_GOLD, 0, GOLD, "CPU", metricsGold.cpu, metricsGold.hostname, metricsGold.statusColor);
    drawMetric(BASE_X_GOLD, canvas.width * 0.15, GREEN, "RAM", metricsGold.ram, metricsGold.hostname, GREEN);
    drawMetric(BASE_X_GOLD, canvas.width * 0.3, WHITE, "DISK", metricsGold.disk, metricsGold.hostname, WHITE);

    // BLUE server (right side ~60% of width)
    const BASE_X_BLUE = canvas.width * 0.5;
    // Pass the statusColor for the CPU metric
    drawMetric(BASE_X_BLUE, 0, BLUE, "CPU", metricsBlue.cpu, metricsBlue.hostname, metricsBlue.statusColor);
    drawMetric(BASE_X_BLUE, canvas.width * 0.2, GREEN, "RAM", metricsBlue.ram, metricsBlue.hostname, GREEN);
    drawMetric(BASE_X_BLUE, canvas.width * 0.35, WHITE, "DISK", metricsBlue.disk, metricsBlue.hostname, WHITE);
}

// Run at 1 FPS (1000ms is standard, but you changed it to 5000ms)
// We'll stick with your 5000ms for now, but 1000ms is usually fine after all fixes.
// If it still blinks, ensure you check your firewalls!
setInterval(mainLoop, 6000);