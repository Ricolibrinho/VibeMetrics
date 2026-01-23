(async () => {
  const toast = document.getElementById("toast");
  const msg = (t) => (toast.textContent = t || "");

  const user = await window.AuthGuards.getSessionUser();
  if (!user) return (location.href = window.ROUTES.login);

  const profile = await window.AuthGuards.getRole(user.id);
  if (!profile || profile.role !== "admin") return (location.href = window.ROUTES.login);

  // KPIs
  const [{ count: clients }, { count: promoters }, { count: photos }] = await Promise.all([
    window.db.from("clients").select("*", { count: "exact", head: true }),
    window.db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "promoter"),
    window.db.from("photos").select("*", { count: "exact", head: true }),
  ]);

  document.getElementById("kpiClients").textContent = clients ?? 0;
  document.getElementById("kpiPromoters").textContent = promoters ?? 0;
  document.getElementById("kpiPhotos").textContent = photos ?? 0;

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await window.db.auth.signOut();
    location.href = window.ROUTES.login;
  });

  msg("");
})();
