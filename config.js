/**
 * =====================================================
 * KONFIGURASI ASISTEN AKADEMIK UNIVERSITAS SAPTA MANDIRI
 * =====================================================
 * Isi konfigurasi di bawah sebelum menjalankan aplikasi.
 */

const APP_CONFIG = {
  // ── SUPABASE ──────────────────────────────────────────
  supabase: {
    url: "https://zutlafefytoqrijhtrzl.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dGxhZmVmeXRvcXJpamh0cnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjUxMjIsImV4cCI6MjA5NjAwMTEyMn0.g8gm9rzfxn7_IAZSqDbqw-9EfLBuPlhB0U2JQvmYZ98", // ← Ganti dengan Anon Key Supabase Anda
  },

  // ── N8N WEBHOOK ────────────────────────────────────────
  webhook: {
    url: "https://n8n.srv1692781.hstgr.cloud/webhook/51140e13-39f0-495a-95f5-99ead8c1e985",
  },

  // ── APLIKASI ──────────────────────────────────────────
  app: {
    name: "Asisten Akademik",
    university: "Universitas Sapta Mandiri",
    version: "1.0.0",
    description: "Asisten Akademik berbasis AI untuk Universitas Sapta Mandiri",
  },
};

// Freeze agar tidak bisa diubah secara tidak sengaja
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.supabase);
Object.freeze(APP_CONFIG.webhook);
Object.freeze(APP_CONFIG.app);
