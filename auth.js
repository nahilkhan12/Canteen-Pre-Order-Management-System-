(function () {
  'use strict';

  const SESSION_KEY = 'qb-blue-session-v1';
  const ACCOUNTS = Object.freeze({
    student: { name: 'Alex Johnson', email: 'student@quickbite.demo' },
    admin: { name: 'Campus Admin', email: 'admin@quickbite.demo' },
    kitchen: { name: 'Ravi Kumar', email: 'kitchen@quickbite.demo' }
  });
  const HOMES = Object.freeze({ student: 'index.html', admin: 'admin.html', kitchen: 'kitchen.html' });
  const validRole = role => Object.prototype.hasOwnProperty.call(ACCOUNTS, role);

  function getUser() {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null');
      if (!stored || !validRole(stored.role)) return null;
      const account = ACCOUNTS[stored.role];
      if (stored.email !== account.email || stored.name !== account.name) return null;
      return { role: stored.role, name: account.name, email: account.email };
    } catch (_) {
      return null;
    }
  }

  function requireRole(role) {
    if (!validRole(role)) throw new Error('Choose a valid account type.');
    const user = getUser();
    if (!user) {
      window.location.replace('login.html?role=' + encodeURIComponent(role));
      return null;
    }
    if (user.role !== role) {
      window.location.replace(HOMES[user.role]);
      return null;
    }
    return user;
  }

  function login(role, email, password) {
    if (!validRole(role)) throw new Error('Choose Student, Admin, or Kitchen to continue.');
    const account = ACCOUNTS[role];
    if (String(email).trim().toLowerCase() !== account.email || password !== 'quickbite123') {
      throw new Error('The email or password does not match this account type. Try the demo details below.');
    }
    const user = { role: role, name: account.name, email: account.email };
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (_) {
      throw new Error('Your browser could not save this demo session. Allow site storage, then try again.');
    }
    return user;
  }

  function logout() {
    try { window.sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* The login page stays accessible when storage is blocked. */ }
    window.location.href = 'login.html';
  }

  window.QBAuth = Object.freeze({ getUser: getUser, requireRole: requireRole, login: login, logout: logout });
})();
