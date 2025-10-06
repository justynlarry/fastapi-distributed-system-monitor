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

// Layout constants
const LINE_DIAGONAL_LENGTH = 15;
const LINE_HORIZONTAL_LENGTH = 25;
const TEXT_PADDING_X = 10;
const TEXT_PADDING_Y = -5;

// ✅ Define all monitored servers in one list
const servers = [
    {
        name: "Gold",
        color: GOLD,
        api: "http://100.121.87.54:8000/metrics",
        baseX: 0.05, // relative X position
        lastMetrics: { cpu: 0, ram: 0, disk: 0, hostname: "Error", statusColor: RED }
    },
    {
        name: "Blue",
        color: BLUE,
        api: "http://100.79.53.58:8000/metrics",
        baseX: 0.5,
        lastMetrics: { cpu: 0, ram: 0, disk: 0, hostname: "Error", statusColor: RED }
    }
];

// Utility: Fetch metrics
async function fetchMetrics(url, lastMetrics = null, primaryColor = RED) {
    const TIMEOUT_MS = 4000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const metrics = await res.json();
        return {
            cpu: metrics.cpu_usage_percent || 0,
            ram: metrics.memory_usage_percent || 0,
            disk: metrics.disk_usage_percent || 0,
            hostname: metrics.hostname || "Unknown",
            statusColor: primaryColor
        };
    } catch (err) {
        console.error(`Error fetching ${url}:`, err.name || err);
        return lastMetrics
            ? { ...lastMetrics, statusColor: RED }
            : { cpu: 0, ram: 0, disk: 0, hostname: "Error", statusColor: RED };
    }
}

// Draw one metric
function drawMetric(baseX, yOffset, color, label, percent, hostname, statusColor) {
    const Y_START = canvas.height * 0.9;
    const xPos = baseX + yOffset;
    const yPos = Y_START - (percent * (canvas.height / 300));
    const radius = Math.max(5, Math.floor(5 + percent * 0.5));

    // Circle
    ctx.beginPath();
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
    ctx.font = `${Math.floor(canvas.width * 0.007)}px Arial`;
    ctx.fillText(`${hostname}`, lineHorizEndX + TEXT_PADDING_X, lineHorizEndY + TEXT_PADDING_Y);
    ctx.fillText(`${label}: ${percent.toFixed(1)}%`, lineHorizEndX + TEXT_PADDING_X, lineHorizEndY + 16);
}

// Main loop
async function mainLoop() {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Loop through each server
    for (const server of servers) {
        const newMetrics = await fetchMetrics(server.api, server.lastMetrics, server.color);
        server.lastMetrics = newMetrics;

        const BASE_X = canvas.width * server.baseX;
        const { cpu, ram, disk, hostname, statusColor } = server.lastMetrics;

        drawMetric(BASE_X, 0, server.color, "CPU", cpu, hostname, statusColor);
        drawMetric(BASE_X, canvas.width * 0.15, GREEN, "RAM", ram, hostname, GREEN);
        drawMetric(BASE_X, canvas.width * 0.3, WHITE, "DISK", disk, hostname, WHITE);
    }
}

// Run every 6 seconds
setInterval(mainLoop, 10000);
