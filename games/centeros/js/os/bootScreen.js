import { state } from "../state.js";
import { themeManager } from "./theme.js";
import { audioManager } from "./audioManager.js";

export class BootScreen {
    constructor() {
        // BIOS Config
        this.biosLines = [
            "CenterBIOS v4.02 (c) Center Inc.",
            "CPU: Center Approved CPU @ Approved GHz",
            "Memory Test: 32768K OK",
            "Detecting Primary Master ... Center HDD 2TB",
            "Detecting Secondary Master ... None",
            "Initializing CenterMesh Network Controller ... OK",
            "Checking Security Modules ... OK",
            "Loading Kernel Image ...",
            "Verifying Signature ... VALID",
            "Booting CenterOS..."
        ];
        this.biosTimer = 0;
        this.biosIndex = 0;

        // BIOS Menu Config
        this.menuOptions = [
            "Standard CMOS Features",
            "Advanced BIOS Features",
            "Integrated Peripherals",
            "Power Management Setup",
            "PnP/PCI Configurations",
            "PC Health Status",
            "Frequency/Voltage Control",
            "Load Fail-Safe Defaults",
            "Load Optimized Defaults",
            "Set Supervisor Password",
            "Set User Password",
            "Save & Exit Setup",
            "Exit Without Saving"
        ];
        this.menuSelection = 0;
        this.showUnauthorizedPopup = false;

        // Kernel Config
        this.kernelProgress = 0;

        // Login Config
        this.userBuffer = "";
        this.passBuffer = "";
        this.activeInput = "user"; // 'user' or 'pass'
        this.loginMessage = "Welcome to CenterOS. Please Log In.";
        this.isError = false;

        this.blinkTimer = 0;
    }

    handleKey(e) {
        // 1. TRIGGER BIOS MENU
        if (state.boot.phase === "BIOS") {
            if (e.key === "Delete") {
                state.boot.phase = "BIOS_MENU";
                this.menuSelection = 0;
                this.showUnauthorizedPopup = false;
            }
            return;
        }

        // 2. NAVIGATE BIOS MENU
        if (state.boot.phase === "BIOS_MENU") {
            e.preventDefault();

            if (this.showUnauthorizedPopup) {
                // Any key closes the popup
                this.showUnauthorizedPopup = false;
                return;
            }

            if (e.key === "ArrowUp") {
                this.menuSelection--;
                if (this.menuSelection < 0) this.menuSelection = this.menuOptions.length - 1;
            } else if (e.key === "ArrowDown") {
                this.menuSelection++;
                if (this.menuSelection >= this.menuOptions.length) this.menuSelection = 0;
            } else if (e.key === "Escape") {
                // Exit BIOS
                state.boot.phase = "KERNEL";
            } else if (e.key === "Enter") {
                const option = this.menuOptions[this.menuSelection];

                // Allow Exit
                if (option.includes("Exit") || option.includes("Boot")) {
                    state.boot.phase = "KERNEL";
                } else {
                    // Deny Everything Else
                    this.showUnauthorizedPopup = true;
                }
            }
            return;
        }

        // 3. LOGIN LOGIC (Existing)
        if (state.boot.phase === "LOGIN") {
            if (e.key === "Tab") {
                e.preventDefault();
                this.activeInput = this.activeInput === "user" ? "pass" : "user";
                return;
            }
            if (e.key === "Enter") {
                this.attemptLogin();
                return;
            }
            if (e.key === "Backspace") {
                if (this.activeInput === "user") this.userBuffer = this.userBuffer.slice(0, -1);
                else this.passBuffer = this.passBuffer.slice(0, -1);
                return;
            }
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (this.activeInput === "user") this.userBuffer += e.key;
                else this.passBuffer += e.key;
            }
        }
    }

    attemptLogin() {
        if (this.userBuffer === "user1351" && this.passBuffer === "javascript") {
            state.currentUser = "user1351";
            state.boot.phase = "DESKTOP";

            audioManager.playLogin();
        } else {
            audioManager.playError();

            this.isError = true;
            this.loginMessage = "Authentication Failed. Invalid Credentials.";
            this.passBuffer = "";
            setTimeout(() => {
                this.isError = false;
                this.loginMessage = "Welcome to CenterOS. Please Log In.";
            }, 2000);
        }
    }

    update(dt) {
        this.blinkTimer += dt;

        if (state.boot.phase === "BIOS") {

            this.biosTimer += dt;
            if (this.biosTimer > 0.4 && this.biosIndex < this.biosLines.length) {
                this.biosTimer = 0;
                state.boot.logs.push(this.biosLines[this.biosIndex]);
                this.biosIndex++;

                audioManager.playHddSeek();
            }
            if (this.biosIndex >= this.biosLines.length && this.biosTimer > 2.0) {
                // Auto-advance if user didn't press DEL
                state.boot.phase = "KERNEL";
            }
        }
        else if (state.boot.phase === "KERNEL") {
            this.kernelProgress += dt * 33;
            if (this.kernelProgress >= 100) {
                this.kernelProgress = 100;
                if (Math.random() > 0.9) state.boot.phase = "LOGIN";
            }
            // audioManager.playBoot();
        }
    }

    render(ctx, w, h) {
        // Clear Screen
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, w, h);

        if (state.boot.phase === "BIOS") {
            this.renderBios(ctx, w, h);
        } else if (state.boot.phase === "BIOS_MENU") {
            this.renderBiosMenu(ctx, w, h);
        } else if (state.boot.phase === "KERNEL") {
            this.renderKernel(ctx, w, h);
        } else if (state.boot.phase === "LOGIN") {
            this.renderLogin(ctx, w, h);
        }
    }

    renderBios(ctx, w, h) {
        ctx.font = "16px monospace";
        ctx.fillStyle = "#aaaaaa";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        let y = 20;
        for (const line of state.boot.logs) {
            ctx.fillText(line, 20, y);
            y += 20;
        }

        // Blinking cursor
        if (Math.floor(this.blinkTimer * 2) % 2 === 0) {
            ctx.fillRect(20, y, 10, 18);
        }

        // Hint at bottom
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Press DEL to enter Setup", w / 2, h - 30);
    }

    renderBiosMenu(ctx, w, h) {
        // Classic BIOS Blue Background
        ctx.fillStyle = "#0000aa";
        ctx.fillRect(0, 0, w, h);

        // Double Border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.strokeRect(14, 14, w - 28, h - 28);

        // Header
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.shadowColor = "#000";
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText("CenterOS BIOS CMOS Setup Utility", w / 2, 24);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Options List
        ctx.font = "16px monospace";
        const startY = 80;
        const rowH = 24;

        for (let i = 0; i < this.menuOptions.length; i++) {
            const opt = this.menuOptions[i];
            const isSelected = i === this.menuSelection;
            const y = startY + i * rowH;

            if (isSelected) {
                ctx.fillStyle = "#aa0000";
                ctx.fillRect(w/2 - 200, y - 2, 400, rowH);
                ctx.fillStyle = "#ffff00";
            } else {
                ctx.fillStyle = "#ffffff";
            }

            ctx.textAlign = "center";
            ctx.fillText(opt, w / 2, y);
        }

        // Footer Instructions
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "14px monospace";
        ctx.fillText("↑↓: Move   ENTER: Select   F10: Save   ESC: Exit", w / 2, h - 30);

        // UNAUTHORIZED POPUP
        if (this.showUnauthorizedPopup) {
            this.renderPopup(ctx, w, h);
        }
    }

    renderPopup(ctx, w, h) {
        const pw = 400;
        const ph = 150;
        const px = w / 2 - pw / 2;
        const py = h / 2 - ph / 2;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(px + 10, py + 10, pw, ph);

        // Box
        ctx.fillStyle = "#aa0000";
        ctx.fillRect(px, py, pw, ph);

        // Border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        // Text
        ctx.fillStyle = "#ffff00";
        ctx.textAlign = "center";
        ctx.font = "bold 18px monospace";
        ctx.fillText("WARNING", w / 2, py + 30);

        ctx.fillStyle = "#ffffff";
        ctx.font = "14px monospace";
        ctx.fillText("Modification of hardware settings", w / 2, py + 60);
        ctx.fillText("is RESTRICTED by Group Policy.", w / 2, py + 80);

        ctx.fillStyle = "#000000";
        ctx.fillRect(w/2 - 40, py + 110, 80, 24);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("OK", w/2, py + 116);
    }

    renderKernel(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2;

        ctx.font = "bold 48px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("CenterOS", cx, cy - 50);

        const barW = 300;
        const barH = 10;
        ctx.strokeStyle = "#555";
        ctx.strokeRect(cx - barW/2, cy + 20, barW, barH);

        const fillW = (this.kernelProgress / 100) * (barW - 4);
        ctx.fillStyle = "#4488ff";
        ctx.fillRect(cx - barW/2 + 2, cy + 20 + 2, fillW, barH - 4);

        ctx.font = "14px system-ui";
        ctx.fillStyle = "#888";
        ctx.fillText("Loading System Components...", cx, cy + 50);
    }

    renderLogin(ctx, w, h) {
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#050510");
        grd.addColorStop(1, "#101020");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;

        ctx.fillStyle = "#334455";
        ctx.beginPath();
        ctx.arc(cx, cy - 100, 50, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "40px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", cx, cy - 100);

        ctx.textBaseline = "alphabetic";
        ctx.font = "16px system-ui";
        ctx.fillStyle = this.isError ? "#ff5555" : "#ffffff";
        ctx.fillText(this.loginMessage, cx, cy - 20);

        const drawInput = (y, type, value, active) => {
            const boxW = 240;
            const boxH = 34;
            const boxX = cx - boxW / 2;

            ctx.fillStyle = "#222";
            ctx.fillRect(boxX, y, boxW, boxH);

            ctx.strokeStyle = active ? "#4488ff" : "#444";
            ctx.lineWidth = active ? 2 : 1;
            ctx.strokeRect(boxX, y, boxW, boxH);

            ctx.fillStyle = "#fff";
            ctx.textAlign = "left";
            ctx.font = "14px system-ui";

            const displayTxt = type === "pass" ? "*".repeat(value.length) : value;
            ctx.fillText(displayTxt, boxX + 10, y + 22);

            if (active && Math.floor(this.blinkTimer * 2) % 2 === 0) {
                const tw = ctx.measureText(displayTxt).width;
                ctx.fillRect(boxX + 10 + tw, y + 8, 2, 18);
            }

            if (value === "") {
                ctx.fillStyle = "#555";
                ctx.fillText(type === "user" ? "Username" : "Password", boxX + 10, y + 22);
            }
        };

        drawInput(cy + 20, "user", this.userBuffer, this.activeInput === "user");
        drawInput(cy + 70, "pass", this.passBuffer, this.activeInput === "pass");

        ctx.fillStyle = "#444";
        ctx.textAlign = "center";
        ctx.font = "12px system-ui";
        ctx.fillText("Press TAB to switch, ENTER to login", cx, cy + 130);

        this.drawStickyNote(ctx, w, h);
    }

    drawStickyNote(ctx, w, h) {
        ctx.save();

        // Position at bottom-right corner of the login box area
        const noteX = w / 2 + 160;
        const noteY = h / 2 + 20;

        ctx.translate(noteX, noteY);
        ctx.rotate(0.1);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(5, 5, 120, 100);

        // Paper
        ctx.fillStyle = "#fef08a"; // Post-it yellow
        ctx.fillRect(0, 0, 120, 100);

        // Slightly darker top to simulate glue
        ctx.fillStyle = "#fde047";
        ctx.fillRect(0, 0, 120, 15);

        // Text
        ctx.fillStyle = "#000000";
        // Attempt a handwritten style font
        ctx.font = "14px 'Comic Sans MS', 'Chalkboard SE', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        ctx.fillText("Login Info:", 10, 25);
        ctx.font = "bold 13px monospace";
        ctx.fillText("U: user1351", 10, 50);
        ctx.fillText("P: javascript", 10, 70);

        ctx.restore();
    }
}