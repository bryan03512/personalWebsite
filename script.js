const SAVE_KEY = "clickerGameSave";

let state = {
  score: 0,
  clickPower: 1,
  autoPower: 0,
  clickUpgradeCost: 10,
  autoUpgradeCost: 25,
};

const scoreEl = document.getElementById("score");
const statsEl = document.getElementById("stats");
const clickBtn = document.getElementById("clickBtn");
const clickUpgradeBtn = document.getElementById("clickUpgradeBtn");
const autoUpgradeBtn = document.getElementById("autoUpgradeBtn");
const resetBtn = document.getElementById("resetBtn");

function load() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    try {
      state = { ...state, ...JSON.parse(saved) };
    } catch {
      // ignore corrupted save
    }
  }
}

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function render() {
  scoreEl.textContent = `Score: ${state.score}`;
  statsEl.textContent = `Click Power: ${state.clickPower}  |  Auto/sec: ${state.autoPower}`;
  clickUpgradeBtn.textContent = `Upgrade Click Power (${state.clickUpgradeCost} pts)`;
  autoUpgradeBtn.textContent = `Buy Auto-Clicker (${state.autoUpgradeCost} pts)`;
  clickUpgradeBtn.disabled = state.score < state.clickUpgradeCost;
  autoUpgradeBtn.disabled = state.score < state.autoUpgradeCost;
}

function onClick() {
  state.score += state.clickPower;
  render();
  save();
}

function buyClickUpgrade() {
  if (state.score < state.clickUpgradeCost) return;
  state.score -= state.clickUpgradeCost;
  state.clickPower += 1;
  state.clickUpgradeCost = Math.round(state.clickUpgradeCost * 1.5);
  render();
  save();
}

function buyAutoUpgrade() {
  if (state.score < state.autoUpgradeCost) return;
  state.score -= state.autoUpgradeCost;
  state.autoPower += 1;
  state.autoUpgradeCost = Math.round(state.autoUpgradeCost * 1.6);
  render();
  save();
}

function resetGame() {
  if (!confirm("Reset all progress?")) return;
  state = {
    score: 0,
    clickPower: 1,
    autoPower: 0,
    clickUpgradeCost: 10,
    autoUpgradeCost: 25,
  };
  render();
  save();
}

function tick() {
  if (state.autoPower > 0) {
    state.score += state.autoPower;
    render();
    save();
  }
}

clickBtn.addEventListener("click", onClick);
clickUpgradeBtn.addEventListener("click", buyClickUpgrade);
autoUpgradeBtn.addEventListener("click", buyAutoUpgrade);
resetBtn.addEventListener("click", resetGame);

load();
render();
setInterval(tick, 1000);
