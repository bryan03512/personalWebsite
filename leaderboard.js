const clickerBoard = document.getElementById("clickerBoard");
const peakBoard = document.getElementById("peakBoard");
const towerBoard = document.getElementById("towerBoard");
const goldBoard = document.getElementById("goldBoard");
const lbVisibility = document.getElementById("lbVisibility");
const lbVisibleCheckbox = document.getElementById("lbVisibleCheckbox");
const lbOwnerPanel = document.getElementById("lbOwnerPanel");
const lbTotalAccounts = document.getElementById("lbTotalAccounts");
const lbTotalVisits = document.getElementById("lbTotalVisits");
const lbAccountList = document.getElementById("lbAccountList");

function renderBoard(container, rows, scoreKey, scoreLabel) {
  if (!rows || rows.length === 0) {
    container.innerHTML = `<p class="lb-loading">no scores yet - be the first!</p>`;
    return;
  }
  container.innerHTML = rows
    .map((row, i) => {
      const name = row.display_name || "anonymous";
      const score = row[scoreKey] || 0;
      return `
        <div class="lb-row">
          <span class="lb-rank">#${i + 1}</span>
          <span class="lb-name">${name}</span>
          <span class="lb-score">${score.toLocaleString()} ${scoreLabel}</span>
        </div>
      `;
    })
    .join("");
}

async function loadLeaderboards() {
  const { data: clickerRows, error: clickerError } = await sb
    .from("leaderboard")
    .select("display_name, clicker_prestige")
    .order("clicker_prestige", { ascending: false })
    .limit(15);

  if (clickerError) {
    console.error("clickerBoard load failed:", clickerError);
    clickerBoard.innerHTML = `<p class="lb-loading">couldn't load leaderboard.</p>`;
  } else {
    renderBoard(clickerBoard, clickerRows.filter((r) => r.clicker_prestige > 0), "clicker_prestige", "pts");
  }

  const { data: peakRows, error: peakError } = await sb
    .from("leaderboard")
    .select("display_name, clicker_peak")
    .order("clicker_peak", { ascending: false })
    .limit(15);

  if (peakError) {
    console.error("peakBoard load failed:", peakError);
    peakBoard.innerHTML = `<p class="lb-loading">couldn't load leaderboard.</p>`;
  } else {
    renderBoard(peakBoard, peakRows.filter((r) => r.clicker_peak > 0), "clicker_peak", "commits");
  }

  const { data: towerRows, error: towerError } = await sb
    .from("leaderboard")
    .select("display_name, td_best_wave")
    .order("td_best_wave", { ascending: false })
    .limit(15);

  if (towerError) {
    console.error("towerBoard load failed:", towerError);
    towerBoard.innerHTML = `<p class="lb-loading">couldn't load leaderboard.</p>`;
  } else {
    renderBoard(towerBoard, towerRows.filter((r) => r.td_best_wave > 0), "td_best_wave", "sprint");
  }

  const { data: goldRows, error: goldError } = await sb
    .from("leaderboard")
    .select("display_name, td_best_gold")
    .order("td_best_gold", { ascending: false })
    .limit(15);

  if (goldError) {
    console.error("goldBoard load failed:", goldError);
    goldBoard.innerHTML = `<p class="lb-loading">couldn't load leaderboard.</p>`;
  } else {
    renderBoard(goldBoard, goldRows.filter((r) => r.td_best_gold > 0), "td_best_gold", "credits");
  }
}

async function refreshVisibilityToggle() {
  const user = await accountGetUser();
  if (!user) {
    lbVisibility.hidden = true;
    return;
  }
  lbVisibility.hidden = false;
  lbVisibleCheckbox.checked = await getLeaderboardVisibility();
}

lbVisibleCheckbox.addEventListener("change", async () => {
  await setLeaderboardVisibility(lbVisibleCheckbox.checked);
  loadLeaderboards();
});

// Silently does nothing for everyone except the one account this RPC
// authorizes server-side - no error shown here, it just stays hidden.
async function refreshOwnerPanel() {
  const user = await accountGetUser();
  if (!user) {
    lbOwnerPanel.hidden = true;
    return;
  }
  const { data, error } = await sb.rpc("get_site_overview");
  if (error || !data) {
    if (error) console.error("get_site_overview failed:", error);
    lbOwnerPanel.hidden = true;
    return;
  }
  lbTotalAccounts.textContent = data.total_accounts ?? 0;
  lbTotalVisits.textContent = data.total_visits ?? 0;
  if (lbAccountList) {
    const accounts = data.accounts || [];
    lbAccountList.innerHTML = accounts
      .map((a) => `<div class="admin-row"><span>${a.email}</span><span>${new Date(a.created_at).toLocaleDateString()}</span></div>`)
      .join("");
  }
  lbOwnerPanel.hidden = false;
}

loadLeaderboards();
refreshVisibilityToggle();
refreshOwnerPanel();
window.addEventListener("account:login", () => {
  loadLeaderboards();
  refreshVisibilityToggle();
  refreshOwnerPanel();
});
window.addEventListener("account:logout", () => {
  refreshVisibilityToggle();
  lbOwnerPanel.hidden = true;
});
