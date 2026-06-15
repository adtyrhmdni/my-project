/**
 * admin-dashboard.js — Asisten Akademik USM
 * TIDAK ada inline onclick di tabel — semua pakai event delegation.
 * TIDAK ada addEventListener untuk uploadForm (sudah di HTML onsubmit).
 */

/* ================================================
   CONFIG
================================================ */
const ADMIN_API      = 'https://n8n.srv1692781.hstgr.cloud/webhook/admin-api';
const ADMIN_USER     = 'admin';
const ADMIN_PASS     = 'admin123';
const DOC_CACHE_KEY  = 'usm_docs_v4';
const FNAME_MAP_KEY  = 'usm_fname_map_v1';

/* ================================================
   STATE
================================================ */
var _deleteId    = null;
var _sidebarOpen = false;

/* ================================================
   FILENAME MAP (tidak dihapus saat Sinkronisasi)
================================================ */
function fmapGet() {
  try { return JSON.parse(localStorage.getItem(FNAME_MAP_KEY) || '{}'); } catch(e) { return {}; }
}
function fmapSet(id, name) {
  if (!id || !name) return;
  var m = fmapGet(); m[String(id)] = name;
  try { localStorage.setItem(FNAME_MAP_KEY, JSON.stringify(m)); } catch(e) {}
}
function fmapLookup(id) { return fmapGet()[String(id)] || null; }
function fmapRemove(id) {
  var m = fmapGet(); delete m[String(id)];
  try { localStorage.setItem(FNAME_MAP_KEY, JSON.stringify(m)); } catch(e) {}
}

/* ================================================
   DOC CACHE
================================================ */
function cacheAll() {
  try { return JSON.parse(localStorage.getItem(DOC_CACHE_KEY) || '[]'); } catch(e) { return []; }
}
function cacheSave(arr) {
  try { localStorage.setItem(DOC_CACHE_KEY, JSON.stringify(arr)); } catch(e) {}
}
function cacheUpsert(doc) {
  if (!doc || doc.id == null) return;
  var arr = cacheAll();
  var i   = arr.findIndex(function(d) { return String(d.id) === String(doc.id); });
  if (i >= 0) arr[i] = Object.assign({}, arr[i], doc);
  else arr.push(doc);
  cacheSave(arr);
}
function cacheRemove(id) {
  cacheSave(cacheAll().filter(function(d) { return String(d.id) !== String(id); }));
}

/* ================================================
   API
================================================ */
async function apiPost(body, isForm) {
  try {
    var opts = { method: 'POST' };
    if (isForm) { opts.body = body; }
    else { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body); }
    var res  = await fetch(ADMIN_API, opts);
    var text = await res.text();
    try { return JSON.parse(text); } catch(e) { return { _raw: text, success: res.ok }; }
  } catch(err) { console.error('[API]', err); return null; }
}

/* ================================================
   TOAST
================================================ */
function toast(msg, type) {
  type = type || 'info';
  var box = document.getElementById('toastContainer');
  if (!box) return;
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  var icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  el.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span><span>' + msg + '</span>';
  box.appendChild(el);
  requestAnimationFrame(function() { requestAnimationFrame(function() { el.classList.add('show'); }); });
  setTimeout(function() { el.classList.remove('show'); setTimeout(function() { el.remove(); }, 400); }, 4000);
}

/* ================================================
   FETCH N8N IDs (snapshot sebelum upload)
================================================ */
async function fetchN8nIds() {
  var data = await apiPost({ action: 'list_documents' });
  var ids  = {};
  if (!data) return ids;
  if (data.id) ids[String(data.id)] = true;
  if (Array.isArray(data.documents)) {
    data.documents.forEach(function(d) { if (d.id) ids[String(d.id)] = true; });
  }
  return ids;
}

/* ================================================
   POLLING SETELAH UPLOAD
================================================ */
async function pollForNewUpload(fileName, tempId, idsBefore, attempt) {
  if (!attempt) attempt = 0;
  if (attempt >= 10) {
    cacheRemove(tempId);
    renderDocTable();
    return;
  }
  await new Promise(function(r) { setTimeout(r, 2000); });
  var data = await apiPost({ action: 'list_documents' });
  if (!data) { pollForNewUpload(fileName, tempId, idsBefore, attempt + 1); return; }

  if (data.id) {
    var outerName = data.file_name || data.name || null;
    if (outerName) fmapSet(data.id, outerName);
    var exOuter = cacheAll().find(function(d) { return String(d.id) === String(data.id); });
    if (!exOuter || !exOuter._temp) {
      cacheUpsert({ id: data.id, file_id: data.file_id || '',
        file_name: outerName || fmapLookup(data.id) || ('Dokumen #' + data.id),
        status: data.status || 'indexed', created_at: data.created_at || '',
        _stub: false, _temp: false });
    }
  }

  var idsNow = {};
  if (data.id) idsNow[String(data.id)] = true;
  if (Array.isArray(data.documents)) {
    data.documents.forEach(function(d) { if (d.id) idsNow[String(d.id)] = true; });
  }

  var newIds = Object.keys(idsNow)
    .filter(function(id) { return !idsBefore[id]; })
    .map(Number).sort(function(a, b) { return b - a; });

  console.log('[Poll #' + (attempt+1) + '] newIds:', newIds, 'file:', fileName);

  if (newIds.length > 0) {
    cacheRemove(tempId);
    newIds.forEach(function(id) {
      fmapSet(id, fileName);
      cacheUpsert({ id: id, file_id: '', file_name: fileName,
        status: 'indexed', created_at: new Date().toISOString(), _stub: false, _temp: false });
    });
    toast('"' + fileName + '" berhasil ditambahkan!', 'success');
    renderDocTable();
  } else {
    renderDocTable();
    pollForNewUpload(fileName, tempId, idsBefore, attempt + 1);
  }
}

/* ================================================
   LOGIN
================================================ */
function openLoginModal() {
  document.getElementById('loginModalOverlay').classList.add('active');
  setTimeout(function() { var u = document.getElementById('loginUsername'); if (u) u.focus(); }, 120);
}
function closeLoginModal() {
  document.getElementById('loginModalOverlay').classList.remove('active');
}

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', function() {
  window.addEventListener('scroll', function() {
    var nav = document.getElementById('mainNav');
    if (nav) nav.style.boxShadow = window.scrollY > 20 ? '0 4px 24px rgba(0,0,0,.4)' : 'none';
  });

  ['loginModalOverlay', 'uploadModalOverlay', 'deleteModalOverlay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function(e) {
      if (e.target === e.currentTarget) e.target.classList.remove('active');
    });
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(function(m) { m.classList.remove('active'); });
    }
  });

  var loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var user  = document.getElementById('loginUsername').value.trim();
      var pass  = document.getElementById('loginPassword').value;
      var errEl = document.getElementById('loginError');
      var btn   = document.getElementById('loginSubmitBtn');
      var txt   = document.getElementById('loginBtnText');
      errEl.style.display = 'none';
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        btn.disabled = true; txt.textContent = 'Masuk...';
        setTimeout(function() {
          closeLoginModal(); showDashboard();
          btn.disabled = false; txt.textContent = 'Masuk'; loginForm.reset();
        }, 400);
      } else {
        errEl.textContent = 'Username atau password salah.';
        errEl.style.display = 'block';
        toast('Username atau password salah', 'error');
      }
    });
  }

  /* Event delegation untuk tombol di tabel dokumen */
  var tableContainer = document.getElementById('docTableContainer');
  if (tableContainer) {
    tableContainer.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id     = btn.getAttribute('data-id');
      var name   = btn.getAttribute('data-name');
      if (action === 'delete') { openDeleteModal(id, name); }
      if (action === 'rename') { renameStub(id); }
    });
  }

  var dz = document.getElementById('uploadDropzone');
  if (dz) {
    dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.style.borderColor = 'var(--c-primary)'; });
    dz.addEventListener('dragleave', function() { dz.style.borderColor = ''; });
    dz.addEventListener('drop', function(e) {
      e.preventDefault(); dz.style.borderColor = '';
      var f = e.dataTransfer.files[0];
      if (f && f.type === 'application/pdf') {
        var inp = document.getElementById('uploadFileInput');
        var dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files;
        onFileSelected(inp);
      } else { toast('Hanya file PDF yang diizinkan', 'error'); }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
});

/* ================================================
   DASHBOARD
================================================ */
function showDashboard() {
  document.getElementById('landingPage').style.display   = 'none';
  document.getElementById('dashboardPage').style.display = 'flex';
  loadStatus();
  loadDocuments();
}
function handleLogout() {
  document.getElementById('dashboardPage').style.display = 'none';
  document.getElementById('landingPage').style.display   = 'block';
  toast('Anda telah keluar dari dashboard', 'info');
}
function toggleSidebar() {
  _sidebarOpen = !_sidebarOpen;
  document.getElementById('dashSidebar').classList.toggle('open', _sidebarOpen);
}
function switchPanel(btn) {
  var pid = btn.getAttribute('data-panel');
  document.querySelectorAll('.dash-nav-item').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  document.querySelectorAll('.dash-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById(pid);
  if (panel) panel.classList.add('active');
  var titles = { panelDashboard: 'Dashboard', panelDocuments: 'Daftar Dokumen',
                 panelStats: 'Statistik Sistem', panelLogs: 'Log Aktivitas' };
  var te = document.getElementById('dashPageTitle');
  if (te) te.textContent = titles[pid] || '';
  if (pid === 'panelDashboard') loadStatus();
  if (pid === 'panelDocuments') loadDocuments();
  if (pid === 'panelStats')     loadStats();
  if (pid === 'panelLogs')      loadLogs();
  if (window.innerWidth < 900) { _sidebarOpen = false; document.getElementById('dashSidebar').classList.remove('open'); }
}

/* ================================================
   PANEL: STATUS
================================================ */
async function loadStatus() {
  var el = document.getElementById('statusCards');
  if (!el) return;
  el.innerHTML = '<div style="padding:1.5rem;color:var(--c-text-2)">Memuat status...</div>';
  var d = await apiPost({ action: 'status' });
  var services = [
    { key: 'openai', label: 'OpenAI', icon: '🤖' },
    { key: 'supabase', label: 'Supabase', icon: '🗄️' },
    { key: 'gdrive', label: 'Google Drive', icon: '📁' },
    { key: 'vectorstore', label: 'Vector Store', icon: '🔍' },
  ];
  var html = services.map(function(s) {
    var ok  = d && (d[s.key] === true || d[s.key] === 1 || d[s.key] === 'true');
    var dot = d ? (ok ? 'online' : 'offline') : 'loading';
    var txt = d ? (ok ? 'Online' : 'Offline') : '...';
    return '<div class="status-card"><div class="status-card-icon">' + s.icon + '</div>' +
           '<div class="status-card-label">' + s.label + '</div>' +
           '<div class="status-card-value"><div class="status-indicator">' +
           '<span class="dot ' + dot + '"></span><span>' + txt + '</span></div></div></div>';
  }).join('');
  if (d && d.total_documents != null)
    html += '<div class="status-card"><div class="status-card-icon">📄</div>' +
            '<div class="status-card-label">Total Dokumen</div>' +
            '<div class="status-card-value">' + d.total_documents + '</div></div>';
  el.innerHTML = html;
}

/* ================================================
   PANEL: DOKUMEN
================================================ */
async function loadDocuments() {
  var el = document.getElementById('docTableContainer');
  if (!el) return;
  renderDocTable();

  var data = await apiPost({ action: 'list_documents' });
  if (!data) { renderDocTable(); return; }

  var fmap = fmapGet();

  if (data.id) {
    var outerName = data.file_name || data.name || fmap[String(data.id)] || null;
    if (outerName) fmapSet(data.id, outerName);
    var exOuter = cacheAll().find(function(d) { return String(d.id) === String(data.id); });
    if (!exOuter || !exOuter._temp) {
      cacheUpsert({ id: data.id, file_id: data.file_id || '',
        file_name: outerName || ('Dokumen #' + data.id),
        status: data.status || 'indexed', created_at: data.created_at || '',
        _stub: false, _temp: false });
    }
  }

  if (Array.isArray(data.documents)) {
    var cachedIds = {};
    cacheAll().forEach(function(d) { cachedIds[String(d.id)] = true; });
    data.documents.forEach(function(d) {
      if (!d.id) return;
      var idStr     = String(d.id);
      var knownName = fmap[idStr];
      if (!cachedIds[idStr]) {
        cacheUpsert({ id: d.id, file_id: '', file_name: knownName || ('Dokumen #' + d.id),
          status: 'indexed', created_at: '', _stub: !knownName, _temp: false });
        cachedIds[idStr] = true;
      } else if (knownName) {
        var ex = cacheAll().find(function(c) { return String(c.id) === idStr; });
        if (ex && (ex._stub || !ex.file_name || ex.file_name === ('Dokumen #' + d.id))) {
          cacheUpsert(Object.assign({}, ex, { file_name: knownName, _stub: false }));
        }
      }
    });
  }

  renderDocTable();
}

/* Render tabel — pakai data-attribute, TIDAK ada inline onclick dengan quote */
function renderDocTable() {
  var el = document.getElementById('docTableContainer');
  if (!el) return;

  var all   = cacheAll();
  var temps = all.filter(function(d) { return !!d._temp; }).sort(function(a,b){ return Number(b.id)-Number(a.id); });
  var reals = all.filter(function(d) { return !d._temp; }).sort(function(a,b){ return Number(b.id)-Number(a.id); });
  var docs  = temps.concat(reals);

  if (docs.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div>' +
      '<h3>Belum ada dokumen</h3>' +
      '<p>Upload dokumen PDF untuk membangun knowledge base chatbot.</p></div>';
    return;
  }

  var rows = docs.map(function(d) {
    var name   = d.file_name || ('Dokumen #' + d.id);
    var fileId = d.file_id   || '—';
    var status = d._temp ? 'processing' : (d.status || 'indexed');
    var date   = d.created_at ? formatDate(d.created_at) : '—';
    var isTemp = !!d._temp;
    var isStub = !!d._stub && !d._temp;
    var idStr  = String(d.id);

    /* Tombol pakai data-action + data-id (aman untuk semua karakter) */
    var deleteBtn = isTemp ? '<span style="color:var(--c-text-2)">—</span>' :
      '<button class="btn-delete-row" data-action="delete" data-id="' + idStr + '" data-name="' + escAttr(name) + '">Hapus</button>';

    var stubNote = isStub ?
      '<div style="font-size:.75rem;color:var(--c-warning);margin-top:3px">⚠ Nama tidak diketahui — ' +
      '<button data-action="rename" data-id="' + idStr + '" style="background:none;border:none;color:var(--c-primary);' +
      'cursor:pointer;font-size:.75rem;text-decoration:underline;padding:0">Ganti nama</button></div>' : '';

    var tempNote = isTemp ?
      '<div style="font-size:.75rem;color:var(--c-primary);margin-top:3px">⏳ Menunggu konfirmasi server...</div>' : '';

    return '<tr style="' + (isStub ? 'opacity:.8' : '') + '">' +
      '<td><div class="file-name">' + escHtml(name) + '</div>' + tempNote + stubNote + '</td>' +
      '<td><div class="file-id" title="' + escAttr(fileId) + '">' + escHtml(fileId) + '</div></td>' +
      '<td><span class="status-badge ' + status + '">' + fmtStatus(status) + '</span></td>' +
      '<td>' + date + '</td>' +
      '<td>' + deleteBtn + '</td>' +
      '</tr>';
  }).join('');

  el.innerHTML = '<table class="admin-table"><thead><tr>' +
    '<th>Nama Dokumen</th><th>File ID</th><th>Status</th><th>Tanggal</th>' +
    '<th style="width:80px">Aksi</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

async function resetDocCache() {
  cacheSave([]);
  toast('Cache direset, memuat ulang...', 'info');
  await loadDocuments();
}

function renameStub(id) {
  var current = cacheAll().find(function(d) { return String(d.id) === String(id); });
  var newName = prompt('Masukkan nama file untuk Dokumen #' + id + ':', '');
  if (newName && newName.trim()) {
    fmapSet(id, newName.trim());
    cacheUpsert(Object.assign({}, current, { id: id, file_name: newName.trim(), _stub: false }));
    toast('Nama diperbarui: ' + newName.trim(), 'success');
    renderDocTable();
  }
}

/* ================================================
   PANEL: STATS
================================================ */
async function loadStats() {
  var el = document.getElementById('statsGrid');
  if (!el) return;
  el.innerHTML = '<div style="padding:2rem;color:var(--c-text-2)">Memuat statistik...</div>';
  var d = await apiPost({ action: 'status' });
  var realDocs = cacheAll().filter(function(x) { return !x._temp; }).length;
  var stats = [
    { label: 'Total Dokumen', value: (d && d.total_documents != null) ? d.total_documents : realDocs, icon: '📄' },
    { label: 'Total Chunk',   value: (d && d.total_chunks != null) ? d.total_chunks : '—',            icon: '🧩' },
    { label: 'Status OpenAI', value: (d && d.openai) ? 'Aktif' : 'Offline',                           icon: '🤖' },
    { label: 'Status DB',     value: (d && d.supabase) ? 'Normal' : 'Offline',                        icon: '🗄️' },
  ];
  el.innerHTML = stats.map(function(s) {
    return '<div class="stat-card"><div style="font-size:2rem;margin-bottom:.75rem">' + s.icon + '</div>' +
           '<div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + '</div></div>';
  }).join('');
}

/* ================================================
   PANEL: LOG
================================================ */
function loadLogs() {
  var el = document.getElementById('logContainer');
  if (!el) return;
  var logs = getLogs().slice().reverse();
  if (!logs.length) {
    el.innerHTML = '<div style="color:var(--c-text-2);padding:2rem;text-align:center">Belum ada aktivitas.</div>';
    return;
  }
  el.innerHTML = logs.map(function(l) {
    return '<div class="log-item"><span class="log-dot ' + l.type + '"></span>' +
           '<div><div class="log-msg">' + escHtml(l.msg) + '</div><div class="log-time">' + l.time + '</div></div></div>';
  }).join('');
}
function addLog(msg, type) {
  var logs = getLogs();
  logs.push({ msg: msg, type: type || 'info', time: new Date().toLocaleString('id-ID') });
  if (logs.length > 50) logs.shift();
  try { sessionStorage.setItem('usm_logs', JSON.stringify(logs)); } catch(e) {}
}
function getLogs() {
  try { return JSON.parse(sessionStorage.getItem('usm_logs') || '[]'); } catch(e) { return []; }
}

/* ================================================
   UPLOAD MODAL
   Form pakai onsubmit="handleUpload(event)" di HTML.
   JANGAN tambah addEventListener di sini!
================================================ */
function openUploadModal() { document.getElementById('uploadModalOverlay').classList.add('active'); }
function closeUploadModal() {
  document.getElementById('uploadModalOverlay').classList.remove('active');
  var form = document.getElementById('uploadForm');
  if (form) form.reset();
  var fn = document.getElementById('uploadFileName');
  if (fn) fn.style.display = 'none';
  var sb = document.getElementById('uploadSubmitBtn');
  if (sb) sb.disabled = true;
}
function onFileSelected(inp) {
  var f = inp.files[0];
  var fn = document.getElementById('uploadFileName');
  var sb = document.getElementById('uploadSubmitBtn');
  if (f) { if (fn) { fn.textContent = '📎 ' + f.name; fn.style.display = 'block'; } if (sb) sb.disabled = false; }
  else   { if (fn) fn.style.display = 'none'; if (sb) sb.disabled = true; }
}

async function handleUpload(e) {
  e.preventDefault();
  e.stopPropagation();
  var file = document.getElementById('uploadFileInput').files[0];
  if (!file) return;
  var btn = document.getElementById('uploadSubmitBtn');
  var txt = document.getElementById('uploadBtnText');
  if (btn.disabled) return;
  btn.disabled = true; txt.textContent = 'Memeriksa...';

  var idsBefore = await fetchN8nIds();
  console.log('[Upload] IDs sebelum:', Object.keys(idsBefore));
  txt.textContent = 'Mengupload...';

  var fd = new FormData();
  fd.append('action', 'upload_document');
  fd.append('file', file);
  var res = await apiPost(fd, true);
  console.log('[Upload] Response:', JSON.stringify(res));

  btn.disabled = false; txt.textContent = 'Upload';

  var ok = res && res.success !== false && !res.error;
  if (ok) {
    addLog('Upload: ' + file.name, 'success');
    var fileName = file.name;
    closeUploadModal();
    var tempId = 'tmp_' + Date.now();
    cacheUpsert({ id: tempId, file_id: '', file_name: fileName,
      status: 'processing', created_at: new Date().toISOString(), _stub: false, _temp: true });
    toast('Upload berhasil! Menunggu konfirmasi server...', 'success');
    renderDocTable();
    pollForNewUpload(fileName, tempId, idsBefore, 0);
  } else {
    var errMsg = (res && (res.message || res.error)) ? (res.message || res.error) : 'Upload gagal. Coba lagi.';
    toast(errMsg, 'error');
    addLog('Upload gagal: ' + file.name, 'error');
  }
}

/* ================================================
   DELETE MODAL
================================================ */
function openDeleteModal(id, name) {
  _deleteId = id;
  var btn = document.getElementById('deleteConfirmBtn');
  if (btn) { btn.textContent = 'Hapus Dokumen'; btn.disabled = false; }
  var nameEl = document.getElementById('deleteFileName');
  if (nameEl) nameEl.textContent = name || ('Dokumen #' + id);
  document.getElementById('deleteModalOverlay').classList.add('active');
}
function closeDeleteModal() {
  document.getElementById('deleteModalOverlay').classList.remove('active');
  _deleteId = null;
}
async function confirmDelete() {
  if (_deleteId == null) return;
  var btn = document.getElementById('deleteConfirmBtn');
  btn.textContent = 'Menghapus...'; btn.disabled = true;
  var id    = _deleteId;
  var numId = Number(id);
  var payload = (isNaN(numId) || String(id).indexOf('tmp_') === 0)
    ? { action: 'delete', documentId: id }
    : { action: 'delete', documentId: numId };
  var res = await apiPost(payload);
  console.log('[Delete]', JSON.stringify(res));
  if (res !== null) {
    toast('Dokumen berhasil dihapus', 'success');
    addLog('Hapus ID: ' + id, 'warning');
    fmapRemove(id);
    cacheRemove(id);
    closeDeleteModal();
    renderDocTable();
  } else {
    toast('Gagal menghapus. Periksa koneksi.', 'error');
    btn.textContent = 'Hapus Dokumen'; btn.disabled = false;
  }
}

/* ================================================
   FAQ
================================================ */
function toggleFaq(btn) {
  var ans    = btn.nextElementSibling;
  var isOpen = btn.classList.contains('open');
  document.querySelectorAll('.faq-q.open').forEach(function(q) {
    q.classList.remove('open');
    if (q.nextElementSibling) q.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) { btn.classList.add('open'); if (ans) ans.classList.add('open'); }
}

/* ================================================
   HELPERS
================================================ */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}
function fmtStatus(s) {
  return { indexed: 'Terindeks', processing: 'Diproses', error: 'Error' }[s] || s;
}
function formatDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch(e) { return str; }
}
