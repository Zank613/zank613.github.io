export class AtmosphereManager {
    constructor() {
        this.webcamActive = false;
        this.webcamTimer = 0;
        this.nextWebcamEvent = Math.random() * 60 + 30;

        this.glitchActive = false;
        this.glitchIntensity = 0;
        this.glitchTimer = 0;
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
            // Random tiny chance to glitch per frame
            // 0.05% chance per frame @ 60fps = approx once every 33 seconds
            if (Math.random() < 0.0005) {
                this.triggerGlitch(0.15);
            }
        }
    }

    triggerGlitch(duration) {
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
        // Webcam Light (Top Right usually, or Top Center)
        // Let's put it next to the "bezel" of the screen
        if (this.webcamActive) {
            // Position relative to center top, slightly right
            const x = width / 2 + 120;
            const y = 12;

            // Green glow
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