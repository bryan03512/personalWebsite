const adminBody = document.getElementById("adminBody");

const STAT_LABELS = {
  total_accounts: "total accounts",
  visible_on_leaderboard: "visible on leaderboard",
  hidden_from_leaderboard: "hidden from leaderboard",
  accounts_with_clicker_save: "have played clicker",
  accounts_with_towerdefense_save: "have played tower defense",
  accounts_created_last_24h: "signed up in last 24h",
};

async function loadAdminStats() {
  const user = await accountGetUser();
  if (!user) {
    adminBody.innerHTML = `<p class="admin-msg">log in as the site owner to view stats.</p>`;
    return;
  }

  const { data, error } = await sb.rpc("get_admin_stats");
  if (error) {
    adminBody.innerHTML = `<p class="admin-msg">not authorized - this account isn't the site owner.</p>`;
    return;
  }

  adminBody.innerHTML = `<div class="admin-stats">${Object.entries(STAT_LABELS)
    .map(([key, label]) => `<div class="admin-row"><span>${label}</span><strong>${data[key] ?? 0}</strong></div>`)
    .join("")}</div>`;
}

loadAdminStats();
window.addEventListener("account:login", loadAdminStats);
window.addEventListener("account:logout", loadAdminStats);
