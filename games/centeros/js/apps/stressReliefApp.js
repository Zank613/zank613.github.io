import { state } from "../state.js";

export class StressReliefApp {
    constructor() {
        // Initialize stress if it doesn't exist yet
        if (typeof state.stress === 'undefined') state.stress = 0;

        this.timer = 0;
        this.frame = 0;
        this.title = "PurrPlayer v1.0";
    }

    update(dt) {
        this.timer += dt;
        if (this.timer > 0.5) { // 2 FPS "Gif"
            this.frame = (this.frame + 1) % 2;
            this.timer = 0;
        }

        // Reduces 15 stress per second
        if (state.stress > 0) {
            state.stress -= 15 * dt;
            if (state.stress < 0) state.stress = 0;
        }
    }

    render(ctx, rect) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        // UI Header
        ctx.fillStyle = "#333";
        ctx.fillRect(rect.x, rect.y, rect.width, 30);
        ctx.fillStyle = "#fff";
        ctx.font = "12px monospace";
        ctx.textAlign = "left";
        ctx.fillText("▶ playing: cute_kitten_04.mp4", rect.x + 10, rect.y + 20);

        // Draw The Cat
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2 + 10;
        const scale = 4; // Pixel size

        this.drawCat(ctx, cx, cy, scale, this.frame);

        // Progress Bar
        ctx.fillStyle = "#555";
        ctx.fillRect(rect.x + 10, rect.y + rect.height - 20, rect.width - 20, 5);
        ctx.fillStyle = "#e54d42";
        // Bar moves based on stress
        const progress = 1 - (state.stress / 100);
        ctx.fillRect(rect.x + 10, rect.y + rect.height - 20, (rect.width - 20) * progress, 5);

        // Status Text
        ctx.fillStyle = "#00ff00";
        ctx.textAlign = "center";
        if (state.stress <= 0) {
            ctx.fillText("Stress Level: CALM", cx, rect.y + rect.height - 35);
        } else {
            ctx.fillText(`Stress Relief in progress...`, cx, rect.y + rect.height - 35);
        }
    }

    drawCat(ctx, x, y, s, frame) {
        ctx.save();
        ctx.translate(x, y);

        // Head
        ctx.fillStyle = "#ffa500"; // Orange Cat
        ctx.fillRect(-10*s, -10*s, 20*s, 15*s);

        // Ears
        ctx.beginPath();
        ctx.moveTo(-10*s, -10*s);
        ctx.lineTo(-10*s, -18*s);
        ctx.lineTo(-2*s, -10*s);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(10*s, -10*s);
        ctx.lineTo(10*s, -18*s);
        ctx.lineTo(2*s, -10*s);
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#000";
        if (frame === 0) {
            ctx.fillRect(-6*s, -6*s, 3*s, 3*s); // Left Eye
            ctx.fillRect(3*s, -6*s, 3*s, 3*s);  // Right Eye
        } else {
            ctx.fillRect(-6*s, -5*s, 3*s, 1*s); // Closed Left
            ctx.fillRect(3*s, -5*s, 3*s, 1*s);  // Closed Right
        }

        // Nose/Mouth
        ctx.fillStyle = "#pink";
        ctx.fillRect(-1*s, -2*s, 2*s, 2*s);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = s/2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-2*s, 3*s);
        ctx.moveTo(0, 0);
        ctx.lineTo(2*s, 3*s);
        ctx.stroke();

        // Whiskers
        ctx.beginPath();
        ctx.moveTo(-8*s, 0); ctx.lineTo(-14*s, -2*s);
        ctx.moveTo(-8*s, 2*s); ctx.lineTo(-14*s, 2*s);
        ctx.moveTo(8*s, 0); ctx.lineTo(14*s, -2*s);
        ctx.moveTo(8*s, 2*s); ctx.lineTo(14*s, 2*s);
        ctx.stroke();

        ctx.restore();
    }
}