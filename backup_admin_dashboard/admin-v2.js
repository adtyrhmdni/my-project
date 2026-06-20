/**
 * admin-v2.js
 * Fresh rewrite of the Admin Panel Frontend.
 */

(function () {
  'use strict';

  const API_URL = 'https://n8n.srv1692781.hstgr.cloud/webhook/admin-api';

  // State
  let isAuthenticated = false;

  // DOM Elements
  const els = {
    overlay: document.getElementById('adminOverlayV2'),
    loginPanel: document.getElementById('adminLoginPanelV2'),
    dashboardPanel: document.getElementById('adminDashboardV2'),
    loginForm: document.getElementById('adminLoginFormV2'),
    usernameInput: document.getElementById('adminUsernameV2'),
    passwordInput: document.getElementById('adminPasswordV2'),
    closeBtn: document.getElementById('adminCloseBtnV2'),
    logoutBtn: document.getElementById('adminLogoutBtnV2'),
    navItems: document.querySelectorAll('.admin-nav-item'),
    panels: document.querySelectorAll('.admin-panel-v2'),
    
    // Status
    statusContainer: document.getElementById('adminStatusGrid'),
    
    // Documents
    docContainer: document.getElementById('adminDocContainer'),
    btnShowUpload: document.getElementById('adminShowUploadBtn'),
    
    // Upload Modal
    uploadModal: document.getElementById('adminUploadModal'),
    uploadForm: document.getElementById('adminUploadForm'),
    uploadFile: document.getElementById('adminUploadFile'),
    uploadSubmitBtn: document.getElementById('adminUploadSubmitBtn'),
    uploadCancelBtn: document.getElementById('adminUploadCancelBtn'),
    
    // Delete Modal
    deleteModal: document.getElementById('adminDeleteModal'),
    deleteConfirmBtn: document.getElementById('adminDeleteConfirmBtn'),
    deleteCancelBtn: document.getElementById('adminDeleteCancelBtn'),
    
    // Trigger
    triggerBtn: document.getElementById('adminSettingsTrigger')
  };

  // Safe API Fetch
  async function apiCall(bodyObj, isFormData = false) {
    try {
      const options = {
        method: 'POST'
      };
      
      if (isFormData) {
        options.body = bodyObj; // FormData
      } else {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(bodyObj);
      }

      const response = await fetch(API_URL, options);
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn("API returned non-JSON:", text);
        return { success: response.ok, message: text };
      }
    } catch (error) {
      console.error("API Error:", error);
      return null;
    }
  }

  // Toast System
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `admin-toast-v2 ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // UI Flow
  function openAdmin() {
    els.overlay.classList.add('active');
    if (isAuthenticated) {
      els.dashboardPanel.classList.add('active');
      els.loginPanel.classList.remove('active');
      loadDashboard();
    } else {
      els.loginPanel.classList.add('active');
      els.dashboardPanel.classList.remove('active');
    }
  }

  function closeAdmin() {
    els.overlay.classList.remove('active');
  }

  // Auth
  els.loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = els.usernameInput.value;
    const p = els.passwordInput.value;
    
    if (u === 'admin' && p === 'admin123') {
      isAuthenticated = true;
      els.usernameInput.value = '';
      els.passwordInput.value = '';
      els.loginPanel.classList.remove('active');
      els.dashboardPanel.classList.add('active');
      switchMenu('dashboard');
    } else {
      showToast('Username atau password salah', 'error');
    }
  });

  els.logoutBtn?.addEventListener('click', () => {
    isAuthenticated = false;
    closeAdmin();
    switchMenu('dashboard'); // reset
  });

  els.closeBtn?.addEventListener('click', closeAdmin);
  els.triggerBtn?.addEventListener('click', openAdmin);

  // Navigation
  els.navItems.forEach(item => {
    item.addEventListener('click', () => {
      if(item.id === 'adminLogoutBtnV2') return;
      const menu = item.getAttribute('data-menu');
      switchMenu(menu);
    });
  });

  function switchMenu(menuId) {
    els.navItems.forEach(i => i.classList.remove('active'));
    els.panels.forEach(p => p.classList.remove('active'));
    
    const activeNav = document.querySelector(`.admin-nav-item[data-menu="${menuId}"]`);
    const activePanel = document.getElementById(`panel-${menuId}`);
    
    if (activeNav) activeNav.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
    
    if (menuId === 'dashboard') loadDashboard();
    if (menuId === 'documents') loadDocuments();
  }

  // Status Dashboard
  async function loadDashboard() {
    els.statusContainer.innerHTML = '<div style="color:var(--admin-text-muted)">Memuat status sistem...</div>';
    
    const data = await apiCall({ action: 'status' });
    
    const services = [
      { key: 'openai', name: 'OpenAI' },
      { key: 'supabase', name: 'Supabase' },
      { key: 'gdrive', name: 'Google Drive' },
      { key: 'vectorstore', name: 'Vector Store' }
    ];
    
    let html = '';
    services.forEach(s => {
      // Default to false if missing
      const isOnline = data && data[s.key] ? true : false;
      const dotClass = isOnline ? 'online' : 'offline';
      const text = isOnline ? 'Online' : 'Offline';
      
      html += `
        <div class="admin-status-card">
          <div class="admin-status-title">${s.name}</div>
          <div class="admin-status-indicator">
            <span class="status-dot ${dotClass}"></span> ${text}
          </div>
        </div>
      `;
    });
    
    els.statusContainer.innerHTML = html;
  }

  // List Documents
  async function loadDocuments() {
    els.docContainer.innerHTML = '<tr><td colspan="3" style="text-align:center">Memuat dokumen...</td></tr>';
    
    const data = await apiCall({ action: 'list_documents' });
    
    let docList = [];
    if (Array.isArray(data)) {
      docList = data;
    } else if (data && typeof data === 'object') {
      if (data.file_name || data.name || data.title) {
        docList = [data]; // n8n returned a single document object
      } else if (data.data && Array.isArray(data.data)) {
        docList = data.data;
      } else if (data.documents && Array.isArray(data.documents)) {
        docList = data.documents;
      }
    }
    
    if (docList.length === 0) {
      els.docContainer.innerHTML = `
        <tr>
          <td colspan="3">
            <div class="admin-empty-state">
              <div class="admin-empty-icon">📄</div>
              <div class="admin-empty-text">Belum ada dokumen<br>Upload dokumen PDF pertama untuk membangun knowledge base chatbot.</div>
              <button class="admin-btn-upload" onclick="document.getElementById('adminShowUploadBtn').click()">+ Upload Dokumen</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    let html = '';
    docList.forEach(d => {
      const name = d.name || d.file_name || d.title || 'Unknown Document';
      const date = d.date || d.created_at || new Date().toLocaleDateString('id-ID');
      const id = d.id || d.file_id || '';
      
      html += `
        <tr>
          <td>${name}</td>
          <td>${date}</td>
          <td>
            <button class="admin-btn-delete" data-id="${id}">Hapus</button>
          </td>
        </tr>
      `;
    });
    
    els.docContainer.innerHTML = html;
    
    // Bind delete buttons
    document.querySelectorAll('.admin-btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        showDeleteConfirm(id);
      });
    });
  }

  // Upload Logic
  els.btnShowUpload?.addEventListener('click', () => {
    els.uploadModal.classList.add('active');
  });
  
  els.uploadCancelBtn?.addEventListener('click', () => {
    els.uploadModal.classList.remove('active');
    els.uploadForm.reset();
  });

  els.uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = els.uploadFile.files[0];
    if (!file) return;
    
    const originalText = els.uploadSubmitBtn.textContent;
    els.uploadSubmitBtn.textContent = 'Mengupload...';
    els.uploadSubmitBtn.disabled = true;
    
    const fd = new FormData();
    fd.append('action', 'upload_document');
    fd.append('file', file);
    
    await apiCall(fd, true);
    
    showToast('Dokumen berhasil diupload dan diproses', 'success');
    
    els.uploadSubmitBtn.textContent = originalText;
    els.uploadSubmitBtn.disabled = false;
    els.uploadModal.classList.remove('active');
    els.uploadForm.reset();
    
    loadDocuments();
  });

  // Delete Logic
  let documentToDelete = null;

  function showDeleteConfirm(id) {
    documentToDelete = id;
    els.deleteConfirmBtn.textContent = 'Hapus Dokumen';
    els.deleteConfirmBtn.disabled = false;
    els.deleteModal.classList.add('active');
  }

  els.deleteCancelBtn?.addEventListener('click', () => {
    els.deleteModal.classList.remove('active');
    documentToDelete = null;
  });

  els.deleteConfirmBtn?.addEventListener('click', async () => {
    if (!documentToDelete) return;
    
    els.deleteConfirmBtn.textContent = 'Menghapus...';
    els.deleteConfirmBtn.disabled = true;
    
    await apiCall({
      action: 'delete',
      documentId: documentToDelete
    });
    
    showToast('Dokumen berhasil dihapus', 'success');
    els.deleteModal.classList.remove('active');
    documentToDelete = null;
    
    loadDocuments();
  });

})();
