/**
 * =====================================================
 * AUTH.JS — AUTHENTICATION LOGIC (ES MODULE)
 * Asisten Akademik Universitas Sapta Mandiri
 * Menggunakan: Supabase Auth
 * =====================================================
 */

// ── Init Supabase ─────────────────────────────────────
const supabase = window._supabaseCreateClient(
  APP_CONFIG.supabase.url,
  APP_CONFIG.supabase.anonKey
);

// ── Toast ─────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// ── Theme Manager ────────────────────────────────────
const ThemeManager = {
  STORAGE_KEY: 'usm-theme',
  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY) || 'light';
    this.apply(saved);
    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggle());
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem(this.STORAGE_KEY, theme);
  },
  toggle() {
    const cur = document.documentElement.getAttribute('data-theme');
    this.apply(cur === 'dark' ? 'light' : 'dark');
  },
};

// ── Section Switch ────────────────────────────────────
function showSection(sectionId) {
  ['loginSection', 'registerSection', 'resetSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === sectionId ? 'flex' : 'none';
  });
}

// ── URL Mode ──────────────────────────────────────────
function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  const mode   = params.get('mode');
  if (mode === 'register') showSection('registerSection');
  else if (mode === 'reset') showSection('resetSection');
  else showSection('loginSection');
}

// ── Auth Redirect ─────────────────────────────────────
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.replace('chat.html');
  }
}

// ── Password Strength ─────────────────────────────────
function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function updateStrengthUI(password) {
  const bar  = document.getElementById('passwordStrength');
  const barEl= document.getElementById('strengthBar');
  const text = document.getElementById('strengthText');
  if (!bar || !barEl || !text) return;

  if (!password) {
    bar.className = 'password-strength';
    barEl.style.width = '0';
    text.textContent = '';
    return;
  }

  const score = checkPasswordStrength(password);
  bar.className = 'password-strength';
  if (score <= 2) {
    bar.classList.add('strength-weak');
    text.textContent = 'Lemah';
  } else if (score <= 3) {
    bar.classList.add('strength-medium');
    text.textContent = 'Sedang';
  } else {
    bar.classList.add('strength-strong');
    text.textContent = 'Kuat';
  }
}

// ── Toggle Password Visibility ────────────────────────
document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input    = document.getElementById(targetId);
    if (!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.setAttribute('aria-label', isText ? 'Tampilkan password' : 'Sembunyikan password');
  });
});

// ── Form Validation ───────────────────────────────────
function setError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);
  if (field)  field.classList.toggle('error', !!message);
  if (error)  error.textContent = message || '';
}

function clearFormErrors(formId) {
  document.querySelectorAll(`#${formId} .form-error`).forEach(el => el.textContent = '');
  document.querySelectorAll(`#${formId} .form-input`).forEach(el => el.classList.remove('error'));
}

// ── Button Loading State ──────────────────────────────
function setLoading(btnId, loading) {
  const btn     = document.getElementById(btnId);
  if (!btn) return;
  const textEl  = btn.querySelector('.btn-text');
  const spinEl  = btn.querySelector('.btn-spinner');
  btn.disabled  = loading;
  if (textEl)  textEl.style.display = loading ? 'none' : 'inline';
  if (spinEl)  spinEl.style.display = loading ? 'inline-block' : 'none';
}

// ── Alert ─────────────────────────────────────────────
function showAlert(alertId, message, type = 'error') {
  const el = document.getElementById(alertId);
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
}

// ════════════════════════════════════════════
// LOGIN FORM
// ════════════════════════════════════════════
const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormErrors('loginForm');
  showAlert('loginError', '');

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;

  let valid = true;
  if (!email) {
    setError('loginEmail', 'loginEmailError', 'Email wajib diisi');
    valid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    setError('loginEmail', 'loginEmailError', 'Format email tidak valid');
    valid = false;
  }
  if (!password) {
    setError('loginPassword', 'loginPasswordError', 'Password wajib diisi');
    valid = false;
  }
  if (!valid) return;

  setLoading('loginBtn', true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message.includes('Invalid login') || error.message.includes('invalid')
        ? 'Email atau password salah. Silakan coba lagi.'
        : error.message;
      showAlert('loginError', msg);
      setLoading('loginBtn', false);
      return;
    }

    if (remember) {
      localStorage.setItem('usm-remember', 'true');
    }

    showToast('Login berhasil! Mengalihkan...', 'success', 2000);
    setTimeout(() => window.location.replace('chat.html'), 800);

  } catch (err) {
    showAlert('loginError', 'Terjadi kesalahan. Periksa koneksi internet Anda.');
    setLoading('loginBtn', false);
  }
});

// ════════════════════════════════════════════
// REGISTER FORM
// ════════════════════════════════════════════
const registerPassword = document.getElementById('registerPassword');
registerPassword?.addEventListener('input', () => {
  updateStrengthUI(registerPassword.value);
});

const registerForm = document.getElementById('registerForm');
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormErrors('registerForm');
  showAlert('registerError', '');
  showAlert('registerSuccess', '');

  const fullName  = document.getElementById('registerName').value.trim();
  const email     = document.getElementById('registerEmail').value.trim();
  const password  = document.getElementById('registerPassword').value;
  const confirm   = document.getElementById('registerConfirm').value;

  let valid = true;
  if (!fullName || fullName.length < 2) {
    setError('registerName', 'registerNameError', 'Nama lengkap minimal 2 karakter');
    valid = false;
  }
  if (!email) {
    setError('registerEmail', 'registerEmailError', 'Email wajib diisi');
    valid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    setError('registerEmail', 'registerEmailError', 'Format email tidak valid');
    valid = false;
  }
  if (!password || password.length < 8) {
    setError('registerPassword', 'registerPasswordError', 'Password minimal 8 karakter');
    valid = false;
  }
  if (password !== confirm) {
    setError('registerConfirm', 'registerConfirmError', 'Konfirmasi password tidak cocok');
    valid = false;
  }
  if (!valid) return;

  setLoading('registerBtn', true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      const msg = error.message.includes('already registered') || error.message.includes('already')
        ? 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.'
        : error.message;
      showAlert('registerError', msg);
      setLoading('registerBtn', false);
      return;
    }

    // Check if email confirmation required
    if (data.user && !data.session) {
      showAlert('registerSuccess',
        '✅ Akun berhasil dibuat! Silakan cek email Anda untuk konfirmasi akun.',
        'success'
      );
    } else if (data.session) {
      showToast('Akun berhasil dibuat! Mengalihkan...', 'success', 2000);
      setTimeout(() => window.location.replace('chat.html'), 800);
    }

    setLoading('registerBtn', false);

  } catch (err) {
    showAlert('registerError', 'Terjadi kesalahan. Periksa koneksi internet Anda.');
    setLoading('registerBtn', false);
  }
});

// ════════════════════════════════════════════
// RESET PASSWORD FORM
// ════════════════════════════════════════════
const resetForm = document.getElementById('resetForm');
resetForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormErrors('resetForm');
  showAlert('resetError', '');
  showAlert('resetSuccess', '');

  const email = document.getElementById('resetEmail').value.trim();

  if (!email) {
    setError('resetEmail', 'resetEmailError', 'Email wajib diisi');
    return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    setError('resetEmail', 'resetEmailError', 'Format email tidak valid');
    return;
  }

  setLoading('resetBtn', true);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth.html?mode=update-password',
    });

    if (error) {
      showAlert('resetError', error.message);
      setLoading('resetBtn', false);
      return;
    }

    showAlert('resetSuccess',
      '✅ Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.',
      'success'
    );
    setLoading('resetBtn', false);

  } catch (err) {
    showAlert('resetError', 'Terjadi kesalahan. Periksa koneksi internet Anda.');
    setLoading('resetBtn', false);
  }
});

// ── Section Navigation Links ──────────────────────────
document.getElementById('goToRegister')?.addEventListener('click', e => {
  e.preventDefault();
  showSection('registerSection');
  window.history.replaceState({}, '', '?mode=register');
});
document.getElementById('goToLogin')?.addEventListener('click', e => {
  e.preventDefault();
  showSection('loginSection');
  window.history.replaceState({}, '', '?mode=login');
});
document.getElementById('goToReset')?.addEventListener('click', e => {
  e.preventDefault();
  showSection('resetSection');
  window.history.replaceState({}, '', '?mode=reset');
});
document.getElementById('goToLoginFromReset')?.addEventListener('click', e => {
  e.preventDefault();
  showSection('loginSection');
  window.history.replaceState({}, '', '?mode=login');
});

// ── Init ─────────────────────────────────────────────
ThemeManager.init();
initFromURL();
checkSession();

export default {};
