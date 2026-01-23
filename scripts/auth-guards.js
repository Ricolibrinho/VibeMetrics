window.AuthGuards = {
  async getSessionUser() {
    const { data } = await window.db.auth.getSession();
    return data.session?.user || null;
  },

  async getRole(userId) {
    const { data, error } = await window.db
      .from("profiles")
      .select("role,name")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data;
  },

  async redirectByRole(userId) {
    const p = await this.getRole(userId);
    if (!p?.role) return (location.href = window.ROUTES.login);
    location.href = window.ROUTES[p.role] || window.ROUTES.login;
  }
};
