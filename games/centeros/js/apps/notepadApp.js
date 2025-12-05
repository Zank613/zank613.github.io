export class NotepadApp {
    constructor(fileData) {
        // If fileData is passed (string or object), load it. Otherwise empty.
        if (typeof fileData === "string") {
            this.text = fileData;
        } else if (fileData && fileData.content) {
            this.text = fileData.content;
        } else {
            this.text = "";
        }
    }

    handleKey(e) {
        if (e.key === "Backspace") {
            this.text = this.text.slice(0, -1);
            e.preventDefault();
        } else if (e.key === "Enter") {
            this.text += "\n";
            e.preventDefault();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            this.text += e.key;
            e.preventDefault();
        }
    }

    update(dt) {}

    render(ctx, rect) {
        ctx.fillStyle = "#101317";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        ctx.font = "13px monospace";
        ctx.fillStyle = "#f0f0f0";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        // Simple text wrapping or just line splitting
        const lines = this.text.split("\n");
        const lineHeight = 18;
        for (let i = 0; i < lines.length; i++) {
            const y = rect.y + 8 + i * lineHeight;
            if (y > rect.y + rect.height - lineHeight) break;
            ctx.fillText(lines[i], rect.x + 8, y);
        }
    }
}