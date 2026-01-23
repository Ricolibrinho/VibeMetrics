(() => {
  if (window.db) return;

  const SUPABASE_URL = "SUA_URL";
  const SUPABASE_ANON_KEY = "SUA_ANON_KEY";

  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage,
    },
  });


  window.ROUTES = {
    admin: "../admin/adm-dashboard.html",
    partner: "../partner/dashboard.html",
    promoter: "../promoter/upload.html",
    login: "../tela-login/tela-login.html",
  };
})();
