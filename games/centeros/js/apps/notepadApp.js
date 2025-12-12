import { BaseApp } from "../core/baseApp.js";
import { fs } from "../os/fileSystem.js";

export class NotepadApp extends BaseApp {
    constructor(data) {
        super();
        this.fileId = data ? data.fileId : null;
        this.filePath = data ? data.filePath : "Untitled";

        if (data && typeof data.content === "string") {
            this.text = data.content;
        } else {
            this.text = "";
        }

        // Editor State
        this.cursorPos = this.text.length;
        this.showCursor = true;
        this.blinkTimer = 0;

        // Layout Config
        this.gutterWidth = 35;
        this.lineHeight = 20;
        this.fontSize = 14;

        // Calculated at runtime for mouse clicks
        this.charWidth = 8.4; // Approx for 14px mono
    }

    update(dt) {
        this.blinkTimer += dt;
        if (this.blinkTimer > 0.5) {
            this.showCursor = !this.showCursor;
            this.blinkTimer = 0;
        }
    }

    insertText(str) {
        const before = this.text.slice(0, this.cursorPos);
        const after = this.text.slice(this.cursorPos);
        this.text = before + str + after;
        this.cursorPos += str.length;
        this.ensureCursorVisible();
    }

    ensureCursorVisible() {
        const lines = this.text.substr(0, this.cursorPos).split("\n");
        const currentLine = lines.length - 1;

        // Visible area calculation
        // Total height of lines above
        const cursorPixelY = 30 + (currentLine * this.lineHeight);
        this.blinkTimer = 0;
        this.showCursor = true;
    }

    handleKey(e) {
        // 1. Save Shortcut (Ctrl + S)
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            this.saveFile();
            e.preventDefault();
            return;
        }

        // 2. Navigation (Arrow Keys)
        if (e.key === "ArrowLeft") {
            this.cursorPos = Math.max(0, this.cursorPos - 1);
            this.ensureCursorVisible();
            e.preventDefault();
            return;
        }
        if (e.key === "ArrowRight") {
            this.cursorPos = Math.min(this.text.length, this.cursorPos + 1);
            this.ensureCursorVisible();
            e.preventDefault();
            return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            this.moveCursorVertical(e.key === "ArrowUp" ? -1 : 1);
            e.preventDefault();
            return;
        }

        // 3. Backspace
        if (e.key === "Backspace") {
            if (this.cursorPos > 0) {
                // Smart Delete for pairs {}
                const charToDelete = this.text[this.cursorPos - 1];
                const nextChar = this.text[this.cursorPos];
                const pairs = { '{': '}', '[': ']', '(': ')', '"': '"', "'": "'" };

                if (pairs[charToDelete] === nextChar) {
                    const before = this.text.slice(0, this.cursorPos - 1);
                    const after = this.text.slice(this.cursorPos + 1);
                    this.text = before + after;
                    this.cursorPos--;
                } else {
                    const before = this.text.slice(0, this.cursorPos - 1);
                    const after = this.text.slice(this.cursorPos);
                    this.text = before + after;
                    this.cursorPos--;
                }
                this.ensureCursorVisible();
            }
            e.preventDefault();
            return;
        }

        // 4. Enter (Auto-Indent)
        if (e.key === "Enter") {
            const lastNewLine = this.text.lastIndexOf('\n', this.cursorPos - 1);
            const currentLineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
            const currentLine = this.text.substring(currentLineStart, this.cursorPos);

            const match = currentLine.match(/^(\s*)/);
            let indent = match ? match[1] : "";

            if (currentLine.trim().endsWith("{")) {
                indent += "    ";
            }

            const nextChar = this.text[this.cursorPos];
            if (currentLine.trim().endsWith("{") && nextChar === "}") {
                const lessIndent = indent.substring(0, indent.length - 4);
                this.insertText("\n" + indent + "\n" + lessIndent);
                this.cursorPos -= (1 + lessIndent.length);
            } else {
                this.insertText("\n" + indent);
            }

            e.preventDefault();
            return;
        }

        // 5. Tab
        if (e.key === "Tab") {
            this.insertText("    ");
            e.preventDefault();
            return;
        }

        // 6. Auto-Closing Pairs
        const pairs = { '{': '}', '[': ']', '(': ')', '"': '"', "'": "'" };
        if (pairs[e.key]) {
            this.insertText(e.key + pairs[e.key]);
            this.cursorPos--;
            e.preventDefault();
            return;
        }

        // 7. Skip Closing Braces
        const closers = ['}', ']', ')', '"', "'"];
        if (closers.includes(e.key)) {
            if (this.text[this.cursorPos] === e.key) {
                this.cursorPos++;
                e.preventDefault();
                return;
            }
        }

        // 8. Normal Typing
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            this.insertText(e.key);
            e.preventDefault();
        }
    }

    moveCursorVertical(direction) {
        const lines = this.text.split("\n");
        let pos = 0;
        let currentLineIdx = -1;
        let col = 0;

        // 1. Find which line we are on
        for(let i=0; i<lines.length; i++) {
            // length + 1 for the newline char
            const len = lines[i].length + 1;
            if (this.cursorPos < pos + len) {
                currentLineIdx = i;
                col = this.cursorPos - pos;
                break;
            }
            pos += len;
        }

        // Edge case: Cursor at very end of file
        if (currentLineIdx === -1) {
            currentLineIdx = lines.length - 1;
            col = lines[lines.length-1].length;
        }

        // 2. Determine Target Line
        const targetIdx = currentLineIdx + direction;

        // Check bounds
        if (targetIdx < 0 || targetIdx >= lines.length) return;

        // 3. Calculate new position
        const targetLine = lines[targetIdx];
        const newCol = Math.min(col, targetLine.length);

        // Sum up characters to get to the start of target line
        let newPos = 0;
        for(let i=0; i<targetIdx; i++) {
            newPos += lines[i].length + 1;
        }
        newPos += newCol;

        this.cursorPos = newPos;
        this.ensureCursorVisible();
    }

    saveFile() {
        if (!this.fileId) {
            const name = prompt("Enter filename to save:", "untitled.src");
            if (!name) return;

            const newFile = fs.documents.addFile(name, this.text, "text");
            this.fileId = newFile.id;
            this.filePath = "~/documents/" + name;
            return;
        }

        const file = fs.getFileById(this.fileId);
        if (file) {
            file.content = this.text;
        } else {
            this.fileId = null;
            this.saveFile();
        }
    }

    handleClick(globalX, globalY, contentRect) {
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        // Toolbar Clicks
        if (y < 30) {
            if (this.isInside(x, y, 10, 4, 60, 22)) {
                this.saveFile();
            }
            return;
        }
        const editorY = y - 30; // Y relative to top of text area
        const lineIndex = Math.floor(editorY / this.lineHeight);
        const lines = this.text.split("\n");

        if (lineIndex >= 0 && lineIndex < lines.length) {
            const lineText = lines[lineIndex];

            // Calculate column based on X and charWidth
            const textX = x - this.gutterWidth - 10;
            const col = Math.max(0, Math.round(textX / this.charWidth));
            const clampedCol = Math.min(col, lineText.length);

            // Convert Line/Col to Absolute Position
            let newPos = 0;
            for(let i=0; i<lineIndex; i++) {
                newPos += lines[i].length + 1; // +1 for \n
            }
            newPos += clampedCol;

            this.cursorPos = newPos;
            this.ensureCursorVisible();
        }
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#1e1e1e");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        // Update Char Width Calibration
        if (this.charWidth === 8.4) {
            ctx.font = `${this.fontSize}px monospace`;
            this.charWidth = ctx.measureText("M").width;
        }

        // Toolbar
        ctx.fillStyle = "#252526";
        ctx.fillRect(0, 0, rect.width, 30);
        ctx.fillStyle = "#2d7a3e";
        ctx.fillRect(10, 4, 60, 22);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SAVE", 40, 15);

        ctx.fillStyle = "#aaa";
        ctx.textAlign = "right";
        ctx.fillText(this.filePath, rect.width - 10, 15);

        // Editor Content
        const editorTop = 30;
        const lines = this.text.split("\n");
        this.contentHeight = editorTop + lines.length * this.lineHeight + 50;

        ctx.translate(0, -this.scrollY);

        // Gutter
        ctx.fillStyle = "#252526";
        ctx.fillRect(0, editorTop + this.scrollY, this.gutterWidth, rect.height - 30);
        ctx.fillRect(0, editorTop, this.gutterWidth, lines.length * this.lineHeight + 10);

        ctx.font = `${this.fontSize}px monospace`;
        ctx.textBaseline = "middle";

        let charCount = 0;
        let cursorX = 0;
        let cursorY = 0;
        let cursorFound = false;

        for (let i = 0; i < lines.length; i++) {
            const lineContent = lines[i];
            const y = editorTop + (i * this.lineHeight) + (this.lineHeight / 2);

            if (y + this.lineHeight/2 < this.scrollY || y - this.lineHeight/2 > this.scrollY + rect.height) {
                if (!cursorFound) {
                    const lineLen = lineContent.length + 1;
                    if (this.cursorPos < charCount + lineLen) {
                        // Cursor is on this non-rendered line
                    }
                    charCount += lineLen;
                }
                continue;
            }

            // Line Number
            ctx.textAlign = "right";
            ctx.fillStyle = "#858585";
            ctx.fillText(i + 1, this.gutterWidth - 8, y);

            // Syntax Highlighted Text
            this.renderHighlightedLine(ctx, lineContent, this.gutterWidth + 10, y);

            // Cursor Calculation
            if (!cursorFound) {
                const lineLen = lineContent.length + 1;
                if (this.cursorPos < charCount + lineLen) {
                    const col = this.cursorPos - charCount;
                    const textBeforeCursor = lineContent.substring(0, col);
                    const textWidth = ctx.measureText(textBeforeCursor).width;

                    cursorX = this.gutterWidth + 10 + textWidth;
                    cursorY = y;
                    cursorFound = true;
                }
                charCount += lineLen;
            }
        }

        // Draw Cursor
        if (this.showCursor && cursorFound) {
            ctx.fillStyle = "#fff";
            const h = this.fontSize + 2;
            ctx.fillRect(cursorX, cursorY - h/2, 2, h);
        }

        ctx.restore();
    }

    renderHighlightedLine(ctx, text, x, y) {
        ctx.textAlign = "left";
        const tokens = text.split(/(\s+|[(){};="'.\[\]])/);
        let currentX = x;
        let inString = false;
        let stringChar = null;

        tokens.forEach(token => {
            if (!token) return;

            let color = "#d4d4d4";

            if (inString) {
                color = "#ce9178";
                if (token.includes(stringChar)) inString = false;
            }
            else if (token === '"' || token === "'") {
                inString = true;
                stringChar = token;
                color = "#ce9178";
            }
            else if (!isNaN(parseFloat(token))) color = "#b5cea8";
            else if (["var", "if", "else", "while", "print", "return", "function", "for"].includes(token)) color = "#569cd6";
            else if (["true", "false", "null"].includes(token)) color = "#569cd6";
            else if (["App", "Net", "Sys", "File", "Console", "Math", "String"].includes(token)) color = "#4ec9b0";
            else if (token.startsWith(".")) color = "#d4d4d4";

            ctx.fillStyle = color;
            ctx.fillText(token, currentX, y);
            currentX += ctx.measureText(token).width;
        });
    }
}