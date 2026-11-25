const games = [
  {
    id: 'flappy-bird',
    name: 'Flappy Bird',
    description: 'Fly through the pipes. Fast. Deadly. One key to jump.',
    controls: 'W / SPACE',
    url: 'flappy-bird/index.html'
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'Classic snake. Eat the food. Don\'t hit a wall or yourself.',
    controls: 'ARROWS / WASD',
    url: 'snake/index.html'
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Smash blue bricks with a bouncing ball. Paddle at the bottom. Keys to move.',
    controls: 'KEYS + SPACE',
    url: 'breakout/index.html'
  },
  {
    id: 'asteroids',
    name: 'Asteroid Dodge',
    description: 'Dodge asteroids in space. Move with arrow keys or WASD. SPACE shoots. SHIFT fires flares.',
    controls: 'WASD / ARROWS + SPACE + SHIFT',
    url: 'asteroids/index.html'
  },
  {
    id: 'pac-man',
    name: 'Pac-Man',
    description: 'Chomp pellets, avoid ghosts, eat power pellets to turn the tables.',
    controls: 'ARROWS / WASD + SPACE',
    url: 'pac-man/index.html'
  },
  {
    id: '2048',
    name: '2048',
    description: 'Slide tiles, merge numbers, reach 2048.',
    controls: 'WASD / ARROWS',
    url: '2048/index.html'
  },
  {
    id: 'space-invaders',
    name: 'Space Invaders',
    description: 'Defend Earth from waves of invaders. Move and shoot to clear them all.',
    controls: 'WASD / ARROWS + SPACE',
    url: 'space-invaders/index.html'
  },
  {
    id: 'tetris',
    name: 'Tetris',
    description: 'Rotate and drop tetrominoes. Clear lines. Speed increases.',
    controls: 'WASD / ARROWS + SPACE',
    url: 'tetris/index.html'
  },
  {
    id: 'traffic',
    name: 'Traffic Dodge',
    description: 'Top-down car dodger. Steer left and right, dodge car doors, tyres, and debris. 3 hits and you are out. Count dodges for score.',
    controls: 'WASD / ARROWS',
    url: 'traffic/index.html'
  },
  {
    id: 'tank',
    name: 'Battle Tank',
    description: 'Top-down tank battle. Drive and turn the hull, fire where you face. Fifty-one tanks arrive in waves and the walls come down as you shoot them.',
    controls: 'WASD / ARROWS + SPACE',
    url: 'tank/index.html'
  },
];

function renderGames() {
  const grid = document.getElementById('game-grid');
  const count = document.getElementById('game-count');

  games.forEach(game => {
    const card = document.createElement('a');
    card.href = game.url;
    card.className = 'game-card';
    card.innerHTML = `
      <span class="play-badge">play ▶</span>
      <h2>${game.name}</h2>
      <p class="description">${game.description}</p>
      <span class="controls">${game.controls}</span>
    `;
    grid.appendChild(card);
  });

  if (count) {
    count.textContent = games.length;
  }
}

document.addEventListener('DOMContentLoaded', renderGames);
// What changed, newest first. One line each, so the homepage says what is new
// without anyone having to read a diff or open GitHub.
const updates = [
  { date: '25 Nov 2026', text: 'New game: Battle Tank. Fifty-one tanks in waves, and walls you can shoot down.' },
  { date: '24 Nov 2026', text: 'Tetris: rotation works, and the start screen no longer spills into the sidebar.' }
];

function renderLatest() {
  const list = document.getElementById('latest-list');
  if (!list) return;
  updates.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="when">${item.date}</span><span class="what">${item.text}</span>`;
    list.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', renderLatest);
