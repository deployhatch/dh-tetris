const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const overlay = document.querySelector('#overlay');
const startButton = document.querySelector('#startButton');
const scoreElement = document.querySelector('#score');
const bestElement = document.querySelector('#best');
const statusText = document.querySelector('#statusText');
const gridSize = 24;
const cellSize = canvas.width / gridSize;
let snake;
let food;
let direction;
let nextDirection;
let score = 0;
let timer;
let paused = false;
let best = Number(localStorage.getItem('neon-snake-best') || 0);
bestElement.textContent = String(best).padStart(4, '0');

function resetGame() {
  snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
  direction = { x: 1, y: 0 };
  nextDirection = direction;
  score = 0;
  scoreElement.textContent = '0000';
  placeFood();
  paused = false;
  statusText.textContent = 'RUN IN PROGRESS';
  overlay.classList.add('hidden');
  clearInterval(timer);
  timer = setInterval(tick, 115);
  draw();
}

function placeFood() {
  do { food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) }; }
  while (snake.some((segment) => segment.x === food.x && segment.y === food.y));
}

function tick() {
  if (paused) return;
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
  const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);
  if (hitWall || hitSelf) return endGame();
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = String(score).padStart(4, '0');
    if (score > best) { best = score; bestElement.textContent = String(best).padStart(4, '0'); localStorage.setItem('neon-snake-best', best); }
    placeFood();
  } else snake.pop();
  draw();
}

function endGame() {
  clearInterval(timer);
  statusText.textContent = 'RUN COMPLETE';
  overlay.querySelector('.overlay-kicker').textContent = 'SIGNAL LOST';
  overlay.querySelector('h2').innerHTML = `Score ${String(score).padStart(4, '0')}<br>Keep going.`;
  startButton.innerHTML = 'Try again <span>→</span>';
  overlay.classList.remove('hidden');
}

function draw() {
  context.fillStyle = '#0b1a20';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(200, 240, 90, .06)';
  context.lineWidth = 1;
  for (let index = 1; index < gridSize; index += 1) { context.beginPath(); context.moveTo(index * cellSize, 0); context.lineTo(index * cellSize, canvas.height); context.stroke(); context.beginPath(); context.moveTo(0, index * cellSize); context.lineTo(canvas.width, index * cellSize); context.stroke(); }
  context.fillStyle = '#ff7448';
  context.shadowColor = '#ff7448'; context.shadowBlur = 18;
  context.fillRect(food.x * cellSize + 5, food.y * cellSize + 5, cellSize - 10, cellSize - 10);
  context.shadowBlur = 0;
  snake.forEach((segment, index) => { context.fillStyle = index === 0 ? '#f1f3ed' : '#c8f05a'; context.fillRect(segment.x * cellSize + 2, segment.y * cellSize + 2, cellSize - 4, cellSize - 4); });
}

function setDirection(newDirection) { if (newDirection.x + direction.x !== 0 || newDirection.y + direction.y !== 0) nextDirection = newDirection; }
document.addEventListener('keydown', (event) => { const keys = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } }; if (keys[event.key]) { event.preventDefault(); setDirection(keys[event.key]); } if (event.code === 'Space' && snake) { paused = !paused; statusText.textContent = paused ? 'PAUSED' : 'RUN IN PROGRESS'; } });
startButton.addEventListener('click', resetGame);
snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
placeFood();
draw();
