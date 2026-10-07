const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
}
resize();
window.addEventListener('resize', resize);

const SHIP_RADIUS = 22;
const SHIP_THRUST = 0.15;
const SHIP_FRICTION = 0.985;
const BULLET_SPEED = 8;
const SHIP_INVINCIBLE = 90;
const FLARE_COOLDOWN = 180;
const FLARE_SPEED = 5;
const FLARE_LIFE = 40;

let stars = [];
for (let i = 0; i < 150; i++) {
  stars.push({ x: Math.random() * 3000, y: Math.random() * 3000, s: Math.random() * 2 + 0.3, bright: Math.random() });
}

let ship, bullets, asteroids, particles, flares, score, lives, state, frameCount, spawnTimer, flareCooldown, paused, pauseTimer;

function newShip() {
  return { x: W / 2, y: H / 2, vx: 0, vy: 0, invincible: 0, alive: true };
}

function reset() {
  ship = newShip();
  bullets = [];
  asteroids = [];
  particles = [];
  flares = [];
  score = 0;
  lives = 3;
  state = 'start';
  frameCount = 0;
  spawnTimer = 0;
  flareCooldown = 0;
  paused = false;
  pauseTimer = 0;
}
reset();

function asteroidVerts(r) {
  const v = [];
  const n = 10 + Math.floor(Math.random() * 8);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = r * (0.5 + Math.random() * 0.5);
    v.push({ a: a, d: d });
  }
  return v;
}

function spawnAsteroid(x, y, size, vx, vy) {
  const r = size === 'large' ? 45 : size === 'medium' ? 22 : 12;
  let speed;
  if (vx !== undefined) {
    speed = Math.sqrt(vx * vx + vy * vy);
  } else {
    speed = 4 + Math.random() * 8;
  }
  const a = Math.random() * Math.PI * 2;
  asteroids.push({
    x: x !== undefined ? x : (Math.random() > 0.5 ? -r - Math.random() * 200 : W + r + Math.random() * 200),
    y: y !== undefined ? y : -r - Math.random() * 200,
    r: r,
    angle: Math.random() * Math.PI * 2,
    va: (Math.random() - 0.5) * 0.08,
    vx: vx !== undefined ? vx : Math.cos(a) * speed,
    vy: vy !== undefined ? vy : Math.sin(a) * speed + 0.8,
    size: size,
    points: size === 'large' ? 20 : size === 'medium' ? 50 : 100,
    vertices: asteroidVerts(r)
  });
}

function spawnParticles(x, y, count, color, speedMul) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 3 * (speedMul || 1);
    particles.push({
      x: x, y: y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 25 + Math.random() * 20,
      maxLife: 45,
      color: color,
      size: Math.random() * 2.5 + 0.5
    });
  }
}

function wrap(obj) {
  if (obj.x > W + 60) obj.x = -60;
  if (obj.x < -60) obj.x = W + 60;
  if (obj.y > H + 60) obj.y = -60;
  if (obj.y < -60) obj.y = H + 60;
}

function shipHit() {
  if (ship.invincible > 0) return;
  lives--;
  ship.invincible = SHIP_INVINCIBLE;
  spawnParticles(ship.x, ship.y, 25, '#60a5fa', 1.5);
  if (lives <= 0) {
    state = 'dead';
    spawnParticles(ship.x, ship.y, 50, '#2563eb', 2);
  } else {
    ship.x = W / 2; ship.y = H / 2;
    ship.vx = 0; ship.vy = 0;
  }
}

function shoot() {
  if (state !== 'playing') return;
  bullets.push({
    x: ship.x,
    y: ship.y - SHIP_RADIUS,
    vx: 0,
    vy: -BULLET_SPEED,
    life: 60
  });
}

function fireFlares() {
  if (state !== 'playing' || flareCooldown > 0) return;
  const numFlares = 12;
  for (let i = 0; i < numFlares; i++) {
    const a = (i / numFlares) * Math.PI * 2;
    flares.push({
      x: ship.x,
      y: ship.y,
      vx: Math.cos(a) * FLARE_SPEED,
      vy: Math.sin(a) * FLARE_SPEED,
      life: FLARE_LIFE
    });
  }
  flareCooldown = FLARE_COOLDOWN;
  spawnParticles(ship.x, ship.y, 20, '#60a5fa', 1);
}

function destroyAsteroid(i, source) {
  const a = asteroids[i];
  if (source !== 'bullet') score += a.points;
  spawnParticles(a.x, a.y, 10, '#94a3b8', 1);
  if (a.size === 'large') {
    spawnAsteroid(a.x, a.y, 'medium');
    spawnAsteroid(a.x, a.y, 'medium');
  } else if (a.size === 'medium') {
    spawnAsteroid(a.x, a.y, 'small');
    spawnAsteroid(a.x, a.y, 'small');
  }
  asteroids.splice(i, 1);
}

function update() {
  frameCount++;

  if (state === 'start') return;
  if (state === 'dead') return;

  if (paused) { if (pauseTimer > 0) { pauseTimer++; if (pauseTimer >= 180) { paused = false; pauseTimer = 0; } } return; }

  // Keyboard
  if (keys.left) ship.vx -= SHIP_THRUST;
  if (keys.right) ship.vx += SHIP_THRUST;
  if (keys.up) ship.vy -= SHIP_THRUST;
  if (keys.down) ship.vy += SHIP_THRUST;

  ship.vx *= SHIP_FRICTION;
  ship.vy *= SHIP_FRICTION;
  ship.x += ship.vx;
  ship.y += ship.vy;

  if (keys.shoot) {
    shoot();
    keys.shoot = false;
  }

  if (keys.shift) {
    fireFlares();
    keys.shift = false;
  }

  if (flareCooldown > 0) flareCooldown--;

  wrap(ship);

  if (ship.invincible > 0) ship.invincible--;

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    wrap(b);
    if (b.life <= 0) bullets.splice(i, 1);
  }

  // Flares
  for (let i = flares.length - 1; i >= 0; i--) {
    const f = flares[i];
    f.x += f.vx;
    f.y += f.vy;
    f.life--;
    wrap(f);
    if (f.life <= 0) flares.splice(i, 1);
  }

  // Spawn asteroids
  spawnTimer--;
  if (spawnTimer <= 0 && asteroids.length < 20) {
    const roll = Math.random();
    let size;
    if (roll < 0.4) size = 'large';
    else if (roll < 0.75) size = 'medium';
    else size = 'small';
    spawnAsteroid(null, null, size);

    if (Math.random() < 0.4) {
      const s2 = Math.random() < 0.5 ? 'medium' : 'small';
      spawnAsteroid(null, null, s2);
    }
    if (Math.random() < 0.2) {
      spawnAsteroid(null, null, 'small');
    }

    spawnTimer = Math.max(15, 40 - Math.random() * 25);
  }

  // Asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    a.x += a.vx;
    a.y += a.vy;
    a.angle += a.va;
    wrap(a);

    // Bullet collision
    let bulletHit = false;
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy < a.r * a.r) {
        bullets.splice(j, 1);
        bulletHit = true;
        break;
      }
    }

    // Flare collision
    let flareHit = false;
    if (!bulletHit) {
      for (let j = flares.length - 1; j >= 0; j--) {
        const f = flares[j];
        const dx = f.x - a.x, dy = f.y - a.y;
        if (dx * dx + dy * dy < a.r * a.r + 4) {
          flares.splice(j, 1);
          flareHit = true;
          break;
        }
      }
    }

    if (bulletHit || flareHit) {
      destroyAsteroid(i, bulletHit ? 'bullet' : 'flare');
      continue;
    }

    // Ship collision
    const dx = ship.x - a.x, dy = ship.y - a.y;
    if (dx * dx + dy * dy < (SHIP_RADIUS + a.r) * (SHIP_RADIUS + a.r)) {
      shipHit();
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawShip(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.moveTo(0, -SHIP_RADIUS);
  ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.5);
  ctx.lineTo(-SHIP_RADIUS * 0.3, SHIP_RADIUS * 0.3);
  ctx.lineTo(0, SHIP_RADIUS * 0.1);
  ctx.lineTo(SHIP_RADIUS * 0.3, SHIP_RADIUS * 0.3);
  ctx.lineTo(SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(0, -SHIP_RADIUS * 0.2, SHIP_RADIUS * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFlare(x, y, life) {
  const alpha = life / FLARE_LIFE;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  ctx.globalAlpha = alpha * 0.4;
  ctx.fillStyle = '#a5b4fc';
  ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.fillStyle = '#f0f4f8';
  ctx.fillRect(0, 0, W, H);

  for (const s of stars) {
    const sx = s.x % W;
    const sy = s.y % H;
    ctx.globalAlpha = 0.3 + s.bright * 0.7;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(sx, sy, s.s, s.s);
  }
  ctx.globalAlpha = 1;

  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  if (state === 'start') {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('ASTEROID DODGE', W / 2, H * 0.35);
    ctx.font = '20px Courier New';
    ctx.fillStyle = '#2563eb';
    ctx.fillText('SPACE to start', W / 2, H * 0.45);
    ctx.fillStyle = '#1e293b';
    ctx.font = '14px Courier New';
    ctx.fillText('← → ↑ ↓ or WASD to move  SPACE to shoot  SHIFT for flares', W / 2, H * 0.55);
    return;
  }

  if (state === 'playing' || state === 'dead') {
    if (ship.alive && (ship.invincible <= 0 || frameCount % 6 < 3)) {
      drawShip(ship.x, ship.y);
    }

    ctx.fillStyle = '#2563eb';
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const f of flares) {
      drawFlare(f.x, f.y, f.life);
    }

    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < a.vertices.length; i++) {
        const v = a.vertices[i];
        const px = Math.cos(v.a) * v.d;
        const py = Math.sin(v.a) * v.d;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // HUD
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SCORE: ' + score, W / 2, 28);
    ctx.textAlign = 'right';
    ctx.fillText('LIVES: ' + lives, W - 16, 28);
  }

  if (state === 'dead') {
    ctx.fillStyle = 'rgba(13,27,62,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H * 0.35);
    ctx.font = '24px Courier New';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('Score: ' + score, W / 2, H * 0.45);
    ctx.fillStyle = '#fff';
    ctx.font = '18px Courier New';
    ctx.fillText('SPACE to restart', W / 2, H * 0.55);
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

const keys = { left: false, right: false, up: false, down: false, shoot: false, shift: false };

document.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (e.code === 'Space') {
    if (state === 'start') { state = 'playing'; return; }
    if (state === 'dead') { reset(); return; }
    keys.shoot = true;
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { keys.shift = true; return; }
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
  if (e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'ArrowUp') keys.up = false;
  if (e.code === 'ArrowDown') keys.down = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
  if (e.code === 'KeyW') keys.up = false;
  if (e.code === 'KeyS') keys.down = false;
  if (e.code === 'KeyA') keys.left = false;
  if (e.code === 'KeyD') keys.right = false;
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
