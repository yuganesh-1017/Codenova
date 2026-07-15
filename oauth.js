document.addEventListener('DOMContentLoaded', () => {
  function setupOAuthButton(btnId, provider) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        `${typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : ''}/api/auth/${provider}`,
        `${provider}Login`,
        `width=${width},height=${height},left=${left},top=${top}`
      );
    });
  }

  // Setup buttons if they exist
  setupOAuthButton('googleLoginBtn', 'google');
  setupOAuthButton('githubLoginBtn', 'github');
  setupOAuthButton('googleSignupBtn', 'google');
  setupOAuthButton('githubSignupBtn', 'github');
  
  // Disable discord buttons since we didn't implement backend for them yet
  ['discordLoginBtn', 'discordSignupBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Discord login is not implemented yet.');
      });
    }
  });

  // Listen for message from popup
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin OR the backend API URL
    const expectedOrigin = (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ? API_BASE_URL : window.location.origin;
    if (event.origin !== window.location.origin && event.origin !== expectedOrigin) return;

    if (event.data && event.data.type === 'oauth_success') {
      const profile = event.data.profile;
      
      // Save session data exactly like standard login
      localStorage.setItem('cn_profile', JSON.stringify(profile));
      localStorage.setItem('cn_solved', JSON.stringify(profile.solved || []));
      localStorage.setItem('cn_solutions', JSON.stringify(profile.solutions || {}));
      
      const customMap = {};
      if (profile.customProblems) {
        profile.customProblems.forEach(p => {
          customMap[p.id] = p;
        });
      }
      localStorage.setItem('cn_custom_problems', JSON.stringify(customMap));
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    }
  });
});
