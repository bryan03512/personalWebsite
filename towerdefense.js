// ---------- Grid / path setup ----------
// Grid halved (was 60/13/10) so more world fits the same 780x600 canvas -
// "zoomed out" for longer, more winding paths. The grid is now only used to
// author waypoints/obstacles/background gridlines; tower placement itself
// is free-form pixel coordinates, not cell-snapped (see canPlaceTowerAt).
const CELL = 30;
const COLS = 26;
const ROWS = 20;

function cellCenter([col, row]) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

// Three maps, each just a different path shape on the same grid - same
// towers, enemies, and rules everywhere. Each map also carries its own
// static obstacles/walls: rects towers can't be placed on or overlapping
// (see canPlaceTowerAt) - purely footprint blockers, they don't affect
// enemy movement or tower targeting (towers "see over" them).
// Listed (and shown in the picker) in order from easiest to hardest map
// LAYOUT - tier is about the path shape itself (length, how many times it
// loops back near its own earlier stretch giving towers a second crack at
// the same enemies, overall enemy travel time) and is entirely separate
// from the Easy/Normal/Hard per-save difficulty picked alongside it.
const MAP_DEFS = {
  // Long path that loops back near itself twice, so well-placed towers get
  // two separate exposure windows on the same enemies - the easiest layout.
  map3: {
    name: "The Monolith",
    tier: "easy",
    waypoints: [
      [-1, 8], [8, 8], [8, 1], [16, 1], [16, 12], [5, 12], [5, 18], [22, 18],
      [22, 4], [13, 4], [13, 15], [24, 15], [24, 9], [26, 9],
    ],
    obstacles: [
      { x: 285, y: 90, w: 90, h: 80, kind: "obstacle" },
      { x: 18 * 30, y: 3 * 30, w: 3 * 30, h: 6 * 30, kind: "wall" },
      { x: 8 * 30, y: 14 * 30, w: 4 * 30, h: 3 * 30, kind: "obstacle" },
      { x: 18 * 30, y: 10 * 30, w: 3 * 30, h: 4 * 30, kind: "wall" },
    ],
    groundColor: "#4a7a52", groundAccent: "#557f5c", dirtColor: "#463a52",
    stoneColors: ["#7c6f8a", "#71647e", "#665973"],
  },
  map1: {
    name: "Main Branch",
    tier: "medium",
    waypoints: [
      [-1, 2], [6, 2], [6, 6], [2, 6], [2, 10], [10, 10], [10, 4], [14, 4],
      [14, 14], [4, 14], [4, 17], [20, 17], [20, 8], [24, 8], [24, 2], [26, 2],
    ],
    obstacles: [
      { x: 16 * 30, y: 10 * 30, w: 3 * 30, h: 3 * 30, kind: "obstacle" },
      { x: 200, y: 220, w: 70, h: 70, kind: "obstacle" },
      { x: 22 * 30, y: 10 * 30, w: 2 * 30, h: 4 * 30, kind: "wall" },
      { x: 250, y: 460, w: 90, h: 40, kind: "wall" },
    ],
    groundColor: "#5fae3d", groundAccent: "#6dc248", dirtColor: "#8a6d43",
    stoneColors: ["#c9b28a", "#bfa47a", "#b3986c"],
  },
  map2: {
    name: "CI Pipeline",
    tier: "medium",
    // Rows 3 apart (was 2) so free placement actually has a legal gap
    // between adjacent zigzag lanes - a tighter pitch left zero buildable
    // space anywhere once path clearance is a continuous distance instead
    // of a single exclusive grid cell.
    waypoints: [
      [-1, 1], [24, 1], [24, 4], [2, 4], [2, 7], [24, 7], [24, 10], [2, 10],
      [2, 13], [24, 13], [24, 16], [2, 16], [2, 19], [26, 19],
    ],
    obstacles: [
      { x: 280, y: 75, w: 80, h: 28, kind: "wall" },
      { x: 410, y: 255, w: 80, h: 28, kind: "obstacle" },
      { x: 120, y: 435, w: 80, h: 28, kind: "wall" },
    ],
    groundColor: "#4f9d78", groundAccent: "#5cb086", dirtColor: "#5c5f66",
    stoneColors: ["#9aa0a6", "#8d9298", "#80858b"],
  },
  // A stepped notch partway along (the col14-18/row3-8 detour) - a squared-
  // off bracket shape, echoing a patio walkway with a pool cut into one corner.
  map4: {
    name: "Staging Loop",
    tier: "medium",
    waypoints: [
      [-1, 10], [4, 10], [4, 3], [14, 3], [14, 8], [18, 8], [18, 3], [24, 3],
      [24, 16], [8, 16], [8, 12], [26, 12],
    ],
    obstacles: [
      { x: 6 * 30, y: 5 * 30, w: 3 * 30, h: 2 * 30, kind: "obstacle" },
      { x: 20 * 30, y: 5 * 30, w: 3 * 30, h: 2 * 30, kind: "wall" },
      { x: 300, y: 525, w: 120, h: 60, kind: "obstacle" },
      { x: 600, y: 525, w: 90, h: 50, kind: "wall" },
    ],
    groundColor: "#dcc389", groundAccent: "#e6d09c", dirtColor: "#b08a54",
    stoneColors: ["#e8d3a5", "#dcc494", "#cdb282"],
  },
  // The shortest path of the 5 (one rectangular spur near the start, then a
  // single zigzag swing to the exit) - least room and least enemy exposure
  // time, the hardest layout.
  map5: {
    name: "Feedback Loop",
    tier: "hard",
    waypoints: [
      [-1, 10], [5, 10], [5, 4], [9, 4], [9, 10], [13, 10], [13, 16], [19, 16],
      [19, 6], [24, 6], [24, 13], [26, 13],
    ],
    obstacles: [
      { x: 1 * 30, y: 2 * 30, w: 3 * 30, h: 2 * 30, kind: "obstacle" },
      { x: 15 * 30, y: 12 * 30, w: 3 * 30, h: 3 * 30, kind: "wall" },
      { x: 21 * 30, y: 9 * 30, w: 2 * 30, h: 3 * 30, kind: "obstacle" },
      { x: 21 * 30, y: 16 * 30, w: 3 * 30, h: 2 * 30, kind: "wall" },
    ],
    groundColor: "#5cb45c", groundAccent: "#6bc76b", dirtColor: "#6b6558",
    stoneColors: ["#a8a49a", "#9c988e", "#8f8b81"],
  },
};

const MAP_TIER_LABELS = { easy: "Easy map", medium: "Medium map", hard: "Hard map" };

// Waypoints in grid coordinates (col, row). First/last are off-canvas so
// enemies spawn/exit smoothly at the edges. Reassigned by applyMapLayout()
// whenever the active map changes - every reference elsewhere in the file
// reads these bindings live, so no other code needs to change.
let GRID_WAYPOINTS = MAP_DEFS.map1.waypoints;
let PATH_POINTS = GRID_WAYPOINTS.map(cellCenter);
let mapObstacles = MAP_DEFS.map1.obstacles;
// Ground decor, path stones, and obstacle blob shapes are all randomized
// once per map load (here) rather than every draw() call, so the texture
// stays put instead of flickering every frame.
let grassDecor = [];
let pathStones = [];

function applyMapLayout(mapId) {
  GRID_WAYPOINTS = MAP_DEFS[mapId].waypoints;
  PATH_POINTS = GRID_WAYPOINTS.map(cellCenter);
  mapObstacles = MAP_DEFS[mapId].obstacles || [];
  generateGrassDecor();
  generatePathStones();
  prepareObstacleVisuals(mapObstacles);
}

// A mix of small speckles, grass tufts, tiny flowers, and pebbles scattered
// across the buildable ground - purely decorative (drawn under towers),
// distinct from the obstacle blobs which actually block placement.
function generateGrassDecor() {
  grassDecor = [];
  const count = 320;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * COLS * CELL;
    const y = Math.random() * ROWS * CELL;
    if (distanceToPath(x, y) < PATH_VISUAL_WIDTH * 0.7) continue;
    const roll = Math.random();
    if (roll < 0.4) {
      grassDecor.push({ kind: "speckle", x, y, r: 1.3 + Math.random() * 2.2, light: Math.random() < 0.5 });
    } else if (roll < 0.7) {
      grassDecor.push({ kind: "tuft", x, y, angle: Math.random() * Math.PI * 2, size: 5 + Math.random() * 4 });
    } else if (roll < 0.88) {
      const palette = ["#ffffff", "#fde68a", "#f9a8d4"];
      grassDecor.push({ kind: "flower", x, y, size: 2.2 + Math.random() * 1.3, color: palette[Math.floor(Math.random() * palette.length)] });
    } else {
      grassDecor.push({ kind: "pebble", x, y, r: 2 + Math.random() * 2.5, angle: Math.random() * Math.PI });
    }
  }
}

// Stone pavers laid along the path polyline, each perpendicular-ish to the
// direction of travel and slightly randomized in size/angle/shade - the
// dirt-colored stroke drawn under them (see draw()) fills the grout/gaps so
// it reads as one continuous cobblestone trail instead of floating tiles.
function generatePathStones() {
  pathStones = [];
  const step = 32;
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const a = PATH_POINTS[i], b = PATH_POINTS[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen < 1) continue;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const count = Math.max(1, Math.round(segLen / step));
    for (let j = 0; j < count; j++) {
      const t = (j + 0.5) / count;
      pathStones.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle: angle + (Math.random() - 0.5) * 0.25,
        w: PATH_VISUAL_WIDTH * (0.62 + Math.random() * 0.2),
        h: step * (0.72 + Math.random() * 0.24),
        shadeIdx: Math.floor(Math.random() * 3),
      });
    }
  }
}

// Rocks (kind: "wall") and bushes (kind: "obstacle") are each a small
// cluster of overlapping blobs instead of a flat rectangle - randomized once
// per obstacle and cached on it, so re-visiting a map doesn't reshuffle them.
function prepareObstacleVisuals(obstacles) {
  const bushPalette = ["#4d7c2e", "#5a8f34", "#3f6b26", "#8a6d1f", "#b9862f"];
  obstacles.forEach((o) => {
    if (o.blobs) return;
    o.cx = o.x + o.w / 2;
    o.cy = o.y + o.h / 2;
    const spread = Math.min(o.w, o.h) * 0.35;
    const blobs = [];
    if (o.kind === "wall") {
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        blobs.push({
          dx: (Math.random() - 0.5) * o.w * 0.55,
          dy: (Math.random() - 0.5) * o.h * 0.55,
          r: spread * (0.65 + Math.random() * 0.5),
        });
      }
    } else {
      const count = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        blobs.push({
          dx: (Math.random() - 0.5) * o.w * 0.65,
          dy: (Math.random() - 0.5) * o.h * 0.65,
          r: spread * (0.55 + Math.random() * 0.5),
          color: bushPalette[Math.floor(Math.random() * bushPalette.length)],
        });
      }
    }
    o.blobs = blobs;
  });
}

// ---------- Free-placement geometry ----------
// Replaces the old "one tower per grid cell, never on a path cell" rule.
// Towers can go anywhere on the canvas as long as they clear the path,
// obstacles, the canvas edge, and other towers by these margins - all
// derived from TOWER_BODY_RADIUS (the actual drawn tower circle, see draw())
// so the invalid/red preview lines up with what the tower visually looks
// like, instead of an arbitrary bigger padding that flags a placement as
// blocked well before it actually touches anything.
const PATH_VISUAL_WIDTH = 46; // rendered path corridor width
const TOWER_BODY_RADIUS = CELL * 0.42; // bumped from 0.34 - towers a bit bigger
const TOWER_FOOTPRINT_RADIUS = TOWER_BODY_RADIUS; // clearance needed from the canvas edge/obstacles
const TOWER_MIN_SPACING = TOWER_BODY_RADIUS * 2; // two tower circles just touching, not overlapping
const PATH_CLEARANCE = TOWER_BODY_RADIUS + PATH_VISUAL_WIDTH / 2; // tower edge just clears the path corridor edge

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToPath(x, y) {
  let min = Infinity;
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const a = PATH_POINTS[i], b = PATH_POINTS[i + 1];
    min = Math.min(min, distToSegment(x, y, a.x, a.y, b.x, b.y));
  }
  return min;
}

function distanceToRect(x, y, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return Math.hypot(x - cx, y - cy);
}

function canPlaceTowerAt(x, y) {
  if (x < TOWER_FOOTPRINT_RADIUS || x > COLS * CELL - TOWER_FOOTPRINT_RADIUS) return false;
  if (y < TOWER_FOOTPRINT_RADIUS || y > ROWS * CELL - TOWER_FOOTPRINT_RADIUS) return false;
  if (distanceToPath(x, y) < PATH_CLEARANCE) return false;
  if (mapObstacles.some((o) => distanceToRect(x, y, o) < TOWER_FOOTPRINT_RADIUS)) return false;
  if (state.towers.some((t) => distance(t.x, t.y, x, y) < TOWER_MIN_SPACING)) return false;
  return true;
}

// A sentinel range value for towers with unlimited range (currently just the
// Sniper) - not literal Infinity, since that crashes canvas arc() calls
// wherever a range circle gets drawn. Far past the map's ~984px diagonal, so
// it's functionally always-in-range without being non-finite.
const GLOBAL_RANGE = 9999;
// A flat ceiling every tower's fully computed range (base * level * path *
// buffs) gets clamped to, unless the tower is explicitly flagged
// isGlobalRange (the Sniper's whole gimmick) - no amount of leveling or
// path investment can push a normal tower's range past this.
const MAP_RANGE_CAP = 175;

// ---------- Tower & enemy definitions ----------
const TOWER_TYPES = {
  // Ranges cut ~25% across the board (was 120/150/130/140/130/130/140/220/220)
  // so map positioning actually matters again - Sniper is the deliberate
  // exception, trading a slow fire rate and steep cost for seeing the whole
  // board from a single placement.
  gamer: {
    name: "Gamer", desc: "fast reflexes, rapid fire", emoji: "🎮",
    cost: 50, damage: 10, range: 105, fireRate: 0.6, color: "#39ff14", projectileSpeed: 500,
  },
  coder: {
    name: "Sniper", desc: "one precise shot, anywhere on the board - slow, but never needs repositioning", emoji: "🎯",
    cost: 260, damage: 60, range: GLOBAL_RANGE, fireRate: 2.5, color: "#00e5ff", projectileSpeed: 900,
    isGlobalRange: true,
  },
  hacker: {
    name: "Hacker", desc: "slow, heavy AoE exploit", emoji: "👾",
    cost: 170, damage: 55, range: 130, fireRate: 2.2, color: "#ff4fd8", projectileSpeed: 400, splashRadius: 65,
    damageType: "explosive",
  },
  manager: {
    name: "Manager", desc: "no damage - boosts nearby devs", emoji: "👔",
    cost: 120, damage: 0, range: 112, fireRate: Infinity, color: "#ffd166", projectileSpeed: 0,
    isSupport: true, buffDamagePct: 0.2, buffRatePct: 0.2,
  },
  farmer: {
    name: "Consultant", desc: "no combat - earns credits during sprints", emoji: "💼",
    cost: 100, damage: 0, range: 0, fireRate: Infinity, color: "#34d399", projectileSpeed: 0,
    isEconomy: true, incomePerSec: 3,
  },
  recruiter: {
    name: "Recruiter", desc: "deploys warriors that march backwards up the path to meet incoming bugs", emoji: "🧑‍💼",
    cost: 150, damage: 0, range: 0, fireRate: Infinity, color: "#f97316", projectileSpeed: 0,
    isRecruiter: true, deployInterval: 6, allyDamage: 14, allyRange: 34, allySpeed: 70, allyFireRate: 0.8, allyDuration: 6, allyCount: 1,
  },
  quant: {
    name: "Quant", desc: "arcane exploits - true damage, ignores all resistances", emoji: "🔮",
    cost: 220, damage: 0.018, range: 120, fireRate: 1.8, color: "#a78bfa", projectileSpeed: 550,
    damageType: "magic", percentDamage: true,
  },
  freeze: {
    name: "Freeze", desc: "chills on every hit - a full stop instead of a slow", emoji: "🧊",
    cost: 140, damage: 8, range: 112, fireRate: 1.0, color: "#7dd3fc", projectileSpeed: 550,
    slowOnHit: { pct: 1.0, duration: 1.2 },
  },
  tesla: {
    name: "Tesla", desc: "chains a shock through nearby enemies, weaker each bounce", emoji: "⚡",
    cost: 180, damage: 20, range: 112, fireRate: 1.2, color: "#fde047", projectileSpeed: 700,
    chainCount: 3, chainFalloff: 0.6, chainRange: 90,
  },
  turret: {
    name: "Sentry", desc: "no path - auto-levels for free over time, targets the strongest enemy in range, damage scales exponentially", emoji: "🗼",
    cost: 90, damage: 12, range: 120, fireRate: 1.3, color: "#94a3b8", projectileSpeed: 480,
    isSentry: true, autoLevels: true, autoLevelInterval: 20, targetPriority: "strongest",
  },
  shotgun: {
    name: "Shotgun", desc: "point-blank spread - hits several enemies at once, brutal up close but very short range", emoji: "🔫",
    cost: 130, damage: 16, range: 70, fireRate: 1.1, color: "#f43f5e", projectileSpeed: 600,
    multiShot: 3,
  },
  // Secret capstone towers - excluded from buildTowerButtons (and therefore
  // invisible/unknown) until each one's unlockCheck() passes. How many may
  // be placed at once is capped and grows with further milestones - see
  // tenxMaxCopies().
  tenx: {
    name: "10x Engineer", desc: "legendary - unlocked past sprint 100, capped copies grow past 140/200", emoji: "🦸",
    cost: 4000, damage: 140, range: 165, fireRate: 0.55, color: "#fbbf24", projectileSpeed: 900,
    // Re-locks whenever the current sprint drops back below the threshold
    // (e.g. after a restart) - checks state.wave (live), not state.bestWave
    // (historical, never decreases), unlike an achievement.
    isLegendary: true, unique: true, unlockCheck: () => state.wave > TOWER100_UNLOCK_WAVE,
  },
  singularity: {
    name: "Singularity", desc: "beyond legendary - unlocked by beating all 3 maps, can own every path at once (incl. an explosive one), auto-levels for free - stays mid until deep levels, then damage explodes", emoji: "🌌",
    cost: 6000, damage: 180, range: 165, fireRate: 0.5, color: "#f0abfc", projectileSpeed: 950,
    // Unlike 10x Engineer, this does NOT re-lock based on the current live
    // sprint - beating all 3 maps once is a permanent, historical unlock, so
    // it's usable from sprint 1 onward afterward. Balance instead comes from
    // its own path tiers being expensive (T5 costs 100x), so it stays a
    // mid-power option in the early/mid game and only becomes a standout once
    // you can afford to deeply invest in a path.
    isLegendary: true, unique: true, multiPath: true, autoLevels: true, autoLevelInterval: 30,
    unlockCheck: () => hasBeatenAllMaps(),
  },
};

const TOWER100_UNLOCK_WAVE = 100;

// Starting/max uptime - also the ceiling Consultant's T10 "covers 5 uptime a
// sprint" perk heals back up to (see updateSpawning's end-of-sprint bonus).
const STARTING_LIVES = 100;
// Bumped from 200 - early sprints were leaving players too gold-starved to
// field enough coverage before enemies started leaking through.
const STARTING_GOLD = 300;

// Chosen per-map (state.difficulty, persisted in each map's save slot).
// Multiplies onto the wave-scaling formula in spawnEnemy - hpMult/speedMult
// make enemies tougher/faster, rewardMult compensates the economy so a
// harder difficulty still feels worth playing rather than just punishing.
const DIFFICULTY_SETTINGS = {
  easy: { label: "Easy", hpMult: 0.65, rewardMult: 0.85, speedMult: 0.9 },
  normal: { label: "Normal", hpMult: 1.0, rewardMult: 1.0, speedMult: 1.0 },
  hard: { label: "Hard", hpMult: 1.6, rewardMult: 1.25, speedMult: 1.15 },
};

// A medal is earned per-map, per-difficulty, the moment that map's live wave
// passes the listed sprint on that difficulty - lower thresholds on easier
// settings since the enemies scale up less there. Stored in each map's save
// slot (state.medals), never un-earned once true.
const MEDAL_THRESHOLDS = { easy: 50, normal: 80, hard: 100 };

// Awarded once a sprint's whole spawn queue is cleared (see updateSpawning),
// on top of normal per-kill gold - grows by a flat amount every wave. Base
// bumped from 15 - early sprints needed a bigger cushion to afford enough
// coverage before enemies started leaking through.
const WAVE_BONUS_BASE = 30;
const WAVE_BONUS_PER_WAVE = 5;

const OVERCLOCK_DURATION = 8;
const OVERCLOCK_COOLDOWN = 30;
const FUNDRAISER_DURATION = 10;
const FUNDRAISER_COOLDOWN = 45;
const FUNDRAISER_MULT = 2;
const AIRSTRIKE_COST_BASE = 150;
const AIRSTRIKE_COOLDOWN = 6;
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
// Every tower's paths run 5 tiers deep; 10x Engineer's run 10. A tower with
// fewer tiers than an index simply has pathDef.tiers[i] === undefined there,
// and buyPathTier's "already maxed" check stops it exactly as before.
const PATH_TIER_LEVELS = [3, 6, 10, 14, 18, 23, 28, 34, 40, 47];

// Applied on top of every path tier's listed cost - a single knob to make
// path specializations pricier relative to plain leveling, rather than
// editing every tier's cost individually. Bumped from 1.4 so path investment
// reads as a serious, deliberate spend everywhere (compounds with the T5
// spike below - e.g. Singularity's T5 lands around 600k).
const PATH_TIER_COST_MULT = 2.2;
// T5 (tierIndex 4) is a deliberate price+power spike: the capstone tier for
// every regular (5-tier) tower, and a notable checkpoint partway through
// Singularity's 10-tier paths. 10x Engineer is explicitly excluded (its
// paths also happen to run 10 tiers, but it doesn't get a T5 spike at all -
// keyed off towerType directly rather than a boolean so this can't
// accidentally lump it in with either group).
const T5_COST_MULT_REGULAR = 30;
const T5_COST_MULT_SINGULARITY = 100;

function pathTierCost(tier, tierIndex, towerType) {
  let mult = PATH_TIER_COST_MULT;
  if (tierIndex === 4 && towerType !== "tenx") {
    mult *= TOWER_TYPES[towerType]?.multiPath ? T5_COST_MULT_SINGULARITY : T5_COST_MULT_REGULAR;
  }
  return Math.round(tier.cost * mult);
}

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
        {
          desc: "blistering fire rate, even bigger crits", cost: 440,
          apply: (t) => { t.pathRateMult = 3.8; t.critChance = 0.32; t.critMult = 2.4; t.multiShot = 2; },
        },
        {
          desc: "top speed - hits 4 targets, devastating crits (T5 - a major investment)", cost: 750,
          apply: (t) => { t.pathRateMult = 6.5; t.critChance = 0.55; t.critMult = 4.0; t.multiShot = 4; },
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
        {
          desc: "fires at 5 enemies, even wider range", cost: 440,
          apply: (t) => { t.multiShot = 5; t.pathRangeMult = 1.3; t.bonusGoldPerKill = 2; },
        },
        {
          desc: "fires at 8 enemies at once, massive bonus gold (T5 - a major investment)", cost: 750,
          apply: (t) => { t.multiShot = 8; t.pathRangeMult = 2.0; t.bonusGoldPerKill = 6; },
        },
      ],
    },
    clutch: {
      name: "Clutch",
      accentColor: "#f472b6",
      tiers: [
        { desc: "big crit chance and multiplier", cost: 80, apply: (t) => { t.critChance = 0.3; t.critMult = 2.2; } },
        {
          desc: "bigger crits, bigger hits", cost: 150,
          apply: (t) => { t.critChance = 0.4; t.critMult = 2.6; t.pathDamageMult = 1.2; },
        },
        {
          desc: "even bigger crits, bonus gold per kill", cost: 260,
          apply: (t) => { t.critChance = 0.5; t.critMult = 3.0; t.bonusGoldPerKill = 1; },
        },
        {
          desc: "huge crit chance, bigger hits", cost: 440,
          apply: (t) => { t.critChance = 0.6; t.critMult = 3.5; t.pathDamageMult = 1.4; },
        },
        {
          desc: "clutch every time - overwhelming crits, huge dmg vs bosses (T5 - a major investment)", cost: 750,
          apply: (t) => { t.critChance = 0.85; t.critMult = 6.0; t.bonusGoldPerKill = 5; t.bossDamageMult = 2.2; },
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
          desc: "huge damage, even slower", cost: 140,
          apply: (t) => { t.pathDamageMult = 1.6; t.pathRateMult = 0.7; },
        },
        {
          desc: "bigger hits, chance to crit for 2.5x", cost: 260,
          apply: (t) => { t.pathDamageMult = 2.3; t.pathRateMult = 0.7; t.critChance = 0.2; t.critMult = 2.5; },
        },
        {
          desc: "massive damage, extra dmg vs bosses", cost: 450,
          apply: (t) => { t.pathDamageMult = 3.2; t.pathRateMult = 0.7; t.critChance = 0.3; t.critMult = 3.0; t.bossDamageMult = 1.5; },
        },
        {
          desc: "even more damage, bigger dmg vs bosses", cost: 765,
          apply: (t) => { t.pathDamageMult = 4.2; t.pathRateMult = 0.7; t.critChance = 0.35; t.critMult = 3.5; t.bossDamageMult = 2.0; },
        },
        {
          desc: "one shot, one kill - annihilates everything (T5 - a major investment)", cost: 1300,
          apply: (t) => { t.pathDamageMult = 8.0; t.pathRateMult = 0.7; t.critChance = 0.55; t.critMult = 5.5; t.bossDamageMult = 3.8; t.tankDamageMult = 2.6; },
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
        {
          desc: "near-total slow/aura, bigger dmg vs merge conflicts", cost: 765,
          apply: (t) => { t.slowOnHit = { pct: 0.8, duration: 5 }; t.auraSlowPct = 0.32; t.tankDamageMult = 1.8; },
        },
        {
          desc: "everything grinds to a halt, huge dmg vs bosses too (T5 - a major investment)", cost: 1300,
          apply: (t) => { t.slowOnHit = { pct: 0.95, duration: 8 }; t.auraSlowPct = 0.55; t.tankDamageMult = 3.4; t.bossDamageMult = 2.0; },
        },
      ],
    },
    rewrite: {
      name: "Full Rewrite",
      accentColor: "#818cf8",
      tiers: [
        { desc: "true damage - ignores all resistances", cost: 140, apply: (t) => { t.damageType = "magic"; t.pathDamageMult = 1.3; } },
        {
          desc: "bigger true damage", cost: 260,
          apply: (t) => { t.pathDamageMult = 1.7; },
        },
        {
          desc: "even bigger true damage, chance to crit 2x", cost: 450,
          apply: (t) => { t.pathDamageMult = 2.2; t.critChance = 0.2; t.critMult = 2.0; },
        },
        {
          desc: "massive true damage", cost: 765,
          apply: (t) => { t.pathDamageMult = 2.8; },
        },
        {
          desc: "rewritten from scratch - nothing resists this anymore (T5 - a major investment)", cost: 1300,
          apply: (t) => { t.pathDamageMult = 5.4; t.critChance = 0.45; t.critMult = 3.6; t.bossDamageMult = 2.4; },
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
        {
          desc: "even huger blast, more gold per kill in it", cost: 880,
          apply: (t) => { t.pathSplashMult = 3.4; t.pathDamageMult = 1.8; t.bonusGoldPerKill = 3; },
        },
        {
          desc: "a blast that blankets the whole lane (T5 - a major investment)", cost: 1400,
          apply: (t) => { t.pathSplashMult = 6.0; t.pathDamageMult = 3.2; t.bonusGoldPerKill = 8; },
        },
      ],
    },
    zeroday: {
      name: "Zero-Day",
      accentColor: "#39ff14",
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
        {
          desc: "even more devastating, bigger crits still", cost: 880,
          apply: (t) => { t.bossDamageMult = 4.5; t.tankDamageMult = 3.2; t.critChance = 0.35; t.critMult = 3.0; t.pathDamageMult = 1.4; },
        },
        {
          desc: "a zero-day for every system - nothing resists this (T5 - a major investment)", cost: 1400,
          apply: (t) => { t.bossDamageMult = 9.0; t.tankDamageMult = 6.0; t.critChance = 0.55; t.critMult = 5.0; t.pathDamageMult = 2.5; },
        },
      ],
    },
    botnet: {
      name: "Botnet",
      accentColor: "#4ade80",
      tiers: [
        { desc: "hits 2 targets at once", cost: 200, apply: (t) => { t.multiShot = 2; t.pathDamageMult = 0.9; } },
        {
          desc: "hits 3 targets, faster fire rate", cost: 340,
          apply: (t) => { t.multiShot = 3; t.pathRateMult = 1.3; },
        },
        {
          desc: "hits 3 targets, bigger hits, bonus gold per kill", cost: 550,
          apply: (t) => { t.multiShot = 3; t.pathDamageMult = 1.2; t.bonusGoldPerKill = 1; },
        },
        {
          desc: "hits 4 targets, even faster fire rate", cost: 880,
          apply: (t) => { t.multiShot = 4; t.pathRateMult = 1.6; },
        },
        {
          desc: "a botnet of 7 - every target gets hit (T5 - a major investment)", cost: 1400,
          apply: (t) => { t.multiShot = 7; t.pathDamageMult = 2.4; t.bonusGoldPerKill = 4; },
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
        {
          desc: "even huger rate buff & radius", cost: 660,
          apply: (t) => { t.pathBuffRateMult = 4.6; t.pathBuffDamageMult = 0.8; t.pathRangeMult = 1.6; },
        },
        {
          desc: "the whole team fires at superhuman speed (T5 - a major investment)", cost: 1090,
          apply: (t) => { t.pathBuffRateMult = 8.0; t.pathBuffDamageMult = 1.3; t.pathRangeMult = 2.4; },
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
        {
          desc: "even huger damage buff & radius", cost: 660,
          apply: (t) => { t.pathBuffDamageMult = 4.6; t.pathBuffRateMult = 0.8; t.pathRangeMult = 1.6; },
        },
        {
          desc: "the whole team hits like a wrecking crew (T5 - a major investment)", cost: 1090,
          apply: (t) => { t.pathBuffDamageMult = 8.0; t.pathBuffRateMult = 1.3; t.pathRangeMult = 2.4; },
        },
      ],
    },
    teambuilding: {
      name: "Team Building",
      accentColor: "#2dd4bf",
      tiers: [
        { desc: "passive slow aura in range, wider range", cost: 130, apply: (t) => { t.auraSlowPct = 0.12; t.pathRangeMult = 1.2; } },
        {
          desc: "stronger aura, small buff to allies too", cost: 240,
          apply: (t) => { t.auraSlowPct = 0.18; t.buffDamagePct = 0.1; t.buffRatePct = 0.1; },
        },
        {
          desc: "even stronger aura, wider range still", cost: 400,
          apply: (t) => { t.auraSlowPct = 0.24; t.pathRangeMult = 1.4; },
        },
        {
          desc: "strong aura, bigger buff to allies", cost: 660,
          apply: (t) => { t.auraSlowPct = 0.3; t.buffDamagePct = 0.15; t.buffRatePct = 0.15; },
        },
        {
          desc: "the whole team works in perfect sync (T5 - a major investment)", cost: 1090,
          apply: (t) => { t.auraSlowPct = 0.55; t.pathRangeMult = 2.2; t.buffDamagePct = 0.35; t.buffRatePct = 0.35; },
        },
      ],
    },
  },
  farmer: {
    // The economy path - deliberately pricier and steeper than the combat
    // towers' tiers 4/5, so it keeps outpacing gold sinks deep into a run
    // instead of income flattening out while everything else gets pricier.
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
        {
          desc: "enterprise contract - massive credits/sec, big payout", cost: 600,
          apply: (t) => { t.pathIncomeMult = 5.5; state.gold += 400; },
        },
        {
          desc: "acquired - staggering credits/sec, the team retires early (T5 - a major investment)", cost: 1000,
          apply: (t) => { t.pathIncomeMult = 14; state.gold += 2000; },
        },
        {
          desc: "strategic partnership - massive credits/sec, another payout", cost: 1600,
          apply: (t) => { t.pathIncomeMult = 12; state.gold += 1200; },
        },
        {
          desc: "unicorn status - huge credits/sec, huge payout", cost: 2500,
          apply: (t) => { t.pathIncomeMult = 17; state.gold += 1800; },
        },
        {
          desc: "market leader - enormous credits/sec, big payout", cost: 3800,
          apply: (t) => { t.pathIncomeMult = 24; state.gold += 2600; },
        },
        {
          desc: "monopoly - staggering credits/sec, giant payout", cost: 5600,
          apply: (t) => { t.pathIncomeMult = 34; state.gold += 3800; },
        },
        {
          desc: "post-scarcity - the credits never stop flowing, and the firm covers 5 uptime a sprint (T10 - a massive investment)", cost: 8000,
          apply: (t) => { t.pathIncomeMult = 48; state.gold += 5500; t.pathLivesPerRound = 5; },
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
        {
          desc: "towers/upgrades cost 24% less, another funding round", cost: 600,
          apply: (t) => { t.costDiscountPct = 0.24; state.gold += 300; },
        },
        {
          desc: "towers/upgrades cost 42% less, IPO windfall (T5 - a major investment)", cost: 1000,
          apply: (t) => { t.costDiscountPct = 0.42; state.gold += 1500; },
        },
        {
          desc: "towers/upgrades cost 34% less, strategic funding round", cost: 1600,
          apply: (t) => { t.costDiscountPct = 0.34; state.gold += 1000; },
        },
        {
          desc: "towers/upgrades cost 38% less, unicorn valuation", cost: 2500,
          apply: (t) => { t.costDiscountPct = 0.38; state.gold += 1500; },
        },
        {
          desc: "towers/upgrades cost 42% less, market-leading capital", cost: 3800,
          apply: (t) => { t.costDiscountPct = 0.42; state.gold += 2200; },
        },
        {
          desc: "towers/upgrades cost 46% less, monopoly capital", cost: 5600,
          apply: (t) => { t.costDiscountPct = 0.46; state.gold += 3200; },
        },
        {
          desc: "towers/upgrades cost 50% less - practically free, and the firm covers 5 uptime a sprint (T10 - a massive investment)", cost: 8000,
          apply: (t) => { t.costDiscountPct = 0.50; state.gold += 4600; t.pathLivesPerRound = 5; },
        },
      ],
    },
    diversified: {
      name: "Diversified Portfolio",
      accentColor: "#38bdf8",
      tiers: [
        { desc: "more credits/sec and a small cost discount", cost: 90, apply: (t) => { t.pathIncomeMult = 1.5; t.costDiscountPct = 0.05; } },
        { desc: "more of both", cost: 170, apply: (t) => { t.pathIncomeMult = 2.0; t.costDiscountPct = 0.08; } },
        {
          desc: "even more of both, small payout", cost: 300,
          apply: (t) => { t.pathIncomeMult = 2.6; t.costDiscountPct = 0.12; state.gold += 150; },
        },
        {
          desc: "bigger income and discount, bigger payout", cost: 600,
          apply: (t) => { t.pathIncomeMult = 3.4; t.costDiscountPct = 0.16; state.gold += 300; },
        },
        {
          desc: "big income and discount, big payout (T5 - a major investment)", cost: 1000,
          apply: (t) => { t.pathIncomeMult = 7.0; t.costDiscountPct = 0.30; state.gold += 1500; },
        },
        {
          desc: "huge income and discount, huge payout", cost: 1600,
          apply: (t) => { t.pathIncomeMult = 5.8; t.costDiscountPct = 0.24; state.gold += 900; },
        },
        {
          desc: "even huger income and discount", cost: 2500,
          apply: (t) => { t.pathIncomeMult = 7.5; t.costDiscountPct = 0.28; state.gold += 1400; },
        },
        {
          desc: "massive income and discount, massive payout", cost: 3800,
          apply: (t) => { t.pathIncomeMult = 9.5; t.costDiscountPct = 0.32; state.gold += 2000; },
        },
        {
          desc: "staggering income and discount", cost: 5600,
          apply: (t) => { t.pathIncomeMult = 12; t.costDiscountPct = 0.36; state.gold += 2800; },
        },
        {
          desc: "a balanced portfolio that never stops paying, and the firm covers 5 uptime a sprint (T10 - a massive investment)", cost: 8000,
          apply: (t) => { t.pathIncomeMult = 16; t.costDiscountPct = 0.4; state.gold += 4000; t.pathLivesPerRound = 5; },
        },
      ],
    },
  },
  recruiter: {
    scrum: {
      name: "Scrum Sprint",
      accentColor: "#fb923c",
      tiers: [
        { desc: "deploys 2 allies at once, longer duration", cost: 130, apply: (t) => { t.pathAllyCountBonus = 1; t.pathAllyDurationMult = 1.3; } },
        {
          desc: "deploys 3 allies, stronger allies", cost: 240,
          apply: (t) => { t.pathAllyCountBonus = 2; t.pathAllyDurationMult = 1.6; t.pathAllyDamageMult = 1.4; },
        },
        {
          desc: "deploys 4 allies, much stronger & longer-lived", cost: 400,
          apply: (t) => { t.pathAllyCountBonus = 3; t.pathAllyDurationMult = 2.0; t.pathAllyDamageMult = 1.8; },
        },
        {
          desc: "deploys 5 allies, even stronger & longer-lived", cost: 660,
          apply: (t) => { t.pathAllyCountBonus = 4; t.pathAllyDurationMult = 2.4; t.pathAllyDamageMult = 2.3; },
        },
        {
          desc: "deploys a full squad of 8 elite warriors (T5 - a major investment)", cost: 1090,
          apply: (t) => { t.pathAllyCountBonus = 7; t.pathAllyDurationMult = 4.5; t.pathAllyDamageMult = 4.5; },
        },
      ],
    },
    freelance: {
      name: "Freelance Network",
      accentColor: "#facc15",
      tiers: [
        { desc: "allies deploy much more often", cost: 130, apply: (t) => { t.pathDeployRateMult = 1.6; } },
        {
          desc: "even faster deploys, allies pay a bonus on kill", cost: 240,
          apply: (t) => { t.pathDeployRateMult = 2.2; t.pathAllyBonusGold = 1; },
        },
        {
          desc: "rapid deploys, allies hit explosively", cost: 400,
          apply: (t) => { t.pathDeployRateMult = 3.0; t.pathAllyBonusGold = 2; t.pathAllyExplosive = true; },
        },
        {
          desc: "even faster deploys, bigger bonus per kill", cost: 660,
          apply: (t) => { t.pathDeployRateMult = 3.8; t.pathAllyBonusGold = 3; t.pathAllyExplosive = true; },
        },
        {
          desc: "constant deploys - the path is never empty (T5 - a major investment)", cost: 1090,
          apply: (t) => { t.pathDeployRateMult = 7.0; t.pathAllyBonusGold = 8; t.pathAllyExplosive = true; },
        },
      ],
    },
    elite: {
      name: "Elite Task Force",
      accentColor: "#dc2626",
      tiers: [
        { desc: "far stronger ally, longer-lived", cost: 130, apply: (t) => { t.pathAllyDamageMult = 2.0; t.pathAllyDurationMult = 1.3; } },
        {
          desc: "even stronger ally, extra dmg vs bosses", cost: 240,
          apply: (t) => { t.pathAllyDamageMult = 2.6; t.pathAllyBossMult = 1.5; },
        },
        {
          desc: "stronger still, extra dmg vs merge conflicts too", cost: 400,
          apply: (t) => { t.pathAllyDamageMult = 3.4; t.pathAllyTankMult = 1.6; t.pathAllyBossMult = 1.8; },
        },
        {
          desc: "devastating ally, bigger boss bonus", cost: 660,
          apply: (t) => { t.pathAllyDamageMult = 4.4; t.pathAllyBossMult = 2.4; },
        },
        {
          desc: "one elite warrior worth an entire squad (T5 - a major investment)", cost: 1090,
          apply: (t) => { t.pathAllyDamageMult = 8.5; t.pathAllyTankMult = 3.8; t.pathAllyBossMult = 5.0; t.pathAllyDurationMult = 2.6; },
        },
      ],
    },
  },
  quant: {
    overflow: {
      name: "Overflow",
      accentColor: "#c084fc",
      tiers: [
        { desc: "much bigger % damage per hit", cost: 180, apply: (t) => { t.pathDamageMult = 1.8; } },
        {
          desc: "even bigger % damage, chance to crit 2x", cost: 320,
          apply: (t) => { t.pathDamageMult = 2.6; t.critChance = 0.2; t.critMult = 2.0; },
        },
        {
          desc: "massive % damage, huge crits, extra vs bosses", cost: 520,
          apply: (t) => { t.pathDamageMult = 3.6; t.critChance = 0.3; t.critMult = 2.5; t.bossDamageMult = 1.6; },
        },
        {
          desc: "even more % damage, bigger crits and boss bonus", cost: 850,
          apply: (t) => { t.pathDamageMult = 4.6; t.critChance = 0.36; t.critMult = 3.0; t.bossDamageMult = 2.1; },
        },
        {
          desc: "overflows every buffer - catastrophic % true damage (T5 - a major investment)", cost: 1400,
          apply: (t) => { t.pathDamageMult = 9.0; t.critChance = 0.58; t.critMult = 5.2; t.bossDamageMult = 4.2; },
        },
      ],
    },
    recursive: {
      name: "Recursive",
      accentColor: "#818cf8",
      tiers: [
        { desc: "hits leave a damaging exploit that ticks for 3s", cost: 180, apply: (t) => { t.pathDotPct = 0.01; t.pathDotDuration = 3; } },
        {
          desc: "stronger exploit, longer duration", cost: 320,
          apply: (t) => { t.pathDotPct = 0.018; t.pathDotDuration = 4; },
        },
        {
          desc: "devastating exploit, also hits 2 targets", cost: 520,
          apply: (t) => { t.pathDotPct = 0.03; t.pathDotDuration = 5; t.multiShot = 2; },
        },
        {
          desc: "even more devastating exploit, hits 3 targets", cost: 850,
          apply: (t) => { t.pathDotPct = 0.045; t.pathDotDuration = 6; t.multiShot = 3; },
        },
        {
          desc: "a recursive exploit with no base case - hits 5 targets (T5 - a major investment)", cost: 1400,
          apply: (t) => { t.pathDotPct = 0.10; t.pathDotDuration = 10; t.multiShot = 5; },
        },
      ],
    },
    zeropoint: {
      name: "Zero Point Field",
      accentColor: "#38bdf8",
      tiers: [
        { desc: "much wider range, chance to crit", cost: 180, apply: (t) => { t.pathRangeMult = 1.4; t.critChance = 0.15; t.critMult = 1.8; } },
        {
          desc: "even wider range, bigger crits, bigger % damage", cost: 320,
          apply: (t) => { t.pathRangeMult = 1.7; t.critChance = 0.22; t.critMult = 2.2; t.pathDamageMult = 1.2; },
        },
        {
          desc: "huge range, extra dmg vs bosses", cost: 520,
          apply: (t) => { t.pathRangeMult = 2.0; t.critChance = 0.3; t.critMult = 2.6; t.bossDamageMult = 1.5; },
        },
        {
          desc: "even huger range, bigger % damage", cost: 850,
          apply: (t) => { t.pathRangeMult = 2.4; t.critChance = 0.38; t.critMult = 3.2; t.pathDamageMult = 1.4; },
        },
        {
          desc: "sees and hits anything on the board (T5 - a major investment)", cost: 1400,
          apply: (t) => { t.pathRangeMult = 4.0; t.critChance = 0.6; t.critMult = 5.5; t.bossDamageMult = 3.4; },
        },
      ],
    },
  },
  freeze: {
    absolutezero: {
      name: "Absolute Zero",
      accentColor: "#0ea5e9",
      tiers: [
        { desc: "much longer freeze, bigger hits", cost: 130, apply: (t) => { t.slowOnHit = { pct: 1.0, duration: 1.8 }; t.pathDamageMult = 1.3; } },
        {
          desc: "even longer freeze, bigger hits still", cost: 220,
          apply: (t) => { t.slowOnHit = { pct: 1.0, duration: 2.3 }; t.pathDamageMult = 1.6; },
        },
        {
          desc: "huge freeze duration, extra dmg vs merge conflicts", cost: 360,
          apply: (t) => { t.slowOnHit = { pct: 1.0, duration: 2.8 }; t.pathDamageMult = 2.0; t.tankDamageMult = 1.5; },
        },
        {
          desc: "even huger freeze, bigger hits", cost: 600,
          apply: (t) => { t.slowOnHit = { pct: 1.0, duration: 3.4 }; t.pathDamageMult = 2.5; },
        },
        {
          desc: "frozen solid - nothing thaws in time (T5 - a major investment)", cost: 1000,
          apply: (t) => { t.slowOnHit = { pct: 1.0, duration: 6.0 }; t.pathDamageMult = 4.8; t.tankDamageMult = 3.4; },
        },
      ],
    },
    cryofield: {
      name: "Cryo Field",
      accentColor: "#a5f3fc",
      tiers: [
        { desc: "passive slow aura in range, wider range", cost: 130, apply: (t) => { t.auraSlowPct = 0.3; t.pathRangeMult = 1.2; } },
        {
          desc: "stronger aura, even wider range", cost: 220,
          apply: (t) => { t.auraSlowPct = 0.4; t.pathRangeMult = 1.4; },
        },
        {
          desc: "even stronger aura, bigger hits", cost: 360,
          apply: (t) => { t.auraSlowPct = 0.5; t.pathDamageMult = 1.3; },
        },
        {
          desc: "huge aura, much wider range", cost: 600,
          apply: (t) => { t.auraSlowPct = 0.6; t.pathRangeMult = 1.7; },
        },
        {
          desc: "an entire field of permafrost (T5 - a major investment)", cost: 1000,
          apply: (t) => { t.auraSlowPct = 0.85; t.pathDamageMult = 2.6; t.pathRangeMult = 2.8; },
        },
      ],
    },
    shatter: {
      name: "Shatter",
      accentColor: "#e0e7ff",
      tiers: [
        { desc: "bonus damage vs already-slowed targets", cost: 130, apply: (t) => { t.shatterBonusPct = 0.5; t.pathDamageMult = 1.1; } },
        {
          desc: "bigger shatter bonus, bigger hits", cost: 220,
          apply: (t) => { t.shatterBonusPct = 0.8; t.pathDamageMult = 1.3; },
        },
        {
          desc: "even bigger shatter bonus, chance to crit 2x", cost: 360,
          apply: (t) => { t.shatterBonusPct = 1.2; t.pathDamageMult = 1.5; t.critChance = 0.15; t.critMult = 2.0; },
        },
        {
          desc: "huge shatter bonus, bigger crits", cost: 600,
          apply: (t) => { t.shatterBonusPct = 1.7; t.pathDamageMult = 1.8; },
        },
        {
          desc: "frozen enemies don't just stop - they shatter (T5 - a major investment)", cost: 1000,
          apply: (t) => { t.shatterBonusPct = 4.0; t.pathDamageMult = 3.4; t.critChance = 0.4; t.critMult = 3.8; t.bossDamageMult = 2.4; },
        },
      ],
    },
  },
  tesla: {
    overload: {
      name: "Overload",
      accentColor: "#facc15",
      tiers: [
        { desc: "chains to 1 more enemy, bigger hits", cost: 150, apply: (t) => { t.chainCount = 4; t.pathDamageMult = 1.3; } },
        { desc: "even more damage, better falloff", cost: 270, apply: (t) => { t.pathDamageMult = 1.6; t.chainFalloff = 0.7; } },
        { desc: "chains to 2 more enemies than base", cost: 460, apply: (t) => { t.chainCount = 5; t.pathDamageMult = 2.0; } },
        { desc: "huge damage, better falloff still", cost: 780, apply: (t) => { t.pathDamageMult = 2.6; t.chainFalloff = 0.8; } },
        { desc: "the whole lane lights up at once (T5 - a major investment)", cost: 1300, apply: (t) => { t.chainCount = 10; t.pathDamageMult = 5.2; t.chainFalloff = 0.92; } },
      ],
    },
    resonance: {
      name: "Resonance",
      accentColor: "#38bdf8",
      tiers: [
        { desc: "much bigger chain range, faster fire rate", cost: 150, apply: (t) => { t.chainRange = 130; t.pathRateMult = 1.3; } },
        { desc: "even bigger range, chance to crit", cost: 270, apply: (t) => { t.chainRange = 160; t.critChance = 0.15; t.critMult = 1.8; } },
        { desc: "huge range, bigger crits", cost: 460, apply: (t) => { t.chainRange = 190; t.critChance = 0.22; t.critMult = 2.2; } },
        { desc: "even huger range, faster still", cost: 780, apply: (t) => { t.chainRange = 220; t.pathRateMult = 1.7; t.critChance = 0.3; } },
        { desc: "resonates across the entire board (T5 - a major investment)", cost: 1300, apply: (t) => { t.chainRange = 360; t.critMult = 4.5; t.bossDamageMult = 2.6; } },
      ],
    },
  },
  shotgun: {
    spray: {
      name: "Spray and Pray",
      accentColor: "#fca5a5",
      tiers: [
        { desc: "one more pellet, faster reload", cost: 150, apply: (t) => { t.multiShot = 4; t.pathRateMult = 1.2; } },
        { desc: "even more spread, bigger hits", cost: 270, apply: (t) => { t.multiShot = 5; t.pathDamageMult = 1.3; } },
        {
          desc: "hits nearly everything nearby, chance to crit", cost: 460,
          apply: (t) => { t.multiShot = 7; t.pathDamageMult = 1.5; t.critChance = 0.2; t.critMult = 1.8; },
        },
        { desc: "a wall of pellets, faster still", cost: 780, apply: (t) => { t.multiShot = 9; t.pathDamageMult = 1.8; t.pathRateMult = 1.4; } },
        {
          desc: "every pellet finds a target (T5 - a major investment)", cost: 1300,
          apply: (t) => { t.multiShot = 13; t.pathDamageMult = 2.4; t.pathRateMult = 1.6; t.critChance = 0.35; t.critMult = 2.4; },
        },
      ],
    },
    slug: {
      name: "Slug Round",
      accentColor: "#fbbf24",
      tiers: [
        {
          desc: "one heavy slug instead of a spread, longer reach", cost: 150,
          apply: (t) => { t.multiShot = 1; t.pathDamageMult = 2.2; t.pathRangeMult = 1.8; },
        },
        {
          desc: "armor-piercing, bonus dmg vs merge conflicts", cost: 270,
          apply: (t) => { t.pathDamageMult = 3.0; t.pathRangeMult = 2.0; t.tankDamageMult = 1.5; },
        },
        {
          desc: "devastating point hits, chance to crit", cost: 460,
          apply: (t) => { t.pathDamageMult = 4.0; t.pathRangeMult = 2.2; t.critChance = 0.25; t.critMult = 2.2; },
        },
        {
          desc: "even bigger slugs, bonus dmg vs bosses", cost: 780,
          apply: (t) => { t.pathDamageMult = 5.4; t.pathRangeMult = 2.4; t.bossDamageMult = 1.6; },
        },
        {
          desc: "one shot, one kill (T5 - a major investment)", cost: 1300,
          apply: (t) => { t.pathDamageMult = 9.0; t.pathRangeMult = 2.6; t.critChance = 0.4; t.critMult = 3.2; t.bossDamageMult = 2.2; t.tankDamageMult = 2.4; },
        },
      ],
    },
  },
  tenx: {
    fullstack: {
      name: "Full Stack",
      accentColor: "#22d3ee",
      tiers: [
        { desc: "hits 3 targets at once", cost: 350, apply: (t) => { t.multiShot = 3; t.pathRangeMult = 1.2; } },
        {
          desc: "hits 4 targets, bigger hits, chance to crit 1.5x", cost: 600,
          apply: (t) => { t.multiShot = 4; t.pathDamageMult = 1.3; t.critChance = 0.15; t.critMult = 1.5; },
        },
        {
          desc: "hits 5 targets, bigger crits, bonus gold per kill", cost: 950,
          apply: (t) => { t.multiShot = 5; t.pathDamageMult = 1.6; t.critChance = 0.2; t.critMult = 1.8; t.bonusGoldPerKill = 2; },
        },
        {
          desc: "hits 6 targets, even bigger hits and crits", cost: 1400,
          apply: (t) => { t.multiShot = 6; t.pathDamageMult = 2.0; t.critChance = 0.25; t.critMult = 2.2; },
        },
        {
          desc: "hits 8 targets at once - a one-person army", cost: 2000,
          apply: (t) => { t.multiShot = 8; t.pathDamageMult = 2.6; t.critChance = 0.3; t.critMult = 2.5; t.bossDamageMult = 1.5; },
        },
        {
          desc: "hits 10 targets, bigger hits and crits", cost: 2800,
          apply: (t) => { t.multiShot = 10; t.pathDamageMult = 3.2; t.critChance = 0.35; t.critMult = 2.8; t.bossDamageMult = 1.8; },
        },
        {
          desc: "hits 12 targets, even bigger hits and crits", cost: 3800,
          apply: (t) => { t.multiShot = 12; t.pathDamageMult = 3.8; t.critChance = 0.4; t.critMult = 3.2; t.bossDamageMult = 2.2; },
        },
        {
          desc: "hits 15 targets, massive hits and crits", cost: 5200,
          apply: (t) => { t.multiShot = 15; t.pathDamageMult = 4.5; t.critChance = 0.45; t.critMult = 3.6; t.bossDamageMult = 2.6; },
        },
        {
          desc: "hits 18 targets, staggering hits and crits", cost: 7000,
          apply: (t) => { t.multiShot = 18; t.pathDamageMult = 5.5; t.critChance = 0.5; t.critMult = 4.0; t.bossDamageMult = 3.0; },
        },
        {
          desc: "hits 24 targets at once - nearly everything on screen", cost: 9500,
          apply: (t) => { t.multiShot = 24; t.pathDamageMult = 7.0; t.critChance = 0.55; t.critMult = 4.5; t.bossDamageMult = 3.5; },
        },
      ],
    },
    velocity: {
      name: "10x Velocity",
      accentColor: "#f43f5e",
      tiers: [
        { desc: "much faster fire rate, chance to crit 2x", cost: 350, apply: (t) => { t.pathRateMult = 1.8; t.critChance = 0.2; t.critMult = 2.0; } },
        {
          desc: "even faster, bigger crits, bigger hits", cost: 600,
          apply: (t) => { t.pathRateMult = 2.4; t.critChance = 0.28; t.critMult = 2.4; t.pathDamageMult = 1.3; },
        },
        {
          desc: "blistering fire rate, extra dmg vs bosses", cost: 950,
          apply: (t) => { t.pathRateMult = 3.0; t.critChance = 0.35; t.critMult = 2.8; t.bossDamageMult = 1.8; },
        },
        {
          desc: "even more dmg vs bosses, huge crit chance", cost: 1400,
          apply: (t) => { t.pathRateMult = 3.6; t.critChance = 0.42; t.critMult = 3.2; t.bossDamageMult = 2.3; },
        },
        {
          desc: "a blur of commits - nothing survives close range", cost: 2000,
          apply: (t) => { t.pathRateMult = 4.5; t.critChance = 0.5; t.critMult = 4.0; t.bossDamageMult = 3.0; t.tankDamageMult = 2.5; },
        },
        {
          desc: "even faster, bigger crits and boss/tank bonus", cost: 2800,
          apply: (t) => { t.pathRateMult = 5.5; t.critChance = 0.55; t.critMult = 4.5; t.bossDamageMult = 3.6; t.tankDamageMult = 3.0; },
        },
        {
          desc: "faster still, huge crit chance", cost: 3800,
          apply: (t) => { t.pathRateMult = 6.5; t.critChance = 0.6; t.critMult = 5.0; t.bossDamageMult = 4.2; t.tankDamageMult = 3.6; },
        },
        {
          desc: "approaching the speed limit of code review", cost: 5200,
          apply: (t) => { t.pathRateMult = 7.8; t.critChance = 0.65; t.critMult = 5.5; t.bossDamageMult = 5.0; t.tankDamageMult = 4.2; },
        },
        {
          desc: "faster than the eye can follow", cost: 7000,
          apply: (t) => { t.pathRateMult = 9.2; t.critChance = 0.7; t.critMult = 6.0; t.bossDamageMult = 6.0; t.tankDamageMult = 5.0; },
        },
        {
          desc: "faster than physically possible - nothing survives", cost: 9500,
          apply: (t) => { t.pathRateMult = 11; t.critChance = 0.75; t.critMult = 7.0; t.bossDamageMult = 7.5; t.tankDamageMult = 6.0; },
        },
      ],
    },
    distributed: {
      name: "Distributed Systems",
      accentColor: "#a78bfa",
      tiers: [
        {
          desc: "explosive splash damage to nearby targets", cost: 350,
          apply: (t) => { t.damageType = "explosive"; t.splashRadius = 60; t.pathDamageMult = 1.2; },
        },
        {
          desc: "bigger blast, slows everything it hits", cost: 600,
          apply: (t) => { t.splashRadius = 90; t.auraSlowPct = 0.15; },
        },
        {
          desc: "even bigger blast, stronger slow, bonus gold per kill", cost: 950,
          apply: (t) => { t.splashRadius = 120; t.auraSlowPct = 0.25; t.bonusGoldPerKill = 2; },
        },
        {
          desc: "the system transcends physical limits - now deals true damage, ignoring all resistances", cost: 1400,
          apply: (t) => { t.damageType = "magic"; t.splashRadius = 140; t.auraSlowPct = 0.35; t.pathDamageMult = 1.6; },
        },
        {
          desc: "omniscient - massive true-damage blast, reaches every service at once", cost: 2000,
          apply: (t) => { t.splashRadius = 170; t.auraSlowPct = 0.45; t.pathDamageMult = 2.2; },
        },
        {
          desc: "even bigger true-damage blast, stronger slow", cost: 2800,
          apply: (t) => { t.splashRadius = 200; t.auraSlowPct = 0.5; t.pathDamageMult = 2.6; },
        },
        {
          desc: "a blast that spans half the board", cost: 3800,
          apply: (t) => { t.splashRadius = 230; t.auraSlowPct = 0.55; t.pathDamageMult = 3.0; },
        },
        {
          desc: "an even wider blast, near-total slow", cost: 5200,
          apply: (t) => { t.splashRadius = 270; t.auraSlowPct = 0.6; t.pathDamageMult = 3.5; },
        },
        {
          desc: "the blast reaches nearly every corner of the map", cost: 7000,
          apply: (t) => { t.splashRadius = 310; t.auraSlowPct = 0.65; t.pathDamageMult = 4.0; },
        },
        {
          desc: "total system convergence - the blast spans the entire board", cost: 9500,
          apply: (t) => { t.splashRadius = 360; t.auraSlowPct = 0.7; t.pathDamageMult = 4.6; },
        },
      ],
    },
    mentorship: {
      name: "Mentorship",
      accentColor: "#34d399",
      tiers: [
        { desc: "also buffs nearby devs' damage/rate, wider range", cost: 350, apply: (t) => { t.grantsAura = true; t.buffDamagePct = 0.15; t.buffRatePct = 0.15; t.pathRangeMult = 1.2; } },
        {
          desc: "bigger buff to allies, bigger own hits", cost: 600,
          apply: (t) => { t.buffDamagePct = 0.22; t.buffRatePct = 0.22; t.pathDamageMult = 1.3; },
        },
        {
          desc: "even bigger buff, wider range, bigger hits", cost: 950,
          apply: (t) => { t.buffDamagePct = 0.3; t.buffRatePct = 0.3; t.pathDamageMult = 1.6; t.pathRangeMult = 1.4; },
        },
        {
          desc: "huge buff to the whole team", cost: 1400,
          apply: (t) => { t.buffDamagePct = 0.4; t.buffRatePct = 0.4; t.pathDamageMult = 2.0; },
        },
        {
          desc: "massive buff, even wider range", cost: 2000,
          apply: (t) => { t.buffDamagePct = 0.5; t.buffRatePct = 0.5; t.pathDamageMult = 2.5; t.pathRangeMult = 1.6; },
        },
        {
          desc: "the whole team levels up alongside you", cost: 2800,
          apply: (t) => { t.buffDamagePct = 0.65; t.buffRatePct = 0.65; t.pathDamageMult = 3.0; },
        },
        {
          desc: "even bigger team buff", cost: 3800,
          apply: (t) => { t.buffDamagePct = 0.8; t.buffRatePct = 0.8; t.pathDamageMult = 3.6; },
        },
        {
          desc: "the whole team doubles their output, wider range still", cost: 5200,
          apply: (t) => { t.buffDamagePct = 1.0; t.buffRatePct = 1.0; t.pathDamageMult = 4.3; t.pathRangeMult = 1.8; },
        },
        {
          desc: "staggering team buff", cost: 7000,
          apply: (t) => { t.buffDamagePct = 1.2; t.buffRatePct = 1.2; t.pathDamageMult = 5.0; },
        },
        {
          desc: "every tower on the map fights like a 10x engineer", cost: 9500,
          apply: (t) => { t.buffDamagePct = 1.5; t.buffRatePct = 1.5; t.pathDamageMult = 6.0; t.pathRangeMult = 2.0; },
        },
      ],
    },
  },
  singularity: {
    // Since Singularity can own every path at once (multiPath), Omniscience
    // and Time Dilation are the only two that would otherwise both write
    // pathRangeMult/pathDamageMult and silently clobber each other - they
    // write their own path-prefixed fields instead, which
    // recomputeSingularityMultiPath() combines into the real
    // pathRangeMult/pathDamageMult after every purchase.
    omniscience: {
      name: "Omniscience",
      accentColor: "#e0f2fe",
      tiers: [
        { desc: "sees everything - always detects camo, always crits", cost: 500, apply: (t) => { t.alwaysSeeCamo = true; t.critChance = 1.0; t.critMult = 1.6; } },
        { desc: "much bigger crits, bigger range", cost: 850, apply: (t) => { t.critMult = 2.2; t.omniscienceRangeMult = 1.3; } },
        { desc: "even bigger crits and range", cost: 1300, apply: (t) => { t.critMult = 2.8; t.omniscienceRangeMult = 1.6; t.omniscienceDamageMult = 1.3; } },
        { desc: "massive crits, extra dmg vs bosses", cost: 1900, apply: (t) => { t.critMult = 3.6; t.omniscienceDamageMult = 1.7; t.bossDamageMult = 1.8; } },
        { desc: "nothing on the board is hidden, nothing survives a hit (T5 - a massive investment)", cost: 2700, apply: (t) => { t.critMult = 8.0; t.omniscienceDamageMult = 4.0; t.bossDamageMult = 4.5; } },
        { desc: "even bigger crits and dmg vs bosses", cost: 3600, apply: (t) => { t.critMult = 10.0; t.omniscienceDamageMult = 5.0; t.bossDamageMult = 5.4; } },
        { desc: "huge crits, wider range still", cost: 4700, apply: (t) => { t.critMult = 11.7; t.omniscienceDamageMult = 6.3; t.bossDamageMult = 6.5; t.omniscienceRangeMult = 1.9; } },
        { desc: "massive crits and dmg", cost: 6000, apply: (t) => { t.critMult = 13.5; t.omniscienceDamageMult = 7.7; } },
        { desc: "staggering crits, staggering dmg vs bosses", cost: 7600, apply: (t) => { t.critMult = 15.3; t.omniscienceDamageMult = 9.4; t.bossDamageMult = 7.9; } },
        { desc: "omniscience achieved - nothing escapes, nothing survives", cost: 9600, apply: (t) => { t.critMult = 18; t.omniscienceDamageMult = 11.2; t.bossDamageMult = 9.4; t.omniscienceRangeMult = 2.2; } },
      ],
    },
    dilation: {
      name: "Time Dilation",
      accentColor: "#fde68a",
      tiers: [
        { desc: "buffs nearby devs' damage/rate too, wider range", cost: 500, apply: (t) => { t.grantsAura = true; t.buffDamagePct = 0.2; t.buffRatePct = 0.2; t.dilationRangeMult = 1.3; } },
        { desc: "bigger team buff, bigger own hits", cost: 850, apply: (t) => { t.buffDamagePct = 0.3; t.buffRatePct = 0.3; t.dilationDamageMult = 1.3; } },
        { desc: "even bigger team buff and hits", cost: 1300, apply: (t) => { t.buffDamagePct = 0.45; t.buffRatePct = 0.45; t.dilationDamageMult = 1.7; } },
        { desc: "huge team buff, wider range", cost: 1900, apply: (t) => { t.buffDamagePct = 0.6; t.buffRatePct = 0.6; t.dilationDamageMult = 2.2; t.dilationRangeMult = 1.6; } },
        { desc: "time itself slows for everyone but your team (T5 - a massive investment)", cost: 2700, apply: (t) => { t.buffDamagePct = 1.5; t.buffRatePct = 1.5; t.dilationDamageMult = 5.0; } },
        { desc: "even bigger team buff and own hits", cost: 3600, apply: (t) => { t.buffDamagePct = 1.8; t.buffRatePct = 1.8; t.dilationDamageMult = 6.1; } },
        { desc: "huge team buff, even wider range", cost: 4700, apply: (t) => { t.buffDamagePct = 2.15; t.buffRatePct = 2.15; t.dilationDamageMult = 7.4; t.dilationRangeMult = 1.9; } },
        { desc: "massive team buff and hits", cost: 6000, apply: (t) => { t.buffDamagePct = 2.5; t.buffRatePct = 2.5; t.dilationDamageMult = 9.0; } },
        { desc: "staggering team buff", cost: 7600, apply: (t) => { t.buffDamagePct = 2.95; t.buffRatePct = 2.95; t.dilationDamageMult = 10.8; } },
        { desc: "time bends entirely around your team", cost: 9600, apply: (t) => { t.buffDamagePct = 3.6; t.buffRatePct = 3.6; t.dilationDamageMult = 13.0; t.dilationRangeMult = 2.2; } },
      ],
    },
    entropy: {
      name: "Entropy",
      accentColor: "#818cf8",
      // entropyPercent (not damage directly) - recomputeTowerStats reads it
      // when percentDamage is set. Writing straight to t.damage here would
      // get clobbered the very next time stats are recomputed (level up,
      // reload, another path's purchase), since the generic formula derives
      // damage from def.damage (Singularity's flat 180, not a percentage).
      tiers: [
        { desc: "true damage as a % of max hp, ignores all resistances", cost: 500, apply: (t) => { t.percentDamage = true; t.entropyPercent = 0.02; } },
        { desc: "bigger % damage, leaves a damaging exploit", cost: 850, apply: (t) => { t.entropyPercent = 0.032; t.pathDotPct = 0.015; t.pathDotDuration = 4; } },
        { desc: "even bigger % damage, stronger exploit", cost: 1300, apply: (t) => { t.entropyPercent = 0.045; t.pathDotPct = 0.025; t.pathDotDuration = 5; } },
        { desc: "massive % damage, hits 2 targets", cost: 1900, apply: (t) => { t.entropyPercent = 0.06; t.pathDotPct = 0.035; t.pathDotDuration = 6; t.multiShot = 2; } },
        { desc: "entropy always wins - hp itself decays around it (T5 - a massive investment)", cost: 2700, apply: (t) => { t.entropyPercent = 0.14; t.pathDotPct = 0.09; t.pathDotDuration = 9; t.multiShot = 3; } },
        { desc: "bigger % damage, longer exploit", cost: 3600, apply: (t) => { t.entropyPercent = 0.175; t.pathDotPct = 0.105; t.pathDotDuration = 10; } },
        // multiShot deliberately stops growing past this tier (stays at 4)
        // to avoid piling up too many simultaneous projectiles - keeps
        // getting stronger through entropyPercent/dot instead.
        { desc: "even bigger % damage, hits 4 targets", cost: 4700, apply: (t) => { t.entropyPercent = 0.23; t.pathDotPct = 0.13; t.pathDotDuration = 11; t.multiShot = 4; } },
        { desc: "massive % damage, longer exploit still", cost: 6000, apply: (t) => { t.entropyPercent = 0.28; t.pathDotPct = 0.16; t.pathDotDuration = 12; } },
        { desc: "staggering % damage", cost: 7600, apply: (t) => { t.entropyPercent = 0.35; t.pathDotPct = 0.19; t.pathDotDuration = 13; } },
        { desc: "entropy consumes everything, eventually", cost: 9600, apply: (t) => { t.entropyPercent = 0.44; t.pathDotPct = 0.245; t.pathDotDuration = 14; } },
      ],
    },
    genesis: {
      name: "Genesis",
      accentColor: "#fbbf24",
      tiers: [
        { desc: "towers/upgrades cost 15% less, seed funding", cost: 500, apply: (t) => { t.costDiscountPct = 0.15; state.gold += 500; } },
        { desc: "towers/upgrades cost 22% less, another round", cost: 850, apply: (t) => { t.costDiscountPct = 0.22; state.gold += 900; } },
        { desc: "towers/upgrades cost 28% less, big payout", cost: 1300, apply: (t) => { t.costDiscountPct = 0.28; state.gold += 1500; } },
        { desc: "towers/upgrades cost 35% less, huge payout", cost: 1900, apply: (t) => { t.costDiscountPct = 0.35; state.gold += 2400; } },
        { desc: "a new economy, built from nothing (T5 - a massive investment)", cost: 2700, apply: (t) => { t.costDiscountPct = 0.5; state.gold += 10000; } },
        { desc: "towers/upgrades cost 52% less, another huge payout", cost: 3600, apply: (t) => { t.costDiscountPct = 0.52; state.gold += 13000; } },
        { desc: "towers/upgrades cost 55% less, big payout", cost: 4700, apply: (t) => { t.costDiscountPct = 0.55; state.gold += 16000; } },
        { desc: "towers/upgrades cost 57% less, huge payout", cost: 6000, apply: (t) => { t.costDiscountPct = 0.57; state.gold += 20000; } },
        { desc: "towers/upgrades cost 59% less, staggering payout", cost: 7600, apply: (t) => { t.costDiscountPct = 0.59; state.gold += 25000; } },
        { desc: "the economy transcends scarcity itself", cost: 9600, apply: (t) => { t.costDiscountPct = 0.6; state.gold += 32000; } },
      ],
    },
    // Trades raw power for coverage - every hit deals only half its normal
    // damage (explosionDamageMult, folded into pathDamageMult by
    // recomputeSingularityMultiPath), but splashes everyone in radius
    // instead of just one target. hasExplosionPath is a marker only -
    // the actual damageType is decided by that same combiner, since Entropy
    // owning magic at the same time needs to win over it.
    explosion: {
      name: "Detonation",
      accentColor: "#f97316",
      tiers: [
        {
          desc: "explosive splash damage (50% of normal) to nearby targets", cost: 500,
          apply: (t) => { t.hasExplosionPath = true; t.explosionDamageMult = 0.5; t.splashRadius = 70; },
        },
        { desc: "bigger blast radius", cost: 850, apply: (t) => { t.splashRadius = 100; } },
        { desc: "even bigger blast radius", cost: 1300, apply: (t) => { t.splashRadius = 130; } },
        { desc: "huge blast radius, slows everything it hits", cost: 1900, apply: (t) => { t.splashRadius = 165; t.auraSlowPct = 0.15; } },
        { desc: "a blast that levels the battlefield (T5 - a massive investment)", cost: 2700, apply: (t) => { t.splashRadius = 320; t.auraSlowPct = 0.4; } },
        { desc: "even bigger blast, stronger slow", cost: 3600, apply: (t) => { t.splashRadius = 360; t.auraSlowPct = 0.45; } },
        { desc: "huge blast radius still", cost: 4700, apply: (t) => { t.splashRadius = 400; t.auraSlowPct = 0.5; } },
        { desc: "an even wider blast", cost: 6000, apply: (t) => { t.splashRadius = 440; t.auraSlowPct = 0.55; } },
        { desc: "a near-total-board blast", cost: 7600, apply: (t) => { t.splashRadius = 480; t.auraSlowPct = 0.6; } },
        { desc: "an explosion that reaches every corner of the map", cost: 9600, apply: (t) => { t.splashRadius = 550; t.auraSlowPct = 0.65; } },
      ],
    },
  },
};

// Visual radii halved from their pre-zoom values to match the smaller grid.
// lifeDamage (uptime lost if this enemy reaches the end) is derived from
// that same radius - round(radius * 0.5) - so bigger enemies always cost
// more uptime, on top of whatever their type-specific lifeDamage used to be.
// splitsTo: on death, spawns `count` of a specific DIFFERENT, weaker enemy
// type (not a weaker copy of itself) - e.g. a Glitch dying turns into 1
// Bug. Each type points to exactly one rung down a fixed weakness chain
// (roughly the same order buildWave introduces them: encrypted > shielded >
// firewalled > healer > obfuscated > legacy > splitter > tank > fast >
// basic), terminating at Bug, which has no further split. Since the chain
// only ever points to a strictly weaker type and never loops, it can't run
// away - see spawnWeakerEnemy/applyDamage. Bosses and the stronger half of
// the regular roster (healer/firewalled/shielded/encrypted) split into 3;
// the weaker half (fast/tank/splitter/legacy/obfuscated) splits into just 1.
const ENEMY_TYPES = {
  basic: { label: "Bug", emoji: "🐛", hp: 50, speed: 60, reward: 8, lifeDamage: 4, color: "#e05353", radius: 7 },
  fast: { label: "Glitch", emoji: "⚡", hp: 25, speed: 130, reward: 8, lifeDamage: 3, color: "#ffee58", radius: 6, splitsTo: { type: "basic", count: 1 } },
  tank: { label: "Merge Conflict", emoji: "💀", hp: 160, speed: 35, reward: 18, lifeDamage: 4, color: "#8a4a2b", radius: 8.5, splitsTo: { type: "fast", count: 1 } },
  boss: { label: "Production Outage", emoji: "🔥", hp: 400, speed: 30, reward: 60, lifeDamage: 6, color: "#ff3b3b", radius: 12, splitsTo: { type: "bossCamo", count: 3 } },
  // The weakest of the 4 original bosses (lowest hp) - splits heterogeneous
  // into 3 of the strongest regular enemy (Merge Conflict/tank) rather than
  // continuing the boss chain further down. Uses the one-time splitInto
  // mechanism shared with the split-boss family (hasSplit gated) instead of
  // splitsTo, since it's 3-of-a-type rather than a single fixed rung.
  bossCamo: {
    label: "Ghost Process", emoji: "👻", hp: 350, speed: 70, reward: 70, lifeDamage: 6, color: "#7c3aed", radius: 11.5, camo: true,
    splitInto: [{ type: "tank", count: 3 }],
  },
  bossTank: { label: "Cascading Failure", emoji: "🌋", hp: 900, speed: 16, reward: 90, lifeDamage: 7, color: "#7f1d1d", radius: 13.5, splitsTo: { type: "boss", count: 3 } },
  megaboss: { label: "Total System Failure", emoji: "☠️", hp: 3000, speed: 26, reward: 250, lifeDamage: 8, color: "#000000", radius: 16, splitsTo: { type: "bossTank", count: 3 } },
  // A 4-tier boss family, unlocked one tier at a time from wave 20/60/80/100
  // (see splitBossQueueFor). Each tier's death instantly spawns its ENTIRE
  // splitInto list at once (not a recursive chain reaction) - killing a
  // splitBoss100 floods the board with 2 splitBoss80 + 4 splitBoss60 + 8
  // splitBoss20 in one go. splitBoss20 is the terminal tier (no further
  // split) and, once unlocked, also spawns on its own every wave from then
  // on (see splitBossQueueFor) rather than only appearing via a split.
  splitBoss20: { label: "Build Failure", emoji: "🚧", hp: 450, speed: 30, reward: 55, lifeDamage: 6, color: "#ef4444", radius: 12 },
  splitBoss60: {
    label: "Deployment Crisis", emoji: "🚨", hp: 1200, speed: 28, reward: 140, lifeDamage: 7, color: "#f59e0b", radius: 13,
    splitInto: [{ type: "splitBoss20", count: 2 }],
  },
  splitBoss80: {
    label: "Service Outage", emoji: "💥", hp: 2200, speed: 26, reward: 260, lifeDamage: 7, color: "#dc2626", radius: 14,
    splitInto: [{ type: "splitBoss60", count: 2 }, { type: "splitBoss20", count: 4 }],
  },
  splitBoss100: {
    label: "Catastrophic Failure", emoji: "☢️", hp: 4000, speed: 24, reward: 500, lifeDamage: 8, color: "#7f1d1d", radius: 16,
    splitInto: [{ type: "splitBoss80", count: 2 }, { type: "splitBoss60", count: 4 }, { type: "splitBoss20", count: 8 }],
  },
  // Late-wave specialists, each resistant to one damage type (see
  // RESISTANCES) so no single tower archetype trivializes everything.
  legacy: { label: "Legacy Code", emoji: "💾", hp: 90, speed: 45, reward: 10, lifeDamage: 4, color: "#a1887f", radius: 7.5, splitsTo: { type: "splitter", count: 1 } },
  firewalled: { label: "Firewalled", emoji: "🧱", hp: 70, speed: 55, reward: 10, lifeDamage: 4, color: "#5b7fd6", radius: 7.5, splitsTo: { type: "healer", count: 3 } },
  encrypted: { label: "Encrypted", emoji: "🔒", hp: 60, speed: 50, reward: 14, lifeDamage: 4, color: "#a855f7", radius: 7.5, splitsTo: { type: "shielded", count: 3 } },
  // Untargetable by any tower unless that tower is currently in an active
  // Manager's buff range (see getTowerBuffs/findTargets) - still visible so
  // the player can see them coming, just can't be shot without support.
  obfuscated: { label: "Obfuscated", emoji: "🌫️", hp: 55, speed: 65, reward: 12, lifeDamage: 4, color: "#94a3b8", radius: 7, camo: true, splitsTo: { type: "legacy", count: 1 } },
  splitter: { label: "Forked Process", emoji: "🍴", hp: 70, speed: 55, reward: 8, lifeDamage: 4, color: "#fb7185", radius: 7.5, splitsTo: { type: "tank", count: 1 } },
  // Passively heals nearby enemies each second - see updateHealers.
  healer: { label: "QA Tester", emoji: "🩹", hp: 80, speed: 45, reward: 14, lifeDamage: 4, color: "#34d399", radius: 7.5, healRange: 90, healPerSecPct: 0.02, splitsTo: { type: "obfuscated", count: 3 } },
  // Has a separate regenerating shield on top of its hp - see the shield
  // handling in spawnEnemy/applyDamage/updateShields.
  shielded: { label: "Hardened Build", emoji: "🛡️", hp: 60, speed: 50, reward: 14, lifeDamage: 4, color: "#60a5fa", radius: 7.5, shieldFrac: 1.0, shieldRegenDelay: 3, shieldRegenPerSec: 0.3, splitsTo: { type: "firewalled", count: 3 } },
};

// Damage-type resistance: a multiplier applied when that enemy type takes
// that damage type. Missing entries mean "no resistance" (full damage).
// Magic damage (the Quant tower) is never listed here, so it always bypasses
// every resistance - that's its whole purpose against these three.
const RESISTANCES = {
  legacy: { normal: 0.3 },
  firewalled: { explosive: 0.3 },
  encrypted: { normal: 0.3, explosive: 0.3 },
};

// ---------- Game state ----------
const state = {
  mapId: "map1",
  difficulty: "normal",
  medals: { easy: false, normal: false, hard: false },
  gold: STARTING_GOLD,
  bestGold: STARTING_GOLD,
  lives: STARTING_LIVES,
  wave: 0,
  bestWave: 0,
  kills: 0,
  selectedTowerType: null,
  selectedTower: null,
  towers: [],
  enemies: [],
  projectiles: [],
  explosions: [],
  floatingTexts: [],
  chainBolts: [],
  deathParticles: [],
  shakeUntil: 0,
  shakeMag: 0,
  allies: [],
  waveInProgress: false,
  spawnQueue: [],
  spawnTimer: 0,
  gameOver: false,
  paused: false,
  gameSpeed: 1,
  overclockActive: false,
  overclockTimer: 0,
  overclockCooldown: 0,
  fundraiserActive: false,
  fundraiserTimer: 0,
  fundraiserCooldown: 0,
  airstrikeCooldown: 0,
  autoRun: false,
  autoRunTimer: 0,
  ownerId: null,
  // Lifetime/account-wide, not per-map - never touched by resetTransientState
  // or switchMap, only by account:logout (tied to account identity).
  achievements: {},
  totalBossKills: 0,
};

// ---------- Canvas / DOM ----------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const goldStat = document.getElementById("goldStat");
const livesStat = document.getElementById("livesStat");
const waveStat = document.getElementById("waveStat");
const bestWaveStat = document.getElementById("bestWaveStat");
const bestGoldStat = document.getElementById("bestGoldStat");
const difficultyStat = document.getElementById("difficultyStat");
const killsStat = document.getElementById("killsStat");
const towerListEl = document.getElementById("towerList");
const waveBtn = document.getElementById("waveBtn");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverText = document.getElementById("gameOverText");
const restartBtn = document.getElementById("restartBtn");
const changeMapBtn = document.getElementById("changeMapBtn");
const mapPickerOverlay = document.getElementById("mapPickerOverlay");
const mapPickerList = document.getElementById("mapPickerList");
const mapConfirmOverlay = document.getElementById("mapConfirmOverlay");
const mapConfirmTitle = document.getElementById("mapConfirmTitle");
const mapConfirmMessage = document.getElementById("mapConfirmMessage");
const mapConfirmButtons = document.getElementById("mapConfirmButtons");
const pauseBtn = document.getElementById("pauseBtn");
const pauseOverlay = document.getElementById("pauseOverlay");
const resumeBtn = document.getElementById("resumeBtn");
const pauseChangeMapBtn = document.getElementById("pauseChangeMapBtn");
const pauseRestartBtn = document.getElementById("pauseRestartBtn");
const codexBtn = document.getElementById("codexBtn");
const codexOverlay = document.getElementById("codexOverlay");
const codexContent = document.getElementById("codexContent");
const codexClose = document.getElementById("codexClose");
const achievementsBtn = document.getElementById("achievementsBtn");
const achievementsOverlay = document.getElementById("achievementsOverlay");
const achievementsContent = document.getElementById("achievementsContent");
const achievementsClose = document.getElementById("achievementsClose");
const towerInfoPopupOverlay = document.getElementById("towerInfoPopupOverlay");
const towerInfoPopupTitle = document.getElementById("towerInfoPopupTitle");
const towerInfoPopupContent = document.getElementById("towerInfoPopupContent");
const towerInfoPopupClose = document.getElementById("towerInfoPopupClose");

const overclockBtn = document.getElementById("overclockBtn");
const fundraiserBtn = document.getElementById("fundraiserBtn");
const airstrikeBtn = document.getElementById("airstrikeBtn");
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
    // No inline description - full desc + entire path tree lives in the
    // double-click popup instead, so the list itself stays compact even as
    // the roster grows.
    btn.innerHTML = `<span class="emoji">${def.emoji}</span><span class="info"><span class="name">${def.name}</span></span><span class="cost">${def.cost}c</span>`;
    btn.addEventListener("click", () => {
      pasteArmed = false;
      state.selectedTowerType = state.selectedTowerType === key ? null : key;
      refreshTowerButtons();
    });
    btn.addEventListener("dblclick", () => openTowerInfoPopup(key));
    towerListEl.appendChild(btn);
  });
}

// 10x Engineer's placement cap grows with how far this map has gotten - 1
// copy once unlocked past sprint 100, 2 past sprint 140, 4 past sprint 200
// (the same milestone waves the megaboss spawns on).
function tenxMaxCopies() {
  if (state.bestWave > 200) return 4;
  if (state.bestWave > 140) return 2;
  return 1;
}

function countPlacedOfType(type) {
  return state.towers.filter((t) => t.type === type).length;
}

function refreshTowerButtons() {
  [...towerListEl.children].forEach((btn) => {
    const key = btn.dataset.type;
    const def = TOWER_TYPES[key];
    // Legendary towers stay fully hidden (not just disabled) until their
    // own unlockCheck() passes, so their existence is a surprise.
    if (def.isLegendary) {
      btn.hidden = !def.unlockCheck();
      if (btn.hidden) return;
    }
    const atCap = def.unique && countPlacedOfType(key) >= tenxMaxCopies();
    btn.classList.toggle("selected", state.selectedTowerType === key);
    btn.disabled = state.gold < def.cost || atCap;
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
  difficultyStat.textContent = (DIFFICULTY_SETTINGS[state.difficulty] || DIFFICULTY_SETTINGS.normal).label;
  checkThresholdAchievements();
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

  if (state.fundraiserActive) {
    fundraiserBtn.textContent = `fundraising (${state.fundraiserTimer.toFixed(1)}s)`;
  } else if (state.fundraiserCooldown > 0) {
    fundraiserBtn.textContent = `fundraiser (${Math.ceil(state.fundraiserCooldown)}s)`;
  } else {
    fundraiserBtn.textContent = `fundraiser! (${FUNDRAISER_MULT}x credits)`;
  }
  fundraiserBtn.disabled = state.fundraiserCooldown > 0;

  const airstrikeCost = airstrikeCurrentCost();
  if (state.airstrikeCooldown > 0) {
    airstrikeBtn.textContent = `airstrike (${Math.ceil(state.airstrikeCooldown)}s)`;
  } else {
    airstrikeBtn.textContent = `airstrike! (${airstrikeCost}c)`;
  }
  airstrikeBtn.disabled = state.airstrikeCooldown > 0 || state.gold < airstrikeCost;
}

// ---------- Save / load (local + cloud) ----------
// Only progress *between* sprints is persisted (gold, towers, wave count) -
// a wave in flight (enemies/projectiles) is not resumable and simply isn't
// saved, so reloading mid-sprint just resumes at "ready for next sprint".
//
// Each of the 3 maps keeps its own independent gold/towers/wave/etc, nested
// under maps.<mapId>. The stored blob also carries a top-level bestWave and
// bestGold that mirror the MAX across all 3 maps - the public leaderboard
// reads those two keys directly from this same JSON, so keeping them at the
// top level means the leaderboard needs zero schema/query changes to show
// "your best across any map".
const TD_SAVE_KEY = "towerDefenseSave";

// The live, in-progress save for whatever (map, difficulty) is currently
// active - nested under maps.<mapId>.saves.<difficulty>. bestWave/bestGold/
// medals live one level up (on the map slot itself, see saveGame) since
// they're permanent lifetime facts about the map, not tied to any one
// difficulty's save and never wiped by starting a new game on it.
function currentDifficultySave() {
  return {
    gold: state.gold,
    lives: state.lives,
    wave: state.wave,
    kills: state.kills,
    towers: state.towers,
  };
}

// Accepts either the new nested shape or an old flat single-map save (from
// before maps existed) and always returns the nested shape - an old save's
// data becomes map1's data, so nothing already played is lost.
function normalizePayload(parsed) {
  if (!parsed) return { activeMap: "map1", maps: {}, achievements: {}, totalBossKills: 0 };
  if (parsed.maps && typeof parsed.maps === "object") {
    return {
      activeMap: MAP_DEFS[parsed.activeMap] ? parsed.activeMap : "map1",
      maps: parsed.maps,
      gameSpeed: parsed.gameSpeed,
      lastSaveTime: parsed.lastSaveTime,
      ownerId: parsed.ownerId,
      achievements: parsed.achievements || {},
      totalBossKills: parsed.totalBossKills || 0,
      mapLayoutVersion: parsed.mapLayoutVersion,
    };
  }
  return {
    activeMap: "map1",
    maps: {
      map1: {
        gold: parsed.gold, bestGold: parsed.bestGold, lives: parsed.lives, wave: parsed.wave,
        bestWave: parsed.bestWave, kills: parsed.kills, towers: parsed.towers,
      },
    },
    gameSpeed: parsed.gameSpeed,
    lastSaveTime: parsed.lastSaveTime,
    ownerId: parsed.ownerId,
    achievements: {},
    totalBossKills: 0,
  };
}

// Bumped whenever the maps' grid/path/placement OR the save shape itself
// fundamentally changes, so old per-map data can't silently end up
// misplaced/misinterpreted. Migration always keeps bestWave/bestGold/medals
// (progression/leaderboard history, Singularity's permanent unlock, earned
// medals) - never wiped. v3 restructured a map's slot from one flat
// gold/wave/towers save into one save PER DIFFICULTY (maps.<id>.saves.<diff>)
// - an old flat save's live progress is carried into the difficulty it was
// already set to (falling back to normal) rather than discarded, since
// there's no ambiguity about which difficulty it belonged to.
const MAP_LAYOUT_VERSION = 3;

function migrateMapLayout(stored) {
  if (stored.mapLayoutVersion === MAP_LAYOUT_VERSION) return stored;
  const migratedMaps = {};
  Object.keys(MAP_DEFS).forEach((id) => {
    const old = stored.maps[id];
    const oldDiff = old?.difficulty && DIFFICULTY_SETTINGS[old.difficulty] ? old.difficulty : "normal";
    const hadLiveRun = old && (old.wave > 0 || (Array.isArray(old.towers) && old.towers.length > 0));
    const saves = {};
    if (hadLiveRun) {
      saves[oldDiff] = {
        gold: typeof old.gold === "number" ? old.gold : STARTING_GOLD,
        lives: typeof old.lives === "number" ? old.lives : STARTING_LIVES,
        wave: old.wave || 0,
        kills: old.kills || 0,
        towers: Array.isArray(old.towers) ? old.towers : [],
      };
    }
    migratedMaps[id] = {
      bestWave: old?.bestWave || 0,
      bestGold: old?.bestGold || STARTING_GOLD,
      medals: old?.medals || { easy: false, normal: false, hard: false },
      activeDifficulty: hadLiveRun ? oldDiff : null,
      saves,
    };
  });
  stored.maps = migratedMaps;
  stored.mapLayoutVersion = MAP_LAYOUT_VERSION;
  return stored;
}

function readStoredPayload() {
  const raw = localStorage.getItem(TD_SAVE_KEY);
  if (!raw) return { activeMap: "map1", maps: {}, achievements: {}, totalBossKills: 0 };
  try {
    return normalizePayload(JSON.parse(raw));
  } catch {
    return { activeMap: "map1", maps: {}, achievements: {}, totalBossKills: 0 };
  }
}

// Singularity's unlock condition - every map's own bestWave (not just the
// currently active one) has to clear sprint 100.
// Deliberately the original 3 maps only, not Object.keys(MAP_DEFS) - so
// adding more maps later never raises this bar and re-locks Singularity for
// someone who already permanently earned it (see [[project_singularity_unlock]]).
const CORE_MAP_IDS = ["map1", "map2", "map3"];

function hasBeatenAllMaps() {
  const stored = readStoredPayload();
  return CORE_MAP_IDS.every((id) => (stored.maps[id]?.bestWave || 0) > TOWER100_UNLOCK_WAVE);
}

// ---------- Achievements ----------
// Lifetime/account-wide (state.achievements, synced like everything else in
// the towerdefense save). "threshold" ones are re-checked cheaply every
// frame from updateStats(); "placed a tower"/"maxed a path" ones fire once,
// right at the moment they happen, since there's no ongoing state that
// reflects tower-placement history once a tower's sold.
// hint shows in place of desc while locked - kept vague for the two that
// would otherwise spoil a secret tower's existence, direct for the plainly
// numeric ones since there's nothing to spoil there.
const ACHIEVEMENTS = [
  { id: "first_tower", name: "Hello World", desc: "place your first tower", hint: "place a tower", kind: "event" },
  { id: "sprint10", name: "Warming Up", desc: "reach sprint 10 on any map", hint: "reach sprint 10 on any map", kind: "threshold" },
  { id: "sprint50", name: "Halfway There", desc: "reach sprint 50 on any map", hint: "reach sprint 50 on any map", kind: "threshold" },
  { id: "sprint100", name: "Centurion", desc: "reach sprint 100 on any map", hint: "reach sprint 100 on any map", kind: "threshold" },
  { id: "sprint200", name: "Beyond the Limit", desc: "reach sprint 200 on any map", hint: "reach sprint 200 on any map", kind: "threshold" },
  { id: "tenx_placed", name: "10x Engineer", desc: "place a 10x Engineer", hint: "there may be more to discover past sprint 100...", kind: "event" },
  { id: "singularity_placed", name: "Beyond Legendary", desc: "place a Singularity", hint: "some secrets require conquering everything", kind: "event" },
  { id: "conqueror", name: "Conqueror", desc: "beat all 3 maps", hint: "beat every map at least once", kind: "threshold" },
  { id: "maxed_path", name: "Specialist", desc: "max out any tower's path all the way", hint: "fully commit to one tower's specialization", kind: "event" },
  { id: "big_spender", name: "Big Spender", desc: "accumulate 10,000 credits at once", hint: "accumulate 10,000 credits at once", kind: "threshold" },
  { id: "boss_slayer", name: "Boss Slayer", desc: "defeat 50 bosses", hint: "defeat 50 bosses total", kind: "threshold" },
];

const achievementToast = document.createElement("div");
achievementToast.className = "achievement-toast";
document.body.appendChild(achievementToast);
let achievementToastTimer = null;

function unlockAchievement(id) {
  if (state.achievements[id]) return;
  state.achievements[id] = true;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (def) {
    achievementToast.textContent = `achievement unlocked: ${def.name}`;
    achievementToast.classList.add("visible");
    clearTimeout(achievementToastTimer);
    achievementToastTimer = setTimeout(() => achievementToast.classList.remove("visible"), 3500);
  }
  saveGame();
}

function checkThresholdAchievements() {
  if (state.bestWave >= 10) unlockAchievement("sprint10");
  if (state.bestWave >= 50) unlockAchievement("sprint50");
  if (state.bestWave >= 100) unlockAchievement("sprint100");
  if (state.bestWave >= 200) unlockAchievement("sprint200");
  if (state.bestGold >= 10000) unlockAchievement("big_spender");
  if (state.totalBossKills >= 50) unlockAchievement("boss_slayer");
  if (!state.achievements.conqueror && hasBeatenAllMaps()) unlockAchievement("conqueror");
  checkMedals();
}

const medalToast = document.createElement("div");
medalToast.className = "achievement-toast";
document.body.appendChild(medalToast);
let medalToastTimer = null;

// Checked every updateStats() call (same cadence as achievements) - fires
// once per map+difficulty the instant the live wave crosses that
// difficulty's threshold, then persists immediately so it survives a crash.
function checkMedals() {
  const threshold = MEDAL_THRESHOLDS[state.difficulty];
  if (!threshold || state.wave <= threshold || state.medals[state.difficulty]) return;
  state.medals[state.difficulty] = true;
  const diffLabel = (DIFFICULTY_SETTINGS[state.difficulty] || DIFFICULTY_SETTINGS.normal).label;
  medalToast.textContent = `medal earned: ${diffLabel} - ${MAP_DEFS[state.mapId]?.name || state.mapId}`;
  medalToast.classList.add("visible");
  clearTimeout(medalToastTimer);
  medalToastTimer = setTimeout(() => medalToast.classList.remove("visible"), 3500);
  saveGame();
}

// Applies one map's saved slot (bestWave/bestGold/medals - permanent, plus
// whichever difficulty's save exists) onto the live (currently active)
// state - used on ordinary load and after entering a map/difficulty.
// Caller is responsible for having already reset to fresh defaults first
// (see resetTransientState in enterMap) - a mapSlot with no save yet for
// this difficulty just leaves those fresh defaults in place.
function applyMapDataToState(mapSlot, difficulty) {
  state.difficulty = difficulty;
  if (!mapSlot) return;
  if (typeof mapSlot.bestWave === "number") state.bestWave = mapSlot.bestWave;
  if (typeof mapSlot.bestGold === "number") state.bestGold = mapSlot.bestGold;
  state.medals = { easy: false, normal: false, hard: false, ...(mapSlot.medals || {}) };

  const save = mapSlot.saves?.[difficulty];
  if (!save) return;
  if (typeof save.gold === "number") state.gold = save.gold;
  if (typeof save.lives === "number") state.lives = save.lives;
  if (typeof save.wave === "number") state.wave = save.wave;
  if (typeof save.kills === "number") state.kills = save.kills;
  // Guard against a stale/incomplete snapshot (e.g. a cloud push that lost a
  // race with navigating away mid-round) silently deleting placed towers -
  // never adopt an incoming towers list that's smaller than what's already here.
  if (Array.isArray(save.towers) && save.towers.length >= state.towers.length) {
    // flashUntil is a performance.now() timestamp from whatever session saved
    // this - meaningless (and potentially crash-inducing, see draw()) now.
    // recomputeTowerStats refreshes any derived field the game code has
    // added since this was last saved (e.g. allySpeed didn't exist before
    // the Recruiter rework) - without this, a tower saved under older code
    // keeps missing fields forever, which silently breaks as NaN math
    // rather than an obvious error.
    state.towers = save.towers.map((t) => ({ ...t, flashUntil: 0 }));
    state.towers.forEach(recomputeTowerStats);
  }
}

function saveGame() {
  state.lastSaveTime = Date.now();
  const stored = readStoredPayload();
  const mapSlot = stored.maps[state.mapId] || {
    bestWave: 0, bestGold: STARTING_GOLD,
    medals: { easy: false, normal: false, hard: false },
    activeDifficulty: null, saves: {},
  };
  mapSlot.saves = mapSlot.saves || {};
  mapSlot.saves[state.difficulty] = currentDifficultySave();
  mapSlot.activeDifficulty = state.difficulty;
  mapSlot.bestWave = Math.max(mapSlot.bestWave || 0, state.wave);
  mapSlot.bestGold = Math.max(mapSlot.bestGold || 0, state.gold);
  mapSlot.medals = state.medals;
  stored.maps[state.mapId] = mapSlot;
  stored.activeMap = state.mapId;
  stored.gameSpeed = state.gameSpeed;
  stored.lastSaveTime = state.lastSaveTime;
  stored.ownerId = state.ownerId;
  const allMaps = Object.values(stored.maps);
  stored.bestWave = Math.max(0, ...allMaps.map((m) => m.bestWave || 0));
  stored.bestGold = Math.max(0, ...allMaps.map((m) => m.bestGold || 0));
  // Achievements are lifetime/account-wide, not per-map - union with
  // whatever's already stored (never un-unlock one) rather than overwrite.
  stored.achievements = { ...(stored.achievements || {}), ...state.achievements };
  stored.totalBossKills = Math.max(stored.totalBossKills || 0, state.totalBossKills || 0);
  localStorage.setItem(TD_SAVE_KEY, JSON.stringify(stored));
  scheduleCloudSync();
}

function loadGame() {
  let stored = readStoredPayload();
  stored = migrateMapLayout(stored);
  localStorage.setItem(TD_SAVE_KEY, JSON.stringify(stored));
  state.mapId = MAP_DEFS[stored.activeMap] ? stored.activeMap : "map1";
  applyMapLayout(state.mapId);
  state.gameSpeed = SPEED_STEPS.includes(stored.gameSpeed) ? stored.gameSpeed : 1;
  state.lastSaveTime = stored.lastSaveTime || Date.now();
  state.ownerId = typeof stored.ownerId === "string" ? stored.ownerId : null;
  state.achievements = { ...stored.achievements };
  state.totalBossKills = stored.totalBossKills || 0;
  const mapSlot = stored.maps[state.mapId];
  const diff = mapSlot?.activeDifficulty && DIFFICULTY_SETTINGS[mapSlot.activeDifficulty] ? mapSlot.activeDifficulty : "normal";
  applyMapDataToState(mapSlot, diff);
}

// Enters a (map, difficulty) combo: saves whatever's being left, then loads
// (or starts fresh on, if wipe is true or nothing's saved there yet) that
// map+difficulty's own save. Always saves first even when re-entering the
// current map, so the picker never discards up-to-3-seconds of unsaved
// progress by reading a stale snapshot. wipe=true deletes any existing save
// for that difficulty before loading - the caller (confirmWipeSave) is
// responsible for having confirmed that with the player first.
function enterMap(mapId, diffId, wipe) {
  if (!MAP_DEFS[mapId] || !DIFFICULTY_SETTINGS[diffId]) return;
  // The whole body is wrapped so a thrown error partway through can never
  // leave the picker/confirm dialogs stuck open over a half-switched game -
  // the overlays always get hidden in the finally block regardless.
  try {
    saveGame();
    const stored = readStoredPayload();
    let mapSlot = stored.maps[mapId];
    if (!mapSlot) {
      mapSlot = { bestWave: 0, bestGold: STARTING_GOLD, medals: { easy: false, normal: false, hard: false }, activeDifficulty: null, saves: {} };
      stored.maps[mapId] = mapSlot;
    }
    mapSlot.saves = mapSlot.saves || {};
    if (wipe) delete mapSlot.saves[diffId];
    localStorage.setItem(TD_SAVE_KEY, JSON.stringify(stored));
    scheduleCloudSync();

    const preservedGameSpeed = state.gameSpeed; // gameSpeed is a global preference, not per-map
    state.mapId = mapId;
    applyMapLayout(mapId);
    resetTransientState();
    state.gameSpeed = preservedGameSpeed;
    syncSpeedButton();
    state.bestWave = 0;
    state.bestGold = STARTING_GOLD;
    applyMapDataToState(mapSlot, diffId);
    updateStats();
    saveGame();
  } catch (err) {
    console.error("enterMap failed:", err);
  } finally {
    mapPickerOverlay.hidden = true;
  }
}

// ---------- Map picker: entry confirmation ----------
// A themed 1-2 button confirm dialog (see #mapConfirmOverlay), reused for
// every "you're about to touch a save" moment in the picker instead of the
// browser's native confirm(). options: [{label, action, danger}].
function showMapConfirm({ title, message, options }) {
  mapConfirmTitle.textContent = title;
  mapConfirmMessage.textContent = message;
  mapConfirmButtons.innerHTML = "";
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "btn" + (opt.danger ? " tower-sell-btn" : "");
    btn.textContent = opt.label;
    btn.addEventListener("click", () => {
      mapConfirmOverlay.hidden = true;
      opt.action();
    });
    mapConfirmButtons.appendChild(btn);
  });
  mapConfirmOverlay.hidden = false;
}

// The map name button's quick-resume path: no prompt if you've already got
// an active difficulty there (nothing at risk, just continuing) - otherwise
// falls through to the same "start a new game?" confirmation as clicking
// Normal directly, since there's nothing to resume yet either way.
function onMapNameClick(mapId) {
  const stored = readStoredPayload();
  const activeDiff = stored.maps[mapId]?.activeDifficulty;
  if (activeDiff && DIFFICULTY_SETTINGS[activeDiff]) {
    enterMap(mapId, activeDiff, false);
  } else {
    onDifficultyClick(mapId, "normal");
  }
}

// A difficulty button's click: if that difficulty already has a save on
// this map, offers load-vs-start-new; if not, confirms starting a fresh one
// (per explicit preference - even though nothing's at risk yet, still asks).
function onDifficultyClick(mapId, diffId) {
  const stored = readStoredPayload();
  const hasSave = !!stored.maps[mapId]?.saves?.[diffId];
  const mapName = MAP_DEFS[mapId].name;
  const diffLabel = DIFFICULTY_SETTINGS[diffId].label;
  if (hasSave) {
    showMapConfirm({
      title: `${mapName} - ${diffLabel}`,
      message: `You have a save on ${diffLabel} for this map. Load it, or start a new game?`,
      options: [
        { label: "Load saved game", action: () => enterMap(mapId, diffId, false) },
        { label: "Create new", action: () => confirmWipeSave(mapId, diffId) },
        { label: "Cancel", action: () => {} },
      ],
    });
  } else {
    showMapConfirm({
      title: `${mapName} - ${diffLabel}`,
      message: `Start a new game on ${diffLabel}?`,
      options: [
        { label: "Start new game", action: () => enterMap(mapId, diffId, true) },
        { label: "Cancel", action: () => {} },
      ],
    });
  }
}

// The destructive path (overwriting an existing save) gets one more explicit
// confirmation beyond the load-vs-new choice, since it can't be undone.
function confirmWipeSave(mapId, diffId) {
  const mapName = MAP_DEFS[mapId].name;
  const diffLabel = DIFFICULTY_SETTINGS[diffId].label;
  showMapConfirm({
    title: "Are you sure?",
    message: `This deletes your existing ${diffLabel} save on ${mapName} and starts a fresh game. This can't be undone.`,
    options: [
      { label: "Delete & start new", action: () => enterMap(mapId, diffId, true), danger: true },
      { label: "Cancel", action: () => {} },
    ],
  });
}

// ---------- Map picker ----------
function renderMapPicker() {
  const stored = readStoredPayload();
  mapPickerList.innerHTML = "";
  Object.entries(MAP_DEFS).forEach(([id, def]) => {
    const mapSlot = stored.maps[id];
    const activeDiff = mapSlot?.activeDifficulty && DIFFICULTY_SETTINGS[mapSlot.activeDifficulty] ? mapSlot.activeDifficulty : null;
    const activeSave = activeDiff ? mapSlot.saves?.[activeDiff] : null;
    // The main line shows the CURRENT (in-progress) sprint/credits for
    // whichever difficulty was last played here, not the lifetime best -
    // best moves to a small aside instead (see .map-picker-best).
    const current = activeSave
      ? `${DIFFICULTY_SETTINGS[activeDiff].label}: sprint ${activeSave.wave || 0} | ${Math.floor(activeSave.gold || 0)}c`
      : "not started yet";
    const best = `best\nsprint ${mapSlot?.bestWave || 0}\n${Math.floor(mapSlot?.bestGold || 0)}c`;
    const medals = { easy: false, normal: false, hard: false, ...(mapSlot?.medals || {}) };
    const mastered = medals.easy && medals.normal && medals.hard;

    const card = document.createElement("div");
    card.className = "map-picker-card" + (mastered ? " map-picker-card-mastered" : "");

    const headerRow = document.createElement("div");
    headerRow.className = "map-picker-header-row";

    const tierLabel = MAP_TIER_LABELS[def.tier] || "";
    const btn = document.createElement("button");
    btn.className = "btn map-picker-btn";
    btn.innerHTML = `<span class="map-picker-name">${def.name}</span><span class="map-picker-tier map-picker-tier-${def.tier}">${tierLabel}</span><span class="map-picker-meta">${current}</span>`;
    btn.addEventListener("click", () => onMapNameClick(id));
    headerRow.appendChild(btn);

    const bestEl = document.createElement("div");
    bestEl.className = "map-picker-best";
    bestEl.textContent = best;
    bestEl.style.whiteSpace = "pre-line";
    headerRow.appendChild(bestEl);

    card.appendChild(headerRow);

    const diffRow = document.createElement("div");
    diffRow.className = "map-picker-diff-row";
    Object.entries(DIFFICULTY_SETTINGS).forEach(([diffId, diffDef]) => {
      const hasSave = !!mapSlot?.saves?.[diffId];
      const diffBtn = document.createElement("button");
      diffBtn.className = "btn map-picker-diff-btn"
        + (diffId === activeDiff ? " active" : "")
        + (hasSave ? " has-save" : "");
      diffBtn.textContent = diffDef.label;
      diffBtn.title = hasSave ? `${diffDef.label}: has a save` : `${diffDef.label}: not started`;
      diffBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onDifficultyClick(id, diffId);
      });
      diffRow.appendChild(diffBtn);
    });
    card.appendChild(diffRow);

    const medalRow = document.createElement("div");
    medalRow.className = "map-picker-medal-row";
    medalRow.innerHTML = Object.entries(DIFFICULTY_SETTINGS)
      .map(([diffId, diffDef]) => {
        const earned = medals[diffId];
        return `<span class="map-picker-medal${earned ? " earned" : ""}" title="${diffDef.label}: sprint ${MEDAL_THRESHOLDS[diffId]}+">${earned ? "🏅" : "⚪"} ${diffDef.label}</span>`;
      })
      .join("");
    card.appendChild(medalRow);

    mapPickerList.appendChild(card);
  });
}

changeMapBtn.addEventListener("click", () => {
  renderMapPicker();
  mapPickerOverlay.hidden = false;
});

pauseBtn.addEventListener("click", () => {
  if (state.gameOver) return;
  state.paused = true;
  pauseOverlay.hidden = false;
});

resumeBtn.addEventListener("click", () => {
  state.paused = false;
  pauseOverlay.hidden = true;
});

pauseChangeMapBtn.addEventListener("click", () => {
  state.paused = false;
  pauseOverlay.hidden = true;
  renderMapPicker();
  mapPickerOverlay.hidden = false;
});

pauseRestartBtn.addEventListener("click", () => {
  state.paused = false;
  pauseOverlay.hidden = true;
  resetGame();
});

// ---------- Codex ----------
// Generated straight from the live TOWER_TYPES/ENEMY_TYPES/RESISTANCES data
// rather than hardcoded, so it can't drift out of sync as towers/enemies
// get added. The secret 10x Engineer stays excluded until unlocked, same
// as the tower list itself.
const DAMAGE_TYPE_INFO = [
  { emoji: "⚔️", name: "Normal", desc: "the default - most towers (Gamer, Sniper, Recruiter's warriors) deal this." },
  { emoji: "💥", name: "Explosive", desc: "Hacker's splash damage. Strong vs Legacy Code, wasted on Firewalled." },
  { emoji: "🔮", name: "Magic", desc: "Quant, and 10x Engineer's Distributed Systems path at T4+. Ignores every resistance - the only reliable answer to Encrypted." },
];

function resistanceText(type) {
  const r = RESISTANCES[type];
  if (!r) return null;
  return Object.entries(r)
    .map(([dmgType, mult]) => `${Math.round((1 - mult) * 100)}% resistant to ${dmgType} damage`)
    .join(", ");
}

function renderCodex() {
  const damageSection = DAMAGE_TYPE_INFO.map(
    (d) => `
      <div class="codex-row">
        <span class="codex-emoji">${d.emoji}</span>
        <span><span class="codex-row-name">${d.name}</span><span class="codex-row-desc">${d.desc}</span></span>
      </div>`,
  ).join("");

  const enemySection = Object.entries(ENEMY_TYPES)
    .map(([key, def]) => {
      const parts = [];
      const resText = resistanceText(key);
      if (resText) parts.push(resText);
      if (def.camo) parts.push("camo - untargetable unless the shooting tower is currently inside an active Manager's buff range");
      if (def.splitsTo) parts.push(`splits into ${def.splitsTo.count}x ${ENEMY_TYPES[def.splitsTo.type].label} on death`);
      if (def.splitInto) {
        const combo = def.splitInto.map((s) => `${s.count}x ${ENEMY_TYPES[s.type].label}`).join(" + ");
        parts.push(`splits into ${combo} on death`);
      }
      if (def.healPerSecPct) parts.push(`heals nearby enemies ${Math.round(def.healPerSecPct * 100)}%/sec of their own max hp`);
      if (def.shieldFrac) parts.push("has a separate regenerating shield on top of its hp");
      const desc = parts.length ? parts.join(" | ") : "no resistances";
      return `
      <div class="codex-row">
        <span class="codex-emoji">${def.emoji}</span>
        <span><span class="codex-row-name">${def.label}</span><span class="codex-row-desc">${desc}</span></span>
      </div>`;
    })
    .join("");

  const towerSection = Object.entries(TOWER_TYPES)
    .filter(([, def]) => !def.isLegendary || def.unlockCheck())
    .map(([, def]) => {
      let typeNote;
      if (def.isSupport) typeNote = "support - no damage";
      else if (def.isEconomy) typeNote = "economy - no damage";
      else if (def.isRecruiter) typeNote = "deploys melee allies - normal damage";
      else typeNote = `${def.damageType || "normal"} damage`;
      return `
      <div class="codex-row">
        <span class="codex-emoji">${def.emoji}</span>
        <span><span class="codex-row-name">${def.name} - ${typeNote}</span><span class="codex-row-desc">${def.desc}</span></span>
      </div>`;
    })
    .join("");

  codexContent.innerHTML = `
    <div class="codex-section"><h3># damage types</h3>${damageSection}</div>
    <div class="codex-section"><h3># enemies</h3>${enemySection}</div>
    <div class="codex-section"><h3># towers</h3>${towerSection}</div>
  `;
}

codexBtn.addEventListener("click", () => {
  renderCodex();
  codexOverlay.hidden = false;
});

codexClose.addEventListener("click", () => {
  codexOverlay.hidden = true;
});

function renderAchievements() {
  achievementsContent.innerHTML = ACHIEVEMENTS.map((a) => {
    const unlocked = !!state.achievements[a.id];
    return `
      <div class="codex-row">
        <span class="codex-emoji">${unlocked ? "✅" : "🔒"}</span>
        <span><span class="codex-row-name">${unlocked ? a.name : "???"}</span><span class="codex-row-desc">${unlocked ? a.desc : a.hint}</span></span>
      </div>`;
  }).join("");
}

achievementsBtn.addEventListener("click", () => {
  renderAchievements();
  achievementsOverlay.hidden = false;
});

achievementsClose.addEventListener("click", () => {
  achievementsOverlay.hidden = true;
});

// Double-clicking a tower in the shop list opens this - full description
// plus every path's entire tier list (including ones far out of reach),
// as a read-only preview. Keeps the shop list itself compact.
function openTowerInfoPopup(key) {
  const def = TOWER_TYPES[key];
  towerInfoPopupTitle.textContent = `${def.emoji} ${def.name}`;
  const paths = TOWER_PATHS[key];

  let html = `<p class="tower-info-popup-desc">${def.desc}</p>`;
  if (!paths) {
    html += `<p class="tower-path-hint">no path system</p>`;
  } else {
    html += Object.values(paths)
      .map((pathDef) => {
        const tiersHtml = pathDef.tiers
          .map((tier, i) => {
            const level = PATH_TIER_LEVELS[i];
            const cost = pathTierCost(tier, i, key);
            return `
              <div class="codex-row">
                <span class="codex-emoji">T${i + 1}</span>
                <span><span class="codex-row-name">level ${level} - ${cost}c</span><span class="codex-row-desc">${tier.desc}</span></span>
              </div>`;
          })
          .join("");
        return `<div class="multipath-group"><p class="multipath-heading" style="color:${pathDef.accentColor}">${pathDef.name}</p>${tiersHtml}</div>`;
      })
      .join("");
  }
  towerInfoPopupContent.innerHTML = html;
  towerInfoPopupOverlay.hidden = false;
}

towerInfoPopupClose.addEventListener("click", () => {
  towerInfoPopupOverlay.hidden = true;
});

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
// This whole-payload decision (local snapshot vs cloud snapshot) now covers
// all 3 maps at once rather than a single map's fields.
async function pullCloudSave() {
  if (typeof accountGetUser !== "function") return;
  const user = await accountGetUser();
  if (!user) return;

  const localStored = readStoredPayload();
  const cloudRaw = await loadCloudSave("towerdefense");
  const cloudStored = cloudRaw ? normalizePayload(cloudRaw) : null;

  let winner = localStored;
  if (state.ownerId === user.id) {
    if (cloudStored && (cloudStored.lastSaveTime || 0) >= (localStored.lastSaveTime || 0)) {
      winner = cloudStored;
    }
  } else if (cloudStored) {
    winner = cloudStored;
  }

  // A cloud snapshot may predate this update (unmigrated map layout/towers)
  // even when local storage was already migrated by loadGame() - migrate
  // whichever payload wins before it's adopted, not just on initial load.
  winner = migrateMapLayout(winner);

  state.ownerId = user.id;
  winner.ownerId = user.id;
  localStorage.setItem(TD_SAVE_KEY, JSON.stringify(winner));

  state.mapId = MAP_DEFS[winner.activeMap] ? winner.activeMap : "map1";
  applyMapLayout(state.mapId);
  state.gameSpeed = SPEED_STEPS.includes(winner.gameSpeed) ? winner.gameSpeed : 1;
  state.lastSaveTime = winner.lastSaveTime || Date.now();
  state.achievements = { ...winner.achievements };
  state.totalBossKills = winner.totalBossKills || 0;
  state.towers = [];
  const winnerMapSlot = winner.maps[state.mapId];
  const winnerDiff = winnerMapSlot?.activeDifficulty && DIFFICULTY_SETTINGS[winnerMapSlot.activeDifficulty] ? winnerMapSlot.activeDifficulty : "normal";
  applyMapDataToState(winnerMapSlot, winnerDiff);

  saveGame();
  updateStats();
  syncSpeedButton();
}

window.addEventListener("account:login", pullCloudSave);

// Logging out should never leave the previous account's data on screen (or
// in localStorage, on a shared device) - snap straight back to a blank
// guest state on map1, wiping every map's progress (bestWave/bestGold are
// tied to account identity).
window.addEventListener("account:logout", () => {
  state.mapId = "map1";
  applyMapLayout("map1");
  resetTransientState();
  state.bestWave = 0;
  state.bestGold = 200;
  state.ownerId = null;
  state.achievements = {};
  state.totalBossKills = 0;
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

// ---------- Copy/paste a tower (ctrl+c / ctrl+v) ----------
// towerClipboard holds a full blueprint (every field of the copied tower
// except its position and transient/runtime bits) plus the exact credits it
// took to build that tower (totalInvested - placement + every upgrade +
// every path tier, see the fix to buyPathTier below). Pasting is priced at
// that same total, not the tower's base shop cost, so duplicating a
// heavily-leveled tower costs exactly as much as building it from scratch
// did the first time.
let towerClipboard = null;
let pasteArmed = false;

function copySelectedTower() {
  const t = state.selectedTower;
  if (!t) return;
  const { x, y, cooldown, flashUntil, placedAt, visualStage, totalDamageDealt, totalInvested, ...blueprint } = t;
  towerClipboard = { blueprint, cost: totalInvested };
  const def = TOWER_TYPES[t.type];
  medalToast.textContent = `copied ${def.emoji} ${def.name} (Lv.${t.level}) - paste costs ${Math.round(totalInvested)}c`;
  medalToast.classList.add("visible");
  clearTimeout(medalToastTimer);
  medalToastTimer = setTimeout(() => medalToast.classList.remove("visible"), 3000);
}

function armPaste() {
  if (!towerClipboard) return;
  state.selectedTower = null;
  state.selectedTowerType = null;
  pasteArmed = true;
  hideTowerInfoPanel();
  refreshTowerButtons();
}

// Mirrors the level/path-chosen thresholds markVisualMilestone normally
// reaches incrementally, so a pasted tower shows the correct ring/badge
// immediately instead of building back up to it.
function visualStageForBlueprint(bp) {
  const hasPath = bp.path || (bp.pathTiers && Object.values(bp.pathTiers).some((n) => n > 0));
  if (hasPath) return 3;
  if (bp.level >= 3) return 2;
  if (bp.level >= 2) return 1;
  return 0;
}

function commitPaste(x, y) {
  if (!towerClipboard) {
    pasteArmed = false;
    return;
  }
  if (!canPlaceTowerAt(x, y)) return;
  const bp = towerClipboard.blueprint;
  const def = TOWER_TYPES[bp.type];
  if (def.isLegendary && !def.unlockCheck()) return;
  if (def.unique && countPlacedOfType(bp.type) >= tenxMaxCopies()) return;
  const cost = towerClipboard.cost;
  if (state.gold < cost) return;

  state.gold -= cost;
  const tower = {
    ...bp,
    x,
    y,
    cooldown: 0,
    totalDamageDealt: 0,
    totalInvested: cost,
    flashUntil: performance.now() + 400,
    placedAt: performance.now(),
    visualStage: visualStageForBlueprint(bp),
  };
  recomputeTowerStats(tower);
  state.towers.push(tower);
  updateStats();
  saveGame();
}

function handlePlacementOrSelection(pos) {
  const { x, y } = pos;
  const hitTower = state.towers.find((t) => distance(t.x, t.y, x, y) <= TOWER_BODY_RADIUS + 2);
  if (hitTower) {
    pasteArmed = false;
    selectTower(hitTower);
    return;
  }

  if (pasteArmed) {
    commitPaste(x, y);
    return;
  }

  if (!state.selectedTowerType) return;
  if (!canPlaceTowerAt(x, y)) return;

  const def = TOWER_TYPES[state.selectedTowerType];
  if (def.isLegendary && !def.unlockCheck()) return;
  if (def.unique && countPlacedOfType(state.selectedTowerType) >= tenxMaxCopies()) return;
  const cost = Math.round(def.cost * (1 - getCostDiscount()));
  if (state.gold < cost) return;

  state.gold -= cost;
  const tower = {
    type: state.selectedTowerType,
    x,
    y,
    cooldown: 0,
    level: 1,
    path: null,
    pathTier: 0,
    totalInvested: cost,
    totalDamageDealt: 0,
    flashUntil: performance.now() + 400,
    placedAt: performance.now(),
    visualStage: 0,
    ...def,
  };
  recomputeTowerStats(tower);
  state.towers.push(tower);
  unlockAchievement("first_tower");
  if (tower.type === "tenx") unlockAchievement("tenx_placed");
  if (tower.type === "singularity") unlockAchievement("singularity_placed");
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
  // Halved from 0.4 so plain leveling stays cheap and path investment (see
  // PATH_TIER_COST_MULT) is where the real spending decisions happen.
  const raw = baseCost * 0.2 * Math.pow(1.6, t.level - 1);
  return Math.round(raw * (1 - getCostDiscount()));
}

// Recomputes a tower's derived stats from its base definition, level, and
// (if chosen) its path multipliers. Path bonuses are permanent multipliers
// layered on top of level scaling, so leveling keeps working the same way
// after a path is chosen - called on placement, on level-up, and right
// after a path tier is bought.
// Combines Omniscience's, Time Dilation's, and Detonation's separately-
// tracked contributions into the actual pathRangeMult/pathDamageMult that
// recomputeTowerStats reads - called after every Singularity tier purchase,
// before recomputeTowerStats. See the comment above the omniscience path.
// Also derives damageType here rather than letting Entropy/Detonation's
// apply() set it directly, since owning both at once would otherwise let
// whichever was purchased more recently silently overwrite the other -
// magic (Entropy) always wins when both are owned, since it bypasses every
// resistance and there's never a reason to prefer explosive over it.
function recomputeSingularityMultiPath(t) {
  t.pathRangeMult = (t.omniscienceRangeMult || 1) * (t.dilationRangeMult || 1);
  t.pathDamageMult = (t.omniscienceDamageMult || 1) * (t.dilationDamageMult || 1) * (t.explosionDamageMult || 1);
  if (t.percentDamage) t.damageType = "magic";
  else if (t.hasExplosionPath) t.damageType = "explosive";
}

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
  } else if (t.isRecruiter) {
    t.deployInterval = def.deployInterval / (t.pathDeployRateMult || 1);
    t.allyDamage = def.allyDamage * levelFactor * (t.pathAllyDamageMult || 1);
    t.allyRange = def.allyRange;
    t.allySpeed = def.allySpeed;
    t.allyFireRate = def.allyFireRate;
    t.allyDuration = def.allyDuration * (t.pathAllyDurationMult || 1);
    t.allyCount = def.allyCount + (t.pathAllyCountBonus || 0);
  } else if (t.isSentry) {
    // No path system, but auto-levels forever for free - exponential
    // scaling rewards leaving it alone long-term instead of flattening out
    // like the normal linear per-level curve everyone else uses.
    t.damage = def.damage * Math.pow(1.12, t.level - 1);
    t.fireRate = def.fireRate;
    t.splashRadius = 0;
  } else if (t.type === "singularity") {
    // Auto-levels forever for free (like Sentry) but keeps its full path
    // system. Uses the exact same linear formulas as every other tower
    // (levelFactor/rangeLevelFactor, already computed above) so it stays
    // "mid" for a long time despite free uncapped leveling - a late kicker
    // (1 until level 300, then compounding) makes damage specifically
    // explode starting around level 350. Fire rate deliberately never
    // scales from level at all - only a path could raise it, and none
    // currently do - so an idled-forever Singularity can't spiral into
    // firing fast enough to actually lag the game.
    const lateDmgBoost = Math.pow(1.06, Math.max(0, t.level - 300));
    const lateRangeBoost = Math.pow(1.02, Math.max(0, t.level - 300));
    t.damage = t.percentDamage
      ? (t.entropyPercent || 0) * (t.pathDamageMult || 1)
      : def.damage * levelFactor * lateDmgBoost * (t.pathDamageMult || 1);
    t.range = def.range * rangeLevelFactor * lateRangeBoost * (t.pathRangeMult || 1);
    t.fireRate = def.fireRate / (t.pathRateMult || 1);
    // splashRadius (Detonation path) and damageType (Entropy vs Detonation)
    // are deliberately NOT derived here - they're set directly by
    // buyPathTier/recomputeSingularityMultiPath instead, since Singularity
    // has no single def.splashRadius/damageType to derive them from the way
    // every other tower does.
  } else {
    t.damage = def.damage * levelFactor * (t.pathDamageMult || 1);
    t.fireRate = def.fireRate / (t.pathRateMult || 1);
    t.splashRadius = (def.splashRadius || 0) * (t.pathSplashMult || 1);
  }

  // Applied last, after every branch above has had its say on t.range - caps
  // any tower's fully-computed range to 1/3 of the map's shorter dimension,
  // unless it's explicitly a global-range tower (the Sniper).
  if (!def.isGlobalRange) t.range = Math.min(t.range, MAP_RANGE_CAP);
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

  // multiPath towers (Singularity) can own every path at once - progress is
  // tracked per path in pathTiers instead of the single path/pathTier pair
  // everyone else uses, and there's no "locks out the other paths" check.
  if (TOWER_TYPES[t.type].multiPath) {
    t.pathTiers = t.pathTiers || {};
    const nextTierIndex = t.pathTiers[pathId] || 0;
    const tier = pathDef.tiers[nextTierIndex];
    if (!tier) return; // already maxed
    const cost = pathTierCost(tier, nextTierIndex, t.type);
    if (t.level < PATH_TIER_LEVELS[nextTierIndex] || state.gold < cost) return;

    state.gold -= cost;
    t.totalInvested += cost;
    t.pathTiers[pathId] = nextTierIndex + 1;
    tier.apply(t);
    recomputeSingularityMultiPath(t);
    recomputeTowerStats(t);
    if (nextTierIndex === 0) markVisualMilestone(t, 3);
    else t.flashUntil = performance.now() + 400;
    if (t.pathTiers[pathId] >= pathDef.tiers.length) unlockAchievement("maxed_path");
    updateStats();
    saveGame();
    return;
  }

  if (t.path && t.path !== pathId) return;

  const nextTierIndex = t.pathTier || 0;
  const tier = pathDef.tiers[nextTierIndex];
  if (!tier) return; // already maxed
  const cost = pathTierCost(tier, nextTierIndex, t.type);
  if (t.level < PATH_TIER_LEVELS[nextTierIndex] || state.gold < cost) return;

  state.gold -= cost;
  t.totalInvested += cost;
  t.path = pathId;
  t.pathTier = nextTierIndex + 1;
  tier.apply(t);
  recomputeTowerStats(t);
  if (nextTierIndex === 0) markVisualMilestone(t, 3);
  else t.flashUntil = performance.now() + 400;
  if (t.pathTier >= pathDef.tiers.length) unlockAchievement("maxed_path");
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
  let pathLabel = "";
  if (def.multiPath && t.pathTiers) {
    const owned = Object.entries(t.pathTiers).filter(([, n]) => n > 0).map(([id, n]) => `${TOWER_PATHS[t.type][id].name} T${n}`);
    if (owned.length) pathLabel = ` - ${owned.join(", ")}`;
  } else if (t.path) {
    pathLabel = ` - ${TOWER_PATHS[t.type][t.path].name} T${t.pathTier}`;
  }
  towerInfoName.textContent = `${def.emoji} ${def.name} (Lv.${t.level})${pathLabel}`;
  let statsLine;
  if (t.isSupport) {
    statsLine = `+${Math.round(t.buffDamagePct * 100)}% dmg, +${Math.round(t.buffRatePct * 100)}% rate to devs in range`;
  } else if (t.isEconomy) {
    statsLine = `+${t.incomePerSec.toFixed(1)} credits/sec during sprints`;
  } else if (t.isRecruiter) {
    statsLine = `deploys ${t.allyCount} warrior${t.allyCount === 1 ? "" : "s"} for ${t.allyDuration.toFixed(1)}s every ${t.deployInterval.toFixed(1)}s`;
  } else if (t.percentDamage) {
    statsLine = `dmg ${(t.damage * 100).toFixed(1)}% max hp | range ${def.isGlobalRange ? "∞" : Math.round(t.range)}`;
  } else {
    statsLine = `dmg ${Math.round(t.damage)} | range ${def.isGlobalRange ? "∞" : Math.round(t.range)}`;
  }
  if (t.autoLevels) {
    statsLine += ` | auto-levels in ${Math.ceil(t.autoLevelCooldown ?? t.autoLevelInterval)}s`;
  }
  towerInfoLevel.textContent = `${statsLine} | dealt: ${Math.round(t.totalDamageDealt || 0).toLocaleString()}`;

  const cost = towerUpgradeCost(t);
  towerUpgradeBtn.textContent = `upgrade (${cost}c)`;
  towerUpgradeBtn.disabled = state.gold < cost;
  towerSellBtn.textContent = `sell (+${Math.round(t.totalInvested * 0.6)}c)`;

  refreshTowerPathSection(t);
}

// refreshTowerInfoPanel runs every frame (60x/sec), so this must NOT tear
// down and recreate button elements on every call - a mouse click needs
// mousedown and mouseup to land on the SAME element, and swapping the
// button out mid-click silently drops the click. Touch taps resolve more
// atomically, which is why this only ever broke on desktop. Fix: only
// rebuild the DOM when the actual structure changes (tower/path/tier/level-
// gate), and just update disabled state on the existing button otherwise.
let lastPathSectionTower = null;
let lastPathSectionKey = null;

function refreshTowerPathSection(t) {
  const paths = TOWER_PATHS[t.type];
  if (!paths) {
    towerPathSection.innerHTML = "";
    lastPathSectionTower = null;
    lastPathSectionKey = null;
    return;
  }

  if (TOWER_TYPES[t.type].multiPath) {
    t.pathTiers = t.pathTiers || {};
    const key = Object.keys(paths)
      .map((id) => {
        const idx = t.pathTiers[id] || 0;
        return `${id}:${idx}:${t.level >= PATH_TIER_LEVELS[idx] ? 1 : 0}`;
      })
      .join("|");
    if (t !== lastPathSectionTower || key !== lastPathSectionKey) {
      lastPathSectionTower = t;
      lastPathSectionKey = key;
      buildMultiPathSectionDOM(t, paths);
    }
    updateMultiPathSectionDynamicBits(t, paths);
    return;
  }

  const tierIndex = t.pathTier || 0;
  const requiredLevel = t.path ? PATH_TIER_LEVELS[tierIndex] : PATH_UNLOCK_LEVEL;
  const levelMet = t.level >= requiredLevel;
  const key = `${t.path || ""}:${tierIndex}:${levelMet ? 1 : 0}`;

  if (t !== lastPathSectionTower || key !== lastPathSectionKey) {
    lastPathSectionTower = t;
    lastPathSectionKey = key;
    buildPathSectionDOM(t, paths, tierIndex, levelMet);
  }
  updatePathSectionDynamicBits(t, paths, tierIndex);
}

// multiPath towers (Singularity) show every path's own progress at once,
// each with its own "reach level X" hint or buy button, instead of picking
// one path and hiding the rest.
function buildMultiPathSectionDOM(t, paths) {
  towerPathSection.innerHTML = "";
  Object.entries(paths).forEach(([pathId, pathDef]) => {
    const tierIndex = t.pathTiers[pathId] || 0;
    const group = document.createElement("div");
    group.className = "multipath-group";
    const heading = document.createElement("p");
    heading.className = "multipath-heading";
    heading.textContent = pathDef.name;
    group.appendChild(heading);

    for (let i = 0; i < tierIndex; i++) {
      const p = document.createElement("p");
      p.className = "tower-path-chosen";
      p.textContent = `T${i + 1}: ${pathDef.tiers[i].desc}`;
      group.appendChild(p);
    }

    const nextTier = pathDef.tiers[tierIndex];
    if (nextTier) {
      const requiredLevel = PATH_TIER_LEVELS[tierIndex];
      if (t.level < requiredLevel) {
        const hint = document.createElement("p");
        hint.className = "tower-path-hint";
        hint.textContent = `reach level ${requiredLevel} for T${tierIndex + 1}: ${nextTier.desc}`;
        group.appendChild(hint);
      } else {
        const btn = document.createElement("button");
        btn.className = "btn path-btn";
        btn.dataset.pathId = pathId;
        btn.innerHTML = `<span class="path-name">T${tierIndex + 1}</span><span class="path-desc">${nextTier.desc}</span><span class="path-cost">${pathTierCost(nextTier, tierIndex, t.type)}c</span>`;
        btn.addEventListener("click", () => buyPathTier(t, pathId));
        group.appendChild(btn);
      }
    } else {
      const maxed = document.createElement("p");
      maxed.className = "tower-path-chosen";
      maxed.textContent = "maxed";
      group.appendChild(maxed);
    }

    towerPathSection.appendChild(group);
  });
}

function updateMultiPathSectionDynamicBits(t, paths) {
  towerPathSection.querySelectorAll(".path-btn").forEach((btn) => {
    const pathId = btn.dataset.pathId;
    const pathDef = paths[pathId];
    if (!pathDef) return;
    const tierIndex = t.pathTiers[pathId] || 0;
    const tier = pathDef.tiers[tierIndex];
    if (tier) btn.disabled = state.gold < pathTierCost(tier, tierIndex, t.type);
  });
}

function buildPathSectionDOM(t, paths, tierIndex, levelMet) {
  towerPathSection.innerHTML = "";

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
      if (!levelMet) {
        const requiredLevel = PATH_TIER_LEVELS[tierIndex];
        const hint = document.createElement("p");
        hint.className = "tower-path-hint";
        hint.textContent = `reach level ${requiredLevel} for ${chosen.name} T${tierIndex + 1}: ${nextTier.desc}`;
        towerPathSection.appendChild(hint);
      } else {
        const btn = document.createElement("button");
        btn.className = "btn path-btn";
        btn.dataset.pathId = t.path;
        btn.innerHTML = `<span class="path-name">${chosen.name} T${tierIndex + 1}</span><span class="path-desc">${nextTier.desc}</span><span class="path-cost">${pathTierCost(nextTier, tierIndex, t.type)}c</span>`;
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
    btn.dataset.pathId = pathId;
    btn.innerHTML = `<span class="path-name">${pathDef.name}</span><span class="path-desc">${tier1.desc}</span><span class="path-cost">${pathTierCost(tier1, 0, t.type)}c</span>`;
    btn.addEventListener("click", () => buyPathTier(t, pathId));
    towerPathSection.appendChild(btn);
  });
}

function updatePathSectionDynamicBits(t, paths) {
  const tierIndex = t.pathTier || 0;
  towerPathSection.querySelectorAll(".path-btn").forEach((btn) => {
    const pathId = btn.dataset.pathId;
    const pathDef = paths[pathId];
    if (!pathDef) return;
    const idx = t.path === pathId ? tierIndex : 0;
    const tier = pathDef.tiers[idx];
    if (tier) btn.disabled = state.gold < pathTierCost(tier, idx, t.type);
  });
}

towerInfoClose.addEventListener("click", hideTowerInfoPanel);
towerUpgradeBtn.addEventListener("click", () => state.selectedTower && upgradeTower(state.selectedTower));
towerSellBtn.addEventListener("click", () => state.selectedTower && sellTower(state.selectedTower));

// q-w-e-r-t-y-u-i-o-p-a selects which tower to place, one letter per
// TOWER_TYPES entry in definition order - works even with nothing selected,
// same as clicking its button in the list. Legendary towers stay unusable
// via hotkey too until their own unlockCheck() passes.
const TOWER_HOTKEYS = {
  q: "gamer", w: "coder", e: "hacker", r: "manager", t: "farmer",
  y: "recruiter", u: "quant", i: "freeze", o: "turret", p: "tenx", a: "singularity", s: "tesla",
  d: "shotgun",
};

// = deploys the next sprint, - toggles auto-run (neither needs a tower
// selected). With a tower selected: 1-4 pick a path option (or advance the
// chosen path's next tier - up to 4 since some towers now offer that many),
// ` (backtick) upgrades, Delete/Backspace sells. Ignored while typing in
// any input (e.g. the cheat box), since "MONEY123 123" contains these same digits.
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  // ctrl+c copies the selected tower's full build (level/path/tiers) to a
  // clipboard; ctrl+v arms placement of that exact build elsewhere on the
  // board, priced at what it actually cost to build the first time.
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
    e.preventDefault();
    copySelectedTower();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
    e.preventDefault();
    armPaste();
    return;
  }

  const hotkeyType = TOWER_HOTKEYS[e.key.toLowerCase()];
  if (hotkeyType) {
    const def = TOWER_TYPES[hotkeyType];
    if (def.isLegendary && !def.unlockCheck()) return;
    state.selectedTowerType = state.selectedTowerType === hotkeyType ? null : hotkeyType;
    refreshTowerButtons();
    return;
  }

  // = deploys the next sprint, - toggles auto-run - both work regardless of
  // whether a tower is selected. .click() (not calling the handlers
  // directly) so a disabled waveBtn mid-sprint is correctly a no-op, same
  // as a real click.
  if (e.key === "=") {
    waveBtn.click();
    return;
  }
  if (e.key === "-") {
    autoRunBtn.click();
    return;
  }

  if (!state.selectedTower) return;
  if (e.key === "`") {
    if (!towerUpgradeBtn.disabled) upgradeTower(state.selectedTower);
  } else if (["1", "2", "3", "4"].includes(e.key)) {
    const btn = towerPathSection.querySelectorAll(".path-btn")[Number(e.key) - 1];
    if (btn && !btn.disabled) btn.click();
  } else if (e.key === "Delete" || e.key === "Backspace") {
    sellTower(state.selectedTower);
  }
});

// A combat tower's damage/fire-rate multipliers from nearby Manager towers and Overclock.
// Also reports whether a Manager is currently supporting this tower right
// now - that's live/positional camo detection: leave the Manager's range
// (or sell it) and detection is lost immediately, same frame.
function getTowerBuffs(tower) {
  let damageMult = 1;
  let rateMult = 1;
  let supported = false;
  for (const other of state.towers) {
    // grantsAura lets a tower buff nearby allies while also attacking on
    // its own (unlike isSupport towers, which only ever buff) - used by
    // 10x Engineer's Mentorship path and Singularity's Time Dilation path.
    if (!other.isSupport && !other.grantsAura) continue;
    if (distance(tower.x, tower.y, other.x, other.y) <= other.range) {
      damageMult += other.buffDamagePct;
      rateMult += other.buffRatePct;
      supported = true;
    }
  }
  if (state.overclockActive) rateMult += 0.75;
  return { damageMult, rateMult, supported };
}

// Passive income from Consultant towers, and passive slow auras from
// upgraded Debuggers - both run continuously regardless of fire cooldown.
function updateEconomy(dt) {
  if (!state.waveInProgress) return; // Consultants only earn while a sprint is active
  for (const t of state.towers) {
    if (t.isEconomy) state.gold += t.incomePerSec * dt * goldYieldMult();
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

// Recruiters periodically deploy temporary ally units near themselves -
// these are lightweight, separate from state.towers (no placement, no
// selection/upgrade UI), and expire on their own after allyDuration.
// Finds the point on the path polyline nearest (x, y), and which segment
// it falls on - used so a Recruiter's warriors emerge from the stretch of
// track closest to that specific tower instead of a fixed spot on the map.
function closestPointOnPath(x, y) {
  let best = null;
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const a = PATH_POINTS[i];
    const b = PATH_POINTS[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((x - a.x) * dx + (y - a.y) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const dist = Math.hypot(x - px, y - py);
    if (!best || dist < best.dist) best = { x: px, y: py, segment: i, dist };
  }
  return best;
}

// Sentries have no path system - instead they auto-level for free on a
// timer, reusing the normal level-scaling formula in recomputeTowerStats.
// Paying for a manual upgrade still works too and doesn't reset this timer.
// Drives any tower with autoLevels: true (Sentry, Singularity) - each just
// levels up for free on its own interval, on top of still being manually
// upgradeable. recomputeTowerStats reads t.autoLevelInterval/t.isSentry to
// decide exactly how that level translates into stats for that tower.
function updateSentries(dt) {
  for (const t of state.towers) {
    if (!t.autoLevels) continue;
    t.autoLevelCooldown = (t.autoLevelCooldown ?? t.autoLevelInterval) - dt;
    if (t.autoLevelCooldown <= 0) {
      t.autoLevelCooldown = t.autoLevelInterval;
      t.level += 1;
      recomputeTowerStats(t);
    }
  }
}

function updateRecruiters(dt) {
  if (!state.waveInProgress) return; // warriors only deploy during an active sprint
  for (const t of state.towers) {
    if (!t.isRecruiter) continue;
    t.deployCooldown = (t.deployCooldown ?? 0) - dt;
    if (t.deployCooldown > 0) continue;
    t.deployCooldown = t.deployInterval;
    // Warriors emerge from the stretch of track nearest this Recruiter and
    // walk backwards toward the entrance from there (segment counts DOWN,
    // the reverse of how enemies move), fighting anything they meet along
    // the way instead of sitting still.
    const spawnPoint = closestPointOnPath(t.x, t.y);
    for (let i = 0; i < t.allyCount; i++) {
      state.allies.push({
        x: spawnPoint.x + (Math.random() - 0.5) * 24,
        y: spawnPoint.y + (Math.random() - 0.5) * 24,
        segment: spawnPoint.segment,
        speed: t.allySpeed,
        damage: t.allyDamage,
        range: t.allyRange,
        fireRate: t.allyFireRate,
        cooldown: 0,
        color: t.pathAllyExplosive ? "#fb923c" : "#fde047",
        emoji: "🧑‍💻",
        damageType: t.pathAllyExplosive ? "explosive" : "normal",
        splashRadius: t.pathAllyExplosive ? 40 : 0,
        bonusGoldPerKill: t.pathAllyBonusGold || 0,
        bossDamageMult: t.pathAllyBossMult || 0,
        tankDamageMult: t.pathAllyTankMult || 0,
        expiresAt: performance.now() + t.allyDuration * 1000,
      });
    }
  }
}

// Allies never see camo (only real towers can, via Manager support). Each
// one holds position and melees whatever's in range on its own cooldown;
// only once nothing is in range does it resume marching backwards.
function updateAllies(dt) {
  const now = performance.now();
  for (let i = state.allies.length - 1; i >= 0; i--) {
    const a = state.allies[i];
    if (now >= a.expiresAt) {
      state.allies.splice(i, 1);
      continue;
    }

    const targets = findTargets(a, 1, false);
    if (targets.length > 0) {
      a.cooldown -= dt;
      if (a.cooldown <= 0) {
        const target = targets[0];
        if (a.splashRadius > 0) {
          spawnExplosion(target.x, target.y, a.splashRadius, a.color);
          [...state.enemies].forEach((e) => {
            if (distance(target.x, target.y, e.x, e.y) <= a.splashRadius) applyDamage(e, a.damage, a);
          });
        } else {
          applyDamage(target, a.damage, a);
        }
        a.cooldown = a.fireRate;
      }
      continue;
    }

    const wp = PATH_POINTS[a.segment];
    if (!wp) {
      state.allies.splice(i, 1); // reached the entrance - patrol's over
      continue;
    }
    const d = distance(a.x, a.y, wp.x, wp.y);
    const step = a.speed * dt;
    if (step >= d) {
      a.x = wp.x;
      a.y = wp.y;
      a.segment -= 1;
    } else {
      a.x += ((wp.x - a.x) / d) * step;
      a.y += ((wp.y - a.y) / d) * step;
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

// ---------- Fundraiser ability (temporary credit-yield boost) ----------
function goldYieldMult() {
  return state.fundraiserActive ? FUNDRAISER_MULT : 1;
}

function activateFundraiser() {
  if (state.fundraiserCooldown > 0 || state.gameOver) return;
  state.fundraiserActive = true;
  state.fundraiserTimer = FUNDRAISER_DURATION;
  state.fundraiserCooldown = FUNDRAISER_COOLDOWN;
  updateStats();
}

function updateFundraiser(dt) {
  if (state.fundraiserActive) {
    state.fundraiserTimer -= dt;
    if (state.fundraiserTimer <= 0) state.fundraiserActive = false;
  }
  if (state.fundraiserCooldown > 0) {
    state.fundraiserCooldown = Math.max(0, state.fundraiserCooldown - dt);
  }
}

fundraiserBtn.addEventListener("click", activateFundraiser);

// ---------- Airstrike ability (paid, modest damage to every on-screen enemy) ----------
function airstrikeCurrentCost() {
  return Math.round(AIRSTRIKE_COST_BASE * (1 + state.wave * 0.05));
}

function activateAirstrike() {
  if (state.airstrikeCooldown > 0 || state.gameOver) return;
  const cost = airstrikeCurrentCost();
  if (state.gold < cost) return;
  state.gold -= cost;
  state.airstrikeCooldown = AIRSTRIKE_COOLDOWN;
  // Modest, wave-scaled damage - not meant to clear a wave on its own, just
  // chip everything visible. sourceTower is null (treated as magic/true
  // damage in applyDamage), so it's a consistent utility regardless of
  // resistances rather than tied to any one tower's counter mechanic.
  const dmg = Math.round(40 * (1 + state.wave * 0.18));
  [...state.enemies].forEach((e) => {
    if (isEnemyHalfOnScreen(e)) applyDamage(e, dmg, null);
  });
  updateStats();
  saveGame();
}

airstrikeBtn.addEventListener("click", activateAirstrike);

speedBtn.addEventListener("click", () => {
  const idx = SPEED_STEPS.indexOf(state.gameSpeed);
  state.gameSpeed = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
  syncSpeedButton();
  saveGame();
});

// ---------- Waves ----------
// Boss waves come more often the further you get, and past wave 70 a boss
// wave can bring more than one boss - both keep escalating indefinitely
// rather than capping, so no wave count eventually becomes a permanent breather.
function bossIntervalFor(waveNum) {
  if (waveNum >= 90) return 2;
  if (waveNum >= 70) return 3;
  if (waveNum >= 50) return 4;
  return 5;
}

function bossCountFor(waveNum) {
  if (waveNum < 70) return 1;
  return 2 + Math.floor((waveNum - 70) / 20);
}

// Every 7th wave from 7 onward is an all-Glitch swarm - many fast, low-hp
// enemies instead of the usual mix (double count, since Glitches alone are
// individually much weaker than a normal mixed wave).
function isSwarmWave(waveNum) {
  return waveNum >= 7 && waveNum % 7 === 0;
}

function buildWave(waveNum) {
  const swarm = isSwarmWave(waveNum);
  const count = swarm ? (6 + waveNum * 2) * 2 : 6 + waveNum * 2;
  const queue = [];
  for (let i = 0; i < count; i++) {
    if (swarm) {
      queue.push("fast");
      continue;
    }
    let type = "basic";
    const roll = Math.random();
    // Each resistant/camo/special type is gated to later waves, per roll
    // ranges that widen as the wave number climbs.
    if (waveNum >= 25 && roll < 0.08) type = "encrypted";
    else if (waveNum >= 20 && roll < 0.16) type = "shielded";
    else if (waveNum >= 18 && roll < 0.24) type = "firewalled";
    else if (waveNum >= 16 && roll < 0.32) type = "healer";
    else if (waveNum >= 14 && roll < 0.42) type = "obfuscated";
    else if (waveNum >= 10 && roll < 0.52) type = "legacy";
    else if (waveNum >= 6 && roll < 0.62) type = "splitter";
    else if (waveNum >= 5 && roll < 0.72) type = "tank";
    else if (waveNum >= 2 && roll < 0.88) type = "fast";
    queue.push(type);
  }
  if (waveNum % bossIntervalFor(waveNum) === 0) {
    const bossCount = bossCountFor(waveNum);
    for (let i = 0; i < bossCount; i++) queue.push(pickBossType(waveNum)); // arrive last, as the wave's finale
  }
  // Milestone super-bosses, on top of whatever regular bosses that wave already has.
  if (waveNum === 100 || waveNum === 140 || waveNum === 200) {
    queue.push("megaboss");
  }
  queue.push(...splitBossQueueFor(waveNum));
  return queue;
}

// The split-boss family (see ENEMY_TYPES.splitBoss20/60/80/100) is separate
// from the regular boss pool/cadence above - splitBoss20 is the common one,
// unlocked at wave 20 and appearing every wave after that (twice from wave
// 60 on, so it keeps scaling the difficulty rather than staying flat
// forever). The heavier tiers show up periodically once their own wave
// threshold is reached, each dumping its whole splitInto cascade when killed.
function splitBossQueueFor(waveNum) {
  const queue = [];
  if (waveNum >= 20) {
    const count = waveNum >= 60 ? 2 : 1;
    for (let i = 0; i < count; i++) queue.push("splitBoss20");
  }
  if (waveNum >= 60 && waveNum % 10 === 0) queue.push("splitBoss60");
  if (waveNum >= 80 && waveNum % 20 === 0) queue.push("splitBoss80");
  if (waveNum >= 100 && (waveNum - 100) % 40 === 0) queue.push("splitBoss100");
  return queue;
}

// Which boss variety to spawn - camo+fast and slow+huge-hp bosses join the
// pool at their own wave thresholds instead of being available from wave 5.
function pickBossType(waveNum) {
  const pool = ["boss"];
  if (waveNum >= 40) pool.push("bossCamo");
  if (waveNum >= 60) pool.push("bossTank");
  return pool[Math.floor(Math.random() * pool.length)];
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

const BOSS_TYPES = new Set([
  "boss", "bossCamo", "bossTank", "megaboss",
  "splitBoss20", "splitBoss60", "splitBoss80", "splitBoss100",
]);

// Bosses get an extra hp multiplier on top of the shared formula below -
// a much bigger jump starting wave 90, and megaboss (the wave 100/140/200
// milestone spawn) is bigger again on top of that.
function bossHpMultiplier(type, waveNum) {
  let mult = 1;
  if (waveNum >= 90) mult *= 2;
  if (type === "megaboss") mult *= 4;
  return mult;
}

// Previously only bosses scaled with wave - every other enemy stayed at its
// wave-1 hp forever, so a snowballing tower build made mid-to-late waves
// trivial once it outgrew that fixed baseline. Scale everyone now. A flat
// linear rate still can't keep up with a compounding tower economy forever,
// so waves past 50 get extra compounding growth on top - tuned so builds
// strong enough to reach wave 90+ still meet real resistance instead of
// one-shotting everything before it's visible on screen.
function computeEnemyStats(type) {
  const def = ENEMY_TYPES[type];
  const isBossType = BOSS_TYPES.has(type);
  const diff = DIFFICULTY_SETTINGS[state.difficulty] || DIFFICULTY_SETTINGS.normal;
  const lateWaves = Math.max(0, state.wave - 50);
  let hp = Math.round(def.hp * (1 + state.wave * 0.18) * Math.pow(1.11, lateWaves) * diff.hpMult);
  if (isBossType) hp = Math.round(hp * bossHpMultiplier(type, state.wave));
  const reward = Math.round((def.reward + state.wave * (isBossType ? 4 : 1)) * diff.rewardMult);
  // Every enemy gets a little faster each wave, on top of any type-specific
  // base speed (bossTank stays slow, bossCamo stays fast, relative to each other).
  const speed = def.speed * (1 + state.wave * 0.004) * diff.speedMult;
  const maxShield = def.shieldFrac ? Math.round(hp * def.shieldFrac) : 0;
  return { def, isBossType, hp, reward, speed, maxShield };
}

function spawnEnemy(type) {
  const { def, isBossType, hp, reward, speed, maxShield } = computeEnemyStats(type);
  state.enemies.push({
    type,
    x: PATH_POINTS[0].x,
    y: PATH_POINTS[0].y,
    hp,
    maxHp: hp,
    speed,
    reward,
    lifeDamage: def.lifeDamage,
    color: def.color,
    radius: def.radius,
    emoji: def.emoji,
    isBoss: isBossType,
    camo: !!def.camo,
    segment: 1,
    maxShield,
    shield: maxShield,
    shieldRegenTimer: 0,
  });
}

// A split-boss child (see ENEMY_TYPES.splitBoss60/80/100's splitInto) -
// spawned at the parent's death position/path segment instead of the path
// entrance, with hasSplit set so it can't chain into its own split again
// (this tier's split cascade is a one-time lump sum, not recursive).
function spawnSplitBoss(type, x, y, segment) {
  const { def, isBossType, hp, reward, speed, maxShield } = computeEnemyStats(type);
  state.enemies.push({
    type, x, y, hp, maxHp: hp, speed, reward,
    lifeDamage: def.lifeDamage,
    color: def.color,
    radius: def.radius,
    emoji: def.emoji,
    isBoss: isBossType,
    camo: !!def.camo,
    segment,
    maxShield,
    shield: maxShield,
    shieldRegenTimer: 0,
    hasSplit: true,
  });
}

// A splitsTo child (see ENEMY_TYPES' weakness chain, e.g. Glitch -> 2 Bugs)
// - spawned at the parent's death position/path segment instead of the
// path entrance. Unlike spawnSplitBoss, this does NOT set hasSplit: the
// chain is meant to keep cascading down through each weaker tier if those
// die too, and it's safe to leave ungated since the chain only ever points
// to a strictly weaker type and always terminates.
function spawnWeakerEnemy(type, x, y, segment) {
  const { def, isBossType, hp, reward, speed, maxShield } = computeEnemyStats(type);
  state.enemies.push({
    type, x, y, hp, maxHp: hp, speed, reward,
    lifeDamage: def.lifeDamage,
    color: def.color,
    radius: def.radius,
    emoji: def.emoji,
    isBoss: isBossType,
    camo: !!def.camo,
    segment,
    maxShield,
    shield: maxShield,
    shieldRegenTimer: 0,
  });
}

// ---------- Update loop ----------
function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// QA Testers passively heal any other enemy within range, as a % of that
// target's own max hp - scales naturally with wave-scaled hp instead of
// needing its own separate scaling curve.
function updateHealers(dt) {
  const def = ENEMY_TYPES.healer;
  for (const e of state.enemies) {
    if (e.type !== "healer") continue;
    for (const other of state.enemies) {
      if (other === e || other.hp <= 0) continue;
      if (distance(e.x, e.y, other.x, other.y) <= def.healRange) {
        other.hp = Math.min(other.maxHp, other.hp + other.maxHp * def.healPerSecPct * dt);
      }
    }
  }
}

// Shielded enemies regenerate their shield pool once shieldRegenTimer (reset
// on every hit, see applyDamage) counts down to 0.
function updateShields(dt) {
  for (const e of state.enemies) {
    if (!e.maxShield) continue;
    if (e.shieldRegenTimer > 0) {
      e.shieldRegenTimer -= dt;
      continue;
    }
    if (e.shield < e.maxShield) {
      const def = ENEMY_TYPES[e.type];
      e.shield = Math.min(e.maxShield, e.shield + e.maxShield * def.shieldRegenPerSec * dt);
    }
  }
}

function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.dotTimer > 0) {
      e.dotTimer -= dt;
      applyDamage(e, e.dotPerSec * dt, null);
      if (!state.enemies.includes(e)) continue; // the dot tick killed it
    }
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
  separateEnemies();
}

// Allows enemies to overlap up to 70% of their combined radii (packed
// crowds still read as a crowd) but no more - only pushes apart once they'd
// overlap beyond that. A full-separation version of this (0% overlap
// allowed) turned out to fight the path-following movement hard enough to
// gridlock dense clusters entirely (they'd get pushed backward exactly as
// fast as they walked forward). ENEMY_MAX_OVERLAP_PCT is that tolerance.
const ENEMY_MAX_OVERLAP_PCT = 0.7;
// How far off the path centerline the push above is allowed to drift an
// enemy before getting pulled back - keeps a crowded cluster visually on
// the road instead of spilling out into the surrounding terrain.
const ENEMY_MAX_PATH_OFFSET = PATH_VISUAL_WIDTH / 2;

// The enemy's current unit direction toward its next waypoint - used so
// separation can never shove it backward along the path (only sideways).
function enemyForwardDir(e) {
  const target = PATH_POINTS[e.segment];
  if (!target) return { x: 0, y: 0 };
  const dx = target.x - e.x, dy = target.y - e.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Applies a separation push to e, but strips out any component that points
// backward relative to e's own forward direction - crowding can shoulder an
// enemy sideways within the corridor, never stall or reverse it. Without
// this, a big enough crowd converging on a corner could push back on each
// other exactly as hard as they walk forward every frame, gridlocking in
// place indefinitely instead of just reading as a dense, still-moving jam.
function applyLateralPush(e, pushX, pushY) {
  const fwd = enemyForwardDir(e);
  const backwardAmount = pushX * fwd.x + pushY * fwd.y;
  if (backwardAmount < 0) {
    e.x += pushX - backwardAmount * fwd.x;
    e.y += pushY - backwardAmount * fwd.y;
  } else {
    e.x += pushX;
    e.y += pushY;
  }
}

// Pushes any two enemy circles overlapping more than ENEMY_MAX_OVERLAP_PCT
// apart (laterally only, see applyLateralPush), then clamps every enemy
// back onto the path corridor if that push (or a crowd of neighbors) shoved
// it too far off-line. Run every frame after movement.
function separateEnemies() {
  const list = state.enemies;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const minDist = (a.radius + b.radius) * (1 - ENEMY_MAX_OVERLAP_PCT);
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) {
        a.x -= 0.5; b.x += 0.5;
      } else if (dist < minDist) {
        const push = (minDist - dist) / 2;
        const ux = dx / dist, uy = dy / dist;
        applyLateralPush(a, -ux * push, -uy * push);
        applyLateralPush(b, ux * push, uy * push);
      }
    }
  }

  for (const e of list) {
    const onPath = closestPointOnPath(e.x, e.y);
    if (onPath.dist > ENEMY_MAX_PATH_OFFSET) {
      const t = ENEMY_MAX_PATH_OFFSET / onPath.dist;
      e.x = onPath.x + (e.x - onPath.x) * t;
      e.y = onPath.y + (e.y - onPath.y) * t;
    }
  }
}

// Returns up to `count` enemies within range, nearest first. Camo enemies
// are skipped entirely unless canSeeCamo is true for this attacker.
// targetPriority "strongest" (Sentry) picks highest-current-hp first instead
// of nearest-first - everyone else keeps the default nearest-first behavior.
// An enemy's center crossing into the canvas rectangle means at least half
// its circular sprite is already visible - used to keep brand-new spawns
// (still mostly off-canvas near the entrance) untargetable for a moment, so
// kills read as something the player actually watched happen instead of an
// enemy vanishing before it was ever really on screen.
function isEnemyHalfOnScreen(e) {
  return e.x >= 0 && e.x <= COLS * CELL && e.y >= 0 && e.y <= ROWS * CELL;
}

function findTargets(t, count, canSeeCamo, targetPriority) {
  const inRange = [];
  for (const e of state.enemies) {
    if (e.camo && !canSeeCamo) continue;
    if (!isEnemyHalfOnScreen(e)) continue;
    const d = distance(t.x, t.y, e.x, e.y);
    if (d <= t.range) inRange.push({ e, d });
  }
  if (targetPriority === "strongest") {
    inRange.sort((a, b) => b.e.hp - a.e.hp);
  } else {
    inRange.sort((a, b) => a.d - b.d);
  }
  return inRange.slice(0, count).map((entry) => entry.e);
}

function updateTowers(dt) {
  for (const t of state.towers) {
    if (t.isSupport || t.isEconomy || t.isRecruiter) continue; // don't attack
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;

    const buffs = getTowerBuffs(t);
    const targets = findTargets(t, t.multiShot || 1, buffs.supported || t.alwaysSeeCamo, t.targetPriority);
    if (targets.length > 0) {
      for (const target of targets) {
        // Quant's damage is a fraction of the target's own max hp (true
        // damage - resistances are bypassed entirely in applyDamage), so it
        // scales itself with the compounding late-wave hp growth instead of
        // falling behind it like a flat number would.
        const baseDmg = t.percentDamage ? target.maxHp * t.damage : t.damage;
        let dmg = baseDmg * buffs.damageMult;
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
          chainCount: t.chainCount || 0,
          chainFalloff: t.chainFalloff || 0.6,
          chainRange: t.chainRange || 90,
          color: t.color,
          sourceTower: t,
        });
      }
      t.cooldown = t.fireRate / buffs.rateMult;
    }
  }
}

// A lingering hit (the Quant tower's Recursive path) has no live sourceTower
// by the time it ticks, so it's always treated as magic damage - the only
// tower that ever sets a dot is Quant itself, so this is a safe default.
function applyDamage(enemy, amount, sourceTower) {
  const damageType = sourceTower ? sourceTower.damageType || "normal" : "magic";
  const resist = RESISTANCES[enemy.type]?.[damageType];
  if (resist) amount *= resist;

  if (sourceTower) {
    if (sourceTower.bossDamageMult && enemy.isBoss) amount *= sourceTower.bossDamageMult;
    else if (sourceTower.tankDamageMult && enemy.type === "tank") amount *= sourceTower.tankDamageMult;

    // Freeze's Shatter path - bonus damage vs already-slowed/frozen targets.
    // Checked against the enemy's state from BEFORE this hit's own
    // slowOnHit (below) can refresh it, so it only rewards a target that
    // was already chilled going in.
    if (sourceTower.shatterBonusPct && enemy.slowTimer > 0) amount *= 1 + sourceTower.shatterBonusPct;

    if (sourceTower.slowOnHit) {
      enemy.slowPct = sourceTower.slowOnHit.pct;
      enemy.slowTimer = sourceTower.slowOnHit.duration;
    }
    if (sourceTower.pathDotPct) {
      enemy.dotPerSec = enemy.maxHp * sourceTower.pathDotPct;
      enemy.dotTimer = sourceTower.pathDotDuration;
    }
  }

  // Shielded enemies eat damage from a separate regenerating pool first -
  // any overflow past the shield's current value spills into real hp.
  if (enemy.shield > 0) {
    enemy.shieldRegenTimer = ENEMY_TYPES[enemy.type].shieldRegenDelay;
    if (amount <= enemy.shield) {
      enemy.shield -= amount;
      amount = 0;
    } else {
      amount -= enemy.shield;
      enemy.shield = 0;
    }
  }

  // Brief white flash on any hit that doesn't kill - draw() reads this to
  // make shots feel like they're actually landing, not just numbers ticking.
  if (amount > 0) enemy.hitFlashUntil = performance.now() + 90;

  enemy.hp -= amount;
  if (sourceTower) sourceTower.totalDamageDealt = (sourceTower.totalDamageDealt || 0) + amount;
  if (enemy.hp <= 0) {
    const idx = state.enemies.indexOf(enemy);
    if (idx !== -1) {
      state.enemies.splice(idx, 1);
      spawnDeathBurst(enemy.x, enemy.y, enemy.color);
      playDeathSound(enemy.type);
      const goldEarned = enemy.reward * goldYieldMult();
      state.gold += goldEarned;
      spawnFloatingText(enemy.x, enemy.y - 16, `+${Math.round(goldEarned)}c`, "#ffd166");
      if (sourceTower?.bonusGoldPerKill) state.gold += sourceTower.bonusGoldPerKill;
      state.kills += 1;
      if (enemy.isBoss) {
        state.totalBossKills = (state.totalBossKills || 0) + 1;
        // Bigger enemies get a bigger, longer shake - see draw()/loop().
        triggerShake(Math.min(14, 4 + enemy.radius * 0.5), 220);
      }

      // splitsTo: turns into `count` of one specific weaker TYPE (e.g. a
      // Glitch dying becomes 2 Bugs) - see the chain documented above
      // ENEMY_TYPES. Deliberately doesn't set hasSplit, so the chain keeps
      // cascading down through each weaker tier in turn if those die too;
      // safe because the chain is strictly decreasing and always
      // terminates (Bug has no splitsTo), so it can't loop or run away.
      const dyingDef = ENEMY_TYPES[enemy.type];
      if (dyingDef?.splitsTo) {
        const { type, count } = dyingDef.splitsTo;
        for (let i = 0; i < count; i++) {
          spawnWeakerEnemy(
            type,
            enemy.x + (Math.random() - 0.5) * 16,
            enemy.y + (Math.random() - 0.5) * 16,
            enemy.segment,
          );
        }
      }

      // Split-boss family (and Ghost Process's own splitInto - see
      // ENEMY_TYPES.bossCamo): on death, dump the ENTIRE splitInto list at
      // once. hasSplit stops a split-boss-family child from chaining into
      // its own split again - unlike splitsTo above, this one is a single
      // lump sum, not a cascading chain.
      if (dyingDef?.splitInto && !enemy.hasSplit) {
        dyingDef.splitInto.forEach(({ type, count }) => {
          for (let i = 0; i < count; i++) {
            spawnSplitBoss(
              type,
              enemy.x + (Math.random() - 0.5) * 40,
              enemy.y + (Math.random() - 0.5) * 40,
              enemy.segment,
            );
          }
        });
      }
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
      if (p.chainCount > 0) {
        resolveChainHit(p);
      } else if (p.splashRadius > 0) {
        const ix = p.target.x;
        const iy = p.target.y;
        spawnExplosion(ix, iy, p.splashRadius, p.color);
        [...state.enemies].forEach((e) => {
          if (distance(ix, iy, e.x, e.y) <= p.splashRadius) {
            applyDamage(e, p.damage, p.sourceTower);
          }
        });
        if (p.isCrit) spawnFloatingText(ix, iy - 20, "CRIT!", "#ffee58");
      } else {
        applyDamage(p.target, p.damage, p.sourceTower);
        if (p.isCrit) spawnFloatingText(p.target.x, p.target.y - 20, "CRIT!", "#ffee58");
      }
      state.projectiles.splice(i, 1);
    } else {
      p.x += ((p.target.x - p.x) / d) * step;
      p.y += ((p.target.y - p.y) / d) * step;
    }
  }
  separateProjectiles();
}

// Keeps every in-flight projectile visible - pushes any two drawn closer
// than PROJECTILE_MIN_SEPARATION apart along the line between them, same
// approach as separateEnemies. Matters most for high-multiShot towers
// (Shotgun, 10x Engineer's Full Stack) firing a dozen-plus pellets from the
// same point in the same frame, which would otherwise stack exactly on top
// of each other.
const PROJECTILE_MIN_SEPARATION = 6;
function separateProjectiles() {
  const list = state.projectiles;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) {
        a.x -= 0.5; b.x += 0.5;
      } else if (dist < PROJECTILE_MIN_SEPARATION) {
        const push = (PROJECTILE_MIN_SEPARATION - dist) / 2;
        const ux = dx / dist, uy = dy / dist;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
      }
    }
  }
}

// Tesla's chain lightning: hits the primary target, then bounces to the
// nearest not-yet-hit enemy within chainRange of the PREVIOUS hit (not the
// tower), each bounce weaker by chainFalloff. Stops early if nothing else is
// in range - chainCount is a cap, not a guarantee.
function resolveChainHit(p) {
  let dmg = p.damage;
  const hit = new Set([p.target]);
  applyDamage(p.target, dmg, p.sourceTower);
  if (p.isCrit) spawnFloatingText(p.target.x, p.target.y - 20, "CRIT!", "#ffee58");
  let prevX = p.target.x;
  let prevY = p.target.y;
  for (let i = 0; i < p.chainCount; i++) {
    dmg *= p.chainFalloff;
    let next = null;
    let bestDist = Infinity;
    for (const e of state.enemies) {
      if (hit.has(e) || !isEnemyHalfOnScreen(e)) continue;
      const d = distance(prevX, prevY, e.x, e.y);
      if (d <= p.chainRange && d < bestDist) {
        bestDist = d;
        next = e;
      }
    }
    if (!next) break;
    hit.add(next);
    spawnChainBolt(prevX, prevY, next.x, next.y, p.color);
    applyDamage(next, dmg, p.sourceTower);
    prevX = next.x;
    prevY = next.y;
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

// ---------- Death sound effects ----------
// Procedurally synthesized with the Web Audio API (no audio files to host
// or license) - each enemy type gets its own short blip, roughly high/quick
// for weak common enemies scaling down to long/deep booms for the biggest
// bosses. Created lazily on the first real user interaction, since browsers
// block audio playback until a genuine gesture happens.
let audioCtx = null;
function ensureAudioContext() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (Ctx) audioCtx = new Ctx();
}
document.addEventListener("pointerdown", ensureAudioContext, { once: true });
document.addEventListener("keydown", ensureAudioContext, { once: true });

function playBlip(freqStart, freqEnd, duration, waveType, volume) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = waveType;
  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// One entry per ENEMY_TYPES key - freqStart/freqEnd/duration/waveType/volume
// tuned per type so every death is audibly distinct, not just visually.
const DEATH_SOUNDS = {
  basic: { freqStart: 600, freqEnd: 300, duration: 0.12, waveType: "sine", volume: 0.12 },
  fast: { freqStart: 900, freqEnd: 200, duration: 0.08, waveType: "square", volume: 0.08 },
  tank: { freqStart: 150, freqEnd: 80, duration: 0.25, waveType: "triangle", volume: 0.16 },
  legacy: { freqStart: 250, freqEnd: 150, duration: 0.18, waveType: "sine", volume: 0.13 },
  firewalled: { freqStart: 300, freqEnd: 200, duration: 0.15, waveType: "square", volume: 0.12 },
  encrypted: { freqStart: 700, freqEnd: 500, duration: 0.15, waveType: "triangle", volume: 0.12 },
  obfuscated: { freqStart: 400, freqEnd: 250, duration: 0.2, waveType: "sine", volume: 0.08 },
  splitter: { freqStart: 500, freqEnd: 350, duration: 0.15, waveType: "sawtooth", volume: 0.12 },
  healer: { freqStart: 800, freqEnd: 600, duration: 0.2, waveType: "sine", volume: 0.12 },
  shielded: { freqStart: 1000, freqEnd: 700, duration: 0.1, waveType: "square", volume: 0.1 },
  boss: { freqStart: 200, freqEnd: 60, duration: 0.4, waveType: "sawtooth", volume: 0.2 },
  bossCamo: { freqStart: 500, freqEnd: 150, duration: 0.35, waveType: "sine", volume: 0.16 },
  bossTank: { freqStart: 120, freqEnd: 40, duration: 0.5, waveType: "sawtooth", volume: 0.22 },
  megaboss: { freqStart: 150, freqEnd: 30, duration: 0.7, waveType: "sawtooth", volume: 0.28 },
  splitBoss20: { freqStart: 250, freqEnd: 100, duration: 0.3, waveType: "square", volume: 0.16 },
  splitBoss60: { freqStart: 180, freqEnd: 70, duration: 0.4, waveType: "sawtooth", volume: 0.2 },
  splitBoss80: { freqStart: 150, freqEnd: 55, duration: 0.5, waveType: "sawtooth", volume: 0.22 },
  splitBoss100: { freqStart: 100, freqEnd: 30, duration: 0.8, waveType: "sawtooth", volume: 0.28 },
};

function playDeathSound(type) {
  const s = DEATH_SOUNDS[type];
  if (!s) return;
  playBlip(s.freqStart, s.freqEnd, s.duration, s.waveType, s.volume);
}

// ---------- Screen shake ----------
// A brief camera shake on satisfying big moments (boss kills) - draw()
// applies a small random translate while state.shakeUntil is in the future,
// decaying linearly to nothing. Uses Math.max so overlapping triggers
// (several bosses dying in the same frame) don't cut a bigger shake short.
function triggerShake(mag, durationMs) {
  state.shakeMag = Math.max(state.shakeMag, mag);
  state.shakeUntil = Math.max(state.shakeUntil, performance.now() + durationMs);
}

// ---------- Enemy death burst (visual only) ----------
// A handful of the enemy's own color flying outward and fading - fires for
// every kill regardless of what killed it, so it stays lightweight (no ring
// sprite, just small dots with drag) even when several enemies die at once.
function spawnDeathBurst(x, y, color) {
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 45 + Math.random() * 55;
    state.deathParticles.push({
      x, y, color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      duration: 0.35 + Math.random() * 0.15,
    });
  }
}

function updateDeathParticles(dt) {
  for (let i = state.deathParticles.length - 1; i >= 0; i--) {
    const p = state.deathParticles[i];
    p.age += dt;
    if (p.age >= p.duration) {
      state.deathParticles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.9;
    p.vy *= 0.9;
  }
}

// ---------- Floating combat text (visual only, e.g. "CRIT!") ----------
function spawnFloatingText(x, y, text, color) {
  state.floatingTexts.push({ x, y, text, color, age: 0, duration: 0.7 });
}

function updateFloatingTexts(dt) {
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const f = state.floatingTexts[i];
    f.age += dt;
    f.y -= 30 * dt;
    if (f.age >= f.duration) state.floatingTexts.splice(i, 1);
  }
}

// ---------- Chain lightning bolts (visual only - Tesla) ----------
function spawnChainBolt(x1, y1, x2, y2, color) {
  state.chainBolts.push({ x1, y1, x2, y2, color, age: 0, duration: 0.15 });
}

function updateChainBolts(dt) {
  for (let i = state.chainBolts.length - 1; i >= 0; i--) {
    const b = state.chainBolts[i];
    b.age += dt;
    if (b.age >= b.duration) state.chainBolts.splice(i, 1);
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
    // End-of-sprint bonus, on top of normal kill gold - grows linearly with
    // wave number so clearing a sprint stays worth doing at any point in a
    // run, not just early on.
    const bonus = Math.round(WAVE_BONUS_BASE + state.wave * WAVE_BONUS_PER_WAVE);
    state.gold += bonus;
    spawnFloatingText(COLS * CELL / 2, 50, `sprint bonus +${bonus}c`, "#ffd166");

    // Consultant's T10 (any of its 3 paths) covers some uptime back every
    // sprint - stacks across multiple T10 Consultants, capped at the same
    // max uptime you start a map with.
    const livesBack = state.towers.reduce((sum, t) => sum + (t.pathLivesPerRound || 0), 0);
    if (livesBack > 0 && state.lives < STARTING_LIVES) {
      state.lives = Math.min(STARTING_LIVES, state.lives + livesBack);
      spawnFloatingText(COLS * CELL / 2, 75, `+${livesBack} uptime`, "#39ff14");
    }

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

// A small red zigzag/static scribble trending up-left from (x, y), scaled to
// radius - marks a camo enemy that's inside the selected tower's range
// circle but that tower still can't see (see the call site in draw()).
function drawUnseenMark(x, y, radius) {
  const dirX = -0.7, dirY = -0.7;
  const perpX = -dirY, perpY = dirX;
  const len = radius * 3.2;
  const amp = radius * 0.55;
  const segs = 5;
  ctx.strokeStyle = "#ff3b3b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const bx = x + dirX * len * t;
    const by = y + dirY * len * t;
    const jag = amp * (i % 2 === 0 ? 1 : -1);
    ctx.lineTo(bx + perpX * jag, by + perpY * jag);
  }
  ctx.stroke();
}

// A proper jagged lightning bolt from (x1,y1) to (x2,y2) - several zigzag
// segments (not just one bent kink) plus a short forking branch partway
// along, like an actual lightning bolt rather than a bent stick.
function drawLightning(x1, y1, x2, y2, color, width) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const perpX = -uy, perpY = ux;
  const segs = 5;
  const amp = Math.max(4, len * 0.16);

  const points = [{ x: x1, y: y1 }];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const jag = (Math.random() - 0.5) * 2 * amp;
    points.push({ x: x1 + dx * t + perpX * jag, y: y1 + dy * t + perpY * jag });
  }
  points.push({ x: x2, y: y2 });

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // One short forking branch off a middle point, angled away from the main line.
  const forkFrom = points[1 + Math.floor(Math.random() * (points.length - 2))];
  const forkAngle = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);
  const forkLen = len * 0.25;
  ctx.lineWidth = width * 0.6;
  ctx.beginPath();
  ctx.moveTo(forkFrom.x, forkFrom.y);
  ctx.lineTo(forkFrom.x + Math.cos(forkAngle) * forkLen, forkFrom.y + Math.sin(forkAngle) * forkLen);
  ctx.stroke();
}

// Tesla's in-flight projectile: a short lightning bolt centered on (x, y)
// and oriented toward whatever it's currently flying at, length `len`.
function drawBolt(x, y, dx, dy, len, color) {
  const norm = Math.hypot(dx, dy) || 1;
  const ux = dx / norm, uy = dy / norm;
  drawLightning(x - ux * len * 0.5, y - uy * len * 0.5, x + ux * len * 0.5, y + uy * len * 0.5, color, 3);
}

// Ghost preview shared by both normal shop placement and pasted-tower
// placement (see the ctrl+c/ctrl+v feature) - draws the range indicator
// (a circle, or radiating ticks for a global-range tower) plus the body/
// emoji at the pointer, red instead of the tower's own color when invalid.
function drawPlacementGhost(px, py, { color, emoji, range, isGlobalRange, valid }) {
  const previewColor = valid ? color : "#ff4444";
  if (isGlobalRange) {
    ctx.strokeStyle = previewColor;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    const tickCount = 12;
    for (let i = 0; i < tickCount; i++) {
      const ang = (Math.PI * 2 * i) / tickCount;
      const inner = CELL * 0.55;
      const outer = CELL * 0.85;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(ang) * inner, py + Math.sin(ang) * inner);
      ctx.lineTo(px + Math.cos(ang) * outer, py + Math.sin(ang) * outer);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = previewColor;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(px, py, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = previewColor;
  ctx.globalAlpha = valid ? 0.5 : 0.35;
  ctx.beginPath();
  ctx.arc(px, py, TOWER_BODY_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.font = `${CELL * 0.48}px sans-serif`;
  ctx.fillText(emoji, px, py + 1);
  ctx.globalAlpha = 1;
}

// ---------- Rendering ----------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Screen shake: while active, everything below is drawn slightly offset,
  // decaying linearly back to zero - see triggerShake().
  const shakeRemaining = state.shakeUntil - performance.now();
  ctx.save();
  if (shakeRemaining > 0) {
    const power = state.shakeMag * (shakeRemaining / 220);
    ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
  } else {
    state.shakeMag = 0;
  }

  // Each map has its own ground/dirt/stone palette for a distinct look -
  // falls back to Main Branch's colors if the active map is somehow unknown.
  const mapTheme = MAP_DEFS[state.mapId] || MAP_DEFS.map1;

  ctx.fillStyle = mapTheme.groundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Soft irregular patches of the ground's accent shade, for a hand-painted
  // "cartoony" look instead of one flat color.
  for (let i = 0; i < 14; i++) {
    const px = ((i * 137) % COLS) * CELL + CELL / 2;
    const py = ((i * 71) % ROWS) * CELL + CELL / 2;
    const r = 60 + (i % 3) * 25;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, mapTheme.groundAccent);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Ground decor (see generateGrassDecor): speckles, grass tufts, tiny
  // flowers, and pebbles scattered over the buildable terrain.
  grassDecor.forEach((d) => {
    if (d.kind === "speckle") {
      ctx.fillStyle = d.light ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "tuft") {
      ctx.strokeStyle = "rgba(20,60,20,0.4)";
      ctx.lineWidth = 1.4;
      for (let k = -1; k <= 1; k++) {
        const a = d.angle + k * 0.4;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.quadraticCurveTo(
          d.x + Math.cos(a) * d.size * 0.6, d.y - d.size,
          d.x + Math.cos(a) * d.size, d.y - d.size * 1.6,
        );
        ctx.stroke();
      }
    } else if (d.kind === "flower") {
      ctx.fillStyle = d.color;
      for (let k = 0; k < 4; k++) {
        const a = (Math.PI / 2) * k;
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(a) * d.size, d.y + Math.sin(a) * d.size, d.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "pebble") {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.fillStyle = "rgba(120,110,95,0.55)";
      ctx.beginPath();
      ctx.ellipse(0, 0, d.r, d.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(-d.r * 0.25, -d.r * 0.2, d.r * 0.35, d.r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // path - a dirt base (fills the grout between stones) topped with
  // individually-shaded stone pavers, instead of a flat colored lane.
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = PATH_VISUAL_WIDTH + 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  PATH_POINTS.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  ctx.strokeStyle = mapTheme.dirtColor;
  ctx.lineWidth = PATH_VISUAL_WIDTH;
  ctx.beginPath();
  PATH_POINTS.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  pathStones.forEach((s) => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillStyle = mapTheme.stoneColors[s.shadeIdx];
    ctx.beginPath();
    ctx.roundRect(-s.w / 2, -s.h / 2, s.w, s.h, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.roundRect(-s.w / 2 + 2, -s.h / 2 + 2, Math.max(0, s.w - 4), Math.max(0, s.h * 0.3), 3);
    ctx.fill();
    ctx.restore();
  });

  // obstacles/walls - rendered as clustered blobs (rocks for "wall", bushes
  // for "obstacle") instead of flat rectangles, using the shapes cached by
  // prepareObstacleVisuals so they don't reshuffle every frame. Static,
  // block tower placement only (see canPlaceTowerAt) - towers still
  // target/hit straight through them.
  mapObstacles.forEach((o) => {
    if (o.kind === "wall") {
      o.blobs.forEach((b) => {
        const bx = o.cx + b.dx, by = o.cy + b.dy;
        const grad = ctx.createRadialGradient(bx - b.r * 0.35, by - b.r * 0.35, b.r * 0.1, bx, by, b.r);
        grad.addColorStop(0, "#9ca3af");
        grad.addColorStop(1, "#4b5563");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    } else {
      o.blobs.forEach((b) => {
        const bx = o.cx + b.dx, by = o.cy + b.dy;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
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
      // A global-range tower's range circle would be thousands of pixels
      // wide (effectively just a straight line across the canvas) - show a
      // few short radiating ticks around it instead of a circle that huge.
      if (TOWER_TYPES[t.type].isGlobalRange) {
        ctx.strokeStyle = t.color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        const tickCount = 12;
        for (let i = 0; i < tickCount; i++) {
          const ang = (Math.PI * 2 * i) / tickCount;
          const inner = CELL * 0.55;
          const outer = CELL * 0.85;
          ctx.beginPath();
          ctx.moveTo(t.x + Math.cos(ang) * inner, t.y + Math.sin(ang) * inner);
          ctx.lineTo(t.x + Math.cos(ang) * outer, t.y + Math.sin(ang) * outer);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = t.color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, TOWER_BODY_RADIUS + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Once a path is chosen, its accent color takes over the tower's main
    // body (fill + outline), not just a thin outer ring - a spinning ring
    // alone was too subtle to notice at a glance.
    const pathColor = t.path ? TOWER_PATHS[t.type]?.[t.path]?.accentColor : null;
    const bodyColor = pathColor || t.color;

    // Pop-in: freshly placed towers scale up from small over ~200ms instead
    // of just appearing, for a bit more satisfying "placement" feel.
    const spawnP = t.placedAt ? Math.min(1, (performance.now() - t.placedAt) / 200) : 1;
    const bodyRadius = TOWER_BODY_RADIUS * (0.35 + 0.65 * spawnP);

    ctx.fillStyle = bodyColor;
    ctx.globalAlpha = pathColor ? 0.4 : 0.25;
    ctx.beginPath();
    ctx.arc(t.x, t.y, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = pathColor ? 3 : 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, bodyRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${CELL * 0.48 * (0.35 + 0.65 * spawnP)}px sans-serif`;
    ctx.fillText(t.emoji, t.x, t.y + 1);

    // visual evolution: a growing, more elaborate ring per upgrade milestone
    const stage = t.visualStage || 0;
    if (stage >= 1) {
      ctx.strokeStyle = "#cfd8dc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, TOWER_BODY_RADIUS + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (stage >= 2) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, TOWER_BODY_RADIUS + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (stage >= 3 && pathColor) {
      const spin = (performance.now() / 40) % 24;
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = -spin;
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, TOWER_BODY_RADIUS + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // A static solid badge (doesn't rely on noticing the spinning ring) so
      // the path reads clearly even from a glance or a screenshot.
      const badgeX = t.x + CELL * 0.3;
      const badgeY = t.y - CELL * 0.3;
      ctx.fillStyle = pathColor;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // brief flash pulse right after placing/upgrading/leveling up. flashUntil
    // is a performance.now()-based timestamp, which is meaningless across a
    // page reload (it resets to ~0 each session) - a stale value loaded from
    // a previous session could otherwise make `p` go deeply negative, which
    // sends ctx.arc() a negative radius and throws, silently freezing the
    // whole render loop for the rest of the session. Clamped here as a
    // guardrail regardless of cause; stale values are also cleared on load
    // (see applyMapDataToState) so this branch shouldn't normally even trigger.
    if (t.flashUntil && t.flashUntil > performance.now()) {
      const remaining = t.flashUntil - performance.now();
      const p = Math.min(1, Math.max(0, 1 - remaining / 400));
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, TOWER_BODY_RADIUS - 3 + p * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ghost preview: follows the pointer/finger while a tower type is selected,
  // or while a copied tower is armed to paste (see the ctrl+c/ctrl+v
  // feature) - free placement, so it renders right at the pointer instead
  // of snapping to a cell center.
  if ((state.selectedTowerType || pasteArmed) && previewPos) {
    const { x: px, y: py } = previewPos;
    if (px >= 0 && px <= COLS * CELL && py >= 0 && py <= ROWS * CELL) {
      if (pasteArmed && towerClipboard) {
        const bp = towerClipboard.blueprint;
        const def = TOWER_TYPES[bp.type];
        const valid =
          canPlaceTowerAt(px, py) &&
          state.gold >= towerClipboard.cost &&
          !(def.unique && countPlacedOfType(bp.type) >= tenxMaxCopies());
        drawPlacementGhost(px, py, { color: bp.color, emoji: bp.emoji, range: bp.range, isGlobalRange: def.isGlobalRange, valid });
      } else if (state.selectedTowerType) {
        const def = TOWER_TYPES[state.selectedTowerType];
        const valid =
          canPlaceTowerAt(px, py) &&
          state.gold >= def.cost &&
          !(def.unique && countPlacedOfType(state.selectedTowerType) >= tenxMaxCopies());
        drawPlacementGhost(px, py, { color: def.color, emoji: def.emoji, range: def.range, isGlobalRange: def.isGlobalRange, valid });
      }
    }
  }

  // Whether the currently-selected tower can see camo enemies right now
  // (same rule findTargets uses) - computed once so the enemy loop below
  // can mark any camo enemy sitting inside that tower's range but still
  // invisible to it, instead of the player wondering why it isn't firing.
  let selectedCanSeeCamo = false;
  const selT = state.selectedTower;
  const selAttacks = selT && !selT.isSupport && !selT.isEconomy && !selT.isRecruiter;
  if (selAttacks) {
    const buffs = getTowerBuffs(selT);
    selectedCanSeeCamo = buffs.supported || selT.alwaysSeeCamo;
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

    // Camo enemies stay visible (dashed ring + a bit more transparent) but
    // are untargetable without an actively-supporting Manager nearby.
    if (e.camo) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Extra red "no signal" scribble specifically when this camo enemy is
      // sitting inside the SELECTED tower's range circle but that tower
      // still can't see it - the dashed ring alone doesn't explain why a
      // tower with an enemy visibly in range isn't firing at it.
      if (selAttacks && !selectedCanSeeCamo && distance(selT.x, selT.y, e.x, e.y) <= selT.range) {
        drawUnseenMark(e.x, e.y, e.radius);
      }
    }

    ctx.fillStyle = e.color;
    ctx.globalAlpha = e.camo ? 0.18 : 0.3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = e.camo ? 0.7 : 1;
    ctx.font = `${e.radius * 1.6}px sans-serif`;
    ctx.fillText(e.emoji, e.x, e.y + 1);
    ctx.globalAlpha = 1;

    // Brief white flash on a hit that didn't kill - see applyDamage.
    if (e.hitFlashUntil && e.hitFlashUntil > performance.now()) {
      const flashT = (e.hitFlashUntil - performance.now()) / 90;
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.55 * flashT;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const barW = e.radius * 2;
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = "#000";
    ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW, 4);
    ctx.fillStyle = "#39ff14";
    ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW * pct, 4);

    if (e.maxShield > 0) {
      const shieldPct = Math.max(0, e.shield / e.maxShield);
      ctx.fillStyle = "#000";
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 15, barW, 3);
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 15, barW * shieldPct, 3);
    }
  }

  // allies (temporary units deployed by Recruiter towers) - fade out
  // just before they expire so their disappearance doesn't feel abrupt
  for (const a of state.allies) {
    const remaining = a.expiresAt - performance.now();
    const fade = Math.max(0, Math.min(1, remaining / 800));
    ctx.globalAlpha = 0.4 + 0.6 * fade;
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(a.x, a.y, CELL * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `${CELL * 0.26}px sans-serif`;
    ctx.fillText(a.emoji, a.x, a.y + 1);
    ctx.globalAlpha = 1;
  }

  // projectiles - Tesla fires a small jagged bolt instead of a round dot,
  // oriented toward whatever it's currently flying at.
  for (const p of state.projectiles) {
    if (p.sourceTower?.type === "tesla") {
      drawBolt(p.x, p.y, p.target.x - p.x, p.target.y - p.y, 24, p.color);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // enemy death burst - a few fragments flying outward and shrinking/fading
  for (const p of state.deathParticles) {
    const t = p.age / p.duration;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0, 3 * (1 - t)), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // floating combat text (e.g. "CRIT!") - drifts up and fades out
  for (const f of state.floatingTexts) {
    const t = f.age / f.duration;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = f.color;
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  // chain lightning bolts (Tesla) - a quick jagged flash between hits
  for (const b of state.chainBolts) {
    const t = b.age / b.duration;
    ctx.globalAlpha = 1 - t;
    drawLightning(b.x1, b.y1, b.x2, b.y2, b.color, 4);
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // matches the shake-offset ctx.save() at the top
}

// ---------- Main loop ----------
let lastTime = performance.now();
function loop(now) {
  // Wrapped in try/catch so one bad frame (e.g. a transient bug right at the
  // moment of switching maps) can never permanently freeze the game - an
  // uncaught throw here would stop requestAnimationFrame from ever
  // rescheduling itself, leaving the canvas stuck on its last good frame
  // until the page is reloaded. Logged so it's still visible in devtools.
  try {
    const rawDt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const dt = rawDt * state.gameSpeed;

    if (!state.gameOver && !state.paused) {
      updateSpawning(dt);
      updateEnemies(dt);
      updateHealers(dt);
      updateShields(dt);
      updateTowers(dt);
      updateSentries(dt);
      updateRecruiters(dt);
      updateAllies(dt);
      updateEconomy(dt);
      updateAuras(dt);
      updateProjectiles(dt);
      updateExplosions(dt);
      updateDeathParticles(dt);
      updateFloatingTexts(dt);
      updateChainBolts(dt);
      updateOverclock(dt);
      updateFundraiser(dt);
      updateStats();
    }
    draw();
  } catch (err) {
    console.error("Frame error (recovered):", err);
  }
  requestAnimationFrame(loop);
}

// ---------- Restart ----------
// Shared by "restart after a loss" (resetGame) and "logged out" - the two
// differ only in whether bestWave/ownerId (tied to account identity) reset.
function resetTransientState() {
  state.gold = STARTING_GOLD;
  state.lives = STARTING_LIVES;
  state.wave = 0;
  state.kills = 0;
  state.medals = { easy: false, normal: false, hard: false };
  state.selectedTowerType = null;
  state.selectedTower = null;
  state.towers = [];
  state.enemies = [];
  state.projectiles = [];
  state.explosions = [];
  state.floatingTexts = [];
  state.chainBolts = [];
  state.deathParticles = [];
  state.shakeUntil = 0;
  state.shakeMag = 0;
  state.allies = [];
  state.waveInProgress = false;
  state.spawnQueue = [];
  state.spawnTimer = 0;
  state.gameOver = false;
  state.paused = false;
  state.gameSpeed = 1;
  state.overclockActive = false;
  state.overclockTimer = 0;
  state.overclockCooldown = 0;
  state.fundraiserActive = false;
  state.fundraiserTimer = 0;
  state.fundraiserCooldown = 0;
  state.airstrikeCooldown = 0;
  state.autoRun = false;
  state.autoRunTimer = 0;
  gameOverOverlay.classList.remove("visible");
  pauseOverlay.hidden = true;
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
renderMapPicker();
mapPickerOverlay.hidden = false;
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

// ---- cheat box (bottom-left corner) ----
// Type "MONEY123 <amount>" and press Enter to set credits directly.
const cheatBox = document.getElementById("cheatBox");
if (cheatBox) {
  cheatBox.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const match = cheatBox.value.trim().match(/^MONEY123\s+(-?[\d.]+)$/i);
    if (match) {
      state.gold = Math.max(0, Number(match[1]));
      updateStats();
      saveGame();
    }
    cheatBox.value = "";
    cheatBox.blur();
  });
}
