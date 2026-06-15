/**
 * =====================================================
 * CHAT.JS — CHATBOT LOGIC (ES MODULE)
 * Asisten Akademik Universitas Sapta Mandiri
 * Fitur: Multi-session, Riwayat, Markdown, n8n Webhook
 * =====================================================
 */

// ── Init Supabase ─────────────────────────────────────
const supabase = window._supabaseCreateClient(
  APP_CONFIG.supabase.url,
  APP_CONFIG.supabase.anonKey
);

// ── State ─────────────────────────────────────────────
const State = {
  user:              null,
  currentConvId:     null,
  conversations:     [],
  isLoading:         false,
  lastUserMessage:   null,
};

// ── DOM References ────────────────────────────────────
const DOM = {
  chatMessages:      document.getElementById('chatMessages'),
  chatInput:         document.getElementById('chatInput'),
  sendBtn:           document.getElementById('sendBtn'),
  chatWelcome:       document.getElementById('chatWelcome'),
  historyList:       document.getElementById('historyList'),
  historyEmpty:      document.getElementById('historyEmpty'),
  historySearch:     document.getElementById('historySearch'),
  chatSessionTitle:  document.getElementById('chatSessionTitle'),
  chatSidebar:       document.getElementById('chatSidebar'),
  sidebarOverlay:    document.getElementById('sidebarOverlay'),
  userAvatar:        document.getElementById('userAvatar'),
  userName:          document.getElementById('userName'),
  userEmail:         document.getElementById('userEmail'),
  userMenu:          document.getElementById('userMenu'),
  userProfileBtn:    document.getElementById('userProfileBtn'),
  themeMenuText:     document.getElementById('themeMenuText'),
  toastContainer:    document.getElementById('toast-container'),
};

// ════════════════════════════════════════════
// THEME MANAGER
// ════════════════════════════════════════════
const ThemeManager = {
  KEY: 'usm-theme',
  init() {
    const saved = localStorage.getItem(this.KEY) || 'light';
    this.apply(saved);
    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggle());
    document.getElementById('themeMenuBtn')?.addEventListener('click', () => {
      this.toggle();
      closeUserMenu();
    });
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-icon').forEach(el => {
      el.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
    if (DOM.themeMenuText) {
      DOM.themeMenuText.textContent = theme === 'dark' ? 'Mode Terang' : 'Mode Gelap';
    }
    localStorage.setItem(this.KEY, theme);
  },
  toggle() {
    const cur = document.documentElement.getAttribute('data-theme');
    this.apply(cur === 'dark' ? 'light' : 'dark');
  },
};

// ════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════
function showToast(message, type = 'info', duration = 4000) {
  if (!DOM.toastContainer) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// ════════════════════════════════════════════
// AUTH CHECK
// ════════════════════════════════════════════
async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (!session || error) {
    window.location.replace('auth.html');
    return false;
  }
  State.user = session.user;
  updateUserUI(session.user);
  return true;
}

function updateUserUI(user) {
  const meta     = user.user_metadata || {};
  const fullName = meta.full_name || user.email?.split('@')[0] || 'Pengguna';
  const email    = user.email || '';
  const initial  = fullName.charAt(0).toUpperCase();

  if (DOM.userAvatar)   DOM.userAvatar.textContent   = initial;
  if (DOM.userName)     DOM.userName.textContent     = fullName;
  if (DOM.userEmail)    DOM.userEmail.textContent    = email;
}

// ════════════════════════════════════════════
// SIDEBAR MOBILE
// ════════════════════════════════════════════
function openSidebar() {
  DOM.chatSidebar?.classList.add('open');
  DOM.sidebarOverlay?.classList.add('active');
  document.getElementById('openSidebarBtn')?.setAttribute('aria-expanded', 'true');
  document.getElementById('closeSidebarBtn').style.display = 'flex';
}

function closeSidebar() {
  DOM.chatSidebar?.classList.remove('open');
  DOM.sidebarOverlay?.classList.remove('active');
  document.getElementById('openSidebarBtn')?.setAttribute('aria-expanded', 'false');
  document.getElementById('closeSidebarBtn').style.display = 'none';
}

document.getElementById('openSidebarBtn')?.addEventListener('click', openSidebar);
document.getElementById('closeSidebarBtn')?.addEventListener('click', closeSidebar);
DOM.sidebarOverlay?.addEventListener('click', closeSidebar);

// ════════════════════════════════════════════
// USER MENU
// ════════════════════════════════════════════
function openUserMenu() {
  DOM.userMenu?.classList.add('open');
  DOM.userProfileBtn?.setAttribute('aria-expanded', 'true');
}

function closeUserMenu() {
  DOM.userMenu?.classList.remove('open');
  DOM.userProfileBtn?.setAttribute('aria-expanded', 'false');
}

DOM.userProfileBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  DOM.userMenu?.classList.contains('open') ? closeUserMenu() : openUserMenu();
});

document.addEventListener('click', (e) => {
  if (!DOM.userMenu?.contains(e.target) && !DOM.userProfileBtn?.contains(e.target)) {
    closeUserMenu();
  }
});

// Keyboard support
DOM.userProfileBtn?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    DOM.userMenu?.classList.contains('open') ? closeUserMenu() : openUserMenu();
  }
});

// ── Logout ────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  closeUserMenu();
  const { error } = await supabase.auth.signOut();
  if (!error) {
    showToast('Berhasil keluar. Sampai jumpa!', 'success', 2000);
    setTimeout(() => window.location.replace('auth.html'), 800);
  } else {
    showToast('Gagal keluar. Coba lagi.', 'error');
  }
});

// ════════════════════════════════════════════
// MARKDOWN RENDERER (Pure JS, No Library)
// ════════════════════════════════════════════
function renderMarkdown(text) {
  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```lang\n...\n```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (*text*)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Horizontal rule (---)
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquote (> text)
  html = html.replace(/^&gt;\s(.+)$/gm, '<blockquote>$1</blockquote>');

  // Headings
  html = html.replace(/^#{5}\s(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3}\s(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2}\s(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#{1}\s(.+)$/gm, '<h1>$1</h1>');

  // Unordered lists (- item or * item)
  html = html.replace(/^[\*\-]\s(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(?=\n<li>|$)/g, '<ul>$1</ul>');

  // Ordered lists (1. item)
  html = html.replace(/^\d+\.\s(.+)$/gm, '<oli>$1</oli>');
  html = html.replace(/(<oli>[\s\S]+?<\/oli>)(?=\n<oli>|$)/g, (m) => {
    return '<ol>' + m.replace(/<\/?oli>/g, (t) => t === '<oli>' ? '<li>' : '</li>') + '</ol>';
  });

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Line breaks → paragraphs
  const blocks = html.split(/\n{2,}/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-5]|ul|ol|pre|blockquote|hr)/.test(block)) return block;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// ════════════════════════════════════════════
// TIMESTAMP FORMATTER
// ════════════════════════════════════════════
function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hari ini';
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ════════════════════════════════════════════
// MESSAGE RENDERING
// ════════════════════════════════════════════
function createMessageEl(role, content, timestamp = null) {
  const group = document.createElement('div');
  group.className = 'message-group';

  const isUser = role === 'user';
  const time   = timestamp ? formatTime(timestamp) : formatTime(new Date().toISOString());
  const senderName = isUser ? 'Anda' : 'Asisten AI';

  group.innerHTML = `
    <div class="message ${isUser ? 'user-message' : 'ai-message'}">
      <div class="msg-avatar ${isUser ? 'user-avatar-chat' : 'ai-avatar-chat'}" aria-hidden="true">
        ${isUser ? (DOM.userAvatar?.textContent || 'U') : 'AI'}
      </div>
      <div class="msg-content">
        <span class="msg-sender">${senderName}</span>
        <div class="msg-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}">
          ${isUser ? escapeHTML(content) : renderMarkdown(content)}
        </div>
        <div class="msg-footer">
          <span class="msg-time">${time}</span>
          ${!isUser ? `<button class="msg-copy-btn" aria-label="Salin jawaban">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
            </svg>
            Salin
          </button>` : ''}
        </div>
      </div>
    </div>`;

  // Copy button handler
  const copyBtn = group.querySelector('.msg-copy-btn');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(content);
      copyBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg> Disalin!`;
      setTimeout(() => {
        copyBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
        </svg> Salin`;
      }, 2000);
    } catch {
      showToast('Gagal menyalin teks', 'error');
    }
  });

  return group;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function createTypingEl() {
  const el = document.createElement('div');
  el.className = 'typing-indicator';
  el.id = 'typingIndicator';
  el.setAttribute('aria-label', 'Asisten sedang mengetik');
  el.innerHTML = `
    <div class="msg-avatar ai-avatar-chat" aria-hidden="true">AI</div>
    <div class="typing-bubble" aria-hidden="true">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  return el;
}

function showTyping() {
  removeTyping();
  DOM.chatMessages.appendChild(createTypingEl());
  scrollToBottom();
}

function removeTyping() {
  document.getElementById('typingIndicator')?.remove();
}

function scrollToBottom(smooth = true) {
  DOM.chatMessages.scrollTo({
    top: DOM.chatMessages.scrollHeight,
    behavior: smooth ? 'smooth' : 'instant',
  });
}

function hideWelcome() {
  if (DOM.chatWelcome) DOM.chatWelcome.style.display = 'none';
}

function showWelcome() {
  if (DOM.chatWelcome) DOM.chatWelcome.style.display = 'flex';
}

// ════════════════════════════════════════════
// N8N WEBHOOK — SEND TO AI
// Dengan: timeout 60s, auto-retry, CORS handling
// ════════════════════════════════════════════

// Timeout wrapper — abort request jika melebihi batas waktu
function fetchWithTimeout(url, options, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// Parse response — coba semua kemungkinan field
function parseN8NResponse(data) {
  if (typeof data === 'string' && data.trim()) return data.trim();

  // Array response (n8n kadang return array of objects)
  if (Array.isArray(data)) {
    // Jika elemen adalah string, kembalikan yang pertama non-kosong
    for (const item of data) {
      if (typeof item === 'string' && item.trim()) return item.trim();
      // n8n sering mengemas hasil di item.json
      if (item && typeof item === 'object') {
        const maybe = item.json ?? item;
        const parsed = parseN8NResponse(maybe);
        if (parsed) return parsed;
      }
    }
    return null;
  }

  // Object response — coba semua field yang mungkin
  const candidates = [
    data?.output,
    data?.answer,
    data?.text,
    data?.message,
    data?.response,
    data?.result,
    data?.content,
    data?.reply,
    data?.data?.output,
    data?.data?.answer,
    data?.data?.text,
    data?.body?.output,
    data?.body?.answer,
    // n8n AI Agent node
    data?.json?.output,
    data?.json?.text,
    // tambahan: kadang n8n mengembalikan array di dalam data[0].json
    data?.[0]?.json?.text,
    data?.[0]?.json?.output,
    data?.[0]?.json?.answer,
    data?.[0]?.json?.data?.output,
  ];

  for (const val of candidates) {
    if (!val && typeof val === 'undefined') continue;
    if (typeof val === 'string' && val.trim()) return val.trim();
    if (val && typeof val === 'object') {
      const nested = parseN8NResponse(val);
      if (nested) return nested;
    }
  }

  return null;
}

async function queryN8N(question, retryCount = 0) {
  const MAX_RETRIES = 2;
  const TIMEOUT_MS  = 60000;

  try {
    console.log(`[n8n] Mengirim pertanyaan (percobaan ${retryCount + 1})...`);

    const response = await fetchWithTimeout(
      APP_CONFIG.webhook.url,
      {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':        'application/json, text/plain, */*',
        },
        mode: 'cors',
        body: JSON.stringify({ question }),
      },
      TIMEOUT_MS
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[n8n] HTTP ${response.status}:`, errText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`[n8n] HTTP status: ${response.status}`);
    console.log('[n8n] Response headers:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
    });

    // Baca sebagai TEXT dulu — hindari "Unexpected end of JSON input"
    const rawText = await response.text();
    console.log('[n8n] Raw response:', rawText);

    if (!rawText || !rawText.trim()) {
      throw new Error(
        'n8n merespons tapi body kosong. Pastikan workflow n8n Anda diakhiri dengan node "Respond to Webhook" yang mengembalikan JSON berisi jawaban. Contoh respons yang diharapkan: {"answer":"Halo, ini jawaban AI"} atau {"data":{"output":"..."}}. Contoh ekspresi di field value: {{$node["AI Agent"].json["output"]}}'
      );
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Bukan JSON — pakai sebagai teks langsung
      console.log('[n8n] Respons bukan JSON, pakai teks langsung');
      return rawText.trim();
    }

    console.log('[n8n] Response parsed:', data);

    const answer = parseN8NResponse(data);
    if (answer) return answer;

    console.warn('[n8n] Field tidak dikenali. Raw JSON:', JSON.stringify(data));
    return `Maaf, format respons dari server tidak dikenali. Silakan periksa konfigurasi workflow n8n Anda.`;

  } catch (err) {
    if (retryCount < MAX_RETRIES && (
      err.name === 'AbortError' ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError')
    )) {
      console.warn(`[n8n] Gagal, mencoba ulang... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, 1500 * (retryCount + 1)));
      return queryN8N(question, retryCount + 1);
    }
    if (err.name === 'AbortError') {
      throw new Error('Waktu tunggu habis (60 detik). n8n terlalu lambat atau tidak aktif.');
    }
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Tidak dapat terhubung ke server n8n. Pastikan workflow aktif.');
    }
    throw err;
  }
}

// ════════════════════════════════════════════

// CONVERSATIONS — SUPABASE
// ════════════════════════════════════════════
async function loadConversations() {
  if (!State.user) return;
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', State.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('loadConversations error:', error.message);
    return;
  }

  State.conversations = data || [];
  renderHistoryList(State.conversations);
}

async function createConversation(title = 'Percakapan Baru') {
  const { data, error } = await supabase
    .from('conversations')
    .insert([{ user_id: State.user.id, title }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateConvTitle(convId, title) {
  await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', convId);
}

async function touchConversation(convId) {
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', convId);
}

async function deleteConversation(convId) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', convId);
  if (error) throw error;
}

async function deleteAllConversations() {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', State.user.id);
  if (error) throw error;
}

async function loadMessages(convId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function saveMessage(convId, role, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ conversation_id: convId, role, content }])
    .select()
    .single();

  if (error) console.warn('saveMessage error:', error.message);
  return data;
}

// ════════════════════════════════════════════
// HISTORY LIST RENDER
// ════════════════════════════════════════════
function renderHistoryList(conversations, filter = '') {
  if (!DOM.historyList) return;

  const filtered = filter
    ? conversations.filter(c =>
        c.title.toLowerCase().includes(filter.toLowerCase()))
    : conversations;

  // Clear except the empty placeholder
  DOM.historyList.querySelectorAll('.history-item, .history-group-label').forEach(el => el.remove());

  if (!filtered.length) {
    if (DOM.historyEmpty) DOM.historyEmpty.style.display = 'flex';
    return;
  }

  if (DOM.historyEmpty) DOM.historyEmpty.style.display = 'none';

  // Group by date
  const groups = {};
  filtered.forEach(conv => {
    const label = formatDate(conv.updated_at || conv.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(conv);
  });

  Object.entries(groups).forEach(([label, convs]) => {
    const labelEl = document.createElement('div');
    labelEl.className = 'history-group-label';
    labelEl.textContent = label;
    DOM.historyList.appendChild(labelEl);

    convs.forEach(conv => {
      const item = createHistoryItem(conv);
      DOM.historyList.appendChild(item);
    });
  });
}

function createHistoryItem(conv) {
  const item = document.createElement('div');
  item.className = `history-item${State.currentConvId === conv.id ? ' active' : ''}`;
  item.dataset.convId = conv.id;
  item.setAttribute('role', 'listitem');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `Percakapan: ${conv.title}`);

  item.innerHTML = `
    <svg class="history-item-icon" width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 12h8M8 16h5M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="history-item-text">${escapeHTML(conv.title)}</span>
    <div class="history-item-actions">
      <button class="history-action-btn delete" title="Hapus percakapan" aria-label="Hapus percakapan">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16m-5-4H9"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`;

  // Click to load conversation
  item.addEventListener('click', (e) => {
    if (e.target.closest('.history-action-btn')) return;
    loadConversation(conv.id, conv.title);
    if (window.innerWidth <= 768) closeSidebar();
  });

  // Keyboard navigation
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      loadConversation(conv.id, conv.title);
      if (window.innerWidth <= 768) closeSidebar();
    }
  });

  // Delete button
  item.querySelector('.delete')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm(`Hapus percakapan "${conv.title}"?`)) return;
    try {
      await deleteConversation(conv.id);
      if (State.currentConvId === conv.id) {
        startNewConversation();
      }
      State.conversations = State.conversations.filter(c => c.id !== conv.id);
      renderHistoryList(State.conversations, DOM.historySearch?.value || '');
      showToast('Percakapan dihapus', 'success');
    } catch {
      showToast('Gagal menghapus percakapan', 'error');
    }
  });

  return item;
}

// ════════════════════════════════════════════
// CONVERSATION MANAGEMENT
// ════════════════════════════════════════════
function startNewConversation() {
  State.currentConvId = null;
  State.lastUserMessage = null;

  // Clear messages except welcome
  DOM.chatMessages.querySelectorAll('.message-group, .typing-indicator, .chat-error-msg').forEach(el => el.remove());
  showWelcome();

  // Update title
  if (DOM.chatSessionTitle) DOM.chatSessionTitle.textContent = 'Percakapan Baru';

  // Update sidebar active state
  DOM.historyList.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
}

async function loadConversation(convId, title) {
  State.currentConvId = convId;

  // Update title
  if (DOM.chatSessionTitle) DOM.chatSessionTitle.textContent = title;

  // Clear messages
  DOM.chatMessages.querySelectorAll('.message-group, .typing-indicator, .chat-error-msg').forEach(el => el.remove());
  hideWelcome();

  // Update active item in sidebar
  DOM.historyList.querySelectorAll('.history-item').forEach(el => {
    el.classList.toggle('active', el.dataset.convId === convId);
  });

  try {
    const messages = await loadMessages(convId);

    if (!messages.length) {
      showWelcome();
      return;
    }

    messages.forEach(msg => {
      const el = createMessageEl(msg.role, msg.content, msg.created_at);
      DOM.chatMessages.appendChild(el);
    });

    scrollToBottom(false);
  } catch (err) {
    showToast('Gagal memuat percakapan', 'error');
    console.error(err);
  }
}

// ════════════════════════════════════════════
// SEND MESSAGE
// ════════════════════════════════════════════
async function sendMessage(question) {
  if (!question.trim() || State.isLoading) return;

  State.isLoading = true;
  State.lastUserMessage = question;
  DOM.sendBtn.disabled = true;

  hideWelcome();

  // Append user message immediately
  const userMsgEl = createMessageEl('user', question, new Date().toISOString());
  DOM.chatMessages.appendChild(userMsgEl);
  scrollToBottom();

  // Clear input
  DOM.chatInput.value = '';
  autoResizeTextarea();

  // Create / ensure conversation exists
  let convId = State.currentConvId;
  let isNew  = false;

  if (!convId) {
    try {
      const title = question.length > 50
        ? question.substring(0, 47) + '...'
        : question;
      const conv = await createConversation(title);
      convId = conv.id;
      State.currentConvId = convId;
      isNew = true;

      // Add to local state & sidebar
      State.conversations.unshift(conv);
      renderHistoryList(State.conversations, DOM.historySearch?.value || '');

      if (DOM.chatSessionTitle) DOM.chatSessionTitle.textContent = title;

    } catch (err) {
      console.warn('createConversation error:', err.message);
    }
  }

  // Save user message to DB
  if (convId) {
    await saveMessage(convId, 'user', question);
  }

  // Show typing indicator
  showTyping();

  try {
    // Query n8n webhook
    const answer = await queryN8N(question);

    removeTyping();

    // Render AI response
    const aiMsgEl = createMessageEl('assistant', answer, new Date().toISOString());
    DOM.chatMessages.appendChild(aiMsgEl);
    scrollToBottom();

    // Save AI message to DB
    if (convId) {
      await saveMessage(convId, 'assistant', answer);
      await touchConversation(convId);
    }

    // Move conversation to top in sidebar
    if (convId) {
      State.conversations = State.conversations.filter(c => c.id !== convId);
      const conv = { id: convId, title: DOM.chatSessionTitle?.textContent || 'Percakapan', updated_at: new Date().toISOString() };
      State.conversations.unshift(conv);
      renderHistoryList(State.conversations, DOM.historySearch?.value || '');
    }

  } catch (err) {
    removeTyping();
    console.error('n8n error:', err);
    showErrorMessage(question, err.message);
  }

  State.isLoading = false;
  DOM.sendBtn.disabled = false;
  DOM.chatInput.focus();
}

function showErrorMessage(retryQuestion, errMsg = '') {
  // Remove any existing error
  DOM.chatMessages.querySelectorAll('.chat-error-msg').forEach(el => el.remove());

  const detail = errMsg
    ? `<small style="display:block;margin-top:4px;opacity:0.75;font-size:0.75rem">${errMsg}</small>`
    : '';

  const errEl = document.createElement('div');
  errEl.className = 'chat-error-msg';
  errEl.setAttribute('role', 'alert');
  errEl.innerHTML = `
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style="flex-shrink:0" aria-hidden="true">
      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Gagal mendapatkan respons. ${detail}</span>
    <button id="retryBtn" aria-label="Coba lagi">Coba Lagi</button>`;
  DOM.chatMessages.appendChild(errEl);
  scrollToBottom();

  document.getElementById('retryBtn')?.addEventListener('click', () => {
    errEl.remove();
    sendMessage(retryQuestion);
  });
}

// ════════════════════════════════════════════
// INPUT HANDLING
// ════════════════════════════════════════════
function autoResizeTextarea() {
  const ta = DOM.chatInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
}

DOM.chatInput?.addEventListener('input', () => {
  autoResizeTextarea();
  DOM.sendBtn.disabled = !DOM.chatInput.value.trim();
});

DOM.chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const val = DOM.chatInput.value.trim();
    if (val && !State.isLoading) sendMessage(val);
  }
});

DOM.sendBtn?.addEventListener('click', () => {
  const val = DOM.chatInput.value.trim();
  if (val && !State.isLoading) sendMessage(val);
});

// ── Suggestion buttons ──
document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.dataset.suggestion;
    if (text) {
      DOM.chatInput.value = text;
      autoResizeTextarea();
      DOM.sendBtn.disabled = false;
      DOM.chatInput.focus();
      sendMessage(text);
    }
  });
});

// ════════════════════════════════════════════
// NEW CHAT BUTTONS
// ════════════════════════════════════════════
function handleNewChat() {
  startNewConversation();
  if (window.innerWidth <= 768) closeSidebar();
  DOM.chatInput?.focus();
}

document.getElementById('newChatBtn')?.addEventListener('click', handleNewChat);
document.getElementById('newChatHeaderBtn')?.addEventListener('click', handleNewChat);

// ════════════════════════════════════════════
// HISTORY SEARCH
// ════════════════════════════════════════════
DOM.historySearch?.addEventListener('input', () => {
  renderHistoryList(State.conversations, DOM.historySearch.value);
});

// ════════════════════════════════════════════
// CLEAR ALL HISTORY
// ════════════════════════════════════════════
document.getElementById('clearAllBtn')?.addEventListener('click', async () => {
  if (!State.conversations.length) {
    showToast('Tidak ada riwayat untuk dihapus', 'info');
    return;
  }
  const confirmed = confirm('Hapus semua riwayat percakapan? Tindakan ini tidak dapat dibatalkan.');
  if (!confirmed) return;

  try {
    await deleteAllConversations();
    State.conversations = [];
    renderHistoryList([]);
    startNewConversation();
    showToast('Semua riwayat berhasil dihapus', 'success');
  } catch {
    showToast('Gagal menghapus riwayat', 'error');
  }
});

// ════════════════════════════════════════════
// MOBILE: Virtual keyboard fix
// ════════════════════════════════════════════
function handleViewportResize() {
  const vh = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--real-vh', `${vh}px`);
}

window.visualViewport?.addEventListener('resize', handleViewportResize);
window.addEventListener('resize', handleViewportResize);
handleViewportResize();

// ════════════════════════════════════════════
// INITIALIZE
// ════════════════════════════════════════════
async function init() {
  ThemeManager.init();

  const authed = await checkAuth();
  if (!authed) return;

  await loadConversations();

  // Focus input
  DOM.chatInput?.focus();
}

init();

export default {};
