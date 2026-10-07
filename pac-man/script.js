const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const COLS = 19;
const ROWS = 21;
const CELL = 22;
const W = COLS * CELL;
const H = ROWS * CELL;
canvas.width = W;
canvas.height = H;

const MAZE_DATA = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,3,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
  [2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2],
  [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,3,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
const GHOST_NAMES = ['blinky', 'pinky', 'inky', 'clyde'];
const PELLET_SCORE = 10;
const POWER_PELLET_SCORE = 50;
const GHOST_SCORE = 200;
const POWER_PELLET_DURATION = 420; // 7 seconds at 60fps
const GHOST_RETURN_TIME = 90; // 1.5 seconds at box

let maze, pac, ghosts, pellets, score, lives, state, frameCount, powerPelletTimer, lastPelletCount, deadTimer, paused, pauseTimer;
let startDelay = 0;

function init() {
  maze = MAZE_DATA.map(row => [...row]);
  pac = { x: 9, y: 15, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 }, mouth: 0 };
  ghosts = GHOST_COLORS.map((color, i) => ({
    x: 9, y: 9,
    dir: { x: 0, y: 0 },
    color: color,
    name: GHOST_NAMES[i],
    index: i,
    mode: 'chase',
    home: i === 0 ? { x: 1, y: 1 } : i === 1 ? { x: 17, y: 1 } : i === 2 ? { x: 1, y: 19 } : { x: 17, y: 19 },
    returnTimer: 0,
  }));
  score = 0;
  lives = 3;
  state = 'start';
  frameCount = 0;
  deadTimer = 0;
  powerPelletTimer = 0;
  startDelay = 0;
  paused = false;
  pauseTimer = 0;
  buildPellets();
  lastPelletCount = countPellets();
}

function buildPellets() {
  pellets = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (maze[y][x] === 0) pellets.push({ x: x * CELL + CELL / 2, y: y * CELL + CELL / 2, r: 2, eaten: false });
      if (maze[y][x] === 3) pellets.push({ x: x * CELL + CELL / 2, y: y * CELL + CELL / 2, r: 5, eaten: false, power: true });
    }
  }
}

function countPellets() {
  return pellets.filter(p => !p.eaten).length;
}

function isWall(x, y) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
  return maze[y][x] === 1;
}

function canMove(px, py, dx, dy) {
  const cx = Math.round(px / CELL);
  const cy = Math.round(py / CELL);
  const nx = cx + dx;
  const ny = cy + dy;
  return !isWall(nx, ny);
}

function resetLevel() {
  maze = MAZE_DATA.map(row => [...row]);
  pac = { x: 9, y: 15, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 }, mouth: 0 };
  ghosts.forEach((g) => {
    g.x = 9;
    g.y = 9;
    g.dir = { x: 0, y: 0 };
    g.mode = 'chase';
    g.returnTimer = 0;
  });
  buildPellets();
  powerPelletTimer = 0;
  deadTimer = 0;
  state = 'playing';
}

function resetGame() {
  init();
  state = 'playing';
}

function movePac() {
  if (state !== 'playing') return;

  if (pac.nextDir.x !== 0 || pac.nextDir.y !== 0) {
    if (canMove(pac.x * CELL, pac.y * CELL, pac.nextDir.x, pac.nextDir.y)) {
      pac.dir = { ...pac.nextDir };
    }
  }

  if (pac.dir.x === 0 && pac.dir.y === 0) return;

  const nextX = pac.x + pac.dir.x;
  const nextY = pac.y + pac.dir.y;

  const wrapX = nextX < 0 ? COLS - 1 : nextX >= COLS ? 0 : nextX;

  if (!isWall(wrapX, nextY)) {
    pac.x = wrapX;
    pac.y = nextY;
  } else {
    pac.dir = { x: 0, y: 0 };
  }

  for (const p of pellets) {
    if (p.eaten) continue;
    const dx = (pac.x * CELL + CELL / 2) - p.x;
    const dy = (pac.y * CELL + CELL / 2) - p.y;
    if (dx * dx + dy * dy < (CELL / 2) * (CELL / 2) + 2) {
      p.eaten = true;
      if (p.power) {
        score += POWER_PELLET_SCORE;
        powerPelletTimer = POWER_PELLET_DURATION;
      } else {
        score += PELLET_SCORE;
      }
    }
  }

  if (countPellets() === 0) {
    state = 'win';
  }
}

function moveGhost(g) {
  if (state !== 'playing') return;

  if (g.mode === 'returning') {
    g.returnTimer--;
    if (g.returnTimer <= 0) {
      g.mode = 'chase';
    }
    return;
  }

  const possibleDirs = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 },
  ];

  let bestDir = null;
  let bestDist = Infinity;
  const pacX = pac.x;
  const pacY = pac.y;

  let targetX, targetY;
  if (powerPelletTimer > 0) {
    targetX = g.home.x;
    targetY = g.home.y;
  } else if (g.mode === 'scatter') {
    targetX = g.home.x;
    targetY = g.home.y;
  } else {
    switch (g.index) {
      case 0:
        targetX = pacX; targetY = pacY;
        break;
      case 1:
        targetX = pacX + pac.dir.x * 4; targetY = pacY + pac.dir.y * 4;
        break;
      case 2:
        targetX = pacX + (pacX - ghosts[0].x); targetY = pacY + (pacY - ghosts[0].y);
        break;
      case 3:
        const distToPac = (pacX - g.x) * (pacX - g.x) + (pacY - g.y) * (pacY - g.y);
        if (distToPac < CELL * CELL * 16) {
          targetX = g.home.x; targetY = g.home.y;
        } else {
          targetX = pacX; targetY = pacY;
        }
        break;
      default:
        targetX = pacX; targetY = pacY;
    }
  }

  for (const d of possibleDirs) {
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    if (isWall(nx, ny)) continue;
    if (d.x === -g.dir.x && d.y === -g.dir.y) continue;

    const dist = (nx - targetX) * (nx - targetX) + (ny - targetY) * (ny - targetY);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = d;
    }
  }

  if (bestDir && (bestDir.x !== 0 || bestDir.y !== 0)) {
    g.x += bestDir.x;
    g.y += bestDir.y;
    g.dir = { ...bestDir };
  } else {
    if (!isWall(g.x - g.dir.x, g.y - g.dir.y)) {
      g.x -= g.dir.x;
      g.y -= g.dir.y;
    } else {
      g.dir = { x: 0, y: 0 };
    }
  }

  if (g.x < 0) g.x = COLS - 1;
  if (g.x >= COLS) g.x = 0;
  if (g.y < 0) g.y = ROWS - 1;
  if (g.y >= ROWS) g.y = 0;
}

function checkCollisions() {
  if (state !== 'playing') return;
  for (const g of ghosts) {
    const dx = (pac.x * CELL + CELL / 2) - (g.x * CELL + CELL / 2);
    const dy = (pac.y * CELL + CELL / 2) - (g.y * CELL + CELL / 2);
    if (dx * dx + dy * dy < (CELL * 0.8) * (CELL * 0.8)) {
      if (powerPelletTimer > 0) {
        score += GHOST_SCORE;
        g.x = 9;
        g.y = 9;
        g.dir = { x: 0, y: 0 };
        g.mode = 'returning';
        g.returnTimer = GHOST_RETURN_TIME;
      } else {
        state = 'dead';
      }
    }
  }
}

function update() {
  if (paused) { if (pauseTimer > 0) { pauseTimer++; if (pauseTimer >= 180) { paused = false; pauseTimer = 0; } } return; }
  frameCount++;
  if (powerPelletTimer > 0) powerPelletTimer--;

  if (state === 'start') {
    startDelay++;
    if (startDelay > 60 || keys.space) {
      state = 'playing';
    }
    return;
  }

  if (state === 'dead') {
    deadTimer++;
    const secsLeft = 2 - Math.floor(deadTimer / 60);
    if (deadTimer >= 120) {
      deadTimer = 0;
      lives--;
      if (lives <= 0) {
        return;
      }
      resetLevel();
    }
    return;
  }

  if (state === 'win') return;

  if (frameCount % 9 === 0) movePac();
  if (frameCount % 11 === 0) {
    for (const g of ghosts) moveGhost(g);
  }

  checkCollisions();

  pac.mouth = (pac.mouth + 0.15) % (Math.PI * 2);

  if (keys.left) pac.nextDir = { x: -1, y: 0 };
  if (keys.right) pac.nextDir = { x: 1, y: 0 };
  if (keys.up) pac.nextDir = { x: 0, y: -1 };
  if (keys.down) pac.nextDir = { x: 0, y: 1 };

  if (keys.space && state === 'start') {
    state = 'playing';
    keys.space = false;
  }
}

function drawMaze() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (maze[y][x] === 1) {
        ctx.fillStyle = '#1a1a4e';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }
}

function drawPellets() {
  for (const p of pellets) {
    if (p.eaten) continue;
    ctx.fillStyle = p.power ? '#ffeb3b' : '#ffd54a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPac() {
  if (state === 'dead') return;
  const px = pac.x * CELL + CELL / 2;
  const py = pac.y * CELL + CELL / 2;
  const r = CELL * 0.45;
  const mouthAngle = state === 'start' ? Math.PI * 0.5 : Math.sin(pac.mouth) * 0.3;

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, r, mouthAngle, Math.PI * 2 - mouthAngle);
  ctx.lineTo(px, py);
  ctx.fill();
  ctx.strokeStyle = '#e6b800';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGhost(g) {
  if (state === 'start') return;
  const px = g.x * CELL + CELL / 2;
  const py = g.y * CELL + CELL / 2;
  const r = CELL * 0.42;
  const flashing = powerPelletTimer > 0 && powerPelletTimer < 120 && Math.floor(frameCount / 10) % 2 === 0;
  const color = flashing ? '#ffffff' : (powerPelletTimer > 0 ? '#0066ff' : g.color);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py - r * 0.15, r, Math.PI, 0, false);
  ctx.lineTo(px + r, py + r * 0.65);
  const waveCount = 4;
  for (let i = 0; i < waveCount; i++) {
    const x1 = px + r - (2 * r * (i + 1) / waveCount);
    const x2 = px + r - (2 * r * (i + 0.5) / waveCount);
    ctx.lineTo(x2, py + r * 0.25);
    ctx.lineTo(x1, py + r * 0.65);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px - r * 0.3, py - r * 0.2, r * 0.22, 0, Math.PI * 2);
  ctx.arc(px + r * 0.3, py - r * 0.2, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  const eyeDir = powerPelletTimer > 0 ? { x: 0, y: 0 } :
    g.dir.x === 1 ? { x: 2, y: 0 } : g.dir.x === -1 ? { x: -2, y: 0 } :
    g.dir.y === -1 ? { x: 0, y: -2 } : { x: 0, y: 2 };
  ctx.beginPath();
  ctx.arc(px - r * 0.3 + eyeDir.x, py - r * 0.2 + eyeDir.y, r * 0.1, 0, Math.PI * 2);
  ctx.arc(px + r * 0.3 + eyeDir.x, py - r * 0.2 + eyeDir.y, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.fillStyle = '#0d1b3e';
  ctx.fillRect(0, 0, W, H);

  drawMaze();
  drawPellets();

  if (state === 'start') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAC-MAN', W / 2, H * 0.35);
    ctx.font = '14px Courier New';
    ctx.fillStyle = '#ffd54a';
    ctx.fillText('Press SPACE or any key to start', W / 2, H * 0.5);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Courier New';
    ctx.fillText('Arrow keys / WASD to move', W / 2, H * 0.6);
    return;
  }

  if (state === 'dead') {
    drawMaze();
    drawPellets();
    drawPac();
    for (const g of ghosts) drawGhost(g);
    ctx.fillStyle = 'rgba(13,27,62,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H * 0.35);
    ctx.font = '18px Courier New';
    ctx.fillStyle = '#ffd54a';
    ctx.fillText('Score: ' + score, W / 2, H * 0.45);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Courier New';
    ctx.fillText('Resuming in ' + (2 - Math.floor(deadTimer / 60)) + 's...', W / 2, H * 0.55);
    return;
  }

  if (state === 'win') {
    drawMaze();
    drawPellets();
    drawPac();
    for (const g of ghosts) drawGhost(g);
    ctx.fillStyle = 'rgba(13,27,62,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN', W / 2, H * 0.35);
    ctx.font = '18px Courier New';
    ctx.fillStyle = '#ffd54a';
    ctx.fillText('Score: ' + score, W / 2, H * 0.45);
    return;
  }

  drawMaze();
  drawPellets();
  drawPac();
  for (const g of ghosts) drawGhost(g);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('SCORE: ' + score, W / 2, 16);
  ctx.textAlign = 'right';
  ctx.fillText('LIVES: ' + lives, W - 8, 16);

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

const keys = { left: false, right: false, up: false, down: false, space: false };

document.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (e.code === 'Space') { keys.space = true; return; }
  if (e.code === 'KeyW') { keys.up = true; return; }
  if (e.code === 'KeyS') { keys.down = true; return; }
  if (e.code === 'KeyA') { keys.left = true; return; }
  if (e.code === 'KeyD') { keys.right = true; return; }
  if (e.code === 'ArrowLeft') keys.left = true;
  if (e.code === 'ArrowRight') keys.right = true;
  if (e.code === 'ArrowUp') keys.up = true;
  if (e.code === 'ArrowDown') keys.down = true;
  if (e.code === 'KeyQ' && state === 'playing') {
  if (!paused) { paused = true; pauseTimer = 0; }
  else if (pauseTimer === 0) { pauseTimer = 1; }
  else { paused = false; pauseTimer = 0; }
}
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') keys.up = false;
  if (e.code === 'KeyS') keys.down = false;
  if (e.code === 'KeyA') keys.left = false;
  if (e.code === 'KeyD') keys.right = false;
  if (e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'ArrowUp') keys.up = false;
  if (e.code === 'ArrowDown') keys.down = false;
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state === 'start') { state = 'playing'; return; }
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

init();
loop();
