const canvas = document.querySelector("#maze");
const context = canvas.getContext("2d");
const timerElement = document.querySelector("#timer");
const stepsElement = document.querySelector("#steps");
const messageElement = document.querySelector("#message");
const newGameButton = document.querySelector("#new-game");
const gameOverElement = document.querySelector("#game-over");
const retryGameButton = document.querySelector("#retry-game");
const gameClearElement = document.querySelector("#game-clear");
const clearTimeElement = document.querySelector("#clear-time");
const clearRetryButton = document.querySelector("#clear-retry");
const itemsElement = document.querySelector("#items");
const useItemButton = document.querySelector("#use-item");
const coinsElement = document.querySelector("#coins");

const COLUMNS = 9;
const ROWS = 45;
const SCROLL_SPEED = 34;
const MAX_ITEMS = 3;
const PLAZA_COUNT = 5;
const CHEST_COUNT = 8;
const directions = {
  up: { x: 0, y: -1, key: "top" },
  right: { x: 1, y: 0, key: "right" },
  down: { x: 0, y: 1, key: "bottom" },
  left: { x: -1, y: 0, key: "left" },
};
const keyDirections = {
  ArrowUp: "up", w: "up", W: "up",
  ArrowRight: "right", d: "right", D: "right",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
};

let grid;
let player;
let steps;
let startedAt;
let finished = false;
let timerId;
let scrollFrameId;
let lastScrollTime;
let goalY;
let items;
let coins;
let chests;

function createMaze() {
  grid = Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLUMNS }, (_, x) => ({
      x, y, wall: true, visited: false,
    })),
  );

  const start = grid[ROWS - 2][1];
  start.visited = true;
  start.wall = false;
  const frontier = [];
  const addFrontier = (current) => {
    Object.values(directions)
      .map((direction) => ({
        cell: grid[current.y + direction.y * 2]?.[current.x + direction.x * 2],
      }))
      .filter(({ cell }) => cell && !cell.visited)
      .forEach((neighbor) => frontier.push(neighbor));
  };

  addFrontier(start);
  while (frontier.length) {
    const frontierIndex = Math.floor(Math.random() * frontier.length);
    const { cell: next } = frontier.splice(frontierIndex, 1)[0];
    if (next.visited) continue;

    const visitedNeighbors = Object.values(directions)
      .map((direction) => grid[next.y + direction.y * 2]?.[next.x + direction.x * 2])
      .filter((cell) => cell?.visited);
    const connectedCell = visitedNeighbors[Math.floor(Math.random() * visitedNeighbors.length)];
    const dx = connectedCell.x - next.x;
    const dy = connectedCell.y - next.y;
    const connectingWall = grid[next.y + Math.sign(dy)][next.x + Math.sign(dx)];
    connectingWall.wall = false;
    next.wall = false;
    next.visited = true;
    addFrontier(next);
  }

  const plazaShapes = [
    { width: 2, height: 2 },
    { width: 2, height: 3 },
    { width: 3, height: 2 },
    { width: 3, height: 3 },
  ];
  const candidates = [];
  for (const shape of plazaShapes) {
    for (let y = 2; y <= ROWS - shape.height - 1; y += 1) {
      for (let x = 1; x <= COLUMNS - shape.width - 1; x += 1) {
        candidates.push({ x, y, ...shape });
      }
    }
  }
  const plazas = [];
  while (candidates.length && plazas.length < PLAZA_COUNT) {
    const candidateIndex = Math.floor(Math.random() * candidates.length);
    const candidate = candidates.splice(candidateIndex, 1)[0];
    const overlaps = plazas.some((plaza) => candidate.x - 1 < plaza.x + plaza.width
      && candidate.x + candidate.width + 1 > plaza.x
      && candidate.y - 1 < plaza.y + plaza.height
      && candidate.y + candidate.height + 1 > plaza.y);
    if (overlaps) {
      continue;
    }
    plazas.push(candidate);
    for (let y = candidate.y; y < candidate.y + candidate.height; y += 1) {
      for (let x = candidate.x; x < candidate.x + candidate.width; x += 1) {
        grid[y][x].wall = false;
      }
    }
  }

  player = { x: 1, y: ROWS - 2, facing: "right" };
  const chestContents = ["coin", "wallBreaker", "empty"];
  const openCells = grid.flat().filter((cell) => !cell.wall
    && cell.x > 0 && cell.x < COLUMNS - 1
    && cell.y > 0 && cell.y < ROWS - 1
    && !(cell.x === player.x && cell.y === player.y));
  chests = [];
  while (openCells.length && chests.length < CHEST_COUNT) {
    const cellIndex = Math.floor(Math.random() * openCells.length);
    const cell = openCells.splice(cellIndex, 1)[0];
    chests.push({
      x: cell.x,
      y: cell.y,
      content: chestContents[Math.floor(Math.random() * chestContents.length)],
      opened: false,
    });
  }
}

function getCellSize() {
  return canvas.width / COLUMNS;
}

function updateGoalPosition() {
  const visibleRows = canvas.clientHeight
    ? canvas.parentElement.clientHeight / (canvas.clientHeight / ROWS)
    : ROWS;
  const centerRow = Math.round((visibleRows / 2 - 1) / 2) * 2 + 1;
  goalY = Math.max(1, Math.min(ROWS - 2, centerRow));
}

function resizeCanvas() {
  const width = canvas.clientWidth * window.devicePixelRatio;
  canvas.width = width;
  canvas.height = width * ROWS / COLUMNS;
  updateGoalPosition();
  draw();
}

function draw() {
  const unit = getCellSize();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#dbeafe";
  context.fillRect(0, 0, canvas.width, canvas.height);
  grid.flat().forEach((cell) => {
    if (!cell.wall) return;
    context.fillStyle = "#2563eb";
    context.fillRect(cell.x * unit, cell.y * unit, unit, unit);
  });

  chests.forEach((chest) => {
    const chestX = chest.x * unit;
    const chestY = chest.y * unit;
    context.fillStyle = chest.opened ? "#a16207" : "#92400e";
    context.fillRect(chestX + unit * 0.16, chestY + unit * 0.3, unit * 0.68, unit * 0.5);
    context.fillStyle = chest.opened ? "#d97706" : "#f59e0b";
    context.fillRect(chestX + unit * 0.16, chestY + unit * 0.2, unit * 0.68, unit * 0.22);
    context.fillStyle = "#fef3c7";
    context.fillRect(chestX + unit * 0.45, chestY + unit * 0.41, unit * 0.1, unit * 0.17);
  });

  context.fillStyle = "#fbbf24";
  context.beginPath();
  context.arc((COLUMNS - 1.5) * unit, (goalY + 0.5) * unit, unit * 0.27, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1d4ed8";
  context.beginPath();
  context.arc((player.x + 0.5) * unit, (player.y + 0.5) * unit, unit * 0.29, 0, Math.PI * 2);
  context.fill();
  const facing = directions[player.facing];
  const playerCenterX = (player.x + 0.5) * unit;
  const playerCenterY = (player.y + 0.5) * unit;
  const tipX = playerCenterX + facing.x * unit * 0.39;
  const tipY = playerCenterY + facing.y * unit * 0.39;
  const sideX = playerCenterX - facing.x * unit * 0.12;
  const sideY = playerCenterY - facing.y * unit * 0.12;
  const perpendicularX = -facing.y * unit * 0.16;
  const perpendicularY = facing.x * unit * 0.16;
  context.fillStyle = "#fef3c7";
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(sideX + perpendicularX, sideY + perpendicularY);
  context.lineTo(sideX - perpendicularX, sideY - perpendicularY);
  context.closePath();
  context.fill();
  context.fillStyle = "white";
  context.beginPath();
  context.arc((player.x + 0.4) * unit, (player.y + 0.39) * unit, unit * 0.08, 0, Math.PI * 2);
  context.fill();
}

function updateItems() {
  itemsElement.textContent = `${items} / ${MAX_ITEMS}`;
  useItemButton.disabled = finished || items === 0;
}

function updateCoins() {
  coinsElement.textContent = coins;
}

function collectChest() {
  const chest = chests.find((candidate) => candidate.x === player.x
    && candidate.y === player.y && !candidate.opened);
  if (!chest) return false;
  if (chest.content === "wallBreaker" && items >= MAX_ITEMS) {
    messageElement.textContent = "宝箱の壁破壊アイテムはこれ以上持てません";
    return true;
  }
  chest.opened = true;
  if (chest.content === "coin") {
    coins += 1;
    updateCoins();
    messageElement.textContent = "宝箱からコインを手に入れました！";
  } else if (chest.content === "wallBreaker") {
    items += 1;
    updateItems();
    messageElement.textContent = "宝箱から壁破壊アイテムを手に入れました！";
  } else {
    messageElement.textContent = "宝箱は空っぽでした";
  }
  draw();
  return true;
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function updateTimer() {
  if (!finished) timerElement.textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000));
}

function move(directionName) {
  if (finished) return;
  const direction = directions[directionName];
  player.facing = directionName;
  draw();
  const nextX = player.x + direction.x;
  const nextY = player.y + direction.y;
  if (!grid[nextY]?.[nextX] || grid[nextY][nextX].wall) return;
  const cellSize = canvas.clientHeight / ROWS;
  const nextCellTop = nextY * cellSize;
  if (directionName === "up" && nextCellTop < canvas.parentElement.scrollTop) return;
  player.x = nextX;
  player.y = nextY;
  steps += 1;
  stepsElement.textContent = steps;
  messageElement.textContent = "ゴールまであと少し！";
  if (!collectChest()) {
    messageElement.textContent = "ゴールまであと少し！";
  }
  draw();
  if (player.x === COLUMNS - 2 && player.y === goalY) {
    finished = true;
    clearInterval(timerId);
    const clearTime = formatTime(Math.floor((Date.now() - startedAt) / 1000));
    messageElement.textContent = `クリア！ ${clearTime}`;
    clearTimeElement.textContent = `${clearTime} でゴールに到達しました`;
    gameClearElement.classList.add("visible");
    updateItems();
  }
}

function useItem() {
  if (finished || items === 0) return;
  const direction = directions[player.facing];
  const target = grid[player.y + direction.y]?.[player.x + direction.x];
  if (!target || target.x === 0 || target.x === COLUMNS - 1
    || target.y === 0 || target.y === ROWS - 1) {
    messageElement.textContent = "ここには壊せる壁がありません";
    return;
  }
  if (!target.wall) {
    messageElement.textContent = "正面に壁がありません";
    return;
  }
  target.wall = false;
  items -= 1;
  updateItems();
  messageElement.textContent = "壁を壊しました！";
  draw();
}

function autoScroll(timestamp) {
  if (finished) return;
  if (!lastScrollTime) lastScrollTime = timestamp;
  const elapsed = (timestamp - lastScrollTime) / 1000;
  lastScrollTime = timestamp;

  const viewport = canvas.parentElement;
  viewport.scrollTop = Math.max(0, viewport.scrollTop - SCROLL_SPEED * elapsed);

  const cellSize = canvas.clientHeight / ROWS;
  const playerTop = player.y * cellSize;
  const viewportBottom = viewport.scrollTop + viewport.clientHeight;
  if (playerTop >= viewportBottom) {
    finished = true;
    clearInterval(timerId);
    messageElement.textContent = "ゲームオーバー！ スクロールに追いつけませんでした";
    gameOverElement.classList.add("visible");
    updateItems();
    scrollFrameId = undefined;
    return;
  }

  if (viewport.scrollTop <= 0) {
    viewport.scrollTop = 0;
    scrollFrameId = undefined;
    return;
  }

  scrollFrameId = requestAnimationFrame(autoScroll);
}

function startGame() {
  clearInterval(timerId);
  if (scrollFrameId) cancelAnimationFrame(scrollFrameId);
  createMaze();
  items = 1;
  coins = 0;
  steps = 0;
  finished = false;
  lastScrollTime = undefined;
  gameOverElement.classList.remove("visible");
  gameClearElement.classList.remove("visible");
  startedAt = Date.now();
  stepsElement.textContent = "0";
  timerElement.textContent = "00:00";
  updateCoins();
  messageElement.textContent = "矢印キーまたは下のボタンで移動";
  updateItems();
  resizeCanvas();
  const viewport = canvas.parentElement;
  viewport.scrollTop = canvas.clientHeight - viewport.clientHeight;
  timerId = setInterval(updateTimer, 1000);
  scrollFrameId = requestAnimationFrame(autoScroll);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    useItem();
    return;
  }
  const direction = keyDirections[event.key];
  if (!direction) return;
  event.preventDefault();
  move(direction);
});
document.querySelectorAll(".control-button").forEach((button) => {
  button.addEventListener("click", () => move(button.dataset.direction));
});
newGameButton.addEventListener("click", startGame);
retryGameButton.addEventListener("click", startGame);
clearRetryButton.addEventListener("click", startGame);
useItemButton.addEventListener("click", useItem);
window.addEventListener("resize", resizeCanvas);

startGame();
