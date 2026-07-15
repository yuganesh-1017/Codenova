// dashboard.js
// Dashboard dynamic loader and interactive countdown controller

document.addEventListener('DOMContentLoaded', () => {
  // 1. Weekly Contest Countdown Timer
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 2);
  targetDate.setHours(targetDate.getHours() + 15);
  targetDate.setMinutes(targetDate.getMinutes() + 46);
  targetDate.setSeconds(0);

  const daysElement = document.getElementById('days');
  const hoursElement = document.getElementById('hours');
  const minutesElement = document.getElementById('minutes');

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;

    if (distance < 0) {
      if (daysElement) daysElement.textContent = '00';
      if (hoursElement) hoursElement.textContent = '00';
      if (minutesElement) minutesElement.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    if (daysElement) daysElement.textContent = String(days).padStart(2, '0');
    if (hoursElement) hoursElement.textContent = String(hours).padStart(2, '0');
    if (minutesElement) minutesElement.textContent = String(minutes).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 10000);

  // 2. Sync Banner greeting
  const greetingEl = document.querySelector('.banner-greeting');
  if (greetingEl) {
    const profile = getProfile();
    let name = profile.name || "Coder";
    greetingEl.textContent = `Hey ${name}! 👋`;
  }
});
