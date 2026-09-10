const canvas = document.querySelector("#maze");
const context = canvas.getContext("2d");
const timerElement = document.querySelector("#timer");
const stepsElement = document.querySelector("#steps");
const messageElement = document.querySelector("#message");
const newGameButton = document.querySelector("#new-game");

const SIZE = 15;
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
  grid = Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => ({
      x, y, visited: false, walls: { top: true, right: true, bottom: true, left: true },
    })),
  );

  const stack = [grid[0][0]];
  grid[0][0].visited = true;
  while (stack.length) {
    const current = stack[stack.length - 1];
    const neighbors = Object.values(directions)
      .map((direction) => grid[current.y + direction.y]?.[current.x + direction.x])
      .filter((cell) => cell && !cell.visited);
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    if (dx === 1) { current.walls.right = false; next.walls.left = false; }
    if (dx === -1) { current.walls.left = false; next.walls.right = false; }
    if (dy === 1) { current.walls.bottom = false; next.walls.top = false; }
    if (dy === -1) { current.walls.top = false; next.walls.bottom = false; }
    next.visited = true;
    stack.push(next);
  }
  player = { x: 0, y: 0 };
}

function resizeCanvas() {
  const size = canvas.clientWidth * window.devicePixelRatio;
  canvas.width = size;
  canvas.height = size;
  draw();
}

function draw() {
  const unit = canvas.width / SIZE;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f8fbff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = Math.max(2, unit * 0.075);
  context.lineCap = "round";
  context.strokeStyle = "#2563eb";
  grid.flat().forEach((cell) => {
    const x = cell.x * unit;
    const y = cell.y * unit;
    context.beginPath();
    if (cell.walls.top) { context.moveTo(x, y); context.lineTo(x + unit, y); }
    if (cell.walls.right) { context.moveTo(x + unit, y); context.lineTo(x + unit, y + unit); }
    if (cell.walls.bottom) { context.moveTo(x + unit, y + unit); context.lineTo(x, y + unit); }
    if (cell.walls.left) { context.moveTo(x, y + unit); context.lineTo(x, y); }
    context.stroke();
  });

  context.fillStyle = "#fbbf24";
  context.beginPath();
  context.arc((SIZE - 1.5) * unit, (SIZE - 1.5) * unit, unit * 0.27, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1d4ed8";
  context.beginPath();
  context.arc((player.x + 0.5) * unit, (player.y + 0.5) * unit, unit * 0.29, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "white";
  context.beginPath();
  context.arc((player.x + 0.4) * unit, (player.y + 0.39) * unit, unit * 0.08, 0, Math.PI * 2);
  context.fill();
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
  const cell = grid[player.y][player.x];
  if (cell.walls[direction.key]) return;
  player.x += direction.x;
  player.y += direction.y;
  steps += 1;
  stepsElement.textContent = steps;
  messageElement.textContent = "ゴールまであと少し！";
  draw();
  if (player.x === SIZE - 1 && player.y === SIZE - 1) {
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
  draw();
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
