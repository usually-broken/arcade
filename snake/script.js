const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let W, H, CELL;
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  CELL = 35;
}
resize();
window.addEventListener('resize', () => { resize(); draw(); });

const COLORS = {
  bg: '#ffffff',
  grid: '#f1f5f9',
  snakeHead: '#2563eb',
  snakeBody: '#60a5fa',
  food: '#1e40af',
  text: '#1e293b',
  accent: '#2563eb',
  muted: '#94a3b8',
  overlay: 'rgba(255,255,255,0.85)',
};

let snake, food, direction, nextDirection, score, state, tickSpeed, lastTick, frameCount, paused, pauseTimer;

function getGrid() {
  return { cols: Math.floor(W / CELL), rows: Math.floor(H / CELL) };
}

function reset() {
  const { cols, rows } = getGrid();
  const startX = Math.floor(cols / 2);
  const startY = Math.floor(rows / 2);
  snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  state = 'start';
  tickSpeed = 140;
  lastTick = 0;
  frameCount = 0;
  paused = false;
  pauseTimer = 0;
  spawnFood();
}
reset();

function spawnFood() {
  const { cols, rows } = getGrid();
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function drawGrid() {
  const { cols, rows } = getGrid();
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, H);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(W, y * CELL);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? COLORS.snakeHead : COLORS.snakeBody;
    ctx.fillRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4);
  });
}

function drawFood() {
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2,
    food.y * CELL + CELL / 2,
    CELL / 2 - 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawScore() {
  ctx.fillStyle = COLORS.accent;
  ctx.font = 'bold 20px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, W / 2, 28);
}

function drawStartScreen() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid();

  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, H * 0.3, W, H * 0.4);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 36px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('SNAKE', W / 2, H * 0.38);
  ctx.font = '18px Courier New';
  ctx.fillText('Arrow keys to move', W / 2, H * 0.46);
  ctx.font = '16px Courier New';
  ctx.fillText('SPACE to start', W / 2, H * 0.52);
}

function drawGameOver() {
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, H * 0.25, W, H * 0.5);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 40px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, H * 0.38);
  ctx.font = '24px Courier New';
  ctx.fillText('Score: ' + score, W / 2, H * 0.46);
  ctx.font = '16px Courier New';
  ctx.fillStyle = COLORS.accent;
  ctx.fillText('SPACE to restart', W / 2, H * 0.54);
}

function draw() {
  if (state === 'start') {
    drawStartScreen();
    return;
  }

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid();
  drawFood();
  drawSnake();
  drawScore();

  if (state === 'dead') {
    drawGameOver();
  }

  if (paused) {
    ctx.fillStyle = 'rgba(240,244,248,0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 42px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H * 0.4);
    ctx.fillStyle = '#1e293b';
    ctx.font = '18px Courier New';
    ctx.fillText('Resuming in ' + (3 - Math.floor(pauseTimer / 60)) + 's...', W / 2, H * 0.5);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Courier New';
    ctx.fillText('Press Q to resume early', W / 2, H * 0.57);
  }
}

function gameTick() {
  direction = { ...nextDirection };
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  const { cols, rows } = getGrid();

  // Wall collision
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    state = 'dead';
    return;
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    state = 'dead';
    return;
  }

  snake.unshift(head);

  // Eat food
  if (head.x === food.x && head.y === food.y) {
    score++;
    spawnFood();
  } else {
    snake.pop();
  }
}

function update(timestamp) {
  if (paused) {
    if (pauseTimer > 0) { pauseTimer++; if (pauseTimer >= 180) { paused = false; pauseTimer = 0; } }
  }
  if (state === 'playing' && !paused && timestamp - lastTick >= tickSpeed) {
    gameTick();
    lastTick = timestamp;
  }
  frameCount++;
  draw();
  requestAnimationFrame(update);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === 'start' || state === 'dead') {
      reset();
      state = 'playing';
      lastTick = performance.now();
    }
    return;
  }

  if (e.code === 'KeyQ' && state === 'playing') {
  if (!paused) { paused = true; pauseTimer = 0; }
  else if (pauseTimer === 0) { pauseTimer = 1; }
  else { paused = false; pauseTimer = 0; }
}
  if (state !== 'playing') return;

  switch (e.code) {
    case 'ArrowUp':
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
      break;
    case 'ArrowDown':
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
      break;
    case 'ArrowLeft':
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
      break;
    case 'ArrowRight':
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
      break;
    case 'KeyW':
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
      break;
    case 'KeyS':
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
      break;
    case 'KeyA':
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
      break;
    case 'KeyD':
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
      break;
  }
});

requestAnimationFrame(update);