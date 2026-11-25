// Battle Tank — top down.
//
// WASD drives, A/D or ← → turn, SPACE fires. Fifty tanks hunt you across an
// arena full of breakable walls, and the round is won by killing all of them.

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let W = window.innerWidth;
let H = window.innerHeight;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
}
resize();
window.addEventListener('resize', resize);

const COLORS = {
  bg: '#f0f4f8',
  field: '#ffffff',
  grid: '#e8eef6',
  wall: '#94a3b8',
  wallHurt: '#cbd5e1',
  hull: '#1d4ed8',
  enemy: '#dc2626',
  hud: '#1e293b',
  accent: '#2563eb',
};

const ARENA = 1500;              // half-width of the playfield
const ENEMY_TOTAL = 51;      // the arena's whole garrison
const WAVE_SIZE = 3;         // how many arrive at a time
const WAVE_SECONDS = 10;     // and how often
const WALL_COUNT = 46;

const PLAYER = { halfW: 20, halfH: 26, radius: 24, topSpeed: 165 };
const ENEMY = { halfW: 17, halfH: 22, radius: 21, speed: 92 };
const SHELL_RADIUS = 8;          // how big a shell looks
const SHELL_HIT = 26;            // and how close it has to be to count

let gameState = 'start';         // start | playing | won | over
let paused = false;
let pauseTimer = 0;
let lastTime = 0;
let runStart = 0;
let shake = 0;

const player = {
  x: 0, z: 0,
  hull: 0,
  speed: 0,
  health: 5,
  cooldown: 0,
  score: 0,
};

const world = { walls: [], enemies: [], mine: [], theirs: [] };
const keys = {};

const rand = (a, b) => a + Math.random() * (b - a);

// ── setup ────────────────────────────────────────────────────────────────────

function wallAt(x, z, r) {
  for (const w of world.walls) {
    if (Math.abs(x - w.x) < w.w / 2 + r && Math.abs(z - w.z) < w.d / 2 + r) return w;
  }
  return null;
}

function makeWall(x, z, w, d) {
  // Thickness decides how many shells it takes: a crate dies at once, a long
  // barricade takes three. That is what makes some cover worth using.
  const bulk = Math.min(w, d);
  const hp = bulk > 110 ? 3 : bulk > 60 ? 2 : 1;
  return { x, z, w, d, hp, maxHp: hp };
}

function buildArena() {
  world.walls = [];
  let placed = 0;
  let guard = 0;

  while (placed < WALL_COUNT && guard++ < 4000) {
    const long = Math.random() < 0.5;
    const w = long ? rand(120, 320) : rand(45, 110);
    const d = long ? rand(45, 110) : rand(120, 320);
    const x = rand(-ARENA + 160, ARENA - 160);
    const z = rand(-ARENA + 160, ARENA - 160);

    if (Math.hypot(x, z) < 260) continue;                        // keep the start clear
    if (wallAt(x, z, Math.max(w, d) / 2 + 70)) continue;          // and lanes between walls

    world.walls.push(makeWall(x, z, w, d));
    placed++;
  }
}

function makeEnemy() {
  for (let tries = 0; tries < 120; tries++) {
    const ang = rand(0, Math.PI * 2);
    // Far enough that nothing ever lands in your lap, near enough to find you.
    const dist = rand(820, ARENA - 160);
    const x = Math.sin(ang) * dist;
    const z = Math.cos(ang) * dist;
    if (wallAt(x, z, ENEMY.radius + 8)) continue;
    return {
      x, z,
      hull: Math.atan2(player.x - x, player.z - z),
      cooldown: rand(150, 380),
      alive: true,
    };
  }
  return null;
}

function reset() {
  runStart = performance.now();
  world.mine = [];
  world.theirs = [];
  world.spawned = 0;
  world.nextWave = 0;

  player.x = 0;
  player.z = 0;
  player.hull = 0;
  player.speed = 0;
  player.health = 5;
  player.cooldown = 0;
  player.score = 0;
  shake = 0;

  buildArena();

  world.enemies = [];
  spawnWave();
  world.nextWave = WAVE_SECONDS;   // the second wave waits its turn
}

// Waves rather than a wall of fifty: three at the start, three more every ten
// seconds, until the last of them is out.
function spawnWave() {
  for (let i = 0; i < WAVE_SIZE && world.spawned < ENEMY_TOTAL; i++) {
    const e = makeEnemy();
    if (e) {
      world.enemies.push(e);
      world.spawned++;
    }
  }
}

// ── world to screen ─────────────────────────────────────────────────────────

// The camera follows the tank but stays world-aligned, so "up" never changes and
// the map you build in your head keeps working.
function sx(x) { return W / 2 + (x - player.x); }
function sz(z) { return H / 2 + (z - player.z) + shake; }

function onScreen(x, z, pad) {
  return Math.abs(x - player.x) < W / 2 + pad && Math.abs(z - player.z) < H / 2 + pad;
}

// ── drawing ─────────────────────────────────────────────────────────────────

function drawField() {
  ctx.fillStyle = COLORS.field;
  ctx.fillRect(0, 0, W, H);

  const step = 80;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  const left = Math.floor((player.x - W / 2) / step) * step;
  const top = Math.floor((player.z - H / 2) / step) * step;

  for (let x = left; x < player.x + W / 2 + step; x += step) {
    ctx.beginPath();
    ctx.moveTo(sx(x), 0);
    ctx.lineTo(sx(x), H);
    ctx.stroke();
  }
  for (let z = top; z < player.z + H / 2 + step; z += step) {
    ctx.beginPath();
    ctx.moveTo(0, sz(z));
    ctx.lineTo(W, sz(z));
    ctx.stroke();
  }
}

function drawWalls() {
  world.walls.forEach(w => {
    if (!onScreen(w.x, w.z, 340)) return;

    const x = sx(w.x - w.w / 2);
    const y = sz(w.z - w.d / 2);
    const hurt = w.hp < w.maxHp;

    ctx.fillStyle = hurt ? COLORS.wallHurt : '#dbe4ee';
    ctx.fillRect(x, y, w.w, w.d);
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = hurt ? 3 : 2;
    ctx.strokeRect(x, y, w.w, w.d);

    if (hurt) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w.w * 0.2, y);
      ctx.lineTo(x + w.w * 0.45, y + w.d * 0.6);
      ctx.lineTo(x + w.w * 0.3, y + w.d);
      ctx.stroke();
    }
  });
}

function drawTank(x, z, hull, color, size, barrelLen) {
  const px = sx(x);
  const pz = sz(z);

  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(-hull);
  ctx.fillStyle = color;
  ctx.fillRect(-size.halfW, -size.halfH, size.halfW * 2, size.halfH * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-size.halfW * 0.5, -size.halfH * 0.45, size.halfW, size.halfH * 0.9);
  ctx.restore();

  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(px, pz);
  ctx.lineTo(px + Math.sin(hull) * barrelLen, pz + Math.cos(hull) * barrelLen);
  ctx.stroke();
}

function drawShells() {
  world.mine.forEach(s => {
    ctx.fillStyle = COLORS.accent;
    ctx.beginPath();
    ctx.arc(sx(s.x), sz(s.z), SHELL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
  world.theirs.forEach(s => {
    ctx.fillStyle = COLORS.enemy;
    ctx.beginPath();
    ctx.arc(sx(s.x), sz(s.z), SHELL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHud() {
  let left = 0;
  for (const e of world.enemies) if (e.alive) left++;

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 15px Courier New';
  ctx.fillText('SCORE ' + player.score, 24, H - 58);
  ctx.fillText('TANKS LEFT ' + left + ' / ' + ENEMY_TOTAL, 24, H - 34);

  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < player.health ? COLORS.accent : '#cbd5e1';
    ctx.fillRect(W - 34 - (4 - i) * 18, H - 42, 12, 12);
  }
}

function overlay(title, lines) {
  ctx.fillStyle = 'rgba(240,244,248,0.93)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.accent;
  ctx.font = 'bold 34px Courier New';
  ctx.fillText(title, W / 2, H * 0.3);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '14px Courier New';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.3 + 44 + i * 24));
}

// ── rules ───────────────────────────────────────────────────────────────────

function movePlayer(dt) {
  const turn = 2.3 * dt;
  if (keys.KeyA || keys.ArrowLeft) player.hull += turn;
  if (keys.KeyD || keys.ArrowRight) player.hull -= turn;

  if (keys.KeyW) player.speed += 460 * dt;
  if (keys.KeyS) player.speed -= 320 * dt;
  player.speed -= player.speed * 3 * dt;
  player.speed = Math.max(-100, Math.min(PLAYER.topSpeed, player.speed));

  const nx = player.x + Math.sin(player.hull) * player.speed * dt;
  const nz = player.z + Math.cos(player.hull) * player.speed * dt;

  // Slide along a wall rather than sticking, or every corner becomes a coffin.
  if (!wallAt(nx, player.z, PLAYER.radius)) player.x = nx;
  else player.speed *= 0.15;
  if (!wallAt(player.x, nz, PLAYER.radius)) player.z = nz;
  else player.speed *= 0.15;

  player.x = Math.max(-ARENA, Math.min(ARENA, player.x));
  player.z = Math.max(-ARENA, Math.min(ARENA, player.z));
}

function fire() {
  if (player.cooldown > 0 || paused) return;
  player.cooldown = 0.4;
  world.mine.push({
    x: player.x + Math.sin(player.hull) * 30,
    z: player.z + Math.cos(player.hull) * 30,
    dx: Math.sin(player.hull),
    dz: Math.cos(player.hull),
    life: 1.8,
  });
  shake = 3;
}

function updateShells(dt) {
  const speed = 780;

  world.mine.forEach(s => {
    s.x += s.dx * speed * dt;
    s.z += s.dz * speed * dt;
    s.life -= dt;
    if (s.life <= 0) return;

    const w = wallAt(s.x, s.z, 2);
    if (w) {
      // A shell knocks a wall down. Enough hits and the cover is gone for good,
      // for both sides — which is the whole fight: strip their cover, keep yours.
      w.hp -= 1;
      s.life = 0;
      if (w.hp <= 0) {
        world.walls = world.walls.filter(o => o !== w);
        player.score += 10;
      }
      return;
    }

    for (const e of world.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - s.x, e.z - s.z) < SHELL_HIT) {
        e.alive = false;
        player.score += 100;
        s.life = 0;
        break;
      }
    }
  });
  world.mine = world.mine.filter(s => s.life > 0);

  world.theirs.forEach(s => {
    s.x += s.dx * speed * 0.5 * dt;
    s.z += s.dz * speed * 0.5 * dt;
    s.life -= dt;
    if (wallAt(s.x, s.z, 2)) s.life = 0;

    if (Math.hypot(player.x - s.x, player.z - s.z) < SHELL_HIT + 4) {
      s.life = 0;
      player.health -= 1;
      shake = 7;
      if (player.health <= 0) gameState = 'over';
    }
  });
  world.theirs = world.theirs.filter(s => s.life > 0);
}

function updateEnemies(dt) {
  const settled = performance.now() - runStart > 2500;
  const alive = [];
  for (const e of world.enemies) if (e.alive) alive.push(e);

  for (const e of alive) {
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dist = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(dx, dz);

    let turnTo = want - e.hull;
    while (turnTo > Math.PI) turnTo -= Math.PI * 2;
    while (turnTo < -Math.PI) turnTo += Math.PI * 2;

    // A bit of shoulder-to-shoulder jostle, or fifty tanks become one tank.
    let pushX = 0;
    let pushZ = 0;
    for (const o of alive) {
      if (o === e) continue;
      const ox = e.x - o.x;
      const oz = e.z - o.z;
      const d2 = ox * ox + oz * oz;
      if (d2 > 0.01 && d2 < 4900) {
        const d = Math.sqrt(d2);
        pushX += (ox / d) * (70 - d) * 0.09;
        pushZ += (oz / d) * (70 - d) * 0.09;
      }
    }

    e.hull += Math.max(-2.2 * dt, Math.min(2.2 * dt, turnTo));

    const speed = dist > 150 ? ENEMY.speed : ENEMY.speed * 0.35;
    const nx = e.x + Math.sin(e.hull) * speed * dt + pushX * dt * 6;
    const nz = e.z + Math.cos(e.hull) * speed * dt + pushZ * dt * 6;

    if (!wallAt(nx, e.z, ENEMY.radius)) e.x = nx;
    if (!wallAt(e.x, nz, ENEMY.radius)) e.z = nz;

    e.cooldown -= 60 * dt;
    if (settled && e.cooldown <= 0 && dist < 520 && Math.abs(turnTo) < 0.3) {
      e.cooldown = 240 + Math.random() * 200;
      world.theirs.push({
        x: e.x + Math.sin(e.hull) * 26,
        z: e.z + Math.cos(e.hull) * 26,
        dx: Math.sin(e.hull),
        dz: Math.cos(e.hull),
        life: 3.6,
      });
    }
  }
}

// ── loop ───────────────────────────────────────────────────────────────────

function frame(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  dt = Math.min(dt, 0.05);

  if (gameState === 'playing' && !paused) {
    movePlayer(dt);
    updateEnemies(dt);
    updateShells(dt);
    if (player.cooldown > 0) player.cooldown -= dt;

    // Reinforcements on a clock, so the pressure builds instead of arriving.
    world.nextWave -= dt;
    if (world.nextWave <= 0 && world.spawned < ENEMY_TOTAL) {
      spawnWave();
      world.nextWave = WAVE_SECONDS;
    }

    let anyLeft = false;
    for (const e of world.enemies) if (e.alive) anyLeft = true;
    if (!anyLeft && world.spawned >= ENEMY_TOTAL) gameState = 'won';
  }

  if (paused && pauseTimer > 0) {
    pauseTimer -= 1;
    if (pauseTimer === 0) paused = false;
  }

  if (shake > 0) shake *= 0.85;
  if (shake < 0.4) shake = 0;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  if (gameState === 'start') {
    overlay('BATTLE TANK', [
      'W / S  drive      A / D  or  ← →  turn',
      'SPACE  fire       Q  pause',
      '',
      'Fifty tanks coming for you. Walls stop shells,',
      'but not forever — shoot them out and the cover',
      'is gone for both sides.',
      '',
      'SPACE to start',
    ]);
  } else {
    drawField();
    drawWalls();

    world.enemies.forEach(e => {
      if (e.alive && onScreen(e.x, e.z, 140)) {
        drawTank(e.x, e.z, e.hull, COLORS.enemy, ENEMY, 26);
      }
    });

    drawTank(player.x, player.z, player.hull, COLORS.hull, PLAYER, 32);
    drawShells();
    drawHud();

    if (gameState === 'won') {
      overlay('ARENA CLEARED', ['Score: ' + player.score, '', 'SPACE to go again']);
    } else if (gameState === 'over') {
      overlay('DESTROYED', ['Score: ' + player.score, '', 'SPACE to go again']);
    } else if (paused) {
      const left = 3 - Math.floor(pauseTimer / 60);
      overlay('PAUSED', [pauseTimer > 0 ? 'Resuming in ' + left + 's...' : 'Q to resume']);
    }
  }

  requestAnimationFrame(frame);
}

// ── input ──────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();

  if (gameState !== 'playing') {
    if (e.code === 'Space') { reset(); gameState = 'playing'; }
    return;
  }

  if (e.code === 'Space') fire();

  if (e.code === 'KeyQ') {
    if (!paused) { paused = true; pauseTimer = 0; }
    else if (pauseTimer === 0) pauseTimer = 1;
    else { paused = false; pauseTimer = 0; }
  }
});

document.addEventListener('keyup', e => { keys[e.code] = false; });

reset();
requestAnimationFrame(frame);
