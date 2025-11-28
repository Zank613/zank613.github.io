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

// Bigger second level (19x19)
const LEVEL_2 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,1,1,0,1,1,1,1,0,1,1,1,1,0,1,1,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const LEVELS = [LEVEL_1, LEVEL_2];

// Per-level start positions
const PLAYER_STARTS = [
    { x: 1, y: 7 },   // Level 1
    { x: 9, y: 17 }   // Level 2
];

const RED_GHOST_STARTS = [
    { x: 13, y: 7 },  // Level 1
    { x: 9,  y: 9 }   // Level 2
];

// Yellow only appears on level 2
const YELLOW_GHOST_STARTS = [
    null,              // Level 1: no yellow
    { x: 9, y: 1 }     // Level 2
];

// 4 far-corner power pellets per level
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
// Red: chases current player position
// Yellow: tries to go ahead of the player
// All ghosts slow down when turning corners.
// In power mode, ghosts run away & turn blue.

class Ghost {
    constructor(tileX, tileY, options = {}) {
        this.spawnX = tileX;
        this.spawnY = tileY;

        this.name  = options.name  || "Ghost";
        this.color = options.color || "red";

        // Slightly faster than player (0.15) on straights,
        // slower on turns so corners give the player an edge.
        this.straightSpeed = options.straightSpeed ?? 0.16;
        this.turnSpeed     = options.turnSpeed     ?? 0.09;

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
    }

    chooseDirectionToward(targetX, targetY) {
        const dirs = [
            { dx: 0,  dy: -1 }, // up
            { dx: 0,  dy: 1 },  // down
            { dx: -1, dy: 0 },  // left
            { dx: 1,  dy: 0 }   // right
        ];

        const pickDirection = (allowReverse) => {
            let bestDir = null;
            let bestMetric = this.isFrightened ? -Infinity : Infinity;

            for (const d of dirs) {
                const nx = this.tileX + d.dx;
                const ny = this.tileY + d.dy;

                if (!isWalkable(nx, ny)) continue;

                const isReverse =
                    (this.dirX === -d.dx && this.dirY === -d.dy &&
                        (this.dirX !== 0 || this.dirY !== 0));

                if (!allowReverse && isReverse) {
                    continue;
                }

                const dist = Math.abs(nx - targetX) + Math.abs(ny - targetY);

                if (!this.isFrightened) {
                    if (dist < bestMetric) {
                        bestMetric = dist;
                        bestDir = d;
                    }
                } else {
                    if (dist > bestMetric) {
                        bestMetric = dist;
                        bestDir = d;
                    }
                }
            }

            return bestDir;
        };

        // 1) Try not reversing
        let chosen = pickDirection(false);
        // 2) If dead end, allow reversal
        if (!chosen) {
            chosen = pickDirection(true);
        }

        if (!chosen) {
            this.isMoving = false;
            return;
        }

        const turning = (chosen.dx !== this.dirX || chosen.dy !== this.dirY);

        this.dirX = chosen.dx;
        this.dirY = chosen.dy;

        this.startTileX = this.tileX;
        this.startTileY = this.tileY;
        this.targetTileX = this.tileX + this.dirX;
        this.targetTileY = this.tileY + this.dirY;
        this.progress = 0;
        this.isMoving = true;

        // Cornering penalty: slower on turns
        this.currentSpeed = turning ? this.turnSpeed : this.straightSpeed;
    }

    update(targetX, targetY) {
        if (!this.isActive) return;

        if (!this.isMoving) {
            this.chooseDirectionToward(targetX, targetY);
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

        ctx.fillStyle = this.isFrightened ? "#0000ff" : this.color;
        ctx.beginPath();
        ctx.arc(px, py, TILE_SIZE / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
    }
}



// ===== Entities =====

let player;
let redGhost;
let yellowGhost; // only used on level 2


function loadLevel(index, resetScoreAndLives = false) {
    currentLevelIndex = index;
    level = LEVELS[currentLevelIndex];

    TILES_Y = level.length;
    TILES_X = level[0].length;

    canvas.width  = TILES_X * TILE_SIZE;
    canvas.height = TILES_Y * TILE_SIZE;

    const playerStart = PLAYER_STARTS[currentLevelIndex];
    const redStart    = RED_GHOST_STARTS[currentLevelIndex];
    const yellowStart = YELLOW_GHOST_STARTS[currentLevelIndex];

    initPellets(playerStart, [redStart, yellowStart].filter(Boolean));

    player = new Player(playerStart.x, playerStart.y);

    // Red ghost: brutal chaser
    redGhost = new Ghost(redStart.x, redStart.y, {
        name: "Red",
        color: "red",
        straightSpeed: 0.16,
        turnSpeed: 0.09
    });

    // Pink ghost, bad naming
    // TODO: Fix naming
    if (yellowStart) {
        yellowGhost = new Ghost(yellowStart.x, yellowStart.y, {
            name: "Pink",
            color: "#ff66cc",
            straightSpeed: 0.16,
            turnSpeed: 0.09
        });
    } else {
        yellowGhost = null;
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
    if (redGhost)    redGhost.setFrightened(true);
    if (yellowGhost) yellowGhost.setFrightened(true);
    statusMessage = "Ghosts are frightened!";
}

function updatePowerMode() {
    if (!isPowerMode) return;

    powerModeTimer--;
    if (powerModeTimer <= 0) {
        isPowerMode = false;
        if (redGhost)    redGhost.setFrightened(false);
        if (yellowGhost) yellowGhost.setFrightened(false);
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

function getYellowTarget() {
    // How many tiles ahead of the player Yellow aims for
    const lookAhead = 4;

    if (player.dirX === 0 && player.dirY === 0) {
        return { x: player.tileX, y: player.tileY };
    }

    let tx = player.tileX;
    let ty = player.tileY;
    let dx = player.dirX;
    let dy = player.dirY;

    for (let i = 0; i < lookAhead; i++) {
        const nx = tx + dx;
        const ny = ty + dy;

        if (!isWalkable(nx, ny)) break;

        tx = nx;
        ty = ny;
    }

    return { x: tx, y: ty };
}


// ===== Ghost Collisions =====

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
            if (yellowGhost) yellowGhost.resetToStart();

            isPowerMode = false;
            if (redGhost)    redGhost.setFrightened(false);
            if (yellowGhost) yellowGhost.setFrightened(false);

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

    // Red: pure chase – always aims at current player tile
    redGhost.update(player.tileX, player.tileY);

    // Yellow: tries to intercept
    if (yellowGhost) {
        const target = getYellowTarget();
        yellowGhost.update(target.x, target.y);
    }

    handleGhostCollision(redGhost);
    if (yellowGhost) {
        handleGhostCollision(yellowGhost);
    }
}

function draw() {
    drawMaze();
    player.draw();
    redGhost.draw();
    if (yellowGhost) {
        yellowGhost.draw();
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

    // Run the simulation in fixed 60fps
    while (accumulatedTime >= FRAME_DURATION) {
        update();
        accumulatedTime -= FRAME_DURATION;
    }

    draw();

    requestAnimationFrame(gameLoop);
}
// ===== Start Game =====

loadLevel(0, true);
requestAnimationFrame(gameLoop);


function setupTouchControls() {
    const up    = document.getElementById("btnUp");
    const down  = document.getElementById("btnDown");
    const left  = document.getElementById("btnLeft");
    const right = document.getElementById("btnRight");

    if (!up || !down || !left || !right) return;

    const bind = (el, dx, dy) => {
        const handler = (e) => {
            e.preventDefault();
            if (typeof player !== "undefined") {
                player.setDesiredDirection(dx, dy);
            }
        };
        el.addEventListener("touchstart", handler, { passive: false });
        el.addEventListener("mousedown", handler);
    };

    bind(up,    0, -1);
    bind(down,  0,  1);
    bind(left, -1,  0);
    bind(right, 1,  0);
}

window.addEventListener("load", setupTouchControls);