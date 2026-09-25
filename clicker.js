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

function defaultState() {
  const upgrades = {};
  UPGRADES.forEach((u) => (upgrades[u.id] = 0));
  return { score: 0, upgrades };
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
    if (parsed.upgrades) {
      UPGRADES.forEach((u) => {
        if (typeof parsed.upgrades[u.id] === "number") {
          state.upgrades[u.id] = parsed.upgrades[u.id];
        }
      });
    }
  } catch {
    // ignore corrupted save
  }
}

function save() {
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

function getClickPower() {
  let power = 1;
  UPGRADES.filter((u) => u.type === "click").forEach((u) => {
    power += totalContribution(u);
  });
  return power;
}

function getAutoPower() {
  let power = 0;
  UPGRADES.filter((u) => u.type === "auto").forEach((u) => {
    power += totalContribution(u);
  });
  return power;
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

function render() {
  scoreEl.textContent = `commits: ${state.score}`;
  statsEl.textContent = `lines/commit: ${getClickPower()}  |  CI bots: ${getAutoPower()}/sec`;
  refreshUpgradeButtons();
  refreshCollectionPanel();
}

function onClick() {
  const power = getClickPower();
  state.score += power;
  playClickEffect(power);
  render();
  save();
}

function resetGame() {
  if (!confirm("Reset all progress?")) return;
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

clickBtn.addEventListener("click", onClick);
resetBtn.addEventListener("click", resetGame);

load();
buildUpgradeButtons();
buildCollectionPanel();
render();
setInterval(tick, 1000);
