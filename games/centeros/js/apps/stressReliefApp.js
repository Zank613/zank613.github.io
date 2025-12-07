import { state } from "../state.js";
import { BaseApp } from "../core/baseApp.js";

export class StressReliefApp extends BaseApp {
    constructor() {
        super();
        if (typeof state.stress === 'undefined') state.stress = 0;
        this.timer = 0;
        this.frame = 0;
    }

    update(dt) {
        this.timer += dt;
        if (this.timer > 0.5) { this.frame = (this.frame + 1) % 2; this.timer = 0; }
        if (state.stress > 0) state.stress = Math.max(0, state.stress - 15 * dt);
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#000000");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.fillStyle = "#333";
        ctx.fillRect(0, 0, rect.width, 30);
        ctx.fillStyle = "#fff";
        ctx.font = "12px monospace";
        ctx.fillText("▶ playing: cute_kitten_04.mp4", 10, 20);

        const cx = rect.width / 2;
        const cy = rect.height / 2 + 10;
        this.drawCat(ctx, cx, cy, 4, this.frame);

        ctx.fillStyle = "#555";
        ctx.fillRect(10, rect.height - 20, rect.width - 20, 5);
        ctx.fillStyle = "#e54d42";
        ctx.fillRect(10, rect.height - 20, (rect.width - 20) * (1 - state.stress / 100), 5);

        ctx.fillStyle = "#00ff00";
        ctx.textAlign = "center";
        ctx.fillText(state.stress <= 0 ? "Stress Level: CALM" : "Stress Relief in progress...", cx, rect.height - 35);
        ctx.restore();
    }

    drawCat(ctx, x, y, s, frame) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "#ffa500";
        ctx.fillRect(-10*s, -10*s, 20*s, 15*s);

        ctx.beginPath();
        ctx.moveTo(-10*s, -10*s); ctx.lineTo(-10*s, -18*s); ctx.lineTo(-2*s, -10*s); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(10*s, -10*s); ctx.lineTo(10*s, -18*s); ctx.lineTo(2*s, -10*s); ctx.fill();

        ctx.fillStyle = "#000";
        if (frame === 0) { ctx.fillRect(-6*s, -6*s, 3*s, 3*s); ctx.fillRect(3*s, -6*s, 3*s, 3*s); }
        else { ctx.fillRect(-6*s, -5*s, 3*s, 1*s); ctx.fillRect(3*s, -5*s, 3*s, 1*s); }

        ctx.fillStyle = "pink"; ctx.fillRect(-1*s, -2*s, 2*s, 2*s);
        ctx.strokeStyle = "#000"; ctx.lineWidth = s/2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2*s, 3*s); ctx.moveTo(0, 0); ctx.lineTo(2*s, 3*s); ctx.stroke();

        ctx.restore();
    }
}