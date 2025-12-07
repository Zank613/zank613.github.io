import { state } from "../state.js";

export class AtmosphereManager {
    constructor() {
        // Webcam
        this.webcamActive = false;
        this.webcamTimer = 0;
        this.nextWebcamEvent = Math.random() * 60 + 30;

        // Glitch
        this.glitchActive = false;
        this.glitchIntensity = 0;
        this.glitchTimer = 0;
    }

    update(dt) {
        this.nextWebcamEvent -= dt;
        if (this.nextWebcamEvent <= 0) {
            this.webcamActive = true;
            this.webcamTimer = Math.random() * 3 + 2; // 2–5 seconds
            this.nextWebcamEvent = Math.random() * 120 + 60;
        }

        if (this.webcamActive) {
            this.webcamTimer -= dt;
            if (this.webcamTimer <= 0) {
                this.webcamActive = false;
            }
        }

        if (this.glitchActive) {
            this.glitchTimer -= dt;
            if (this.glitchTimer <= 0) {
                this.glitchActive = false;
            }
        } else {
            // If there are active viruses, they can occasionally cause glitches
            const viruses = state.viruses || [];
            if (viruses.length > 0) {
                // Base chance per second, scaled by dt and number of viruses
                const basePerSecond = 0.02;  // tweakable: 2% per second per virus
                const chance = basePerSecond * viruses.length * dt;
                if (Math.random() < chance) {
                    // Slightly stronger glitches when infected
                    const duration = 0.15 + Math.random() * 0.25;
                    this.triggerGlitch(duration);
                }
            }
            // Otherwise: no ambient glitches at all.
        }
    }

    triggerGlitch(duration = 0.2) {
        this.glitchActive = true;
        this.glitchTimer = duration;
        this.glitchIntensity = Math.random() * 5 + 3; // 3–8px
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
}