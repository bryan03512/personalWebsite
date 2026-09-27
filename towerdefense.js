// ---------- Grid / path setup ----------
const CELL = 60;
const COLS = 13;
const ROWS = 10;

function cellCenter([col, row]) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

// Three maps, each just a different path shape on the same grid - same
// towers, enemies, and rules everywhere. map1's waypoints are the original
// (only) layout, unchanged, so every existing save keeps working exactly as
// before, now labeled "Main Branch".
const MAP_DEFS = {
  map1: {
    name: "Main Branch",
    waypoints: [
      [-1, 1], [3, 1], [3, 8], [6, 8], [6, 1], [9, 1], [9, 8], [13, 8],
    ],
  },
  map2: {
    name: "CI Pipeline",
    waypoints: [
      [-1, 1], [11, 1], [11, 3], [1, 3], [1, 5], [11, 5], [11, 7], [1, 7], [1, 9], [13, 9],
    ],
  },
  map3: {
    name: "The Monolith",
    waypoints: [
      [-1, 4], [4, 4], [4, 0], [8, 0], [8, 6], [2, 6], [2, 9], [12, 9], [12, 2], [13, 2],
    ],
  },
};

// Waypoints in grid coordinates (col, row). First/last are off-canvas so
// enemies spawn/exit smoothly at the edges. Reassigned by applyMapLayout()
// whenever the active map changes - every reference elsewhere in the file
// reads these bindings live, so no other code needs to change.
let GRID_WAYPOINTS = MAP_DEFS.map1.waypoints;
let PATH_POINTS = GRID_WAYPOINTS.map(cellCenter);
let pathCells = new Set();

function applyMapLayout(mapId) {
  GRID_WAYPOINTS = MAP_DEFS[mapId].waypoints;
  PATH_POINTS = GRID_WAYPOINTS.map(cellCenter);
  pathCells = new Set();
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
    damageType: "explosive",
  },
  manager: {
    name: "Manager", desc: "no damage - boosts nearby devs", emoji: "👔",
    cost: 120, damage: 0, range: 130, fireRate: Infinity, color: "#ffd166", projectileSpeed: 0,
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
    cost: 220, damage: 0.018, range: 140, fireRate: 1.8, color: "#a78bfa", projectileSpeed: 550,
    damageType: "magic", percentDamage: true,
  },
  // Secret capstone tower - excluded from buildTowerButtons (and therefore
  // invisible/unknown) until state.bestWave clears TOWER100_UNLOCK_WAVE on
  // the current map. How many may be placed at once is capped and grows
  // with further milestones - see tenxMaxCopies().
  tenx: {
    name: "10x Engineer", desc: "legendary - unlocked past sprint 100, capped copies grow past 140/200", emoji: "🦸",
    cost: 4000, damage: 140, range: 220, fireRate: 0.55, color: "#fbbf24", projectileSpeed: 900,
    isLegendary: true, unique: true,
  },
};

const TOWER100_UNLOCK_WAVE = 100;

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
// Every tower's paths run 5 tiers deep; 10x Engineer's run 10. A tower with
// fewer tiers than an index simply has pathDef.tiers[i] === undefined there,
// and buyPathTier's "already maxed" check stops it exactly as before.
const PATH_TIER_LEVELS = [3, 6, 10, 14, 18, 23, 28, 34, 40, 47];

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
          desc: "top speed - hits 3 targets, massive crits", cost: 750,
          apply: (t) => { t.pathRateMult = 4.8; t.critChance = 0.4; t.critMult = 2.8; t.multiShot = 3; },
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
          desc: "fires at 6 enemies at once, huge bonus gold", cost: 750,
          apply: (t) => { t.multiShot = 6; t.pathRangeMult = 1.5; t.bonusGoldPerKill = 3; },
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
        {
          desc: "even more range/damage, bigger dmg vs bosses", cost: 765,
          apply: (t) => { t.pathDamageMult = 4.2; t.pathRangeMult = 2.4; t.pathRateMult = 0.7; t.critChance = 0.35; t.critMult = 3.5; t.bossDamageMult = 2.0; },
        },
        {
          desc: "sees the whole board - devastating vs everything", cost: 1300,
          apply: (t) => { t.pathDamageMult = 5.5; t.pathRangeMult = 2.8; t.pathRateMult = 0.7; t.critChance = 0.4; t.critMult = 4.0; t.bossDamageMult = 2.6; t.tankDamageMult = 1.8; },
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
          desc: "everything crawls in range, extra dmg vs bosses too", cost: 1300,
          apply: (t) => { t.slowOnHit = { pct: 0.9, duration: 6 }; t.auraSlowPct = 0.4; t.tankDamageMult = 2.4; t.bossDamageMult = 1.3; },
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
          desc: "a blast that blankets the whole lane", cost: 1400,
          apply: (t) => { t.pathSplashMult = 4.2; t.pathDamageMult = 2.2; t.bonusGoldPerKill = 4; },
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
          desc: "a zero-day for every system - nothing resists this", cost: 1400,
          apply: (t) => { t.bossDamageMult = 6.0; t.tankDamageMult = 4.0; t.critChance = 0.4; t.critMult = 3.5; t.pathDamageMult = 1.7; },
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
          desc: "the whole team fires at superhuman speed", cost: 1090,
          apply: (t) => { t.pathBuffRateMult = 5.6; t.pathBuffDamageMult = 0.9; t.pathRangeMult = 1.8; },
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
          desc: "the whole team hits like a wrecking crew", cost: 1090,
          apply: (t) => { t.pathBuffDamageMult = 5.6; t.pathBuffRateMult = 0.9; t.pathRangeMult = 1.8; },
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
          desc: "acquired - staggering credits/sec, the team retires early", cost: 1000,
          apply: (t) => { t.pathIncomeMult = 8.5; state.gold += 800; },
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
          desc: "towers/upgrades cost 30% less, IPO windfall", cost: 1000,
          apply: (t) => { t.costDiscountPct = 0.30; state.gold += 600; },
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
          desc: "deploys a full squad of 6 elite warriors", cost: 1090,
          apply: (t) => { t.pathAllyCountBonus = 5; t.pathAllyDurationMult = 3.0; t.pathAllyDamageMult = 3.0; },
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
          desc: "constant deploys - the path is never empty", cost: 1090,
          apply: (t) => { t.pathDeployRateMult = 4.8; t.pathAllyBonusGold = 4; t.pathAllyExplosive = true; },
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
          desc: "overflows every buffer - massive % true damage", cost: 1400,
          apply: (t) => { t.pathDamageMult = 6.0; t.critChance = 0.42; t.critMult = 3.6; t.bossDamageMult = 2.8; },
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
          desc: "a recursive exploit with no base case - hits 4 targets", cost: 1400,
          apply: (t) => { t.pathDotPct = 0.065; t.pathDotDuration = 7; t.multiShot = 4; },
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
  },
};

const ENEMY_TYPES = {
  basic: { label: "Bug", emoji: "🐛", hp: 50, speed: 60, reward: 5, lifeDamage: 1, color: "#e05353", radius: 14 },
  fast: { label: "Glitch", emoji: "⚡", hp: 25, speed: 130, reward: 5, lifeDamage: 1, color: "#ffee58", radius: 12 },
  tank: { label: "Merge Conflict", emoji: "💀", hp: 160, speed: 35, reward: 12, lifeDamage: 2, color: "#8a4a2b", radius: 17 },
  boss: { label: "Production Outage", emoji: "🔥", hp: 400, speed: 30, reward: 60, lifeDamage: 5, color: "#ff3b3b", radius: 24 },
  bossCamo: { label: "Ghost Process", emoji: "👻", hp: 350, speed: 70, reward: 70, lifeDamage: 5, color: "#7c3aed", radius: 23, camo: true },
  bossTank: { label: "Cascading Failure", emoji: "🌋", hp: 900, speed: 16, reward: 90, lifeDamage: 8, color: "#7f1d1d", radius: 27 },
  megaboss: { label: "Total System Failure", emoji: "☠️", hp: 3000, speed: 26, reward: 250, lifeDamage: 10, color: "#000000", radius: 32 },
  // Late-wave specialists, each resistant to one damage type (see
  // RESISTANCES) so no single tower archetype trivializes everything.
  legacy: { label: "Legacy Code", emoji: "💾", hp: 90, speed: 45, reward: 10, lifeDamage: 2, color: "#a1887f", radius: 15 },
  firewalled: { label: "Firewalled", emoji: "🧱", hp: 70, speed: 55, reward: 10, lifeDamage: 1, color: "#5b7fd6", radius: 15 },
  encrypted: { label: "Encrypted", emoji: "🔒", hp: 60, speed: 50, reward: 14, lifeDamage: 2, color: "#a855f7", radius: 15 },
  // Untargetable by any tower unless that tower is currently in an active
  // Manager's buff range (see getTowerBuffs/findTargets) - still visible so
  // the player can see them coming, just can't be shot without support.
  obfuscated: { label: "Obfuscated", emoji: "🌫️", hp: 55, speed: 65, reward: 12, lifeDamage: 1, color: "#94a3b8", radius: 14, camo: true },
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
const changeMapBtn = document.getElementById("changeMapBtn");
const mapPickerOverlay = document.getElementById("mapPickerOverlay");
const mapPickerList = document.getElementById("mapPickerList");
const pauseBtn = document.getElementById("pauseBtn");
const pauseOverlay = document.getElementById("pauseOverlay");
const resumeBtn = document.getElementById("resumeBtn");
const pauseChangeMapBtn = document.getElementById("pauseChangeMapBtn");
const pauseRestartBtn = document.getElementById("pauseRestartBtn");

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
    // The 10x Engineer stays fully hidden (not just disabled) until beaten
    // on this map, so its existence is a surprise.
    if (def.isLegendary) {
      // bestWave reaches 100 the moment sprint 100 STARTS, not once it's
      // beaten - require > 100 (i.e. sprint 101 was reached) so it only
      // unlocks after sprint 100 is actually survived.
      btn.hidden = state.bestWave <= TOWER100_UNLOCK_WAVE;
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
//
// Each of the 3 maps keeps its own independent gold/towers/wave/etc, nested
// under maps.<mapId>. The stored blob also carries a top-level bestWave and
// bestGold that mirror the MAX across all 3 maps - the public leaderboard
// reads those two keys directly from this same JSON, so keeping them at the
// top level means the leaderboard needs zero schema/query changes to show
// "your best across any map".
const TD_SAVE_KEY = "towerDefenseSave";

function currentMapSlot() {
  return {
    gold: state.gold,
    bestGold: state.bestGold,
    lives: state.lives,
    wave: state.wave,
    bestWave: state.bestWave,
    kills: state.kills,
    towers: state.towers,
  };
}

// Accepts either the new nested shape or an old flat single-map save (from
// before maps existed) and always returns the nested shape - an old save's
// data becomes map1's data, so nothing already played is lost.
function normalizePayload(parsed) {
  if (!parsed) return { activeMap: "map1", maps: {} };
  if (parsed.maps && typeof parsed.maps === "object") {
    return {
      activeMap: MAP_DEFS[parsed.activeMap] ? parsed.activeMap : "map1",
      maps: parsed.maps,
      gameSpeed: parsed.gameSpeed,
      lastSaveTime: parsed.lastSaveTime,
      ownerId: parsed.ownerId,
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
  };
}

function readStoredPayload() {
  const raw = localStorage.getItem(TD_SAVE_KEY);
  if (!raw) return { activeMap: "map1", maps: {} };
  try {
    return normalizePayload(JSON.parse(raw));
  } catch {
    return { activeMap: "map1", maps: {} };
  }
}

// Applies one map's saved slot onto the live (currently active) state -
// used both on ordinary load and after switching maps.
function applyMapDataToState(mapData) {
  if (!mapData) return;
  if (typeof mapData.gold === "number") state.gold = mapData.gold;
  if (typeof mapData.lives === "number") state.lives = mapData.lives;
  if (typeof mapData.wave === "number") state.wave = mapData.wave;
  if (typeof mapData.bestWave === "number") state.bestWave = mapData.bestWave;
  if (typeof mapData.kills === "number") state.kills = mapData.kills;
  if (typeof mapData.bestGold === "number") state.bestGold = mapData.bestGold;
  // Guard against a stale/incomplete snapshot (e.g. a cloud push that lost a
  // race with navigating away mid-round) silently deleting placed towers -
  // never adopt an incoming towers list that's smaller than what's already here.
  if (Array.isArray(mapData.towers) && mapData.towers.length >= state.towers.length) {
    // flashUntil is a performance.now() timestamp from whatever session saved
    // this - meaningless (and potentially crash-inducing, see draw()) now.
    // recomputeTowerStats refreshes any derived field the game code has
    // added since this was last saved (e.g. allySpeed didn't exist before
    // the Recruiter rework) - without this, a tower saved under older code
    // keeps missing fields forever, which silently breaks as NaN math
    // rather than an obvious error.
    state.towers = mapData.towers.map((t) => ({ ...t, flashUntil: 0 }));
    state.towers.forEach(recomputeTowerStats);
  }
}

function saveGame() {
  state.lastSaveTime = Date.now();
  const stored = readStoredPayload();
  stored.maps[state.mapId] = currentMapSlot();
  stored.activeMap = state.mapId;
  stored.gameSpeed = state.gameSpeed;
  stored.lastSaveTime = state.lastSaveTime;
  stored.ownerId = state.ownerId;
  const allMaps = Object.values(stored.maps);
  stored.bestWave = Math.max(0, ...allMaps.map((m) => m.bestWave || 0));
  stored.bestGold = Math.max(0, ...allMaps.map((m) => m.bestGold || 0));
  localStorage.setItem(TD_SAVE_KEY, JSON.stringify(stored));
  scheduleCloudSync();
}

function loadGame() {
  const stored = readStoredPayload();
  state.mapId = MAP_DEFS[stored.activeMap] ? stored.activeMap : "map1";
  applyMapLayout(state.mapId);
  state.gameSpeed = SPEED_STEPS.includes(stored.gameSpeed) ? stored.gameSpeed : 1;
  state.lastSaveTime = stored.lastSaveTime || Date.now();
  state.ownerId = typeof stored.ownerId === "string" ? stored.ownerId : null;
  applyMapDataToState(stored.maps[state.mapId]);
}

// Switches the active map: saves the map being left, then loads (or starts
// fresh on) the target map. Always saves first even when re-selecting the
// current map, so the picker never discards up-to-3-seconds of unsaved
// progress by reading a stale snapshot.
function switchMap(newMapId) {
  if (!MAP_DEFS[newMapId]) return;
  saveGame();
  const stored = readStoredPayload();
  const preservedGameSpeed = state.gameSpeed; // gameSpeed is a global preference, not per-map
  state.mapId = newMapId;
  applyMapLayout(newMapId);
  resetTransientState();
  state.gameSpeed = preservedGameSpeed;
  syncSpeedButton();
  state.bestWave = 0;
  state.bestGold = 150;
  applyMapDataToState(stored.maps[newMapId]);
  updateStats();
  saveGame();
}

// ---------- Map picker ----------
function renderMapPicker() {
  const stored = readStoredPayload();
  mapPickerList.innerHTML = "";
  Object.entries(MAP_DEFS).forEach(([id, def]) => {
    const mapData = stored.maps[id];
    const meta = mapData
      ? `best sprint ${mapData.bestWave || 0} | best credits ${Math.floor(mapData.bestGold || 0)}`
      : "not started yet";
    const btn = document.createElement("button");
    btn.className = "btn map-picker-btn";
    btn.innerHTML = `<span class="map-picker-name">${def.name}</span><span class="map-picker-meta">${meta}</span>`;
    btn.addEventListener("click", () => {
      switchMap(id);
      mapPickerOverlay.hidden = true;
    });
    mapPickerList.appendChild(btn);
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

  state.ownerId = user.id;
  winner.ownerId = user.id;
  localStorage.setItem(TD_SAVE_KEY, JSON.stringify(winner));

  state.mapId = MAP_DEFS[winner.activeMap] ? winner.activeMap : "map1";
  applyMapLayout(state.mapId);
  state.gameSpeed = SPEED_STEPS.includes(winner.gameSpeed) ? winner.gameSpeed : 1;
  state.lastSaveTime = winner.lastSaveTime || Date.now();
  state.towers = [];
  applyMapDataToState(winner.maps[state.mapId]);

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
  if (def.isLegendary && state.bestWave <= TOWER100_UNLOCK_WAVE) return;
  if (def.unique && countPlacedOfType(state.selectedTowerType) >= tenxMaxCopies()) return;
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
  } else if (t.isRecruiter) {
    t.deployInterval = def.deployInterval / (t.pathDeployRateMult || 1);
    t.allyDamage = def.allyDamage * levelFactor * (t.pathAllyDamageMult || 1);
    t.allyRange = def.allyRange;
    t.allySpeed = def.allySpeed;
    t.allyFireRate = def.allyFireRate;
    t.allyDuration = def.allyDuration * (t.pathAllyDurationMult || 1);
    t.allyCount = def.allyCount + (t.pathAllyCountBonus || 0);
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
    statsLine = `+${t.incomePerSec.toFixed(1)} credits/sec during sprints`;
  } else if (t.isRecruiter) {
    statsLine = `deploys ${t.allyCount} warrior${t.allyCount === 1 ? "" : "s"} for ${t.allyDuration.toFixed(1)}s every ${t.deployInterval.toFixed(1)}s`;
  } else if (t.percentDamage) {
    statsLine = `dmg ${(t.damage * 100).toFixed(1)}% max hp | range ${Math.round(t.range)}`;
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
        btn.innerHTML = `<span class="path-name">${chosen.name} T${tierIndex + 1}</span><span class="path-desc">${nextTier.desc}</span><span class="path-cost">${nextTier.cost}c</span>`;
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
    btn.innerHTML = `<span class="path-name">${pathDef.name}</span><span class="path-desc">${tier1.desc}</span><span class="path-cost">${tier1.cost}c</span>`;
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
    const tier = t.path === pathId ? pathDef.tiers[tierIndex] : pathDef.tiers[0];
    if (tier) btn.disabled = state.gold < tier.cost;
  });
}

towerInfoClose.addEventListener("click", hideTowerInfoPanel);
towerUpgradeBtn.addEventListener("click", () => state.selectedTower && upgradeTower(state.selectedTower));
towerSellBtn.addEventListener("click", () => state.selectedTower && sellTower(state.selectedTower));

// Keyboard shortcuts for the selected tower's info panel: 1/2 pick a path
// option (or advance the chosen path's next tier), 3 upgrades, Delete sells.
// Ignored while typing in any input (e.g. the cheat box), since
// "MONEY123 123" contains these same digits.
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (!state.selectedTower) return;

  if (e.key === "3") {
    if (!towerUpgradeBtn.disabled) upgradeTower(state.selectedTower);
  } else if (e.key === "1" || e.key === "2") {
    const btn = towerPathSection.querySelectorAll(".path-btn")[e.key === "1" ? 0 : 1];
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
    if (!other.isSupport) continue;
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

// Recruiters periodically deploy temporary ally units near themselves -
// these are lightweight, separate from state.towers (no placement, no
// selection/upgrade UI), and expire on their own after allyDuration.
function updateRecruiters(dt) {
  for (const t of state.towers) {
    if (!t.isRecruiter) continue;
    t.deployCooldown = (t.deployCooldown ?? 0) - dt;
    if (t.deployCooldown > 0) continue;
    t.deployCooldown = t.deployInterval;
    // Warriors march in from the path's exit and walk backwards toward the
    // entrance (segment counts DOWN, the reverse of how enemies move),
    // fighting anything they meet along the way instead of sitting still.
    const spawnPoint = PATH_POINTS[PATH_POINTS.length - 1];
    for (let i = 0; i < t.allyCount; i++) {
      state.allies.push({
        x: spawnPoint.x + (Math.random() - 0.5) * 24,
        y: spawnPoint.y + (Math.random() - 0.5) * 24,
        segment: PATH_POINTS.length - 2,
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

function buildWave(waveNum) {
  const count = 6 + waveNum * 2;
  const queue = [];
  for (let i = 0; i < count; i++) {
    let type = "basic";
    const roll = Math.random();
    // Each resistant/camo type is gated to later waves, per roll ranges
    // that widen as the wave number climbs.
    if (waveNum >= 25 && roll < 0.1) type = "encrypted";
    else if (waveNum >= 18 && roll < 0.2) type = "firewalled";
    else if (waveNum >= 14 && roll < 0.32) type = "obfuscated";
    else if (waveNum >= 10 && roll < 0.44) type = "legacy";
    else if (waveNum >= 5 && roll < 0.64) type = "tank";
    else if (waveNum >= 2 && roll < 0.84) type = "fast";
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

const BOSS_TYPES = new Set(["boss", "bossCamo", "bossTank", "megaboss"]);

// Bosses get an extra hp multiplier on top of the shared formula below -
// a much bigger jump starting wave 90, and megaboss (the wave 100/140/200
// milestone spawn) is bigger again on top of that.
function bossHpMultiplier(type, waveNum) {
  let mult = 1;
  if (waveNum >= 90) mult *= 2;
  if (type === "megaboss") mult *= 4;
  return mult;
}

function spawnEnemy(type) {
  const def = ENEMY_TYPES[type];
  const isBossType = BOSS_TYPES.has(type);
  // Previously only bosses scaled with wave - every other enemy stayed at
  // its wave-1 hp forever, so a snowballing tower build made mid-to-late
  // waves trivial once it outgrew that fixed baseline. Scale everyone now.
  // A flat linear rate still can't keep up with a compounding tower economy
  // forever, so waves past 50 get extra compounding growth on top - tuned
  // so builds strong enough to reach wave 90+ still meet real resistance
  // instead of one-shotting everything before it's visible on screen.
  const lateWaves = Math.max(0, state.wave - 50);
  let hp = Math.round(def.hp * (1 + state.wave * 0.18) * Math.pow(1.11, lateWaves));
  if (isBossType) hp = Math.round(hp * bossHpMultiplier(type, state.wave));
  const reward = Math.round(def.reward + state.wave * (isBossType ? 4 : 1));
  // Every enemy gets a little faster each wave, on top of any type-specific
  // base speed (bossTank stays slow, bossCamo stays fast, relative to each other).
  const speed = def.speed * (1 + state.wave * 0.004);
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
  });
}

// ---------- Update loop ----------
function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
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
}

// Returns up to `count` enemies within range, nearest first. Camo enemies
// are skipped entirely unless canSeeCamo is true for this attacker.
function findTargets(t, count, canSeeCamo) {
  const inRange = [];
  for (const e of state.enemies) {
    if (e.camo && !canSeeCamo) continue;
    const d = distance(t.x, t.y, e.x, e.y);
    if (d <= t.range) inRange.push({ e, d });
  }
  inRange.sort((a, b) => a.d - b.d);
  return inRange.slice(0, count).map((entry) => entry.e);
}

function updateTowers(dt) {
  for (const t of state.towers) {
    if (t.isSupport || t.isEconomy || t.isRecruiter) continue; // don't attack
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;

    const buffs = getTowerBuffs(t);
    const targets = findTargets(t, t.multiShot || 1, buffs.supported);
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

    if (sourceTower.slowOnHit) {
      enemy.slowPct = sourceTower.slowOnHit.pct;
      enemy.slowTimer = sourceTower.slowOnHit.duration;
    }
    if (sourceTower.pathDotPct) {
      enemy.dotPerSec = enemy.maxHp * sourceTower.pathDotPct;
      enemy.dotTimer = sourceTower.pathDotDuration;
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

    // Once a path is chosen, its accent color takes over the tower's main
    // body (fill + outline), not just a thin outer ring - a spinning ring
    // alone was too subtle to notice at a glance.
    const pathColor = t.path ? TOWER_PATHS[t.type]?.[t.path]?.accentColor : null;
    const bodyColor = pathColor || t.color;

    ctx.fillStyle = bodyColor;
    ctx.globalAlpha = pathColor ? 0.4 : 0.25;
    ctx.beginPath();
    ctx.arc(t.x, t.y, CELL * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = pathColor ? 3 : 2;
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
    if (stage >= 3 && pathColor) {
      const spin = (performance.now() / 40) % 24;
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = -spin;
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.34 + 10, 0, Math.PI * 2);
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
        state.gold >= def.cost &&
        !(def.unique && countPlacedOfType(state.selectedTowerType) >= tenxMaxCopies());
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

    const barW = e.radius * 2;
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = "#000";
    ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW, 4);
    ctx.fillStyle = "#39ff14";
    ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW * pct, 4);
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

  if (!state.gameOver && !state.paused) {
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateRecruiters(dt);
    updateAllies(dt);
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
