(function () {
  const cdns = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.35.1/dist/supabase.min.js",
    "https://unpkg.com/@supabase/supabase-js@2.35.1/dist/umd/supabase.min.js",
  ];

  function load(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve(src);
      s.onerror = () => reject(new Error("Falhou: " + src));
      document.head.appendChild(s);
    });
  }

  async function boot() {
    let ok = false;
    for (const url of cdns) {
      try {
        await load(url);
        if (window.supabase?.createClient) { ok = true; break; }
      } catch (e) {}
    }

    if (!ok) {
      const toast = document.getElementById("toast");
      if (toast) toast.textContent = "Não foi possível carregar o Supabase JS (rede bloqueou CDN).";
      console.error("Supabase CDN bloqueado.");
      return;
    }

    // carrega nossos scripts internos na ordem
    for (const src of ["connect-data.js", "auth-guards.js", "login.js"]) {
      await load("../scripts/" + src);
    }
  }

  boot();
})();
