const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let W, H, PADDLE_W, BALL_R, BRICK_ROWS, BRICK_COLS, BRICK_W, BRICK_H;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  PADDLE_W = Math.max(80, Math.floor(W * 0.1));
  BALL_R = 8;
  BRICK_ROWS = 5;
  BRICK_COLS = Math.floor(W / 75);
  BRICK_W = (W - 30) / BRICK_COLS;
  BRICK_H = 22;
}
resize();
window.addEventListener('resize', () => { resize(); reset(); });

const COLORS = {
  bg: '#ffffff',
  grid: '#f1f5f9',
  paddle: '#2563eb',
  paddleLight: '#60a5fa',
  ball: '#1e293b',
  brick: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  text: '#1e293b',
  accent: '#2563eb',
  muted: '#94a3b8',
  overlay: 'rgba(255,255,255,0.88)',
  life: '#e23b3b',
};

let paddle, ball, bricks, score, lives, state, mouseX, keys, paused, pauseTimer;

function reset() {
  paddle = { x: W / 2 - PADDLE_W / 2, y: H - 50, w: PADDLE_W, h: 12 };
  ball = { x: W / 2, y: paddle.y - BALL_R - 1, vx: 8, vy: -9, r: BALL_R, active: false };
  bricks = [];
  for (let i = 0; i < 18; i++) {
    bricks.push({
      x: Math.floor(Math.random() * (W - BRICK_W)),
      y: 20 + Math.floor(Math.random() * H * 0.3),
      w: BRICK_W - 4,
      h: BRICK_H,
      color: COLORS.brick[i % COLORS.brick.length],
      alive: true,
    });
  }
  score = 0;
  lives = 3;
  state = 'start';
  mouseX = W / 2;
  keys = {};
  paused = false;
  pauseTimer = 0;
}
reset();

function drawGrid() {
  const gap = 30;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawBricks() {
  bricks.forEach(b => {
    if (!b.alive) return;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 4);
    ctx.fill();
  });
}

function drawPaddle() {
  const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
  grad.addColorStop(0, COLORS.paddleLight);
  grad.addColorStop(1, COLORS.paddle);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
  ctx.fill();
}

function drawBall() {
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD() {
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 18px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, W / 2, 28);

  ctx.textAlign = 'right';
  ctx.fillText('Lives: ' + lives, W - 12, 28);
}

function drawStartScreen() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid();

  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, H * 0.35, W, H * 0.3);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 36px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('BREAKOUT', W / 2, H * 0.4);
  ctx.font = '18px Courier New';
  ctx.fillText('SPACE or click to launch', W / 2, H * 0.47);
  ctx.font = '16px Courier New';
  ctx.fillText('Mouse or arrows to move paddle', W / 2, H * 0.52);
}

function drawGameOver() {
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, H * 0.3, W, H * 0.4);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 40px Courier New';
  ctx.textAlign = 'center';

  if (bricks.every(b => !b.alive)) {
    ctx.fillText('YOU WIN', W / 2, H * 0.38);
  } else {
    ctx.fillText('GAME OVER', W / 2, H * 0.38);
  }

  ctx.font = '24px Courier New';
  ctx.fillText('Score: ' + score, W / 2, H * 0.46);
  ctx.font = '16px Courier New';
  ctx.fillStyle = COLORS.accent;
  ctx.fillText('SPACE to restart', W / 2, H * 0.54);
}

function draw() {
  if (state === 'start' || state === 'dead') {
    if (state === 'start') drawStartScreen();
    else drawGameOver();
    return;
  }

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid();
  drawBricks();
  drawPaddle();
  drawBall();
  drawHUD();

  if (!ball.active) {
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 22px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS SPACE TO LAUNCH', W / 2, H * 0.65);
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

function movePaddle() {
  if (keys['ArrowLeft'] || keys['KeyA']) paddle.x -= 12;
  if (keys['ArrowRight'] || keys['KeyD']) paddle.x += 12;
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
}

function update() {
  if (state === 'start') return;

  if (state === 'dead') return;

  if (paused) { if (pauseTimer > 0) { pauseTimer++; if (pauseTimer >= 180) { paused = false; pauseTimer = 0; } } return; }

  movePaddle();

  if (!ball.active) return;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounce
  if (ball.x - ball.r <= 0 || ball.x + ball.r >= W) ball.vx = -ball.vx + (Math.random() - 0.5) * 0.5;
  if (ball.y - ball.r <= 0) ball.vy = -ball.vy + (Math.random() - 0.5) * 0.5;

  // Bottom = lose life
  if (ball.y + ball.r >= H) {
    lives--;
    if (lives <= 0) {
      state = 'dead';
      return;
    }
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 1;
    ball.vx = 8;
    ball.vy = -9;
    ball.active = false;
    return;
  }

  // Paddle collision
  if (ball.vy > 0 &&
      ball.y + ball.r >= paddle.y &&
      ball.y + ball.r <= paddle.y + paddle.h + 10 &&
      ball.x >= paddle.x - ball.r &&
      ball.x <= paddle.x + paddle.w + ball.r) {
    const hitPos = (ball.x - paddle.x) / paddle.w;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const angle = (hitPos - 0.5) * Math.PI / 3;
    ball.vx = speed * Math.sin(angle) + (Math.random() - 0.5) * 1.5;
    ball.vy = -speed * Math.cos(angle) + (Math.random() - 0.5) * 0.5;
    ball.y = paddle.y - ball.r - 1;
  }

  // Brick collision
  for (let b of bricks) {
    if (!b.alive) continue;

    if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
      b.alive = false;
      score += 10;

      // Determine bounce direction
      const overlapLeft = (ball.x + ball.r) - b.x;
      const overlapRight = (b.x + b.w) - (ball.x - ball.r);
      const overlapTop = (ball.y + ball.r) - b.y;
      const overlapBottom = (b.y + b.h) - (ball.y - ball.r);

      const minX = Math.min(overlapLeft, overlapRight);
      const minY = Math.min(overlapTop, overlapBottom);

      if (minX < minY) {
        ball.vx = -ball.vx + (Math.random() - 0.5) * 1;
      } else {
        ball.vy = -ball.vy + (Math.random() - 0.5) * 1;
      }
      break;
    }
  }

  // Win check
  if (bricks.every(b => !b.alive)) {
    state = 'dead';
  }
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
});

canvas.addEventListener('click', () => {
  if (state === 'start') {
    state = 'playing';
    ball.active = true;
  } else if (state === 'dead') {
    reset();
  }
});

document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === 'start') {
      state = 'playing';
      ball.active = true;
    } else if (state === 'dead') {
      reset();
    } else if (state === 'playing' && !ball.active) {
      ball.active = true;
    }
  }
  if (e.code === 'KeyQ' && state === 'playing') {
  if (!paused) { paused = true; pauseTimer = 0; }
  else if (pauseTimer === 0) { pauseTimer = 1; }
  else { paused = false; pauseTimer = 0; }
}
});

document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();