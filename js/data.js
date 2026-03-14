/**
 * data.js — Lapisan Data & Konfigurasi
 * Sistem Monitoring Antrean Humas RSU Islam Klaten
 *
 * File ini mengelola:
 * - Konfigurasi default & penyimpanan ke localStorage
 * - Konversi URL Google Sheets
 * - Parsing CSV dari Google Sheets
 * - Penghitungan statistik antrean
 * - Cache data offline
 */

// Membuat namespace global agar tidak bentrok dengan variabel lain
window.QueueApp = window.QueueApp || {};

// ============================================================
// KONFIGURASI DEFAULT
// ============================================================
const DEFAULT_CONFIG = {
  title: "Sistem Monitoring Antrean Humas RSU Islam Klaten",
  subtitle: "Dashboard Permintaan Desain · Video · Cetak",
  theme: {
    primary:   "#0f3460",
    secondary: "#533483",
    tertiary:  "#0d7c66",
    bg:        "#f0f4f8",
  },
  password: "humas2024",
  refreshInterval: 300, // detik (5 menit)
  sheets: {
    design: {
      name:         "Antrean Design",
      icon:         "✏️",
      editUrl:      "https://docs.google.com/spreadsheets/d/17TEWbeBaJzF38yfJxe3OMx3aJANIKHL1Y0bsj4pUDaI/edit?gid=1631778609#gid=1631778609",
      statusColumn: "O",
      dateColumn:   "B",
      startYear:    2023,
      color:        "#1a56db",
    },
    video: {
      name:         "Antrean Dokumentasi/Video",
      icon:         "🎬",
      editUrl:      "https://docs.google.com/spreadsheets/d/1e9P8Sirx5rKjCWXGWUpTnzNMCICBlDbXmcQFIX85gxc/edit?gid=1623853028#gid=1623853028",
      statusColumn: "O",
      dateColumn:   "B",
      startYear:    2023,
      color:        "#7e3af2",
    },
    printing: {
      name:         "Antrean Cetak Kolektif",
      icon:         "🖨️",
      editUrl:      "https://docs.google.com/spreadsheets/d/14bs2cmZeGFHFgWIAuQTCKgVqEK46CioihqjztVaHNzo/edit?gid=563013469#gid=563013469",
      statusColumn: "O",
      dateColumn:   "B",
      startYear:    2025,
      color:        "#057a55",
    },
  },
};

// ============================================================
// MANAJEMEN KONFIGURASI
// ============================================================
window.QueueApp.Config = {
  KEY: "queueapp_config_v2",

  /** Ambil konfigurasi dari localStorage, gabungkan dengan default */
  get() {
    try {
      const stored = localStorage.getItem(this.KEY);
      if (stored) {
        return this._merge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Config load failed, using defaults:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  },

  /** Simpan konfigurasi ke localStorage */
  save(cfg) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(cfg));
      return true;
    } catch (e) {
      console.error("Config save failed:", e);
      return false;
    }
  },

  /** Reset ke pengaturan default */
  reset() {
    localStorage.removeItem(this.KEY);
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  },

  /** Deep merge dua objek */
  _merge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key]) &&
        typeof target[key] === "object"
      ) {
        result[key] = this._merge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    return result;
  },
};

// ============================================================
// UTILITAS
// ============================================================
window.QueueApp.Utils = {
  /**
   * Konversi URL edit/share Google Sheets menjadi URL export CSV
   * Menerima format: /edit, /pub, /export, dsb.
   */
  toExportUrl(url) {
    if (!url) return "";
    if (url.includes("/export?format=csv")) return url;

    const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return url;
    const sheetId = idMatch[1];

    // Cari gid di query string atau hash
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  },

  /**
   * Konversi huruf kolom ke indeks 0-based
   * A=0, B=1, ..., O=14, Z=25
   */
  colToIndex(letter) {
    if (!letter) return 14; // default ke kolom O
    const l = letter.trim().toUpperCase();
    // Support dua huruf seperti AA, AB (meskipun jarang)
    if (l.length === 1) return l.charCodeAt(0) - 65;
    if (l.length === 2) return (l.charCodeAt(0) - 64) * 26 + (l.charCodeAt(1) - 65);
    return 14;
  },

  /**
   * Parse tanggal dari berbagai format secara fleksibel
   * Mendukung: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, dsb.
   */
  parseDate(str) {
    if (!str || typeof str !== "string") return null;
    const s = str.trim();
    if (!s) return null;

    // Format ISO: 2023-05-20
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d)) return d;
    }

    // Format dengan slash: DD/MM/YYYY atau MM/DD/YYYY
    const parts = s.split(/[\/\-\.]/);
    if (parts.length >= 3) {
      const nums = parts.map(Number);
      const [a, b, c] = nums;

      // Jika c > 1900 → format X/X/YYYY
      if (c > 1900 && c < 2100) {
        // Prioritaskan DD/MM/YYYY (format Indonesia)
        if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
          const d = new Date(c, b - 1, a);
          if (!isNaN(d)) return d;
        }
      }
      // Jika a > 1900 → format YYYY/MM/DD
      if (a > 1900 && a < 2100) {
        const d = new Date(a, b - 1, c);
        if (!isNaN(d)) return d;
      }
    }

    // Fallback: biarkan native parser mencoba
    const d = new Date(s);
    if (!isNaN(d)) return d;

    return null;
  },

  /** Tanggal ke kunci YYYY-MM untuk pengelompokan */
  dateKey(date) {
    if (!date) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  },

  /** Kunci YYYY-MM ke label Indonesia "Jan 2023" */
  keyToLabel(key) {
    const [y, m] = key.split("-");
    const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
    return `${BULAN[parseInt(m) - 1]} ${y}`;
  },

  /** Buat array kunci YYYY-MM dari startYear-01 sampai bulan ini */
  monthRange(startYear) {
    const keys = [];
    const now = new Date();
    const endY = now.getFullYear();
    const endM = now.getMonth() + 1;
    for (let y = startYear; y <= endY; y++) {
      const lastM = y === endY ? endM : 12;
      for (let m = 1; m <= lastM; m++) {
        keys.push(`${y}-${String(m).padStart(2, "0")}`);
      }
    }
    return keys;
  },

  /**
   * Parser CSV sederhana yang menangani tanda kutip dan koma di dalam nilai
   */
  parseCSV(text) {
    const rows = [];
    // Normalisasi line endings
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;
      const fields = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === "," && !inQ) {
          fields.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      fields.push(cur.trim());
      rows.push(fields);
    }
    return rows;
  },

  /** Format angka ke format Indonesia */
  num(n) {
    return new Intl.NumberFormat("id-ID").format(n || 0);
  },

  /** Format tanggal-waktu ke format Indonesia */
  datetime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  },
};

// ============================================================
// LAYANAN DATA
// ============================================================
window.QueueApp.DataService = {
  CACHE_PFX: "queueapp_cache_",

  /**
   * Proses baris CSV menjadi statistik lengkap
   * @param {string[][]} rows - Semua baris CSV (baris 0 adalah header)
   * @param {string} statusCol - Huruf kolom status (misal "O")
   * @param {string} dateCol   - Huruf kolom tanggal (misal "B")
   * @param {number} startYear - Tahun awal untuk grafik
   */
  process(rows, statusCol, dateCol, startYear) {
    const si = window.QueueApp.Utils.colToIndex(statusCol);
    const di = window.QueueApp.Utils.colToIndex(dateCol);
    const keys = window.QueueApp.Utils.monthRange(startYear);

    // Inisialisasi bucket bulanan
    const monthly = {};
    keys.forEach(k => { monthly[k] = { total: 0, done: 0 }; });

    let total = 0, done = 0;

    // Mulai dari baris 1 (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      // Cek apakah baris ini berisi data (tidak kosong semua)
      const hasData = row.some(c => c && c.trim() !== "");
      if (!hasData) continue;

      total++;

      // Status selesai (TRUE dari checkbox Google Sheets)
      const sv = (row[si] || "").trim().toUpperCase();
      const isDone = sv === "TRUE" || sv === "1" || sv === "YA" || sv === "YES";
      if (isDone) done++;

      // Tanggal untuk grafik bulanan
      const date = window.QueueApp.Utils.parseDate(row[di] || "");
      const key  = window.QueueApp.Utils.dateKey(date);
      if (key && monthly[key]) {
        monthly[key].total++;
        if (isDone) monthly[key].done++;
      }
    }

    return {
      total,
      done,
      inQueue: total - done,
      monthly,
      keys,
      labels: keys.map(k => window.QueueApp.Utils.keyToLabel(k)),
    };
  },

  /**
   * Ambil data dari Google Sheets, dengan fallback ke cache lokal jika offline
   */
  async fetch(sheetKey, sheetCfg) {
    const cacheKey = this.CACHE_PFX + sheetKey;
    const exportUrl = window.QueueApp.Utils.toExportUrl(sheetCfg.editUrl || sheetCfg.url || "");

    if (navigator.onLine && exportUrl) {
      try {
        const res = await fetch(exportUrl, { cache: "no-cache", redirect: "follow" });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Cek apakah respons adalah CSV atau HTML (redirect ke login)
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("text/html")) {
          throw new Error("Spreadsheet tidak publik — aktifkan 'Anyone with link can view'");
        }

        const text = await res.text();
        const rows = window.QueueApp.Utils.parseCSV(text);
        const stats = this.process(rows, sheetCfg.statusColumn, sheetCfg.dateColumn, sheetCfg.startYear);

        // Simpan ke cache
        const cached = { ts: new Date().toISOString(), stats };
        try { localStorage.setItem(cacheKey, JSON.stringify(cached)); } catch (_) {}

        return { ...stats, fromCache: false, ts: cached.ts, error: null };

      } catch (err) {
        console.warn(`[${sheetKey}] Fetch gagal:`, err.message);
        // Lanjut ke cache
      }
    }

    // Coba ambil dari cache
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        return { ...cached.stats, fromCache: true, ts: cached.ts, error: null };
      }
    } catch (_) {}

    // Tidak ada data sama sekali — kembalikan objek kosong
    const keys = window.QueueApp.Utils.monthRange(sheetCfg.startYear);
    const monthly = {};
    keys.forEach(k => { monthly[k] = { total: 0, done: 0 }; });
    return {
      total: 0, done: 0, inQueue: 0,
      monthly, keys,
      labels: keys.map(k => window.QueueApp.Utils.keyToLabel(k)),
      fromCache: false, ts: null, error: "Tidak ada data",
    };
  },

  /** Ambil semua sheet sekaligus */
  async fetchAll() {
    const cfg = window.QueueApp.Config.get();
    const results = {};
    await Promise.all(
      Object.entries(cfg.sheets).map(async ([key, sheetCfg]) => {
        results[key] = await this.fetch(key, sheetCfg);
      })
    );
    return results;
  },

  /** Hapus semua cache */
  clearCache() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.CACHE_PFX))
      .forEach(k => localStorage.removeItem(k));
  },
};
