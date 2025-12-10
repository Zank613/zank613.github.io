import { state } from "../state.js";
import { networkManager } from "../os/networkManager.js";

export class ScriptSystem {
    static execute(file) {
        if (!file || !file.content) return { success: false, message: "File corrupted." };

        // Split content into lines to find commands
        const lines = file.content.split('\n');
        let executed = false;
        let output = [];

        // Parse "Code"
        for (const line of lines) {
            const trimmed = line.trim();

            // 1. Heat Reduction Logic
            if (trimmed.startsWith("RUN: FLUSH_LOGS")) {
                if (state.policeHeat > 0) {
                    const amount = 15 + Math.floor(Math.random() * 10);
                    state.policeHeat = Math.max(0, state.policeHeat - amount);
                    output.push(`>> Logs deleted. Heat reduced by ${amount}%.`);
                    executed = true;
                } else {
                    output.push(">> No active logs to flush.");
                }
            }

            // 2. Crypto Mining / Stealing
            if (trimmed.startsWith("RUN: WALLET_DUMP")) {
                const gain = (Math.random() * 2.5).toFixed(2);
                state.eightcoin += parseFloat(gain);
                output.push(`>> Wallet seed cracked. +${gain} E€E recovered.`);
                // Risk: Using this adds a tiny bit of heat back
                state.policeHeat += 2;
                executed = true;
            }

            // 3. Network Mapping
            if (trimmed.startsWith("RUN: NET_MAPPER")) {
                const nets = networkManager.networks;
                let count = 0;
                nets.forEach(n => {
                    if (!networkManager.isKnown(n.id)) {
                        // 20% chance to reveal a network per run
                        if (Math.random() < 0.2) {
                            networkManager.markKnown(n.id);
                            output.push(`>> Handshake force-captured: ${n.ssid}`);
                            count++;
                        }
                    }
                });
                if (count === 0) output.push(">> No new networks in range or scan failed.");
                state.policeHeat += 5;
                executed = true;
            }

            // 4. Official/Legal Scripts (.ccts)
            if (trimmed.startsWith("RUN: SYSTEM_DIAGNOSTIC")) {
                output.push(">> CENTER_OS INTEGRITY: 98%");
                output.push(">> NO MALWARE DETECTED");
                output.push(">> CONNECTION: MONITORED");
                executed = true;
            }
        }

        if (!executed) {
            return {
                success: false,
                message: "Runtime Error: No valid executable directives found.\nFile may be data-only or corrupted."
            };
        }

        return { success: true, message: output.join("\n") };
    }
}