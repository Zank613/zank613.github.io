import { BaseApp } from "../core/baseApp.js";
import { state } from "../state.js";

export class TaskManagerApp extends BaseApp {
    constructor() {
        super();
        this.processes = [];
        this.timer = 0;
        this.selectedPid = null;

        this.totalMem = 4096; // 4GB System RAM
        this.usedMem = 0;
        this.totalCpu = 0;

        // Static system processes (Kernel etc)
        this.sysProcs = [
            { name: "kernel.sys", pid: 0, cpuBase: 1.5, memBase: 350 },
            { name: "desktop_wm.sys", pid: 412, cpuBase: 2.0, memBase: 180 },
            { name: "network_d.sys", pid: 88, cpuBase: 0.5, memBase: 64 },
            { name: "audio_d.sys", pid: 102, cpuBase: 0.2, memBase: 45 }
        ];
    }

    update(dt) {
        this.timer += dt;
        // Fast refresh rate (0.5s)
        if (this.timer > 0.5) {
            this.refreshProcesses();
            this.timer = 0;
        }
    }

    refreshProcesses() {
        let list = [];
        let totalMemCalc = 0;
        let totalCpuCalc = 0;

        // 1. System Processes
        this.sysProcs.forEach(sys => {
            const cpu = sys.cpuBase + Math.random() * 0.5;
            const mem = sys.memBase + Math.random() * 2;

            list.push({
                name: sys.name,
                pid: sys.pid,
                cpu: cpu.toFixed(1),
                mem: mem.toFixed(1),
                type: "system"
            });
            totalCpuCalc += cpu;
            totalMemCalc += mem;
        });

        // 2. Real User Apps
        if (this.windowManager) {
            this.windowManager.windows.forEach(win => {
                const app = win.appInstance;
                let cpu = 0;
                let mem = 0;

                // Get Real Data if available, else fallback
                if (app) {
                    cpu = app.getCpuUsage ? app.getCpuUsage() : (0.1 + Math.random() * 0.5);
                    mem = app.getMemoryUsage ? app.getMemoryUsage() : (20 + Math.random() * 5);
                }

                // Add overhead for the window container itself
                mem += 5;

                list.push({
                    name: (win.appId || "app") + ".exe",
                    pid: 1000 + win.id,
                    cpu: cpu.toFixed(1),
                    mem: mem.toFixed(1),
                    type: "user",
                    winId: win.id
                });

                totalCpuCalc += cpu;
                totalMemCalc += mem;
            });
        }

        // 3. Hidden Viruses
        const viruses = state.viruses || [];
        viruses.forEach((v, index) => {
            const cpu = 8 + Math.random() * 15; // Viruses consume CPU
            const mem = 12 + Math.random() * 5;
            list.push({
                name: "svchost.exe", // Disguised
                pid: 6660 + index,
                cpu: cpu.toFixed(1),
                mem: mem.toFixed(1),
                type: "virus"
            });
            totalCpuCalc += cpu;
            totalMemCalc += mem;
        });

        this.processes = list.sort((a, b) => b.cpu - a.cpu); // Sort by CPU usage
        this.usedMem = totalMemCalc;
        this.totalCpu = Math.min(100, totalCpuCalc);
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);
        const headerH = 24;
        const rowH = 20;

        if (y > headerH) {
            const index = Math.floor((y - headerH) / rowH);
            if (index >= 0 && index < this.processes.length) {
                this.selectedPid = this.processes[index].pid;
            }
        }
    }

    render(ctx, rect) {
        if (this.processes.length === 0) this.refreshProcesses();

        super.render(ctx, rect);
        const colors = this.getColors();

        ctx.save();
        ctx.translate(rect.x, rect.y);

        // Performance Graph Header
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, rect.width, 60);

        // CPU Bar
        this.drawStatBar(ctx, 10, 10, rect.width/2 - 20, "CPU", this.totalCpu, 100, "#4d9fff");
        // RAM Bar
        this.drawStatBar(ctx, rect.width/2 + 10, 10, rect.width/2 - 20, "RAM", this.usedMem, this.totalMem, "#d94dff");

        // List Header
        const listY = 60;
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(0, listY, rect.width, 24);
        ctx.fillStyle = colors.titleText;
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("Process Name", 10, listY + 12);
        ctx.fillText("PID", 160, listY + 12);
        ctx.fillText("CPU %", 220, listY + 12);
        ctx.fillText("Mem (MB)", 280, listY + 12);

        // Process List
        let y = listY + 24;
        const rowH = 20;
        ctx.font = "11px system-ui";

        for (const proc of this.processes) {
            if (y > rect.height) break; // Clip

            if (proc.pid === this.selectedPid) {
                ctx.fillStyle = colors.highlight;
                ctx.fillRect(0, y, rect.width, rowH);
                ctx.fillStyle = "#ffffff";
            } else {
                ctx.fillStyle = colors.contentText;
            }

            ctx.fillText(proc.name, 10, y + rowH/2);
            ctx.fillText(proc.pid, 160, y + rowH/2);

            // Highlight high usage
            if (parseFloat(proc.cpu) > 20 && proc.pid !== this.selectedPid) ctx.fillStyle = "#ff5555";
            ctx.fillText(proc.cpu, 220, y + rowH/2);

            if (proc.pid !== this.selectedPid) ctx.fillStyle = colors.contentText;
            ctx.fillText(proc.mem, 280, y + rowH/2);

            y += rowH;
        }

        ctx.restore();
    }

    drawStatBar(ctx, x, y, w, label, val, max, color) {
        const h = 40;
        const pct = Math.min(1, val / max);

        ctx.fillStyle = "#222";
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = color;
        ctx.fillRect(x, y + h - (h * pct), w, h * pct);

        ctx.strokeStyle = "#444";
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(label, x + 5, y + 5);

        ctx.font = "11px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${Math.floor(val)} / ${max}`, x + w - 5, y + h - 15);
    }
}