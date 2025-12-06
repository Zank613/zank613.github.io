import { NetHackerApp } from "../apps/netHackerApp.js";
import { NotepadApp } from "../apps/notepadApp.js";
import { UnderworldApp } from "../apps/underworldApp.js";
import { EightminerApp } from "../apps/eightminerApp.js";
import { RemoteAccesserApp } from "../apps/remoteAccesserApp.js";
import { CaseManagerApp } from "../apps/caseManagerApp.js";
import { CitizenDbApp } from "../apps/citizenDbApp.js";
import { IdDbApp } from "../apps/idDbApp.js";
import { PoliceDbApp } from "../apps/policeDbApp.js";
import { SimDbApp } from "../apps/simDbApp.js";
import { TelScannerApp } from "../apps/telScannerApp.js";
import { AuthLinkApp } from "../apps/authLinkApp.js";
import { DutyBoardApp } from "../apps/dutyBoardApp.js";
import { StressReliefApp } from "../apps/stressReliefApp.js";
import { BrowserApp } from "../apps/browserApp.js";

const NetToolsApp = {
    update() {},
    render(ctx, rect) {
        ctx.fillStyle = "#111822";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px system-ui";
        ctx.fillText("Network Tools (placeholder)", rect.x + 16, rect.y + 32);
    }
};

export const appDefinitions = [
    {
        id: "cases",
        title: "Case Manager",
        preferredSize: { width: 720, height: 460 },
        createInstance(data) { return new CaseManagerApp(data); }
    },
    {
        id: "citizen",
        title: "Citizen_DB",
        preferredSize: { width: 680, height: 420 },
        createInstance(data) { return new CitizenDbApp(data); }
    },
    {
        id: "id",
        title: "ID_DB",
        preferredSize: { width: 520, height: 360 },
        createInstance(data) { return new IdDbApp(data); }
    },
    {
        id: "police",
        title: "Police_DB",
        preferredSize: { width: 680, height: 380 },
        createInstance(data) { return new PoliceDbApp(data); }
    },
    {
        id: "sim",
        title: "Sim_DB",
        preferredSize: { width: 520, height: 360 },
        createInstance(data) { return new SimDbApp(data); }
    },
    {
        id: "tel",
        title: "TelScanner",
        preferredSize: { width: 700, height: 440 },
        createInstance(data) { return new TelScannerApp(data); }
    },
    {
        id: "nethacker",
        title: "NetHacker",
        preferredSize: { width: 640, height: 380 },
        createInstance(data) { return new NetHackerApp(data); }
    },
    {
        id: "notepad",
        title: "Notepad",
        preferredSize: { width: 480, height: 320 },
        createInstance(data) { return new NotepadApp(data); }
    },
    {
        id: "miner",
        title: "Eightminer",
        preferredSize: { width: 520, height: 340 },
        createInstance(data) { return new EightminerApp(data); }
    },
    {
        id: "remote",
        title: "RemoteAccesser",
        preferredSize: { width: 520, height: 340 },
        createInstance(data) { return new RemoteAccesserApp(data); }
    },
    {
        id: "shop",
        title: "Underworld Market",
        preferredSize: { width: 620, height: 630 },
        createInstance(data) { return new UnderworldApp(data); }
    },
    {
        id: "net",
        title: "Network Tools",
        preferredSize: { width: 540, height: 320 },
        createInstance() { return NetToolsApp; }
    },
    {
        id: "duty",
        title: "Duty Board",
        preferredSize: { width: 400, height: 500 },
        createInstance(data) { return new DutyBoardApp(data); }
    },
    {
        id: "authlink",
        title: "AuthLink Protocol",
        preferredSize: { width: 800, height: 600 },
        createInstance() {
            return new AuthLinkApp(window.pendingAuthPoliceId);
        }
    },
    {
        id: "stressReducer",
        title: "StressReducer",
        preferredSize: { width: 300, height: 250},
        createInstance: () => new StressReliefApp()
    },
    {
        id: "browser",
        title: "Browser",
        preferredSize: {width: 800, height: 600},
        createInstance: () => new BrowserApp()
    }
];

export function getAppDefinition(appId) {
    return appDefinitions.find(a => a.id === appId) || null;
}

// This listens for NetHacker requesting the minigame
window.addEventListener("centeros-open-auth", (e) => {
    window.pendingAuthPoliceId = e.detail.policeId;
    // Dispatch a standard DOM event
    const event = new CustomEvent("force-open-app", { detail: "authlink" });
    window.dispatchEvent(event);
});