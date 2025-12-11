import { themeManager } from "./theme.js";
import { appRegistry } from "./appRegistry.js";
import { state } from "../state.js";

const CATEGORIES = {
    "All": null,
    "System": ["settings", "taskman", "files", "notepad", "postman", "virusex", "duty", "stressReducer"],
    "Network": ["browser", "terminal", "nethacker", "net", "tel", "remote", "miner"],
    "Tools": ["cases", "citizen", "id", "police", "sim", "shop", "cescracker", "authlink"]
};

export class StartMenu {
    constructor() {
        this.isOpen = false;
        this.activeCategory = "All";
        this.searchQuery = "";

        this.width = 400;
        this.height = 450;
        this.catWidth = 100;

        // Scroll State
        this.appsScrollY = 0;
        this.maxScroll = 0;
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.searchQuery = "";
            this.activeCategory = "All";
            this.appsScrollY = 0; // Reset scroll on open
        }
    }

    close() {
        this.isOpen = false;
    }

    // Handle Mouse Wheel
    handleWheel(deltaY) {
        if (!this.isOpen) return;

        // Only scroll if we have content to scroll
        if (this.maxScroll > 0) {
            this.appsScrollY += deltaY;

            // Clamp values
            if (this.appsScrollY < 0) this.appsScrollY = 0;
            if (this.appsScrollY > this.maxScroll) this.appsScrollY = this.maxScroll;
        }
    }

    handleClick(globalX, globalY) {
        if (!this.isOpen) return false;

        const menuX = 0;
        const menuY = window.innerHeight - 40 - this.height;

        if (globalX < menuX || globalX > menuX + this.width ||
            globalY < menuY || globalY > menuY + this.height) {
            this.close();
            return false;
        }

        const localX = globalX - menuX;
        const localY = globalY - menuY;

        // 1. Categories (Left Pane)
        if (localX < this.catWidth) {
            const cats = Object.keys(CATEGORIES);
            const itemH = 40;
            const startY = 60;

            const index = Math.floor((localY - startY) / itemH);
            if (index >= 0 && index < cats.length) {
                this.activeCategory = cats[index];
                this.appsScrollY = 0; // Reset app scroll when changing category
            }
            // Power Button
            if (localY > this.height - 40) {
                console.log("Shut Down Clicked");
            }
            return true;
        }

        // 2. Apps (Right Pane)
        if (localX >= this.catWidth) {
            const apps = this.getFilteredApps();
            const itemH = 36;
            const startY = 10;

            const scrollAdjustedY = localY - startY + this.appsScrollY;

            // Check if click is within visible area
            if (localY < 0 || localY > this.height) return true;

            const index = Math.floor(scrollAdjustedY / itemH);
            if (index >= 0 && index < apps.length) {
                const appDef = apps[index];
                window.dispatchEvent(new CustomEvent("force-open-app", { detail: { id: appDef.id } }));
                this.close();
            }
            return true;
        }

        return true;
    }

    getFilteredApps() {
        const installed = state.installedApps
            .map(id => appRegistry.get(id))
            .filter(def => def !== null);

        let list = installed;
        if (this.activeCategory !== "All") {
            const allowed = CATEGORIES[this.activeCategory];
            list = list.filter(app => allowed && allowed.includes(app.id));
        }

        return list.sort((a, b) => a.title.localeCompare(b.title));
    }

    render(ctx, screenW, screenH) {
        if (!this.isOpen) return;

        const colors = themeManager.get();
        const menuX = 0;
        const menuY = screenH - 40 - this.height;

        ctx.save();
        ctx.translate(menuX, menuY);

        // --- BACKGROUNDS ---
        ctx.fillStyle = "#181b21"; // Main Body
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = "#111317"; // Left Pane
        ctx.fillRect(0, 0, this.catWidth, this.height);

        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, this.width, this.height);

        // --- LEFT PANE (Static) ---
        this.renderLeftPane(ctx, colors);

        // --- RIGHT PANE (Scrollable) ---
        const apps = this.getFilteredApps();
        const itemH = 36;
        const totalContentH = apps.length * itemH + 20; // +padding

        // Calculate max scroll
        this.maxScroll = Math.max(0, totalContentH - this.height);

        ctx.save();
        ctx.beginPath();
        ctx.rect(this.catWidth, 0, this.width - this.catWidth, this.height);
        ctx.clip();

        // Apply Scroll Translation
        ctx.translate(0, -this.appsScrollY);

        let appY = 10;
        const appX = this.catWidth + 10;
        ctx.textAlign = "left";

        if (apps.length === 0) {
            ctx.fillStyle = "#555";
            ctx.fillText("No apps installed.", appX, appY + 20);
        }

        for (const app of apps) {
            // Icon
            ctx.fillStyle = "#333";
            ctx.fillRect(appX, appY + 4, 28, 28);

            // Text
            ctx.fillStyle = "#fff";
            ctx.font = "13px system-ui";
            ctx.fillText(app.title, appX + 40, appY + 22);

            appY += itemH;
        }

        ctx.restore(); // Remove Clip & Scroll Translate

        // --- SCROLLBAR ---
        if (this.maxScroll > 0) {
            const barH = this.height - 20;
            const thumbH = Math.max(30, (this.height / totalContentH) * barH);
            const thumbY = 10 + (this.appsScrollY / this.maxScroll) * (barH - thumbH);

            ctx.fillStyle = "#222";
            ctx.fillRect(this.width - 8, 10, 6, barH); // Track

            ctx.fillStyle = colors.highlight;
            ctx.fillRect(this.width - 8, thumbY, 6, thumbH); // Thumb
        }

        ctx.restore(); // End Menu Transform
    }

    renderLeftPane(ctx, colors) {
        const cats = Object.keys(CATEGORIES);
        let catY = 60;

        // User Icon
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(this.catWidth/2, 30, 16, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#111";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("U", this.catWidth/2, 30);

        ctx.font = "12px system-ui";
        ctx.textAlign = "left";

        for (const cat of cats) {
            const isActive = this.activeCategory === cat;
            if (isActive) {
                ctx.fillStyle = "#2d3440";
                ctx.fillRect(0, catY, this.catWidth, 40);
                ctx.fillStyle = colors.highlight;
                ctx.fillRect(0, catY, 3, 40);
            }
            ctx.fillStyle = isActive ? "#fff" : "#888";
            ctx.fillText(cat, 15, catY + 20);
            catY += 40;
        }

        // Power
        const powerY = this.height - 40;
        ctx.fillStyle = "#331111";
        ctx.fillRect(0, powerY, this.catWidth, 40);
        ctx.fillStyle = "#ff5555";
        ctx.textAlign = "center";
        ctx.fillText("SHUT DOWN", this.catWidth/2, powerY + 20);
    }
}

export const startMenu = new StartMenu();