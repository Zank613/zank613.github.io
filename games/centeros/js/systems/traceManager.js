import { state } from "../state.js";

export class TraceManager {
    constructor() {
        this.active = false;
        this.traceProgress = 0;
        this.traceSpeed = 5;
        this.nodes = [];
        this.maxNodes = 3;
        this.spawnTimer = 0;

        this.warningPulse = 0;
    }

    triggerTrace(difficulty = 1) {
        if (this.active) return;

        this.active = true;
        this.traceProgress = 15;
        this.traceSpeed = 3 + (difficulty * 2);
        this.nodes = [];
        this.warningPulse = 0;

        console.log(`⚠️ SECURITY TRACE INITIATED (Difficulty: ${difficulty})`);
    }

    stopTrace(success) {
        this.active = false;
        this.nodes = [];

        if (success) {
            console.log("✅ Trace Evaded");
        } else {
            console.log("TRACE COMPLETE - LOCATION COMPROMISED");
            state.policeHeat = 100; // Instant max heat
            state.gameOver = true;
        }
    }

    update(dt) {
        if (!this.active) return;

        // 1. Advance the Trace
        this.traceProgress += this.traceSpeed * dt;
        this.warningPulse += dt * 5;

        // 2. Check Fail Condition
        if (this.traceProgress >= 100) {
            this.traceProgress = 100;
            this.stopTrace(false);
            return;
        }

        // 3. Spawn Defense Nodes
        this.spawnTimer -= dt;
        if (this.nodes.length < this.maxNodes && this.spawnTimer <= 0) {
            this.spawnNode();
            // Spawns get faster as the bar fills up
            const stressFactor = this.traceProgress / 100;
            this.spawnTimer = 1.5 - (stressFactor * 0.8);
        }

        // 4. Update Nodes, in the future...
    }

    spawnNode() {
        // For now hardcoded to fit within a standard 800x600 minimum.
        const margin = 100;
        const w = 800;
        const h = 600;

        this.nodes.push({
            x: margin + Math.random() * (w - margin * 2),
            y: margin + Math.random() * (h - margin * 2),
            w: 140,
            h: 35,
            id: Math.random().toString(36).substr(2, 9)
        });
    }

    /**
     * Returns TRUE if the click was consumed by the Trace Manager.
     */
    handleClick(x, y) {
        if (!this.active) return false;

        // Check if player clicked a Node
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];

            // Simple AABB collision
            if (x >= node.x && x <= node.x + node.w &&
                y >= node.y && y <= node.y + node.h) {

                // Success, Remove node
                this.nodes.splice(i, 1);

                // Rewind the trace
                this.traceProgress = Math.max(0, this.traceProgress - 15);

                // Visual feedback
                console.log("Signal Rerouted!");

                // Victory Condition, If you push it back to 0 you win.
                if (this.traceProgress <= 0) {
                    this.stopTrace(true);
                }

                return true;
            }
        }

        // You cannot use the computer while being hunted.
        return true;
    }

    render(ctx, width, height) {
        if (!this.active) return;

        // 1. Darken the background
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, width, height);

        // 2. Draw The Threat Bar
        const barW = 400;
        const barH = 30;
        const barX = width / 2 - barW / 2;
        const barY = 60;

        // Bar Background
        ctx.fillStyle = "#220000";
        ctx.fillRect(barX, barY, barW, barH);

        // Bar Fill
        ctx.fillStyle = `rgb(${255}, ${100 - this.traceProgress}, 0)`;
        ctx.fillRect(barX, barY, (this.traceProgress / 100) * barW, barH);

        // Bar Border
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Flashing Warning Text
        if (Math.sin(this.warningPulse) > 0) {
            ctx.fillStyle = "#ff0000";
            ctx.font = "bold 24px monospace";
            ctx.textAlign = "center";
            ctx.fillText("⚠️ TRACE DETECTED ⚠️", width / 2, barY - 15);
        }

        // 3. Draw Nodes
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        this.nodes.forEach(node => {
            // Button Body
            ctx.fillStyle = "#00aa00";
            ctx.fillRect(node.x, node.y, node.w, node.h);

            // Button Border
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
            ctx.strokeRect(node.x, node.y, node.w, node.h);

            // Text
            ctx.fillStyle = "#003300";
            ctx.fillText("REROUTE SIGNAL", node.x + node.w/2, node.y + node.h/2);
        });

        // Reset text alignment for other apps
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }
}