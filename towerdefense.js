// ---------- Grid / path setup ----------
const CELL = 60;
const COLS = 13;
const ROWS = 10;

// Waypoints in grid coordinates (col, row). First/last are off-canvas so
// enemies spawn/exit smoothly at the edges.
const GRID_WAYPOINTS = [
  [-1, 1],
  [3, 1],
  [3, 8],
  [6, 8],
  [6, 1],
  [9, 1],
  [9, 8],
  [13, 8],
];

function cellCenter([col, row]) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

const PATH_POINTS = GRID_WAYPOINTS.map(cellCenter);

// Mark every grid cell the path passes through as non-buildable.
const pathCells = new Set();
for (let i = 0; i < GRID_WAYPOINTS.length - 1; i++) {
  let [c1, r1] = GRID_WAYPOINTS[i];
  let [c2, r2] = GRID_WAYPOINTS[i + 1];
  if (r1 === r2) {
    const [lo, hi] = [Math.min(c1, c2), Math.max(c1, c2)];
    for (let c = lo; c <= hi; c++) {
      if (c >= 0 && c < COLS) pathCells.add(`${c},${r1}`);
    }
  } else {
    const [lo, hi] = [Math.min(r1, r2), Math.max(r1, r2)];
    for (let r = lo; r <= hi; r++) {
      if (c1 >= 0 && c1 < COLS) pathCells.add(`${c1},${r}`);
    }
  }
}

// ---------- Tower & enemy definitions ----------
const TOWER_TYPES = {
  gamer: {
    name: "Gamer", desc: "fast reflexes, rapid fire", emoji: "🎮",
    cost: 50, damage: 10, range: 120, fireRate: 0.6, color: "#39ff14", projectileSpeed: 500,
  },
  coder: {
    name: "Coder", desc: "precise fix, long range", emoji: "💻",
    cost: 100, damage: 35, range: 250, fireRate: 1.5, color: "#00e5ff", projectileSpeed: 700,
  },
  hacker: {
    name: "Hacker", desc: "exploit hits a whole area", emoji: "👾",
    cost: 150, damage: 20, range: 150, fireRate: 1.2, color: "#ff4fd8", projectileSpeed: 400, splashRadius: 55,
  },
};

const ENEMY_TYPES = {
  basic: { label: "Bug", emoji: "🐛", hp: 50, speed: 60, reward: 5, lifeDamage: 1, color: "#e05353", radius: 14 },
  fast: { label: "Glitch", emoji: "⚡", hp: 25, speed: 130, reward: 5, lifeDamage: 1, color: "#ffee58", radius: 12 },
  tank: { label: "Merge Conflict", emoji: "💀", hp: 160, speed: 35, reward: 12, lifeDamage: 2, color: "#8a4a2b", radius: 17 },
};

// ---------- Game state ----------
const state = {
  gold: 150,
  lives: 20,
  wave: 0,
  kills: 0,
  selectedTowerType: null,
  towers: [],
  enemies: [],
  projectiles: [],
  waveInProgress: false,
  spawnQueue: [],
  spawnTimer: 0,
  gameOver: false,
};

// ---------- Canvas / DOM ----------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const goldStat = document.getElementById("goldStat");
const livesStat = document.getElementById("livesStat");
const waveStat = document.getElementById("waveStat");
const killsStat = document.getElementById("killsStat");
const towerListEl = document.getElementById("towerList");
const waveBtn = document.getElementById("waveBtn");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverText = document.getElementById("gameOverText");
const restartBtn = document.getElementById("restartBtn");

function buildTowerButtons() {
  towerListEl.innerHTML = "";
  Object.entries(TOWER_TYPES).forEach(([key, def]) => {
    const btn = document.createElement("button");
    btn.className = "tower-btn";
    btn.dataset.type = key;
    btn.innerHTML = `<span class="emoji">${def.emoji}</span><span class="info"><span class="name">${def.name}</span><span class="desc">${def.desc}</span></span><span class="cost">${def.cost}c</span>`;
    btn.addEventListener("click", () => {
      state.selectedTowerType = state.selectedTowerType === key ? null : key;
      refreshTowerButtons();
    });
    towerListEl.appendChild(btn);
  });
}

function refreshTowerButtons() {
  [...towerListEl.children].forEach((btn) => {
    const key = btn.dataset.type;
    btn.classList.toggle("selected", state.selectedTowerType === key);
    btn.disabled = state.gold < TOWER_TYPES[key].cost;
  });
}

function updateStats() {
  goldStat.textContent = state.gold;
  livesStat.textContent = state.lives;
  waveStat.textContent = state.wave;
  killsStat.textContent = state.kills;
  refreshTowerButtons();
}

// ---------- Placement ----------
function canvasPosFromEvent(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener("click", (evt) => {
  if (state.gameOver || !state.selectedTowerType) return;
  const { x, y } = canvasPosFromEvent(evt);
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  if (pathCells.has(`${col},${row}`)) return;
  if (state.towers.some((t) => t.col === col && t.row === row)) return;

  const def = TOWER_TYPES[state.selectedTowerType];
  if (state.gold < def.cost) return;

  state.gold -= def.cost;
  const center = cellCenter([col, row]);
  state.towers.push({
    type: state.selectedTowerType,
    col,
    row,
    x: center.x,
    y: center.y,
    cooldown: 0,
    ...def,
  });
  updateStats();
});

// ---------- Waves ----------
function buildWave(waveNum) {
  const count = 6 + waveNum * 2;
  const queue = [];
  for (let i = 0; i < count; i++) {
    let type = "basic";
    const roll = Math.random();
    if (waveNum >= 5 && roll < 0.25) type = "tank";
    else if (waveNum >= 2 && roll < 0.5) type = "fast";
    queue.push(type);
  }
  return queue;
}

waveBtn.addEventListener("click", () => {
  if (state.waveInProgress || state.gameOver) return;
  state.wave += 1;
  state.spawnQueue = buildWave(state.wave);
  state.spawnTimer = 0;
  state.waveInProgress = true;
  waveBtn.disabled = true;
  waveBtn.textContent = `sprint ${state.wave} in progress...`;
  updateStats();
});

function spawnEnemy(type) {
  const def = ENEMY_TYPES[type];
  state.enemies.push({
    type,
    x: PATH_POINTS[0].x,
    y: PATH_POINTS[0].y,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    reward: def.reward,
    lifeDamage: def.lifeDamage,
    color: def.color,
    radius: def.radius,
    emoji: def.emoji,
    segment: 1,
  });
}

// ---------- Update loop ----------
function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const target = PATH_POINTS[e.segment];
    if (!target) {
      state.lives -= e.lifeDamage;
      state.enemies.splice(i, 1);
      if (state.lives <= 0) triggerGameOver();
      continue;
    }
    const d = distance(e.x, e.y, target.x, target.y);
    const step = e.speed * dt;
    if (step >= d) {
      e.x = target.x;
      e.y = target.y;
      e.segment += 1;
    } else {
      e.x += ((target.x - e.x) / d) * step;
      e.y += ((target.y - e.y) / d) * step;
    }
  }
}

function updateTowers(dt) {
  for (const t of state.towers) {
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    let best = null;
    let bestDist = Infinity;
    for (const e of state.enemies) {
      const d = distance(t.x, t.y, e.x, e.y);
      if (d <= t.range && d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    if (best) {
      state.projectiles.push({
        x: t.x,
        y: t.y,
        target: best,
        speed: t.projectileSpeed,
        damage: t.damage,
        splashRadius: t.splashRadius || 0,
        color: t.color,
      });
      t.cooldown = t.fireRate;
    }
  }
}

function applyDamage(enemy, amount) {
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    const idx = state.enemies.indexOf(enemy);
    if (idx !== -1) {
      state.enemies.splice(idx, 1);
      state.gold += enemy.reward;
      state.kills += 1;
    }
  }
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (!state.enemies.includes(p.target)) {
      state.projectiles.splice(i, 1);
      continue;
    }
    const d = distance(p.x, p.y, p.target.x, p.target.y);
    const step = p.speed * dt;
    if (step >= d) {
      if (p.splashRadius > 0) {
        const ix = p.target.x;
        const iy = p.target.y;
        [...state.enemies].forEach((e) => {
          if (distance(ix, iy, e.x, e.y) <= p.splashRadius) {
            applyDamage(e, p.damage);
          }
        });
      } else {
        applyDamage(p.target, p.damage);
      }
      state.projectiles.splice(i, 1);
    } else {
      p.x += ((p.target.x - p.x) / d) * step;
      p.y += ((p.target.y - p.y) / d) * step;
    }
  }
}

function updateSpawning(dt) {
  if (!state.waveInProgress) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
    spawnEnemy(state.spawnQueue.shift());
    state.spawnTimer = 0.6;
  }
  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveInProgress = false;
    waveBtn.disabled = false;
    waveBtn.textContent = `deploy sprint ${state.wave + 1}`;
  }
}

function triggerGameOver() {
  state.gameOver = true;
  gameOverText.textContent = `Uptime hit zero after sprint ${state.wave}. ${state.kills} bug${state.kills === 1 ? "" : "s"} fixed before the crash.`;
  gameOverOverlay.classList.add("visible");
}

// ---------- Rendering ----------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // grid
  ctx.strokeStyle = "#132313";
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, ROWS * CELL);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(COLS * CELL, r * CELL);
    ctx.stroke();
  }

  // path
  ctx.fillStyle = "#12240f";
  pathCells.forEach((key) => {
    const [c, r] = key.split(",").map(Number);
    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
  });

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // towers
  for (const t of state.towers) {
    ctx.fillStyle = t.color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(t.x, t.y, CELL * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, CELL * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${CELL * 0.4}px sans-serif`;
    ctx.fillText(t.emoji, t.x, t.y + 1);
  }

  // enemies
  for (const e of state.enemies) {
    ctx.fillStyle = e.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `${e.radius * 1.6}px sans-serif`;
    ctx.fillText(e.emoji, e.x, e.y + 1);

    const barW = e.radius * 2;
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = "#000";
    ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW, 4);
    ctx.fillStyle = "#39ff14";
    ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW * pct, 4);
  }

  // projectiles
  for (const p of state.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- Main loop ----------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (!state.gameOver) {
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateStats();
  }
  draw();
  requestAnimationFrame(loop);
}

// ---------- Restart ----------
function resetGame() {
  state.gold = 150;
  state.lives = 20;
  state.wave = 0;
  state.kills = 0;
  state.selectedTowerType = null;
  state.towers = [];
  state.enemies = [];
  state.projectiles = [];
  state.waveInProgress = false;
  state.spawnQueue = [];
  state.spawnTimer = 0;
  state.gameOver = false;
  gameOverOverlay.classList.remove("visible");
  waveBtn.disabled = false;
  waveBtn.textContent = "deploy sprint 1";
  updateStats();
}

restartBtn.addEventListener("click", resetGame);

// ---------- Init ----------
buildTowerButtons();
updateStats();
requestAnimationFrame(loop);
