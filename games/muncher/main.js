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


// ===== Canvas =====

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32;

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS; // ~16.67 ms per frame

let lastTime = 0;
let accumulatedTime = 0;


// ===== Levels =====

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

// NEW Level 2
const LEVEL_2 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,0,1],
    [1,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,0,1,1,1,1,1,0,1,1,0,1,0,1],
    [1,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,1,0,1,1,1,1,1,0,1,1,0,1,0,1],
    [1,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,0,1],
    [1,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const LEVELS = [LEVEL_1, LEVEL_2];

// Per-level start positions
const PLAYER_STARTS = [
    { x: 1, y: 7 },   // Level 1
    { x: 9, y: 17 }   // Level 2 (bottom center-ish)
];

const RED_GHOST_STARTS = [
    { x: 13, y: 7 },  // Level 1
    { x: 9,  y: 9 }   // Level 2 (central-ish)
];

// Pink ghost (was "yellow")
const PINK_GHOST_STARTS = [
    null,              // Level 1: no pink
    { x: 9, y: 1 }     // Level 2 (top center)
];

// 4 far-ish power pellets per level
const POWER_PELLET_POSITIONS = [
    // Level 1 (15x15)
    [
        { x: 1,  y: 1 },
        { x: 13, y: 1 },
        { x: 1,  y: 13 },
        { x: 13, y: 13 }
    ],
    // Level 2 (19x19)
    [
        { x: 1,  y: 1 },
        { x: 17, y: 1 },
        { x: 1,  y: 17 },
        { x: 17, y: 17 }
    ]
];

let currentLevelIndex = 0;
let level = LEVELS[currentLevelIndex];

let TILES_Y = level.length;
let TILES_X = level[0].length;

canvas.width  = TILES_X * TILE_SIZE;
canvas.height = TILES_Y * TILE_SIZE;


// ===== Game-wide State =====

let pellets = [];
let powerPellets = [];
let remainingPellets = 0;

let score = 0;
let lives = 3;
let statusMessage = "";

let isPowerMode = false;
let powerModeTimer = 0;
const POWER_MODE_DURATION = 60 * 6; // ~6 seconds at ~60fps


// ===== Helpers =====

function isWalkable(tileX, tileY) {
    if (tileX < 0 || tileX >= TILES_X || tileY < 0 || tileY >= TILES_Y) {
        return false;
    }
    return level[tileY][tileX] !== 1;
}

// Breadth-first search to find the next step from (sx,sy) towards (tx,ty)
function bfsNextStep(sx, sy, tx, ty) {
    if (sx === tx && sy === ty) {
        return null;
    }

    const queue = [];
    const visited = Array.from({ length: TILES_Y }, () =>
        Array(TILES_X).fill(false)
    );
    const parent = Array.from({ length: TILES_Y }, () =>
        Array(TILES_X).fill(null)
    );

    if (!isWalkable(sx, sy)) return null;

    queue.push({ x: sx, y: sy });
    visited[sy][sx] = true;

    const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
    ];

    let found = false;

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        if (x === tx && y === ty) {
            found = true;
            break;
        }

        for (const d of dirs) {
            const nx = x + d.dx;
            const ny = y + d.dy;

            if (
                ny < 0 || ny >= TILES_Y ||
                nx < 0 || nx >= TILES_X ||
                visited[ny][nx] ||
                !isWalkable(nx, ny)
            ) {
                continue;
            }

            visited[ny][nx] = true;
            parent[ny][nx] = { x, y };
            queue.push({ x: nx, y: ny });
        }
    }

    if (!found || !visited[ty][tx]) {
        return null; // no path
    }

    // Backtrack from target to start
    let cx = tx;
    let cy = ty;
    let prev = parent[cy][cx];

    while (prev && !(prev.x === sx && prev.y === sy)) {
        cx = prev.x;
        cy = prev.y;
        prev = parent[cy][cx];
    }

    const dx = cx - sx;
    const dy = cy - sy;
    if (dx === 0 && dy === 0) {
        return null;
    }
    return { dx, dy };
}

function manhattan(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

function initPellets(playerStart, ghostStarts) {
    pellets = [];
    powerPellets = [];
    remainingPellets = 0;

    // Base pellets everywhere there's path
    for (let y = 0; y < TILES_Y; y++) {
        pellets[y] = [];
        powerPellets[y] = [];
        for (let x = 0; x < TILES_X; x++) {
            const isPath = (level[y][x] === 0);
            pellets[y][x] = isPath;
            powerPellets[y][x] = false;
        }
    }

    // Place power pellets for this level
    const ppList = POWER_PELLET_POSITIONS[currentLevelIndex] || [];
    for (const pos of ppList) {
        const { x, y } = pos;
        if (isWalkable(x, y)) {
            pellets[y][x] = false;          // no normal pellet there
            powerPellets[y][x] = true;      // big power pellet
        }
    }

    // No pellets under spawn points
    const forbidden = [playerStart, ...ghostStarts];
    for (const s of forbidden) {
        if (!s) continue;
        if (pellets[s.y] && pellets[s.y][s.x]) {
            pellets[s.y][s.x] = false;
        }
        if (powerPellets[s.y] && powerPellets[s.y][s.x]) {
            powerPellets[s.y][s.x] = false;
        }
    }

    // Count total pellets (normal + power)
    for (let y = 0; y < TILES_Y; y++) {
        for (let x = 0; x < TILES_X; x++) {
            if (pellets[y][x] || powerPellets[y][x]) {
                remainingPellets++;
            }
        }
    }
}


// ===== Player =====

class Player {
    constructor(tileX, tileY, speed = 0.15, color = "#ffd800") {
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
            // Try to start moving in desired direction
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

            // Try desired direction first
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

            // Otherwise keep going forward if possible
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


// ===== Ghost =====
// Red: BFS chase to player tile.
// Pink: BFS chase to a point ahead of the player (trap from front).
// In power mode, they run towards far corners away from the player.

class Ghost {
    constructor(tileX, tileY, options = {}) {
        this.spawnX = tileX;
        this.spawnY = tileY;

        this.name      = options.name  || "Ghost";
        this.baseColor = options.color || "red";

        // BFS-driven; speed is interpolation between tiles.
        this.straightSpeed = options.straightSpeed ?? 0.17;
        this.turnSpeed     = options.turnSpeed     ?? 0.12;

        this.behavior = options.behavior || "chase"; // "chase" or "front"

        this.isFrightened = false;
        this.isActive = true;

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
        this.currentSpeed = this.straightSpeed;
    }

    setFrightened(on) {
        this.isFrightened = on;
        // Slight speed reduction in frightened mode so player can catch them
        if (on) {
            this.currentSpeed = this.turnSpeed * 0.8;
        } else {
            this.currentSpeed = this.straightSpeed;
        }
    }

    // Corner-style scatter targets (per level, per ghost)
    getScatterTargets() {
        const corners = [
            { x: 1,            y: 1 },
            { x: TILES_X - 2,  y: 1 },
            { x: 1,            y: TILES_Y - 2 },
            { x: TILES_X - 2,  y: TILES_Y - 2 }
        ];

        // You can customise per ghost here if you want
        if (this.name === "Red") {
            // Prefers top-right / bottom-right
            return [corners[1], corners[3]];
        }
        if (this.name === "Pink") {
            // Prefers top-left / bottom-left
            return [corners[0], corners[2]];
        }
        return corners;
    }

    // Compute the actual target tile based on behavior and power mode
    computeTarget(player) {
        // Normal (non-frightened) mode
        if (!this.isFrightened) {
            let tx = player.tileX;
            let ty = player.tileY;

            if (this.behavior === "front") {
                // Pink ghost: aim a few tiles ahead of player direction
                const lookAhead = 4;
                if (player.dirX !== 0 || player.dirY !== 0) {
                    tx = player.tileX;
                    ty = player.tileY;
                    for (let i = 0; i < lookAhead; i++) {
                        const nx = tx + player.dirX;
                        const ny = ty + player.dirY;
                        if (!isWalkable(nx, ny)) break;
                        tx = nx;
                        ty = ny;
                    }
                }
            }

            return { tx, ty };
        }

        // Frightened mode: run to a far corner away from the player
        const candidates = this.getScatterTargets().filter(pos =>
            isWalkable(pos.x, pos.y)
        );

        // If somehow no corner is walkable (unlikely), just flee locally
        if (candidates.length === 0) {
            return { tx: this.tileX, ty: this.tileY };
        }

        let best = candidates[0];
        let bestDist = manhattan(best.x, best.y, player.tileX, player.tileY);

        for (const pos of candidates) {
            const d = manhattan(pos.x, pos.y, player.tileX, player.tileY);
            if (d > bestDist) {
                bestDist = d;
                best = pos;
            }
        }

        return { tx: best.x, ty: best.y };
    }

    chooseDirection(player) {
        const { tx, ty } = this.computeTarget(player);

        // First try BFS path to chosen target
        let step = bfsNextStep(this.tileX, this.tileY, tx, ty);

        // If BFS fails (no path), fall back to local decision so we never freeze
        if (!step) {
            const dirs = [
                { dx: 0,  dy: -1 },
                { dx: 0,  dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1,  dy: 0 }
            ];

            let bestDir = null;
            let bestMetric = this.isFrightened ? -Infinity : Infinity;

            for (const d of dirs) {
                const nx = this.tileX + d.dx;
                const ny = this.tileY + d.dy;

                if (!isWalkable(nx, ny)) continue;

                const dist = manhattan(nx, ny, player.tileX, player.tileY);

                if (!this.isFrightened) {
                    // chase: minimise distance
                    if (dist < bestMetric) {
                        bestMetric = dist;
                        bestDir = d;
                    }
                } else {
                    // flee: maximise distance
                    if (dist > bestMetric) {
                        bestMetric = dist;
                        bestDir = d;
                    }
                }
            }

            if (!bestDir) {
                this.isMoving = false;
                return;
            }

            step = bestDir;
        }

        const turning = (step.dx !== this.dirX || step.dy !== this.dirY);

        this.dirX = step.dx;
        this.dirY = step.dy;

        this.startTileX = this.tileX;
        this.startTileY = this.tileY;
        this.targetTileX = this.tileX + this.dirX;
        this.targetTileY = this.tileY + this.dirY;
        this.progress = 0;
        this.isMoving = true;

        // Slightly slower on turns to give the player some corner advantage
        this.currentSpeed = turning ? this.turnSpeed : this.straightSpeed;
        if (this.isFrightened) {
            this.currentSpeed *= 0.8; // always a bit slower when scared
        }
    }

    update(player) {
        if (!this.isActive) return;

        if (!this.isMoving) {
            this.chooseDirection(player);
            return;
        }

        this.progress += this.currentSpeed;

        if (this.progress >= 1) {
            this.progress = 0;
            this.tileX = this.targetTileX;
            this.tileY = this.targetTileY;
            this.startTileX = this.tileX;
            this.startTileY = this.tileY;

            this.isMoving = false; // will pick new direction next frame
        }
    }

    draw() {
        if (!this.isActive) return;

        const interpX = this.startTileX +
            (this.targetTileX - this.startTileX) * this.progress;
        const interpY = this.startTileY +
            (this.targetTileY - this.startTileY) * this.progress;

        const px = interpX * TILE_SIZE + TILE_SIZE / 2;
        const py = interpY * TILE_SIZE + TILE_SIZE / 2;

        ctx.fillStyle = this.isFrightened ? "#0000ff" : this.baseColor;
        ctx.beginPath();
        ctx.arc(px, py, TILE_SIZE / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
    }
}


// ===== Entities =====

let player;
let redGhost;
let pinkGhost;


function loadLevel(index, resetScoreAndLives = false) {
    currentLevelIndex = index;
    level = LEVELS[currentLevelIndex];

    TILES_Y = level.length;
    TILES_X = level[0].length;

    canvas.width  = TILES_X * TILE_SIZE;
    canvas.height = TILES_Y * TILE_SIZE;

    const playerStart = PLAYER_STARTS[currentLevelIndex];
    const redStart    = RED_GHOST_STARTS[currentLevelIndex];
    const pinkStart   = PINK_GHOST_STARTS[currentLevelIndex];

    initPellets(playerStart, [redStart, pinkStart].filter(Boolean));

    player = new Player(playerStart.x, playerStart.y);

    // Red ghost: pure BFS chase
    redGhost = new Ghost(redStart.x, redStart.y, {
        name: "Red",
        color: "red",
        straightSpeed: 0.17,
        turnSpeed: 0.12,
        behavior: "chase"
    });

    // Pink ghost: only level 2, BFS front-trap behavior
    if (pinkStart) {
        pinkGhost = new Ghost(pinkStart.x, pinkStart.y, {
            name: "Pink",
            color: "#ff66cc",
            straightSpeed: 0.17,
            turnSpeed: 0.12,
            behavior: "front"
        });
    } else {
        pinkGhost = null;
    }

    isPowerMode = false;
    powerModeTimer = 0;
    statusMessage = "";

    if (resetScoreAndLives) {
        score = 0;
        lives = 3;
    }
}


// ===== Input =====

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


// ===== Pellets & Power Mode =====

function activatePowerMode() {
    isPowerMode = true;
    powerModeTimer = POWER_MODE_DURATION;
    if (redGhost)  redGhost.setFrightened(true);
    if (pinkGhost) pinkGhost.setFrightened(true);
    statusMessage = "Ghosts are frightened!";
}

function updatePowerMode() {
    if (!isPowerMode) return;

    powerModeTimer--;
    if (powerModeTimer <= 0) {
        isPowerMode = false;
        if (redGhost)  redGhost.setFrightened(false);
        if (pinkGhost) pinkGhost.setFrightened(false);
        statusMessage = "";
    }
}

function handleLevelComplete() {
    currentLevelIndex++;
    if (currentLevelIndex >= LEVELS.length) {
        statusMessage = "All levels cleared! Restarting...";
        loadLevel(0, true);
    } else {
        statusMessage = "Level " + (currentLevelIndex + 1) + "!";
        loadLevel(currentLevelIndex, false);
    }
}

function collectPellet() {
    const x = player.tileX;
    const y = player.tileY;

    if (pellets[y] && pellets[y][x]) {
        pellets[y][x] = false;
        remainingPellets--;
        score += 10;
    }

    if (powerPellets[y] && powerPellets[y][x]) {
        powerPellets[y][x] = false;
        remainingPellets--;
        score += 50;
        activatePowerMode();
    }

    if (remainingPellets <= 0) {
        handleLevelComplete();
    }
}


// ===== Ghost target helpers =====

function handleGhostCollision(ghost) {
    if (!ghost || !ghost.isActive) return;

    if (player.tileX === ghost.tileX && player.tileY === ghost.tileY) {
        if (isPowerMode && ghost.isFrightened) {
            // Eat ghost
            score += 200;
            statusMessage = "Ate " + ghost.name + "! Score: " + score;
            ghost.resetToStart();
            ghost.setFrightened(false);
        } else {
            // Player loses a life
            lives--;
            statusMessage = "Caught by " + ghost.name + "! Lives: " + lives;

            player.resetToStart();
            redGhost.resetToStart();
            if (pinkGhost) pinkGhost.resetToStart();

            isPowerMode = false;
            if (redGhost)  redGhost.setFrightened(false);
            if (pinkGhost) pinkGhost.setFrightened(false);

            if (lives <= 0) {
                statusMessage = "Game Over! Score: " + score;
                loadLevel(0, true); // restart from level 1
            }
        }
    }
}


// ===== Rendering =====

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
                // Power pellets (big)
                if (powerPellets[y][x]) {
                    ctx.fillStyle = "#ffffff";
                    const cx = px + TILE_SIZE / 2;
                    const cy = py + TILE_SIZE / 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Normal pellets (small)
                else if (pellets[y][x]) {
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
    ctx.fillText("Level: " + (currentLevelIndex + 1), 10, 60);

    if (statusMessage) {
        ctx.fillText(statusMessage, 10, canvas.height - 20);
    }
}


// ===== Main Loop =====

function update() {
    player.update();
    collectPellet();

    updatePowerMode();

    // Red: BFS chase to player position
    redGhost.update(player);

    // Pink: BFS chase to a point ahead of the player
    if (pinkGhost) {
        pinkGhost.update(player);
    }

    handleGhostCollision(redGhost);
    if (pinkGhost) {
        handleGhostCollision(pinkGhost);
    }
}

function draw() {
    drawMaze();
    player.draw();
    redGhost.draw();
    if (pinkGhost) {
        pinkGhost.draw();
    }
    drawHUD();
}

function gameLoop(timestamp) {
    if (!lastTime) {
        lastTime = timestamp;
    }

    let delta = timestamp - lastTime;
    lastTime = timestamp;

    accumulatedTime += delta;

    // Run the simulation in fixed 60fps steps
    while (accumulatedTime >= FRAME_DURATION) {
        update();
        accumulatedTime -= FRAME_DURATION;
    }

    draw();

    requestAnimationFrame(gameLoop);
}


// ===== Start Game =====

loadLevel(0, true);
setupSwipeControlsForCanvas(canvas, (dir) => {
    switch (dir) {
        case "up":
            player.setDesiredDirection(0, -1);
            break;
        case "down":
            player.setDesiredDirection(0, 1);
            break;
        case "left":
            player.setDesiredDirection(-1, 0);
            break;
        case "right":
            player.setDesiredDirection(1, 0);
            break;
        case "tap":
            // optional
            break;
    }
});

requestAnimationFrame(gameLoop);


// =========================
//  Touch Controls
// =========================

function setupSwipeControlsForCanvas(canvas, onSwipe) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const SWIPE_THRESHOLD = 30; // pixels

    canvas.addEventListener("touchstart", (e) => {
        if (!e.touches || e.touches.length === 0) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchEndX = touchStartX;
        touchEndY = touchStartY;
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
        if (!e.touches || e.touches.length === 0) return;
        const touch = e.touches[0];
        touchEndX = touch.clientX;
        touchEndY = touch.clientY;
        // prevent page from scrolling while sliding
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Tap (very small movement)
        if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
            onSwipe("tap");
            return;
        }

        if (absDx > absDy) {
            // horizontal swipe
            if (dx > 0) {
                onSwipe("right");
            } else {
                onSwipe("left");
            }
        } else {
            // vertical swipe
            if (dy > 0) {
                onSwipe("down");
            } else {
                onSwipe("up");
            }
        }
    });
}