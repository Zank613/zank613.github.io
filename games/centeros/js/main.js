import { createCanvasContext } from "./core/canvas.js";
import { EventBus } from "./core/events.js";
import { startLoop } from "./core/loop.js";

// OS / Engine Imports
import { Desktop } from "./os/desktop.js";
import { WindowManager } from "./os/windowManager.js";
import { appRegistry } from "./os/appRegistry.js";
import { networkManager } from "./os/networkManager.js";
import { TraceManager } from "./systems/traceManager.js";
import { AtmosphereManager } from "./systems/atmosphereManager.js";
import { themeManager } from "./os/theme.js";
import { generateSiteWorld } from "./world/siteGenerator.js";

// Game State
import { state, TIME_CONFIG } from "./state.js";
import { generateTonightWorld, evaluateCaseVerdict, getOfficerById } from "./world/caseWorld.js";

// === APP IMPORTS ===
import { NetHackerApp } from "./apps/netHackerApp.js";
import { NotepadApp } from "./apps/notepadApp.js";
import { UnderworldApp } from "./apps/underworldApp.js";
import { EightminerApp } from "./apps/eightminerApp.js";
import { RemoteAccesserApp } from "./apps/remoteAccesserApp.js";
import { CaseManagerApp } from "./apps/caseManagerApp.js";
import { CitizenDbApp } from "./apps/citizenDbApp.js";
import { IdDbApp } from "./apps/idDbApp.js";
import { PoliceDbApp } from "./apps/policeDbApp.js";
import { SimDbApp } from "./apps/simDbApp.js";
import { TelScannerApp } from "./apps/telScannerApp.js";
import { AuthLinkApp } from "./apps/authLinkApp.js";
import { DutyBoardApp } from "./apps/dutyBoardApp.js";
import { StressReliefApp } from "./apps/stressReliefApp.js";
import { BrowserApp } from "./apps/browserApp.js";
import { VirusExterminatorApp } from "./apps/virusExterminatorApp.js";
import { SettingsApp } from "./apps/settingsApp.js";
import { NetToolsApp } from "./apps/netToolsApp.js";
import { TaskManagerApp } from "./apps/taskManagerApp.js";

// ==============================================
// 1. REGISTER APPS
// ==============================================

appRegistry.register("settings", {
    title: "Settings",
    preferredSize: { width: 500, height: 350 },
    createInstance: () => new SettingsApp()
});
appRegistry.register("cases", {
    title: "Case Manager",
    preferredSize: { width: 720, height: 460 },
    createInstance: (data) => new CaseManagerApp(data)
});
appRegistry.register("citizen", {
    title: "Citizen_DB",
    preferredSize: { width: 680, height: 420 },
    createInstance: (data) => new CitizenDbApp(data)
});
appRegistry.register("id", {
    title: "ID_DB",
    preferredSize: { width: 520, height: 360 },
    createInstance: (data) => new IdDbApp(data)
});
appRegistry.register("police", {
    title: "Police_DB",
    preferredSize: { width: 680, height: 380 },
    createInstance: (data) => new PoliceDbApp(data)
});
appRegistry.register("sim", {
    title: "Sim_DB",
    preferredSize: { width: 520, height: 360 },
    createInstance: (data) => new SimDbApp(data)
});
appRegistry.register("tel", {
    title: "TelScanner",
    preferredSize: { width: 700, height: 440 },
    createInstance: (data) => new TelScannerApp(data)
});
appRegistry.register("nethacker", {
    title: "NetHacker",
    preferredSize: { width: 640, height: 380 },
    createInstance: (data) => new NetHackerApp(data)
});
appRegistry.register("notepad", {
    title: "Notepad",
    preferredSize: { width: 480, height: 320 },
    createInstance: (data) => new NotepadApp(data)
});
appRegistry.register("miner", {
    title: "Eightminer",
    preferredSize: { width: 520, height: 340 },
    createInstance: (data) => new EightminerApp(data)
});
appRegistry.register("remote", {
    title: "RemoteAccesser",
    preferredSize: { width: 520, height: 340 },
    createInstance: (data) => new RemoteAccesserApp(data)
});
appRegistry.register("shop", {
    title: "Underworld Market",
    preferredSize: { width: 620, height: 680 },
    createInstance: (data) => new UnderworldApp(data)
});
appRegistry.register("net", {
    title: "Network Tools",
    preferredSize: { width: 540, height: 320 },
    createInstance: () => new NetToolsApp()
});
appRegistry.register("duty", {
    title: "Duty Board",
    preferredSize: { width: 400, height: 500 },
    createInstance: (data) => new DutyBoardApp(data)
});
appRegistry.register("authlink", {
    title: "AuthLink Protocol",
    preferredSize: { width: 800, height: 600 },
    createInstance: () => new AuthLinkApp(window.pendingAuthPoliceId)
});
appRegistry.register("stressReducer", {
    title: "StressReducer",
    preferredSize: { width: 300, height: 250},
    createInstance: () => new StressReliefApp()
});
appRegistry.register("browser", {
    title: "Browser",
    preferredSize: {width: 800, height: 600},
    createInstance: () => new BrowserApp()
});
appRegistry.register("virusex", {
    title: "VirusExterminator",
    preferredSize: {width: 300, height: 250},
    createInstance: () => new VirusExterminatorApp()
});
appRegistry.register("taskman", {
    title: "Task Manager",
    preferredSize: { width: 400, height: 350 },
    createInstance: () => new TaskManagerApp()
});

// ==============================================
// 2. ENGINE INITIALIZATION
// ==============================================

const bus = new EventBus();
const { canvas, ctx } = createCanvasContext("centerCanvas");

const atmosphereManager = new AtmosphereManager();
const wm = new WindowManager();
const desktop = new Desktop(networkManager, atmosphereManager);
const traceManager = new TraceManager();

desktop.setWindowManager(wm);
desktop.setTaskbarPosition("bottom");

window.addEventListener("centeros-settings-change", (e) => {
    const { type, value } = e.detail;
    if (type === "theme") {
        themeManager.setTheme(value);
    } else if (type === "font") {
        themeManager.setFont(value);
    } else if (type === "taskbar") {
        desktop.setTaskbarPosition(value);
    }
});

// ==============================================
// 3. GAME CONFIGURATION (Icons & UI)
// ==============================================

desktop.registerIcon({ id: "cases",     label: "Cases",           color: "#37a0ff" });
desktop.registerIcon({ id: "citizen",   label: "Citizen_DB",      color: "#66d9ef" });
desktop.registerIcon({ id: "id",        label: "ID_DB",           color: "#ffb347" });
desktop.registerIcon({ id: "police",    label: "Police_DB",       color: "#ff6666" });
desktop.registerIcon({ id: "sim",       label: "Sim_DB",          color: "#88ff88" });
desktop.registerIcon({ id: "tel",       label: "TelScan",         color: "#ccaaff" });
desktop.registerIcon({ id: "nethacker", label: "NetHacker",       color: "#ffcc00" });
desktop.registerIcon({ id: "notepad",   label: "Notes",           color: "#8888ff" });
desktop.registerIcon({ id: "miner",     label: "Miner",           color: "#ff8800" });
desktop.registerIcon({ id: "remote",    label: "Remote",          color: "#66ff99" });
desktop.registerIcon({ id: "shop",      label: "Shop",            color: "#ff7043" });
desktop.registerIcon({ id: "net",       label: "Net",             color: "#4caf50" });
desktop.registerIcon({ id: "duty",          label: "DutyBoard",       color: "#999999" });
desktop.registerIcon({ id: "stressReducer", label: "StressReducer",   color: "#dc2acf" });
desktop.registerIcon({ id: "browser",       label: "Browser",         color: "#9e9393" });
desktop.registerIcon({ id: "virusex",       label: "VirusExterminator", color: "#ea0000" });
desktop.registerIcon({ id: "settings", label: "Settings", color: "#888888" });
desktop.registerIcon({ id: "taskman", label: "TaskMgr", color: "#55aa55" });

desktop.setCustomPanelRenderer((ctx, w, h, ph) => {
    const fonts = themeManager.getFonts();
    const barY = (desktop.taskbarPosition === 'bottom') ? h - ph : 0;
    const isHorizontal = (desktop.taskbarPosition === 'bottom' || desktop.taskbarPosition === 'top');

    if (!isHorizontal) return;

    const centerY = barY + ph / 2;

    ctx.font = fonts.panel;
    ctx.textBaseline = "middle";

    const clockX = w - 20;
    const stressX = w - 110;
    const heatX = w - 220;
    const coinX = w - 320;

    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 2;

    // Clock
    const baseMinutes = 21 * 60;
    const total = baseMinutes + state.time.minutes;
    const dayMinutes = total % (24 * 60);
    const hour = Math.floor(dayMinutes / 60);
    const minute = Math.floor(dayMinutes % 60);
    const timeStr = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");

    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`D${state.time.day} ${timeStr}`, clockX, centerY);

    // Stress
    const stress = Math.round(Math.max(0, Math.min(100, state.stress)));
    ctx.fillStyle = stress > 50 ? "#ff5555" : "#aaaaaa";
    if (stress > 80 && Math.floor(Date.now() / 500) % 2 === 0) ctx.fillStyle = "#ffffff";
    ctx.fillText(`Stress: ${stress}%`, stressX, centerY);

    // Heat
    const heat = Math.round(Math.max(0, Math.min(100, state.policeHeat)));
    ctx.fillStyle = heat > 50 ? "#ff9966" : "#55aaff";
    ctx.fillText(`Heat: ${heat}%`, heatX, centerY);

    // Coins
    const coins = state.eightcoin.toFixed(1);
    ctx.fillStyle = "#ffcc66";
    ctx.fillText(`E€E: ${coins}`, coinX, centerY);

    ctx.shadowBlur = 0;
});

// ==============================================
// 4. LOGIC & EVENTS
// ==============================================

if (typeof state.stress === 'undefined') state.stress = 0;

const TIME_SPEED = TIME_CONFIG.NIGHT_MINUTES / TIME_CONFIG.NIGHT_DURATION_SECONDS;
const MINER_RATE_PER_MINUTE = 0.08;
const MINER_HEAT_PER_MINUTE = 0.4;
const REMOTE_HEAT_PER_HOUR = 4;

window.addEventListener("centeros-open-auth", (e) => {
    window.pendingAuthPoliceId = e.detail.policeId;
    bus.emit("openApp", "authlink");
});

window.addEventListener("force-open-app", (e) => {
    bus.emit("openApp", e.detail);
});

window.addEventListener("centeros-trigger-trace", (e) => {
    if (state.gameOver) return;
    const detail = e.detail || {};
    const difficulty =
        detail.difficulty ||
        (Math.floor((state.policeHeat || 0) / 30) + 1);

    if (!traceManager.active) {
        traceManager.triggerTrace(difficulty);
    }
});

generateTonightWorld(state.time.day);

const officers = state.world.policeOfficers || [];
const policeNets = officers.map(o => ({
    ssid: o.wifiSsid,
    strength: 3,
    wpa: 2
}));
networkManager.injectNetworks(policeNets);

// Event: Open App
bus.on("openApp", (payload) => {
    let appId, appData;
    if (typeof payload === "string") {
        appId = payload;
        appData = null;
    } else {
        appId = payload.id;
        appData = payload.data;
    }

    const def = appRegistry.get(appId);
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

// Stress Glitch Effect
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

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Trace Check
    if (traceManager.handleClick(x, y)) return;

    // 2. Window Manager (Resize/Drag/Focus)
    if (wm.pointerDown(x, y)) return;

    // 3. Desktop/Taskbar Check
    if (desktop.handleClick(x, y)) return;
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    wm.pointerMove(x, y, canvas);
});

canvas.addEventListener("mouseup", () => {
    wm.pointerUp();
});

window.addEventListener("keydown", (e) => {
    wm.handleKey(e);
});

canvas.addEventListener("wheel", (e) => {
    e.preventDefault(); // Prevent browser page scrolling
    wm.handleWheel(e);
}, { passive: false });

// Time & Economy Logic
function advanceTimeAndEconomy(dt) {
    const deltaMinutes = dt * TIME_SPEED;
    state.time.minutes += deltaMinutes;

    if (state.policeHeat > 0) {
        const stressRate = state.policeHeat * 0.05;
        state.stress += stressRate * dt;
    }
    if (state.policeHeat === 0 && state.stress > 0) {
        state.stress -= 1 * dt;
    }
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

// World Initialization

// Initial site generation and event listener setup
function setupSiteGeneration() {
    // Generate initial site content
    generateSiteWorld(state.time.day, state.world.citizens, state.world.case);

    // Re-generate content on every new day or when specifically requested
    window.addEventListener("centeros-new-day", () => {
        generateSiteWorld(state.time.day, state.world.citizens, state.world.case);
        console.log("Site content regenerated for new day.");
    });

    // Listen for the refresh event
    window.addEventListener("centeros-refresh-sites", () => {
        generateSiteWorld(state.time.day, state.world.citizens, state.world.case);
    });
}

setupSiteGeneration();

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