import { themeManager } from "./theme.js";
import { state } from "../state.js";
import {audioManager} from "./audioManager.js";

export class NotificationManager {
    constructor() {
        this.history = []; // All notifications
        this.queue = [];   // Active popups

        this.isPanelOpen = false;
        this.doNotDisturb = false;

        // Panel Animation
        this.panelX = 0; // Will animate to/from screen width
        this.targetPanelX = 0;

        // Constants
        this.popupDuration = 4000;
        this.panelWidth = 320;
    }

    show(title, message, type = "info") {
        const notif = {
            id: Date.now() + Math.random(),
            title,
            message,
            type,
            timestamp: this.getTimestamp(),
            read: false,
            // Toast Animation State
            toastAlpha: 0,
            toastY: 0,
            timeAlive: 0,
            state: "enter" // enter, stay, leave
        };

        // Always add to history
        this.history.unshift(notif);

        // Only show popup if NOT in Do Not Disturb
        if (!this.doNotDisturb) {
            this.queue.push(notif);
            audioManager.playNotification(); // [NEW]
        }
    }

    togglePanel() {
        this.isPanelOpen = !this.isPanelOpen;
        // Mark all as read when opening
        if (this.isPanelOpen) {
            this.history.forEach(n => n.read = true);
        }
    }

    toggleDnd() {
        this.doNotDisturb = !this.doNotDisturb;
    }

    getUnreadCount() {
        return this.history.filter(n => !n.read).length;
    }

    getTimestamp() {
        const totalMin = 21 * 60 + state.time.minutes; // Base 21:00
        const h = Math.floor(totalMin / 60) % 24;
        const m = Math.floor(totalMin % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    update(dt) {
        // 1. Update Toasts
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const n = this.queue[i];

            if (n.state === "enter") {
                n.toastAlpha += dt * 4;
                if (n.toastAlpha >= 1) { n.toastAlpha = 1; n.state = "stay"; }
            } else if (n.state === "stay") {
                n.timeAlive += dt * 1000;
                if (n.timeAlive >= this.popupDuration) n.state = "leave";
            } else if (n.state === "leave") {
                n.toastAlpha -= dt * 4;
                if (n.toastAlpha <= 0) this.queue.splice(i, 1);
            }
        }

        // 2. Update Panel Animation
        const screenW = window.innerWidth;
        this.targetPanelX = this.isPanelOpen ? screenW - this.panelWidth : screenW;

        // Smooth slide
        const diff = this.targetPanelX - this.panelX;
        if (Math.abs(diff) > 1) {
            this.panelX += diff * 10 * dt;
        } else {
            this.panelX = this.targetPanelX;
        }
    }

    render(ctx, w, h) {
        if (this.panelX === 0 && !this.isPanelOpen) this.panelX = w;

        this.renderToasts(ctx, w, h);
        this.renderPanel(ctx, w, h);
    }

    renderToasts(ctx, w, h) {
        if (this.queue.length === 0) return;

        const colors = themeManager.get();
        const toastW = 300;
        const toastH = 80;
        const gap = 10;

        // Start above the taskbar
        let startY = h - 60 - toastH;

        for (const n of this.queue) {
            const x = w - toastW - 20;
            // Slide up effect
            const drawY = startY + ((1 - n.toastAlpha) * 20);

            ctx.save();
            ctx.globalAlpha = n.toastAlpha;

            // BG
            ctx.fillStyle = colors.windowBg;
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 10;
            ctx.fillRect(x, drawY, toastW, toastH);
            ctx.shadowBlur = 0;

            // Border
            ctx.strokeStyle = colors.windowBorder;
            ctx.strokeRect(x, drawY, toastW, toastH);

            // Accent Strip
            let accent = colors.highlight;
            if (n.type === "error") accent = "#ff5555";
            if (n.type === "success") accent = "#55ff55";
            ctx.fillStyle = accent;
            ctx.fillRect(x, drawY, 4, toastH);

            // Text
            ctx.fillStyle = colors.titleText;
            ctx.font = "bold 13px system-ui";
            ctx.textAlign = "left";
            ctx.fillText(n.title, x + 15, drawY + 20);

            ctx.fillStyle = "#888";
            ctx.font = "11px system-ui";
            ctx.textAlign = "right";
            ctx.fillText(n.timestamp, x + toastW - 10, drawY + 20);

            ctx.fillStyle = colors.contentText;
            ctx.font = "12px system-ui";
            ctx.textAlign = "left";
            // Simple truncation
            let msg = n.message;
            if (ctx.measureText(msg).width > toastW - 30) msg = msg.substring(0, 45) + "...";
            ctx.fillText(msg, x + 15, drawY + 45);

            ctx.restore();

            startY -= (toastH + gap);
        }
    }

    renderPanel(ctx, w, h) {
        // If off-screen, don't render
        if (this.panelX >= w - 1) return;

        const colors = themeManager.get();
        const x = this.panelX;

        // Panel Background
        ctx.fillStyle = "rgba(10, 12, 16, 0.95)";
        ctx.fillRect(x, 0, this.panelWidth, h - 40);

        ctx.strokeStyle = colors.windowBorder;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h-40); ctx.stroke();

        // Header
        ctx.fillStyle = colors.titleText;
        ctx.font = "bold 16px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("Notifications", x + 20, 40);

        // Clear All
        ctx.font = "12px system-ui";
        ctx.fillStyle = colors.highlight;
        ctx.textAlign = "right";
        ctx.fillText("Clear all", x + this.panelWidth - 20, 40);

        // List
        let y = 70;
        if (this.history.length === 0) {
            ctx.fillStyle = "#666";
            ctx.textAlign = "center";
            ctx.fillText("No new notifications.", x + this.panelWidth/2, 150);
        }

        for (const n of this.history) {
            if (y > h - 160) break;

            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fillRect(x + 10, y, this.panelWidth - 20, 70);

            // Icon/Type Color
            let typeColor = "#aaa";
            if (n.type === "error") typeColor = "#f44";
            if (n.type === "success") typeColor = "#4f4";
            ctx.fillStyle = typeColor;
            ctx.fillRect(x + 10, y, 4, 70);

            ctx.fillStyle = "#fff";
            ctx.textAlign = "left";
            ctx.font = "bold 13px system-ui";
            ctx.fillText(n.title, x + 24, y + 20);

            ctx.fillStyle = "#888";
            ctx.font = "11px system-ui";
            ctx.fillText(n.timestamp, x + this.panelWidth - 60, y + 20);

            ctx.fillStyle = "#ccc";
            ctx.font = "12px system-ui";
            let msg = n.message;
            if (ctx.measureText(msg).width > this.panelWidth - 50) msg = msg.substring(0, 40) + "...";
            ctx.fillText(msg, x + 24, y + 45);

            y += 75;
        }

        // Bottom Controls
        const bottomY = h - 140;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(x, bottomY, this.panelWidth, 100);

        // Do Not Disturb Button
        const btnW = 130;
        const btnH = 60;
        const btnX = x + 20;
        const btnY_act = bottomY + 20;

        ctx.fillStyle = this.doNotDisturb ? colors.highlight : "#333";
        ctx.fillRect(btnX, btnY_act, btnW, btnH);

        ctx.fillStyle = this.doNotDisturb ? "#000" : "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 12px system-ui";
        ctx.fillText("Focus Assist", btnX + btnW/2, btnY_act + 25);
        ctx.font = "11px system-ui";
        ctx.fillText(this.doNotDisturb ? "On" : "Off", btnX + btnW/2, btnY_act + 40);

        // Location (Dummy)
        ctx.fillStyle = "#333";
        ctx.fillRect(x + 20 + btnW + 10, btnY_act, btnW, btnH);
        ctx.fillStyle = "#fff";
        ctx.fillText("Location", x + 20 + btnW + 10 + btnW/2, btnY_act + 25);
        ctx.fillStyle = "#888";
        ctx.fillText("On", x + 20 + btnW + 10 + btnW/2, btnY_act + 40);
    }
}

export const notificationManager = new NotificationManager();