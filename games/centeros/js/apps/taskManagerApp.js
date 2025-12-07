import { BaseApp } from "../core/baseApp.js";
import { state } from "../state.js";

export class TaskManagerApp extends BaseApp {
    constructor() {
        super();
        this.processes = [];
        this.timer = 0;
        this.selectedPid = null;

        // Static system processes for flavor
        this.sysProcs = [
            { name: "kernel.cts", pid: 1, cpu: 0.1, mem: 240, type: "sys" },
            { name: "display_server.cts", pid: 45, cpu: 1.2, mem: 120, type: "sys" },
            { name: "network_d.cts", pid: 88, cpu: 0.4, mem: 64, type: "sys" },
            { name: "input_mgr.cts", pid: 102, cpu: 0.0, mem: 12, type: "sys" }
        ];
    }

    update(dt) {
        this.timer += dt;
        // Refresh process list every 1 second to simulate real-time updates
        if (this.timer > 1.0) {
            this.refreshProcesses();
            this.timer = 0;
        }
    }

    refreshProcesses() {
        let list = [...this.sysProcs];

        // 1. Add Open Windows (User Apps)
        if (this.windowManager) {
            this.windowManager.windows.forEach(win => {
                // Determine a ".cts" name based on the app ID
                const name = (win.appId || "unknown") + ".cts";
                // Generate a pseudo-PID based on window ID
                list.push({
                    name: name,
                    pid: 1000 + win.id,
                    cpu: (Math.random() * 2).toFixed(1),
                    mem: 50 + Math.floor(Math.random() * 100),
                    type: "user",
                    winId: win.id
                });
            });
        }

        // 2. Add Viruses
        // They try to blend in but might use higher CPU or weird names
        const viruses = state.viruses || [];
        viruses.forEach((v, index) => {
            list.push({
                name: "sys_check.cts", // Suspicious name
                pid: 6660 + index,
                cpu: (5 + Math.random() * 15).toFixed(1), // Suspiciously high CPU
                mem: 12,
                type: "virus"
            });
        });

        // 3. Add Background Services (Miner)
        if (state.miner && state.miner.running) {
            list.push({
                name: "eightminer_service.cts",
                pid: 4040,
                cpu: (20 + Math.random() * 10).toFixed(1), // High CPU
                mem: 512,
                type: "service"
            });
        }

        this.processes = list.sort((a, b) => a.pid - b.pid);
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        // Header is approx 24px, each row is 20px
        const headerH = 24;
        const rowH = 20;

        if (y > headerH) {
            const index = Math.floor((y - headerH) / rowH);
            if (index >= 0 && index < this.processes.length) {
                this.selectedPid = this.processes[index].pid;
            }
        }

        // "End Task" button logic could go here in the future
    }

    render(ctx, rect) {
        // Initial populate
        if (this.processes.length === 0) this.refreshProcesses();

        super.render(ctx, rect); // Clears bg
        const colors = this.getColors();
        const fonts = this.getFonts();

        ctx.save();
        ctx.translate(rect.x, rect.y);

        // Header
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(0, 0, rect.width, 24);

        ctx.fillStyle = colors.titleText;
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        ctx.fillText("Name", 10, 12);
        ctx.fillText("PID", 160, 12);
        ctx.fillText("CPU%", 220, 12);
        ctx.fillText("Mem (MB)", 280, 12);

        // Rows
        let y = 24;
        const rowH = 20;

        ctx.font = "11px system-ui";

        for (const proc of this.processes) {
            // Highlight selected
            if (proc.pid === this.selectedPid) {
                ctx.fillStyle = colors.highlight;
                ctx.fillRect(0, y, rect.width, rowH);
                ctx.fillStyle = "#ffffff";
            } else {
                ctx.fillStyle = colors.contentText;
            }

            // Draw Text
            ctx.fillText(proc.name, 10, y + rowH/2);
            ctx.fillText(proc.pid, 160, y + rowH/2);

            // Highlight high CPU usage in red if not selected
            if (proc.cpu > 10 && proc.pid !== this.selectedPid) ctx.fillStyle = "#ff5555";
            ctx.fillText(proc.cpu, 220, y + rowH/2);

            // Reset color for mem
            if (proc.pid === this.selectedPid) ctx.fillStyle = "#ffffff";
            else ctx.fillStyle = colors.contentText;

            ctx.fillText(proc.mem, 280, y + rowH/2);

            y += rowH;
        }

        // Status Bar
        ctx.fillStyle = "#222";
        ctx.fillRect(0, rect.height - 24, rect.width, 24);
        ctx.fillStyle = "#888";
        ctx.fillText(`Processes: ${this.processes.length}`, 10, rect.height - 12);

        if (this.selectedPid) {
            ctx.textAlign = "right";
            ctx.fillStyle = "#ff5555";
            ctx.fillText("END TASK (Not Impl)", rect.width - 10, rect.height - 12);
        }

        ctx.restore();
    }
}