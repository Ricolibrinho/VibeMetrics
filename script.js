// script.js (site público: index/login/cadastro)

// Fade-in
window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("fade-in");
});

// Fade-out ao navegar
document.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (e) => {
    if (link.href.includes(window.location.origin) && !link.href.includes("#")) {
      e.preventDefault();
      const target = link.href;
      document.body.style.opacity = "0";
      setTimeout(() => (window.location.href = target), 300);
    }
  });
});

// --------------------
// Supabase (usa o GLOBAL do Dashboard/app.js)
// --------------------
const supabaseClient = window.supabaseClient;

// Para onde mandar após login/cadastro
const DASHBOARD_URL = "Dashboard/tela_princ.html";

function showMsg(text) {
  const el = document.getElementById("msg");
  if (el) el.textContent = text;
  else alert(text);
}

// LOGIN
async function handleLogin() {
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    showMsg("Preencha email e senha.");
    return;
  }

  if (!window.supabaseClient) {
    alert("Erro interno: Supabase não inicializado.");
    return;
  }

  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showMsg(error.message);
    return;
  }

  // 🔒 garante que a sessão existe antes de redirecionar
  const { data: sessionData } = await window.supabaseClient.auth.getSession();

  if (!sessionData?.session) {
    alert("Falha ao iniciar sessão. Tente novamente.");
    return;
  }

  window.location.href = "Dashboard/tela_princ.html";
}


// CADASTRO
async function handleSignUp() {
  const fullName = document.getElementById("nome_completo")?.value?.trim();
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("senha")?.value;
  const confirm = document.getElementById("confirmar_senha")?.value;

  if (!fullName || !email || !password || !confirm) return showMsg("Preencha todos os campos.");
  if (password.length < 6) return showMsg("A senha deve ter pelo menos 6 caracteres.");
  if (password !== confirm) return showMsg("As senhas não coincidem.");

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) return showMsg(error.message);

  // Se email confirmation estiver ON, talvez não logue imediatamente
  showMsg("Conta criada. Agora faça login.");
  window.location.href = "login.html";
}

// Deixa as funções disponíveis pro onclick do HTML
window.handleLogin = handleLogin;
window.handleSignUp = handleSignUp;
