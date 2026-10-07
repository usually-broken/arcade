const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const GAME_W = 900;
const GAME_H = 700;
canvas.width = GAME_W;
canvas.height = GAME_H;

const BG = '#f0f4f8';
const PLAYER_COLOR = '#2563eb';
const BULLET_COLOR = '#2563eb';
const ENEMY_BULLET_COLOR = '#ef4444';
const ENEMY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
const ENEMY_NAMES = ['squid', 'crab', 'octopus', 'tank', 'trooper'];

const ENEMY_ROWS = 5;
const ENEMY_COLS = 11;
const ENEMY_SPACING_X = 50;
const ENEMY_SPACING_Y = 42;
const ENEMY_START_X = 75;
const ENEMY_START_Y = 60;
const ENEMY_SIZE = 28;

const PLAYER_SPEED = 10;
const PLAYER_BULLET_SPEED = 12;
const PLAYER_BULLET_COOLDOWN = 18;
const PLAYER_W = 40;
const PLAYER_H = 20;

const ENEMY_BULLET_SPEED = 5;
const ENEMY_STEP_DOWN = 10;
const ENEMY_BASE_SPEED = 3;
const ENEMY_SHOOT_CHANCE = 0.001;

const INITIAL_LIVES = 3;

let player, enemies, playerBullets, enemyBullets, score, lives, state, frameCount, enemyDir, enemySpeed, bulletCooldown, deadTimer, paused, pauseTimer;

function init() {
  enemies = [];
  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      enemies.push({
        x: ENEMY_START_X + col * ENEMY_SPACING_X,
        y: ENEMY_START_Y + row * ENEMY_SPACING_Y,
        alive: true,
        type: row,
        color: ENEMY_COLORS[row],
        points: 10 * (row + 1),
      });
    }
  }
  player = { x: GAME_W / 2, y: GAME_H - 50 };
  playerBullets = [];
  enemyBullets = [];
  score = 0;
  lives = INITIAL_LIVES;
  state = 'start';
  frameCount = 0;
  enemyDir = 1;
  enemySpeed = ENEMY_BASE_SPEED;
  bulletCooldown = 0;
  deadTimer = 0;
  paused = false;
  pauseTimer = 0;
}

function playerShoot() {
  if (bulletCooldown > 0) return;
  playerBullets.push({ x: player.x, y: player.y - PLAYER_H / 2 - 8, alive: true });
  bulletCooldown = PLAYER_BULLET_COOLDOWN;
}

function enemyShoot() {
  const alive = enemies.filter(e => e.alive);
  if (alive.length === 0) return;
  const shooter = alive[Math.floor(Math.random() * alive.length)];
  const dx = player.x - shooter.x;
  const dy = player.y - shooter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = ENEMY_BULLET_SPEED;
  enemyBullets.push({ x: shooter.x, y: shooter.y + ENEMY_SIZE / 2, vx: dx / dist * speed, vy: dy / dist * speed, alive: true });
}

function update() {
  if (paused) { if (pauseTimer > 0) { pauseTimer++; if (pauseTimer >= 180) { paused = false; pauseTimer = 0; } } return; }
  if (state === 'start') {
    if (keys.space) {
      state = 'playing';
      keys.space = false;
    }
    return;
  }

  if (state === 'dead') {
    deadTimer++;
    if (deadTimer >= 120) {
      deadTimer = 0;
      lives--;
      if (lives <= 0) return;
      const remaining = lives;
      init();
      lives = remaining;
      state = 'start';
    }
    return;
  }

  if (state === 'win') return;
  if (state !== 'playing') return;

  if (keys.left || keys.a) player.x -= PLAYER_SPEED;
  if (keys.right || keys.d) player.x += PLAYER_SPEED;
  player.x = Math.max(PLAYER_W / 2, Math.min(GAME_W - PLAYER_W / 2, player.x));

  if (keys.space) playerShoot();
  if (bulletCooldown > 0) bulletCooldown--;

  frameCount++;

  let hitEdge = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.x + enemyDir * enemySpeed < ENEMY_SIZE || e.x + enemyDir * enemySpeed > GAME_W - ENEMY_SIZE) {
      hitEdge = true;
      break;
    }
  }
  if (hitEdge) {
    enemyDir *= -1;
    for (const e of enemies) {
      if (e.alive) e.y += ENEMY_STEP_DOWN;
    }
  } else {
    for (const e of enemies) {
      if (e.alive) e.x += enemyDir * enemySpeed;
    }
  }

  for (const e of enemies) {
    if (!e.alive) continue;
    if (Math.random() < ENEMY_SHOOT_CHANCE) enemyShoot();
  }

  for (const b of playerBullets) {
    if (!b.alive) continue;
    b.y -= PLAYER_BULLET_SPEED;
    if (b.y < -20) b.alive = false;
  }

  for (const b of enemyBullets) {
    if (!b.alive) continue;
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < -20 || b.x > GAME_W + 20 || b.y > GAME_H + 20) b.alive = false;
  }

  for (const b of playerBullets) {
    if (!b.alive) continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      if (dx * dx + dy * dy < ENEMY_SIZE * ENEMY_SIZE) {
        b.alive = false;
        e.alive = false;
        score += e.points;
        const alive = enemies.filter(en => en.alive).length;
        enemySpeed = ENEMY_BASE_SPEED + (ENEMY_ROWS * ENEMY_COLS - alive) * 0.05;
        break;
      }
    }
  }

  for (const b of enemyBullets) {
    if (!b.alive) continue;
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    if (dx * dx + dy * dy < (PLAYER_W / 2 + 6) * (PLAYER_W / 2 + 6)) {
      b.alive = false;
      lives--;
      if (lives <= 0) {
        state = 'dead';
        deadTimer = 0;
      } else {
        player.x = GAME_W / 2;
        playerBullets = [];
        enemyBullets = [];
      }
    }
  }

  for (const e of enemies) {
    if (e.alive && e.y + ENEMY_SIZE > player.y - 10) {
      state = 'dead';
      deadTimer = 0;
      return;
    }
  }

  if (enemies.every(e => !e.alive)) {
    state = 'win';
    deadTimer = 0;
  }
}

function draw() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(37,99,235,${0.04 + (i % 3) * 0.02})`;
    ctx.fillRect((i * 137 + 23) % GAME_W, (i * 89 + 17) % GAME_H, 2, 2);
  }

  if (state === 'start') {
    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE INVADERS', GAME_W / 2, GAME_H * 0.32);

    ctx.fillStyle = '#1e293b';
    ctx.font = '18px Courier New';
    ctx.fillText('Press SPACE to start', GAME_W / 2, GAME_H * 0.45);

    ctx.font = '14px Courier New';
    ctx.fillText('← → or A D to move    SPACE to shoot', GAME_W / 2, GAME_H * 0.55);

    ctx.font = '12px Courier New';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Defend Earth. Destroy all invaders.', GAME_W / 2, GAME_H * 0.65);
    return;
  }

  if (state === 'dead') {
    ctx.fillStyle = 'rgba(240,244,248,0.9)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = 'bold 36px Courier New';
    ctx.textAlign = 'center';
    if (lives <= 0) {
      ctx.fillText('GAME OVER', GAME_W / 2, GAME_H * 0.35);
    } else {
      ctx.fillText('YOU DIED', GAME_W / 2, GAME_H * 0.35);
    }
    ctx.fillStyle = '#1e293b';
    ctx.font = '18px Courier New';
    ctx.fillText('Score: ' + score, GAME_W / 2, GAME_H * 0.45);
    if (lives > 0) {
      ctx.fillStyle = PLAYER_COLOR;
      ctx.font = '14px Courier New';
      ctx.fillText('Resuming in ' + (2 - Math.floor(deadTimer / 60)) + 's...', GAME_W / 2, GAME_H * 0.55);
    }
    return;
  }

  if (state === 'win') {
    ctx.fillStyle = 'rgba(240,244,248,0.9)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = 'bold 42px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('EARTH SAVED', GAME_W / 2, GAME_H * 0.35);
    ctx.fillStyle = '#1e293b';
    ctx.font = '20px Courier New';
    ctx.fillText('Score: ' + score, GAME_W / 2, GAME_H * 0.45);
    ctx.font = '14px Courier New';
    ctx.fillText('No invaders remain.', GAME_W / 2, GAME_H * 0.55);
    return;
  }

  for (const e of enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - ENEMY_SIZE / 2, e.y - ENEMY_SIZE / 2, ENEMY_SIZE, ENEMY_SIZE);
    ctx.fillStyle = BG;
    ctx.fillRect(e.x - 6, e.y - 6, 3, 3);
    ctx.fillRect(e.x + 3, e.y - 6, 3, 3);
  }

  const px = player.x;
  const py = player.y;
  ctx.fillStyle = PLAYER_COLOR;
  ctx.beginPath();
  ctx.moveTo(px, py - PLAYER_H / 2);
  ctx.lineTo(px - PLAYER_W / 2, py + PLAYER_H / 2);
  ctx.lineTo(px, py + PLAYER_H / 4);
  ctx.lineTo(px + PLAYER_W / 2, py + PLAYER_H / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = BULLET_COLOR;
  for (const b of playerBullets) {
    if (!b.alive) continue;
    ctx.fillRect(b.x - 2, b.y - 10, 4, 20);
  }

  ctx.fillStyle = ENEMY_BULLET_COLOR;
  for (const b of enemyBullets) {
    if (!b.alive) continue;
    ctx.fillRect(b.x - 2, b.y - 10, 4, 20);
  }

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE: ' + score, 12, 24);
  ctx.textAlign = 'right';
  ctx.fillText('LIVES: ' + lives, GAME_W - 12, 24);

  if (paused) {
    ctx.fillStyle = 'rgba(240,244,248,0.9)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 42px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', GAME_W / 2, GAME_H * 0.4);
    ctx.fillStyle = '#1e293b';
    ctx.font = '18px Courier New';
    ctx.fillText('Resuming in ' + (3 - Math.floor(pauseTimer / 60)) + 's...', GAME_W / 2, GAME_H * 0.5);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Courier New';
    ctx.fillText('Press Q to resume early', GAME_W / 2, GAME_H * 0.57);
  }
}

const keys = { left: false, right: false, a: false, d: false, space: false };

document.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space') keys.space = true;
  if (e.code === 'KeyQ' && state === 'playing') {
  if (!paused) { paused = true; pauseTimer = 0; }
  else if (pauseTimer === 0) { pauseTimer = 1; }
  else { paused = false; pauseTimer = 0; }
}
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

init();
requestAnimationFrame(loop);
