/* ===== 贪吃蛇游戏逻辑 ===== */

// ===== DOM 元素引用 =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const overlayBtn = document.getElementById('overlay-btn');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');

// ===== 游戏配置 =====
const GRID_SIZE = 20;       // 网格大小（像素）
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;
const TICK_INTERVAL = 150;  // 游戏更新间隔（毫秒）

// ===== 游戏状态 =====
let snake = [];
let food = {};
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let gameRunning = false;
let gamePaused = false;
let gameOver = false;
let gameLoop = null;

// ===== 颜色配置 =====
const COLORS = {
  bg: '#0a0a1a',
  grid: '#111128',
  snakeHead: '#6c5ce7',
  snakeBody: '#a29bfe',
  snakeOutline: '#4a3bb5',
  food: '#e17055',
  foodGlow: 'rgba(225, 112, 85, 0.3)',
  text: '#e8e8f0',
};

// ===== 初始化 =====
highScoreEl.textContent = highScore;
showOverlay('🐍 贪吃蛇', '按「开始游戏」或空格键开始', '开始游戏');

// ===== 核心函数 =====

/** 初始化蛇的位置（居中） */
function initSnake() {
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
}

/** 生成食物（确保不在蛇身上） */
function generateFood() {
  const totalCells = COLS * ROWS;
  if (snake.length >= totalCells) return false; // 蛇占满格子 → 胜利

  const snakeSet = new Set(snake.map(cell => `${cell.x},${cell.y}`));
  const freeCells = [];
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (!snakeSet.has(`${x},${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }
  food = freeCells[Math.floor(Math.random() * freeCells.length)];
  return true;
}

/** 重置游戏状态 */
function resetGame() {
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
  initSnake();
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  gameRunning = false;
  gamePaused = false;
  gameOver = false;
  scoreEl.textContent = '0';
  btnStart.textContent = '开始游戏';
  btnPause.disabled = true;
  btnPause.textContent = '暂停';
  generateFood();
  draw();
}

/** 开始游戏 */
function startGame() {
  if (gameOver || gameRunning) {
    resetGame();
  }
  hideOverlay();
  gameRunning = true;
  gameOver = false;
  btnStart.textContent = '重新开始';
  btnPause.disabled = false;
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, TICK_INTERVAL);
}

/** 暂停/继续切换 */
function togglePause() {
  if (!gameRunning || gameOver) return;
  gamePaused = !gamePaused;
  btnPause.textContent = gamePaused ? '继续' : '暂停';
  if (gamePaused) {
    showOverlay('⏸ 已暂停', '按空格键继续', '继续');
    overlayBtn.onclick = () => togglePause();
  } else {
    hideOverlay();
    overlayBtn.onclick = () => startGame();
  }
}

/** 重新开始游戏 */
function restartGame() {
  resetGame();
  startGame();
}

/** 游戏更新逻辑（每个 tick 执行一次） */
function update() {
  if (!gameRunning || gamePaused) return;

  // 应用下一个有效方向
  if (!isOpposite(nextDirection, direction)) {
    direction = { ...nextDirection };
  }

  // 计算蛇头新位置
  const head = snake[0];
  const newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  // 检查碰撞
  if (isOutOfBounds(newHead) || isSelfCollision(newHead)) {
    endGame();
    return;
  }

  // 移动蛇
  snake.unshift(newHead);

  // 检查是否吃到食物
  if (newHead.x === food.x && newHead.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem('snakeHighScore', highScore);
    }
    if (!generateFood()) {
      // 蛇占满格子 → 胜利
      victory();
      return;
    }
  } else {
    snake.pop();
  }

  draw();
}

/** 游戏结束处理 */
function endGame() {
  gameRunning = false;
  gameOver = true;
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
  btnPause.disabled = true;
  btnPause.textContent = '暂停';
  btnStart.textContent = '重新开始';
  showOverlay('💀 游戏结束', `得分：${score} 分`, '再来一次');
  overlayBtn.onclick = () => startGame();
}

/** 胜利处理（蛇占满全部格子） */
function victory() {
  gameRunning = false;
  gameOver = true;
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
  btnPause.disabled = true;
  btnPause.textContent = '暂停';
  btnStart.textContent = '重新开始';
  showOverlay('🎉 恭喜通关！', `满分！${score} 分`, '再来一次');
  overlayBtn.onclick = () => startGame();
}

// ===== 碰撞检测辅助函数 =====

function isOutOfBounds(pos) {
  return pos.x < 0 || pos.x >= COLS || pos.y < 0 || pos.y >= ROWS;
}

function isSelfCollision(pos) {
  return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

function isOpposite(dir1, dir2) {
  return dir1.x === -dir2.x && dir1.y === -dir2.y;
}

// ===== 绘制函数 =====

/** 绘制整个游戏画面 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制背景和网格
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * GRID_SIZE, 0);
    ctx.lineTo(x * GRID_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * GRID_SIZE);
    ctx.lineTo(canvas.width, y * GRID_SIZE);
    ctx.stroke();
  }

  // 绘制食物（发光效果）
  const fx = food.x * GRID_SIZE;
  const fy = food.y * GRID_SIZE;
  const gradient = ctx.createRadialGradient(
    fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, 2,
    fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, GRID_SIZE
  );
  gradient.addColorStop(0, COLORS.food);
  gradient.addColorStop(1, COLORS.foodGlow);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, GRID_SIZE / 2 - 1, 0, Math.PI * 2);
  ctx.fill();

  // 绘制蛇
  snake.forEach((segment, index) => {
    const x = segment.x * GRID_SIZE;
    const y = segment.y * GRID_SIZE;
    const padding = 1;

    // 蛇身圆角矩形
    const isHead = index === 0;
    const radius = 4;
    const w = GRID_SIZE - padding * 2;
    const h = GRID_SIZE - padding * 2;

    ctx.fillStyle = isHead ? COLORS.snakeHead : COLORS.snakeBody;
    ctx.beginPath();
    ctx.moveTo(x + padding + radius, y + padding);
    ctx.lineTo(x + padding + w - radius, y + padding);
    ctx.quadraticCurveTo(x + padding + w, y + padding, x + padding + w, y + padding + radius);
    ctx.lineTo(x + padding + w, y + padding + h - radius);
    ctx.quadraticCurveTo(x + padding + w, y + padding + h, x + padding + w - radius, y + padding + h);
    ctx.lineTo(x + padding + radius, y + padding + h);
    ctx.quadraticCurveTo(x + padding, y + padding + h, x + padding, y + padding + h - radius);
    ctx.lineTo(x + padding, y + padding + radius);
    ctx.quadraticCurveTo(x + padding, y + padding, x + padding + radius, y + padding);
    ctx.closePath();
    ctx.fill();

    // 蛇头眼睛
    if (isHead) {
      ctx.fillStyle = '#fff';
      const cx = x + GRID_SIZE / 2;
      const cy = y + GRID_SIZE / 2;
      const eyeOffset = 3;
      const eyeRadius = 2.5;

      // 根据方向画眼睛
      let eye1, eye2;
      if (direction.x === 1) {
        // 向右
        eye1 = { x: cx + 3, y: cy - eyeOffset };
        eye2 = { x: cx + 3, y: cy + eyeOffset };
      } else if (direction.x === -1) {
        eye1 = { x: cx - 3, y: cy - eyeOffset };
        eye2 = { x: cx - 3, y: cy + eyeOffset };
      } else if (direction.y === -1) {
        eye1 = { x: cx - eyeOffset, y: cy - 3 };
        eye2 = { x: cx + eyeOffset, y: cy - 3 };
      } else {
        eye1 = { x: cx - eyeOffset, y: cy + 3 };
        eye2 = { x: cx + eyeOffset, y: cy + 3 };
      }

      ctx.beginPath();
      ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ===== Overlay 控制 =====

function showOverlay(title, message, btnText) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayBtn.textContent = btnText;
  overlay.style.display = 'flex';
}

function hideOverlay() {
  overlay.style.display = 'none';
}

// ===== 游戏显示控制 =====

/** 显示指定游戏 */
function showGame(gameType) {
  if (gameType === 'snake') {
    document.getElementById('game-area').style.display = 'block';
    document.getElementById('games').scrollIntoView({ behavior: 'smooth' });
    resetGame();
  }
}

/** 隐藏游戏，返回选单 */
function hideGame() {
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
  document.getElementById('game-area').style.display = 'none';
  gameRunning = false;
  gameOver = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 键盘事件 =====

document.addEventListener('keydown', (e) => {
  const key = e.key;

  // 空格键：开始 / 暂停 / 继续
  if (key === ' ' || key === 'Spacebar') {
    e.preventDefault();
    if (!gameRunning && !gameOver) {
      startGame();
    } else if (gameRunning && !gameOver) {
      togglePause();
    }
    return;
  }

  // 方向控制（仅在游戏运行时有效）
  if (!gameRunning || gamePaused) return;

  let newDir = null;
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      newDir = { x: 0, y: -1 };
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      newDir = { x: 0, y: 1 };
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      newDir = { x: -1, y: 0 };
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      newDir = { x: 1, y: 0 };
      break;
  }

  // 防止原地掉头
  if (newDir && !isOpposite(newDir, direction)) {
    nextDirection = newDir;
  }
});

// ===== 移动端触控按钮（通过全局函数暴露） =====

/** 触控方向按钮处理 */
window.setDirection = function (dir) {
  if (!gameRunning || gamePaused) return;
  const dirMap = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const newDir = dirMap[dir];
  if (newDir && !isOpposite(newDir, direction)) {
    nextDirection = newDir;
  }
};

/** 触控：开始/暂停 */
window.toggleGame = function () {
  if (!gameRunning && !gameOver) {
    startGame();
  } else if (gameRunning && !gameOver) {
    togglePause();
  }
};
