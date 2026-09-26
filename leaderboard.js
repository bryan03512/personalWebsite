const clickerBoard = document.getElementById("clickerBoard");
const towerBoard = document.getElementById("towerBoard");

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
    clickerBoard.innerHTML = `<p class="lb-loading">couldn't load leaderboard.</p>`;
  } else {
    renderBoard(clickerBoard, clickerRows.filter((r) => r.clicker_prestige > 0), "clicker_prestige", "pts");
  }

  const { data: towerRows, error: towerError } = await sb
    .from("leaderboard")
    .select("display_name, td_best_wave")
    .order("td_best_wave", { ascending: false })
    .limit(15);

  if (towerError) {
    towerBoard.innerHTML = `<p class="lb-loading">couldn't load leaderboard.</p>`;
  } else {
    renderBoard(towerBoard, towerRows.filter((r) => r.td_best_wave > 0), "td_best_wave", "sprint");
  }
}

loadLeaderboards();
window.addEventListener("account:login", loadLeaderboards);
