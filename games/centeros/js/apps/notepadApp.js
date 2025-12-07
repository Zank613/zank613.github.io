import { BaseApp } from "../core/baseApp.js";

export class NotepadApp extends BaseApp {
    constructor(fileData) {
        super();
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

    render(ctx, rect) {
        const colors = this.getColors();
        const fonts = this.getFonts();

        this.clear(ctx, rect, colors.contentBg);

        ctx.font = fonts.mono;
        ctx.fillStyle = colors.contentText;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";

        const lines = this.text.split("\n");
        const lineHeight = 18;
        for (let i = 0; i < lines.length; i++) {
            const y = rect.y + 8 + i * lineHeight;
            if (y > rect.y + rect.height - lineHeight) break;
            ctx.fillText(lines[i], rect.x + 8, y);
        }
    }
}