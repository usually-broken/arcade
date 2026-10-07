const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const GAME_W = 900;
const GAME_H = 700;
canvas.width = GAME_W;
canvas.height = GAME_H;

const COLS = 10;
const ROWS = 20;
const CELL = 30;
const BOARD_X = 200;
const BOARD_Y = 50;
const SIDE_X = 560;

const PAUSE_DURATION = 180; // 3 seconds at 60fps

const COLORS = {
  I: '#00e5e5',
  O: '#ffe600',
  T: '#b300e6',
  S: '#00e540',
  Z: '#e50033',
  J: '#0033e6',
  L: '#ff8800',
  BG: '#f0f4f8',
  GRID: '#dbeafe',
  BOARD_BG: '#ffffff',
  GHOST_ALPHA: 0.25,
};

const PIECES = [
  { name: 'I', color: COLORS.I, matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
  { name: 'O', color: COLORS.O, matrix: [[1,1],[1,1]] },
  { name: 'T', color: COLORS.T, matrix: [[0,1,0],[1,1,1],[0,0,0]] },
  { name: 'S', color: COLORS.S, matrix: [[0,1,1],[1,1,0],[0,0,0]] },
  { name: 'Z', color: COLORS.Z, matrix: [[1,1,0],[0,1,1],[0,0,0]] },
  { name: 'J', color: COLORS.J, matrix: [[1,0,0],[1,1,1],[0,0,0]] },
  { name: 'L', color: COLORS.L, matrix: [[0,0,1],[1,1,1],[0,0,0]] },
];

let board, current, nextType, score, lines, level, gameState, lastTime, dropTimer, bag, paused, pauseTimer;
let clearAnimRows, clearAnimTimer, moveTimer;
const MOVE_INTERVAL = 7;
const CLEAR_ANIM_FRAMES = 18;

function init() {
  board = [];
  for (let r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(0));
  bag = [];
  score = 0;
  lines = 0;
  level = 1;
  clearAnimRows = [];
  clearAnimTimer = 0;
  moveTimer = 0;
  paused = false;
  pauseTimer = 0;
  lastTime = 0;
  dropTimer = 0;
  current = null;
  nextType = nextFromBag();
  keys.left = false;
  keys.right = false;
  keys.down = false;
  keys.prevLeft = false;
  keys.prevRight = false;
  current = spawnPiece(nextType);
  nextType = nextFromBag();
  gameState = 'start';
}

function nextFromBag() {
  if (bag.length === 0) {
    bag = [0, 1, 2, 3, 4, 5, 6];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}

function rotateMatrix(m) {
  const N = m.length;
  const r = [];
  for (let row = 0; row < N; row++) {
    r.push([]);
    for (let col = 0; col < N; col++) {
      r[row].push(m[N - 1 - col][row]);
    }
  }
  return r;
}

function getMatrix(piece, rot) {
  let m = piece.type !== undefined ? PIECES[piece.type].matrix : PIECES[piece].matrix;
  for (let i = 0; i < rot; i++) m = rotateMatrix(m);
  return m;
}

function spawnPiece(type) {
  const p = { type, rotation: 0, x: Math.floor((COLS - PIECES[type].matrix.length) / 2), y: -1 };
  if (collides(getMatrix(p), p.x, p.y)) {
    gameState = 'over';
    return null;
  }
  return p;
}

function collides(matrix, px, py) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        const bx = px + c;
        const by = py + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && board[by][bx]) return true;
      }
    }
  }
  return false;
}

function movePiece(dx, dy) {
  if (!current || gameState !== 'playing') return false;
  if (!collides(getMatrix(current), current.x + dx, current.y + dy)) {
    current.x += dx;
    current.y += dy;
    return true;
  }
  return false;
}

function rotatePiece() {
  if (!current || gameState !== 'playing') return;
  const newRot = (current.rotation + 1) % 4;
  const m = getMatrix({ type: current.type, rotation: newRot });
  const kicks = [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1]];
  for (const [kx, ky] of kicks) {
    if (!collides(m, current.x + kx, current.y + ky)) {
      current.rotation = newRot;
      current.x += kx;
      current.y += ky;
      return;
    }
  }
}

function hardDrop() {
  if (!current || gameState !== 'playing') return;
  let d = 0;
  while (movePiece(0, 1)) d++;
  score += d * 2;
  lockPiece();
}

function getGhostY() {
  if (!current) return 0;
  let gy = current.y;
  while (!collides(getMatrix(current), current.x, gy + 1)) gy++;
  return gy;
}

function lockPiece() {
  if (!current) return;
  const m = getMatrix(current);
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (m[r][c]) {
        const bx = current.x + c;
        const by = current.y + r;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          board[by][bx] = PIECES[current.type].color;
        }
      }
    }
  }
  checkLineClear();
  current = spawnPiece(nextType);
  nextType = nextFromBag();
}

function checkLineClear() {
  const fullRows = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(c => c !== 0)) fullRows.push(r);
  }
  if (fullRows.length > 0) {
    clearAnimRows = fullRows;
    clearAnimTimer = CLEAR_ANIM_FRAMES;
  }
}

function finishClear() {
  const cleared = clearAnimRows.length;
  for (const r of clearAnimRows) {
    board.splice(r, 1);
    board.unshift(new Array(COLS).fill(0));
  }
  lines += cleared;
  score += [0, 100, 300, 500, 800][cleared] * level;
  level = Math.floor(lines / 10) + 1;
  clearAnimRows = [];
}

document.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (gameState === 'start') {
    if (e.code === 'Space') gameState = 'playing';
    return;
  }
  if (gameState === 'over') {
    if (e.code === 'Space') { init(); gameState = 'playing'; }
    return;
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; keys.down = false; }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') rotatePiece();
  if (e.code === 'Space') hardDrop();
  if (e.code === 'KeyQ' && gameState === 'playing') {
    if (!paused) { paused = true; pauseTimer = 0; }
    else if (pauseTimer === 0) { pauseTimer = 1; }
    else { paused = false; pauseTimer = 0; }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
});

function update(delta) {
  if (clearAnimTimer > 0) {
    clearAnimTimer--;
    if (clearAnimTimer <= 0) finishClear();
    return;
  }
  if (paused) {
    if (pauseTimer > 0) { pauseTimer++; if (pauseTimer >= PAUSE_DURATION) { paused = false; pauseTimer = 0; } }
    return;
  }
  if (gameState !== 'playing' || !current) return;

  if (keys.left && !keys.prevLeft) movePiece(-1, 0);
  if (keys.right && !keys.prevRight) movePiece(1, 0);
  keys.prevLeft = keys.left;
  keys.prevRight = keys.right;

  if (keys.left || keys.right) {
    moveTimer++;
    if (moveTimer >= MOVE_INTERVAL) {
      moveTimer = 0;
      if (keys.left) movePiece(-1, 0);
      if (keys.right) movePiece(1, 0);
    }
  } else {
    moveTimer = 0;
  }

  dropTimer += delta * (keys.down ? 10 : 1);
  const dropInterval = Math.max(100, 1000 - (level - 1) * 80);
  if (dropTimer >= dropInterval) {
    dropTimer = 0;
    if (!movePiece(0, 1)) {
      lockPiece();
    } else if (keys.down) {
      score += 1;
    }
  }
}

function drawCell(x, y, color, ghost) {
  const px = BOARD_X + y * CELL;
  const py = BOARD_Y + x * CELL;
  if (ghost) {
    ctx.fillStyle = COLORS.GHOST_ALPHA;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  }
}

function draw() {
  ctx.fillStyle = COLORS.BG;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.fillStyle = COLORS.BOARD_BG;
  ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = COLORS.GRID;
      ctx.fillRect(BOARD_X + c * CELL, BOARD_Y + r * CELL, CELL, 1);
      ctx.fillRect(BOARD_X + c * CELL, BOARD_Y + r * CELL, 1, CELL);
    }
  }
  for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        const isClearing = clearAnimRows.includes(r);
        if (isClearing) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(BOARD_X + c * CELL + 1, BOARD_Y + r * CELL + 1, CELL - 2, CELL - 2);
        } else {
          ctx.fillStyle = board[r][c];
          ctx.fillRect(BOARD_X + c * CELL + 1, BOARD_Y + r * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }
  }

  if (current && gameState === 'playing') {
    const gy = getGhostY();
    const m = getMatrix(current);
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c] && gy + r >= 0) drawCell(gy + r, current.x + c, PIECES[current.type].color, true);
      }
    }
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c] && current.y + r >= 0) drawCell(current.y + r, current.x + c, PIECES[current.type].color, false);
      }
    }
  }

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('NEXT', SIDE_X, 40);

  if (nextType !== undefined) {
    const m = PIECES[nextType].matrix;
    const s = 16;
    const ox = SIDE_X;
    const oy = 50;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c]) {
          ctx.fillStyle = PIECES[nextType].color;
          ctx.fillRect(ox + c * s, oy + r * s, s - 2, s - 2);
        }
      }
    }
  }

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px Courier New';
  let yPos = 180;
  ctx.fillText('SCORE', SIDE_X, yPos);
  ctx.font = 'bold 18px Courier New';
  ctx.fillText(score, SIDE_X, yPos + 22);
  yPos += 55;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px Courier New';
  ctx.fillText('LEVEL', SIDE_X, yPos);
  ctx.font = 'bold 18px Courier New';
  ctx.fillText(level, SIDE_X, yPos + 22);
  yPos += 55;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px Courier New';
  ctx.fillText('LINES', SIDE_X, yPos);
  ctx.font = 'bold 18px Courier New';
  ctx.fillText(lines, SIDE_X, yPos + 22);

  if (paused) {
    ctx.fillStyle = 'rgba(240,244,248,0.9)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 42px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', GAME_W / 2, GAME_H * 0.38);
    ctx.fillStyle = '#1e293b';
    ctx.font = '18px Courier New';
    ctx.fillText('Resuming in ' + (3 - Math.floor(pauseTimer / 60)) + 's...', GAME_W / 2, GAME_H * 0.5);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Courier New';
    ctx.fillText('Press Q to resume early', GAME_W / 2, GAME_H * 0.57);
  }

  if (gameState === 'start') {
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 36px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('TETRIS', GAME_W / 2, GAME_H * 0.35);
    ctx.fillStyle = '#1e293b';
    ctx.font = '16px Courier New';
    ctx.fillText('SPACE to start', GAME_W / 2, GAME_H * 0.45);
    ctx.font = '13px Courier New';
    ctx.fillText('← → A D to move    ↑ W to rotate    ↓ S soft drop    SPACE hard drop', GAME_W / 2, GAME_H * 0.55);
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Courier New';
    ctx.fillText('Clear lines. Build levels. Speed increases. Survive.', GAME_W / 2, GAME_H * 0.65);
  }

  if (gameState === 'over') {
    ctx.fillStyle = 'rgba(240,244,248,0.92)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 36px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_W / 2, GAME_H * 0.35);
    ctx.fillStyle = '#1e293b';
    ctx.font = '18px Courier New';
    ctx.fillText('Score: ' + score, GAME_W / 2, GAME_H * 0.45);
    ctx.font = '14px Courier New';
    ctx.fillText('SPACE to restart', GAME_W / 2, GAME_H * 0.55);
  }
}

const keys = { left: false, right: false, down: false, prevLeft: false, prevRight: false };

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

init();
requestAnimationFrame(loop);
