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

async function loadYouTubeStatus(user) {
  const ytStatus = $("ytStatus");
  const connectBtn = $("connectYouTubeBtn");
  const disconnectBtn = $("disconnectYouTubeBtn");

  const { data, error } = await supabaseClient
    .from("social_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "youtube")
    .maybeSingle();

  if (error) {
    ytStatus.textContent = "Erro";
    ytStatus.className = "badge danger";
    console.error(error);
    return;
  }

  if (data) {
    ytStatus.textContent = "Conectado";
    ytStatus.className = "badge success";
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
  } else {
    ytStatus.textContent = "Desconectado";
    ytStatus.className = "badge";
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
  }
}

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
