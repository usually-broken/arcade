const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const GAME_W = 900;
const GAME_H = 500;
const ROAD_W = 880;
const ROAD_LEFT = (GAME_W - ROAD_W) / 2;
const ROAD_RIGHT = ROAD_LEFT + ROAD_W;

const CAR_W = 30;
const CAR_H = 50;
const CAR_X_START = GAME_W / 2 - CAR_W / 2;
const CAR_Y_BASE = GAME_H - 80;
const CAR_Y_MIN = GAME_H - 200;
const CAR_Y_MAX = GAME_H - 30;
const CAR_SPEED = 5;

const BASE_SPEED = 10;
const SPEED_INCREASE = 0.0015;
const MAX_SPEED = 16;

const OBSTACLE_START_INTERVAL = 80;
const OBSTACLE_MIN_INTERVAL = 5;

const DOOR_W = 40;
const DOOR_H = 14;
const TYRE_R = 13;
const MISC_W = 14;
const MISC_H = 14;

const HEALTH_MAX = 3;

canvas.width = GAME_W;
canvas.height = GAME_H;

let car, state, frameCount, obstacles, speed, obstacleTimer, score, health, roadOffset;
let trees;
const keys = { left: false, right: false, up: false, down: false, space: false };

function init() {
  car = {
    x: CAR_X_START,
    y: CAR_Y_BASE,
  };
  state = 'start';
  frameCount = 0;
  obstacles = [];
  speed = BASE_SPEED;
  obstacleTimer = 0;
  score = 0;
  health = HEALTH_MAX;
  roadOffset = 0;
  trees = [];
  for (let i = 0; i < 8; i++) {
    trees.push({
      x: Math.random() * GAME_W,
      size: 0.8 + Math.random() * 0.8,
    });
  }
}

function spawnObstacle() {
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const type = ['door', 'tyre', 'misc'][Math.floor(Math.random() * 3)];
    const width = type === 'door' ? DOOR_W : type === 'tyre' ? TYRE_R * 2 : MISC_W;
    const height = type === 'door' ? DOOR_H : type === 'tyre' ? TYRE_R * 2 : MISC_H;
    const x = ROAD_LEFT + Math.random() * (ROAD_W - width);
    const yOffset = Math.random() * 80 - 30;
    obstacles.push({
      x: x,
      y: yOffset,
      type: type,
      width: width,
      height: height,
    });
  }
}

function reset() {
  init();
  state = 'playing';
}

function getCarHitbox() {
  return { x: car.x + 6, y: car.y + 6, w: CAR_W - 12, h: CAR_H - 12 };
}

function getObstacleHitbox(o) {
  const shrink = 5;
  return { x: o.x + shrink, y: o.y + shrink, w: o.width - shrink * 2, h: o.height - shrink * 2 };
}

function checkCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
  frameCount++;

  if (state === 'start') {
    if (keys.space) {
      reset();
      keys.space = false;
    }
    return;
  }

  if (state === 'dead') {
    if (keys.space) {
      reset();
      keys.space = false;
    }
    return;
  }

  if (keys.left) car.x = Math.max(ROAD_LEFT + 5, car.x - CAR_SPEED);
  if (keys.right) car.x = Math.min(ROAD_RIGHT - CAR_W - 5, car.x + CAR_SPEED);
  if (keys.up) car.y = Math.max(CAR_Y_MIN, car.y - CAR_SPEED);
  if (keys.down) car.y = Math.min(CAR_Y_MAX, car.y + CAR_SPEED);

  speed = Math.min(MAX_SPEED, BASE_SPEED + frameCount * SPEED_INCREASE);
  roadOffset += speed;

  obstacles.forEach(o => { o.y += speed; });

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    const carHit = getCarHitbox();
    const oHit = getObstacleHitbox(o);
    if (checkCollision(carHit, oHit)) {
      health--;
      obstacles.splice(i, 1);
      if (health <= 0) {
        state = 'dead';
        return;
      }
      continue;
    }
    if (o.y > GAME_H + 40) {
      score++;
      obstacles.splice(i, 1);
    }
  }

  obstacleTimer++;
  const interval = Math.max(OBSTACLE_MIN_INTERVAL, OBSTACLE_START_INTERVAL - frameCount * 0.15);
  if (obstacleTimer >= interval) {
    obstacleTimer = 0;
    spawnObstacle();
  }
}

function drawRoad() {
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.fillStyle = '#64748b';
  ctx.fillRect(ROAD_LEFT, 0, ROAD_W, GAME_H);

  ctx.fillStyle = '#475569';
  ctx.fillRect(ROAD_LEFT, 0, 4, GAME_H);
  ctx.fillRect(ROAD_RIGHT - 4, 0, 4, GAME_H);

  ctx.fillStyle = '#fff';
  for (let y = 20; y < GAME_H; y += 50) {
    let drawY = (y + roadOffset) % (GAME_H + 50);
    ctx.fillRect(GAME_W / 2 - 2, drawY - 25, 4, 25);
  }
}

function drawCar() {
  const cx = car.x;
  const cy = car.y;

  ctx.fillStyle = '#2563eb';
  ctx.fillRect(cx, cy, CAR_W, CAR_H);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(cx + 3, cy + 3, CAR_W - 6, CAR_H - 6);

  ctx.fillStyle = '#dbeafe';
  ctx.fillRect(cx + 6, cy + 12, CAR_W - 12, 14);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cx - 2, cy + 8, 4, 10);
  ctx.fillRect(cx + CAR_W - 2, cy + 8, 4, 10);
  ctx.fillRect(cx - 2, cy + CAR_H - 18, 4, 10);
  ctx.fillRect(cx + CAR_W - 2, cy + CAR_H - 18, 4, 10);

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(cx + 2, cy + CAR_H - 4, 6, 3);
  ctx.fillRect(cx + CAR_W - 8, cy + CAR_H - 4, 6, 3);
}

function drawObstacle(o) {
  if (o.type === 'door') {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(o.x, o.y, o.width, o.height);
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(o.x + 5, o.y + 2, 10, o.height - 4);
    ctx.fillStyle = '#654321';
    ctx.fillRect(o.x + 20, o.y + 1, 1, o.height - 2);
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(o.x + 24, o.y + 5, 4, 2);
  } else if (o.type === 'tyre') {
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, TYRE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(cx, cy, TYRE_R - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, TYRE_R - 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    ctx.fillStyle = '#64748b';
    ctx.fillRect(o.x, o.y, o.width, o.height);
    ctx.fillStyle = '#475569';
    ctx.fillRect(o.x + 2, o.y + 2, o.width - 4, o.height - 4);
    ctx.fillStyle = '#374151';
    ctx.fillRect(cx - 1, cy - 4, 2, 8);
    ctx.fillRect(cx - 4, cy - 1, 8, 2);
  }
}

function drawUI() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('Dodged: ' + score, 20, 55);

  for (let i = 0; i < HEALTH_MAX; i++) {
    if (i < health) {
      ctx.fillStyle = '#2563eb';
    } else {
      ctx.fillStyle = '#475569';
    }
    ctx.fillRect(20 + i * 22, 68, 18, 8);
  }
}

function draw() {
  drawRoad();

  for (const o of obstacles) {
    drawObstacle(o);
  }

  drawCar();

  drawUI();

  if (state === 'start') {
    ctx.fillStyle = 'rgba(240,244,248,0.88)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 42px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('TRAFFIC DODGE', GAME_W / 2, GAME_H * 0.28);
    ctx.fillStyle = '#1e293b';
    ctx.font = '18px Courier New';
    ctx.fillText('WASD / ARROWS to move', GAME_W / 2, GAME_H * 0.38);
    ctx.fillText('Dodge traffic — 3 hits and you are out', GAME_W / 2, GAME_H * 0.43);
    ctx.font = '16px Courier New';
    ctx.fillText('SPACE to start', GAME_W / 2, GAME_H * 0.49);
    return;
  }

  if (state === 'dead') {
    ctx.fillStyle = 'rgba(240,244,248,0.92)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_W / 2, GAME_H * 0.32);
    ctx.fillStyle = '#1e293b';
    ctx.font = '24px Courier New';
    ctx.fillText('Dodged: ' + score, GAME_W / 2, GAME_H * 0.43);
    ctx.fillStyle = '#64748b';
    ctx.font = '16px Courier New';
    ctx.fillText('SPACE to restart', GAME_W / 2, GAME_H * 0.52);
    return;
  }
}

init();

document.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
  if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.up = true;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.down = true;
  if (e.code === 'Space') keys.space = true;
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.up = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.down = false;
  if (e.code === 'Space') keys.space = false;
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
