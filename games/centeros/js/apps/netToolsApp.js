import { BaseApp } from "../core/baseApp.js";

export class NetToolsApp extends BaseApp {
    constructor() {
        super();
    }

    render(ctx, rect) {
        super.render(ctx, rect);

        const colors = this.getColors();
        const fonts = this.getFonts();

        ctx.fillStyle = colors.contentText;
        ctx.font = fonts.ui;
        ctx.fillText("Network Tools (placeholder)", rect.x + 16, rect.y + 32);
    }
}