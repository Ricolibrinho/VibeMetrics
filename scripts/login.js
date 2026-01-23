document.addEventListener("DOMContentLoaded", () => {
  const THEME_KEY = "tv_theme";
  const html = document.documentElement;
  const toast = document.getElementById("toast");

  function toastMsg(msg) {
    if (toast) toast.textContent = msg || "";
  }

  function applyTheme(theme) {
    html.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);

    const icon = document.getElementById("themeIcon");
    const text = document.getElementById("themeText");
    if (icon) icon.textContent = theme === "light" ? "☀️" : "🌙";
    if (text) text.textContent = theme === "light" ? "Light" : "Dark";
  }

  applyTheme(localStorage.getItem(THEME_KEY) || "dark");

  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  // auto-redirect se já estiver logado
  (async () => {
    if (!window.db) return;
    const user = await window.AuthGuards.getSessionUser();
    if (user?.id) await window.AuthGuards.redirectByRole(user.id);
  })();

  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    toastMsg("");

    if (!window.db) return toastMsg("Supabase não iniciado.");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) return toastMsg("Preencha e-mail e senha.");

    const { data, error } = await window.db.auth.signInWithPassword({ email, password });

    if (error) return toastMsg("Login inválido.");
    await window.AuthGuards.redirectByRole(data.user.id);
  });
});
