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
    name: "Hacker", desc: "slow, heavy AoE exploit", emoji: "👾",
    cost: 170, damage: 55, range: 150, fireRate: 2.2, color: "#ff4fd8", projectileSpeed: 400, splashRadius: 65,
  },
  manager: {
    name: "Manager", desc: "no damage - boosts nearby devs", emoji: "👔",
    cost: 120, damage: 0, range: 130, fireRate: Infinity, color: "#ffd166", projectileSpeed: 0,
    isSupport: true, buffDamagePct: 0.2, buffRatePct: 0.2,
  },
};

const MAX_TOWER_LEVEL = 5;
const OVERCLOCK_DURATION = 8;
const OVERCLOCK_COOLDOWN = 30;

const ENEMY_TYPES = {
  basic: { label: "Bug", emoji: "🐛", hp: 50, speed: 60, reward: 5, lifeDamage: 1, color: "#e05353", radius: 14 },
  fast: { label: "Glitch", emoji: "⚡", hp: 25, speed: 130, reward: 5, lifeDamage: 1, color: "#ffee58", radius: 12 },
  tank: { label: "Merge Conflict", emoji: "💀", hp: 160, speed: 35, reward: 12, lifeDamage: 2, color: "#8a4a2b", radius: 17 },
  boss: { label: "Production Outage", emoji: "🔥", hp: 400, speed: 30, reward: 60, lifeDamage: 5, color: "#ff3b3b", radius: 24 },
};

// ---------- Game state ----------
const state = {
  gold: 150,
  lives: 20,
  wave: 0,
  kills: 0,
  selectedTowerType: null,
  selectedTower: null,
  towers: [],
  enemies: [],
  projectiles: [],
  explosions: [],
  waveInProgress: false,
  spawnQueue: [],
  spawnTimer: 0,
  gameOver: false,
  gameSpeed: 1,
  overclockActive: false,
  overclockTimer: 0,
  overclockCooldown: 0,
  autoRun: false,
  autoRunTimer: 0,
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

const overclockBtn = document.getElementById("overclockBtn");
const speedBtn = document.getElementById("speedBtn");
const autoRunBtn = document.getElementById("autoRunBtn");
const towerInfoPanel = document.getElementById("towerInfoPanel");
const towerInfoName = document.getElementById("towerInfoName");
const towerInfoLevel = document.getElementById("towerInfoLevel");
const towerInfoClose = document.getElementById("towerInfoClose");
const towerUpgradeBtn = document.getElementById("towerUpgradeBtn");
const towerSellBtn = document.getElementById("towerSellBtn");

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
  refreshTowerInfoPanel();

  if (state.overclockActive) {
    overclockBtn.textContent = `overclocked (${state.overclockTimer.toFixed(1)}s)`;
  } else if (state.overclockCooldown > 0) {
    overclockBtn.textContent = `overclock (${Math.ceil(state.overclockCooldown)}s)`;
  } else {
    overclockBtn.textContent = "overclock!";
  }
  overclockBtn.disabled = state.overclockCooldown > 0;
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

// Tracks where the pointer/finger currently is over the canvas, so a ghost
// tower + range preview can follow it while a tower type is selected -
// updated on hover (mouse) and on touch-drag (no hover concept on touch).
let previewPos = null;

function handlePlacementOrSelection(pos) {
  const { x, y } = pos;
  const hitTower = state.towers.find((t) => distance(t.x, t.y, x, y) <= CELL * 0.36);
  if (hitTower) {
    selectTower(hitTower);
    return;
  }

  if (!state.selectedTowerType) return;
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
    level: 1,
    totalInvested: def.cost,
    totalDamageDealt: 0,
    ...def,
  });
  updateStats();
}

canvas.addEventListener("pointerdown", (evt) => {
  if (state.gameOver) return;
  evt.preventDefault();
  previewPos = canvasPosFromEvent(evt);
});

canvas.addEventListener("pointermove", (evt) => {
  if (state.gameOver) return;
  previewPos = canvasPosFromEvent(evt);
});

canvas.addEventListener("pointerup", (evt) => {
  if (state.gameOver) return;
  previewPos = canvasPosFromEvent(evt);
  handlePlacementOrSelection(previewPos);
});

canvas.addEventListener("pointerleave", () => {
  previewPos = null;
});

// ---------- Tower selection / upgrade / sell ----------
function selectTower(t) {
  state.selectedTower = t;
  state.selectedTowerType = null;
  refreshTowerButtons();
  refreshTowerInfoPanel();
}

function hideTowerInfoPanel() {
  state.selectedTower = null;
  towerInfoPanel.hidden = true;
}

function towerUpgradeCost(t) {
  const baseCost = TOWER_TYPES[t.type].cost;
  return Math.round(baseCost * 0.6 * Math.pow(1.6, t.level - 1));
}

function upgradeTower(t) {
  if (t.level >= MAX_TOWER_LEVEL) return;
  const cost = towerUpgradeCost(t);
  if (state.gold < cost) return;
  state.gold -= cost;
  t.level += 1;
  t.totalInvested += cost;

  const def = TOWER_TYPES[t.type];
  if (t.isSupport) {
    t.buffDamagePct = def.buffDamagePct * (1 + 0.25 * (t.level - 1));
    t.buffRatePct = def.buffRatePct * (1 + 0.25 * (t.level - 1));
  } else {
    t.damage = def.damage * (1 + 0.25 * (t.level - 1));
    t.range = def.range * (1 + 0.06 * (t.level - 1));
  }
  updateStats();
}

function sellTower(t) {
  const idx = state.towers.indexOf(t);
  if (idx === -1) return;
  state.gold += Math.round(t.totalInvested * 0.6);
  state.towers.splice(idx, 1);
  hideTowerInfoPanel();
  updateStats();
}

function refreshTowerInfoPanel() {
  const t = state.selectedTower;
  if (!t) {
    towerInfoPanel.hidden = true;
    return;
  }
  towerInfoPanel.hidden = false;
  const def = TOWER_TYPES[t.type];
  towerInfoName.textContent = `${def.emoji} ${def.name} (Lv.${t.level})`;
  const statsLine = t.isSupport
    ? `+${Math.round(t.buffDamagePct * 100)}% dmg, +${Math.round(t.buffRatePct * 100)}% rate to devs in range`
    : `dmg ${Math.round(t.damage)} | range ${Math.round(t.range)}`;
  towerInfoLevel.textContent = `${statsLine} | dealt: ${Math.round(t.totalDamageDealt || 0).toLocaleString()}`;

  if (t.level >= MAX_TOWER_LEVEL) {
    towerUpgradeBtn.textContent = "max level";
    towerUpgradeBtn.disabled = true;
  } else {
    const cost = towerUpgradeCost(t);
    towerUpgradeBtn.textContent = `upgrade (${cost}c)`;
    towerUpgradeBtn.disabled = state.gold < cost;
  }
  towerSellBtn.textContent = `sell (+${Math.round(t.totalInvested * 0.6)}c)`;
}

towerInfoClose.addEventListener("click", hideTowerInfoPanel);
towerUpgradeBtn.addEventListener("click", () => state.selectedTower && upgradeTower(state.selectedTower));
towerSellBtn.addEventListener("click", () => state.selectedTower && sellTower(state.selectedTower));

// A combat tower's damage/fire-rate multipliers from nearby Manager towers and Overclock.
function getTowerBuffs(tower) {
  let damageMult = 1;
  let rateMult = 1;
  for (const other of state.towers) {
    if (!other.isSupport) continue;
    if (distance(tower.x, tower.y, other.x, other.y) <= other.range) {
      damageMult += other.buffDamagePct;
      rateMult += other.buffRatePct;
    }
  }
  if (state.overclockActive) rateMult += 0.75;
  return { damageMult, rateMult };
}

// ---------- Overclock ability ----------
function activateOverclock() {
  if (state.overclockCooldown > 0 || state.gameOver) return;
  state.overclockActive = true;
  state.overclockTimer = OVERCLOCK_DURATION;
  state.overclockCooldown = OVERCLOCK_COOLDOWN;
  updateStats();
}

function updateOverclock(dt) {
  if (state.overclockActive) {
    state.overclockTimer -= dt;
    if (state.overclockTimer <= 0) state.overclockActive = false;
  }
  if (state.overclockCooldown > 0) {
    state.overclockCooldown = Math.max(0, state.overclockCooldown - dt);
  }
}

overclockBtn.addEventListener("click", activateOverclock);

speedBtn.addEventListener("click", () => {
  state.gameSpeed = state.gameSpeed === 1 ? 2 : 1;
  speedBtn.textContent = `${state.gameSpeed}x`;
  speedBtn.classList.toggle("active", state.gameSpeed === 2);
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
  if (waveNum % 5 === 0) {
    queue.push("boss"); // arrives last, as the wave's finale
  }
  return queue;
}

function startNextWave() {
  if (state.waveInProgress || state.gameOver) return;
  state.autoRunTimer = 0;
  state.wave += 1;
  state.spawnQueue = buildWave(state.wave);
  state.spawnTimer = 0;
  state.waveInProgress = true;
  waveBtn.disabled = true;
  waveBtn.textContent = `sprint ${state.wave} in progress...`;
  updateStats();
}

waveBtn.addEventListener("click", startNextWave);

const AUTO_RUN_DELAY = 2;

autoRunBtn.addEventListener("click", () => {
  state.autoRun = !state.autoRun;
  autoRunBtn.textContent = state.autoRun ? "auto: on" : "auto: off";
  autoRunBtn.classList.toggle("active", state.autoRun);
  if (state.autoRun) startNextWave();
});

function spawnEnemy(type) {
  const def = ENEMY_TYPES[type];
  let hp = def.hp;
  let reward = def.reward;
  if (type === "boss") {
    hp = Math.round(def.hp * (1 + state.wave * 0.18));
    reward = Math.round(def.reward + state.wave * 4);
  }
  state.enemies.push({
    type,
    x: PATH_POINTS[0].x,
    y: PATH_POINTS[0].y,
    hp,
    maxHp: hp,
    speed: def.speed,
    reward,
    lifeDamage: def.lifeDamage,
    color: def.color,
    radius: def.radius,
    emoji: def.emoji,
    isBoss: type === "boss",
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
    if (t.isSupport) continue; // managers boost - they don't attack
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
      const buffs = getTowerBuffs(t);
      state.projectiles.push({
        x: t.x,
        y: t.y,
        target: best,
        speed: t.projectileSpeed,
        damage: t.damage * buffs.damageMult,
        splashRadius: t.splashRadius || 0,
        color: t.color,
        sourceTower: t,
      });
      t.cooldown = t.fireRate / buffs.rateMult;
    }
  }
}

function applyDamage(enemy, amount, sourceTower) {
  enemy.hp -= amount;
  if (sourceTower) sourceTower.totalDamageDealt = (sourceTower.totalDamageDealt || 0) + amount;
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
        spawnExplosion(ix, iy, p.splashRadius, p.color);
        [...state.enemies].forEach((e) => {
          if (distance(ix, iy, e.x, e.y) <= p.splashRadius) {
            applyDamage(e, p.damage, p.sourceTower);
          }
        });
      } else {
        applyDamage(p.target, p.damage, p.sourceTower);
      }
      state.projectiles.splice(i, 1);
    } else {
      p.x += ((p.target.x - p.x) / d) * step;
      p.y += ((p.target.y - p.y) / d) * step;
    }
  }
}

// ---------- Explosions (visual only - AoE damage is applied where it lands) ----------
function spawnExplosion(x, y, radius, color) {
  state.explosions.push({ x, y, radius, color, age: 0, duration: 0.35 });
}

function updateExplosions(dt) {
  for (let i = state.explosions.length - 1; i >= 0; i--) {
    const ex = state.explosions[i];
    ex.age += dt;
    if (ex.age >= ex.duration) state.explosions.splice(i, 1);
  }
}

function updateSpawning(dt) {
  if (!state.waveInProgress) {
    if (state.autoRun && state.autoRunTimer > 0) {
      state.autoRunTimer -= dt;
      if (state.autoRunTimer <= 0) startNextWave();
    }
    return;
  }
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
    spawnEnemy(state.spawnQueue.shift());
    state.spawnTimer = 0.6;
  }
  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveInProgress = false;
    waveBtn.disabled = false;
    waveBtn.textContent = `deploy sprint ${state.wave + 1}`;
    if (state.autoRun) state.autoRunTimer = AUTO_RUN_DELAY;
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
    if (t.isSupport) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    if (t === state.selectedTower) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }

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

  // ghost preview: follows the pointer/finger while a tower type is selected
  if (state.selectedTowerType && previewPos) {
    const def = TOWER_TYPES[state.selectedTowerType];
    const col = Math.floor(previewPos.x / CELL);
    const row = Math.floor(previewPos.y / CELL);
    const inBounds = col >= 0 && col < COLS && row >= 0 && row < ROWS;
    if (inBounds) {
      const valid =
        !pathCells.has(`${col},${row}`) &&
        !state.towers.some((t) => t.col === col && t.row === row) &&
        state.gold >= def.cost;
      const center = cellCenter([col, row]);
      const previewColor = valid ? def.color : "#ff4444";

      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = previewColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(center.x, center.y, def.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = previewColor;
      ctx.globalAlpha = valid ? 0.5 : 0.35;
      ctx.beginPath();
      ctx.arc(center.x, center.y, CELL * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.font = `${CELL * 0.4}px sans-serif`;
      ctx.fillText(def.emoji, center.x, center.y + 1);
      ctx.globalAlpha = 1;
    }
  }

  // enemies
  for (const e of state.enemies) {
    if (e.isBoss) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 150);
      ctx.strokeStyle = `rgba(255,0,0,${0.4 + 0.3 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

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

  // explosions: expanding, fading ring where an AoE hit landed
  for (const ex of state.explosions) {
    const t = ex.age / ex.duration;
    const r = ex.radius * (0.35 + 0.65 * t);
    const alpha = 1 - t;
    ctx.fillStyle = ex.color;
    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ex.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ---------- Main loop ----------
let lastTime = performance.now();
function loop(now) {
  const rawDt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const dt = rawDt * state.gameSpeed;

  if (!state.gameOver) {
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateExplosions(dt);
    updateOverclock(dt);
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
  state.selectedTower = null;
  state.towers = [];
  state.enemies = [];
  state.projectiles = [];
  state.explosions = [];
  state.waveInProgress = false;
  state.spawnQueue = [];
  state.spawnTimer = 0;
  state.gameOver = false;
  state.gameSpeed = 1;
  state.overclockActive = false;
  state.overclockTimer = 0;
  state.overclockCooldown = 0;
  state.autoRun = false;
  state.autoRunTimer = 0;
  gameOverOverlay.classList.remove("visible");
  waveBtn.disabled = false;
  waveBtn.textContent = "deploy sprint 1";
  speedBtn.textContent = "1x";
  speedBtn.classList.remove("active");
  autoRunBtn.textContent = "auto: off";
  autoRunBtn.classList.remove("active");
  hideTowerInfoPanel();
  updateStats();
}

restartBtn.addEventListener("click", resetGame);

// ---------- Init ----------
buildTowerButtons();
updateStats();
requestAnimationFrame(loop);
