# 🎓 Asisten Akademik Universitas Sapta Mandiri

> **Chatbot Akademik berbasis AI (RAG + Supabase + n8n)**  
> Proyek Skripsi — Website modern, responsive, PWA-ready

---

## 📋 Daftar Isi

1. [Deskripsi Proyek](#deskripsi-proyek)
2. [Struktur File](#struktur-file)
3. [Prasyarat](#prasyarat)
4. [Langkah Setup](#langkah-setup)
   - [1. Konfigurasi Supabase](#1-konfigurasi-supabase)
   - [2. Buat Tabel Database](#2-buat-tabel-database)
   - [3. Konfigurasi Aplikasi](#3-konfigurasi-aplikasi)
   - [4. Jalankan Secara Lokal](#4-jalankan-secara-lokal)
   - [5. Deploy ke Hosting](#5-deploy-ke-hosting)
5. [Cara Penggunaan](#cara-penggunaan)
6. [Fitur Lengkap](#fitur-lengkap)
7. [Troubleshooting](#troubleshooting)

---

## 📖 Deskripsi Proyek

Asisten Akademik USM adalah sistem chatbot cerdas berbasis **RAG (Retrieval-Augmented Generation)** yang dirancang untuk membantu mahasiswa Universitas Sapta Mandiri mendapatkan informasi akademik secara cepat dan akurat.

**Stack Teknologi:**
- **Frontend:** Pure HTML5 + CSS3 + JavaScript ES6 (No Framework)
- **Auth & Database:** Supabase (Auth + PostgreSQL)
- **AI Workflow:** n8n Webhook (RAG pipeline)
- **PWA:** Service Worker + Web App Manifest

---

## 📁 Struktur File

```
chatbot-akademik/
├── index.html              # Landing Page
├── auth.html               # Login & Register & Reset Password
├── chat.html               # Halaman Chatbot Utama
├── style.css               # Design System Global (tokens, utils)
├── landing.css             # Styles khusus Landing Page
├── auth.css                # Styles khusus Auth Page
├── chat.css                # Styles khusus Chat Page
├── config.js               # ⚙️ KONFIGURASI (isi sebelum deploy)
├── supabase.js             # Supabase client utilities
├── script.js               # Landing page logic
├── auth.js                 # Auth logic (login/register/reset)
├── chat.js                 # Chat logic (n8n, sessions, history)
├── service-worker.js       # PWA Service Worker
├── manifest.webmanifest    # PWA Manifest
├── supabase-schema.sql     # SQL schema untuk Supabase
└── icons/                  # PWA Icons (berbagai ukuran)
    ├── icon-32.png
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## ✅ Prasyarat

- Akun **Supabase** (gratis di [supabase.com](https://supabase.com))
- **n8n workflow** sudah berjalan dengan endpoint RAG
- Browser modern (Chrome, Firefox, Edge, Safari)
- Web server untuk serve file (tidak bisa dibuka langsung via `file://`)

---

## 🚀 Langkah Setup

### 1. Konfigurasi Supabase

1. Login ke [supabase.com](https://supabase.com)
2. Buka project Anda: **`zutlafefytoqrijhtrzl`**
3. Pergi ke **Settings → API**
4. Copy nilai **`anon` / `public` key**

---

### 2. Buat Tabel Database

1. Di Supabase Dashboard, buka **SQL Editor**
2. Klik **New Query**
3. Paste seluruh isi file `supabase-schema.sql`
4. Klik **Run** (▶️)
5. Pastikan output menampilkan tabel `conversations` dan `messages`

**Tabel yang akan dibuat:**

| Tabel | Kolom |
|-------|-------|
| `conversations` | id, user_id, title, created_at, updated_at |
| `messages` | id, conversation_id, role, content, created_at |

> **RLS (Row Level Security)** sudah dikonfigurasi otomatis — setiap user hanya bisa mengakses data miliknya sendiri.

---

### 3. Konfigurasi Aplikasi

Buka file **`config.js`** dan isi nilai yang diperlukan:

```javascript
const APP_CONFIG = {
  supabase: {
    url: "https://zutlafefytoqrijhtrzl.supabase.co",  // ← sudah diisi
    anonKey: "MASUKKAN_SUPABASE_ANON_KEY_ANDA_DI_SINI", // ← GANTI INI
  },
  webhook: {
    url: "https://n8n.srv1692781.hstgr.cloud/webhook/51140e13-39f0-495a-95f5-99ead8c1e985",
  },
  // ...
};
```

**Langkah:**
1. Buka `config.js`
2. Ganti `MASUKKAN_SUPABASE_ANON_KEY_ANDA_DI_SINI` dengan **Anon Key** dari Supabase
3. Simpan file

---

### 4. Jalankan Secara Lokal

Website **harus dijalankan via web server** (bukan buka file langsung di browser).

**Opsi A — Python (paling mudah):**
```bash
# Python 3
cd chatbot-akademik
python -m http.server 8080

# Buka browser: http://localhost:8080
```

**Opsi B — Node.js (npx serve):**
```bash
cd chatbot-akademik
npx serve .

# Buka browser: http://localhost:3000
```

**Opsi C — VS Code Live Server:**
1. Install ekstensi **Live Server** di VS Code
2. Klik kanan `index.html` → **Open with Live Server**

---

### 5. Deploy ke Hosting

Website ini adalah **static files** — bisa di-deploy ke mana saja:

| Platform | Cara Deploy | Harga |
|----------|------------|-------|
| **Netlify** | Drag & drop folder ke netlify.com | Gratis |
| **Vercel** | `npx vercel` dari folder proyek | Gratis |
| **GitHub Pages** | Push ke GitHub, aktifkan Pages | Gratis |
| **Hostinger** | Upload via File Manager cPanel | Berbayar |
| **Shared Hosting** | Upload via FTP/cPanel | Berbayar |

**Untuk Netlify (paling mudah):**
1. Buka [netlify.com](https://netlify.com)
2. Drag & drop folder `chatbot-akademik` ke area deploy
3. Website langsung online dengan HTTPS

> ⚠️ **Penting:** Service Worker (`service-worker.js`) hanya bekerja di HTTPS. Gunakan hosting dengan SSL/HTTPS.

---

## 📱 Cara Penggunaan

### Untuk Mahasiswa

1. **Buka Website** → Klik **Daftar Gratis**
2. **Isi Data** → Nama lengkap, email, password (min. 8 karakter)
3. **Konfirmasi Email** (jika Supabase email confirm aktif)
4. **Login** → Masuk dengan email & password
5. **Mulai Chat** → Ketik pertanyaan akademik, tekan Enter
6. **Install PWA** → Klik "Install App" di browser untuk install ke HP/Desktop

### Keyboard Shortcuts (Chat)

| Shortcut | Aksi |
|----------|------|
| `Enter` | Kirim pesan |
| `Shift + Enter` | Baris baru |

---

## ✨ Fitur Lengkap

### Landing Page
- [x] Hero section dengan animasi gradient
- [x] 6 Feature cards (KRS, KHS, Skripsi, dll)
- [x] Section Cara Kerja (3 langkah)
- [x] FAQ Accordion (6 pertanyaan)
- [x] Section Tentang & CTA
- [x] Footer profesional

### Autentikasi
- [x] Login dengan email & password
- [x] Register akun baru
- [x] Lupa password / Reset via email
- [x] Remember Me
- [x] Password strength indicator
- [x] Form validation lengkap

### Chatbot
- [x] Kirim pertanyaan ke n8n webhook (RAG)
- [x] Typing indicator animasi
- [x] Markdown rendering (bold, italic, list, code, dll)
- [x] Copy jawaban AI
- [x] Timestamp pesan
- [x] Auto-scroll ke pesan terbaru
- [x] Suggestion chips (welcome screen)
- [x] Error handling + Retry button

### Manajemen Riwayat
- [x] Multi-session percakapan
- [x] Percakapan baru
- [x] Hapus percakapan
- [x] Hapus semua riwayat
- [x] Pencarian riwayat
- [x] Auto-save ke Supabase
- [x] Grouping by date (Hari ini, Kemarin, dll)

### UI/UX
- [x] Dark Mode / Light Mode (simpan di localStorage)
- [x] Sidebar desktop, Drawer mobile
- [x] Fully responsive (320px — 1920px)
- [x] Mobile-first design
- [x] Fluid typography dengan `clamp()`
- [x] Animasi smooth (transition, keyframes)
- [x] Toast notifications

### PWA
- [x] Web App Manifest
- [x] Service Worker
- [x] Offline fallback page
- [x] Installable di Android, iPhone, Desktop
- [x] Cache-first strategy untuk assets

---

## 🔧 Troubleshooting

### ❌ Login gagal / "Invalid API Key"
**Solusi:** Pastikan `anonKey` di `config.js` sudah diisi dengan benar dari Supabase Dashboard → Settings → API.

### ❌ "Failed to fetch" saat chat
**Solusi:**
1. Pastikan n8n workflow sedang aktif (bukan sleep)
2. Cek apakah URL webhook di `config.js` benar
3. Test webhook dengan Postman/curl:
   ```bash
   curl -X POST https://n8n.srv1692781.hstgr.cloud/webhook/51140e13-39f0-495a-95f5-99ead8c1e985 \
     -H "Content-Type: application/json" \
     -d '{"question": "test"}'
   ```

### ❌ Riwayat chat tidak tersimpan
**Solusi:**
1. Pastikan tabel `conversations` dan `messages` sudah dibuat di Supabase
2. Pastikan RLS policies sudah aktif (jalankan `supabase-schema.sql`)
3. Cek Supabase Dashboard → Table Editor → pastikan tabel ada

### ❌ Register berhasil tapi tidak bisa login
**Solusi:** Di Supabase Dashboard → Authentication → Settings → **Email Confirm** mungkin aktif. Cek email untuk konfirmasi, atau matikan di Settings untuk development.

### ❌ PWA tidak bisa diinstall
**Solusi:** PWA hanya bekerja di HTTPS. Deploy ke hosting dengan SSL, atau gunakan `localhost` untuk testing lokal.

### ❌ Tampilan rusak / CSS tidak load
**Solusi:** Jangan buka `index.html` langsung di browser (via `file://`). Gunakan local server seperti Python atau Live Server.

---

## 🗄️ Struktur Database

```sql
-- conversations
id          UUID  PRIMARY KEY
user_id     UUID  → auth.users.id
title       TEXT
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ

-- messages
id                UUID  PRIMARY KEY
conversation_id   UUID  → conversations.id
role              TEXT  ('user' | 'assistant')
content           TEXT
created_at        TIMESTAMPTZ
```

---

## 📡 Format Request/Response n8n

**Request (POST):**
```json
{
  "question": "Apa syarat mengambil skripsi?"
}
```

**Response yang diterima (salah satu field):**
```json
{
  "output": "Jawaban dari AI...",
  "answer": "Jawaban dari AI...",
  "text":   "Jawaban dari AI...",
  "message":"Jawaban dari AI..."
}
```

> Sistem secara otomatis mencoba field `output`, `answer`, `text`, `message`, `response`, `result`.

---

## 👨‍💻 Dibuat untuk Skripsi

**Sistem:** Asisten Akademik Universitas Sapta Mandiri  
**Teknologi:** RAG + Supabase + n8n + Pure HTML/CSS/JS  
**Tahun:** 2025  

---

*Website ini merupakan produk skripsi berbasis teknologi AI modern.*
