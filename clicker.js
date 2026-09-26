const SAVE_KEY = "clickerGameSave";

// Each upgrade can be bought repeatedly. Every purchase raises its own cost
// (costGrowth) AND raises how much the *next* purchase of it grants
// (amountGrowth) - so early upgrades stay useful longer instead of being
// replaced outright by later ones.
const UPGRADES = [
  // ---- click power (typing upgrades) ----
  { id: "keyboard", name: "Mechanical Keyboard", icon: "⌨️", color: "107,143,255", type: "click", baseCost: 15, costGrowth: 1.15, baseAmount: 1, amountGrowth: 1.08 },
  { id: "monitor2", name: "Second Monitor", icon: "🖥️", color: "0,229,255", type: "click", baseCost: 60, costGrowth: 1.15, baseAmount: 2, amountGrowth: 1.08 },
  { id: "duck", name: "Rubber Duck", icon: "🦆", color: "255,217,61", type: "click", baseCost: 200, costGrowth: 1.15, baseAmount: 4, amountGrowth: 1.08 },
  { id: "coffee", name: "Coffee IV Drip", icon: "☕", color: "193,122,61", type: "click", baseCost: 600, costGrowth: 1.15, baseAmount: 8, amountGrowth: 1.08 },
  { id: "standingdesk", name: "Standing Desk", icon: "🪑", color: "184,134,90", type: "click", baseCost: 1800, costGrowth: 1.15, baseAmount: 15, amountGrowth: 1.08 },
  { id: "headphones", name: "Noise-Cancelling Headphones", icon: "🎧", color: "168,107,255", type: "click", baseCost: 5000, costGrowth: 1.15, baseAmount: 28, amountGrowth: 1.08 },
  { id: "autocomplete", name: "AI Autocomplete", icon: "💡", color: "255,224,102", type: "click", baseCost: 14000, costGrowth: 1.15, baseAmount: 50, amountGrowth: 1.08 },
  { id: "vim", name: "Vim Motions Mastery", icon: "🥷", color: "108,60,224", type: "click", baseCost: 40000, costGrowth: 1.15, baseAmount: 90, amountGrowth: 1.08 },
  { id: "battlestation", name: "4-Monitor Battlestation", icon: "🎛️", color: "255,159,67", type: "click", baseCost: 110000, costGrowth: 1.15, baseAmount: 160, amountGrowth: 1.08 },
  { id: "neuralkeyboard", name: "Neural Keyboard Interface", icon: "🧠", color: "255,79,216", type: "click", baseCost: 300000, costGrowth: 1.15, baseAmount: 300, amountGrowth: 1.08 },

  // ---- CPS (ci/cd upgrades) ----
  { id: "intern", name: "Intern", icon: "🧑", color: "126,231,135", type: "auto", baseCost: 25, costGrowth: 1.15, baseAmount: 1, amountGrowth: 1.08 },
  { id: "juniorbot", name: "Junior Dev Bot", icon: "🤖", color: "77,157,224", type: "auto", baseCost: 100, costGrowth: 1.15, baseAmount: 2, amountGrowth: 1.08 },
  { id: "reviewbot", name: "Code Review Bot", icon: "🔍", color: "46,196,182", type: "auto", baseCost: 350, costGrowth: 1.15, baseAmount: 4, amountGrowth: 1.08 },
  { id: "cipipeline", name: "CI Pipeline", icon: "🔄", color: "163,230,53", type: "auto", baseCost: 1000, costGrowth: 1.15, baseAmount: 8, amountGrowth: 1.08 },
  { id: "automerge", name: "Auto-merge Bot", icon: "🔀", color: "56,189,248", type: "auto", baseCost: 3000, costGrowth: 1.15, baseAmount: 15, amountGrowth: 1.08 },
  { id: "devops", name: "DevOps Engineer", icon: "🛠️", color: "244,116,59", type: "auto", baseCost: 8500, costGrowth: 1.15, baseAmount: 28, amountGrowth: 1.08 },
  { id: "kubernetes", name: "Kubernetes Cluster", icon: "⚙️", color: "50,108,229", type: "auto", baseCost: 24000, costGrowth: 1.15, baseAmount: 50, amountGrowth: 1.08 },
  { id: "autoscaler", name: "Cloud Auto-scaler", icon: "📈", color: "52,211,153", type: "auto", baseCost: 65000, costGrowth: 1.15, baseAmount: 90, amountGrowth: 1.08 },
  { id: "aipair", name: "AI Pair Programmer", icon: "👥", color: "139,92,246", type: "auto", baseCost: 180000, costGrowth: 1.15, baseAmount: 160, amountGrowth: 1.08 },
  { id: "agi", name: "Self-Improving AGI", icon: "🌐", color: "57,255,20", type: "auto", baseCost: 500000, costGrowth: 1.15, baseAmount: 300, amountGrowth: 1.08 },
];

// Prestige tree: a root node splitting into a "typing" branch and an "ops"
// branch, converging into a capstone node that requires both branches maxed.
const PRESTIGE_TREE = [
  { id: "root", name: "Refactor Mastery", desc: "+5% commits & CI bots", icon: "🌱", row: "root", cost: 1, requires: [], effect: { clickMult: 0.05, autoMult: 0.05 } },
  { id: "typing1", name: "Faster Fingers", desc: "+10% commits per click", icon: "⚡", row: "tier1", col: 0, cost: 1, requires: ["root"], effect: { clickMult: 0.10 } },
  { id: "ops1", name: "Better Tooling", desc: "+10% CI bot output", icon: "🔧", row: "tier1", col: 1, cost: 1, requires: ["root"], effect: { autoMult: 0.10 } },
  { id: "typing2", name: "Muscle Memory", desc: "+15% commits per click", icon: "💪", row: "tier2", col: 0, cost: 2, requires: ["typing1"], effect: { clickMult: 0.15 } },
  { id: "ops2", name: "Pipeline Tuning", desc: "+15% CI bot output", icon: "📡", row: "tier2", col: 1, cost: 2, requires: ["ops1"], effect: { autoMult: 0.15 } },
  { id: "typing3", name: "Flow State", desc: "hold-to-type fires 2x faster", icon: "🌀", row: "tier3", col: 0, cost: 3, requires: ["typing2"], effect: { typingSpeed: true } },
  { id: "ops3", name: "Offline Commits", desc: "CI bots earn while you're away (up to 8h)", icon: "🌙", row: "tier3", col: 1, cost: 3, requires: ["ops2"], effect: { offline: true } },
  { id: "capstone", name: "10x Engineer", desc: "+25% to everything", icon: "🚀", row: "capstone", cost: 5, requires: ["typing3", "ops3"], effect: { clickMult: 0.25, autoMult: 0.25 } },
];

function defaultState() {
  const upgrades = {};
  UPGRADES.forEach((u) => (upgrades[u.id] = 0));
  const treeNodes = {};
  PRESTIGE_TREE.forEach((n) => (treeNodes[n.id] = false));
  return { score: 0, upgrades, prestigePoints: 0, treeNodes, lastSaveTime: Date.now() };
}

let state = defaultState();

const scoreEl = document.getElementById("score");
const statsEl = document.getElementById("stats");
const clickBtn = document.getElementById("clickBtn");
const clickZone = document.getElementById("clickZone");
const clickUpgradeList = document.getElementById("clickUpgradeList");
const autoUpgradeList = document.getElementById("autoUpgradeList");
const resetBtn = document.getElementById("resetBtn");

const buyMode1 = document.getElementById("buyMode1");
const buyMode10 = document.getElementById("buyMode10");
const buyModeMax = document.getElementById("buyModeMax");

const collectionTab = document.getElementById("collectionTab");
const collectionPanel = document.getElementById("collectionPanel");
const collectionBackdrop = document.getElementById("collectionBackdrop");
const collectionClose = document.getElementById("collectionClose");
const collectionClickList = document.getElementById("collectionClickList");
const collectionAutoList = document.getElementById("collectionAutoList");

const prestigeStat = document.getElementById("prestigeStat");
const prestigeBtn = document.getElementById("prestigeBtn");
const prestigeFill = document.getElementById("prestigeFill");
const prestigeProgressLabel = document.getElementById("prestigeProgressLabel");
const offlineBanner = document.getElementById("offlineBanner");

const treeTab = document.getElementById("treeTab");
const treePanel = document.getElementById("treePanel");
const treeBackdrop = document.getElementById("treeBackdrop");
const treeClose = document.getElementById("treeClose");
const treePointsLabel = document.getElementById("treePointsLabel");
const treeContainer = document.getElementById("treeContainer");
const treeLines = document.getElementById("treeLines");

let audioCtx = null;

function playClickSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

// Cached so we don't force a synchronous layout read on every single click -
// only recompute when the button could have actually moved.
let clickZoneOrigin = null;
function updateClickZoneOrigin() {
  const rect = clickZone.getBoundingClientRect();
  clickZoneOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
window.addEventListener("resize", updateClickZoneOrigin);

const MAX_FLOAT_TEXTS = 30;
const MAX_FLOAT_PARTICLES = 30;
const PARTICLE_EMOJIS = ["💧", "✨", "⚡"];

function spawnFloatText(amount) {
  if (!clickZoneOrigin) updateClickZoneOrigin();
  if (document.querySelectorAll(".float-text").length >= MAX_FLOAT_TEXTS) return;

  const el = document.createElement("span");
  el.className = "float-text";
  el.textContent = `+${amount}`;
  el.style.left = `${clickZoneOrigin.x}px`;
  el.style.top = `${clickZoneOrigin.y}px`;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

function spawnParticle() {
  if (!clickZoneOrigin) updateClickZoneOrigin();
  if (document.querySelectorAll(".float-particle").length >= MAX_FLOAT_PARTICLES) return;

  const el = document.createElement("span");
  el.className = "float-particle";
  el.textContent = PARTICLE_EMOJIS[Math.floor(Math.random() * PARTICLE_EMOJIS.length)];
  el.style.left = `${clickZoneOrigin.x}px`;
  el.style.top = `${clickZoneOrigin.y}px`;
  el.style.setProperty("--drift", `${(Math.random() - 0.5) * 320}px`);
  el.style.setProperty("--rise", `${-90 - Math.random() * 70}px`);
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

function playClickEffect(amount) {
  clickBtn.classList.remove("pulse");
  void clickBtn.offsetWidth; // restart animation
  clickBtn.classList.add("pulse");
  spawnFloatText(amount);
  spawnParticle();
  playClickSound();
}

function load() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    state.score = typeof parsed.score === "number" ? parsed.score : 0;
    state.prestigePoints = typeof parsed.prestigePoints === "number" ? parsed.prestigePoints : 0;
    state.lastSaveTime = typeof parsed.lastSaveTime === "number" ? parsed.lastSaveTime : Date.now();
    if (parsed.upgrades) {
      UPGRADES.forEach((u) => {
        if (typeof parsed.upgrades[u.id] === "number") {
          state.upgrades[u.id] = parsed.upgrades[u.id];
        }
      });
    }
    if (parsed.treeNodes) {
      PRESTIGE_TREE.forEach((n) => {
        if (parsed.treeNodes[n.id]) state.treeNodes[n.id] = true;
      });
    }
  } catch {
    // ignore corrupted save
  }
}

function save() {
  state.lastSaveTime = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

// Cost of the NEXT purchase of this upgrade.
function nextCost(upg) {
  const owned = state.upgrades[upg.id];
  return Math.round(upg.baseCost * Math.pow(upg.costGrowth, owned));
}

// Amount the NEXT purchase of this upgrade will grant.
function nextGain(upg) {
  const owned = state.upgrades[upg.id];
  return Math.round(upg.baseAmount * Math.pow(upg.amountGrowth, owned));
}

// ---- buy quantity (x1 / x10 / max) ----
let buyQty = 1;

// Total cost of buying `qty` copies of this upgrade starting from its current owned count.
function costForQty(upg, qty) {
  const owned = state.upgrades[upg.id];
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += Math.round(upg.baseCost * Math.pow(upg.costGrowth, owned + i));
  }
  return total;
}

// Total gain from buying `qty` copies of this upgrade starting from its current owned count.
function gainForQty(upg, qty) {
  const owned = state.upgrades[upg.id];
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += Math.round(upg.baseAmount * Math.pow(upg.amountGrowth, owned + i));
  }
  return total;
}

// How many copies of this upgrade the current commit balance can afford, back to back.
function maxAffordableQty(upg) {
  const owned = state.upgrades[upg.id];
  let n = 0;
  let spent = 0;
  while (n < 10000) {
    const cost = Math.round(upg.baseCost * Math.pow(upg.costGrowth, owned + n));
    if (spent + cost > state.score) break;
    spent += cost;
    n += 1;
  }
  return n;
}

// The actual quantity a purchase of this upgrade resolves to, given the buy-mode switch.
function resolvedQty(upg) {
  if (buyQty === "max") return maxAffordableQty(upg);
  return buyQty;
}

// Total current bonus this upgrade contributes, summed across all past purchases.
function totalContribution(upg) {
  const owned = state.upgrades[upg.id];
  let total = 0;
  for (let i = 0; i < owned; i++) {
    total += Math.round(upg.baseAmount * Math.pow(upg.amountGrowth, i));
  }
  return total;
}

function ownedNodes() {
  return PRESTIGE_TREE.filter((n) => state.treeNodes[n.id]);
}

function getPrestigeClickMult() {
  return 1 + ownedNodes().reduce((sum, n) => sum + (n.effect.clickMult || 0), 0);
}

function getPrestigeAutoMult() {
  return 1 + ownedNodes().reduce((sum, n) => sum + (n.effect.autoMult || 0), 0);
}

function hasFlowState() {
  return !!state.treeNodes.typing3;
}

function hasOfflineCommits() {
  return !!state.treeNodes.ops3;
}

function getClickPower() {
  let power = 1;
  UPGRADES.filter((u) => u.type === "click").forEach((u) => {
    power += totalContribution(u);
  });
  return Math.max(1, Math.round(power * getPrestigeClickMult()));
}

function getAutoPower() {
  let power = 0;
  UPGRADES.filter((u) => u.type === "auto").forEach((u) => {
    power += totalContribution(u);
  });
  return Math.round(power * getPrestigeAutoMult());
}

function buyUpgrade(id) {
  const upg = UPGRADES.find((u) => u.id === id);
  const qty = resolvedQty(upg);
  if (qty < 1) return;
  const cost = costForQty(upg, qty);
  if (state.score < cost) return;
  state.score -= cost;
  state.upgrades[id] += qty;
  render();
  save();
}

function setBuyMode(qty) {
  buyQty = qty;
  [buyMode1, buyMode10, buyModeMax].forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.qty === String(qty));
  });
  render();
}

buyMode1.addEventListener("click", () => setBuyMode(1));
buyMode10.addEventListener("click", () => setBuyMode(10));
buyModeMax.addEventListener("click", () => setBuyMode("max"));

function buildUpgradeButtons() {
  UPGRADES.forEach((upg) => {
    const btn = document.createElement("button");
    btn.className = "btn upgrade-btn";
    btn.dataset.id = upg.id;
    btn.innerHTML = `
      <span class="u-info">
        <span class="u-name">${upg.name}</span>
        <span class="u-gain" data-role="gain"></span>
      </span>
      <span class="u-owned" data-role="owned"></span>
      <span class="u-cost" data-role="cost"></span>
    `;
    btn.addEventListener("click", () => buyUpgrade(upg.id));
    (upg.type === "click" ? clickUpgradeList : autoUpgradeList).appendChild(btn);
  });
}

function refreshUpgradeButtons() {
  UPGRADES.forEach((upg) => {
    const btn = document.querySelector(`.upgrade-btn[data-id="${upg.id}"]`);
    if (!btn) return;
    const qty = resolvedQty(upg);
    const cost = qty > 0 ? costForQty(upg, qty) : nextCost(upg);
    const gain = qty > 0 ? gainForQty(upg, qty) : nextGain(upg);
    const owned = state.upgrades[upg.id];
    const unit = upg.type === "click" ? "lines/commit" : "commits/sec";
    const qtyLabel = buyQty === "max" ? `max×${qty}` : `×${qty}`;
    btn.querySelector('[data-role="gain"]').textContent = `buy ${qtyLabel}: +${gain} ${unit}`;
    btn.querySelector('[data-role="owned"]').textContent = `x${owned}`;
    btn.querySelector('[data-role="cost"]').textContent = `${cost}c`;
    btn.disabled = qty < 1 || state.score < cost;
  });
}

function tileStyle(upg) {
  const c = upg.color;
  return `background: linear-gradient(135deg, rgba(${c},0.4), rgba(${c},0.12)); border-color: rgba(${c},0.9); box-shadow: 0 0 6px rgba(${c},0.5); color: rgb(${c});`;
}

function buildCollectionPanel() {
  UPGRADES.forEach((upg) => {
    const row = document.createElement("div");
    row.className = "collection-row";
    row.dataset.id = upg.id;
    row.innerHTML = `
      <div class="collection-row-header">
        <span class="collection-icon icon-tile" style="${tileStyle(upg)}">${upg.icon}</span>
        <span class="collection-name">${upg.name}</span>
        <span class="collection-count" data-role="count">x0</span>
      </div>
      <div class="collection-icons" data-role="icons"></div>
    `;
    (upg.type === "click" ? collectionClickList : collectionAutoList).appendChild(row);
  });
}

function refreshCollectionPanel() {
  UPGRADES.forEach((upg) => {
    const row = document.querySelector(`.collection-row[data-id="${upg.id}"]`);
    if (!row) return;
    const owned = state.upgrades[upg.id];
    row.querySelector('[data-role="count"]').textContent = `x${owned}`;
    const iconsEl = row.querySelector('[data-role="icons"]');
    if (iconsEl.childElementCount !== owned) {
      iconsEl.innerHTML = `<span class="icon-tile" style="${tileStyle(upg)}">${upg.icon}</span>`.repeat(owned);
    }
  });
}

function openCollectionPanel() {
  collectionPanel.classList.add("open");
  collectionBackdrop.classList.add("open");
}

function closeCollectionPanel() {
  collectionPanel.classList.remove("open");
  collectionBackdrop.classList.remove("open");
}

collectionTab.addEventListener("click", () => {
  collectionPanel.classList.contains("open") ? closeCollectionPanel() : openCollectionPanel();
});
collectionClose.addEventListener("click", closeCollectionPanel);
collectionBackdrop.addEventListener("click", closeCollectionPanel);

// ---- prestige tree panel ----

function canBuyNode(node) {
  if (state.treeNodes[node.id]) return false;
  if (state.prestigePoints < node.cost) return false;
  return node.requires.every((r) => state.treeNodes[r]);
}

function buyNode(id) {
  const node = PRESTIGE_TREE.find((n) => n.id === id);
  if (!canBuyNode(node)) return;
  state.prestigePoints -= node.cost;
  state.treeNodes[id] = true;
  render();
  save();
}

function buildPrestigeTree() {
  PRESTIGE_TREE.forEach((node) => {
    const row = treeContainer.querySelector(`.tree-row[data-row="${node.row}"]`);
    const btn = document.createElement("button");
    btn.className = "tree-node";
    btn.dataset.id = node.id;
    btn.innerHTML = `
      <span class="t-name">${node.icon} ${node.name}</span>
      <span class="t-desc">${node.desc}</span>
      <span class="t-cost" data-role="cost"></span>
    `;
    btn.addEventListener("click", () => buyNode(node.id));
    row.appendChild(btn);
  });
}

function drawTreeLines() {
  const containerRect = treeContainer.getBoundingClientRect();
  treeLines.setAttribute("width", containerRect.width);
  treeLines.setAttribute("height", containerRect.height);
  treeLines.innerHTML = "";

  PRESTIGE_TREE.forEach((node) => {
    const childEl = treeContainer.querySelector(`.tree-node[data-id="${node.id}"]`);
    if (!childEl) return;
    const childRect = childEl.getBoundingClientRect();
    const childX = childRect.left + childRect.width / 2 - containerRect.left;
    const childY = childRect.top - containerRect.top;

    node.requires.forEach((parentId) => {
      const parentEl = treeContainer.querySelector(`.tree-node[data-id="${parentId}"]`);
      if (!parentEl) return;
      const parentRect = parentEl.getBoundingClientRect();
      const parentX = parentRect.left + parentRect.width / 2 - containerRect.left;
      const parentY = parentRect.bottom - containerRect.top;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", parentX);
      line.setAttribute("y1", parentY);
      line.setAttribute("x2", childX);
      line.setAttribute("y2", childY);
      line.setAttribute("stroke", state.treeNodes[node.id] ? "#ff4fd8" : "#2a352a");
      line.setAttribute("stroke-width", "2");
      treeLines.appendChild(line);
    });
  });
}

function refreshPrestigeTree() {
  treePointsLabel.textContent = state.prestigePoints;
  PRESTIGE_TREE.forEach((node) => {
    const btn = treeContainer.querySelector(`.tree-node[data-id="${node.id}"]`);
    if (!btn) return;
    const owned = state.treeNodes[node.id];
    const met = node.requires.every((r) => state.treeNodes[r]);
    btn.classList.toggle("owned", owned);
    btn.classList.toggle("locked", !owned && !met);
    btn.disabled = owned || !canBuyNode(node);
    btn.querySelector('[data-role="cost"]').textContent = owned ? "owned" : `${node.cost} pt${node.cost === 1 ? "" : "s"}`;
  });
  drawTreeLines();
}

function openTreePanel() {
  treePanel.classList.add("open");
  treeBackdrop.classList.add("open");
  drawTreeLines();
}

function closeTreePanel() {
  treePanel.classList.remove("open");
  treeBackdrop.classList.remove("open");
}

treeTab.addEventListener("click", () => {
  treePanel.classList.contains("open") ? closeTreePanel() : openTreePanel();
});
treeClose.addEventListener("click", closeTreePanel);
treeBackdrop.addEventListener("click", closeTreePanel);
window.addEventListener("resize", () => {
  if (treePanel.classList.contains("open")) drawTreeLines();
});

// ---- offline progress ----

function applyOfflineProgress() {
  if (!hasOfflineCommits() || !state.lastSaveTime) return;
  const elapsedSec = Math.max(0, (Date.now() - state.lastSaveTime) / 1000);
  const cappedSec = Math.min(elapsedSec, 8 * 3600);
  const auto = getAutoPower();
  const earned = Math.floor(auto * cappedSec);
  if (earned < 1) return;
  state.score += earned;
  const hours = Math.floor(cappedSec / 3600);
  const mins = Math.floor((cappedSec % 3600) / 60);
  offlineBanner.textContent = `welcome back — CI bots earned +${earned} commits while you were away (${hours}h ${mins}m)`;
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => (offlineBanner.hidden = true));
  offlineBanner.appendChild(closeBtn);
  offlineBanner.hidden = false;
}

function render() {
  scoreEl.textContent = `commits: ${state.score}`;
  statsEl.textContent = `lines/commit: ${getClickPower()}  |  CI bots: ${getAutoPower()}/sec`;
  refreshUpgradeButtons();
  refreshCollectionPanel();

  const gain = getPrestigeGain();
  prestigeStat.textContent = `prestige: ${state.prestigePoints} pts`;
  prestigeBtn.textContent = gain > 0 ? `refactor --prestige (+${gain})` : "refactor --prestige";
  prestigeBtn.disabled = gain < 1;

  const floor = prestigeThreshold(gain);
  const ceil = prestigeThreshold(gain + 1);
  const pct = Math.min(100, ((state.score - floor) / (ceil - floor)) * 100);
  prestigeFill.style.width = `${pct}%`;
  prestigeProgressLabel.textContent = `${state.score.toLocaleString()} / ${ceil.toLocaleString()} commits to next point`;

  refreshPrestigeTree();
}

function onClick() {
  const power = getClickPower();
  state.score += power;
  playClickEffect(power);
  render();
  save();
}

function resetGame() {
  if (!confirm("Reset ALL progress, including your prestige tree? This cannot be undone.")) return;
  state = defaultState();
  render();
  save();
}

function tick() {
  const auto = getAutoPower();
  if (auto > 0) {
    state.score += auto;
    render();
    save();
  }
}

// ---- prestige ----

function getPrestigeGain() {
  return Math.floor(Math.sqrt(state.score / 100000));
}

// Lifetime commits (this run) needed to reach a given prestige point count.
function prestigeThreshold(points) {
  return points * points * 100000;
}

function doPrestige() {
  const gain = getPrestigeGain();
  if (gain < 1) return;
  const ok = confirm(
    `Refactor the codebase for +${gain} prestige point${gain === 1 ? "" : "s"}?\n\nThis resets your commits and typing/CI-CD upgrades back to zero. Your prestige points and tree stay permanently.`,
  );
  if (!ok) return;
  state.prestigePoints += gain;
  state.score = 0;
  UPGRADES.forEach((u) => (state.upgrades[u.id] = 0));
  render();
  save();
}

prestigeBtn.addEventListener("click", doPrestige);

// ---- hold-to-type: hold the button 1s to start auto-committing repeatedly ----
const HOLD_THRESHOLD_MS = 1000;
const TYPING_INTERVAL_MS = 120;
const commitLabel = clickBtn.querySelector(".commit-label");

let holdTimer = null;
let typingInterval = null;
let isTyping = false;

function startTyping() {
  isTyping = true;
  clickBtn.classList.add("typing");
  if (commitLabel) commitLabel.textContent = "typing...";
  const interval = hasFlowState() ? TYPING_INTERVAL_MS / 2 : TYPING_INTERVAL_MS;
  typingInterval = setInterval(onClick, interval);
}

function stopHold() {
  clearTimeout(holdTimer);
  holdTimer = null;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  if (isTyping) {
    isTyping = false;
    clickBtn.classList.remove("typing");
    if (commitLabel) commitLabel.textContent = "git commit";
  }
}

function handlePointerDown(evt) {
  evt.preventDefault();
  holdTimer = setTimeout(startTyping, HOLD_THRESHOLD_MS);
}

function handlePointerUp() {
  const wasTyping = isTyping;
  stopHold();
  if (!wasTyping) onClick();
}

clickBtn.addEventListener("pointerdown", handlePointerDown);
clickBtn.addEventListener("pointerup", handlePointerUp);
clickBtn.addEventListener("pointerleave", stopHold);
clickBtn.addEventListener("pointercancel", stopHold);

resetBtn.addEventListener("click", resetGame);

load();
buildUpgradeButtons();
buildCollectionPanel();
buildPrestigeTree();
applyOfflineProgress();
render();
setInterval(tick, 1000);
