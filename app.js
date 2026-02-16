import { addHighscore, claimRewardCode, getConfig, getHighscores } from "./storage.js";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const LEVEL_SPEEDS = [0, 950, 870, 790, 710, 620, 530, 450, 370, 290, 220];

const PIECES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  O: [
    [4, 4],
    [4, 4],
  ],
  S: [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  Z: [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
};

const PIECE_TYPES = Object.keys(PIECES);
const COLORS = {
  0: "#10263d",
  1: "#7cf3ff",
  2: "#4f8ffd",
  3: "#ffb24d",
  4: "#ffe17d",
  5: "#5fffc2",
  6: "#ef8cff",
  7: "#ff6f7b",
};

const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");
ctx.scale(1, 1);

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const nextPieceEl = document.getElementById("nextPiece");
const soundToggleBtn = document.getElementById("soundToggle");
const gyroToggleBtn = document.getElementById("gyroToggle");
const highscoreList = document.getElementById("highscoreList");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const overlayActions = document.getElementById("overlayActions");

let arena = createMatrix(COLS, ROWS);
let current = null;
let nextType = randomPieceType();
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = LEVEL_SPEEDS[1];
let lastTime = 0;
let stopped = false;
let scoreSaved = false;
let config = getConfig();

let soundEnabled = true;
let audioContext = null;
let gyroEnabled = false;
let gyroListenerAdded = false;
let lastGyroMoveAt = 0;
let touchState = null;

function createMatrix(w, h) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
}

function randomPieceType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function createPiece(type) {
  return {
    type,
    matrix: PIECES[type].map((row) => [...row]),
    pos: { x: 0, y: 0 },
  };
}

function spawnPiece() {
  const type = nextType;
  nextType = randomPieceType();
  current = createPiece(type);
  current.pos.y = 0;
  current.pos.x = Math.floor((COLS - current.matrix[0].length) / 2);

  if (collide(arena, current)) {
    endGame(false);
  }

  nextPieceEl.textContent = nextType;
}

function collide(board, piece) {
  const { matrix, pos } = piece;
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x] === 0) {
        continue;
      }
      const bx = x + pos.x;
      const by = y + pos.y;
      if (bx < 0 || bx >= COLS || by >= ROWS) {
        return true;
      }
      if (by >= 0 && board[by][bx] !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(board, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + piece.pos.y][x + piece.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, dir) {
  const rotated = matrix.map((_, x) => matrix.map((row) => row[x]));
  if (dir > 0) {
    rotated.forEach((row) => row.reverse());
  } else {
    rotated.reverse();
  }
  return rotated;
}

function playerMove(dir) {
  if (stopped) {
    return;
  }
  current.pos.x += dir;
  if (collide(arena, current)) {
    current.pos.x -= dir;
    return;
  }
  playTone(540, 0.02, "triangle", 0.015);
}

function playerRotate(dir) {
  if (stopped) {
    return;
  }
  const originalX = current.pos.x;
  const originalMatrix = current.matrix;
  let offset = 1;

  current.matrix = rotate(current.matrix, dir);

  while (collide(arena, current)) {
    current.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > current.matrix[0].length) {
      current.matrix = originalMatrix;
      current.pos.x = originalX;
      return;
    }
  }
  playTone(780, 0.03, "sine", 0.025);
}

function playerDrop() {
  if (stopped) {
    return;
  }

  current.pos.y += 1;
  if (collide(arena, current)) {
    current.pos.y -= 1;
    merge(arena, current);
    clearLines();
    spawnPiece();
    playTone(190, 0.03, "square", 0.03);
  }
  dropCounter = 0;
}

function playerHardDrop() {
  if (stopped) {
    return;
  }
  while (!collide(arena, current)) {
    current.pos.y += 1;
  }
  current.pos.y -= 1;
  merge(arena, current);
  clearLines();
  spawnPiece();
  dropCounter = 0;
  playTone(260, 0.08, "square", 0.03);
}

function clearLines() {
  let cleared = 0;
  for (let y = arena.length - 1; y >= 0; y -= 1) {
    if (arena[y].every((value) => value !== 0)) {
      const row = arena.splice(y, 1)[0];
      row.fill(0);
      arena.unshift(row);
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    playTone(930, 0.08, "sawtooth", 0.035);
    recalculateLevelAndSpeed();
    maybeTriggerWin();
    syncUi();
  }
}

function recalculateLevelAndSpeed() {
  const nextLevel = Math.min(10, Math.floor(lines / 10) + 1);
  level = nextLevel;

  let nextInterval = LEVEL_SPEEDS[level] ?? LEVEL_SPEEDS[10];
  if (level === 9) {
    nextInterval = Math.floor(nextInterval / config.level9Multiplier);
  }
  if (level === 10) {
    nextInterval = Math.floor(nextInterval / config.level10Multiplier);
  }
  dropInterval = Math.max(45, nextInterval);
}

function maybeTriggerWin() {
  if (level >= 10 && lines >= config.linesToWin) {
    endGame(true);
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }
      drawCell(x + offset.x, y + offset.y, COLORS[value]);
    });
  });
}

function drawCell(x, y, color) {
  const px = x * BLOCK;
  const py = y * BLOCK;

  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);

  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
}

function drawGrid() {
  ctx.fillStyle = "#09182a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(canvas.width, y * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  drawGrid();
  drawMatrix(arena, { x: 0, y: 0 });
  if (current) {
    drawMatrix(current.matrix, current.pos);
  }
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  if (!stopped) {
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      playerDrop();
    }
  }

  draw();
  requestAnimationFrame(update);
}

function syncUi() {
  scoreEl.textContent = String(score);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
}

function renderHighscores() {
  const highscores = getHighscores();
  highscoreList.innerHTML = "";

  if (!highscores.length) {
    const li = document.createElement("li");
    li.textContent = "Noch keine Einträge.";
    highscoreList.append(li);
    return;
  }

  highscores.forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(entry.name)}</span><strong>${entry.score}</strong><small>L${entry.level} · ${entry.lines} Lines</small>`;
    highscoreList.append(li);
  });
}

function saveCurrentScore() {
  if (scoreSaved) {
    return;
  }
  const name = window.prompt("Name für Highscore (max. 20 Zeichen)", "Player");
  if (!name) {
    return;
  }
  addHighscore({ name, score, lines, level });
  scoreSaved = true;
  renderHighscores();
}

function showOverlay(title, message, actions) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayActions.innerHTML = "";

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn ${action.className ?? ""}`.trim();
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    overlayActions.append(button);
  });

  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function resetGame() {
  config = getConfig();
  arena = createMatrix(COLS, ROWS);
  current = null;
  nextType = randomPieceType();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  dropInterval = LEVEL_SPEEDS[1];
  stopped = false;
  scoreSaved = false;
  hideOverlay();
  spawnPiece();
  syncUi();
  draw();
}

function endGame(won) {
  if (stopped) {
    return;
  }

  stopped = true;
  playTone(won ? 1040 : 110, won ? 0.2 : 0.2, won ? "triangle" : "square", 0.05);

  const commonActions = [
    {
      label: "Highscore speichern",
      onClick: () => saveCurrentScore(),
    },
    {
      label: "Neu starten",
      className: "primary",
      onClick: () => resetGame(),
    },
  ];

  if (won) {
    showOverlay(
      "Level 10 geschafft!",
      "Du hast die Challenge abgeschlossen. Wenn noch Codes frei sind, kannst du jetzt einen 5€-Code claimen.",
      [
        {
          label: "Gutschein claimen",
          className: "success",
          onClick: () => {
            const winnerName = window.prompt("Name für Gutschein-Claim", "");
            if (!winnerName) {
              return;
            }
            const result = claimRewardCode(winnerName);
            if (result.ok) {
              const duplicateLabel = result.alreadyClaimed ? "Bereits zugewiesen" : "Neu zugewiesen";
              window.alert(`${duplicateLabel}: ${result.code}`);
            } else {
              window.alert(result.reason);
            }
          },
        },
        ...commonActions,
      ]
    );
    return;
  }

  showOverlay("Game Over", "Keine Pause-Funktion: Neustart und nochmal!", commonActions);
}

function handleKeydown(event) {
  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      playerMove(-1);
      break;
    case "ArrowRight":
    case "d":
    case "D":
      playerMove(1);
      break;
    case "ArrowUp":
    case "w":
    case "W":
      playerRotate(1);
      break;
    case "ArrowDown":
    case "s":
    case "S":
      playerDrop();
      break;
    case " ":
      playerHardDrop();
      break;
    default:
      break;
  }
}

function setupTouchGestures() {
  canvas.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) {
        touchState = null;
        return;
      }
      const touch = event.changedTouches[0];
      touchState = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastHorizontalX: touch.clientX,
        lastSoftDropY: touch.clientY,
        startTime: Date.now(),
        hasSoftDropped: false,
        hasMovedHorizontal: false,
      };
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {
      if (!touchState || stopped || event.touches.length !== 1) {
        return;
      }

      event.preventDefault();
      const touch = event.changedTouches[0];
      const dxTotal = touch.clientX - touchState.startX;
      const dyTotal = touch.clientY - touchState.startY;
      const absX = Math.abs(dxTotal);
      const absY = Math.abs(dyTotal);

      const horizontalStep = Math.max(16, Math.floor(canvas.clientWidth * 0.11));
      const softDropStart = Math.max(10, Math.floor(canvas.clientHeight * 0.02));
      const softDropStep = Math.max(14, Math.floor(canvas.clientHeight * 0.035));

      const horizontalDelta = touch.clientX - touchState.lastHorizontalX;
      if (Math.abs(horizontalDelta) >= horizontalStep && absX > absY * 0.9) {
        const direction = horizontalDelta > 0 ? 1 : -1;
        const steps = Math.min(4, Math.floor(Math.abs(horizontalDelta) / horizontalStep));
        for (let i = 0; i < steps; i += 1) {
          playerMove(direction);
        }
        touchState.lastHorizontalX += direction * steps * horizontalStep;
        touchState.hasMovedHorizontal = true;
      }

      const softDropDelta = touch.clientY - touchState.lastSoftDropY;
      if (dyTotal > softDropStart && softDropDelta >= softDropStep && absY >= absX * 0.9) {
        const drops = Math.min(6, Math.floor(softDropDelta / softDropStep));
        for (let i = 0; i < drops; i += 1) {
          playerDrop();
        }
        touchState.lastSoftDropY += drops * softDropStep;
        touchState.hasSoftDropped = true;
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchend",
    (event) => {
      if (!touchState || stopped) {
        touchState = null;
        return;
      }

      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchState.startX;
      const dy = touch.clientY - touchState.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const elapsed = Math.max(1, Date.now() - touchState.startTime);

      const horizontalStep = Math.max(16, Math.floor(canvas.clientWidth * 0.11));
      const verticalStep = Math.max(16, Math.floor(canvas.clientHeight * 0.04));
      const rotateThreshold = Math.max(22, Math.floor(canvas.clientHeight * 0.05));
      const hardDropDistance = Math.max(95, Math.floor(canvas.clientHeight * 0.22));
      const hardDropVelocity = 1.0;

      if (absX > absY && absX > horizontalStep && !touchState.hasMovedHorizontal) {
        const direction = dx > 0 ? 1 : -1;
        const steps = Math.min(4, Math.max(1, Math.round(absX / horizontalStep)));
        for (let i = 0; i < steps; i += 1) {
          playerMove(direction);
        }
      } else if (absY >= absX && absY > verticalStep) {
        if (dy < -rotateThreshold) {
          playerRotate(1);
        } else if (dy > verticalStep) {
          const velocity = dy / elapsed;
          const shouldHardDrop = dy >= hardDropDistance && velocity >= hardDropVelocity && !touchState.hasSoftDropped;
          if (shouldHardDrop) {
            playerHardDrop();
          } else if (!touchState.hasSoftDropped) {
            const drops = Math.min(6, Math.max(1, Math.round(dy / verticalStep)));
            for (let i = 0; i < drops; i += 1) {
              playerDrop();
            }
          }
        }
      }

      touchState = null;
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchcancel",
    () => {
      touchState = null;
    },
    { passive: true }
  );
}

function setupGyro() {
  if (gyroListenerAdded) {
    return;
  }

  window.addEventListener("deviceorientation", (event) => {
    if (!gyroEnabled || stopped) {
      return;
    }

    const now = Date.now();
    if (now - lastGyroMoveAt < 220) {
      return;
    }

    const gamma = Number(event.gamma);
    if (!Number.isFinite(gamma)) {
      return;
    }

    if (gamma > 17) {
      playerMove(1);
      lastGyroMoveAt = now;
    } else if (gamma < -17) {
      playerMove(-1);
      lastGyroMoveAt = now;
    }
  });

  gyroListenerAdded = true;
}

async function toggleGyro() {
  try {
    if (!gyroEnabled) {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          gyroToggleBtn.textContent = "Gyro blockiert";
          return;
        }
      }
      setupGyro();
      gyroEnabled = true;
      gyroToggleBtn.textContent = "Gyro: AN";
      playTone(660, 0.05, "triangle", 0.03);
      return;
    }

    gyroEnabled = false;
    gyroToggleBtn.textContent = "Gyro: AUS";
  } catch {
    gyroToggleBtn.textContent = "Gyro nicht verfügbar";
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? "Sound: AN" : "Sound: AUS";
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => undefined);
  }
}

function playTone(freq, duration, waveType, volume) {
  if (!soundEnabled) {
    return;
  }
  ensureAudio();
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = waveType;
  oscillator.frequency.value = freq;

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function boot() {
  soundToggleBtn.addEventListener("click", toggleSound);
  gyroToggleBtn.addEventListener("click", toggleGyro);

  document.addEventListener("keydown", handleKeydown);
  setupTouchGestures();

  renderHighscores();
  resetGame();
  requestAnimationFrame(update);
}

boot();
