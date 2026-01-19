// dashboard.js — versão limpa (Auth + Widgets + Supabase)

const LOGIN_URL = "../login.html"; // tela_princ.html está no mesmo nível do login.html

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}
function n(v){ const x = Number(v); return Number.isFinite(x) ? x : 0; }

// ---------- Settings (snap + theme) ----------
const SETTINGS_KEY = "vm_settings_v1";
let settings = loadSettings();

function loadSettings(){
  try{
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
      snap: true,
      snapSize: 24,
      theme: "dark_neo",
    };
  } catch {
    return { snap: true, snapSize: 24, theme: "dark_neo" };
  }
}
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function snap(v){
  if (!settings.snap) return v;
  const s = settings.snapSize || 24;
  return Math.round(v / s) * s;
}

// ---------- UI refs ----------
const canvas = $("canvas");
const addBtn = $("addCardBtn");
const modal = $("addModal");
const backdrop = $("modalBackdrop");
const closeModalBtn = $("closeModalBtn");
const cancelBtn = $("cancelBtn");
const addForm = $("addForm");
const metricSelect = $("metricSelect");
const networkSelect = $("networkSelect");
const titleInput = $("titleInput");

const userBtn = $("userBtn");
const userMenu = $("userMenu");
const userNameEl = $("userName");
const userPlanEl = $("userPlan");
const logoutBtn = $("logoutBtn");
const profileBtn = $("profileBtn");

const snapToggle = $("snapToggle");
const themeBtn = $("themeBtn");

// ---------- Labels ----------
const METRIC_LABEL = {
  views: "Visualizações",
  likes: "Curtidas",
  comments: "Comentários",
  shares: "Compartilhamentos",
  engagement: "Engajamento",
};
const NETWORK_LABEL = {
  all: "Geral",
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

// ---------- Widgets storage ----------
const STORAGE_KEY = "vm_widgets_v1";
let widgets = loadWidgets();

function loadWidgets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveWidgets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

// ---------- Modal ----------
function openModal() {
  modal.hidden = false;
  backdrop.hidden = false;
  metricSelect.value = "";
  networkSelect.value = "";
  titleInput.value = "";
}
function closeModal() {
  modal.hidden = true;
  backdrop.hidden = true;
}

// ---------- User menu ----------
function toggleUserMenu(force) {
  const willOpen = typeof force === "boolean" ? force : !userMenu.classList.contains("open");
  userMenu.classList.toggle("open", willOpen);
  userBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

// ---------- Supabase Auth guard ----------
let currentUser = null;

async function requireAuth(){
  if (!window.supabaseClient) {
    alert("Supabase não carregou. Confira se você adicionou o script do supabase + app.js antes do dashboard.js");
    window.location.href = LOGIN_URL;
    return null;
  }

  const { data, error } = await supabaseClient.auth.getUser();
  if (error) console.warn(error);

  currentUser = data?.user || null;

  if (!currentUser) {
    window.location.href = LOGIN_URL;
    return null;
  }
  return currentUser;
}

async function loadProfile(){
  // Nome básico vindo do Auth
  const name = currentUser?.user_metadata?.full_name || currentUser?.email || "Usuário";
  userNameEl.textContent = name;

  // Se você criou a tabela profiles (recomendado), tenta pegar o plano:
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("plan")
      .eq("id", currentUser.id)
      .single();

    if (!error && data?.plan) {
      userPlanEl.textContent = `Plano ${data.plan}`;
    } else {
      userPlanEl.textContent = "Plano Free";
    }
  } catch {
    userPlanEl.textContent = "Plano Free";
  }
}

// ---------- Supabase Data (REAL) ----------
async function fetchVideosForNetwork(network) {
  let q = supabaseClient
    .from("videos")
    .select("views,likes,comments,shares,social_midia,created_at");

  // por usuário
  q = q.eq("user_id", currentUser.id);

  // filtro de rede social
  if (network && network !== "all") {
    q = q.eq("social_midia", network);
  }

  // últimos 30 dias
  const since = new Date();
  since.setDate(since.getDate() - 30);
  q = q.gte("created_at", since.toISOString());

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function sumMetric(rows, metric) {
  let views = 0, likes = 0, comments = 0, shares = 0;

  for (const r of rows) {
    views += n(r.views);
    likes += n(r.likes);
    comments += n(r.comments);
    shares += n(r.shares);
  }

  if (metric === "views") return views;
  if (metric === "likes") return likes;
  if (metric === "comments") return comments;
  if (metric === "shares") return shares;

  if (metric === "engagement") {
    if (views <= 0) return 0;
    return (likes + comments + shares) / views;
  }

  return 0;
}

function formatMetric(metric, value) {
  if (metric === "engagement") return (value * 100).toFixed(1) + "%";
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

// spark ainda mock (depois fazemos real por dia)
function fakeSpark() {
  const arr = Array.from({ length: 8 }, () => Math.floor(Math.random() * 100) + 10);
  const max = Math.max(...arr);
  return arr.map(v => Math.round((v / max) * 100));
}

// ---------- Widgets DOM ----------
function createWidgetEl(w) {
  const el = document.createElement("div");
  el.className = "widget";
  el.dataset.id = w.id;

  el.style.left = (w.x ?? 18) + "px";
  el.style.top = (w.y ?? 18) + "px";
  el.style.width = (w.w ?? 320) + "px";
  el.style.height = (w.h ?? 170) + "px";

  const title = w.title || `${METRIC_LABEL[w.metric]} • ${NETWORK_LABEL[w.network]}`;
  const value = (w.value && w.value !== "_") ? w.value : "—";

  el.innerHTML = `
    <div class="w-head">
      <div>
        <div class="w-title">${escapeHtml(title)}</div>
        <div class="w-meta">${METRIC_LABEL[w.metric]} • ${NETWORK_LABEL[w.network]}</div>
      </div>
      <div class="w-actions">
        <button class="w-btn" data-action="refresh">⟳</button>
        <button class="w-btn" data-action="remove">🗑</button>

      </div>
    </div>

    <div class="w-body">
      <div class="big" data-value>${escapeHtml(value)}</div>
      <div class="sub">Últimos 30 dias</div>
      <div class="spark" data-spark></div>
    </div>

    <div class="resize-handle" data-resize></div>
  `;

  // spark
  const spark = el.querySelector("[data-spark]");
  const bars = (w.spark && w.spark.length ? w.spark : fakeSpark());
  spark.innerHTML = bars.map(h => `<span style="height:${h}%"></span>`).join("");

  // drag + resize
  enableDrag(el, el.querySelector(".w-head"));
  enableResize(el);

  return el;
}

function render() {
  canvas.innerHTML = "";
  widgets.forEach(w => canvas.appendChild(createWidgetEl(w)));
}

// event delegation (remove/refresh sempre funciona)
canvas.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  e.stopPropagation();

  const widgetEl = e.target.closest(".widget");
  if (!widgetEl) return;

  const id = widgetEl.dataset.id;
  const action = btn.dataset.action;

  if (action === "remove") removeWidget(id);
  if (action === "refresh") refreshWidget(id);
});

function removeWidget(id) {
  widgets = widgets.filter(w => w.id !== id);
  saveWidgets();
  render();
}

async function refreshWidget(id) {
  const w = widgets.find(x => x.id === id);
  if (!w) return;

  try {
    const rows = await fetchVideosForNetwork(w.network);
    const val = sumMetric(rows, w.metric);

    w.value = formatMetric(w.metric, val);
    w.spark = fakeSpark();

    saveWidgets();
    render();
  } catch (err) {
    alert("Erro ao carregar dados: " + (err?.message || "falha"));
  }
}

// ---------- Add widget ----------
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const metric = metricSelect.value;
  const network = networkSelect.value;
  if (!metric || !network) return;

  const rect = canvas.getBoundingClientRect();

  const newW = {
    id: crypto.randomUUID(),
    metric,
    network,
    title: titleInput.value.trim() || "",
    value: "_",
    spark: fakeSpark(),
    x: 18,
    y: 18,
    w: 320,
    h: 170,
  };

  if (widgets.length) {
    const last = widgets[widgets.length - 1];
    newW.x = Math.min(last.x + 24, rect.width - newW.w - 18);
    newW.y = Math.min(last.y + 24, rect.height - newW.h - 18);
  }

  widgets.push(newW);
  saveWidgets();
  render();
  closeModal();

  // já carrega dado real
  await refreshWidget(newW.id);
});

// ---------- Drag & Drop + Snap ----------
function enableDrag(widgetEl, handleEl) {
  let dragging = false;
  let startX = 0, startY = 0;
  let origX = 0, origY = 0;

  handleEl.addEventListener("pointerdown", (e) => {
   // Se clicou em botão do card, NÃO arrasta
   if (e.target.closest("[data-action]")) return;

   e.preventDefault();
   dragging = true;
   widgetEl.classList.add("dragging");
   widgetEl.setPointerCapture(e.pointerId);

   startX = e.clientX;
   startY = e.clientY;

   origX = parseFloat(widgetEl.style.left) || 0;
   origY = parseFloat(widgetEl.style.top) || 0;
  });

  widgetEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const canvasRect = canvas.getBoundingClientRect();
    const wRect = widgetEl.getBoundingClientRect();

    const maxX = canvasRect.width - wRect.width - 6;
    const maxY = canvasRect.height - wRect.height - 6;

    let nextX = clamp(origX + dx, 6, Math.max(6, maxX));
    let nextY = clamp(origY + dy, 6, Math.max(6, maxY));

    nextX = snap(nextX);
    nextY = snap(nextY);

    widgetEl.style.left = nextX + "px";
    widgetEl.style.top  = nextY + "px";
  });

  widgetEl.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    widgetEl.classList.remove("dragging");

    const id = widgetEl.dataset.id;
    const w = widgets.find(x => x.id === id);
    if (w) {
      w.x = parseFloat(widgetEl.style.left) || w.x;
      w.y = parseFloat(widgetEl.style.top) || w.y;
      saveWidgets();
    }
  });
}

// ---------- Resize ----------
function enableResize(widgetEl){
  const handle = widgetEl.querySelector("[data-resize]");
  if(!handle) return;

  let resizing=false, startX=0, startY=0, startW=0, startH=0;

  handle.addEventListener("pointerdown", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    resizing=true;
    handle.setPointerCapture(e.pointerId);
    startX=e.clientX; startY=e.clientY;
    startW=parseFloat(widgetEl.style.width)||320;
    startH=parseFloat(widgetEl.style.height)||170;
  });

  handle.addEventListener("pointermove", (e)=>{
    if(!resizing) return;
    const dx=e.clientX-startX;
    const dy=e.clientY-startY;

    const minW=260, minH=150;
    let nw = Math.max(minW, startW + dx);
    let nh = Math.max(minH, startH + dy);

    if (settings.snap) {
      nw = snap(nw);
      nh = snap(nh);
    }

    widgetEl.style.width = nw+"px";
    widgetEl.style.height = nh+"px";
  });

  handle.addEventListener("pointerup", ()=>{
    if(!resizing) return;
    resizing=false;

    const id = widgetEl.dataset.id;
    const w = widgets.find(x=>x.id===id);
    if(w){
      w.w = parseFloat(widgetEl.style.width) || w.w;
      w.h = parseFloat(widgetEl.style.height) || w.h;
      saveWidgets();
    }
  });
}

// ---------- Theme system ----------
const themes = ["light","light_cherry","dark_neo","dark_blue","dark"];

function applyTheme(name){
  document.documentElement.setAttribute("data-theme", name);
  settings.theme = name;
  saveSettings();
}

function nextTheme(){
  const cur = settings.theme || "dark_neo";
  const idx = themes.indexOf(cur);
  return themes[(idx + 1) % themes.length];
}

// ---------- Boot ----------
async function boot(){
  // theme e snap
  applyTheme(settings.theme || "dark_neo");

  snapToggle?.addEventListener("click", () => {
    settings.snap = !settings.snap;
    saveSettings();
    alert("Grid snapping: " + (settings.snap ? "ON" : "OFF"));
  });

  themeBtn?.addEventListener("click", () => {
    applyTheme(nextTheme());
  });

  // auth
  const u = await requireAuth();
  if (!u) return;

  await loadProfile();

  // UI binds
  addBtn?.addEventListener("click", openModal);
  closeModalBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  userBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleUserMenu();
  });
  document.addEventListener("click", () => toggleUserMenu(false));

  profileBtn?.addEventListener("click", () => {
    toggleUserMenu(false);
    alert("Configurar perfil (vamos montar a tela depois).");
  });

  logoutBtn?.addEventListener("click", async () => {
    toggleUserMenu(false);
    await supabaseClient.auth.signOut();
    window.location.href = LOGIN_URL;
  });

  // render só depois do auth
  render();

  // atualiza todos os widgets existentes com dados reais
  for (const w of widgets) {
    await refreshWidget(w.id);
  }
}

document.addEventListener("DOMContentLoaded", boot);
