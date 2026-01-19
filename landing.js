// landing.js
window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("fade-in");
});

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
