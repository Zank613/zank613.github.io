// centeros/js/os/theme.js

export const THEMES = {
    ORIGINAL: {
        id: "original",
        name: "CenterOS Original",
        colors: {
            // Window
            windowBg: "#15171d",
            windowBorder: "#333b4d",
            windowBorderActive: "#4d9fff",
            titleBar: "#222732",
            titleBarActive: "#363c4a",
            titleText: "#aaccff",
            titleTextActive: "#ffffff",

            // Taskbar & Panel
            taskbarBg: "#2b2e37",
            taskbarBorder: "#3b3f4a",
            taskbarItemBg: "#3b3f4a",
            taskbarItemBgActive: "#4d9fff",
            taskbarItemText: "#aaaaaa",
            taskbarItemTextActive: "#ffffff",

            // UI Elements
            buttonClose: "#ff5555",
            buttonMax: "#55ff55",
            buttonMin: "#ffff55",
            highlight: "#ffcc66",

            // Content Areas
            contentBg: "#101317",
            contentText: "#dddddd",
            contentHighlight: "#ffcc66"
        },
        iconStyle: "flat"
    },
    CYBER: {
        id: "cyber",
        name: "Cyber Dark",
        colors: {
            windowBg: "#161922",
            windowBorder: "#333b4d",
            windowBorderActive: "#4d9fff",
            titleBar: "#222732",
            titleBarActive: "#363c4a",
            titleText: "#aaccff",
            titleTextActive: "#ffffff",

            taskbarBg: "rgba(20, 24, 32, 0.95)",
            taskbarBorder: "#333b4d",
            taskbarItemBg: "rgba(255, 255, 255, 0.05)",
            taskbarItemBgActive: "rgba(77, 180, 255, 0.2)",
            taskbarItemText: "#aaaaaa",
            taskbarItemTextActive: "#ffffff",

            buttonClose: "#ff5555",
            buttonMax: "#55ff55",
            buttonMin: "#ffff55",
            highlight: "#4db4ff",

            contentBg: "#0a0c10",
            contentText: "#aaccff",
            contentHighlight: "#4db4ff"
        },
        iconStyle: "gradient"
    },
    RETRO: {
        id: "retro",
        name: "Windows 95-ish",
        colors: {
            windowBg: "#c0c0c0",
            windowBorder: "#000000",
            windowBorderActive: "#000000",
            titleBar: "#000080",
            titleBarActive: "#000080",
            titleText: "#ffffff",
            titleTextActive: "#ffffff",

            taskbarBg: "#c0c0c0",
            taskbarBorder: "#ffffff",
            taskbarItemBg: "#c0c0c0",
            taskbarItemBgActive: "#e0e0e0",
            taskbarItemText: "#000000",
            taskbarItemTextActive: "#000000",

            buttonClose: "#c0c0c0",
            buttonMax: "#c0c0c0",
            buttonMin: "#c0c0c0",
            highlight: "#000080",

            contentBg: "#ffffff",
            contentText: "#000000",
            contentHighlight: "#000080"
        },
        iconStyle: "retro"
    }
};

export class ThemeManager {
    constructor() {
        this.current = THEMES.ORIGINAL; // Set default back to Original
        this.fontFamily = "system-ui";
    }

    setTheme(key) {
        if (THEMES[key]) {
            this.current = THEMES[key];
        }
    }

    setFont(family) {
        this.fontFamily = family;
    }

    get() {
        return this.current.colors;
    }

    getStyle() {
        return this.current.iconStyle;
    }

    getFonts() {
        const f = this.fontFamily;
        return {
            ui: `12px ${f}`,
            title: `bold 12px ${f}`,
            panel: `bold 14px ${f}`,
            mono: `13px monospace`
        };
    }
}

export const themeManager = new ThemeManager();