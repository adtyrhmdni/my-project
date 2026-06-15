/**
 * =====================================================
 * SUPABASE CLIENT — ASISTEN AKADEMIK UNIVERSITAS SAPTA MANDIRI
 * =====================================================
 * Mengelola: Authentication, Conversations, Messages
 */

// ── Import Supabase dari CDN (ESM) ─────────────────────────────────────────
// Digunakan sebagai module, di-import dari HTML menggunakan type="module"

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ── Init Client ────────────────────────────────────────────────────────────
const supabaseClient = createClient(
  APP_CONFIG.supabase.url,
  APP_CONFIG.supabase.anonKey
);

// =====================================================
// AUTH FUNCTIONS
// =====================================================

const SupabaseAuth = {
  /**
   * Register user baru
   */
  async register(email, password, fullName) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { data, error };
  },

  /**
   * Login user
   */
  async login(email, password, remember = false) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && remember) {
      localStorage.setItem("rememberLogin", "true");
    }

    return { data, error };
  },

  /**
   * Logout user
   */
  async logout() {
    localStorage.removeItem("rememberLogin");
    const { error } = await supabaseClient.auth.signOut();
    return { error };
  },

  /**
   * Reset password via email
   */
  async resetPassword(email) {
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin + "/auth.html?mode=update-password",
      }
    );
    return { data, error };
  },

  /**
   * Update password baru
   */
  async updatePassword(newPassword) {
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  /**
   * Dapatkan session saat ini
   */
  async getSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    return { session, error };
  },

  /**
   * Dapatkan user saat ini
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    return { user, error };
  },

  /**
   * Listen perubahan auth state
   */
  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange(callback);
  },
};

// =====================================================
// DATABASE FUNCTIONS — CONVERSATIONS
// =====================================================

const SupabaseDB = {
  // ── Conversations ──────────────────────────────────

  /**
   * Buat percakapan baru
   */
  async createConversation(userId, title = "Percakapan Baru") {
    const { data, error } = await supabaseClient
      .from("conversations")
      .insert([{ user_id: userId, title }])
      .select()
      .single();
    return { data, error };
  },

  /**
   * Ambil semua percakapan user
   */
  async getConversations(userId) {
    const { data, error } = await supabaseClient
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    return { data, error };
  },

  /**
   * Update judul percakapan
   */
  async updateConversationTitle(conversationId, title) {
    const { data, error } = await supabaseClient
      .from("conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .select()
      .single();
    return { data, error };
  },

  /**
   * Update timestamp percakapan (saat ada pesan baru)
   */
  async touchConversation(conversationId) {
    const { error } = await supabaseClient
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    return { error };
  },

  /**
   * Hapus percakapan beserta semua pesan-nya
   */
  async deleteConversation(conversationId) {
    const { error } = await supabaseClient
      .from("conversations")
      .delete()
      .eq("id", conversationId);
    return { error };
  },

  /**
   * Hapus semua percakapan user
   */
  async deleteAllConversations(userId) {
    const { error } = await supabaseClient
      .from("conversations")
      .delete()
      .eq("user_id", userId);
    return { error };
  },

  // ── Messages ─────────────────────────────────────────

  /**
   * Simpan pesan baru
   */
  async saveMessage(conversationId, role, content) {
    const { data, error } = await supabaseClient
      .from("messages")
      .insert([{ conversation_id: conversationId, role, content }])
      .select()
      .single();
    return { data, error };
  },

  /**
   * Ambil semua pesan dalam percakapan
   */
  async getMessages(conversationId) {
    const { data, error } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return { data, error };
  },
};

// ── Export ─────────────────────────────────────────────────────────────────
window.SupabaseAuth = SupabaseAuth;
window.SupabaseDB = SupabaseDB;
window.supabaseClient = supabaseClient;
