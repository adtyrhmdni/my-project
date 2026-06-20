/**
 * =====================================================
 * ADMIN.JS — DASHBOARD ADMINISTRATOR
 * Asisten Akademik Universitas Sapta Mandiri
 *
 * Arsitektur RAG:
 * Google Drive → n8n → OpenAI Embeddings → Supabase Vector Store → AI Agent → Chatbot
 *
 * Struktur modular — siap integrasi webhook n8n
 * =====================================================
 */

(function () {
  'use strict';

  // ════════════════════════════════════════════
  // ADMIN AUTH
  // ════════════════════════════════════════════
  const AdminAuth = {
    CREDENTIALS: { username: 'admin', password: 'admin123' },
    SESSION_KEY: 'usm-admin-session',

    login(username, password) {
      if (username === this.CREDENTIALS.username && password === this.CREDENTIALS.password) {
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
          user: username,
          loginTime: new Date().toISOString(),
        }));
        return true;
      }
      return false;
    },

    logout() {
      sessionStorage.removeItem(this.SESSION_KEY);
    },

    isAuthenticated() {
      return !!sessionStorage.getItem(this.SESSION_KEY);
    },

    getSession() {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    },
  };

  // ════════════════════════════════════════════
  // ADMIN DATA (Dummy — siap diganti webhook n8n)
  // ════════════════════════════════════════════
  const AdminData = {
    async getSystemStatus() {
      const ENDPOINT = 'https://n8n.srv1692781.hstgr.cloud/webhook/admin-api';
      const payload  = JSON.stringify({ action: 'status' });
      const t0 = Date.now();

      console.log('[AdminAPI] ▶ POST', ENDPOINT);
      console.log('[AdminAPI]   Body:', { action: 'status' });

      // ── Attempt 1: Proper CORS request ──
      let response;
      try {
        response = await fetch(ENDPOINT, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: payload,
        });
      } catch (corsErr) {
        const ms = Date.now() - t0;
        console.warn(`[AdminAPI] ✖ CORS/Network error (${ms}ms):`, corsErr.message);
        console.info('[AdminAPI] ℹ Jika error CORS: pastikan n8n workflow menambahkan response header:');
        console.info('           Access-Control-Allow-Origin: *');
        console.info('           Access-Control-Allow-Methods: POST, OPTIONS');
        console.info('           Access-Control-Allow-Headers: Content-Type, Accept');
        return this._buildStatusFallback(false, corsErr.message, ms);
      }

      const ms = Date.now() - t0;
      console.log(`[AdminAPI] ◀ HTTP ${response.status} ${response.statusText} (${ms}ms)`);

      const text = await response.text();
      console.log("raw text:", text);

      if (!response.ok) {
        console.warn('[AdminAPI] ✖ Error body:', text);
        return this._buildStatusFallback(false, `HTTP ${response.status}: ${response.statusText}`, ms);
      }

      let data;
      try {
        data = JSON.parse(text);
        console.log("parsed:", data);
      } catch (parseErr) {
        console.error('[AdminAPI] ✖ Response bukan JSON valid', text);
        return this._buildStatusFallback(false, 'Respons bukan JSON valid', ms);
      }

      // Flexible field mapping — support various n8n response key formats
      return {
        _meta: { ok: true, ms, timestamp: new Date().toISOString() },
        services: [
          { id: 'openai',      name: 'AI Service',   icon: '🤖', active: !!(data.openai      ?? data.ai_service   ?? data.openAI) },
          { id: 'supabase',    name: 'Supabase',     icon: '🗄️', active: !!(data.supabase    ?? data.database    ?? data.db) },
          { id: 'vectorstore', name: 'Vector Store', icon: '🔗', active: !!(data.vectorstore ?? data.vector_store ?? data.vectorStore) },
          { id: 'gdrive',      name: 'Google Drive', icon: '📁', active: !!(data.gdrive      ?? data.google_drive ?? data.googleDrive) },
        ],
      };
    },

    _buildStatusFallback(active, errorMsg, ms = 0) {
      return {
        _meta: { ok: false, ms, errorMsg, timestamp: new Date().toISOString() },
        services: [
          { id: 'openai',      name: 'AI Service',   icon: '🤖', active },
          { id: 'supabase',    name: 'Supabase',     icon: '🗄️', active },
          { id: 'vectorstore', name: 'Vector Store', icon: '🔗', active },
          { id: 'gdrive',      name: 'Google Drive', icon: '📁', active },
        ],
      };
    },

    getCounters() {
      return [
        { label: 'Jumlah Dokumen',   value: '6',     icon: '📄' },
        { label: 'Total Session',    value: '1.284', icon: '🔑' },
        { label: 'Total Percakapan', value: '3.547', icon: '💬' },
      ];
    },

    _documents: [],

    async fetchDocuments() {
      const ENDPOINT = 'https://n8n.srv1692781.hstgr.cloud/webhook/admin-api';
      const payload  = JSON.stringify({ action: 'list_documents' });

      console.log('[AdminAPI] ▶ POST', ENDPOINT, { action: 'list_documents' });

      let response;
      try {
        response = await fetch(ENDPOINT, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: payload,
        });
      } catch (err) {
        console.warn('[AdminAPI] ✖ Fetch documents network error:', err.message);
        return null;
      }

      const text = await response.text();
      console.log("raw text:", text);

      if (!response.ok) {
         console.warn('[AdminAPI] ✖ HTTP error:', response.status, text);
         return null;
      }

      let data;
      try {
        data = JSON.parse(text);
        console.log("parsed:", data);
      } catch (err) {
        console.error("Response bukan JSON valid", text);
        return null;
      }

      const docsArray = Array.isArray(data) ? data : (data && Array.isArray(data.documents) ? data.documents : null);
      
      if (docsArray) {
        console.log('[AdminAPI] fetchDocuments response documents:', docsArray);
        this._documents = docsArray.map(d => ({
          id: d.file_id || d.fileId || d.id || (d.json && (d.json.file_id || d.json.fileId || d.json.id)) || '',
          name: d.file_name || d.fileName || d.name || d.documentName || d.document_name || (d.json && (d.json.file_name || d.json.fileName || d.json.name || d.json.documentName)) || 'Nama dokumen tidak tersedia',
          date: d.created_at || d.createdAt || d.date || (d.json && (d.json.created_at || d.json.createdAt || d.json.date)) || new Date().toISOString().split('T')[0],
          size: d.file_size || d.fileSize || d.size || (d.json && (d.json.file_size || d.json.fileSize || d.json.size)) || '-',
          status: d.status || (d.json && d.json.status) || 'indexed'
        }));
        return this._documents;
      }
      return [];
    },

    async uploadDocument(file) {
      const ENDPOINT = 'https://n8n.srv1692781.hstgr.cloud/webhook/admin-api';
      console.log('[AdminAPI] ▶ POST (FormData)', ENDPOINT, { action: 'upload_document', file: file.name });

      const formData = new FormData();
      formData.append('action', 'upload_document');
      formData.append('file', file);

      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          // Jangan set Content-Type, biarkan browser yang set boundary untuk multipart/form-data
          body: formData,
        });

        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);

        let data = {};
        try {
          data = JSON.parse(text);
        } catch(e) {
          // Jika bukan JSON, tapi response.ok = true, anggap sukses dengan text sebagai pesan
          if (response.ok) return { success: true, message: text };
          throw new Error(text || 'Respons bukan JSON valid');
        }

        // Backend n8n mungkin tidak mengembalikan success: true secara eksplisit
        // Jadi kita anggap sukses jika HTTP status 200 OK
        if (response.ok) {
          return data;
        }

        if (data.success === false) {
          throw new Error(data.message || data.error || 'Gagal mengupload dokumen');
        }

        return data;
      } catch (err) {
        console.warn('[AdminAPI] ✖ Upload error:', err.message);
        throw err;
      }
    },

    async deleteDocument(fileId) {
      const ENDPOINT = 'https://n8n.srv1692781.hstgr.cloud/webhook/admin-api';
      console.log('[AdminAPI] ▶ POST delete_document for file_id:', fileId);
      
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ action: 'delete_document', file_id: fileId })
      });
      
      const text = await response.text();
      let data = {};
      try { 
        data = JSON.parse(text); 
      } catch (err) { 
        if (response.ok) return { success: true, message: text };
        throw new Error(text || 'Respons bukan JSON valid'); 
      }
      
      console.log('[AdminAPI] delete response:', data);
      
      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Gagal menghapus dokumen');
      }
      
      return data;
    },

    getDocuments() {
      return [...this._documents];
    },

    searchDocuments(query) {
      if (!query.trim()) return this.getDocuments();
      const q = query.toLowerCase();
      return this._documents.filter(d => d.name.toLowerCase().includes(q));
    },

    getStatistics() {
      return {
        today: 47,
        week: 312,
        totalSessions: '1.284',
        totalDocs: 6,
        topQuestions: [
          { text: 'Apa syarat untuk mengambil skripsi?',   count: 89 },
          { text: 'Bagaimana cara mengisi KRS?',           count: 76 },
          { text: 'Kapan jadwal ujian akhir semester?',    count: 64 },
          { text: 'Berapa IPK minimal untuk lulus?',       count: 52 },
          { text: 'Apa syarat yudisium?',                 count: 41 },
        ],
        lastActivity: '10 Jun 2026, 09:15',
      };
    },

    getActivityLogs() {
      return [
        { time: '10/06/2026 09:15', message: 'Admin login berhasil',                       type: 'info'    },
        { time: '09/06/2026 13:20', message: 'Refresh Embedding berhasil',                  type: 'success' },
        { time: '09/06/2026 13:17', message: 'Knowledge Base diperbarui',                   type: 'success' },
        { time: '09/06/2026 13:15', message: 'Sinkronisasi Google Drive berhasil',           type: 'success' },
        { time: '08/06/2026 10:00', message: 'Dokumen baru ditambahkan: SOP_KRS_KHS.pdf',   type: 'info'    },
        { time: '07/06/2026 14:30', message: 'Reindex Knowledge Base berhasil',              type: 'success' },
        { time: '06/06/2026 09:00', message: 'Sistem dimulai',                               type: 'info'    },
        { time: '05/06/2026 16:45', message: 'Dokumen dihapus: Draft_Panduan_v1.pdf',        type: 'warning' },
      ];
    },
  };

  // ════════════════════════════════════════════
  // TOAST (standalone — tidak bergantung pada chat.js)
  // ════════════════════════════════════════════
  function adminToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  // ════════════════════════════════════════════
  // WEBHOOK ACTIONS (Integrasi n8n)
  // ════════════════════════════════════════════

  async function _adminActionCall(actionName) {
    const ENDPOINT = 'https://n8n.srv1692781.hstgr.cloud/webhook/admin-api';
    console.log('[AdminAPI] Request:', actionName);

    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ action: actionName }),
      });
    } catch (err) {
      throw new Error(`Koneksi jaringan gagal: ${err.message}`);
    }

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Server merespons dengan HTTP ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Response bukan JSON valid", text);
      throw new Error('Respons API bukan JSON yang valid');
    }

    console.log('[AdminAPI] Response:', data);

    if (data.success !== true) {
      throw new Error(data.message || data.error || 'Operasi gagal di sisi server');
    }

    return data;
  }

  async function syncKnowledgeBase() {
    await _adminActionCall('sync_knowledge_base');
  }

  // ════════════════════════════════════════════
  // ADMIN UI — Render & Navigation
  // ════════════════════════════════════════════
  const AdminUI = {
    currentMenu: 'dashboard',

    // ── Modal Control ─────────────────────
    openModal() {
      const modal = document.getElementById('adminModal');
      if (!modal) return;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Selalu hapus sesi dan tampilkan info/login agar user harus login ulang
      AdminAuth.logout();
      this.showInfo();
    },

    closeModal() {
      const modal = document.getElementById('adminModal');
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    },

    showInfo() {
      const infoPanel = document.getElementById('adminInfoPanel');
      if (infoPanel) infoPanel.style.display = 'flex';
      
      const loginPanel = document.getElementById('adminLoginPanel');
      if (loginPanel) loginPanel.style.display = 'none';
      
      const dashboardPanel = document.getElementById('adminDashboardPanel');
      if (dashboardPanel) dashboardPanel.style.display = 'none';
    },

    showLogin() {
      const infoPanel = document.getElementById('adminInfoPanel');
      if (infoPanel) infoPanel.style.display = 'none';

      const loginPanel = document.getElementById('adminLoginPanel');
      if (loginPanel) loginPanel.style.display = 'flex';
      
      const dashboardPanel = document.getElementById('adminDashboardPanel');
      if (dashboardPanel) dashboardPanel.style.display = 'none';

      const form = document.getElementById('adminLoginForm');
      if (form) form.reset();
      const errEl = document.getElementById('adminLoginError');
      if (errEl) errEl.style.display = 'none';
    },

    showDashboard() {
      const infoPanel = document.getElementById('adminInfoPanel');
      if (infoPanel) infoPanel.style.display = 'none';

      const loginPanel = document.getElementById('adminLoginPanel');
      if (loginPanel) loginPanel.style.display = 'none';

      const dashboardPanel = document.getElementById('adminDashboardPanel');
      if (dashboardPanel) dashboardPanel.style.display = 'flex';

      this.switchMenu('dashboard');
    },

    // ── Menu Navigation ───────────────────
    switchMenu(menuId) {
      if (menuId === 'logout') {
        this.handleLogout();
        return;
      }

      this.currentMenu = menuId;

      // Update nav active state
      document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.menu === menuId);
      });

      // Render content
      const content = document.getElementById('adminContent');
      if (!content) return;

      // Set opacity before innerHTML so animation works
      content.style.transition = 'none';
      content.style.opacity = '0';
      content.style.transform = 'translateY(8px)';

      switch (menuId) {
        case 'dashboard':  content.innerHTML = this.renderDashboard();     break;
        case 'documents':  content.innerHTML = this.renderDocuments();     this.bindDocEvents(); break;
        case 'statistics': content.innerHTML = this.renderStatistics();    break;
        case 'logs':       content.innerHTML = this.renderLogs();          break;
      }

      // ── Trigger dashboard API fetch IMMEDIATELY after innerHTML is set ──
      // DOM nodes exist synchronously after innerHTML assignment.
      // We do NOT use setTimeout/rAF so the fetch fires in the same microtask queue.
      if (menuId === 'dashboard') {
        const refreshBtn = document.getElementById('statusRefreshBtn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => this.fetchAndRenderDashboardStatus(true));
        }
        this.fetchAndRenderDashboardStatus(); // async — does NOT block render
      } else if (menuId === 'documents') {
        this.fetchAndRenderDocuments();
      }

      // Animate content fade-in
      requestAnimationFrame(() => {
        content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
      });
    },

    // ══════════════════════════════════════
    // RENDER: DASHBOARD
    // ══════════════════════════════════════
    renderDashboard() {
      const counters = AdminData.getCounters();

      const counterCards = counters.map(c => `
        <div class="admin-counter-card">
          <span style="font-size:1.3rem">${c.icon}</span>
          <span class="admin-counter-value">${c.value}</span>
          <span class="admin-counter-label">${c.label}</span>
        </div>`).join('');

      // NOTE: fetch is triggered from switchMenu() AFTER DOM is ready — NOT here
      return `
        <div class="admin-content-header">
          <h2>Dashboard</h2>
          <p>Ringkasan status sistem dan informasi utama</p>
        </div>

        <div id="adminApiStatusBar" class="admin-api-bar loading">
          <span class="admin-api-bar-dot"></span>
          <span class="admin-api-bar-label">POST</span>
          <code class="admin-api-bar-url">https://n8n.srv1692781.hstgr.cloud/webhook/admin-api</code>
          <span class="admin-api-bar-status">Menghubungi…</span>
        </div>

        <div class="admin-status-header-row">
          <h4 class="admin-section-title" style="margin:0">Status Sistem</h4>
          <button class="admin-refresh-status-btn" id="statusRefreshBtn" title="Refresh status dari API">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Refresh
          </button>
        </div>

        <div class="admin-status-grid" id="dashboardStatusGrid">
          <div class="admin-status-loading" style="grid-column: 1 / -1">
            <span class="admin-status-spinner"></span>
            <span>Mengirim POST request ke n8n…</span>
          </div>
        </div>

        <h4 class="admin-section-title" style="margin-top: var(--sp-6)">Ringkasan</h4>
        <div class="admin-counter-grid">${counterCards}</div>`;
    },

    async fetchAndRenderDashboardStatus(isManualRefresh = false) {
      const grid = document.getElementById('dashboardStatusGrid');
      const apiBar = document.getElementById('adminApiStatusBar');
      if (!grid) return;

      const ENDPOINT = 'https://n8n.srv1692781.hstgr.cloud/webhook/admin-api';

      // Show loading in grid
      grid.innerHTML = `
        <div class="admin-status-loading" style="grid-column: 1 / -1">
          <span class="admin-status-spinner"></span>
          <span>${isManualRefresh ? 'Memperbarui…' : 'Mengirim request ke n8n…'}</span>
        </div>`;

      // Show loading in API bar
      if (apiBar) {
        apiBar.className = 'admin-api-bar loading';
        apiBar.innerHTML = `
          <span class="admin-api-bar-dot"></span>
          <span class="admin-api-bar-label">POST</span>
          <code class="admin-api-bar-url">${ENDPOINT}</code>
          <span class="admin-api-bar-status">Menghubungi…</span>`;
      }

      const refreshBtn = document.getElementById('statusRefreshBtn');
      if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.classList.add('spinning'); }

      const result = await AdminData.getSystemStatus();

      if (!document.getElementById('dashboardStatusGrid')) return;
      if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.classList.remove('spinning'); }

      const { _meta, services } = result;

      // Update API status bar
      if (apiBar) {
        if (_meta.ok) {
          apiBar.className = 'admin-api-bar success';
          apiBar.innerHTML = `
            <span class="admin-api-bar-dot"></span>
            <span class="admin-api-bar-label">POST</span>
            <code class="admin-api-bar-url">${ENDPOINT}</code>
            <span class="admin-api-bar-status">200 OK — ${_meta.ms}ms</span>
            <span class="admin-api-bar-time">${new Date(_meta.timestamp).toLocaleTimeString('id-ID')}</span>`;
        } else {
          apiBar.className = 'admin-api-bar error';
          apiBar.innerHTML = `
            <span class="admin-api-bar-dot"></span>
            <span class="admin-api-bar-label">POST</span>
            <code class="admin-api-bar-url">${ENDPOINT}</code>
            <span class="admin-api-bar-status">✖ ${_meta.errorMsg}</span>
            <span class="admin-api-bar-time">${new Date(_meta.timestamp).toLocaleTimeString('id-ID')}</span>`;
        }
      }

      // Show error state in grid
      if (!_meta.ok) {
        grid.innerHTML = `
          <div class="admin-status-error" style="grid-column: 1 / -1">
            <span>⚠️</span>
            <div>
              <div style="font-weight:600;margin-bottom:4px">Gagal menghubungi endpoint</div>
              <div style="font-size:var(--fs-xs);opacity:.7">${_meta.errorMsg}</div>
              <div style="font-size:var(--fs-xs);opacity:.5;margin-top:4px">Pastikan n8n workflow aktif dan CORS diaktifkan di response headers.</div>
            </div>
          </div>`;
        return;
      }

      // Render status cards
      grid.innerHTML = services.map(s => `
        <div class="admin-status-card">
          <div class="admin-status-icon ${s.active ? 'active' : 'inactive'}">${s.icon}</div>
          <div class="admin-status-info">
            <span class="admin-status-name">${s.name}</span>
            <span class="admin-status-label ${s.active ? 'active' : 'inactive'}">
              <span class="admin-status-dot ${s.active ? 'active' : 'inactive'}"></span>
              ${s.active ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
        </div>`).join('');
    },

    // ══════════════════════════════════════
    // RENDER: DAFTAR DOKUMEN
    // ══════════════════════════════════════
    renderDocuments() {
      // NOTE: fetch is triggered from switchMenu() AFTER DOM is ready
      return `
        <div class="admin-content-header">
          <h2>Daftar Dokumen</h2>
          <p>Dokumen knowledge base dari Google Drive</p>
        </div>
        <div class="admin-doc-toolbar">
          <input type="text" class="admin-doc-search" id="adminDocSearch"
                 placeholder="Cari dokumen..." aria-label="Cari dokumen" />
          <div style="display: flex; gap: 8px;">
            <button class="admin-refresh-btn" id="adminUploadDocBtn" aria-label="Upload Dokumen" style="background: #4f46e5; border-color: #4f46e5; color: white;">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Upload Dokumen
            </button>
            <button class="admin-refresh-btn" id="adminRefreshDocs" aria-label="Refresh daftar">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Refresh Daftar
            </button>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Nama File</th>
                <th>Tanggal Upload</th>
                <th>Ukuran</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="adminDocTableBody">
              <tr><td colspan="4" class="admin-doc-empty"><span class="admin-status-spinner" style="vertical-align: middle; margin-right: 8px;"></span>Memuat daftar dokumen...</td></tr>
            </tbody>
          </table>
        </div>`;
    },

    async fetchAndRenderDocuments() {
      const tbody = document.getElementById('adminDocTableBody');
      const refreshBtn = document.getElementById('adminRefreshDocs');
      
      if (!tbody) return;

      tbody.innerHTML = '<tr><td colspan="4" class="admin-doc-empty"><span class="admin-status-spinner" style="vertical-align: middle; margin-right: 8px;"></span>Memuat daftar dokumen...</td></tr>';
      
      if (refreshBtn) { refreshBtn.classList.add('spinning'); refreshBtn.disabled = true; }

      const docs = await AdminData.fetchDocuments();

      if (!document.getElementById('adminDocTableBody')) return; // Check if still on page
      
      if (refreshBtn) { refreshBtn.classList.remove('spinning'); refreshBtn.disabled = false; }

      if (docs === null) {
        tbody.innerHTML = '<tr><td colspan="4" class="admin-doc-empty" style="color:var(--clr-danger, #f87171)">Gagal memuat dokumen. Silakan coba lagi.</td></tr>';
        return;
      }

      tbody.innerHTML = this.renderDocRows(docs);
    },

    renderDocRows(docs) {
      if (!docs.length) {
        return `<tr><td colspan="5" class="admin-doc-empty">
          <div style="font-size: 2.5rem; margin-bottom: 12px">📄</div>
          <div style="font-weight: 600; margin-bottom: 8px">Belum ada dokumen</div>
          <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-bottom: 16px;">Upload dokumen PDF pertama untuk membangun knowledge base chatbot.</div>
          <button class="admin-refresh-btn" onclick="document.getElementById('adminUploadDocBtn')?.click()" style="background: #4f46e5; border-color: #4f46e5; color: white;">Upload Dokumen</button>
        </td></tr>`;
      }
      return docs.map(d => `
        <tr>
          <td style="font-weight:500">📄 ${d.name}</td>
          <td>${this.formatDate(d.date)}</td>
          <td>${d.size}</td>
          <td>
            <span class="doc-status ${d.status === 'indexed' ? 'indexed' : 'pending'}">
              ${d.status === 'indexed' ? '✅ Terindeks' : '⏳ Belum Terindeks'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="admin-table-action-btn action-delete" data-id="${d.id}" title="Hapus Dokumen" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🗑 Hapus</button>
            </div>
          </td>
        </tr>`).join('');
    },

    bindDocEvents() {
      const searchEl = document.getElementById('adminDocSearch');
      const tbody    = document.getElementById('adminDocTableBody');

      // Search filter
      searchEl?.addEventListener('input', () => {
        const docs = AdminData.searchDocuments(searchEl.value);
        if (tbody) tbody.innerHTML = this.renderDocRows(docs);
      });

      // Refresh button
      const refreshBtn = document.getElementById('adminRefreshDocs');
      refreshBtn?.addEventListener('click', () => {
        if (searchEl) searchEl.value = '';
        this.fetchAndRenderDocuments().then(() => {
          adminToast('Daftar dokumen berhasil diperbarui', 'success');
        });
      });

      // Upload Button
      const uploadBtn = document.getElementById('adminUploadDocBtn');
      uploadBtn?.addEventListener('click', () => {
        this.openUploadModal();
      });

      // Table Action Buttons (Delegated)
      tbody?.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('action-delete')) {
          const fileId = target.getAttribute('data-id');
          this.openConfirmDeleteModal(fileId, target);
        }
      });
    },

    openConfirmDeleteModal(fileId, targetBtn) {
      let modal = document.getElementById('adminConfirmModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'adminConfirmModal';
        modal.className = 'admin-modal';
        document.body.appendChild(modal);
      }
      modal.innerHTML = `
        <div class="admin-modal-overlay" id="adminConfirmOverlay"></div>
        <div class="admin-modal-container admin-info-card" style="max-width: 400px; z-index: 2;">
          <div class="admin-info-header" style="padding: 24px; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 12px; color: #f87171;">⚠️</div>
            <h2 style="font-size: 1.25rem; margin-bottom: 4px; color: white;">Hapus Dokumen</h2>
          </div>
          <div class="admin-info-content" style="padding: 24px; text-align: center;">
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 8px;">Dokumen akan dihapus dari Google Drive dan Knowledge Base.</p>
            <p style="color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 24px;">Tindakan ini tidak dapat dibatalkan.</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button class="admin-refresh-btn" id="adminCancelDeleteBtn" style="background: transparent; border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); min-width: 100px;">Batal</button>
              <button class="admin-refresh-btn" id="adminConfirmDeleteBtn" style="background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #f87171; min-width: 140px;">Hapus Dokumen</button>
            </div>
          </div>
        </div>
      `;

      const closeModal = () => {
        modal.classList.remove('open');
      };

      document.getElementById('adminConfirmOverlay').addEventListener('click', closeModal);
      document.getElementById('adminCancelDeleteBtn').addEventListener('click', closeModal);

      document.getElementById('adminConfirmDeleteBtn').addEventListener('click', async () => {
        closeModal();
        const originalText = targetBtn.innerHTML;
        targetBtn.innerHTML = '<span class="admin-status-spinner" style="width:10px;height:10px;border-width:2px;margin-right:4px;"></span>Menghapus...';
        targetBtn.disabled = true;
        targetBtn.style.opacity = '0.5';
        
        try {
          await AdminData.deleteDocument(fileId);
          adminToast('Dokumen berhasil dihapus', 'success');
          this.fetchAndRenderDocuments();
        } catch (err) {
          adminToast(err.message, 'error');
          targetBtn.innerHTML = originalText;
          targetBtn.disabled = false;
          targetBtn.style.opacity = '1';
        }
      });

      modal.classList.add('open');
    },

    openUploadModal() {
      // Buat modal jika belum ada
      let modal = document.getElementById('adminUploadModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'adminUploadModal';
        modal.className = 'admin-modal';
        modal.innerHTML = `
          <div class="admin-modal-overlay" id="adminUploadOverlay"></div>
          <div class="admin-modal-container admin-info-card" style="max-width: 500px; z-index: 2;">
            <button class="admin-close-btn" id="adminCloseUploadModal">&times;</button>
            <div class="admin-info-header" style="padding: 24px">
              <h2 style="font-size: 1.25rem; margin-bottom: 4px;">Upload Dokumen PDF</h2>
              <p style="margin: 0;">Pilih file PDF untuk ditambahkan ke Knowledge Base</p>
            </div>
            <div class="admin-info-content" style="padding: 24px">
              <div id="adminUploadDropArea" style="border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s">
                <div style="font-size: 2.5rem; margin-bottom: 12px">📄</div>
                <div style="font-weight: 600; margin-bottom: 8px">Klik atau Drag & Drop file PDF</div>
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5)">Maksimal ukuran file 10MB</div>
                <input type="file" id="adminUploadFileInput" accept="application/pdf" style="display: none" />
              </div>
              <div id="adminUploadFilePreview" style="display: none; margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; justify-content: space-between; align-items: center">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                  <span>📄</span>
                  <span id="adminUploadFileName" style="font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"></span>
                </div>
                <button id="adminUploadCancelFile" style="background: none; border: none; color: #f87171; cursor: pointer; font-size: 1.2rem">&times;</button>
              </div>
              <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end">
                <button class="admin-refresh-btn" id="adminCancelUploadBtn" style="background: transparent; border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7)">Batal</button>
                <button class="admin-refresh-btn" id="adminSubmitUploadBtn" style="background: #4f46e5; border-color: #4f46e5; color: white; opacity: 0.5; cursor: not-allowed;" disabled>Upload</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const overlay = document.getElementById('adminUploadOverlay');
        const closeBtn = document.getElementById('adminCloseUploadModal');
        const cancelBtn = document.getElementById('adminCancelUploadBtn');
        const dropArea = document.getElementById('adminUploadDropArea');
        const fileInput = document.getElementById('adminUploadFileInput');
        const filePreview = document.getElementById('adminUploadFilePreview');
        const fileName = document.getElementById('adminUploadFileName');
        const cancelFileBtn = document.getElementById('adminUploadCancelFile');
        const submitBtn = document.getElementById('adminSubmitUploadBtn');

        const closeModal = () => {
          modal.classList.remove('open');
          fileInput.value = '';
          filePreview.style.display = 'none';
          dropArea.style.display = 'block';
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.5';
          submitBtn.style.cursor = 'not-allowed';
          submitBtn.innerHTML = 'Upload';
        };

        overlay.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        dropArea.addEventListener('click', () => fileInput.click());
        dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.style.borderColor = '#4f46e5'; });
        dropArea.addEventListener('dragleave', () => { dropArea.style.borderColor = 'rgba(255,255,255,0.2)'; });
        dropArea.addEventListener('drop', (e) => {
          e.preventDefault();
          dropArea.style.borderColor = 'rgba(255,255,255,0.2)';
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
          }
        });

        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        });

        cancelFileBtn.addEventListener('click', () => {
          fileInput.value = '';
          filePreview.style.display = 'none';
          dropArea.style.display = 'block';
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.5';
          submitBtn.style.cursor = 'not-allowed';
        });

        const handleFileSelect = (file) => {
          if (file.type !== 'application/pdf') {
            adminToast('Hanya file PDF yang diperbolehkan', 'error');
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            adminToast('Ukuran file maksimal 10MB', 'error');
            return;
          }
          fileName.textContent = file.name;
          dropArea.style.display = 'none';
          filePreview.style.display = 'flex';
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
        };

        submitBtn.addEventListener('click', async () => {
          const file = fileInput.files[0];
          if (!file) return;

          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="admin-status-spinner" style="width: 14px; height: 14px; border-width: 2px;"></span> Mengupload...';

          try {
            await AdminData.uploadDocument(file);
            adminToast('Dokumen berhasil diupload dan diindeks', 'success');
            setTimeout(() => {
              closeModal();
              this.fetchAndRenderDocuments();
            }, 1000);
          } catch (err) {
            adminToast(err.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Upload';
          }
        });
      }

      modal.classList.add('open');
    },



    // ══════════════════════════════════════
    // RENDER: STATISTIK SISTEM
    // ══════════════════════════════════════
    renderStatistics() {
      const stats = AdminData.getStatistics();

      const topQs = stats.topQuestions.map((q, i) => `
        <div class="admin-stat-highlight-item">
          <span class="admin-stat-highlight-rank">${i + 1}</span>
          <span class="admin-stat-highlight-text">${q.text}</span>
          <span class="admin-stat-highlight-count">${q.count}×</span>
        </div>`).join('');

      return `
        <div class="admin-content-header">
          <h2>Statistik Sistem</h2>
          <p>Data penggunaan dan performa sistem</p>
        </div>

        <div class="admin-stat-grid">
          <div class="admin-stat-card">
            <span class="admin-stat-card-icon">📊</span>
            <span class="admin-stat-card-value">${stats.today}</span>
            <span class="admin-stat-card-label">Pertanyaan Hari Ini</span>
          </div>
          <div class="admin-stat-card">
            <span class="admin-stat-card-icon">📈</span>
            <span class="admin-stat-card-value">${stats.week}</span>
            <span class="admin-stat-card-label">Pertanyaan Minggu Ini</span>
          </div>
          <div class="admin-stat-card">
            <span class="admin-stat-card-icon">🔑</span>
            <span class="admin-stat-card-value">${stats.totalSessions}</span>
            <span class="admin-stat-card-label">Total Session</span>
          </div>
          <div class="admin-stat-card">
            <span class="admin-stat-card-icon">📄</span>
            <span class="admin-stat-card-value">${stats.totalDocs}</span>
            <span class="admin-stat-card-label">Total Dokumen</span>
          </div>
        </div>

        <div class="admin-stat-bottom">
          <div class="admin-stat-highlight">
            <h4>🏆 Pertanyaan Terbanyak</h4>
            ${topQs}
          </div>
          <div class="admin-stat-highlight">
            <h4>🕐 Aktivitas Terakhir</h4>
            <div class="admin-last-activity">
              <div class="admin-last-activity-main">
                <span class="admin-last-activity-dot">🟢</span>
                <div class="admin-last-activity-info">
                  <span class="admin-last-activity-time">${stats.lastActivity}</span>
                  <span class="admin-last-activity-label">Terakhir aktif</span>
                </div>
              </div>
              <div class="admin-last-activity-footer">
                Sistem berjalan normal. Semua layanan aktif.
              </div>
            </div>
          </div>
        </div>`;
    },

    // ══════════════════════════════════════
    // RENDER: LOG AKTIVITAS
    // ══════════════════════════════════════
    renderLogs() {
      const logs = AdminData.getActivityLogs();

      const items = logs.map((log, i) => `
        <div class="admin-log-item">
          <div class="admin-log-dot-col">
            <div class="admin-log-dot"></div>
            ${i < logs.length - 1 ? '<div class="admin-log-line"></div>' : ''}
          </div>
          <div class="admin-log-content">
            <span class="admin-log-time">${log.time}</span>
            <span class="admin-log-message">${log.message}</span>
            <span class="admin-log-tag ${log.type}">${
              log.type === 'success' ? 'Berhasil' :
              log.type === 'warning' ? 'Peringatan' : 'Info'
            }</span>
          </div>
        </div>`).join('');

      return `
        <div class="admin-content-header">
          <h2>Log Aktivitas</h2>
          <p>Riwayat aktivitas dan perubahan sistem</p>
        </div>
        <div class="admin-log-list">${items}</div>`;
    },

    // ── Logout ────────────────────────────
    handleLogout() {
      AdminAuth.logout();
      this.closeModal();
      adminToast('Administrator berhasil logout', 'success');
    },

    // ── Helpers ───────────────────────────
    formatDate(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    },
  };

  // ════════════════════════════════════════════
  // EVENT BINDINGS
  // ════════════════════════════════════════════
  function initAdmin() {
    // ── Tombol Pengaturan Sistem ─────────
    document.getElementById('adminSettingsBtn')?.addEventListener('click', () => {
      AdminUI.openModal();
    });

    // ── Go To Login ──────────────────────
    document.getElementById('btnGoToLogin')?.addEventListener('click', () => {
      AdminUI.showLogin();
    });

    // ── Close buttons ────────────────────
    document.getElementById('adminCloseInfo')?.addEventListener('click', () => AdminUI.closeModal());
    document.getElementById('adminCloseLogin')?.addEventListener('click', () => AdminUI.closeModal());
    document.getElementById('adminCloseDashboard')?.addEventListener('click', () => {
      const panel = document.getElementById('adminDashboardPanel');
      if (panel) {
        panel.style.transition = 'opacity 0.25s ease';
        panel.style.opacity = '0';
        setTimeout(() => {
          AdminAuth.logout();
          AdminUI.closeModal();
          AdminUI.showLogin();
          panel.style.opacity = '1';
          panel.style.transition = '';
        }, 250);
      } else {
        AdminAuth.logout();
        AdminUI.closeModal();
      }
    });

    // ── Overlay click ────────────────────
    document.getElementById('adminModalOverlay')?.addEventListener('click', () => AdminUI.closeModal());

    // ── Escape key ───────────────────────
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('adminModal');
        if (modal?.classList.contains('open')) {
          AdminUI.closeModal();
        }
      }
    });

    // ── Login form ───────────────────────
    document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('adminUsername')?.value.trim();
      const password = document.getElementById('adminPassword')?.value;
      const errEl    = document.getElementById('adminLoginError');

      if (!username || !password) {
        if (errEl) { errEl.textContent = 'Username dan password harus diisi'; errEl.style.display = 'block'; }
        return;
      }

      if (AdminAuth.login(username, password)) {
        AdminUI.showDashboard();
        adminToast('Login administrator berhasil', 'success');
      } else {
        if (errEl) { errEl.textContent = 'Username atau password salah'; errEl.style.display = 'block'; }
      }
    });

    // ── Nav menu clicks ──────────────────
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        AdminUI.switchMenu(item.dataset.menu);
      });
    });
  }

  // Init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
  } else {
    initAdmin();
  }

  // Expose for debugging / future extension
  // Run window.adminTestAPI() from browser console to test the webhook directly
  window.AdminDashboard = { AdminAuth, AdminData, AdminUI };
  window.adminTestAPI = () => AdminData.getSystemStatus().then(r => { console.table(r.services); return r; });

})();
