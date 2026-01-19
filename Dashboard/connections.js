// Dashboard/connections.js
(async () => {
  const { data } = await supabaseClient.auth.getSession();

  if (!data?.session) {
    window.location.href = "../login.html";
    return;
  }
})();

const LOGIN_URL = "../login.html";

function $(id) {
  return document.getElementById(id);
}

async function requireAuth() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("auth.getUser error:", error);
    window.location.href = LOGIN_URL;
    return null;
  }

  if (!data?.user) {
    window.location.href = LOGIN_URL;
    return null;
  }

  return data.user;
}

async function getAccessTokenOrRedirect() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data?.session;

  // Se não tiver sessão válida, manda pro login
  if (!session?.access_token) {
    window.location.href = LOGIN_URL;
    return null;
  }
  return session.access_token;
}

async function connectYouTube() {
  // garante sessão
  const { data: sess } = await supabaseClient.auth.getSession();
  const token = sess?.session?.access_token;

  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  // chama a Edge Function com o SDK (ele injeta o JWT correto)
  const { data, error } = await supabaseClient.functions.invoke("oauth-youtube-start", {
    method: "POST",
    body: {},
  });

  if (error) {
    console.error("invoke error:", error);
    alert(`Erro ao iniciar conexão: ${error.message}`);
    return;
  }

  if (!data?.url) {
    console.error("no url returned:", data);
    alert("Edge Function não retornou a URL do Google.");
    return;
  }

  window.location.href = data.url;
}

window.connectYouTube = connectYouTube;

async function connectYouTube() {
  const { data } = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token;

  console.log("JWT head:", token?.slice(0, 25)); // debug

  const res = await fetch(`${window.__SUPABASE_URL__}/functions/v1/oauth-youtube-start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": window.__SUPABASE_ANON__,
      "Authorization": `Bearer ${token}`,
    },
    body: "{}",
  });

  const text = await res.text();
  console.log("start status:", res.status, text);

  if (!res.ok) return alert("Falhou: " + res.status);

  const json = JSON.parse(text);
  window.location.href = json.url;
}



async function disconnectYouTube(user) {
  if (!confirm("Desconectar YouTube?")) return;

  const { error } = await supabaseClient
    .from("social_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "youtube");

  if (error) return alert(error.message);

  await loadYouTubeStatus(user);
}

document.addEventListener("DOMContentLoaded", async () => {
  // menu user
  const userBtn = $("userBtn");
  const userMenu = $("userMenu");
  const logoutBtn = $("logoutBtn");

  const user = await requireAuth();
  if (!user) return;

  $("userEmail").textContent = user.email || "—";

  userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.hidden = !userMenu.hidden;
  });
  document.addEventListener("click", () => (userMenu.hidden = true));

  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = LOGIN_URL;
  });

  $("connectYouTubeBtn").addEventListener("click", connectYouTube);
  $("disconnectYouTubeBtn").addEventListener("click", () => disconnectYouTube(user));

  await loadYouTubeStatus(user);
});

