import { createCanvasContext } from "./core/canvas.js";
import { EventBus } from "./core/events.js";
import { startLoop } from "./core/loop.js";
import { Desktop } from "./os/desktop.js";
import { WindowManager } from "./os/windowManager.js";
import { getAppDefinition } from "./os/appRegistry.js";
import { networkManager } from "./os/networkManager.js";
import { state, TIME_CONFIG } from "./state.js";
import { generateTonightWorld, evaluateCaseVerdict } from "./world/caseWorld.js";
import { getOfficerById } from "./world/caseWorld.js";

import { TraceManager } from "./systems/traceManager.js";
import { AtmosphereManager } from "./systems/atmosphereManager.js";

const bus = new EventBus();
const { canvas, ctx } = createCanvasContext("centerCanvas");

const desktop = new Desktop(networkManager);
const wm = new WindowManager();

const traceManager = new TraceManager();
const atmosphereManager = new AtmosphereManager();

if (typeof state.stress === 'undefined') state.stress = 0;

const TIME_SPEED = TIME_CONFIG.NIGHT_MINUTES / TIME_CONFIG.NIGHT_DURATION_SECONDS;

const MINER_RATE_PER_MINUTE = 0.08;
const MINER_HEAT_PER_MINUTE = 0.4;
const REMOTE_HEAT_PER_HOUR = 4;

window.addEventListener("force-open-app", (e) => {
    bus.emit("openApp", e.detail);
});

generateTonightWorld(state.time.day);

const officers = state.world.policeOfficers || [];
const policeNets = officers.map(o => ({
    ssid: o.wifiSsid,
    strength: 3,
    wpa: 2
}));
networkManager.injectNetworks(policeNets);

bus.on("openApp", (payload) => {
    let appId, appData;
    if (typeof payload === "string") {
        appId = payload;
        appData = null;
    } else {
        appId = payload.id;
        appData = payload.data;
    }

    const def = getAppDefinition(appId);
    if (!def) return;

    const instance = def.createInstance(appData);
    if (instance.setWindowManager) instance.setWindowManager(wm);

    wm.createWindow(
        appId,
        def.title,
        canvas.width,
        canvas.height,
        instance,
        def.preferredSize,
        desktop.panelHeight
    );
});

function applyStressGlitch(x, y) {
    if (state.stress < 40) return { x, y, ignored: false };

    if (state.stress > 80 && Math.random() < 0.2) {
        return { x, y, ignored: true };
    }

    const intensity = (state.stress - 40) * 0.5;
    const offsetX = (Math.random() - 0.5) * intensity;
    const offsetY = (Math.random() - 0.5) * intensity;

    return { x: x + offsetX, y: y + offsetY, ignored: false };
}


let isPointerDown = false;

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const input = applyStressGlitch(rawX, rawY);
    if (input.ignored) return;

    if (traceManager.handleClick(input.x, input.y)) {
        return;
    }

    isPointerDown = true;

    if (desktop.handleClick(input.x, input.y, canvas.width, canvas.height)) {
        return;
    }

    const panelTop = canvas.height - desktop.panelHeight;

    if (input.y < panelTop) {
        const icon = desktop.hitIcon(input.x, input.y);
        if (icon) {
            bus.emit("openApp", icon.id);
            return;
        }
        wm.pointerDown(input.x, input.y);
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (!isPointerDown) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const intensity = state.stress > 50 ? (state.stress - 50) * 0.1 : 0;
    const driftX = (Math.random() - 0.5) * intensity;

    const x = rawX + driftX;
    const y = rawY;

    wm.pointerMove(x, y, canvas.width, canvas.height, desktop.panelHeight);
});

canvas.addEventListener("mouseup", () => {
    isPointerDown = false;
    wm.pointerUp();
});

window.addEventListener("keydown", (e) => {
    wm.handleKey(e);
});

// Time & economy

function advanceTimeAndEconomy(dt) {
    const deltaMinutes = dt * TIME_SPEED;
    state.time.minutes += deltaMinutes;

    // Stress increases passively based on Police Heat
    if (state.policeHeat > 0) {
        // More heat = faster stress gain
        const stressRate = state.policeHeat * 0.05;
        state.stress += stressRate * dt;
    }
    // Natural stress decay
    if (state.policeHeat === 0 && state.stress > 0) {
        state.stress -= 1 * dt;
    }
    // Cap at 100
    state.stress = Math.min(100, Math.max(0, state.stress));

    let hourTicks = 0;
    while (state.time.minutes - state.time.lastHourMark >= 60) {
        state.time.lastHourMark += 60;
        hourTicks++;
    }

    if (state.remote.owned && state.remote.activeNetworkId && hourTicks > 0) {
        const net = networkManager.getNetworkById(state.remote.activeNetworkId);
        if (net) {
            for (let i = 0; i < hourTicks; i++) {
                const amount = 1 + Math.floor(Math.random() * 4);
                state.eightcoin += amount;
                state.policeHeat += REMOTE_HEAT_PER_HOUR;
            }
        }
    }

    if (state.miner.owned && state.miner.running) {
        const net = networkManager.getConnectedNetwork();
        if (net) {
            state.eightcoin += deltaMinutes * MINER_RATE_PER_MINUTE;
            state.policeHeat += deltaMinutes * MINER_HEAT_PER_MINUTE;
        }
    }

    if (!traceManager.active && !state.gameOver) {
        let traceChance = 0;
        if (state.policeHeat > 80) traceChance = 0.004;
        else if (state.policeHeat > 50) traceChance = 0.0015;
        else if (state.policeHeat > 20) traceChance = 0.0005;

        if (Math.random() < traceChance) {
            const difficulty = Math.floor(state.policeHeat / 30) + 1;
            traceManager.triggerTrace(difficulty);
        }
    }

    const pc = state.security.activePoliceCode;
    if (pc) {
        const officer = getOfficerById(pc.policeId);
        const t = state.time.minutes;
        if (!officer || t >= officer.dutyEndMin) {
            state.policeHeat += deltaMinutes * 3.0;
        }
    }

    if (state.time.minutes >= TIME_CONFIG.NIGHT_MINUTES) {
        const wc = state.world.case;
        if (wc && (!wc.verdict || !wc.verdict.evaluated)) {
            evaluateCaseVerdict(null, null, "timeout");
        }
        state.time.minutes -= TIME_CONFIG.NIGHT_MINUTES;
        state.time.day++;
        state.time.lastHourMark = 0;
        generateTonightWorld(state.time.day);
    }

    if (state.policeHeat > 100) {
        state.policeHeat = 100;
        state.gameOver = true;
    }
}

function update(dt) {
    if (!state.gameOver) {
        advanceTimeAndEconomy(dt);
        atmosphereManager.update(dt);
        traceManager.update(dt);
    }
    wm.update(dt);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    atmosphereManager.applyGlitchTransform(ctx);

    const activeWin = wm.windows.find(w => w.id === wm.activeWindowId);
    const activeTitle = activeWin ? activeWin.title : null;

    desktop.render(ctx, canvas.width, canvas.height, activeTitle);

    ctx.font = "14px system-ui";
    ctx.fillStyle = "#ffcc66";
    ctx.textAlign = "right";
    ctx.fillText(`E€E: ${state.eightcoin.toFixed(1)}`, canvas.width - 400, canvas.height - 15);

    const barW = 100;
    const barH = 12;
    const heatBarX = canvas.width - 340;
    const heatBarY = canvas.height - 25;

    // Label
    ctx.font = "10px monospace";
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "right";
    ctx.fillText("HEAT", heatBarX - 5, heatBarY + 9);

    // Bg
    ctx.fillStyle = "#222";
    ctx.fillRect(heatBarX, heatBarY, barW, barH);

    const heatFillW = (state.policeHeat / 100) * barW;
    let heatColor = "#00aaff";
    if (state.policeHeat > 50) heatColor = "#ffaa00";
    if (state.policeHeat > 80) heatColor = "#ff0000";

    ctx.fillStyle = heatColor;
    ctx.fillRect(heatBarX, heatBarY, heatFillW, barH);

    // Border
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(heatBarX, heatBarY, barW, barH);

    const barX = canvas.width - 220;
    const barY = canvas.height - 25;

    // Label
    ctx.font = "10px monospace";
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "right";
    ctx.fillText("STRESS", barX - 5, barY + 9);

    // Bg
    ctx.fillStyle = "#222";
    ctx.fillRect(barX, barY, barW, barH);

    // Fill
    const fillW = (state.stress / 100) * barW;
    let color = "#00ff00";
    if (state.stress > 50) color = "#ffff00";
    if (state.stress > 80) color = "#ff0000";

    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, fillW, barH);

    // Border
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    wm.render(ctx);
    ctx.restore();

    atmosphereManager.renderOverlay(ctx, canvas.width, canvas.height);
    traceManager.render(ctx, canvas.width, canvas.height);

    if (state.gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff6666";
        ctx.textAlign = "center";
        ctx.font = "32px system-ui";
        ctx.fillText("POLICE CAPTURED YOU", canvas.width/2, canvas.height/2);
    }
}

startLoop(update, render);