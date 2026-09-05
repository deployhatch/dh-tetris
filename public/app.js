const WIDTH = 10;
const HEIGHT = 20;
const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[1, 0], [2, 0], [1, 1], [2, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]]
};
const COLORS = { I: '#53d3b6', O: '#ffcc55', T: '#bb8cff', S: '#87d963', Z: '#ff735f', J: '#6ca9ff', L: '#ff9b63' };
const TYPES = Object.keys(SHAPES);
const boardElement = document.querySelector('#board');
const nextElement = document.querySelector('#next-piece');
const holdElement = document.querySelector('#hold-piece');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlay-title');
const overlayCopy = document.querySelector('#overlay-copy');
const statusElement = document.querySelector('#game-status');

let board;
let active;
let nextType;
let holdType;
let canHold;
let score;
let lines;
let level;
let paused;
let gameOver;
let fallTimer;
let highScore = Number(localStorage.getItem('dh-tetris-high-score')) || 0;

function randomType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }
function createBoard() { return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null)); }
function createPiece(type) { return { type, rotation: 0, x: 3, y: 0 }; }
function cellsFor(piece) {
  let cells = SHAPES[piece.type].map(([x, y]) => [x, y]);
  for (let turn = 0; turn < piece.rotation; turn += 1) cells = cells.map(([x, y]) => [-y, x]);
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX + piece.x, y - minY + piece.y]);
}
function collides(piece) {
  return cellsFor(piece).some(([x, y]) => x < 0 || x >= WIDTH || y >= HEIGHT || (y >= 0 && board[y][x]));
}
function mergePiece() {
  cellsFor(active).forEach(([x, y]) => { if (y >= 0) board[y][x] = active.type; });
}
function rotatePiece() {
  const rotated = { ...active, rotation: (active.rotation + 1) % 4 };
  if (!collides(rotated)) active = rotated;
  else if (!collides({ ...rotated, x: rotated.x - 1 })) active = { ...rotated, x: rotated.x - 1 };
  else if (!collides({ ...rotated, x: rotated.x + 1 })) active = { ...rotated, x: rotated.x + 1 };
}
function movePiece(deltaX) { const moved = { ...active, x: active.x + deltaX }; if (!collides(moved)) active = moved; }
function softDrop() { if (paused || gameOver) return; const moved = { ...active, y: active.y + 1 }; if (!collides(moved)) { active = moved; score += 1; } else lockPiece(); }
function hardDrop() {
  if (paused || gameOver) return;
  let distance = 0;
  while (!collides({ ...active, y: active.y + 1 })) { active = { ...active, y: active.y + 1 }; distance += 1; }
  score += distance * 2;
  lockPiece();
}
function lockPiece() {
  mergePiece();
  clearLines();
  canHold = true;
  active = createPiece(nextType);
  nextType = randomType();
  if (collides(active)) endGame();
}
function clearLines() {
  const remaining = board.filter(row => row.some(cell => !cell));
  const cleared = HEIGHT - remaining.length;
  while (remaining.length < HEIGHT) remaining.unshift(Array(WIDTH).fill(null));
  board = remaining;
  if (cleared) { lines += cleared; score += [0, 100, 300, 500, 800][cleared] * level; level = Math.floor(lines / 10) + 1; resetTimer(); }
}
function holdPiece() {
  if (!canHold || paused || gameOver) return;
  const previous = holdType;
  holdType = active.type;
  active = createPiece(previous || nextType);
  if (!previous) nextType = randomType();
  canHold = false;
}
function resetTimer() { clearInterval(fallTimer); fallTimer = setInterval(softDrop, Math.max(90, 750 - (level - 1) * 55)); }
function startGame() {
  board = createBoard(); active = createPiece(randomType()); nextType = randomType(); holdType = null; canHold = true;
  score = 0; lines = 0; level = 1; paused = false; gameOver = false;
  overlay.classList.add('hidden'); statusElement.textContent = 'RUNNING'; resetTimer(); render();
}
function endGame() {
  gameOver = true; clearInterval(fallTimer); highScore = Math.max(highScore, score); localStorage.setItem('dh-tetris-high-score', highScore);
  overlayTitle.textContent = 'GAME OVER'; overlayCopy.textContent = `Final score ${String(score).padStart(6, '0')}.`; statusElement.textContent = 'RUN COMPLETE'; overlay.classList.remove('hidden'); render();
}
function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) { clearInterval(fallTimer); overlayTitle.textContent = 'PAUSED'; overlayCopy.textContent = 'Take a breath. The stack is waiting.'; overlay.classList.remove('hidden'); statusElement.textContent = 'PAUSED'; }
  else { overlay.classList.add('hidden'); statusElement.textContent = 'RUNNING'; resetTimer(); }
  render();
}
function renderPreview(element, type) {
  element.innerHTML = '';
  const cells = type ? new Set(SHAPES[type].map(([x, y]) => `${x},${y}`)) : new Set();
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
    const cell = document.createElement('div'); cell.className = `preview-cell${cells.has(`${x},${y}`) ? ' filled' : ''}`;
    if (cells.has(`${x},${y}`)) cell.style.setProperty('--piece-color', COLORS[type]); element.appendChild(cell);
  }
}
function render() {
  boardElement.innerHTML = '';
  const visible = board.map(row => row.slice());
  if (!gameOver && !paused) {
    const ghost = { ...active };
    while (!collides({ ...ghost, y: ghost.y + 1 })) ghost.y += 1;
    cellsFor(ghost).forEach(([x, y]) => { if (y >= 0 && !visible[y][x]) visible[y][x] = `${ghost.type}:ghost`; });
  }
  if (!gameOver) cellsFor(active).forEach(([x, y]) => { if (y >= 0) visible[y][x] = active.type; });
  visible.forEach(row => row.forEach(value => { const cell = document.createElement('div'); cell.className = `cell${value ? (value.includes(':ghost') ? ' ghost' : ' filled') : ''}`; if (value) cell.style.setProperty('--piece-color', COLORS[value.split(':')[0]]); boardElement.appendChild(cell); }));
  document.querySelector('#score').textContent = String(score).padStart(6, '0'); document.querySelector('#lines').textContent = String(lines).padStart(3, '0'); document.querySelector('#level').textContent = String(level).padStart(2, '0'); document.querySelector('#high-score-label').textContent = `BEST ${String(highScore).padStart(6, '0')}`; document.querySelector('#hold-state').textContent = canHold ? 'AVAILABLE' : 'USED';
  renderPreview(nextElement, nextType); renderPreview(holdElement, holdType);
}

document.addEventListener('keydown', event => {
  const gameplayKeys = ['KeyP', 'KeyC', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'];
  if (!gameplayKeys.includes(event.code)) return;
  event.preventDefault();
  if (event.code === 'KeyP') togglePause();
  if (event.code === 'KeyC') holdPiece();
  if (event.code === 'ArrowLeft') movePiece(-1);
  if (event.code === 'ArrowRight') movePiece(1);
  if (event.code === 'ArrowDown') softDrop();
  if (event.code === 'ArrowUp') rotatePiece();
  if (event.code === 'Space') hardDrop();
  render();
});
document.querySelector('#pause-button').addEventListener('click', togglePause);
document.querySelector('#restart-button').addEventListener('click', startGame);
document.querySelector('#restart-overlay').addEventListener('click', startGame);
startGame();