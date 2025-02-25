import { getInput, createResourceLoader } from "./utils.js";

// Set up font loading
const gameFont = new FontFace(
  "PressStart2P",
  "url(/fonts/PressStart2P-Regular.ttf)"
);

// Load the font
await gameFont.load();
document.fonts.add(gameFont);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 20; // Size of each grid cell
const { width, height } = canvas;
const COLS = Math.floor(width / GRID_SIZE);
const ROWS = Math.floor(height / GRID_SIZE);

// Game states
const GAME_STATES = {
  PLAYING: "playing",
  GAME_OVER: "gameOver",
};

// Direction constants
const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

// Snake player class
class Snake {
  constructor(startX, startY, color) {
    // Start with 4 segments
    this.body = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
      { x: startX - 3, y: startY },
    ];
    this.direction = DIRECTIONS.RIGHT;
    this.color = color;
    this.growFlag = false;
  }

  move() {
    const head = this.body[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    this.body.unshift(newHead);
    if (!this.growFlag) {
      this.body.pop();
    } else {
      this.growFlag = false;
    }
  }

  grow() {
    this.growFlag = true;
  }

  checkCollision() {
    const head = this.body[0];

    // Wrap around walls instead of collision
    if (head.x < 0) head.x = COLS - 1;
    if (head.x >= COLS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    if (head.y >= ROWS) head.y = 0;

    // Self collision
    for (let i = 1; i < this.body.length; i++) {
      if (head.x === this.body[i].x && head.y === this.body[i].y) {
        return true;
      }
    }

    return false;
  }
}

// Game state
let gameState = GAME_STATES.PLAYING;
let snake = new Snake(Math.floor(COLS / 4), Math.floor(ROWS / 2), "#00ff00");
let food = null;
let lastTime = performance.now();
let accumulator = 0;
const INITIAL_STEP_TIME = 150; // Initial snake movement speed (ms)
const SPEED_INCREASE_INTERVAL = 5; // Increase speed every X segments
const SPEED_INCREASE_AMOUNT = 10; // How many ms faster to make the snake
const MIN_STEP_TIME = 50; // Fastest allowed speed
let currentStepTime = INITIAL_STEP_TIME;
let score = 0;

function spawnFood() {
  while (true) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);

    // Check if food spawns on snake
    let onSnake = false;
    for (const segment of snake.body) {
      if (segment.x === x && segment.y === y) {
        onSnake = true;
        break;
      }
    }

    if (!onSnake) {
      food = { x, y };
      break;
    }
  }
}

function handleInput() {
  const [p1] = getInput();

  if (p1.DPAD_LEFT.pressed && snake.direction !== DIRECTIONS.RIGHT) {
    snake.direction = DIRECTIONS.LEFT;
  } else if (p1.DPAD_RIGHT.pressed && snake.direction !== DIRECTIONS.LEFT) {
    snake.direction = DIRECTIONS.RIGHT;
  } else if (p1.DPAD_UP.pressed && snake.direction !== DIRECTIONS.DOWN) {
    snake.direction = DIRECTIONS.UP;
  } else if (p1.DPAD_DOWN.pressed && snake.direction !== DIRECTIONS.UP) {
    snake.direction = DIRECTIONS.DOWN;
  }
}

function update(deltaTime) {
  // Check for game restart
  const [p1] = getInput();
  if (gameState === GAME_STATES.GAME_OVER && p1.GUIDE.pressed) {
    console.log("Restarting game...");
    gameState = GAME_STATES.PLAYING;
    snake = new Snake(Math.floor(COLS / 4), Math.floor(ROWS / 2), "#00ff00");
    score = 0;
    currentStepTime = INITIAL_STEP_TIME;
    spawnFood();
    return;
  }
  if (gameState !== GAME_STATES.PLAYING) return;

  handleInput();

  accumulator += deltaTime;

  while (accumulator >= currentStepTime) {
    snake.move();

    // Check collisions
    if (snake.checkCollision()) {
      gameState = GAME_STATES.GAME_OVER;
      return;
    }

    // Check food collision
    const head = snake.body[0];
    if (head.x === food.x && head.y === food.y) {
      snake.grow();
      score++;

      // Increase speed every SPEED_INCREASE_INTERVAL points
      if (score % SPEED_INCREASE_INTERVAL === 0) {
        currentStepTime = Math.max(
          MIN_STEP_TIME,
          currentStepTime - SPEED_INCREASE_AMOUNT
        );
      }

      spawnFood();
    }

    accumulator -= currentStepTime;
  }
}

function draw() {
  // Clear canvas
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Draw snake
  ctx.fillStyle = snake.color;
  for (const segment of snake.body) {
    ctx.fillRect(
      segment.x * GRID_SIZE,
      segment.y * GRID_SIZE,
      GRID_SIZE - 1,
      GRID_SIZE - 1
    );
  }

  // Draw food
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(
    food.x * GRID_SIZE,
    food.y * GRID_SIZE,
    GRID_SIZE - 1,
    GRID_SIZE - 1
  );

  // Draw score and level
  ctx.fillStyle = "#ffffff";
  ctx.font = "16px PressStart2P";

  // Draw score on left
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 10, 30);

  // Calculate and draw level on right
  const level =
    Math.floor((INITIAL_STEP_TIME - currentStepTime) / SPEED_INCREASE_AMOUNT) +
    1;
  ctx.textAlign = "right";
  ctx.fillText(`Level: ${level}`, width - 10, 30);

  // Draw game over
  if (gameState === GAME_STATES.GAME_OVER) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "32px PressStart2P";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", width / 2, height / 2);
    ctx.font = "16px PressStart2P";
    ctx.fillText("Press Start or Enter to restart", width / 2, height / 2 + 40);
  }
}

function gameLoop() {
  const currentTime = performance.now();
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  update(deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
spawnFood();
gameLoop();
