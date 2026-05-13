document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileBackdrop = document.getElementById("mobileBackdrop");

  const sidebar =
    document.querySelector(".old-sidebar") ||
    document.querySelector(".sidebar") ||
    document.querySelector(".side-nav");

  if (!mobileMenuBtn || !sidebar) return;

  function openMobileMenu() {
    sidebar.classList.add("open");
    mobileBackdrop?.classList.add("show");
    document.body.classList.add("menu-open");
  }

  function closeMobileMenu() {
    sidebar.classList.remove("open");
    mobileBackdrop?.classList.remove("show");
    document.body.classList.remove("menu-open");
  }

  mobileMenuBtn.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  mobileBackdrop?.addEventListener("click", closeMobileMenu);

  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 850) {
      closeMobileMenu();
    }
  });
});