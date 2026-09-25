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
const clickZone = document.getElementById("clickZone");
const clickUpgradeBtn = document.getElementById("clickUpgradeBtn");
const autoUpgradeBtn = document.getElementById("autoUpgradeBtn");
const resetBtn = document.getElementById("resetBtn");

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
  scoreEl.textContent = `commits: ${state.score}`;
  statsEl.textContent = `lines/commit: ${state.clickPower}  |  CI bots: ${state.autoPower}`;
  clickUpgradeBtn.textContent = `upgrade typing speed (${state.clickUpgradeCost}c)`;
  autoUpgradeBtn.textContent = `hire CI bot (${state.autoUpgradeCost}c)`;
  clickUpgradeBtn.disabled = state.score < state.clickUpgradeCost;
  autoUpgradeBtn.disabled = state.score < state.autoUpgradeCost;
}

function onClick() {
  state.score += state.clickPower;
  playClickEffect(state.clickPower);
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
