// dashboard.js
// Dashboard dynamic loader and interactive countdown controller

document.addEventListener('DOMContentLoaded', () => {


  // 2. Sync Banner greeting
  const greetingEl = document.querySelector('.banner-greeting');
  if (greetingEl) {
    const profile = getProfile();
    let name = profile.name || "Coder";
    greetingEl.textContent = `Hey ${name}! 👋`;
  }
});
