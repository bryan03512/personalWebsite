// Shared account module: Supabase client, auth helpers, cloud save
// read/write, and a small injected login/signup widget. Included by
// index.html, clicker.html, and towerdefense.html.

const SUPABASE_URL = "https://grwxqrevyfhvjluqvitd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QZ1Jkd_6ojbhF-QKTRnIUQ_-TT-W_5F";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- auth helpers ----
async function accountSignUp(email, password) {
  return sb.auth.signUp({ email, password });
}

async function accountSignIn(email, password) {
  return sb.auth.signInWithPassword({ email, password });
}

async function accountSignOut() {
  return sb.auth.signOut();
}

async function accountGetUser() {
  const { data } = await sb.auth.getUser();
  return data.user || null;
}

// ---- cloud save helpers ----
// `field` is one of "clicker" | "towerdefense" | "chat" - each app owns one
// jsonb column on the shared per-user "saves" row.
async function loadCloudSave(field) {
  const user = await accountGetUser();
  if (!user) return null;
  const { data, error } = await sb.from("saves").select(field).eq("user_id", user.id).maybeSingle();
  if (error) {
    console.error("loadCloudSave failed:", error);
    return null;
  }
  return data ? data[field] : null;
}

async function saveCloudField(field, value) {
  const user = await accountGetUser();
  if (!user) return;
  const payload = { user_id: user.id, updated_at: new Date().toISOString(), [field]: value };
  const { error } = await sb.from("saves").upsert(payload, { onConflict: "user_id" });
  if (error) console.error("saveCloudField failed:", error);
}

// ---- widget UI ----
function buildAccountWidget() {
  const el = document.createElement("div");
  el.id = "accountWidget";
  el.className = "account-widget";
  document.body.appendChild(el);

  const modal = document.createElement("div");
  modal.id = "accountModal";
  modal.className = "account-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="account-modal-box">
      <div class="account-modal-header">
        <span id="accountModalTitle">log in</span>
        <button class="account-modal-close" id="accountModalClose">&times;</button>
      </div>
      <form id="accountForm" class="account-form">
        <input type="email" id="accountEmail" placeholder="email" autocomplete="username" required />
        <input type="password" id="accountPassword" placeholder="password" autocomplete="current-password" required />
        <p class="account-error" id="accountError" hidden></p>
        <button type="submit" class="btn account-submit" id="accountSubmit">log in</button>
        <button type="button" class="account-switch" id="accountSwitch">need an account? sign up</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  wireAccountWidget();
}

let accountMode = "login"; // or "signup"

function wireAccountWidget() {
  const widget = document.getElementById("accountWidget");
  const modal = document.getElementById("accountModal");
  const modalTitle = document.getElementById("accountModalTitle");
  const form = document.getElementById("accountForm");
  const emailInput = document.getElementById("accountEmail");
  const passwordInput = document.getElementById("accountPassword");
  const errorEl = document.getElementById("accountError");
  const submitBtn = document.getElementById("accountSubmit");
  const switchBtn = document.getElementById("accountSwitch");
  const closeBtn = document.getElementById("accountModalClose");

  function openModal(mode) {
    accountMode = mode;
    errorEl.hidden = true;
    form.reset();
    modalTitle.textContent = mode === "login" ? "log in" : "sign up";
    submitBtn.textContent = mode === "login" ? "log in" : "sign up";
    switchBtn.textContent = mode === "login" ? "need an account? sign up" : "have an account? log in";
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
  }

  switchBtn.addEventListener("click", () => openModal(accountMode === "login" ? "signup" : "login"));
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const { error } =
      accountMode === "login" ? await accountSignIn(email, password) : await accountSignUp(email, password);
    submitBtn.disabled = false;
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    closeModal();
    await renderAccountWidget();
    window.dispatchEvent(new CustomEvent("account:login"));
  });

  async function renderAccountWidget() {
    const user = await accountGetUser();
    if (user) {
      widget.innerHTML = `<span class="account-email">${user.email}</span><button class="btn account-btn" id="accountLogoutBtn">log out</button>`;
      document.getElementById("accountLogoutBtn").addEventListener("click", async () => {
        await accountSignOut();
        await renderAccountWidget();
        window.dispatchEvent(new CustomEvent("account:logout"));
      });
    } else {
      widget.innerHTML = `<button class="btn account-btn" id="accountLoginBtn">log in</button><button class="btn account-btn" id="accountSignupBtn">sign up</button>`;
      document.getElementById("accountLoginBtn").addEventListener("click", () => openModal("login"));
      document.getElementById("accountSignupBtn").addEventListener("click", () => openModal("signup"));
    }
  }

  renderAccountWidget();
  sb.auth.onAuthStateChange(() => renderAccountWidget());
}

document.addEventListener("DOMContentLoaded", buildAccountWidget);
