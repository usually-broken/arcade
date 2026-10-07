const gridEl = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');

const SIZE = 4;
const TILE_COLORS = {
  2: '#e0e7ff', 4: '#c7d2fe', 8: '#a5b4fc', 16: '#818cf8',
  32: '#6366f1', 64: '#4f46e5', 128: '#4338ca', 256: '#3730a3',
  512: '#312e81', 1024: '#1e1b4b', 2048: '#ffd700',
};

let grid, score, best, cellEls, gameOver, won;

function init() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  gameOver = false;
  won = false;
  best = parseInt(localStorage.getItem('best2048') || '0');
  spawnCell(); spawnCell(); spawnCell(); spawnCell();
  render();
}

function emptyCells() {
  const cells = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === 0) cells.push({ r, c });
  return cells;
}

function spawnCell() {
  const empty = emptyCells();
  if (empty.length === 0) return;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
}

function slideLeft(row) {
  let filtered = row.filter(v => v !== 0);
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      score += filtered[i];
      filtered[i + 1] = 0;
    }
  }
  filtered = filtered.filter(v => v !== 0);
  while (filtered.length < SIZE) filtered.push(0);
  return filtered;
}

function moveGrid(dir) {
  const oldGrid = grid.map(r => [...r]);
  if (dir === 'left') {
    for (let r = 0; r < SIZE; r++) grid[r] = slideLeft(grid[r]);
  } else if (dir === 'right') {
    for (let r = 0; r < SIZE; r++) grid[r] = slideLeft(grid[r].reverse()).reverse();
  } else if (dir === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
      const slid = slideLeft(col);
      for (let r = 0; r < SIZE; r++) grid[r][c] = slid[r];
    }
  } else if (dir === 'down') {
    for (let c = 0; c < SIZE; c++) {
      const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
      const slid = slideLeft(col.reverse()).reverse();
      for (let r = 0; r < SIZE; r++) grid[r][c] = slid[r];
    }
  }
  let changed = false;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (grid[r][c] !== oldGrid[r][c]) changed = true;
  }
  return changed;
}

function checkWin() {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === 2048 && !won) {
    won = true; return true;
  }
  return false;
}

function checkGameOver() {
  if (emptyCells().length > 0) return false;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const v = grid[r][c];
    if (c < SIZE - 1 && grid[r][c + 1] === v) return false;
    if (r < SIZE - 1 && grid[r + 1][c] === v) return false;
  }
  return true;
}

function render() {
  gridEl.innerHTML = '';
  cellEls = [];
  for (let r = 0; r < SIZE; r++) {
    cellEls[r] = [];
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const val = grid[r][c];
      if (val > 0) {
        cell.textContent = val;
        cell.style.background = TILE_COLORS[val] || '#1e1b4b';
        cell.style.color = val >= 64 ? '#fff' : '#1e293b';
      } else {
        cell.style.background = '#dbeafe';
      }
      gridEl.appendChild(cell);
      cellEls[r][c] = cell;
    }
  }
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    localStorage.setItem('best2048', String(best));
  }
  bestEl.textContent = best;
}

function update() {
  statusEl.textContent = '';
  if (checkWin()) { statusEl.textContent = 'YOU WIN. 2048 reached.'; }
  if (checkGameOver()) { statusEl.textContent = 'GAME OVER. No moves left.'; gameOver = true; }
}

function handleMove(dir) {
  if (gameOver) return;
  const changed = moveGrid(dir);
  if (changed) {
    spawnCell();
    render();
    update();
  }
}

const keys = { left: false, right: false, up: false, down: false };

document.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') handleMove('left');
  if (e.code === 'KeyD' || e.code === 'ArrowRight') handleMove('right');
  if (e.code === 'KeyW' || e.code === 'ArrowUp') handleMove('up');
  if (e.code === 'KeyS' || e.code === 'ArrowDown') handleMove('down');
});

init();
