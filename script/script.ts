// Define interfaces for game objects
interface Enemy {
  type: 'square' | 'triangle' | 'diamond';
  x: number;
  y: number;
  size: number;
  element: SVGElement;
}

interface Keys {
  [key: string]: boolean;
}

// Initialize game global variables
const svg: SVGSVGElement | null = document.getElementById("game") as SVGSVGElement;
const scoreOutput: HTMLElement | null = document.getElementById("score");

let score: number = 0;
let gameLoopInterval: number | null = null;

const width: number = 1600;
const height: number = 600;

// Start player at centre
let playerX: number = 800;
let playerY: number = 300;
const playerSize: number = 28;
const playerSpeed: number = 6;

let speedBoost: boolean = false;
let boostTimer: number | null = null;

let player: SVGPolygonElement | null = null;

let appleX: number = 0;
let appleY: number = 0;
let appleExists: boolean = false;
let apple: SVGCircleElement | null = null;
let appleStem: SVGLineElement | null = null;

const enemies: Enemy[] = [];
// To control difficulty, cap enemies for non-hard levels
const maxEnemies: number = 20;
// Track state of keys - game uses arrow up, arrow down, side arrows
const keys: Keys = {};
// Capture difficulty ranging from 0-2 for game challenge element
const slider: HTMLInputElement | null = document.getElementById("difficulty-slider") as HTMLInputElement;

const startButton: HTMLElement | null = document.getElementById("start-button");
const gameOver: HTMLElement | null = document.getElementById("game-over");
const finalScore: HTMLElement | null = document.getElementById("final-score");
const restartButton: HTMLElement | null = document.getElementById("restart-button");
let gameStarted: boolean = false;
const instructions: HTMLElement | null = document.getElementById("instructions");

// Music clip
const music: HTMLAudioElement | null = document.getElementById("music") as HTMLAudioElement;

let lastClearScore: number = 0;

// Event listeners for keys used when pressed down and up
document.onkeydown = (e: KeyboardEvent): void => {
  keys[e.key] = true;
};

document.onkeyup = (e: KeyboardEvent): void => {
  keys[e.key] = false;
};

// Start game, initialize game variables and hide instructions
if (startButton) {
  startButton.onclick = (): void => {
    if (music) {
      music.play();
    }
    gameStarted = true;
    startButton.remove();
    if (instructions) instructions.style.display = "none";
    createBorder();
    createPlayer();
    startGameLoop();
  };
}

// Reload game when restart button clicked
if (restartButton) {
  restartButton.onclick = (): void => {
    window.location.reload();
  };
}

/**
 * Game area border used when starting game
 */
function createBorder(): void {
  const border: SVGRectElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  border.setAttribute("x", "0");
  border.setAttribute("y", "0");
  border.setAttribute("width", width.toString());
  border.setAttribute("height", height.toString());
  border.setAttribute("class", "border");
  if (svg) svg.appendChild(border);
}

/**
 * Create player as an SVG polygon to look like a triangle
 */
function createPlayer(): void {
  player = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  updatePlayer();
  player.setAttribute("class", "player");
  if (svg) svg.appendChild(player);
}

/**
 * Updates the points attribute of the player’s SVG polygon to reflect its current position
 */
function updatePlayer(): void {
  if (!player) return;
  const points: string = [
    `${playerX},${playerY - playerSize}`,
    `${playerX + playerSize * 0.7},${playerY + playerSize * 0.7}`,
    `${playerX - playerSize * 0.7},${playerY + playerSize * 0.7}`,
  ].join(" ");
  player.setAttribute("points", points);
}

/**
 * Creates an enemy with specified type, position, and size
 * @param type The shape of the enemy (square, triangle, diamond)
 * @param x The x-coordinate where the enemy will be placed
 * @param y The y-coordinate where the enemy will be placed
 * @param size The size of the enemy shape
 * @returns The created SVG element
 */
function createEnemy(type: 'square' | 'triangle' | 'diamond', x: number, y: number, size: number): SVGElement {
  let element: SVGElement;
  if (type === "square") {
    const rect: SVGRectElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", size.toString());
    rect.setAttribute("height", size.toString());
    rect.setAttribute("class", "square");
    element = rect;
  } else if (type === "triangle") {
    const poly: SVGPolygonElement = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const cx: number = x + size / 2;
    const cy: number = y + size / 2;
    const points: string = [
      `${cx},${cy - size / 2}`,
      `${cx + (size / 2) * 0.7},${cy + (size / 2) * 0.7}`,
      `${cx - (size / 2) * 0.7},${cy + (size / 2) * 0.7}`,
    ].join(" ");
    poly.setAttribute("points", points);
    poly.setAttribute("class", "triangle");
    element = poly;
  } else {
    const path: SVGPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const half: number = size / 2;
    const data: string = `M${x + half},${y} L${x + size},${y + half} L${x + half},${y + size} L${x},${y + half} Z`;
    path.setAttribute("d", data);
    path.setAttribute("class", "diamond");
    element = path;
  }
  if (svg) svg.appendChild(element);
  return element;
}

/**
 * Creates a new enemy with a random shape at a random position
 */
function makeEnemy(): void {
  const sliderValue: number = slider ? parseInt(slider.value) : 0;
  if (sliderValue !== 2 && enemies.length >= maxEnemies) return;

  const random: number = Math.floor(Math.random() * 3);
  const type: 'square' | 'triangle' | 'diamond' = ['square', 'triangle', 'diamond'][random] as 'square' | 'triangle' | 'diamond';
  const milestones: number = Math.floor(score / 1000);
  const enemySize: number = 32 + milestones * 10;

  let x: number, y: number, dist: number;
  do {
    x = Math.random() * (width - enemySize * 2) + enemySize;
    y = Math.random() * (height - enemySize * 2) + enemySize;
    dist = Math.sqrt(Math.pow(playerX - x, 2) + Math.pow(playerY - y, 2));
  } while (dist < 200 + enemySize / 2);

  const element: SVGElement = createEnemy(type, x, y, enemySize);
  const newEnemy: Enemy = { type, x, y, size: enemySize, element };
  enemies.push(newEnemy);
}

/**
 * Creates a new apple at random positions
 */
function createApple(): void {
  appleX = Math.random() * (width - 32) + 16;
  appleY = Math.random() * (height - 32) + 16;
  apple = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  apple.setAttribute("cx", appleX.toString());
  apple.setAttribute("cy", appleY.toString());
  apple.setAttribute("r", "16");
  apple.setAttribute("class", "apple");
  if (svg) svg.appendChild(apple);

  appleStem = document.createElementNS("http://www.w3.org/2000/svg", "line");
  appleStem.setAttribute("x1", appleX.toString());
  appleStem.setAttribute("y1", (appleY - 16).toString());
  appleStem.setAttribute("x2", appleX.toString());
  appleStem.setAttribute("y2", (appleY - 26).toString());
  appleStem.setAttribute("class", "apple-stem");
  if (svg) svg.appendChild(appleStem);
  appleExists = true;
}

/**
 * Moves the player based on arrow key inputs
 */
function movePlayer(): void {
  if (!player) return;
  const speed: number = speedBoost ? 12 : playerSpeed;
  if (keys["ArrowUp"]) playerY -= speed;
  if (keys["ArrowDown"]) playerY += speed;
  if (keys["ArrowLeft"]) playerX -= speed;
  if (keys["ArrowRight"]) playerX += speed;
  playerX = Math.max(0, Math.min(playerX, width));
  playerY = Math.max(0, Math.min(playerY, height));
  updatePlayer();
}

/**
 * Updates the position of all enemies to chase the player
 */
function moveEnemies(): void {
  const sliderValue: number = slider ? parseInt(slider.value) : 0;
  const enemySpeed: number = 1.0 + sliderValue * 0.5;

  for (let i = 0; i < enemies.length; i++) {
    const enemy: Enemy = enemies[i];
    const dx: number = playerX - (enemy.x + enemy.size / 2);
    const dy: number = playerY - (enemy.y + enemy.size / 2);
    const dist: number = Math.sqrt(dx * dx + dy * dy);
    const vx: number = (dx / dist) * enemySpeed;
    const vy: number = (dy / dist) * enemySpeed;
    enemy.x += vx;
    enemy.y += vy;

    if (enemy.type === "square") {
      enemy.element.setAttribute("x", enemy.x.toString());
      enemy.element.setAttribute("y", enemy.y.toString());
    } else if (enemy.type === "triangle") {
      const cx: number = enemy.x + enemy.size / 2;
      const cy: number = enemy.y + enemy.size / 2;
      const points: string = [
        `${cx},${cy - enemy.size / 2}`,
        `${cx + (enemy.size / 2) * 0.7},${cy + (enemy.size / 2) * 0.7}`,
        `${cx - (enemy.size / 2) * 0.7},${cy + (enemy.size / 2) * 0.7}`,
      ].join(" ");
      enemy.element.setAttribute("points", points);
    } else {
      const half: number = enemy.size / 2;
      const d: string = `M${enemy.x + half},${enemy.y} L${enemy.x + enemy.size},${enemy.y + half} L${enemy.x + half},${enemy.y + enemy.size} L${enemy.x},${enemy.y + half} Z`;
      enemy.element.setAttribute("d", d);
    }

    if (dist < enemy.size / 2 + playerSize * 0.7) {
      if (finalScore) finalScore.innerHTML = score.toString();
      if (gameOver) gameOver.style.display = "block";
      while (svg?.firstChild) {
        svg.removeChild(svg.firstChild);
      }
      enemies.length = 0;
      if (appleExists) {
        apple = null;
        appleStem = null;
        appleExists = false;
      }
      gameStarted = false;
      stopGameLoop();
    }

    if (enemy.x < -enemy.size || enemy.x > width || enemy.y < -enemy.size || enemy.y > height) {
      enemy.element.remove();
      enemies.splice(i, 1);
      i--;
    }
  }
}

/**
 * Checks if the player collides with an apple
 */
function checkApple(): void {
  if (!appleExists || !apple || !appleStem) return;
  const dx: number = playerX - appleX;
  const dy: number = playerY - appleY;
  const dist: number = Math.sqrt(dx * dx + dy * dy);

  if (dist < playerSize * 0.7 + 16) {
    apple.remove();
    appleStem.remove();
    apple = null;
    appleStem = null;
    appleExists = false;
    speedBoost = true;
    if (boostTimer) clearTimeout(boostTimer);
    boostTimer = setTimeout((): void => {
      speedBoost = false;
    }, 5000);
  }
}

/**
 * Starts the game loop at 60 FPS
 */
function startGameLoop(): void {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
  if (!appleExists) createApple();
  gameLoopInterval = setInterval(gameLoop, 1000 / 60);
}

/**
 * Stops the game loop
 */
function stopGameLoop(): void {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
}

/**
 * Updates the game state at each frame
 */
function gameLoop(): void {
  if (!gameStarted) {
    stopGameLoop();
    return;
  }
  const sliderValue: number = slider ? parseInt(slider.value) : 0;
  const appleChance: number = sliderValue === 0 ? 0.15 : sliderValue === 1 ? 0.01 : 0.05;
  movePlayer();
  if (sliderValue !== 2 && score > lastClearScore + 1000 && enemies.length > 0) {
    enemies.forEach((enemy: Enemy) => enemy.element.remove());
    enemies.length = 0;
    lastClearScore = Math.floor(score / 1000) * 1000;
  }
  const enemySpawnRate: number = sliderValue === 0 ? 0.005 : sliderValue === 1 ? 0.01 : 0.015;
  if (Math.random() < enemySpawnRate) makeEnemy();
  moveEnemies();
  if (appleExists && (!apple || !apple.parentNode || !appleStem || !appleStem.parentNode)) {
    if (apple) apple.remove();
    if (appleStem) appleStem.remove();
    apple = null;
    appleStem = null;
    appleExists = false;
  }
  if (!appleExists && Math.random() < appleChance) createApple();
  checkApple();
  score += 1;
  if (scoreOutput) scoreOutput.innerHTML = `Score: ${score}`;
}