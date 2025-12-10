import { state } from "../state.js";
import { BaseApp } from "../core/baseApp.js";
import { fs } from "../os/fileSystem.js";

export class PostmanApp extends BaseApp {
    constructor() {
        super();
        this.selectedEmailId = null;
        this.listRects = [];

        // Interactive state for attachments
        this.downloadBtnRect = null;
        this.feedbackMessage = "";
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        // 1. Detail View Clicks
        if (this.selectedEmailId) {
            // Back Button
            if (this.isInside(x, y, 10, 10, 60, 24)) {
                this.selectedEmailId = null;
                this.downloadBtnRect = null;
                this.feedbackMessage = "";
                return;
            }
            // Delete Button
            if (this.isInside(x, y, contentRect.width - 80, 10, 70, 24)) {
                state.emails = state.emails.filter(e => e.id !== this.selectedEmailId);
                this.selectedEmailId = null;
                this.downloadBtnRect = null;
                this.feedbackMessage = "";
                return;
            }

            // Download Attachment Button
            if (this.downloadBtnRect && this.isInside(x, y, this.downloadBtnRect.x, this.downloadBtnRect.y, this.downloadBtnRect.w, this.downloadBtnRect.h)) {
                this.handleDownload(this.downloadBtnRect.fileId);
                return;
            }
            return;
        }

        // 2. Inbox List Clicks
        for (const item of this.listRects) {
            if (this.isInside(x, y, item.x, item.y, item.w, item.h)) {
                this.selectedEmailId = item.id;
                this.feedbackMessage = ""; // Reset feedback
                // Mark as read
                const email = state.emails.find(e => e.id === item.id);
                if (email) email.read = true;
                return;
            }
        }
    }

    handleDownload(fileId) {
        // Look for the file in downloads
        const file = fs.home.downloads.children.find(f => f.id === fileId);

        if (!file) {
            this.feedbackMessage = "Error: Attachment file not found on disk.";
            return;
        }

        if (file.extension === "ces") {
            file.rename(file.name.replace(".ces", ".cts"));
            this.feedbackMessage = `Success: ${file.name} decrypted and saved.`;
        } else if (file.extension === "cts") {
            this.feedbackMessage = "File is already decrypted.";
        } else {
            this.feedbackMessage = "Error: Unknown file format.";
        }
    }

    render(ctx, rect) {
        super.render(ctx, rect); // Clears bg
        const colors = this.getColors();
        const fonts = this.getFonts();

        ctx.save();
        ctx.translate(rect.x, rect.y);

        // Header
        ctx.fillStyle = colors.titleBar;
        ctx.fillRect(0, 0, rect.width, 40);
        ctx.fillStyle = colors.titleText;
        ctx.font = fonts.panel;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("Postman v2.1", 16, 20);

        // Count Unread
        const unread = state.emails.filter(e => !e.read).length;
        ctx.textAlign = "right";
        ctx.fillStyle = unread > 0 ? "#ff5555" : "#aaaaaa";
        ctx.fillText(`${unread} unread`, rect.width - 16, 20);

        // View: Detail or List
        if (this.selectedEmailId) {
            this.renderDetail(ctx, rect, colors, fonts);
        } else {
            this.renderList(ctx, rect, colors, fonts);
        }

        ctx.restore();
    }

    renderList(ctx, rect, colors, fonts) {
        const startY = 50;
        const rowH = 50;
        this.listRects = [];
        let y = startY;

        if (state.emails.length === 0) {
            ctx.fillStyle = colors.contentText;
            ctx.textAlign = "center";
            ctx.fillText("No messages.", rect.width / 2, 100);
            return;
        }

        for (const email of state.emails) {
            // Row Background
            ctx.fillStyle = email.read ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.08)";
            ctx.fillRect(0, y, rect.width, rowH - 2);

            // Sender
            ctx.textAlign = "left";
            ctx.fillStyle = email.read ? colors.contentText : "#ffffff";
            ctx.font = fonts.ui;
            ctx.fillText(email.sender, 16, y + 18);

            // Subject
            ctx.font = email.read ? fonts.ui : "bold " + fonts.ui;
            ctx.fillStyle = email.read ? "#888" : colors.highlight;
            ctx.fillText(email.subject, 16, y + 36);

            // Time
            ctx.textAlign = "right";
            ctx.fillStyle = "#666";
            ctx.fillText(email.timestamp, rect.width - 16, y + 18);

            // Store Hit Region
            this.listRects.push({ id: email.id, x: 0, y: y, w: rect.width, h: rowH });

            y += rowH;
        }

        // Update Scroll Height
        this.contentHeight = y + 20;
    }

    renderDetail(ctx, rect, colors, fonts) {
        const email = state.emails.find(e => e.id === this.selectedEmailId);
        if (!email) { this.selectedEmailId = null; return; }

        // Toolbar
        ctx.fillStyle = "#333";
        ctx.fillRect(0, 0, rect.width, 44);

        // Back Button
        ctx.fillStyle = "#555";
        ctx.fillRect(10, 10, 60, 24);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText("<< Back", 40, 22);

        // Delete Button
        ctx.fillStyle = "#a33";
        ctx.fillRect(rect.width - 80, 10, 70, 24);
        ctx.fillStyle = "#fff";
        ctx.fillText("Delete", rect.width - 45, 22);

        // Content
        let y = 60;
        ctx.textAlign = "left";
        ctx.fillStyle = colors.highlight;
        ctx.font = "bold 14px system-ui";
        ctx.fillText(email.subject, 16, y);

        y += 24;
        ctx.fillStyle = "#888";
        ctx.font = fonts.ui;
        ctx.fillText(`From: ${email.sender}`, 16, y);
        y += 16;
        ctx.fillText(`Time: ${email.timestamp}`, 16, y);

        y += 30;
        ctx.fillStyle = colors.contentText;

        // Simple Wrap for Body Text
        const words = email.body.split(" ");
        let line = "";
        for(let w of words) {
            if (ctx.measureText(line + w).width > rect.width - 32) {
                ctx.fillText(line, 16, y);
                line = "";
                y += 18;
            }
            if (w.includes("\n")) {
                const splits = w.split("\n");
                line += splits[0];
                ctx.fillText(line, 16, y);
                line = splits[1] + " ";
                y += 18;
            } else {
                line += w + " ";
            }
        }
        ctx.fillText(line, 16, y);
        y += 30;

        // ATTACHMENT DETECTION
        this.downloadBtnRect = null;
        // Regex to find "cmd:download_cts:FILEID"
        const match = email.body.match(/cmd:download_cts:([a-zA-Z0-9_]+)/);

        if (match) {
            const fileId = match[1];

            // Draw Attachment Divider
            ctx.fillStyle = "#444";
            ctx.fillRect(16, y, rect.width - 32, 1);
            y += 15;

            // Draw Button
            const btnW = 200;
            const btnH = 30;

            ctx.fillStyle = "#2d7a3e";
            ctx.fillRect(16, y, btnW, btnH);
            ctx.strokeStyle = "#4caf50";
            ctx.strokeRect(16, y, btnW, btnH);

            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.font = "bold 12px system-ui";
            ctx.fillText("DECRYPT & DOWNLOAD", 16 + btnW/2, y + 15);

            this.downloadBtnRect = { x: 16, y: y, w: btnW, h: btnH, fileId: fileId };

            y += 45;
        }

        // Render Feedback Message (Success/Error)
        if (this.feedbackMessage) {
            ctx.textAlign = "left";
            ctx.fillStyle = this.feedbackMessage.includes("Error") ? "#ff5555" : "#55ff55";
            ctx.fillText(this.feedbackMessage, 16, y);
        }
    }
}