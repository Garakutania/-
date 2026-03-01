(() => {
    "use strict";

    // --- Constants ---
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const NEXT_BLOCK_SIZE = 20;
    const HOLD_BLOCK_SIZE = 20;
    const NEXT_COUNT = 3;

    const COLORS = {
        I: "#00f0f0",
        O: "#f0f000",
        T: "#a000f0",
        S: "#00f000",
        Z: "#f00000",
        J: "#0000f0",
        L: "#f0a000",
    };

    const SHAPES = {
        I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        O: [[1, 1], [1, 1]],
        T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
        J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    };

    const PIECE_TYPES = Object.keys(SHAPES);

    // SRS wall kick data
    const WALL_KICKS = {
        normal: {
            "0>1": [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
            "1>0": [[1, 0], [1, 1], [0, -2], [1, -2]],
            "1>2": [[1, 0], [1, 1], [0, -2], [1, -2]],
            "2>1": [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
            "2>3": [[1, 0], [1, -1], [0, 2], [1, 2]],
            "3>2": [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
            "3>0": [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
            "0>3": [[1, 0], [1, -1], [0, 2], [1, 2]],
        },
        I: {
            "0>1": [[-2, 0], [1, 0], [-2, 1], [1, -2]],
            "1>0": [[2, 0], [-1, 0], [2, -1], [-1, 2]],
            "1>2": [[-1, 0], [2, 0], [-1, -2], [2, 1]],
            "2>1": [[1, 0], [-2, 0], [1, 2], [-2, -1]],
            "2>3": [[2, 0], [-1, 0], [2, -1], [-1, 2]],
            "3>2": [[-2, 0], [1, 0], [-2, 1], [1, -2]],
            "3>0": [[1, 0], [-2, 0], [1, 2], [-2, -1]],
            "0>3": [[-1, 0], [2, 0], [-1, -2], [2, 1]],
        },
    };

    // Scoring
    const LINE_SCORES = [0, 100, 300, 500, 800];

    // --- Canvas setup ---
    const gameCanvas = document.getElementById("gameCanvas");
    const gameCtx = gameCanvas.getContext("2d");
    const nextCanvas = document.getElementById("nextCanvas");
    const nextCtx = nextCanvas.getContext("2d");
    const holdCanvas = document.getElementById("holdCanvas");
    const holdCtx = holdCanvas.getContext("2d");

    const scoreEl = document.getElementById("score");
    const levelEl = document.getElementById("level");
    const linesEl = document.getElementById("lines");
    const startBtn = document.getElementById("startBtn");
    const pauseBtn = document.getElementById("pauseBtn");

    // --- Game state ---
    let board = [];
    let currentPiece = null;
    let nextPieces = [];
    let holdPiece = null;
    let canHold = true;
    let score = 0;
    let level = 1;
    let totalLines = 0;
    let gameOver = false;
    let paused = false;
    let animationId = null;
    let lastDrop = 0;
    let bag = [];
    let ghostY = 0;

    // --- Piece ---
    class Piece {
        constructor(type) {
            this.type = type;
            this.shape = SHAPES[type].map(row => [...row]);
            this.color = COLORS[type];
            this.rotation = 0;
            this.x = Math.floor((COLS - this.shape[0].length) / 2);
            this.y = 0;
        }
    }

    // --- Bag randomizer (7-bag) ---
    function refillBag() {
        const types = [...PIECE_TYPES];
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        bag.push(...types);
    }

    function getNextPiece() {
        while (bag.length < PIECE_TYPES.length) {
            refillBag();
        }
        return new Piece(bag.shift());
    }

    // --- Board ---
    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    function isValid(piece, offsetX = 0, offsetY = 0, shape = null) {
        const s = shape || piece.shape;
        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                const nx = piece.x + c + offsetX;
                const ny = piece.y + r + offsetY;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
                if (ny < 0) continue;
                if (board[ny][nx]) return false;
            }
        }
        return true;
    }

    function lockPiece() {
        const s = currentPiece.shape;
        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                const y = currentPiece.y + r;
                const x = currentPiece.x + c;
                if (y < 0) {
                    triggerGameOver();
                    return;
                }
                board[y][x] = currentPiece.color;
            }
        }
        clearLines();
        canHold = true;
        spawnPiece();
    }

    function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell !== null)) {
                board.splice(r, 1);
                board.unshift(Array(COLS).fill(null));
                cleared++;
                r++;
            }
        }
        if (cleared > 0) {
            totalLines += cleared;
            score += LINE_SCORES[cleared] * level;
            level = Math.floor(totalLines / 10) + 1;
            updateUI();
        }
    }

    // --- Rotation (SRS) ---
    function rotateMatrix(matrix, clockwise = true) {
        const size = matrix.length;
        const rotated = matrix.map((row, r) =>
            row.map((_, c) => clockwise ? matrix[size - 1 - c][r] : matrix[c][size - 1 - r])
        );
        return rotated;
    }

    function rotatePiece(clockwise = true) {
        if (currentPiece.type === "O") return;
        const oldRotation = currentPiece.rotation;
        const newRotation = clockwise
            ? (oldRotation + 1) % 4
            : (oldRotation + 3) % 4;
        const rotated = rotateMatrix(currentPiece.shape, clockwise);
        const kickKey = `${oldRotation}>${newRotation}`;
        const kicks = currentPiece.type === "I"
            ? WALL_KICKS.I[kickKey]
            : WALL_KICKS.normal[kickKey];

        // Try basic rotation first
        if (isValid(currentPiece, 0, 0, rotated)) {
            currentPiece.shape = rotated;
            currentPiece.rotation = newRotation;
            updateGhost();
            return;
        }
        // Try wall kicks
        if (kicks) {
            for (const [dx, dy] of kicks) {
                if (isValid(currentPiece, dx, -dy, rotated)) {
                    currentPiece.shape = rotated;
                    currentPiece.x += dx;
                    currentPiece.y -= dy;
                    currentPiece.rotation = newRotation;
                    updateGhost();
                    return;
                }
            }
        }
    }

    // --- Ghost piece ---
    function updateGhost() {
        ghostY = currentPiece.y;
        while (isValid(currentPiece, 0, ghostY - currentPiece.y + 1)) {
            ghostY++;
        }
    }

    // --- Spawning ---
    function spawnPiece() {
        currentPiece = nextPieces.shift();
        nextPieces.push(getNextPiece());
        if (!isValid(currentPiece)) {
            triggerGameOver();
            return;
        }
        updateGhost();
    }

    // --- Hold ---
    function holdCurrentPiece() {
        if (!canHold) return;
        canHold = false;
        const type = currentPiece.type;
        if (holdPiece) {
            const prevHold = holdPiece;
            holdPiece = type;
            currentPiece = new Piece(prevHold);
        } else {
            holdPiece = type;
            spawnPiece();
        }
        if (!isValid(currentPiece)) {
            triggerGameOver();
            return;
        }
        updateGhost();
    }

    // --- Hard drop ---
    function hardDrop() {
        while (isValid(currentPiece, 0, 1)) {
            currentPiece.y++;
            score += 2;
        }
        lockPiece();
        updateUI();
    }

    // --- Drawing ---
    function drawBlock(ctx, x, y, color, size, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size, size);
        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(x * size, y * size, size, 2);
        ctx.fillRect(x * size, y * size, 2, size);
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(x * size + size - 2, y * size, 2, size);
        ctx.fillRect(x * size, y * size + size - 2, size, 2);
        // Grid line
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(x * size, y * size, size, size);
        ctx.globalAlpha = 1;
    }

    function drawBoard() {
        gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        // Grid
        gameCtx.strokeStyle = "rgba(255,255,255,0.03)";
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                gameCtx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }

        // Locked blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    drawBlock(gameCtx, c, r, board[r][c], BLOCK_SIZE);
                }
            }
        }
    }

    function drawGhost() {
        if (!currentPiece) return;
        const s = currentPiece.shape;
        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                drawBlock(gameCtx, currentPiece.x + c, ghostY + r, currentPiece.color, BLOCK_SIZE, 0.2);
            }
        }
    }

    function drawCurrentPiece() {
        if (!currentPiece) return;
        const s = currentPiece.shape;
        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                const y = currentPiece.y + r;
                if (y < 0) continue;
                drawBlock(gameCtx, currentPiece.x + c, y, currentPiece.color, BLOCK_SIZE);
            }
        }
    }

    function drawPreview(ctx, canvas, pieces) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let offsetY = 0;
        for (const piece of pieces) {
            const s = SHAPES[piece.type];
            const pw = s[0].length * NEXT_BLOCK_SIZE;
            const ph = s.length * NEXT_BLOCK_SIZE;
            const ox = (canvas.width - pw) / 2;
            for (let r = 0; r < s.length; r++) {
                for (let c = 0; c < s[r].length; c++) {
                    if (!s[r][c]) continue;
                    ctx.fillStyle = COLORS[piece.type];
                    ctx.fillRect(ox + c * NEXT_BLOCK_SIZE, offsetY + r * NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                    ctx.strokeStyle = "rgba(0,0,0,0.3)";
                    ctx.strokeRect(ox + c * NEXT_BLOCK_SIZE, offsetY + r * NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                }
            }
            offsetY += ph + 15;
        }
    }

    function drawHold() {
        holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        if (!holdPiece) return;
        const s = SHAPES[holdPiece];
        const pw = s[0].length * HOLD_BLOCK_SIZE;
        const ph = s.length * HOLD_BLOCK_SIZE;
        const ox = (holdCanvas.width - pw) / 2;
        const oy = (holdCanvas.height - ph) / 2;
        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                const alpha = canHold ? 1 : 0.3;
                holdCtx.globalAlpha = alpha;
                holdCtx.fillStyle = COLORS[holdPiece];
                holdCtx.fillRect(ox + c * HOLD_BLOCK_SIZE, oy + r * HOLD_BLOCK_SIZE, HOLD_BLOCK_SIZE, HOLD_BLOCK_SIZE);
                holdCtx.strokeStyle = "rgba(0,0,0,0.3)";
                holdCtx.strokeRect(ox + c * HOLD_BLOCK_SIZE, oy + r * HOLD_BLOCK_SIZE, HOLD_BLOCK_SIZE, HOLD_BLOCK_SIZE);
                holdCtx.globalAlpha = 1;
            }
        }
    }

    function drawGameOver() {
        gameCtx.fillStyle = "rgba(0,0,0,0.7)";
        gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        gameCtx.fillStyle = "#ff4444";
        gameCtx.font = "bold 36px sans-serif";
        gameCtx.textAlign = "center";
        gameCtx.fillText("GAME OVER", gameCanvas.width / 2, gameCanvas.height / 2 - 10);
        gameCtx.fillStyle = "#fff";
        gameCtx.font = "18px sans-serif";
        gameCtx.fillText(`Score: ${score}`, gameCanvas.width / 2, gameCanvas.height / 2 + 25);
    }

    function drawPause() {
        gameCtx.fillStyle = "rgba(0,0,0,0.5)";
        gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        gameCtx.fillStyle = "#00d4ff";
        gameCtx.font = "bold 30px sans-serif";
        gameCtx.textAlign = "center";
        gameCtx.fillText("PAUSED", gameCanvas.width / 2, gameCanvas.height / 2);
    }

    // --- UI update ---
    function updateUI() {
        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = totalLines;
    }

    // --- Drop speed ---
    function getDropInterval() {
        return Math.max(50, 1000 - (level - 1) * 80);
    }

    // --- Game loop ---
    function gameLoop(timestamp) {
        if (gameOver || paused) return;

        if (timestamp - lastDrop > getDropInterval()) {
            if (isValid(currentPiece, 0, 1)) {
                currentPiece.y++;
            } else {
                lockPiece();
            }
            lastDrop = timestamp;
        }

        drawBoard();
        drawGhost();
        drawCurrentPiece();
        drawPreview(nextCtx, nextCanvas, nextPieces);
        drawHold();

        if (!gameOver) {
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    // --- Game over ---
    function triggerGameOver() {
        gameOver = true;
        cancelAnimationFrame(animationId);
        drawBoard();
        drawCurrentPiece();
        drawGameOver();
        startBtn.disabled = false;
        startBtn.textContent = "RESTART";
        pauseBtn.disabled = true;
    }

    // --- Start / Reset ---
    function startGame() {
        board = createBoard();
        bag = [];
        nextPieces = [];
        holdPiece = null;
        canHold = true;
        score = 0;
        level = 1;
        totalLines = 0;
        gameOver = false;
        paused = false;
        lastDrop = 0;

        for (let i = 0; i < NEXT_COUNT; i++) {
            nextPieces.push(getNextPiece());
        }
        spawnPiece();
        updateUI();

        startBtn.disabled = true;
        pauseBtn.disabled = false;
        pauseBtn.textContent = "PAUSE";

        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(gameLoop);
    }

    function togglePause() {
        if (gameOver) return;
        paused = !paused;
        pauseBtn.textContent = paused ? "RESUME" : "PAUSE";
        if (!paused) {
            lastDrop = performance.now();
            animationId = requestAnimationFrame(gameLoop);
        } else {
            drawPause();
        }
    }

    // --- Input ---
    document.addEventListener("keydown", (e) => {
        if (gameOver || !currentPiece) return;

        if (e.key === "Escape") {
            togglePause();
            return;
        }

        if (paused) return;

        switch (e.key) {
            case "ArrowLeft":
                if (isValid(currentPiece, -1, 0)) {
                    currentPiece.x--;
                    updateGhost();
                }
                e.preventDefault();
                break;
            case "ArrowRight":
                if (isValid(currentPiece, 1, 0)) {
                    currentPiece.x++;
                    updateGhost();
                }
                e.preventDefault();
                break;
            case "ArrowDown":
                if (isValid(currentPiece, 0, 1)) {
                    currentPiece.y++;
                    score += 1;
                    updateUI();
                }
                e.preventDefault();
                break;
            case "ArrowUp":
                rotatePiece(true);
                e.preventDefault();
                break;
            case "z":
            case "Z":
                rotatePiece(false);
                e.preventDefault();
                break;
            case " ":
                hardDrop();
                e.preventDefault();
                break;
            case "c":
            case "C":
                holdCurrentPiece();
                e.preventDefault();
                break;
        }
    });

    // --- Buttons ---
    startBtn.addEventListener("click", startGame);
    pauseBtn.addEventListener("click", togglePause);

    // --- Initial draw ---
    drawBoard();
})();
