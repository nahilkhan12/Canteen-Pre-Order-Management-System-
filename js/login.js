(function () {
  'use strict';

  const roles = ['student', 'admin', 'kitchen'];
  const homes = { student: 'index.html', admin: 'admin.html', kitchen: 'kitchen.html' };
  const emails = { student: 'student@quickbite.demo', admin: 'admin@quickbite.demo', kitchen: 'kitchen@quickbite.demo' };
  const introductions = {
    student: 'Your next good meal is just a sign-in away.',
    admin: 'Keep your campus canteen running beautifully.',
    kitchen: 'Fresh orders, happy students. Let’s get cooking.'
  };
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const roleButtons = Array.from(document.querySelectorAll('[data-role]'));
  const requestedRole = new URLSearchParams(window.location.search).get('role');
  let selectedRole = roles.includes(requestedRole) ? requestedRole : 'student';

  function clearErrors() {
    loginError.hidden = true;
    loginError.textContent = '';
    [emailInput, passwordInput].forEach(input => {
      input.removeAttribute('aria-invalid');
      const error = document.getElementById(input.id + 'Error');
      error.hidden = true;
      error.textContent = '';
    });
  }

  function selectRole(role) {
    selectedRole = role;
    roleButtons.forEach(button => {
      const selected = button.dataset.role === role;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    emailInput.placeholder = emails[role];
    document.getElementById('demoEmail').textContent = emails[role];
    document.getElementById('loginSubmitLabel').textContent = 'Sign in as ' + role;
    document.querySelector('.login-intro').textContent = introductions[role];
    clearErrors();
  }

  roleButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectRole(button.dataset.role));
    button.addEventListener('keydown', event => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % roles.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index + roles.length - 1) % roles.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = roles.length - 1;
      else return;
      event.preventDefault();
      selectRole(roleButtons[nextIndex].dataset.role);
      roleButtons[nextIndex].focus();
    });
  });

  document.getElementById('fillDemoDetails').addEventListener('click', () => {
    emailInput.value = emails[selectedRole];
    passwordInput.value = 'quickbite123';
    clearErrors();
    document.getElementById('loginSubmit').focus();
  });

  document.getElementById('passwordToggle').addEventListener('click', event => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    event.currentTarget.textContent = show ? 'Hide' : 'Show';
    event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    event.currentTarget.setAttribute('aria-pressed', String(show));
  });

  function fieldError(input, message) {
    input.setAttribute('aria-invalid', 'true');
    const error = document.getElementById(input.id + 'Error');
    error.textContent = message;
    error.hidden = false;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearErrors();
    let invalid = false;
    if (!emailInput.value.trim()) {
      fieldError(emailInput, 'Enter your email address.');
      invalid = true;
    } else if (!emailInput.validity.valid) {
      fieldError(emailInput, 'Enter a valid email address.');
      invalid = true;
    }
    if (!passwordInput.value) {
      fieldError(passwordInput, 'Enter your password.');
      invalid = true;
    }
    if (invalid) {
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    try {
      const user = window.QBAuth.login(selectedRole, emailInput.value, passwordInput.value);
      document.getElementById('loginSubmit').disabled = true;
      document.getElementById('loginSubmitLabel').textContent = 'Signing you in…';
      window.location.href = homes[user.role];
    } catch (error) {
      loginError.textContent = error.message || 'We could not sign you in. Please try again.';
      loginError.hidden = false;
    }
  });

  [emailInput, passwordInput].forEach(input => input.addEventListener('input', clearErrors));
  const existingUser = window.QBAuth.getUser();
  document.getElementById('backToMenu').hidden = !existingUser || existingUser.role !== 'student';
  selectRole(selectedRole);
})();
