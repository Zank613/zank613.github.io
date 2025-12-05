import { state } from "../state.js";
import { getOfficerById } from "../world/caseWorld.js";
import { setPoliceCode } from "../world/security.js";

export class AuthLinkApp {
    constructor(targetPoliceId) {
        this.targetPoliceId = targetPoliceId;
        this.officer = getOfficerById(targetPoliceId);

        this.cols = 7;
        this.rows = 6;
        this.board = [];
        this.resetBoard();

        this.turn = 1; // 1=Player, 2=CPU
        this.status = "playing"; // playing, win, lose, timeout
        this.message = "Connect 4 nodes to bypass firewall.";
        this.timeLeft = 60;

        this.cellSize = 32;
        this.offsetX = 20;
        this.offsetY = 60;
    }

    resetBoard() {
        this.board = [];
        for (let c = 0; c < this.cols; c++) {
            this.board[c] = Array(this.rows).fill(0);
        }
    }

    handleClick(localX, localY, contentRect) {
        if (this.status !== "playing") return;

        const x = localX - contentRect.x - this.offsetX;
        const y = localY - contentRect.y - this.offsetY;
        const boardW = this.cols * this.cellSize;
        const boardH = this.rows * this.cellSize;

        if (x >= 0 && x <= boardW && y >= -20 && y <= boardH) {
            const col = Math.floor(x / this.cellSize);
            if (col >= 0 && col < this.cols) {
                this.dropPiece(col, 1);
            }
        }
    }

    dropPiece(col, player) {
        if (this.status !== "playing") return;
        const colArr = this.board[col];
        let row = -1;
        // Find lowest empty
        for (let r = this.rows - 1; r >= 0; r--) {
            if (colArr[r] === 0) { row = r; break; }
        }
        if (row === -1) return; // Column full

        colArr[row] = player;

        if (this.checkWin(col, row, player)) {
            this.endGame(player === 1 ? "win" : "lose");
            return;
        }

        // Switch turn
        if (player === 1) {
            this.turn = 2;
            this.message = "Firewall responding...";
            setTimeout(() => this.cpuMove(), 500);
        } else {
            this.turn = 1;
            this.message = "Your turn.";
        }
    }

    cpuMove() {
        if (this.status !== "playing") return;
        const validCols = [];
        for (let c = 0; c < this.cols; c++) {
            if (this.board[c].some(cell => cell === 0)) validCols.push(c);
        }
        if (validCols.length > 0) {
            const pick = validCols[Math.floor(Math.random() * validCols.length)];
            this.dropPiece(pick, 2);
        } else {
            this.endGame("draw");
        }
    }

    checkWin(c, r, p) {
        const directions = [[1,0], [0,1], [1,1], [1,-1]];
        for (const [dx, dy] of directions) {
            let count = 1;
            // forward
            let tx = c + dx; let ty = r + dy;
            while(tx>=0 && tx<this.cols && ty>=0 && ty<this.rows && this.board[tx][ty]===p) {
                count++; tx += dx; ty += dy;
            }
            // backward
            tx = c - dx; ty = r - dy;
            while(tx>=0 && tx<this.cols && ty>=0 && ty<this.rows && this.board[tx][ty]===p) {
                count++; tx -= dx; ty -= dy;
            }
            if (count >= 4) return true;
        }
        return false;
    }

    endGame(result) {
        this.status = result;
        if (result === "win") {
            this.message = "INJECTION SUCCESSFUL.";
            const hex = "AUTH-" + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase();
            setPoliceCode(this.targetPoliceId, hex);
            state.eightcoin += 2;
        } else {
            this.message = "INJECTION FAILED. TRACE DETECTED.";
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
        ctx.save();
        ctx.translate(rect.x, rect.y);
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Header
        ctx.font = "16px monospace";
        ctx.fillStyle = this.status === "playing" ? "#66ccff" : (this.status==="win"?"#66ff66":"#ff6666");
        ctx.fillText(this.message, 20, 30);
        ctx.font = "12px monospace";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, 20, 50);

        // Board
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const x = this.offsetX + c * this.cellSize;
                const y = this.offsetY + r * this.cellSize;
                ctx.strokeStyle = "#444";
                ctx.strokeRect(x, y, this.cellSize, this.cellSize);
                const val = this.board[c][r];
                if (val !== 0) {
                    ctx.fillStyle = val === 1 ? "#3399ff" : "#ff3333";
                    ctx.beginPath();
                    ctx.arc(x+16, y+16, 12, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }
}