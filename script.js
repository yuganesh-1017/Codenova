// script.js

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  
  const emailGroup = emailInput.closest('.input-group');
  const passwordGroup = passwordInput.closest('.input-group');
  

  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  
  const submitBtn = document.querySelector('.submit-btn');
  const submitBtnText = submitBtn.querySelector('span');

  // 1. Password Visibility Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      
      const eyeOpenIcon = togglePasswordBtn.querySelector('.eye-open-icon');
      const eyeClosedIcon = togglePasswordBtn.querySelector('.eye-closed-icon');
      
      if (isPassword) {
        eyeOpenIcon.classList.add('hidden');
        eyeClosedIcon.classList.remove('hidden');
      } else {
        eyeOpenIcon.classList.remove('hidden');
        eyeClosedIcon.classList.add('hidden');
      }
    });
  }

  // Helper: Validate Email
  function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  }

  // 2. Real-time validation clear on input
  emailInput.addEventListener('input', () => {
    if (emailGroup.classList.contains('error')) {
      emailGroup.classList.remove('error');
    }
  });

  passwordInput.addEventListener('input', () => {
    if (passwordGroup.classList.contains('error')) {
      passwordGroup.classList.remove('error');
    }
  });

  // 3. Form Submit Validation & Loading Simulation
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      
      e.preventDefault();
      
      let isValid = true;
      const emailValue = emailInput.value.trim();
      const passwordValue = passwordInput.value;

      // Email Check
      if (!emailValue) {
        emailGroup.classList.add('error');
        emailError.textContent = 'Email address is required';
        isValid = false;
      } else if (!validateEmail(emailValue)) {
        emailGroup.classList.add('error');
        emailError.textContent = 'Please enter a valid email address';
        isValid = false;
      }

      // Password Check
      if (!passwordValue) {
        passwordGroup.classList.add('error');
        passwordError.textContent = 'Password is required';
        isValid = false;
      } else if (passwordValue.length < 6) {
        passwordGroup.classList.add('error');
        passwordError.textContent = 'Password must be at least 6 characters';
        isValid = false;
      }

      if (isValid) {
        // Trigger loading state animation
        submitBtn.disabled = true;
        submitBtn.style.pointerEvents = 'none';
        submitBtnText.textContent = 'Signing in...';
        submitBtn.style.opacity = '0.85';
        
        // Add a pulsing effect to button
        submitBtn.style.animation = 'pulseGlow 1.5s infinite alternate';

        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailValue, password: passwordValue })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            localStorage.setItem('cn_profile', JSON.stringify(data.profile));
            localStorage.setItem('cn_solved', JSON.stringify(data.profile.solved || []));
            localStorage.setItem('cn_solutions', JSON.stringify(data.profile.solutions || {}));
            
            const customMap = {};
            if (data.profile.customProblems) {
              data.profile.customProblems.forEach(p => {
                customMap[p.id] = p;
              });
            }
            localStorage.setItem('custom_problems', JSON.stringify(customMap));

            window.location.href = 'dashboard.html';
          } else {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.style.pointerEvents = 'auto';
            submitBtnText.textContent = 'Sign In';
            submitBtn.style.opacity = '1';
            submitBtn.style.animation = '';
            
            // Show error message
            passwordGroup.classList.add('error');
            passwordError.textContent = data.error || 'Invalid credentials';
          }
        })
        .catch(err => {
          submitBtn.disabled = false;
          submitBtn.style.pointerEvents = 'auto';
          submitBtnText.textContent = 'Sign In';
          submitBtn.style.opacity = '1';
          submitBtn.style.animation = '';
          alert('Connection error. Please try again.');
        });
      }
    });
  }

  // 4. Premium Mouse Interactive 3D Card Tilt Effect
  const card = document.querySelector('.signin-card');
  if (card && window.innerWidth > 768) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // cursor x relative to card
      const y = e.clientY - rect.top;  // cursor y relative to card
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate rotation based on cursor distance from card center
      // Max tilt: ~6 degrees (keep it subtle and elegant)
      const rotateX = ((centerY - y) / centerY) * 6; 
      const rotateY = ((x - centerX) / centerX) * 6;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      
      // Adjust shadow position and tint color dynamically based on tilt angle
      card.style.boxShadow = `
        ${-rotateY * 2.5}px ${rotateX * 2.5}px 60px rgba(0, 0, 0, 0.65), 
        inset 0 1px 0px rgba(255, 255, 255, 0.15),
        0 0 25px rgba(168, 85, 247, ${Math.min((Math.abs(rotateX) + Math.abs(rotateY)) / 12, 0.25)})
      `;
    });

    card.addEventListener('mouseleave', () => {
      // Smooth reset transition
      card.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
      card.style.boxShadow = '0 24px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0px rgba(255, 255, 255, 0.15)';
      
      // Clean up transition after animation completes to avoid mouse move lag
      setTimeout(() => {
        card.style.transition = '';
      }, 500);
    });
    
    card.addEventListener('mouseenter', () => {
      // Quick transition on enter to snap smooth
      card.style.transition = 'all 0.15s ease';
      setTimeout(() => {
        card.style.transition = '';
      }, 150);
    });
  }
});

// Dynamic pulse animation stylesheet injection
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes pulseGlow {
    from { box-shadow: 0 4px 15px rgba(219, 39, 119, 0.25); }
    to { box-shadow: 0 4px 25px rgba(236, 72, 153, 0.6), 0 0 15px rgba(168, 85, 247, 0.4); }
  }
`;
document.head.appendChild(styleSheet);
