const SAVE_KEY = "clickerGameSave";

// Each upgrade can be bought repeatedly. Every purchase raises its own cost
// (costGrowth) AND raises how much the *next* purchase of it grants
// (amountGrowth) - so early upgrades stay useful longer instead of being
// replaced outright by later ones.
const UPGRADES = [
  // ---- click power (typing upgrades) ----
  { id: "keyboard", name: "Mechanical Keyboard", icon: "⌨️", type: "click", baseCost: 15, costGrowth: 1.15, baseAmount: 1, amountGrowth: 1.08 },
  { id: "monitor2", name: "Second Monitor", icon: "🖥️", type: "click", baseCost: 60, costGrowth: 1.15, baseAmount: 2, amountGrowth: 1.08 },
  { id: "duck", name: "Rubber Duck", icon: "🦆", type: "click", baseCost: 200, costGrowth: 1.15, baseAmount: 4, amountGrowth: 1.08 },
  { id: "coffee", name: "Coffee IV Drip", icon: "☕", type: "click", baseCost: 600, costGrowth: 1.15, baseAmount: 8, amountGrowth: 1.08 },
  { id: "standingdesk", name: "Standing Desk", icon: "🪑", type: "click", baseCost: 1800, costGrowth: 1.15, baseAmount: 15, amountGrowth: 1.08 },
  { id: "headphones", name: "Noise-Cancelling Headphones", icon: "🎧", type: "click", baseCost: 5000, costGrowth: 1.15, baseAmount: 28, amountGrowth: 1.08 },
  { id: "autocomplete", name: "AI Autocomplete", icon: "💡", type: "click", baseCost: 14000, costGrowth: 1.15, baseAmount: 50, amountGrowth: 1.08 },
  { id: "vim", name: "Vim Motions Mastery", icon: "🥷", type: "click", baseCost: 40000, costGrowth: 1.15, baseAmount: 90, amountGrowth: 1.08 },
  { id: "battlestation", name: "4-Monitor Battlestation", icon: "🎛️", type: "click", baseCost: 110000, costGrowth: 1.15, baseAmount: 160, amountGrowth: 1.08 },
  { id: "neuralkeyboard", name: "Neural Keyboard Interface", icon: "🧠", type: "click", baseCost: 300000, costGrowth: 1.15, baseAmount: 300, amountGrowth: 1.08 },

  // ---- CPS (ci/cd upgrades) ----
  { id: "intern", name: "Intern", icon: "🧑", type: "auto", baseCost: 25, costGrowth: 1.15, baseAmount: 1, amountGrowth: 1.08 },
  { id: "juniorbot", name: "Junior Dev Bot", icon: "🤖", type: "auto", baseCost: 100, costGrowth: 1.15, baseAmount: 2, amountGrowth: 1.08 },
  { id: "reviewbot", name: "Code Review Bot", icon: "🔍", type: "auto", baseCost: 350, costGrowth: 1.15, baseAmount: 4, amountGrowth: 1.08 },
  { id: "cipipeline", name: "CI Pipeline", icon: "🔄", type: "auto", baseCost: 1000, costGrowth: 1.15, baseAmount: 8, amountGrowth: 1.08 },
  { id: "automerge", name: "Auto-merge Bot", icon: "🔀", type: "auto", baseCost: 3000, costGrowth: 1.15, baseAmount: 15, amountGrowth: 1.08 },
  { id: "devops", name: "DevOps Engineer", icon: "🛠️", type: "auto", baseCost: 8500, costGrowth: 1.15, baseAmount: 28, amountGrowth: 1.08 },
  { id: "kubernetes", name: "Kubernetes Cluster", icon: "⚙️", type: "auto", baseCost: 24000, costGrowth: 1.15, baseAmount: 50, amountGrowth: 1.08 },
  { id: "autoscaler", name: "Cloud Auto-scaler", icon: "📈", type: "auto", baseCost: 65000, costGrowth: 1.15, baseAmount: 90, amountGrowth: 1.08 },
  { id: "aipair", name: "AI Pair Programmer", icon: "👥", type: "auto", baseCost: 180000, costGrowth: 1.15, baseAmount: 160, amountGrowth: 1.08 },
  { id: "agi", name: "Self-Improving AGI", icon: "🌐", type: "auto", baseCost: 500000, costGrowth: 1.15, baseAmount: 300, amountGrowth: 1.08 },
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
  return { score: 0, upgrades, runEarned: 0, prestigePoints: 0, treeNodes, lastSaveTime: Date.now() };
}

let state = defaultState();

const scoreEl = document.getElementById("score");
const statsEl = document.getElementById("stats");
const clickBtn = document.getElementById("clickBtn");
const clickZone = document.getElementById("clickZone");
const clickUpgradeList = document.getElementById("clickUpgradeList");
const autoUpgradeList = document.getElementById("autoUpgradeList");
const resetBtn = document.getElementById("resetBtn");

const collectionTab = document.getElementById("collectionTab");
const collectionPanel = document.getElementById("collectionPanel");
const collectionBackdrop = document.getElementById("collectionBackdrop");
const collectionClose = document.getElementById("collectionClose");
const collectionClickList = document.getElementById("collectionClickList");
const collectionAutoList = document.getElementById("collectionAutoList");

const prestigeStat = document.getElementById("prestigeStat");
const prestigeBtn = document.getElementById("prestigeBtn");
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

function spawnFloatText(amount) {
  const el = document.createElement("span");
  el.className = "float-text";
  el.textContent = `+${amount}`;
  el.style.marginLeft = `${(Math.random() - 0.5) * 40}px`;
  clickZone.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

function playClickEffect(amount) {
  clickBtn.classList.remove("pulse");
  void clickBtn.offsetWidth; // restart animation
  clickBtn.classList.add("pulse");
  spawnFloatText(amount);
  playClickSound();
}

function load() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    state.score = typeof parsed.score === "number" ? parsed.score : 0;
    state.runEarned = typeof parsed.runEarned === "number" ? parsed.runEarned : 0;
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
  const cost = nextCost(upg);
  if (state.score < cost) return;
  state.score -= cost;
  state.upgrades[id] += 1;
  render();
  save();
}

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
    const cost = nextCost(upg);
    const gain = nextGain(upg);
    const owned = state.upgrades[upg.id];
    const unit = upg.type === "click" ? "lines/commit" : "commits/sec";
    btn.querySelector('[data-role="gain"]').textContent = `next: +${gain} ${unit}`;
    btn.querySelector('[data-role="owned"]').textContent = `x${owned}`;
    btn.querySelector('[data-role="cost"]').textContent = `${cost}c`;
    btn.disabled = state.score < cost;
  });
}

function buildCollectionPanel() {
  UPGRADES.forEach((upg) => {
    const row = document.createElement("div");
    row.className = "collection-row";
    row.dataset.id = upg.id;
    row.innerHTML = `
      <div class="collection-row-header">
        <span class="collection-icon">${upg.icon}</span>
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
      iconsEl.innerHTML = `<span>${upg.icon}</span>`.repeat(owned);
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
  state.runEarned += earned;
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
  refreshPrestigeTree();
}

function onClick() {
  const power = getClickPower();
  state.score += power;
  state.runEarned += power;
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
    state.runEarned += auto;
    render();
    save();
  }
}

// ---- prestige ----

function getPrestigeGain() {
  return Math.floor(Math.sqrt(state.runEarned / 100000));
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
  state.runEarned = 0;
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
