import { state } from "../state.js";
import { TIME_CONFIG } from "../state.js";

const DAY_IN_MINUTES = 24 * 60;

export class AtmosphereManager {
    constructor(traceManager) {
        this.traceManager = traceManager;

        this.webcamActive = false;
        this.webcamTimer = 0;
        this.nextWebcamEvent = Math.random() * 60 + 30;

        this.glitchActive = false;
        this.glitchIntensity = 0;
        this.glitchTimer = 0;

        this.timeElapsedSinceTrace = 0;
        this.traceAttempted = false;

        // Listen for the high-risk browser event
        window.addEventListener("centeros-trespasser-risk", this.handleTrespasserRisk.bind(this));
    }

    update(dt) {
        this.nextWebcamEvent -= dt;
        if (this.nextWebcamEvent <= 0) {
            this.webcamActive = true;
            this.webcamTimer = Math.random() * 3 + 2;
            this.nextWebcamEvent = Math.random() * 120 + 60;
        }

        if (this.webcamActive) {
            this.webcamTimer -= dt;
            if (this.webcamTimer <= 0) this.webcamActive = false;
        }

        if (this.glitchActive) {
            this.glitchTimer -= dt;
            if (this.glitchTimer <= 0) this.glitchActive = false;
        } else {
            // Virus ambient glitches
            const viruses = state.viruses || [];
            if (viruses.length > 0) {
                const basePerSecond = 0.02;
                const chance = basePerSecond * viruses.length * dt;
                if (Math.random() < chance) {
                    this.triggerGlitch(0.15 + Math.random() * 0.25);
                }
            }
        }

        if (state.gameOver) return;

        // Time Progression
        const timeSpeed = state.miner && state.miner.running ? 10 : 1;
        state.time.minutes = (state.time.minutes + dt * timeSpeed) % DAY_IN_MINUTES;

        const currentMinute = Math.floor(state.time.minutes);

        // Advance Day Logic
        if (currentMinute < state.time.lastHourMark && currentMinute < 1) {
            state.time.day += 1;
            window.dispatchEvent(new CustomEvent("centeros-new-day"));
            window.dispatchEvent(new CustomEvent("centeros-refresh-sites"));
        }
        state.time.lastHourMark = currentMinute;

        // Heat Decay
        this.timeElapsedSinceTrace += dt;
        if (this.timeElapsedSinceTrace > 30) {
            this.timeElapsedSinceTrace = 0;
            if (state.policeHeat > 0) {
                state.policeHeat = Math.max(0, state.policeHeat - 0.5);
            }
        }

        // Auto-trace at high heat
        if (state.policeHeat > 50 && !this.traceAttempted) {
            if (Math.random() < 0.05) {
                if (this.traceManager) {
                    this.traceManager.triggerTrace(Math.floor(state.policeHeat / 30) + 1);
                }
                this.traceAttempted = true;
            }
        } else if (state.policeHeat <= 50) {
            this.traceAttempted = false;
        }

        // Uptime trackers
        if (state.vpn && state.vpn.activeTier > 0) state.vpn.uptimeSeconds += dt;
        if (state.miner && state.miner.running) state.miner.uptimeSeconds = (state.miner.uptimeSeconds || 0) + dt;
    }

    triggerGlitch(duration = 0.2) {
        this.glitchActive = true;
        this.glitchTimer = duration;
        this.glitchIntensity = Math.random() * 5 + 3;
    }

    applyGlitchTransform(ctx) {
        if (this.glitchActive) {
            const offsetX = (Math.random() - 0.5) * this.glitchIntensity;
            const offsetY = (Math.random() - 0.5) * this.glitchIntensity;
            ctx.translate(offsetX, offsetY);
        }
    }

    renderOverlay(ctx, width, height) {
        if (this.webcamActive) {
            const x = width / 2 + 120;
            const y = 12;
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#00ff00";
            ctx.fillStyle = "#00ff00";
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        if (this.glitchActive && Math.random() > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
            ctx.fillRect(0, Math.random() * height, width, Math.random() * 50);
        }
    }

    handleTrespasserRisk(e) {
        const url = e.detail.url;
        if (url === "darkesttrench.w3") {
            state.policeHeat = Math.min(100, state.policeHeat + 25);
            if (this.traceManager) {
                this.traceManager.triggerTrace(5);
            }
            console.log("!!! TRESPASSER PROTOCOL ACTIVATED !!!");
        }
    }
}