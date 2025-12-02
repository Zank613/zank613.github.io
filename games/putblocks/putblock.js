const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24;

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// HUD elements
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");

// Colors: index 0 = empty
const COLORS = [
    null,
    "#00f0f0", // I
    "#0000f0", // J
    "#f0a000", // L
    "#f0f000", // O
    "#00f000", // S
    "#a000f0", // T
    "#f00000"  // Z
];

const SHAPES = {
    "I": [
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        [
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 0]
        ]
    ],
    "J": [
        [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        [
            [0, 1, 1],
            [0, 1, 0],
            [0, 1, 0]
        ],
        [
            [0, 0, 0],
            [1, 1, 1],
            [0, 0, 1]
        ],
        [
            [0, 1, 0],
            [0, 1, 0],
            [1, 1, 0]
        ]
    ],
    "L": [
        [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 1]
        ],
        [
            [0, 0, 0],
            [1, 1, 1],
            [1, 0, 0]
        ],
        [
            [1, 1, 0],
            [0, 1, 0],
            [0, 1, 0]
        ]
    ],
    "O": [
        [
            [1, 1],
            [1, 1]
        ]
    ],
    "S": [
        [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        [
            [0, 1, 0],
            [0, 1, 1],
            [0, 0, 1]
        ]
    ],
    "T": [
        [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        [
            [0, 1, 0],
            [0, 1, 1],
            [0, 1, 0]
        ],
        [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0]
        ],
        [
            [0, 1, 0],
            [1, 1, 0],
            [0, 1, 0]
        ]
    ],
    "Z": [
        [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        [
            [0, 0, 1],
            [0, 1, 1],
            [0, 1, 0]
        ]
    ]
};

const TYPES = Object.keys(SHAPES);

// =========================
//  Board
// =========================

function createBoard() {
    const board = [];
    for (let y = 0; y < ROWS; y++) {
        board[y] = new Array(COLS).fill(0);
    }
    return board;
}

let board = createBoard();

// =========================
//  Piece
// =========================

class Piece {
    constructor(type) {
        this.type = type;
        this.shapes = SHAPES[type];
        this.rotation = 0;
        this.matrix = this.shapes[this.rotation];

        // Spawn near top center
        this.x = Math.floor(COLS / 2) - Math.ceil(this.matrix[0].length / 2);
        this.y = 0;
    }

    rotate(dir) {
        const oldRotation = this.rotation;
        this.rotation = (this.rotation + dir + this.shapes.length) % this.shapes.length;
        this.matrix = this.shapes[this.rotation];

        if (collides(board, this)) {
            // tiny wall-kick attempts
            const offsets = [-1, 1, -2, 2];
            let kicked = false;
            for (let off of offsets) {
                this.x += off;
                if (!collides(board, this)) {
                    kicked = true;
                    break;
                }
                this.x -= off;
            }
            if (!kicked) {
                // revert
                this.rotation = oldRotation;
                this.matrix = this.shapes[this.rotation];
            }
        }
    }
}

let currentPiece = null;
let nextPiece = null;

// Hold piece state
let heldType = null;
let canHold = true;

// =========================
//  Collision & merging
// =========================

function collides(board, piece) {
    const m = piece.matrix;
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x]) {
                const bx = piece.x + x;
                const by = piece.y + y;
                if (bx < 0 || bx >= COLS || by >= ROWS) {
                    return true;
                }
                if (by >= 0 && board[by][bx] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function merge(board, piece) {
    const m = piece.matrix;
    const colorIndex = TYPES.indexOf(piece.type) + 1; // 1..7
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x]) {
                const bx = piece.x + x;
                const by = piece.y + y;
                if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                    board[by][bx] = colorIndex;
                }
            }
        }
    }
}

// =========================
//  Game state: scoring etc.
// =========================

let score = 0;
let linesCleared = 0;
let level = 1;

function updateHUD() {
    scoreEl.textContent = score;
    linesEl.textContent = linesCleared;
    levelEl.textContent = level + " (" + (dropInterval / 1000).toFixed(2) + "s)";
}

function lineClear() {
    let lines = 0;

    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        // full row
        const row = board.splice(y, 1)[0];
        row.fill(0);
        board.unshift(row);
        y++; // recheck same y after shifting
        lines++;
    }

    if (lines > 0) {
        linesCleared += lines;

        // Classic-ish scoring: 1/2/3/4 lines
        const lineScores = [0, 40, 100, 300, 1200];
        score += lineScores[lines] * level;

        level = 1 + Math.floor(linesCleared / 5);
        updateHUD();
    }
}

// =========================
//  Piece spawning, hold, game over
// =========================

function randomPieceType() {
    const idx = Math.floor(Math.random() * TYPES.length);
    return TYPES[idx];
}

function spawnPiece() {
    if (!nextPiece) {
        nextPiece = new Piece(randomPieceType());
    }
    currentPiece = nextPiece;
    nextPiece = new Piece(randomPieceType());
    canHold = true; // after locking a piece and spawning new one, you can hold again

    // If new piece immediately collides, game over
    if (collides(board, currentPiece)) {
        statusEl.textContent = "Game Over – press R to reset";
        gameOver = true;
    }
}

function holdPiece() {
    if (!canHold || !currentPiece || gameOver) return;

    const currentType = currentPiece.type;

    if (heldType === null) {
        // first time holding: stash current, spawn new
        heldType = currentType;
        currentPiece = null;
        spawnPiece();
    } else {
        // swap current with held
        const swapType = heldType;
        heldType = currentType;
        currentPiece = new Piece(swapType);
    }

    canHold = false; // only once per piece drop
}

function resetGame() {
    board = createBoard();
    score = 0;
    linesCleared = 0;
    level = 1;
    updateHUD();
    statusEl.textContent = "";

    currentPiece = null;
    nextPiece = null;
    heldType = null;
    canHold = true;

    dropInterval = baseDropInterval;
    dropCounter = 0;
    lastTime = 0;
    gameOver = false;

    spawnPiece();
}

// =========================
//  Input
// =========================

let gameOver = false;

document.addEventListener("keydown", (e) => {
    // Prevent page scroll for game keys
    const blockedKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar"];
    if (blockedKeys.includes(e.key)) {
        e.preventDefault();
    }

    if (gameOver && (e.key === "r" || e.key === "R")) {
        resetGame();
        return;
    }

    if (gameOver) return;

    switch (e.key) {
        case "ArrowLeft":
            movePiece(-1);
            break;
        case "ArrowRight":
            movePiece(1);
            break;
        case "ArrowDown":
            softDrop();
            break;
        case "ArrowUp":
            rotatePiece(1);
            break;
        case " ":
        case "Spacebar":
            hardDrop();
            break;
        case "Shift":
        case "ShiftLeft":
        case "ShiftRight":
        case "c":
        case "C":
            holdPiece();
            break;
    }
});

function movePiece(dir) {
    currentPiece.x += dir;
    if (collides(board, currentPiece)) {
        currentPiece.x -= dir;
    }
}

function rotatePiece(dir) {
    currentPiece.rotate(dir);
}

function softDrop() {
    currentPiece.y++;
    if (collides(board, currentPiece)) {
        currentPiece.y--;
        lockPiece();
    } else {
        score += 1;
        updateHUD();
    }
}

function hardDrop() {
    let dropDistance = 0;
    while (true) {
        currentPiece.y++;
        if (collides(board, currentPiece)) {
            currentPiece.y--;
            break;
        }
        dropDistance++;
    }
    // bonus for hard drop
    score += dropDistance * 2;
    updateHUD();
    lockPiece();
}

function lockPiece() {
    merge(board, currentPiece);
    lineClear();
    spawnPiece();
}

// =========================
//  Gravity & timing
// =========================

const baseDropInterval = 1000; // ms at level 1
let dropInterval = baseDropInterval;
let dropCounter = 0;
let lastTime = 0;

function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;

    if (!gameOver) {
        dropCounter += delta;

        // Stronger speed scaling
        dropInterval = baseDropInterval * Math.pow(0.8, level - 1);

        if (dropCounter > dropInterval) {
            currentPiece.y++;
            if (collides(board, currentPiece)) {
                currentPiece.y--;
                lockPiece();
            }
            dropCounter = 0;
        }
    }

    draw();
    requestAnimationFrame(update);
}

// =========================
//  Drawing
// =========================

function drawBlock(x, y, colorIndex) {
    if (!colorIndex) return;
    ctx.fillStyle = COLORS[colorIndex];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const colorIndex = board[y][x];
            if (colorIndex) {
                drawBlock(x, y, colorIndex);
            }
        }
    }
}

function drawPiece(piece) {
    const m = piece.matrix;
    const colorIndex = TYPES.indexOf(piece.type) + 1;

    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x]) {
                const drawX = piece.x + x;
                const drawY = piece.y + y;
                if (drawY >= 0) {
                    drawBlock(drawX, drawY, colorIndex);
                }
            }
        }
    }
}

function drawHold() {
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.fillText("Hold: " + (heldType || "-"), 5, 16);
}

function draw() {
    drawBoard();
    if (currentPiece) {
        drawPiece(currentPiece);
    }
    drawHold();
}

// =========================
//  Start
// =========================

updateHUD();
resetGame();
update();

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

setupSwipeControlsForCanvas(canvas, (dir) => {
    if (gameOver) return;

    switch (dir) {
        case "left":
            movePiece(-1);
            break;
        case "right":
            movePiece(1);
            break;
        case "down":
            softDrop();
            break;
        case "up":
        case "tap":
            // rotate on swipe up or tap
            rotatePiece(1);
            break;
    }
});