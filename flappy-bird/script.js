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
recalc();
window.addEventListener('resize', resize);

var GRAVITY = 0.35;
var JUMP = -9.5;
var PIPE_SPEED = 12;
var PIPE_WIDTH = 70;
var PIPE_GAP = 280;
var PIPE_SPACING = 500;
var BIRD_SIZE = 28;
var GROUND_H = 50;
var PLAY_H = H - GROUND_H;

function recalc() { PLAY_H = H - GROUND_H; }

let bird, pipes, score, state, frameCount, groundX, paused, pauseTimer;
let speedLines = [];

function reset() {
  bird = { x: W * 0.25, y: H * 0.4, vy: 0, size: BIRD_SIZE };
  pipes = [];
  score = 0;
  state = 'start';
  frameCount = 0;
  groundX = 0;
  paused = false;
  pauseTimer = 0;
}
reset();

function spawnPipe() {
  const topH = Math.random() * (PLAY_H - PIPE_GAP - 80) + 40;
  pipes.push({ x: W + PIPE_WIDTH, topH: topH, scored: false });
}

function drawSky() {
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const cloudOffset = (frameCount * 0.3) % (W + 200);
  for (let i = -1; i < W / 180 + 1; i++) {
    const cx = i * 200 - cloudOffset;
    ctx.beginPath();
    ctx.arc(cx, H * 0.12, 35, 0, Math.PI * 2);
    ctx.arc(cx + 30, H * 0.08, 45, 0, Math.PI * 2);
    ctx.arc(cx + 70, H * 0.12, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(0, PLAY_H, W, GROUND_H);
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, PLAY_H, W, 6);
  ctx.fillStyle = '#7A5A10';
  const offset = groundX % 40;
  for (let x = -offset; x < W + 40; x += 40) {
    ctx.fillRect(x, PLAY_H + 20, 20, 3);
  }
}

function drawPipe(pipe) {
  ctx.fillStyle = '#228B22';
  ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);
  ctx.fillRect(pipe.x - 6, pipe.topH - 30, PIPE_WIDTH + 12, 30);
  ctx.fillStyle = '#1A6B1A';
  ctx.fillRect(pipe.x + 2, 0, PIPE_WIDTH - 4, pipe.topH);
  ctx.fillStyle = '#228B22';
  ctx.fillRect(pipe.x + 6, 0, PIPE_WIDTH - 12, pipe.topH - 30);

  const bottomY = pipe.topH + PIPE_GAP;
  ctx.fillStyle = '#228B22';
  ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, PLAY_H - bottomY);
  ctx.fillStyle = '#1A6B1A';
  ctx.fillRect(pipe.x + 2, bottomY, PIPE_WIDTH - 4, PLAY_H - bottomY);
  ctx.fillStyle = '#228B22';
  ctx.fillRect(pipe.x - 6, bottomY, PIPE_WIDTH + 12, 30);
  ctx.fillStyle = '#1A6B1A';
  ctx.fillRect(pipe.x + 6, bottomY + 30, PIPE_WIDTH - 12, PLAY_H - bottomY - 30);
}

function drawBird() {
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(bird.x - bird.size / 2, bird.y - bird.size / 2, bird.size, bird.size);
  ctx.fillStyle = '#000';
  ctx.fillRect(bird.x + 4, bird.y - bird.size / 2 + 6, 6, 6);
  ctx.fillStyle = '#FF6600';
  ctx.fillRect(bird.x + bird.size / 2 - 2, bird.y - 2, 10, 5);
  ctx.fillStyle = '#FFAA00';
  const wingY = bird.vy < 0 ? bird.y - 8 : bird.y + 2;
  ctx.fillRect(bird.x - bird.size / 2 - 6, wingY, 12, 8);
}

function drawScore() {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 48px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(score, W / 2, 70);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(score, W / 2, 70);
}

function drawSpeedLines() {
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (const line of speedLines) {
    ctx.beginPath();
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(line.x + line.len, line.y - 8);
    ctx.stroke();
  }
}

function drawStartScreen() {
  drawSky();
  drawGround();
  drawBird();

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, H * 0.35, W, H * 0.3);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 36px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('FLAPPY BIRD', W / 2, H * 0.42);
  ctx.font = '18px Courier New';
  ctx.fillText('SPACE to start', W / 2, H * 0.5);
  ctx.font = '14px Courier New';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('SPACE to jump when playing', W / 2, H * 0.55);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 40px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, H * 0.38);
  ctx.font = '28px Courier New';
  ctx.fillText('Score: ' + score, W / 2, H * 0.46);
  ctx.font = '18px Courier New';
  ctx.fillText('SPACE to restart', W / 2, H * 0.54);
}

function update() {
  if (paused) { if (pauseTimer > 0) { pauseTimer++; if (pauseTimer >= 180) { paused = false; pauseTimer = 0; } } return; }
  frameCount++;
  groundX += PIPE_SPEED;

  bird.vy += GRAVITY;
  bird.y += bird.vy;

  if (bird.y + bird.size / 2 >= PLAY_H) {
    bird.y = PLAY_H - bird.size / 2;
    if (state === 'playing') {
      state = 'dead';
    }
  }

  if (bird.y - bird.size / 2 <= 0) {
    bird.y = bird.size / 2;
    bird.vy = 0;
  }

  if (state === 'playing') {
    if (frameCount % 3 === 0) {
      speedLines.push({
        x: W + 20,
        y: Math.random() * PLAY_H,
        len: 30 + Math.random() * 60,
      });
    }
    for (let i = speedLines.length - 1; i >= 0; i--) {
      speedLines[i].x -= PIPE_SPEED * 2.5;
      if (speedLines[i].x + speedLines[i].len < 0) {
        speedLines.splice(i, 1);
      }
    }

    const lastPipe = pipes[pipes.length - 1];
    if (!lastPipe || lastPipe.x < W - PIPE_SPACING) {
      spawnPipe();
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= PIPE_SPEED;

      if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
        score++;
        pipes[i].scored = true;
      }

      const bL = bird.x - bird.size / 2;
      const bR = bird.x + bird.size / 2;
      const bT = bird.y - bird.size / 2;
      const bB = bird.y + bird.size / 2;

      const pL = pipes[i].x;
      const pR = pipes[i].x + PIPE_WIDTH;

      if (bR > pL && bL < pR) {
        const bottomY = pipes[i].topH + PIPE_GAP;
        if (bT < pipes[i].topH || bB > bottomY) {
          state = 'dead';
        }
      }

      if (pipes[i].x + PIPE_WIDTH < 0) {
        pipes.splice(i, 1);
      }
    }
  }
}

function draw() {
  if (state === 'start') {
    drawStartScreen();
    return;
  }

  drawSky();

  for (const p of pipes) {
    drawPipe(p);
  }

  drawSpeedLines();
  drawGround();
  drawBird();
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

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'KeyW') {
    e.preventDefault();
    if (state === 'start') {
      state = 'playing';
      bird.vy = JUMP;
    } else if (state === 'playing') {
      bird.vy = JUMP;
    } else if (state === 'dead') {
      reset();
    }
  }
  if (e.code === 'KeyQ' && state === 'playing') {
  if (!paused) { paused = true; pauseTimer = 0; }
  else if (pauseTimer === 0) { pauseTimer = 1; }
  else { paused = false; pauseTimer = 0; }
}
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
// Settings panel
(function() {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(255,255,255,0.92);padding:12px 14px;border-radius:8px;border:1px solid #dbeafe;font-family:Courier New,monospace;box-shadow:0 2px 8px rgba(37,99,235,0.15);z-index:100;min-width:180px;';
  const title = document.createElement('div');
  title.textContent = 'Game Settings';
  title.style.cssText = 'font-weight:700;color:#2563eb;font-size:0.9rem;margin-bottom:10px;border-bottom:1px solid #dbeafe;padding-bottom:6px;';
  panel.appendChild(title);

  const params = [
    {label:'Gravity', key:'GRAVITY', min:0.1, max:1.0, step:0.05},
    {label:'Jump Force', key:'JUMP', min:-15, max:0, step:0.5},
    {label:'Pipe Speed', key:'PIPE_SPEED', min:5, max:25, step:0.5},
    {label:'Pipe Width', key:'PIPE_WIDTH', min:30, max:120, step:5},
    {label:'Pipe Gap', key:'PIPE_GAP', min:150, max:400, step:10},
    {label:'Pipe Spacing', key:'PIPE_SPACING', min:200, max:800, step:20},
    {label:'Bird Size', key:'BIRD_SIZE', min:15, max:50, step:1},
    {label:'Ground Height', key:'GROUND_H', min:20, max:100, step:5},
  ];

  params.forEach(function(p) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:6px;display:flex;align-items:center;gap:6px;';
    const label = document.createElement('label');
    label.textContent = p.label;
    label.style.cssText = 'font-size:0.75rem;color:#1e293b;width:75px;flex-shrink:0;';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = p.min; slider.max = p.max; slider.step = p.step;
    slider.value = window[p.key];
    slider.style.cssText = 'flex:1;height:4px;accent-color:#2563eb;';
    const val = document.createElement('span');
    val.textContent = window[p.key];
    val.style.cssText = 'font-size:0.75rem;color:#2563eb;font-weight:700;width:30px;text-align:right;flex-shrink:0;';
    slider.addEventListener('input', function() {
      window[p.key] = parseFloat(slider.value);
      val.textContent = parseFloat(slider.value);
      if (p.key === 'GROUND_H') recalc();
    });
    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(val);
    panel.appendChild(row);
  });

  document.body.appendChild(panel);
})();

loop();