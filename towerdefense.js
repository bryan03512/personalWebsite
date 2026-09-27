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
  farmer: {
    name: "Consultant", desc: "no combat - generates credits over time", emoji: "💼",
    cost: 100, damage: 0, range: 0, fireRate: Infinity, color: "#34d399", projectileSpeed: 0,
    isEconomy: true, incomePerSec: 3,
  },
};

const OVERCLOCK_DURATION = 8;
const OVERCLOCK_COOLDOWN = 30;
const SPEED_STEPS = [1, 2, 5];

// Each tower unlocks a choice between two mutually-exclusive specialization
// paths once it reaches PATH_UNLOCK_LEVEL. Choosing one buys tier 1
// immediately; tiers 2 and 3 are bought afterward once the tower reaches
// their own (higher) level requirement. Choosing a path locks out the
// other permanently, but leveling continues independently throughout -
// path bonuses are separate multipliers/effects layered on top of level
// scaling, and each tier adds its own new effect rather than just bigger
// numbers on the same one.
const PATH_UNLOCK_LEVEL = 3;
const PATH_TIER_LEVELS = [3, 6, 10];

const TOWER_PATHS = {
  gamer: {
    speedrunner: {
      name: "Speedrunner",
      accentColor: "#00e5ff",
      tiers: [
        {
          desc: "much faster fire rate, shorter range", cost: 80,
          apply: (t) => { t.pathRateMult = 1.6; t.pathRangeMult = 0.8; },
        },
        {
          desc: "even faster, plus a chance to crit for 1.5x", cost: 150,
          apply: (t) => { t.pathRateMult = 2.3; t.critChance = 0.15; t.critMult = 1.5; },
        },
        {
          desc: "now hits 2 targets, bigger crits", cost: 260,
          apply: (t) => { t.pathRateMult = 3.0; t.critChance = 0.25; t.critMult = 2.0; t.multiShot = 2; },
        },
      ],
    },
    multiplayer: {
      name: "Multiplayer",
      accentColor: "#ff9f43",
      tiers: [
        { desc: "fires at 2 enemies at once", cost: 80, apply: (t) => { t.multiShot = 2; } },
        {
          desc: "fires at 3 enemies, wider range", cost: 150,
          apply: (t) => { t.multiShot = 3; t.pathRangeMult = 1.15; },
        },
        {
          desc: "fires at 4 enemies, bonus gold per kill", cost: 260,
          apply: (t) => { t.multiShot = 4; t.pathRangeMult = 1.15; t.bonusGoldPerKill = 1; },
        },
      ],
    },
  },
  coder: {
    architect: {
      name: "Architect",
      accentColor: "#ffd700",
      tiers: [
        {
          desc: "huge range & damage, even slower", cost: 140,
          apply: (t) => { t.pathDamageMult = 1.6; t.pathRangeMult = 1.4; t.pathRateMult = 0.7; },
        },
        {
          desc: "bigger hits, chance to crit for 2.5x", cost: 260,
          apply: (t) => { t.pathDamageMult = 2.3; t.pathRangeMult = 1.7; t.pathRateMult = 0.7; t.critChance = 0.2; t.critMult = 2.5; },
        },
        {
          desc: "massive range/damage, extra dmg vs bosses", cost: 450,
          apply: (t) => { t.pathDamageMult = 3.2; t.pathRangeMult = 2.0; t.pathRateMult = 0.7; t.critChance = 0.3; t.critMult = 3.0; t.bossDamageMult = 1.5; },
        },
      ],
    },
    debugger: {
      name: "Debugger",
      accentColor: "#8b5cf6",
      tiers: [
        { desc: "slows hit enemies 40% for 2s", cost: 140, apply: (t) => { t.slowOnHit = { pct: 0.4, duration: 2 }; } },
        {
          desc: "stronger slow, plus a passive slow aura in range", cost: 260,
          apply: (t) => { t.slowOnHit = { pct: 0.55, duration: 3 }; t.auraSlowPct = 0.15; },
        },
        {
          desc: "even stronger slow/aura, extra dmg vs merge conflicts", cost: 450,
          apply: (t) => { t.slowOnHit = { pct: 0.7, duration: 4 }; t.auraSlowPct = 0.25; t.tankDamageMult = 1.4; },
        },
      ],
    },
  },
  hacker: {
    ddos: {
      name: "DDoS",
      accentColor: "#ff5722",
      tiers: [
        { desc: "much bigger blast radius", cost: 200, apply: (t) => { t.pathSplashMult = 1.7; t.pathDamageMult = 1.15; } },
        {
          desc: "even bigger blast, more damage", cost: 340,
          apply: (t) => { t.pathSplashMult = 2.2; t.pathDamageMult = 1.3; },
        },
        {
          desc: "huge blast, mines gold from every kill in it", cost: 550,
          apply: (t) => { t.pathSplashMult = 2.8; t.pathDamageMult = 1.5; t.bonusGoldPerKill = 2; },
        },
      ],
    },
    zeroday: {
      name: "Zero-Day",
      accentColor: "#ffee58",
      tiers: [
        { desc: "+100% dmg vs bosses, +50% vs merge conflicts", cost: 200, apply: (t) => { t.bossDamageMult = 2.0; t.tankDamageMult = 1.5; } },
        {
          desc: "even more dmg vs both, chance to crit 2x", cost: 340,
          apply: (t) => { t.bossDamageMult = 2.75; t.tankDamageMult = 2.0; t.critChance = 0.2; t.critMult = 2.0; },
        },
        {
          desc: "devastating vs both, bigger crits, more base dmg", cost: 550,
          apply: (t) => { t.bossDamageMult = 3.5; t.tankDamageMult = 2.5; t.critChance = 0.3; t.critMult = 2.5; t.pathDamageMult = 1.2; },
        },
      ],
    },
  },
  manager: {
    scrummaster: {
      name: "Scrum Master",
      accentColor: "#2ec4b6",
      tiers: [
        { desc: "much bigger fire-rate buff to allies", cost: 130, apply: (t) => { t.pathBuffRateMult = 2.2; t.pathBuffDamageMult = 0.5; } },
        {
          desc: "even bigger rate buff, bigger support radius", cost: 240,
          apply: (t) => { t.pathBuffRateMult = 3.0; t.pathBuffDamageMult = 0.6; t.pathRangeMult = 1.2; },
        },
        {
          desc: "huge rate buff & radius for the whole team", cost: 400,
          apply: (t) => { t.pathBuffRateMult = 3.8; t.pathBuffDamageMult = 0.7; t.pathRangeMult = 1.4; },
        },
      ],
    },
    techlead: {
      name: "Tech Lead",
      accentColor: "#e05353",
      tiers: [
        { desc: "much bigger damage buff to allies", cost: 130, apply: (t) => { t.pathBuffDamageMult = 2.2; t.pathBuffRateMult = 0.5; } },
        {
          desc: "even bigger damage buff, bigger support radius", cost: 240,
          apply: (t) => { t.pathBuffDamageMult = 3.0; t.pathBuffRateMult = 0.6; t.pathRangeMult = 1.2; },
        },
        {
          desc: "huge damage buff & radius for the whole team", cost: 400,
          apply: (t) => { t.pathBuffDamageMult = 3.8; t.pathBuffRateMult = 0.7; t.pathRangeMult = 1.4; },
        },
      ],
    },
  },
  farmer: {
    retainer: {
      name: "Retainer Client",
      accentColor: "#ffd700",
      tiers: [
        { desc: "generates a lot more credits/sec", cost: 90, apply: (t) => { t.pathIncomeMult = 1.8; } },
        { desc: "even more credits/sec", cost: 170, apply: (t) => { t.pathIncomeMult = 2.6; } },
        {
          desc: "huge credits/sec, instant IPO payout", cost: 300,
          apply: (t) => { t.pathIncomeMult = 3.6; state.gold += 200; },
        },
      ],
    },
    vc: {
      name: "Venture Capital",
      accentColor: "#4d9de0",
      tiers: [
        { desc: "all towers/upgrades cost 5% less", cost: 90, apply: (t) => { t.costDiscountPct = 0.05; } },
        { desc: "all towers/upgrades cost 10% less", cost: 170, apply: (t) => { t.costDiscountPct = 0.10; } },
        {
          desc: "towers/upgrades cost 18% less, instant seed funding", cost: 300,
          apply: (t) => { t.costDiscountPct = 0.18; state.gold += 150; },
        },
      ],
    },
  },
};

const ENEMY_TYPES = {
  basic: { label: "Bug", emoji: "🐛", hp: 50, speed: 60, reward: 5, lifeDamage: 1, color: "#e05353", radius: 14 },
  fast: { label: "Glitch", emoji: "⚡", hp: 25, speed: 130, reward: 5, lifeDamage: 1, color: "#ffee58", radius: 12 },
  tank: { label: "Merge Conflict", emoji: "💀", hp: 160, speed: 35, reward: 12, lifeDamage: 2, color: "#8a4a2b", radius: 17 },
  boss: { label: "Production Outage", emoji: "🔥", hp: 400, speed: 30, reward: 60, lifeDamage: 5, color: "#ff3b3b", radius: 24 },
};

// ---------- Game state ----------
const state = {
  gold: 150,
  bestGold: 150,
  lives: 20,
  wave: 0,
  bestWave: 0,
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
  ownerId: null,
};

// ---------- Canvas / DOM ----------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const goldStat = document.getElementById("goldStat");
const livesStat = document.getElementById("livesStat");
const waveStat = document.getElementById("waveStat");
const bestWaveStat = document.getElementById("bestWaveStat");
const bestGoldStat = document.getElementById("bestGoldStat");
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
const towerPathSection = document.getElementById("towerPathSection");
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
  if (state.gold > state.bestGold) state.bestGold = state.gold;
  goldStat.textContent = Math.floor(state.gold);
  bestGoldStat.textContent = Math.floor(state.bestGold);
  livesStat.textContent = state.lives;
  waveStat.textContent = state.wave;
  bestWaveStat.textContent = state.bestWave;
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

// ---------- Save / load (local + cloud) ----------
// Only progress *between* sprints is persisted (gold, towers, wave count) -
// a wave in flight (enemies/projectiles) is not resumable and simply isn't
// saved, so reloading mid-sprint just resumes at "ready for next sprint".
const TD_SAVE_KEY = "towerDefenseSave";

function saveGame() {
  state.lastSaveTime = Date.now();
  const payload = {
    gold: state.gold,
    bestGold: state.bestGold,
    lives: state.lives,
    wave: state.wave,
    bestWave: state.bestWave,
    kills: state.kills,
    towers: state.towers,
    gameSpeed: state.gameSpeed,
    lastSaveTime: state.lastSaveTime,
    ownerId: state.ownerId,
  };
  localStorage.setItem(TD_SAVE_KEY, JSON.stringify(payload));
  scheduleCloudSync();
}

function applyLoadedState(parsed) {
  if (!parsed) return;
  if (typeof parsed.gold === "number") state.gold = parsed.gold;
  if (typeof parsed.lives === "number") state.lives = parsed.lives;
  if (typeof parsed.wave === "number") state.wave = parsed.wave;
  if (typeof parsed.bestWave === "number") state.bestWave = parsed.bestWave;
  if (typeof parsed.kills === "number") state.kills = parsed.kills;
  state.gameSpeed = SPEED_STEPS.includes(parsed.gameSpeed) ? parsed.gameSpeed : 1;
  state.lastSaveTime = parsed.lastSaveTime || Date.now();
  state.ownerId = typeof parsed.ownerId === "string" ? parsed.ownerId : null;
  if (typeof parsed.bestGold === "number") state.bestGold = parsed.bestGold;
  // Guard against a stale/incomplete snapshot (e.g. a cloud push that lost a
  // race with navigating away mid-round) silently deleting placed towers -
  // never adopt an incoming towers list that's smaller than what's already here.
  if (Array.isArray(parsed.towers) && parsed.towers.length >= state.towers.length) {
    state.towers = parsed.towers;
  }
}

function loadGame() {
  const saved = localStorage.getItem(TD_SAVE_KEY);
  if (!saved) return;
  try {
    applyLoadedState(JSON.parse(saved));
  } catch {
    // ignore corrupted save
  }
}

// Cloud push happens on a flat 20s heartbeat instead of a cancellable
// debounce - a single-shot setTimeout gets destroyed outright by navigating
// to another page before it fires, which could leave the cloud save stale
// even though localStorage (written synchronously on every change) was fine.
let cloudDirty = false;

function scheduleCloudSync() {
  cloudDirty = true;
}

async function flushCloudSync() {
  if (!cloudDirty || typeof accountGetUser !== "function") return;
  const user = await accountGetUser();
  if (!user) return;
  cloudDirty = false;
  const saved = localStorage.getItem(TD_SAVE_KEY);
  if (saved) saveCloudField("towerdefense", JSON.parse(saved));
}

setInterval(flushCloudSync, 20000);
window.addEventListener("pagehide", () => {
  saveGame();
  flushCloudSync();
});

function syncSpeedButton() {
  speedBtn.textContent = `${state.gameSpeed}x`;
  speedBtn.classList.toggle("active", state.gameSpeed > 1);
}

// The local save is tagged with the account id it belongs to (state.ownerId).
// If that matches whoever is currently logged in, this is the same account
// continuing on this device, so cloud vs local is merged by recency (cloud
// might be ahead if they played elsewhere since this device's last save).
// If it doesn't match (was a guest, or a different account), local state has
// nothing to do with this account, so recency comparisons are meaningless -
// the account's own cloud save is adopted outright instead, UNLESS this is a
// brand-new account with no cloud save yet, in which case current (guest)
// progress is kept and gets claimed as that account's save on the next
// saveGame() - so "play as guest, then sign up" doesn't lose progress.
async function pullCloudSave() {
  if (typeof accountGetUser !== "function") return;
  const user = await accountGetUser();
  if (!user) return;

  const cloudState = await loadCloudSave("towerdefense");
  if (state.ownerId === user.id) {
    if (cloudState && (cloudState.lastSaveTime || 0) >= (state.lastSaveTime || 0)) {
      applyLoadedState(cloudState);
    }
  } else if (cloudState) {
    applyLoadedState(cloudState);
  }
  state.ownerId = user.id;
  saveGame();
  updateStats();
  syncSpeedButton();
}

window.addEventListener("account:login", pullCloudSave);

// Logging out should never leave the previous account's data on screen (or
// in localStorage, on a shared device) - snap straight back to a blank
// guest state, including bestWave, which is tied to that account's identity.
window.addEventListener("account:logout", () => {
  resetTransientState();
  state.bestWave = 0;
  state.bestGold = 150;
  state.ownerId = null;
  localStorage.removeItem(TD_SAVE_KEY);
  syncSpeedButton();
  updateStats();
});

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
  const cost = Math.round(def.cost * (1 - getCostDiscount()));
  if (state.gold < cost) return;

  state.gold -= cost;
  const center = cellCenter([col, row]);
  const tower = {
    type: state.selectedTowerType,
    col,
    row,
    x: center.x,
    y: center.y,
    cooldown: 0,
    level: 1,
    path: null,
    pathTier: 0,
    totalInvested: cost,
    totalDamageDealt: 0,
    flashUntil: performance.now() + 400,
    visualStage: 0,
    ...def,
  };
  recomputeTowerStats(tower);
  state.towers.push(tower);
  updateStats();
  saveGame();
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

// Sum of cost-discount percentages from every placed Venture Capital farmer.
function getCostDiscount() {
  let discount = 0;
  for (const t of state.towers) {
    if (t.costDiscountPct) discount += t.costDiscountPct;
  }
  return Math.min(discount, 0.6); // sanity cap so towers never approach free
}

function towerUpgradeCost(t) {
  const baseCost = TOWER_TYPES[t.type].cost;
  const raw = baseCost * 0.6 * Math.pow(1.6, t.level - 1);
  return Math.round(raw * (1 - getCostDiscount()));
}

// Recomputes a tower's derived stats from its base definition, level, and
// (if chosen) its path multipliers. Path bonuses are permanent multipliers
// layered on top of level scaling, so leveling keeps working the same way
// after a path is chosen - called on placement, on level-up, and right
// after a path tier is bought.
function recomputeTowerStats(t) {
  const def = TOWER_TYPES[t.type];
  const levelFactor = 1 + 0.25 * (t.level - 1);
  const rangeLevelFactor = 1 + 0.06 * (t.level - 1);
  t.range = def.range * rangeLevelFactor * (t.pathRangeMult || 1);
  if (t.isSupport) {
    t.buffDamagePct = def.buffDamagePct * levelFactor * (t.pathBuffDamageMult || 1);
    t.buffRatePct = def.buffRatePct * levelFactor * (t.pathBuffRateMult || 1);
  } else if (t.isEconomy) {
    t.incomePerSec = def.incomePerSec * levelFactor * (t.pathIncomeMult || 1);
  } else {
    t.damage = def.damage * levelFactor * (t.pathDamageMult || 1);
    t.fireRate = def.fireRate / (t.pathRateMult || 1);
    t.splashRadius = (def.splashRadius || 0) * (t.pathSplashMult || 1);
  }
}

// Visual milestones: 0 = base, 1 = after 1st upgrade (level 2), 2 = after
// 2nd upgrade (level 3), 3 = after a path is chosen. Drawn as a growing,
// more elaborate ring around the tower (see draw()). Also triggers the
// brief upgrade-flash animation.
function markVisualMilestone(t, stage) {
  if (stage > (t.visualStage || 0)) t.visualStage = stage;
  t.flashUntil = performance.now() + 400;
}

function upgradeTower(t) {
  const cost = towerUpgradeCost(t);
  if (state.gold < cost) return;
  state.gold -= cost;
  t.level += 1;
  t.totalInvested += cost;
  recomputeTowerStats(t);
  if (t.level === 2) markVisualMilestone(t, 1);
  else if (t.level === 3) markVisualMilestone(t, 2);
  else t.flashUntil = performance.now() + 400;
  updateStats();
  saveGame();
}

// Buys the next tier of a tower's path: tier 0 picks the path (locking out
// the other one permanently), tiers 1-2 advance an already-chosen path.
// Each tier has its own level requirement (PATH_TIER_LEVELS) and cost.
function buyPathTier(t, pathId) {
  const pathDef = TOWER_PATHS[t.type]?.[pathId];
  if (!pathDef) return;
  if (t.path && t.path !== pathId) return;

  const nextTierIndex = t.pathTier || 0;
  const tier = pathDef.tiers[nextTierIndex];
  if (!tier) return; // already maxed
  if (t.level < PATH_TIER_LEVELS[nextTierIndex] || state.gold < tier.cost) return;

  state.gold -= tier.cost;
  t.path = pathId;
  t.pathTier = nextTierIndex + 1;
  tier.apply(t);
  recomputeTowerStats(t);
  if (nextTierIndex === 0) markVisualMilestone(t, 3);
  else t.flashUntil = performance.now() + 400;
  updateStats();
  saveGame();
}

function sellTower(t) {
  const idx = state.towers.indexOf(t);
  if (idx === -1) return;
  state.gold += Math.round(t.totalInvested * 0.6);
  state.towers.splice(idx, 1);
  hideTowerInfoPanel();
  updateStats();
  saveGame();
}

function refreshTowerInfoPanel() {
  const t = state.selectedTower;
  if (!t) {
    towerInfoPanel.hidden = true;
    return;
  }
  towerInfoPanel.hidden = false;
  const def = TOWER_TYPES[t.type];
  const pathLabel = t.path ? ` - ${TOWER_PATHS[t.type][t.path].name} T${t.pathTier}` : "";
  towerInfoName.textContent = `${def.emoji} ${def.name} (Lv.${t.level})${pathLabel}`;
  let statsLine;
  if (t.isSupport) {
    statsLine = `+${Math.round(t.buffDamagePct * 100)}% dmg, +${Math.round(t.buffRatePct * 100)}% rate to devs in range`;
  } else if (t.isEconomy) {
    statsLine = `+${t.incomePerSec.toFixed(1)} credits/sec`;
  } else {
    statsLine = `dmg ${Math.round(t.damage)} | range ${Math.round(t.range)}`;
  }
  towerInfoLevel.textContent = `${statsLine} | dealt: ${Math.round(t.totalDamageDealt || 0).toLocaleString()}`;

  const cost = towerUpgradeCost(t);
  towerUpgradeBtn.textContent = `upgrade (${cost}c)`;
  towerUpgradeBtn.disabled = state.gold < cost;
  towerSellBtn.textContent = `sell (+${Math.round(t.totalInvested * 0.6)}c)`;

  refreshTowerPathSection(t);
}

function refreshTowerPathSection(t) {
  const paths = TOWER_PATHS[t.type];
  towerPathSection.innerHTML = "";
  if (!paths) return;

  const tierIndex = t.pathTier || 0;

  if (t.path) {
    const chosen = paths[t.path];
    for (let i = 0; i < tierIndex; i++) {
      const p = document.createElement("p");
      p.className = "tower-path-chosen";
      p.textContent = `${chosen.name} T${i + 1}: ${chosen.tiers[i].desc}`;
      towerPathSection.appendChild(p);
    }
    const nextTier = chosen.tiers[tierIndex];
    if (nextTier) {
      const requiredLevel = PATH_TIER_LEVELS[tierIndex];
      if (t.level < requiredLevel) {
        const hint = document.createElement("p");
        hint.className = "tower-path-hint";
        hint.textContent = `reach level ${requiredLevel} for ${chosen.name} T${tierIndex + 1}: ${nextTier.desc}`;
        towerPathSection.appendChild(hint);
      } else {
        const btn = document.createElement("button");
        btn.className = "btn path-btn";
        btn.innerHTML = `<span class="path-name">${chosen.name} T${tierIndex + 1}</span><span class="path-desc">${nextTier.desc}</span><span class="path-cost">${nextTier.cost}c</span>`;
        btn.disabled = state.gold < nextTier.cost;
        btn.addEventListener("click", () => buyPathTier(t, t.path));
        towerPathSection.appendChild(btn);
      }
    }
    return;
  }

  if (t.level < PATH_UNLOCK_LEVEL) {
    const p = document.createElement("p");
    p.className = "tower-path-hint";
    p.textContent = `reach level ${PATH_UNLOCK_LEVEL} to choose a specialization path`;
    towerPathSection.appendChild(p);
    return;
  }

  Object.entries(paths).forEach(([pathId, pathDef]) => {
    const tier1 = pathDef.tiers[0];
    const btn = document.createElement("button");
    btn.className = "btn path-btn";
    btn.innerHTML = `<span class="path-name">${pathDef.name}</span><span class="path-desc">${tier1.desc}</span><span class="path-cost">${tier1.cost}c</span>`;
    btn.disabled = state.gold < tier1.cost;
    btn.addEventListener("click", () => buyPathTier(t, pathId));
    towerPathSection.appendChild(btn);
  });
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

// Passive income from Consultant towers, and passive slow auras from
// upgraded Debuggers - both run continuously regardless of fire cooldown.
function updateEconomy(dt) {
  for (const t of state.towers) {
    if (t.isEconomy) state.gold += t.incomePerSec * dt;
  }
}

function updateAuras(dt) {
  for (const t of state.towers) {
    if (!t.auraSlowPct) continue;
    for (const e of state.enemies) {
      if (distance(t.x, t.y, e.x, e.y) <= t.range) {
        e.slowPct = Math.max(e.slowPct || 0, t.auraSlowPct);
        e.slowTimer = Math.max(e.slowTimer || 0, 0.4);
      }
    }
  }
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
  const idx = SPEED_STEPS.indexOf(state.gameSpeed);
  state.gameSpeed = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
  syncSpeedButton();
  saveGame();
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
  if (state.wave > state.bestWave) state.bestWave = state.wave;
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
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer < 0) e.slowTimer = 0;
    }
    const speedMult = e.slowTimer > 0 ? 1 - e.slowPct : 1;

    const d = distance(e.x, e.y, target.x, target.y);
    const step = e.speed * speedMult * dt;
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

// Returns up to `count` enemies within range, nearest first.
function findTargets(t, count) {
  const inRange = [];
  for (const e of state.enemies) {
    const d = distance(t.x, t.y, e.x, e.y);
    if (d <= t.range) inRange.push({ e, d });
  }
  inRange.sort((a, b) => a.d - b.d);
  return inRange.slice(0, count).map((entry) => entry.e);
}

function updateTowers(dt) {
  for (const t of state.towers) {
    if (t.isSupport || t.isEconomy) continue; // managers/consultants don't attack
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;

    const targets = findTargets(t, t.multiShot || 1);
    if (targets.length > 0) {
      const buffs = getTowerBuffs(t);
      for (const target of targets) {
        let dmg = t.damage * buffs.damageMult;
        const isCrit = t.critChance && Math.random() < t.critChance;
        if (isCrit) dmg *= t.critMult || 2;
        state.projectiles.push({
          x: t.x,
          y: t.y,
          target,
          speed: t.projectileSpeed,
          damage: dmg,
          isCrit,
          splashRadius: t.splashRadius || 0,
          color: t.color,
          sourceTower: t,
        });
      }
      t.cooldown = t.fireRate / buffs.rateMult;
    }
  }
}

function applyDamage(enemy, amount, sourceTower) {
  if (sourceTower) {
    if (sourceTower.bossDamageMult && enemy.isBoss) amount *= sourceTower.bossDamageMult;
    else if (sourceTower.tankDamageMult && enemy.type === "tank") amount *= sourceTower.tankDamageMult;

    if (sourceTower.slowOnHit) {
      enemy.slowPct = sourceTower.slowOnHit.pct;
      enemy.slowTimer = sourceTower.slowOnHit.duration;
    }
  }

  enemy.hp -= amount;
  if (sourceTower) sourceTower.totalDamageDealt = (sourceTower.totalDamageDealt || 0) + amount;
  if (enemy.hp <= 0) {
    const idx = state.enemies.indexOf(enemy);
    if (idx !== -1) {
      state.enemies.splice(idx, 1);
      state.gold += enemy.reward;
      if (sourceTower?.bonusGoldPerKill) state.gold += sourceTower.bonusGoldPerKill;
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
  saveGame();
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

    // visual evolution: a growing, more elaborate ring per upgrade milestone
    const stage = t.visualStage || 0;
    if (stage >= 1) {
      ctx.strokeStyle = "#cfd8dc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.34 + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (stage >= 2) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.34 + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (stage >= 3) {
      // Colored by which path was chosen (not the tower's own base color),
      // so the two paths for a given tower type are visually distinguishable.
      const pathColor = TOWER_PATHS[t.type]?.[t.path]?.accentColor || t.color;
      const spin = (performance.now() / 40) % 24;
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = -spin;
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.34 + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // brief flash pulse right after placing/upgrading/leveling up
    if (t.flashUntil && t.flashUntil > performance.now()) {
      const remaining = t.flashUntil - performance.now();
      const p = 1 - remaining / 400;
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.3 + p * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
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

    if (e.slowTimer > 0) {
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
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
    updateEconomy(dt);
    updateAuras(dt);
    updateProjectiles(dt);
    updateExplosions(dt);
    updateOverclock(dt);
    updateStats();
  }
  draw();
  requestAnimationFrame(loop);
}

// ---------- Restart ----------
// Shared by "restart after a loss" (resetGame) and "logged out" - the two
// differ only in whether bestWave/ownerId (tied to account identity) reset.
function resetTransientState() {
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
}

function resetGame() {
  resetTransientState();
  updateStats();
  saveGame();
}

restartBtn.addEventListener("click", resetGame);

// ---------- Init ----------
buildTowerButtons();
loadGame();
syncSpeedButton();
updateStats();
requestAnimationFrame(loop);
setInterval(saveGame, 3000);
pullCloudSave();

if (typeof createTutorial === "function") {
  createTutorial("towerdefense", [
    {
      title: "welcome to tower_defense.sh",
      text: "Bugs crawl along the path toward your uptime. Select a dev from the list, then drag onto the board to place them - they'll auto-attack anything in range.",
    },
    {
      title: "credits & income",
      text: "Placing towers costs credits. Defeating bugs earns credits back, and a Consultant tower generates credits passively over time even without fighting.",
    },
    {
      title: "start a sprint",
      text: "Click 'deploy sprint' to send the next wave. Losing all your uptime ends the run - toggle 'auto' to launch sprints automatically, and use the speed button to speed up play.",
    },
    {
      title: "upgrade & specialize",
      text: "Click a placed dev to upgrade its stats, or sell it for some credits back. At level 3 you can lock in a permanent specialization path with 3 tiers of its own - choose carefully, it can't be undone.",
    },
    {
      title: "bosses & the leaderboard",
      text: "Every 5th sprint brings a tough boss. Use 'overclock' for an emergency damage burst - and remember, your best sprint ever reached is what counts on the leaderboard, even after you lose.",
    },
  ]);
}
