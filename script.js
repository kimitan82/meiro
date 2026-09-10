const canvas = document.querySelector("#maze");
const context = canvas.getContext("2d");
const timerElement = document.querySelector("#timer");
const stepsElement = document.querySelector("#steps");
const messageElement = document.querySelector("#message");
const newGameButton = document.querySelector("#new-game");

const COLUMNS = 11;
const ROWS = 45;
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

function createMaze() {
  grid = Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLUMNS }, (_, x) => ({
      x, y, wall: true, visited: false,
    })),
  );

  const start = grid[ROWS - 2][1];
  const stack = [start];
  start.visited = true;
  start.wall = false;
  while (stack.length) {
    const current = stack[stack.length - 1];
    const neighbors = Object.values(directions)
      .map((direction) => ({
        cell: grid[current.y + direction.y * 2]?.[current.x + direction.x * 2],
        wall: grid[current.y + direction.y]?.[current.x + direction.x],
      }))
      .filter(({ cell }) => cell && !cell.visited);
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    const { cell: next, wall } = neighbors[Math.floor(Math.random() * neighbors.length)];
    wall.wall = false;
    next.wall = false;
    next.visited = true;
    stack.push(next);
  }
  player = { x: 1, y: ROWS - 2 };
}

function getCellSize() {
  return canvas.width / COLUMNS;
}

function resizeCanvas() {
  const width = canvas.clientWidth * window.devicePixelRatio;
  canvas.width = width;
  canvas.height = width * ROWS / COLUMNS;
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

  context.fillStyle = "#fbbf24";
  context.beginPath();
  context.arc((COLUMNS - 1.5) * unit, 1.5 * unit, unit * 0.27, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1d4ed8";
  context.beginPath();
  context.arc((player.x + 0.5) * unit, (player.y + 0.5) * unit, unit * 0.29, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "white";
  context.beginPath();
  context.arc((player.x + 0.4) * unit, (player.y + 0.39) * unit, unit * 0.08, 0, Math.PI * 2);
  context.fill();

  const viewport = canvas.parentElement;
  const playerCenter = (player.y + 0.5) * (canvas.clientHeight / ROWS);
  const targetScroll = playerCenter - viewport.clientHeight / 2;
  viewport.scrollTop = Math.max(0, Math.min(targetScroll, canvas.clientHeight - viewport.clientHeight));
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
  const nextX = player.x + direction.x;
  const nextY = player.y + direction.y;
  if (!grid[nextY]?.[nextX] || grid[nextY][nextX].wall) return;
  player.x = nextX;
  player.y = nextY;
  steps += 1;
  stepsElement.textContent = steps;
  messageElement.textContent = "ゴールまであと少し！";
  draw();
  if (player.x === COLUMNS - 2 && player.y === 1) {
    finished = true;
    clearInterval(timerId);
    messageElement.textContent = `クリア！ ${formatTime(Math.floor((Date.now() - startedAt) / 1000))}`;
  }
}

function startGame() {
  clearInterval(timerId);
  createMaze();
  steps = 0;
  finished = false;
  startedAt = Date.now();
  stepsElement.textContent = "0";
  timerElement.textContent = "00:00";
  messageElement.textContent = "矢印キーまたは下のボタンで移動";
  resizeCanvas();
  timerId = setInterval(updateTimer, 1000);
}

window.addEventListener("keydown", (event) => {
  const direction = keyDirections[event.key];
  if (!direction) return;
  event.preventDefault();
  move(direction);
});
document.querySelectorAll(".control-button").forEach((button) => {
  button.addEventListener("click", () => move(button.dataset.direction));
});
newGameButton.addEventListener("click", startGame);
window.addEventListener("resize", resizeCanvas);

startGame();
