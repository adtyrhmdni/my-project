/**
 * =====================================================
 * SCRIPT.JS — LANDING PAGE LOGIC
 * Asisten Akademik Universitas Sapta Mandiri
 * =====================================================
 */

// ── Theme Management ────────────────────────────────
const ThemeManager = {
  STORAGE_KEY: 'usm-theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY) || 'light';
    this.apply(saved);
    this.bindToggle();
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem(this.STORAGE_KEY, theme);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.apply(current === 'dark' ? 'light' : 'dark');
  },

  bindToggle() {
    document.querySelectorAll('#themeToggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });
  },
};

// ── Navbar Scroll ────────────────────────────────────
const NavbarManager = {
  init() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  },
};

// ── Mobile Menu ──────────────────────────────────────
const MobileMenu = {
  init() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      mobileMenu.setAttribute('aria-hidden', !isOpen);
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  },
};

// ── Smooth Scroll ────────────────────────────────────
const SmoothScroll = {
  init() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const navH = document.getElementById('navbar')?.offsetHeight || 72;
        const top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  },
};

// ── Scroll Reveal (Intersection Observer) ───────────
const ScrollReveal = {
  init() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.style.getPropertyValue('--delay') || '0s';
          entry.target.style.transitionDelay = delay;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach(item => observer.observe(item));
  },
};

// ── FAQ Accordion ────────────────────────────────────
const FAQAccordion = {
  init() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item   = btn.closest('.faq-item');
        const answer = item.querySelector('.faq-answer');
        const isOpen = item.classList.contains('open');

        // Close all
        document.querySelectorAll('.faq-item.open').forEach(el => {
          el.classList.remove('open');
          el.querySelector('.faq-answer').classList.remove('open');
          el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });

        // Open clicked (if was closed)
        if (!isOpen) {
          item.classList.add('open');
          answer.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  },
};

// ── Toast Notification ───────────────────────────────
const Toast = {
  show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span>${icons[type] || '💬'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  },
};

// Expose globally
window.Toast = Toast;

// ── Hero Animated Text ───────────────────────────────
const HeroAnimation = {
  init() {
    const badge = document.querySelector('.hero-badge');
    const title = document.querySelector('.hero-title');
    const sub   = document.querySelector('.hero-subtitle');
    const acts  = document.querySelector('.hero-actions');
    const stats = document.querySelector('.hero-stats');

    const els = [badge, title, sub, acts, stats].filter(Boolean);
    els.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`;
      requestAnimationFrame(() => {
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, 100);
      });
    });
  },
};

// ── Auth Redirect ────────────────────────────────────
const AuthRedirect = {
  async init() {
    // Check if user is already logged in, redirect to chat
    try {
      if (typeof window._supabaseCreateClient === 'function') {
        const client = window._supabaseCreateClient(
          APP_CONFIG.supabase.url,
          APP_CONFIG.supabase.anonKey
        );
        const { data: { session } } = await client.auth.getSession();
        if (session) {
          // Update navbar buttons to show "Buka Chat"
          const loginBtn    = document.getElementById('loginBtn');
          const registerBtn = document.getElementById('registerBtn');
          if (loginBtn) {
            loginBtn.textContent = 'Buka Chat';
            loginBtn.href = 'chat.html';
          }
          if (registerBtn) {
            registerBtn.textContent = 'Buka Chat';
            registerBtn.href = 'chat.html';
          }
        }
      }
    } catch (_) {}
  },
};

// ── Init All ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  NavbarManager.init();
  MobileMenu.init();
  SmoothScroll.init();
  ScrollReveal.init();
  FAQAccordion.init();
  HeroAnimation.init();
});
