/*

MIT License

Copyright (c) 2025 ATAERK YILDIRIM

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/



// Canvas

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32;

// 0 = path, 1 = wall
const LEVEL_1 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
    [1,0,1,0,0,1,0,0,0,1,0,0,1,0,1],
    [1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,0,1,1,0,1,1,0,1,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,1,0,0,1],
    [1,0,1,0,1,1,1,0,1,1,1,1,0,1,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const LEVELS = [LEVEL_1];
let currentLevelIndex = 0;
let level = LEVELS[currentLevelIndex];

const TILES_Y = level.length;
const TILES_X = level[0].length;

canvas.width  = TILES_X * TILE_SIZE;
canvas.height = TILES_Y * TILE_SIZE;


// Game States

const PLAYER_START = { x: 1, 1: 1 };
PLAYER_START.y = 1;

const GHOST_START = { x: 13, y: 13 };

let pellets = [];
let remainingPellets = 0;

function initPellets() {
    pellets = [];
    remainingPellets = 0;

    for (let y = 0; y < TILES_Y; y++) {
        pellets[y] = [];
        for (let x = 0; x < TILES_X; x++) {
            if (level[y][x] === 0) {
                pellets[y][x] = true;
                remainingPellets++;
            } else {
                pellets[y][x] = false;
            }
        }
    }

    // no pellets under spawn points
    if (pellets[PLAYER_START.y][PLAYER_START.x]) {
        pellets[PLAYER_START.y][PLAYER_START.x] = false;
        remainingPellets--;
    }
    if (pellets[GHOST_START.y][GHOST_START.x]) {
        pellets[GHOST_START.y][GHOST_START.x] = false;
        remainingPellets--;
    }
}

initPellets();

let score = 0;
let lives = 3;
let statusMessage = "";


// ==== HELPERS ====

function isWalkable(tileX, tileY) {
    if (tileX < 0 || tileX >= TILES_X || tileY < 0 || tileY >= TILES_Y) {
        return false;
    }
    return level[tileY][tileX] !== 1;
}

class Player {
    constructor(tileX, tileY, speed = 0.05, color = "#ffd800") {
        this.spawnX = tileX;
        this.spawnY = tileY;
        this.speed = speed;
        this.color = color;

        this.resetToStart();
    }

    resetToStart() {
        this.tileX = this.spawnX;
        this.tileY = this.spawnY;

        this.startTileX = this.tileX;
        this.startTileY = this.tileY;
        this.targetTileX = this.tileX;
        this.targetTileY = this.tileY;

        this.progress = 0;
        this.isMoving = false;

        this.dirX = 0;
        this.dirY = 0;
        this.nextDirX = 0;
        this.nextDirY = 0;
    }

    setDesiredDirection(dx, dy) {
        this.nextDirX = dx;
        this.nextDirY = dy;
    }

    update() {
        if (!this.isMoving) {
            if (this.nextDirX !== 0 || this.nextDirY !== 0) {
                const nx = this.tileX + this.nextDirX;
                const ny = this.tileY + this.nextDirY;

                if (isWalkable(nx, ny)) {
                    this.dirX = this.nextDirX;
                    this.dirY = this.nextDirY;

                    this.startTileX = this.tileX;
                    this.startTileY = this.tileY;
                    this.targetTileX = nx;
                    this.targetTileY = ny;
                    this.progress = 0;
                    this.isMoving = true;
                }
            }
            return;
        }

        this.progress += this.speed;

        if (this.progress >= 1) {
            this.progress = 0;
            this.tileX = this.targetTileX;
            this.tileY = this.targetTileY;
            this.startTileX = this.tileX;
            this.startTileY = this.tileY;

            if (this.nextDirX !== 0 || this.nextDirY !== 0) {
                const tx = this.tileX + this.nextDirX;
                const ty = this.tileY + this.nextDirY;

                if (isWalkable(tx, ty)) {
                    this.dirX = this.nextDirX;
                    this.dirY = this.nextDirY;

                    this.targetTileX = tx;
                    this.targetTileY = ty;
                    this.isMoving = true;
                    return;
                }
            }

            const fx = this.tileX + this.dirX;
            const fy = this.tileY + this.dirY;

            if (isWalkable(fx, fy)) {
                this.targetTileX = fx;
                this.targetTileY = fy;
                this.isMoving = true;
            } else {
                this.isMoving = false;
                this.dirX = 0;
                this.dirY = 0;
            }
        }
    }

    draw() {
        const interpX = this.startTileX +
            (this.targetTileX - this.startTileX) * this.progress;
        const interpY = this.startTileY +
            (this.targetTileY - this.startTileY) * this.progress;

        const px = interpX * TILE_SIZE + TILE_SIZE / 2;
        const py = interpY * TILE_SIZE + TILE_SIZE / 2;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(px, py, TILE_SIZE / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Ghost {
    constructor(tileX, tileY, speed = 0.04, color = "red") {
        this.spawnX = tileX;
        this.spawnY = tileY;
        this.speed = speed;
        this.color = color;

        this.resetToStart();
    }

    resetToStart() {
        this.tileX = this.spawnX;
        this.tileY = this.spawnY;

        this.startTileX = this.tileX;
        this.startTileY = this.tileY;
        this.targetTileX = this.tileX;
        this.targetTileY = this.tileY;

        this.progress = 0;
        this.isMoving = false;

        this.dirX = 0;
        this.dirY = -1;
    }

    chooseDirectionToward(targetX, targetY) {
        const dirs = [
            { dx: 0,  dy: -1 }, // up
            { dx: 0,  dy: 1 },  // down
            { dx: -1, dy: 0 },  // left
            { dx: 1,  dy: 0 }   // right
        ];

        let bestDir = null;
        let bestDist = Infinity;

        for (const d of dirs) {
            const nx = this.tileX + d.dx;
            const ny = this.tileY + d.dy;

            if (!isWalkable(nx, ny)) continue;

            if (this.dirX === -d.dx && this.dirY === -d.dy &&
                (this.dirX !== 0 || this.dirY !== 0)) {
                continue;
            }

            const dist = Math.abs(nx - targetX) + Math.abs(ny - targetY);
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
            }
        }

        if (!bestDir) {
            for (const d of dirs) {
                const nx = this.tileX + d.dx;
                const ny = this.tileY + d.dy;
                if (!isWalkable(nx, ny)) continue;
                const dist = Math.abs(nx - targetX) + Math.abs(ny - targetY);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestDir = d;
                }
            }
        }

        if (bestDir) {
            this.dirX = bestDir.dx;
            this.dirY = bestDir.dy;
            this.startTileX = this.tileX;
            this.startTileY = this.tileY;
            this.targetTileX = this.tileX + this.dirX;
            this.targetTileY = this.tileY + this.dirY;
            this.progress = 0;
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }
    }

    update(targetX, targetY) {
        if (!this.isMoving) {
            this.chooseDirectionToward(targetX, targetY);
            return;
        }

        this.progress += this.speed;

        if (this.progress >= 1) {
            this.progress = 0;
            this.tileX = this.targetTileX;
            this.tileY = this.targetTileY;
            this.startTileX = this.tileX;
            this.startTileY = this.tileY;

            this.isMoving = false;
        }
    }

    draw() {
        const interpX = this.startTileX +
            (this.targetTileX - this.startTileX) * this.progress;
        const interpY = this.startTileY +
            (this.targetTileY - this.startTileY) * this.progress;

        const px = interpX * TILE_SIZE + TILE_SIZE / 2;
        const py = interpY * TILE_SIZE + TILE_SIZE / 2;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(px, py, TILE_SIZE / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

const player = new Player(PLAYER_START.x, PLAYER_START.y);
const redGhost = new Ghost(GHOST_START.x, GHOST_START.y);


// Input

window.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
            player.setDesiredDirection(0, -1);
            break;
        case "ArrowDown":
        case "s":
        case "S":
            player.setDesiredDirection(0, 1);
            break;
        case "ArrowLeft":
        case "a":
        case "A":
            player.setDesiredDirection(-1, 0);
            break;
        case "ArrowRight":
        case "d":
        case "D":
            player.setDesiredDirection(1, 0);
            break;
    }
});

function collectPellet() {
    const x = player.tileX;
    const y = player.tileY;

    if (pellets[y] && pellets[y][x]) {
        pellets[y][x] = false;
        remainingPellets--;
        score += 10;

        if (remainingPellets <= 0) {
            statusMessage = "LEVEL CLEARED!";
        }
    }
}

function checkGhostCollision() {
    if (player.tileX === redGhost.tileX && player.tileY === redGhost.tileY) {
        lives--;
        statusMessage = "Caught by Red! Lives: " + lives;

        player.resetToStart();
        redGhost.resetToStart();

        if (lives <= 0) {
            statusMessage = "Game Over! Score: " + score;

            // reset game
            lives = 3;
            score = 0;
            initPellets();
            player.resetToStart();
            redGhost.resetToStart();
        }
    }
}

function drawMaze() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < TILES_Y; y++) {
        for (let x = 0; x < TILES_X; x++) {
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;

            if (level[y][x] === 1) {
                ctx.fillStyle = "#0033cc";
                ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            } else {
                // pellets
                if (pellets[y][x]) {
                    ctx.fillStyle = "#ffaa00";
                    const cx = px + TILE_SIZE / 2;
                    const cy = py + TILE_SIZE / 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
}

function drawHUD() {
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    ctx.fillText("Score: " + score, 10, 20);
    ctx.fillText("Lives: " + lives, 10, 40);

    if (statusMessage) {
        ctx.fillText(statusMessage, 10, canvas.height - 20);
    }
}

function update() {
    player.update();
    collectPellet();

    redGhost.update(player.tileX, player.tileY);
    checkGhostCollision();
}

function draw() {
    drawMaze();
    player.draw();
    redGhost.draw();
    drawHUD();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);