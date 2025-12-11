import { BaseApp } from "../core/baseApp.js";
import { fs } from "../os/fileSystem.js";
import { ScriptSystem } from "../systems/scriptSystem.js";
import { appRegistry } from "../os/appRegistry.js";
import {isAppInstalled} from "../state.js";
import { contextMenuManager } from "../os/contextMenuManager.js";

export class DirectoriesApp extends BaseApp {
    constructor(data) {
        super();
        this.currentFolder = fs.home;
        this.selectedItemId = null;
        this.itemsRects = [];

        this.mode = (data && data.mode) ? data.mode : "normal";
        this.sourceApp = (data && data.source) ? data.source : null;
    }

    navigateUp() {
        if (this.currentFolder.parent) {
            this.currentFolder = this.currentFolder.parent;
            this.selectedItemId = null;
            this.scrollY = 0;
        }
    }

    openItem(item) {
        if (item.type === "folder") {
            this.currentFolder = item;
            this.selectedItemId = null;
            this.scrollY = 0;
        } else {
            // It's a file
            if (this.mode === "picker") {
                this.handleFilePick(item);
            } else {
                this.handleFileLaunch(item);
            }
        }
    }

    handleFilePick(file) {
        const event = new CustomEvent("centeros-file-picked", {
            detail: {
                fileId: file.id,
                sourceApp: this.sourceApp
            }
        });
        window.dispatchEvent(event);

        if (this.windowManager) {
            window.dispatchEvent(new CustomEvent("centeros-close-window", { detail: { appId: "files" } }));
        }
    }

    handleRightClick(globalX, globalY, localX, localY) {
        // Check if we clicked a file
        for (const rect of this.itemsRects) {
            if (this.isInside(localX, localY, rect.x, rect.y, rect.w, rect.h)) {
                const file = rect.item;

                // Define Actions
                const actions = [
                    {
                        label: `Open "${file.name}"`,
                        action: () => this.openItem(file)
                    },
                    {
                        label: "Inspect Hex",
                        action: () => this.openHexDump(file)
                    },
                    {
                        label: "Decrypt",
                        condition: (file.extension === "ces" && isAppInstalled("cescracker")),
                        action: () => this.launchDecrypt(file)
                    },
                    {
                        label: "Delete",
                        action: () => this.deleteFile(file)
                    }
                ];

                contextMenuManager.open(globalX, globalY, actions);
                return true;
            }
        }

        // If clicked empty space
        contextMenuManager.open(globalX, globalY, [
            { label: "Refresh", action: () => {  } },
            { label: "New Folder", action: () => this.createFolder() }
        ]);

        return true;
    }

    openHexDump(file) {
        // Convert string/binary content to fake HEX representation
        let hex = "";
        const source = file.content;
        for(let i=0; i<Math.min(source.length, 200); i++) {
            hex += source.charCodeAt(i).toString(16).toUpperCase().padStart(2, '0') + " ";
            if((i+1) % 8 === 0) hex += " ";
            if((i+1) % 16 === 0) hex += "\n";
        }
        if (source.length > 200) hex += "\n... [EOF]";

        const header = `HEX DUMP: ${file.name} (${file.size} bytes)\n------------------------------------------------\n`;

        window.dispatchEvent(new CustomEvent("force-open-app", {
            detail: { id: "notepad", data: { content: header + hex } }
        }));
    }

    launchDecrypt(file) {
        window.dispatchEvent(new CustomEvent("force-open-app", {
            detail: {
                id: "cescracker",
                data: { content: null }
            }
        }));
    }

    deleteFile(file) {
        if (this.currentFolder) {
            this.currentFolder.deleteChild(file.id);
        }
    }

    createFolder() {
        if (this.currentFolder) {
            this.currentFolder.addFolder("New_Folder");
        }
    }

    handleFileLaunch(file) {
        console.log(`[DirectoriesApp] Launching ${file.name} (${file.extension})`);

        // 1. DYNAMIC REGISTRY LOOKUP
        const assignedAppId = appRegistry.getAppIdForExtension(file.extension);

        if (assignedAppId && isAppInstalled(assignedAppId)) {
            // Found a registered app
            window.dispatchEvent(new CustomEvent("force-open-app", {
                detail: {
                    id: assignedAppId,
                    data: {
                        content: file.content,
                        fileId: file.id,
                        // FIXED: Changed 'currentDir' to 'currentFolder'
                        filePath: this.currentFolder.getPath() + "/" + file.name
                    }
                }
            }));
        } else {
            // 2. FALLBACK
            window.dispatchEvent(new CustomEvent("force-open-app", {
                detail: {
                    id: "notepad",
                    data: { content: file.content }
                }
            }));
        }
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);
        const staticY = y - this.scrollY;

        // Header
        if (staticY < 40) {
            if (this.isInside(x, staticY, 10, 8, 40, 24)) this.navigateUp();
            return;
        }

        // Files
        for (const rect of this.itemsRects) {
            if (this.isInside(x, y, rect.x, rect.y, rect.w, rect.h)) {
                if (this.selectedItemId === rect.item.id) {
                    this.openItem(rect.item); // Double click trigger
                } else {
                    this.selectedItemId = rect.item.id;
                }
                return;
            }
        }
        this.selectedItemId = null;
    }

    render(ctx, rect) {
        super.render(ctx, rect);
        const colors = this.getColors();
        this.itemsRects = [];

        ctx.save();
        ctx.translate(rect.x, rect.y);

        // --- CONTENT AREA ---
        const startY = 50;
        const itemW = 80; const itemH = 90;
        const gapX = 10; const gapY = 10;
        const cols = Math.floor((rect.width - 20) / (itemW + gapX));

        let currentCol = 0; let currentRow = 0;
        const children = this.currentFolder.children || [];

        for (const item of children) {
            const ix = 10 + currentCol * (itemW + gapX);
            const iy = startY + currentRow * (itemH + gapY);

            // Highlight
            if (this.selectedItemId === item.id) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                ctx.fillRect(ix - 5, iy - 5, itemW + 10, itemH + 10);
                ctx.strokeStyle = colors.highlight;
                ctx.lineWidth = 1;
                ctx.strokeRect(ix - 5, iy - 5, itemW + 10, itemH + 10);
            }

            // Icons
            const iconSize = 40;
            const iconX = ix + (itemW - iconSize) / 2;
            const iconY = iy + 10;

            if (item.type === "folder") {
                ctx.fillStyle = "#eebb44";
                ctx.fillRect(iconX, iconY + 5, iconSize, iconSize - 5);
                ctx.fillRect(iconX, iconY, iconSize / 2, 5);
            } else {
                ctx.fillStyle = "#eeeeee";
                ctx.fillRect(iconX + 5, iconY, iconSize - 10, iconSize);
                // Badge logic
                let badgeColor = "#aaa";
                if (item.extension === "ces") badgeColor = "#ff4444";
                if (item.extension === "cts") badgeColor = "#44ff44";
                if (item.extension === "ccts") badgeColor = "#4db4ff";
                ctx.fillStyle = badgeColor;
                ctx.fillRect(iconX + 10, iconY + 20, iconSize - 20, 4);
            }

            // Label
            ctx.fillStyle = colors.contentText;
            ctx.font = "11px system-ui";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            let label = item.name;
            if (label.length > 12) label = label.substring(0, 10) + "..";
            ctx.fillText(label, ix + itemW/2, iy + 60);

            this.itemsRects.push({ item, x: ix, y: iy, w: itemW, h: itemH });

            currentCol++;
            if (currentCol >= cols) { currentCol = 0; currentRow++; }
        }

        this.contentHeight = startY + (currentRow + 1) * (itemH + gapY);

        ctx.translate(0, this.scrollY);
        ctx.fillStyle = colors.titleBar;
        ctx.fillRect(0, 0, rect.width, 40);
        ctx.strokeStyle = colors.windowBorder;
        ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(rect.width, 40); ctx.stroke();

        const canGoUp = !!this.currentFolder.parent;
        ctx.fillStyle = canGoUp ? "#444" : "#222";
        ctx.fillRect(10, 8, 40, 24);
        ctx.fillStyle = canGoUp ? "#fff" : "#555";
        ctx.font = "bold 16px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("↑", 30, 20);

        ctx.fillStyle = "#111";
        ctx.fillRect(60, 8, rect.width - 70, 24);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px monospace";
        ctx.textAlign = "left";

        const path = this.currentFolder.getPath();
        const headerText = this.mode === "picker" ? `[SELECT FILE] ${path}` : path;
        ctx.fillStyle = this.mode === "picker" ? "#ffff55" : "#aaa";
        ctx.fillText(headerText, 70, 20);

        ctx.restore();
    }
}