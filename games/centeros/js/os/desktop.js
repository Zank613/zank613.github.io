import { state } from "../state.js";
import { fs } from "./fileSystem.js";

export class Desktop {
    constructor(networkManager) {
        this.panelHeight = 36;
        this.wallpaper = new Image();
        this.wallpaperLoaded = false;
        this.networkManager = networkManager;

        this.wallpaper.src = "wallpaper.jpg";
        this.wallpaper.onload = () => this.wallpaperLoaded = true;

        this.icons = [
            // Column 1
            { id: "cases",     label: "Cases",      color: "#37a0ff", x: 24, y: 48 },
            { id: "citizen",   label: "Citizen_DB", color: "#66d9ef", x: 24, y: 120 },
            { id: "id",        label: "ID_DB",      color: "#ffb347", x: 24, y: 192 },
            { id: "police",    label: "Police_DB",  color: "#ff6666", x: 24, y: 264 },
            { id: "sim",       label: "Sim_DB",     color: "#88ff88", x: 24, y: 336 },
            { id: "tel",       label: "TelScan",    color: "#ccaaff", x: 24, y: 408 },

            // Column 2
            { id: "nethacker", label: "NetHacker",   color: "#ffcc00", x: 108, y: 48 },
            { id: "notepad",   label: "Notes",      color: "#8888ff", x: 108, y: 120 },
            { id: "miner",     label: "Miner",      color: "#ff8800", x: 108, y: 192 },
            { id: "remote",    label: "Remote",     color: "#66ff99", x: 108, y: 264 },
            { id: "shop",      label: "Shop",       color: "#ff7043", x: 108, y: 336 },
            { id: "net",       label: "Net",        color: "#4caf50", x: 108, y: 408 },

            // Column 3
            { id: "duty",                   label: "DutyBoard",  color: "#999999", x: 192, y: 48 },
            { id: "stressReducer",          label: "StressReducer", color: "#dc2acf", x: 192, y: 120},
            { id: "browser",                label: "Browser", color: "#9e9393", x: 192, y: 192}
        ];

        this.wifiHitRect = null;
        this.wifiMenuRect = null;
    }

    // Helper to request opening an app
    openApp(id, data = null) {
        const event = new CustomEvent("force-open-app", {
            detail: { id, data }
        });
        window.dispatchEvent(event);
    }

    hitIcon(x, y) {
        const r = 48; // Icon hit size

        // 1. Check App Shortcuts
        for (const icon of this.icons) {
            if (x >= icon.x && x <= icon.x + r &&
                y >= icon.y && y <= icon.y + r) {
                return { type: "app", id: icon.id };
            }
        }

        // 2. Check Virtual Files
        // We calculate positions dynamically to match the render loop
        const files = fs.desktop.children;
        const startX = 280; // Start to the right of app icons
        const startY = 48;
        const gap = 84;     // Spacing
        const cols = 6;     // Files per row

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const col = i % cols;
            const row = Math.floor(i / cols);

            const fx = startX + col * gap;
            const fy = startY + row * gap;

            if (x >= fx && x <= fx + r && y >= fy && y <= fy + r) {
                return { type: "file", file: file };
            }
        }

        return null;
    }

    handleClick(x, y, canvasWidth, canvasHeight) {
        const ph = this.panelHeight;
        const panelTop = canvasHeight - ph;
        const nm = this.networkManager;

        // 1. Wi-Fi Menu
        if (nm.menuOpen && this.wifiMenuRect) {
            const r = this.wifiMenuRect;
            if (x >= r.x && x <= r.x + r.width &&
                y >= r.y && y <= r.y + r.height) {
                const itemHeight = 22;
                const index = Math.floor((y - r.y) / itemHeight);
                if (index >= 0 && index < nm.networks.length) {
                    nm.connect(nm.networks[index].id);
                }
                return true;
            }
        }

        // 2. Wi-Fi Icon
        if (this.wifiHitRect &&
            x >= this.wifiHitRect.x && x <= this.wifiHitRect.x + this.wifiHitRect.width &&
            y >= this.wifiHitRect.y && y <= this.wifiHitRect.y + this.wifiHitRect.height) {
            nm.toggleMenu();
            return true;
        }

        // 3. Bottom Panel
        if (y >= panelTop) {
            nm.closeMenu();
            return false;
        }

        nm.closeMenu();

        // 4. Icons
        const hit = this.hitIcon(x, y);
        if (hit) {
            if (hit.type === "app") {
                this.openApp(hit.id);
            } else if (hit.type === "file") {
                this.handleFileOpen(hit.file);
            }
            return true;
        }

        return false;
    }

    handleFileOpen(file) {
        if (file.isVirus && !file.virusActive) {
            file.virusActive = true;
            state.policeHeat += 25; // penalty
            // In a full version, will spawn annoying pop-ups here.
            console.log("VIRUS TRIGGERED!");
            return;
        }

        if (file.isEncrypted) {
            // Later: Open DecrypterApp.
            // For now: Open Notepad with a warning.
            this.openApp("notepad", {
                content: `[LOCKED FILE]\nType: ${file.originalType}\nEncryption: YES\n\nContent is scrambled. Use Decrypter tool.`
            });
            return;
        }

        if (file.type === "text" || file.type === "log") {
            this.openApp("notepad", { content: file.content });
        } else {
            // Binaries / Images
            this.openApp("notepad", {
                content: `[BINARY FILE: ${file.name}]\nSize: ${file.size} bytes\n\nCannot preview in text mode.`
            });
        }
    }

    render(ctx, canvasWidth, canvasHeight, activeTitle) {
        // 1. Wallpaper
        if (this.wallpaperLoaded) {
            ctx.drawImage(this.wallpaper, 0, 0, canvasWidth, canvasHeight);
        } else {
            ctx.fillStyle = "#101318";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // 2. App Icons
        for (const icon of this.icons) {
            this.renderAppIcon(ctx, icon);
        }

        // 3. File Icons
        this.renderFileIcons(ctx);

        // 4. Panel
        this.renderPanel(ctx, canvasWidth, canvasHeight, activeTitle);
    }

    renderAppIcon(ctx, icon) {
        ctx.save();
        ctx.translate(icon.x, icon.y);

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(4, 4, 40, 40);

        ctx.fillStyle = icon.color;
        ctx.fillRect(8, 8, 32, 32);

        ctx.fillStyle = "#ffffff";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(icon.label, 24, 44);

        ctx.restore();
    }

    renderFileIcons(ctx) {
        const files = fs.desktop.children;
        const startX = 280;
        const startY = 48;
        const gap = 84;
        const cols = 6;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type === "folder") continue;

            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * gap;
            const y = startY + row * gap;

            ctx.save();
            ctx.translate(x, y);

            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(4, 4, 40, 40);

            // Color Coding
            if (file.isEncrypted) {
                ctx.fillStyle = "#ff5555";
            } else if (file.type === "text") {
                ctx.fillStyle = "#dddddd";
            } else if (file.type === "log") {
                ctx.fillStyle = "#aaaaaa";
            } else {
                ctx.fillStyle = "#55aaff";
            }

            // Draw Icon Shape
            ctx.fillRect(8, 8, 32, 32);

            ctx.fillStyle = "#eeeeee";
            ctx.beginPath();
            ctx.moveTo(32, 8);
            ctx.lineTo(40, 16);
            ctx.lineTo(32, 16);
            ctx.fill();

            // Lock Overlay
            if (file.isEncrypted) {
                ctx.fillStyle = "#440000";
                ctx.fillRect(18, 16, 12, 14);
                ctx.strokeStyle = "#440000";
                ctx.lineWidth = 2;
                ctx.strokeRect(20, 12, 8, 4);
            }

            // Filename Label
            ctx.fillStyle = "#ffffff";
            ctx.font = "11px system-ui";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            let label = file.name;
            if (label.length > 10) label = label.substring(0, 8) + "..";
            ctx.fillText(label, 24, 44);

            ctx.restore();
        }
    }

    renderPanel(ctx, w, h, activeTitle) {
        const ph = this.panelHeight;

        ctx.save();
        ctx.fillStyle = "#2b2e37";
        ctx.fillRect(0, h - ph, w, ph);

        // Menu button
        ctx.fillStyle = "#3b3f4a";
        ctx.fillRect(8, h - ph + 4, 64, ph - 8);
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px system-ui";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText("Menu", 16, h - ph / 2);

        // Active window title
        if (activeTitle) {
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.fillText(activeTitle, 90, h - ph / 2);
        }

        // E€E display
        ctx.fillStyle = "#ffcc66";
        ctx.textAlign = "left";
        const coins = state.eightcoin.toFixed(1);
        ctx.fillText(`E€E: ${coins}`, w - 320, h - ph / 2);

        // Heat display
        const heat = Math.max(0, Math.min(100, state.policeHeat));
        const t = heat / 100;
        const r = Math.floor(255 * t);
        const g = Math.floor(255 * (1 - t));
        ctx.fillStyle = `rgb(${r},${g},80)`;
        ctx.fillText(`Heat: ${Math.round(heat)}%`, w - 220, h - ph / 2);

        // Wi-Fi icon
        const wifiCenterX = w - 90;
        const wifiCenterY = h - ph / 2;
        const iconWidth = 24;
        const iconHeight = ph - 8;
        this.wifiHitRect = {
            x: wifiCenterX - iconWidth / 2,
            y: h - ph + 4,
            width: iconWidth,
            height: iconHeight
        };
        this.renderWifiIcon(ctx, wifiCenterX, wifiCenterY);

        // Clock
        const baseMinutes = 21 * 60;
        const total = baseMinutes + state.time.minutes;
        const dayMinutes = total % (24 * 60);
        const hour = Math.floor(dayMinutes / 60);
        const minute = Math.floor(dayMinutes % 60);
        const timeStr =
            String(hour).padStart(2, "0") + ":" +
            String(minute).padStart(2, "0");

        ctx.textAlign = "right";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`D${state.time.day} ${timeStr}`, w - 16, h - ph / 2);

        // Wi-Fi menu
        this.renderWifiMenu(ctx, w, h);

        ctx.restore();
    }

    renderWifiIcon(ctx, cx, cy) {
        const nm = this.networkManager;
        const net = nm.getConnectedNetwork();
        const strength = net ? net.strength : 0;

        ctx.save();
        ctx.translate(cx, cy);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(0, 0);
        ctx.stroke();

        const maxBars = 3;
        for (let i = 1; i <= maxBars; i++) {
            ctx.beginPath();
            const radius = 4 + i * 3;
            const start = -0.75 * Math.PI;
            const end   = -0.25 * Math.PI;
            ctx.arc(0, 0, radius, start, end);
            ctx.strokeStyle = (i <= strength)
                ? "#ffffff"
                : "rgba(255,255,255,0.25)";
            ctx.stroke();
        }

        ctx.restore();
    }

    renderWifiMenu(ctx, w, h) {
        const nm = this.networkManager;
        if (!nm.menuOpen) {
            this.wifiMenuRect = null;
            return;
        }

        const ph = this.panelHeight;
        const itemHeight = 22;
        const itemCount = nm.networks.length;
        const menuWidth = 260;

        const wifiX = this.wifiHitRect
            ? (this.wifiHitRect.x + this.wifiHitRect.width / 2)
            : (w - 90);

        const menuHeight = itemHeight * itemCount;
        const menuX = wifiX - menuWidth + 24;
        const menuY = h - ph - menuHeight - 4;

        this.wifiMenuRect = {
            x: menuX,
            y: menuY,
            width: menuWidth,
            height: menuHeight
        };

        ctx.fillStyle = "rgba(20, 22, 28, 0.96)";
        ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.strokeRect(menuX + 0.5, menuY + 0.5, menuWidth - 1, menuHeight - 1);

        ctx.font = "12px system-ui";
        ctx.textBaseline = "middle";

        nm.networks.forEach((net, index) => {
            const rowY = menuY + index * itemHeight;
            const isConnected = net.id === nm.connectedId;
            const isKnown = nm.isKnown(net.id);

            if (isConnected) {
                ctx.fillStyle = "rgba(70, 120, 200, 0.5)";
                ctx.fillRect(menuX, rowY, menuWidth, itemHeight);
            }

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";

            let textX = menuX + 10;
            if (!isKnown) {
                ctx.fillText("🔒", textX, rowY + itemHeight / 2);
                textX += 16;
            }

            const label = `${net.ssid}  [WPA${net.wpa}]`;
            ctx.fillText(label, textX, rowY + itemHeight / 2);

            ctx.textAlign = "right";
            let bars = "";
            for (let i = 0; i < net.strength; i++) bars += "▮";
            ctx.fillText(bars, menuX + menuWidth - 10, rowY + itemHeight / 2);
        });
    }
}