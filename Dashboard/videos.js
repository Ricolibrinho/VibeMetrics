(async () => {
  const { data } = await supabaseClient.auth.getSession();

  if (!data?.session) {
    window.location.href = "../login.html";
    return;
  }
})();

const LOGIN_URL = "../login.html";

function parseYouTubeVideoId(url) {
  try {
    const u = new URL(url);
    // shorts: /shorts/VIDEOID
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1].split(/[?&#/]/)[0];
    // watch?v=VIDEOID
    const v = u.searchParams.get("v");
    if (v) return v;
    // youtu.be/VIDEOID
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "").split(/[?&#/]/)[0];
    return null;
  } catch {
    return null;
  }
}

function ytThumb(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

async function requireAuth() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data?.user) window.location.href = LOGIN_URL;
  return data.user;
}

// ---- UI ----
const grid = document.getElementById("videoGrid");
const addBtn = document.getElementById("addVideoBtn");
const modal = document.getElementById("videoModal");
const backdrop = document.getElementById("modalBackdrop");
const closeBtn = document.getElementById("closeModalBtn");
const saveBtn = document.getElementById("saveVideoBtn");

const fSearch = document.getElementById("fSearch");
const fNetwork = document.getElementById("fNetwork");

let currentUser = null;
let editingId = null;

function openModal(video = null) {
  modal.hidden = false;
  backdrop.hidden = false;

  const urlEl = document.getElementById("video_url");
  const netEl = document.getElementById("social_midia");
  const viewsEl = document.getElementById("views");
  const likesEl = document.getElementById("likes");
  const commentsEl = document.getElementById("comments");
  const sharesEl = document.getElementById("shares");
  const themeEl = document.getElementById("theme");

  if (!video) {
    editingId = null;
    urlEl.value = "";
    netEl.value = "youtube";
    viewsEl.value = "";
    likesEl.value = "";
    commentsEl.value = "";
    sharesEl.value = "";
    themeEl.value = "";
    return;
  }

  editingId = video.id;
  urlEl.value = video.video_url || "";
  netEl.value = video.social_midia || "youtube";
  viewsEl.value = video.views ?? "";
  likesEl.value = video.likes ?? "";
  commentsEl.value = video.comments ?? "";
  sharesEl.value = video.shares ?? "";
  themeEl.value = video.theme ?? "";
}

function closeModal() {
  modal.hidden = true;
  backdrop.hidden = true;
}

function cardTemplate(v) {
  const thumb = v.thumbnail_url || "";
  const title = v.theme ? v.theme : "Sem tema";
  const net = v.social_midia || "youtube";

  return `
  <div class="vcard" data-id="${v.id}">
    <div class="vthumb">
      ${thumb ? `<img src="${thumb}" alt="thumb">` : `<div class="vthumb-ph">Sem capa</div>`}
      <div class="vbadge">${net}</div>
    </div>
    <div class="vbody">
      <div class="vtitle">${title}</div>
      <div class="vurl">${(v.video_url || "").slice(0, 42)}${(v.video_url||"").length>42?"…":""}</div>

      <div class="vstats">
        <div><span>Views</span><b>${v.views ?? 0}</b></div>
        <div><span>Likes</span><b>${v.likes ?? 0}</b></div>
        <div><span>Com.</span><b>${v.comments ?? 0}</b></div>
        <div><span>Shares</span><b>${v.shares ?? 0}</b></div>
      </div>

      <div class="vactions">
        <button class="btn-sm" data-act="edit">Editar</button>
        <button class="btn-sm danger" data-act="del">Excluir</button>
      </div>
    </div>
  </div>`;
}

async function loadVideos() {
  const q = (fSearch.value || "").trim();
  const net = fNetwork.value;

  let query = supabaseClient
    .from("videos")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (net !== "all") query = query.eq("social_midia", net);
  if (q) query = query.ilike("video_url", `%${q}%`);

  const { data, error } = await query;
  if (error) return alert(error.message);

  grid.innerHTML = data.map(cardTemplate).join("");
}

grid.addEventListener("click", async (e) => {
  const card = e.target.closest(".vcard");
  const actBtn = e.target.closest("[data-act]");
  if (!card || !actBtn) return;

  const id = card.dataset.id;
  const act = actBtn.dataset.act;

  if (act === "del") {
    if (!confirm("Excluir este vídeo?")) return;
    const { error } = await supabaseClient.from("videos").delete().eq("id", id).eq("user_id", currentUser.id);
    if (error) alert(error.message);
    await loadVideos();
  }

  if (act === "edit") {
    const { data, error } = await supabaseClient.from("videos").select("*").eq("id", id).single();
    if (error) return alert(error.message);
    openModal(data);
  }
});

async function saveVideo() {
  const url = document.getElementById("video_url").value.trim();
  const social = document.getElementById("social_midia").value;
  const views = Number(document.getElementById("views").value || 0);
  const likes = Number(document.getElementById("likes").value || 0);
  const comments = Number(document.getElementById("comments").value || 0);
  const shares = Number(document.getElementById("shares").value || 0);
  const theme = document.getElementById("theme").value.trim();

  if (!url) return alert("Cole o link do vídeo.");

  let video_id = null;
  let thumbnail_url = null;

  if (social === "youtube") {
    video_id = parseYouTubeVideoId(url);
    if (!video_id) return alert("Link do YouTube inválido. Cole o link do Shorts ou watch.");
    thumbnail_url = ytThumb(video_id);
  }

  const payload = {
    user_id: currentUser.id,
    video_url: url,
    social_midia: social,
    views, likes, comments, shares,
    theme,
    video_id,
    thumbnail_url,
  };

  let res;
  if (editingId) {
    res = await supabaseClient.from("videos").update(payload).eq("id", editingId).eq("user_id", currentUser.id);
  } else {
    res = await supabaseClient.from("videos").insert([payload]);
  }

  if (res.error) return alert(res.error.message);

  closeModal();
  await loadVideos();
}

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await requireAuth();

  addBtn.addEventListener("click", () => openModal());
  closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  saveBtn.addEventListener("click", saveVideo);

  fSearch.addEventListener("input", loadVideos);
  fNetwork.addEventListener("change", loadVideos);

  await loadVideos();
});
