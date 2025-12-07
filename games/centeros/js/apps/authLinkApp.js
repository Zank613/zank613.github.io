import { state } from "../state.js";
import { getOfficerById } from "../world/caseWorld.js";
import { setPoliceCode } from "../world/security.js";
import { BaseApp } from "../core/baseApp.js";

export class AuthLinkApp extends BaseApp {
    constructor(targetPoliceId) {
        super();
        this.targetPoliceId = targetPoliceId;
        this.officer = getOfficerById(targetPoliceId);
        this.cols = 7; this.rows = 6;
        this.board = Array(7).fill().map(() => Array(6).fill(0));
        this.turn = 1;
        this.status = "playing";
        this.message = "Connect 4 nodes to bypass firewall.";
        this.timeLeft = 60;
        this.cellSize = 32;
        this.offsetX = 20;
        this.offsetY = 60;
    }

    handleClick(globalX, globalY, contentRect) {
        if (this.status !== "playing") return;
        const { x, y } = this.getLocalCoords(globalX, globalY, contentRect);

        const bx = x - this.offsetX;
        const by = y - this.offsetY;

        if (bx >= 0 && bx <= this.cols * this.cellSize && by >= -20 && by <= this.rows * this.cellSize) {
            const col = Math.floor(bx / this.cellSize);
            if (col >= 0 && col < this.cols) this.dropPiece(col, 1);
        }
    }

    dropPiece(col, player) {
        if (this.status !== "playing") return;
        const c = this.board[col];
        const r = c.lastIndexOf(0);
        if (r === -1) return;

        c[r] = player;
        if (this.checkWin(col, r, player)) { this.endGame(player === 1 ? "win" : "lose"); return; }

        if (player === 1) {
            this.turn = 2; this.message = "Firewall responding...";
            setTimeout(() => this.cpuMove(), 500);
        } else {
            this.turn = 1; this.message = "Your turn.";
        }
    }

    cpuMove() {
        if (this.status !== "playing") return;
        const valid = this.board.map((c, i) => c.includes(0) ? i : -1).filter(i => i !== -1);
        if (valid.length) this.dropPiece(valid[Math.floor(Math.random() * valid.length)], 2);
        else this.endGame("draw");
    }

    checkWin(c, r, p) {
        const dirs = [[1,0], [0,1], [1,1], [1,-1]];
        return dirs.some(([dx, dy]) => {
            let count = 1;
            for (let d = 1; d < 4; d++) { if (this.board[c + dx*d]?.[r + dy*d] === p) count++; else break; }
            for (let d = 1; d < 4; d++) { if (this.board[c - dx*d]?.[r - dy*d] === p) count++; else break; }
            return count >= 4;
        });
    }

    endGame(result) {
        this.status = result;
        if (result === "win") {
            this.message = "INJECTION SUCCESSFUL.";
            setPoliceCode(this.targetPoliceId, "AUTH-" + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase());
            state.eightcoin += 2;
        } else {
            this.message = "TRACE DETECTED.";
            state.policeHeat += 15;
        }
    }

    update(dt) {
        if (this.status === "playing") {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) this.endGame("timeout");
        }
    }

    render(ctx, rect) {
        this.clear(ctx, rect, "#111");
        ctx.save();
        ctx.translate(rect.x, rect.y);

        ctx.font = "16px monospace";
        ctx.fillStyle = this.status === "playing" ? "#66ccff" : (this.status === "win" ? "#66ff66" : "#ff6666");
        ctx.fillText(this.message, 20, 30);
        ctx.font = "12px monospace";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, 20, 50);

        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const x = this.offsetX + c * this.cellSize;
                const y = this.offsetY + r * this.cellSize;
                ctx.strokeStyle = "#444";
                ctx.strokeRect(x, y, this.cellSize, this.cellSize);
                if (this.board[c][r] !== 0) {
                    ctx.fillStyle = this.board[c][r] === 1 ? "#3399ff" : "#ff3333";
                    ctx.beginPath();
                    ctx.arc(x + 16, y + 16, 12, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }
}