# 📋 Sistem Monitoring Antrean Humas RSU Islam Klaten

### v1.3

Dashboard monitoring permintaan desain, video/dokumentasi, dan cetak kolektif.

---

## 📂 Struktur File

```
queue-monitor/
├── index.html       ← Halaman dashboard utama
├── admin.html       ← Panel admin
├── README.md        ← Panduan ini
├── css/
│   └── style.css    ← Semua styling
└── js/
    ├── data.js      ← Konfigurasi, fetch data, cache offline
    ├── app.js       ← Aplikasi React dashboard
    └── admin.js     ← Aplikasi React admin panel
```

---

## 🚀 Cara Menjalankan

> ⚠️ **Penting:** File HTML ini **tidak bisa dibuka langsung** dengan double-click
> karena browser memblokir fetch() dari `file://`. Gunakan salah satu cara di bawah.

### Cara 1 — VS Code Live Server (Mudah, Rekomendasi)

1. Install ekstensi **Live Server** di VS Code
2. Buka folder `queue-monitor` di VS Code
3. Klik kanan `index.html` → **Open with Live Server**
4. Browser otomatis terbuka di `http://127.0.0.1:5500`

### Cara 2 — Python (tanpa instalasi tambahan)

Buka terminal di folder `queue-monitor`, jalankan:

```bash
# Python 3
python -m http.server 8080

# Lalu buka browser: http://localhost:8080
```

### Cara 3 — Node.js

```bash
npx serve .
# Lalu buka browser di URL yang muncul
```

### Hosting Online

Bisa di-upload ke mana saja: **Netlify, Vercel, GitHub Pages, cPanel, Apache/Nginx** — cukup upload semua file dengan struktur folder yang sama.

---

## 🔑 Akun Default Admin

| Field    | Nilai       |
|----------|-------------|
| Username | `admin`     |
| Password | `humas2024` |

> Ganti password segera setelah pertama kali login melalui **Admin Panel → Keamanan**.

---

## 📊 Mengatur Google Sheets agar Dapat Dibaca

Agar data dapat diambil secara otomatis, setiap Google Sheets **harus diset publik**:

1. Buka Google Sheets
2. Klik tombol **Share** (Bagikan) di kanan atas
3. Di bagian "General access", ubah ke **"Anyone with the link"** → **Viewer**
4. Klik **Done**

Tanpa langkah ini, aplikasi tidak bisa membaca data.

---

## ⚙️ Kolom yang Digunakan

| Kolom | Nama     | Isi                                    |
|-------|----------|----------------------------------------|
| **O** | Selesai  | Checkbox Google Sheets (TRUE/FALSE)    |
| **B** | Tanggal  | Tanggal permintaan (untuk grafik)      |

> Kolom dapat diubah di **Admin Panel → Spreadsheet** jika berbeda.

---

## 💾 Mode Offline

- Saat terhubung internet: data diambil dari Google Sheets dan disimpan ke cache browser (localStorage)
- Saat offline: aplikasi otomatis menampilkan data dari cache terakhir
- Badge **"📦 Cache"** muncul di kartu jika data berasal dari cache
- Cache dapat dihapus di **Admin Panel → Umum → Hapus Cache**

---

## 🛠️ Kustomisasi via Admin Panel

Buka `admin.html`, login, lalu:

| Tab           | Fungsi                                         |
|---------------|------------------------------------------------|
| **Umum**      | Ubah judul, subjudul, interval refresh         |
| **Spreadsheet** | Ubah URL sheet, kolom status, kolom tanggal  |
| **Tampilan**  | Ubah warna tema dan pratinjau langsung         |
| **Keamanan**  | Ubah password admin                            |

---

## ❓ Troubleshooting

**Data tidak muncul / error merah:**

- Pastikan spreadsheet sudah diset "Anyone with the link can view"
- Pastikan URL di Admin Panel sudah benar (bisa paste URL edit biasa)
- Periksa koneksi internet

**Grafik kosong (semua 0):**

- Cek kolom tanggal di Admin Panel — pastikan huruf kolom sesuai isi spreadsheet
- Format tanggal yang didukung: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD

**Halaman tidak bisa dibuka (CORS error):**

- Jangan buka dengan double-click; gunakan Live Server atau `python -m http.server`

---

## 🔧 Teknologi

- **React 18** (via CDN) — antarmuka interaktif
- **Chart.js 4** (via CDN) — grafik bar bulanan
- **Babel Standalone** — mengubah JSX menjadi JavaScript
- **Plus Jakarta Sans + DM Sans** (Google Fonts) — tipografi
- **localStorage** — penyimpanan konfigurasi dan cache offline
- **Google Sheets CSV Export** — sumber data

---

_Dibuat untuk Humas RSU Islam Klaten_
