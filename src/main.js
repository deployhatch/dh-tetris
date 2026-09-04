import './style.css';

const COLS = 10;
const ROWS = 20;
const PIECES = {
  I: { color: 'cyan', cells: [[0,1],[1,1],[2,1],[3,1]] },
  J: { color: 'blue', cells: [[0,0],[0,1],[1,1],[2,1]] },
  L: { color: 'orange', cells: [[2,0],[0,1],[1,1],[2,1]] },
  O: { color: 'yellow', cells: [[1,0],[2,0],[1,1],[2,1]] },
  S: { color: 'green', cells: [[1,0],[2,0],[0,1],[1,1]] },
  T: { color: 'purple', cells: [[1,0],[0,1],[1,1],[2,1]] },
  Z: { color: 'red', cells: [[0,0],[1,0],[1,1],[2,1]] }
};
const TYPES = Object.keys(PIECES);

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <header class="masthead"><div class="brand"><span class="brand-mark">D//</span><div><p class="kicker">DROPZONE ARCADE</p><h1>TETRIS</h1></div></div><div class="header-note">SESSION <strong id="session">001</strong><span class="live-dot"></span></div></header>
    <section class="game-layout">
      <aside class="side-panel left-panel"><div class="panel-label">HOLD</div><div class="preview-box" id="hold"></div><div class="side-spacer"></div><div class="panel-label">STATUS</div><div class="status-readout"><span>LINES</span><strong id="lines">000</strong><span>LEVEL</span><strong id="level">01</strong></div></aside>
      <section class="board-wrap"><div class="board-topline"><span id="state-label">READY</span><span>10 × 20 MATRIX</span></div><div class="board" id="board"></div><div class="mobile-controls"><button data-action="left" aria-label="Move left">←</button><button data-action="rotate" aria-label="Rotate">↻</button><button data-action="right" aria-label="Move right">→</button><button data-action="down" aria-label="Soft drop">↓</button><button data-action="drop" aria-label="Hard drop">⇣</button></div></section>
      <aside class="side-panel right-panel"><div class="panel-label">NEXT</div><div class="preview-stack"><div class="preview-box" id="next-0"></div><div class="preview-box" id="next-1"></div><div class="preview-box" id="next-2"></div></div><div class="score-block"><span>SCORE</span><strong id="score">000000</strong><div class="best-row"><span>BEST</span><strong id="best">000000</strong></div></div></aside>
    </section>
    <footer class="footer"><div class="controls"><span><b>← →</b> MOVE</span><span><b>↑</b> ROTATE</span><span><b>SPACE</b> DROP</span><span><b>P</b> PAUSE</span></div><div class="actions"><button id="pause">PAUSE</button><button class="primary" id="restart">NEW GAME</button></div></footer>
    <div class="modal hidden" id="modal"><div class="modal-card"><span class="modal-kicker">RUN COMPLETE</span><h2 id="modal-title">GAME OVER</h2><p id="modal-copy">The matrix is full.</p><button class="primary" id="modal-restart">PLAY AGAIN</button></div></div>
  </main>`;

const boardEl = document.querySelector('#board');
const boardCells = [];
for (let i = 0; i < COLS * ROWS; i++) { const cell = document.createElement('div'); cell.className = 'cell'; boardEl.appendChild(cell); boardCells.push(cell); }
const els = { score: document.querySelector('#score'), best: document.querySelector('#best'), lines: document.querySelector('#lines'), level: document.querySelector('#level'), state: document.querySelector('#state-label'), pause: document.querySelector('#pause'), modal: document.querySelector('#modal'), modalTitle: document.querySelector('#modal-title'), modalCopy: document.querySelector('#modal-copy'), hold: document.querySelector('#hold') };
let board, current, queue, held, canHold, score, lines, level, dropTimer, paused, over;
let best = Number(localStorage.getItem('dropzone-best') || 0);
els.best.textContent = String(best).padStart(6, '0');

function newPiece(type = randomType()) { return { type, x: 3, y: -1, rotation: 0, cells: PIECES[type].cells.map(([x,y]) => [x,y]) }; }
function randomType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }
function refillQueue() { while (queue.length < 5) queue.push(randomType()); }
function reset() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); queue = []; refillQueue(); current = newPiece(queue.shift()); refillQueue(); held = null; canHold = true; score = 0; lines = 0; level = 1; paused = false; over = false; els.modal.classList.add('hidden'); els.pause.textContent = 'PAUSE'; els.state.textContent = 'PLAYING'; restartTimer(); render(); }
function rotatedCells(piece) { let cells = piece.cells.map(([x,y]) => [x,y]); for (let r = 0; r < piece.rotation % 4; r++) { cells = cells.map(([x,y]) => [-y, x]); } const minX = Math.min(...cells.map(([x]) => x)); const minY = Math.min(...cells.map(([,y]) => y)); return cells.map(([x,y]) => [x - minX, y - minY]); }
function fits(piece, dx = 0, dy = 0, rotation = piece.rotation) { const test = { ...piece, x: piece.x + dx, y: piece.y + dy, rotation }; for (const [x,y] of rotatedCells(test)) { const bx = test.x + x, by = test.y + y; if (bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by][bx])) return false; } return true; }
function move(dx, dy) { if (paused || over) return false; if (fits(current, dx, dy)) { current.x += dx; current.y += dy; render(); return true; } return false; }
function rotate() { if (paused || over) return; const next = (current.rotation + 1) % 4; for (const kick of [0, -1, 1, -2, 2]) if (fits(current, kick, 0, next)) { current.x += kick; current.rotation = next; render(); return; } }
function hardDrop() { if (paused || over) return; let distance = 0; while (fits(current, 0, 1)) { current.y++; distance++; } score += distance * 2; lock(); }
function lock() { for (const [x,y] of rotatedCells(current)) { const bx = current.x+x, by = current.y+y; if (by < 0) return endGame(); board[by][bx] = PIECES[current.type].color; } clearLines(); current = newPiece(queue.shift()); refillQueue(); canHold = true; if (!fits(current)) endGame(); restartTimer(); render(); }
function clearLines() { const cleared = board.filter(row => row.every(Boolean)).length; if (!cleared) return; board = board.filter(row => !row.every(Boolean)); while (board.length < ROWS) board.unshift(Array(COLS).fill(null)); const points = [0,100,300,500,800][cleared] * level; score += points; lines += cleared; level = Math.floor(lines / 10) + 1; }
function holdPiece() { if (!canHold || paused || over) return; const type = held; held = current.type; current = newPiece(type || queue.shift()); canHold = false; refillQueue(); render(); }
function tick() { if (!move(0, 1)) lock(); }
function restartTimer() { clearInterval(dropTimer); if (!paused && !over) dropTimer = setInterval(tick, Math.max(90, 850 - (level - 1) * 65)); }
function renderPreview(container, type, small = false) { container.innerHTML = ''; if (!type) return; const piece = newPiece(type); for (const [x,y] of rotatedCells(piece)) { const block = document.createElement('i'); block.className = `mini-block ${PIECES[type].color}`; block.style.left = `${x * (small ? 16 : 20) + 18}px`; block.style.top = `${y * (small ? 16 : 20) + 16}px`; container.appendChild(block); } }
function render() { boardCells.forEach(cell => { cell.className = 'cell'; }); board.forEach((row,y) => row.forEach((color,x) => { if (color) boardCells[y*COLS+x].classList.add(color, 'locked'); })); if (!over) for (const [x,y] of rotatedCells(current)) { const bx=current.x+x, by=current.y+y; if (by >= 0) boardCells[by*COLS+bx].classList.add(PIECES[current.type].color, 'active'); } renderPreview(els.hold, held); renderPreview(document.querySelector('#next-0'), queue[0], true); renderPreview(document.querySelector('#next-1'), queue[1], true); renderPreview(document.querySelector('#next-2'), queue[2], true); els.score.textContent = String(score).padStart(6, '0'); els.lines.textContent = String(lines).padStart(3, '0'); els.level.textContent = String(level).padStart(2, '0'); }
function togglePause() { if (over) return; paused = !paused; els.pause.textContent = paused ? 'RESUME' : 'PAUSE'; els.state.textContent = paused ? 'PAUSED' : 'PLAYING'; if (paused) clearInterval(dropTimer); else restartTimer(); render(); }
function endGame() { over = true; clearInterval(dropTimer); els.state.textContent = 'GAME OVER'; if (score > best) { best = score; localStorage.setItem('dropzone-best', best); els.best.textContent = String(best).padStart(6, '0'); } els.modalTitle.textContent = 'GAME OVER'; els.modalCopy.textContent = `Score ${String(score).padStart(6,'0')} · ${lines} lines cleared`; els.modal.classList.remove('hidden'); render(); }

document.addEventListener('keydown', event => { const actions = { ArrowLeft: () => move(-1,0), ArrowRight: () => move(1,0), ArrowDown: () => move(0,1), ArrowUp: rotate, ' ': hardDrop, c: holdPiece, C: holdPiece, p: togglePause, P: togglePause }; if (actions[event.key]) { event.preventDefault(); actions[event.key](); } });
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => ({ left: () => move(-1,0), right: () => move(1,0), rotate, down: () => move(0,1), drop: hardDrop }[button.dataset.action])()));
els.pause.addEventListener('click', togglePause); document.querySelector('#restart').addEventListener('click', reset); document.querySelector('#modal-restart').addEventListener('click', reset); reset();
