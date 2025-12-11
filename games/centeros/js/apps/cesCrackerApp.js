import { state } from "../state.js";
import { BaseApp } from "../core/baseApp.js";
import { fs } from "../os/fileSystem.js";

export class CesCrackerApp extends BaseApp {
    constructor() {
        super();
        this.status = "idle"; // idle, cracking, done
        this.progress = 0;
        this.selectedFile = null;
        this.targetFileId = null;
        this.files = [];
        this.timer = 0;
    }

    refreshFiles() {
        const all = fs.downloads.children;

        this.files = all.filter(f => f.extension === "ces");
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        if (this.status === "cracking") return;

        // Select File
        let fy = 60;
        for(const f of this.files) {
            if (this.isInside(x, y, 20, fy, contentRect.width - 40, 24)) {
                this.selectedFile = f;
                this.status = "idle";
                this.progress = 0;
                return;
            }
            fy += 30;
        }

        // Crack Button
        if (this.selectedFile && this.isInside(x, y, 20, contentRect.height - 50, 120, 30)) {
            this.status = "cracking";
            this.progress = 0;
        }
    }

    update(dt) {
        if (this.status === "cracking") {
            this.progress += dt * 30; // Fast crack
            if (this.progress >= 100) {
                this.progress = 100;
                this.status = "done";
                if (this.selectedFile) {
                    this.selectedFile.rename(this.selectedFile.name.replace(".ces", ".cts"));
                    this.selectedFile = null; // Reset
                    this.refreshFiles();
                }
            }
        } else {
            this.timer += dt;
            if(this.timer > 1.0) { this.refreshFiles(); this.timer = 0; }
        }
    }

    render(ctx, rect) {
        if(this.files.length === 0 && this.timer === 0) this.refreshFiles();

        this.clear(ctx, rect, "#1a1a1a");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "#ffcc00";
        ctx.fillText("CES Cracker v1.0", 20, 30);

        ctx.font = "14px monospace";
        ctx.fillStyle = "#ccc";
        ctx.fillText("Select a .ces file from ~/downloads:", 20, 50);

        let y = 60;
        if(this.files.length === 0) {
            ctx.fillStyle = "#555";
            ctx.fillText("[No .ces files found]", 20, 80);
        }

        for(const f of this.files) {
            const isSel = this.selectedFile && this.selectedFile.id === f.id;
            ctx.fillStyle = isSel ? "#444" : "#222";
            ctx.fillRect(20, y, rect.width - 40, 24);
            ctx.strokeStyle = isSel ? "#ffcc00" : "#555";
            ctx.strokeRect(20, y, rect.width - 40, 24);

            ctx.fillStyle = isSel ? "#fff" : "#aaa";
            ctx.fillText(f.name, 30, y + 17);
            y += 30;
        }

        // Action Area
        const bottomY = rect.height - 50;
        if (this.status === "cracking") {
            ctx.fillStyle = "#444";
            ctx.fillRect(20, bottomY, rect.width - 40, 30);
            ctx.fillStyle = "#00ff00";
            ctx.fillRect(20, bottomY, (rect.width - 40) * (this.progress / 100), 30);
            ctx.fillStyle = "#000";
            ctx.fillText(`DECRYPTING... ${Math.floor(this.progress)}%`, 30, bottomY + 20);
        } else if (this.status === "done") {
            ctx.fillStyle = "#00ff00";
            ctx.fillText("SUCCESS! File converted to .cts", 20, bottomY + 20);
        } else if (this.selectedFile) {
            ctx.fillStyle = "#ffcc00";
            ctx.fillRect(20, bottomY, 120, 30);
            ctx.fillStyle = "#000";
            ctx.font = "bold 14px monospace";
            ctx.fillText("CRACK FILE", 35, bottomY + 20);
        }

        ctx.restore();
    }
}