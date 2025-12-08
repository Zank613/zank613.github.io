import { state, installApp } from "../state.js";
import { networkManager } from "../os/networkManager.js";

export class DebugManager {
    constructor(traceManager) {
        this.active = false;
        this.traceManager = traceManager;
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener("keydown", (e) => {
            // TOGGLE: Ctrl + Shift + D
            if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "D") {
                this.toggle();
                e.preventDefault();
                return;
            }

            // Only run cheats if Debug Mode is ON
            if (!this.active) return;

            // Cheat Shortcuts (Using ALT to avoid conflict with typing)
            if (e.altKey) {
                switch(e.key.toLowerCase()) {
                    case "m": this.addMoney(); break; // Money
                    case "h": this.clearHeat(); break; // Heat
                    case "u": this.unlockAll(); break; // Unlock Everything
                    case "t": this.timeTravel(); break; // +1 Hour
                    case "x": this.triggerTrace(); break; // Test Trace
                    case "w": this.regenWorld(); break; // New Day/World
                    case "k": this.crackWifi(); break; // Crack current WiFi
                }
            }
        });
    }

    toggle() {
        this.active = !this.active;
        console.log(`%c[DEBUG MODE] ${this.active ? "ENABLED" : "DISABLED"}`, "color: #00ff00; font-weight: bold; font-size: 14px;");

        // Subtle visual cue (Red border at top of screen)
        if (this.active) {
            const cue = document.createElement("div");
            cue.id = "debug-indicator";
            cue.style.position = "fixed";
            cue.style.top = "0";
            cue.style.left = "0";
            cue.style.width = "100%";
            cue.style.height = "4px";
            cue.style.backgroundColor = "red";
            cue.style.zIndex = "9999";
            cue.style.pointerEvents = "none";
            document.body.appendChild(cue);
        } else {
            const cue = document.getElementById("debug-indicator");
            if (cue) cue.remove();
        }
    }

    addMoney() {
        state.eightcoin += 100;
        console.log("[DEBUG] Added 100 E€E");
    }

    clearHeat() {
        state.policeHeat = 0;
        state.gameOver = false; // Revive if dead
        console.log("[DEBUG] Heat Cleared / Revived");
    }

    unlockAll() {
        // 1. Install All Apps
        const allApps = [
            "settings", "cases", "citizen", "id", "police", "sim", "tel",
            "nethacker", "notepad", "shop", "net", "duty", "stressReducer",
            "browser", "virusex", "taskman", "miner", "remote"
        ];
        allApps.forEach(id => installApp(id));

        // 2. Unlock Tools
        state.miner.owned = true;
        state.remote.owned = true;
        state.router.owned = true;
        state.vpn.tier = 4;
        state.libs.wp1 = true;
        state.libs.wp2 = true;
        state.libs.wp3 = true;
        state.virusTools.exterminatorCharges += 5;

        console.log("[DEBUG] All Apps & Tools Unlocked");
    }

    timeTravel() {
        state.time.minutes += 60;
        console.log("[DEBUG] Time Advanced +1h");
    }

    triggerTrace() {
        if (this.traceManager) {
            this.traceManager.triggerTrace(5); // Difficulty 5
            console.log("[DEBUG] Max Trace Triggered");
        }
    }

    regenWorld() {
        // Simulates a new day generation instantly
        state.time.day++;
        window.dispatchEvent(new CustomEvent("centeros-new-day"));
        window.dispatchEvent(new CustomEvent("centeros-refresh-sites"));
        console.log("[DEBUG] World Regenerated (Next Day)");
    }

    crackWifi() {
        const net = networkManager.getConnectedNetwork();
        if (net) {
            networkManager.markKnown(net.id);
            console.log(`[DEBUG] Network '${net.ssid}' Marked as Cracked`);
        }
    }
}