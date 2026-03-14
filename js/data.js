/**
 * data.js — Lapisan Data & Konfigurasi (v4)
 *
 * PERBAIKAN v4:
 * ─────────────────────────────────────────────────────────────
 * BUG 1 — CSV parser rusak untuk multi-line cells
 *   Parser lama: split("\n") dulu → lalu parse per baris
 *   Akibat: sel yang isinya multi-baris (misal "Permintaan Khusus"
 *   yang diisi dengan teks panjang berisi baris baru) di-split
 *   menjadi beberapa baris palsu → Design terbaca 346 padahal 221.
 *
 *   FIX: Parse seluruh teks karakter-per-karakter (RFC 4180 compliant).
 *   Newline di dalam quoted field → bagian dari field, BUKAN pemisah baris.
 *
 * BUG 2 — Deteksi kolom status bergantung 100% pada huruf kolom
 *   Jika alignment kolom sedikit berbeda antar sheet, kolom O index
 *   14 bisa membaca kolom yang salah.
 *
 *   FIX: Cari kolom "Selesai" berdasarkan NAMA HEADER di baris pertama.
 *   Huruf kolom hanya dipakai sebagai fallback jika header tidak ditemukan.
 *
 * BUG 3 — Row validity check bergantung "anchorColumn"
 *   Jika sheet tidak punya data di kolom A (bukan Google Forms), baris
 *   valid bisa terlewat → Printing seharusnya 6/6 selesai.
 *
 *   FIX: Baris valid = baris yang punya setidaknya satu nilai non-kosong
 *   di antara 5 kolom pertama (A–E). Tidak lagi bergantung satu kolom.
 *
 * BUG 4 — Cache lama (dari versi buggy) masih dipakai
 *   FIX: Tambah cache version key. Jika versi berbeda, cache lama
 *   otomatis diabaikan dan data di-fetch ulang dari Google Sheets.
 * ─────────────────────────────────────────────────────────────
 */

window.QueueApp = window.QueueApp || {};

// Versi cache — naikkan angka ini setiap ada perubahan logika parsing
// agar cache lama otomatis tidak dipakai
const CACHE_VERSION = 4;

// ============================================================
// KONFIGURASI DEFAULT
// ============================================================
const DEFAULT_CONFIG = {
  title:    "Sistem Monitoring Antrean Humas RSU Islam Klaten",
  subtitle: "Dashboard Permintaan Desain · Video · Cetak",
  theme: {
    primary:   "#0f3460",
    secondary: "#533483",
    tertiary:  "#0d7c66",
    bg:        "#f0f4f8",
  },
  password:        "humas2024",
  refreshInterval: 300,
  sheets: {
    design: {
      name:         "Antrean Design",
      icon:         "\u270f\ufe0f",
      editUrl:      "https://docs.google.com/spreadsheets/d/17TEWbeBaJzF38yfJxe3OMx3aJANIKHL1Y0bsj4pUDaI/edit?gid=1631778609#gid=1631778609",
      statusColumn: "O",
      dateColumn:   "B",
      startYear:    2023,
      color:        "#1a56db",
    },
    video: {
      name:         "Antrean Dokumentasi/Video",
      icon:         "\ud83c\udfa6",
      editUrl:      "https://docs.google.com/spreadsheets/d/1e9P8Sirx5rKjCWXGWUpTnzNMCICBlDbXmcQFIX85gxc/edit?gid=1623853028#gid=1623853028",
      statusColumn: "O",
      dateColumn:   "B",
      startYear:    2023,
      color:        "#7e3af2",
    },
    printing: {
      name:         "Antrean Cetak Kolektif",
      icon:         "\ud83d\udda8\ufe0f",
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
  LS_KEY: "queueapp_config_sync_v4",

  get() {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (raw) return this._merge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), JSON.parse(raw));
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  },

  async load() {
    try {
      const stored = await window.QueueApp.DB.getConfig();
      if (stored) {
        const merged = this._merge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), stored);
        try { localStorage.setItem(this.LS_KEY, JSON.stringify(merged)); } catch (_) {}
        return merged;
      }
    } catch (e) {
      console.warn("[Config] load dari DB gagal:", e);
    }
    return this.get();
  },

  async save(cfg) {
    try { localStorage.setItem(this.LS_KEY, JSON.stringify(cfg)); } catch (_) {}
    return window.QueueApp.DB.saveConfig(cfg);
  },

  async reset() {
    localStorage.removeItem(this.LS_KEY);
    await window.QueueApp.DB.saveConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  },

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
      } else if (source[key] !== undefined && source[key] !== null) {
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

  toExportUrl(url) {
    if (!url) return "";
    if (url.includes("/export?format=csv")) return url;
    var idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return url;
    var sheetId = idMatch[1];
    var gidMatch = url.match(/[?&#]gid=(\d+)/);
    var gid = gidMatch ? gidMatch[1] : "0";
    return "https://docs.google.com/spreadsheets/d/" + sheetId + "/export?format=csv&gid=" + gid;
  },

  colToIndex(letter) {
    if (!letter) return 0;
    var l = String(letter).trim().toUpperCase();
    if (l.length === 1) return l.charCodeAt(0) - 65;
    if (l.length === 2) return (l.charCodeAt(0) - 64) * 26 + (l.charCodeAt(1) - 65);
    return 0;
  },

  /**
   * Parse tanggal dari Google Sheets Indonesia.
   * Input: "26/02/2026 8:56:21" atau "26/02/2026" atau "2026-02-26"
   * Strategi: buang komponen waktu, lalu parse tanggal saja.
   */
  parseDate(raw) {
    if (!raw || typeof raw !== "string") return null;
    var s = raw.trim();
    if (!s) return null;

    // Buang komponen waktu (spasi ke kanan)
    var datePart = s.split(/\s+/)[0];

    if (datePart.indexOf("/") >= 0) {
      var parts = datePart.split("/");
      if (parts.length === 3) {
        var a = parseInt(parts[0], 10);
        var b = parseInt(parts[1], 10);
        var c = parseInt(parts[2], 10);

        if (c >= 1990 && c <= 2100) {
          // DD/MM/YYYY (format Indonesia — prioritas utama)
          if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
            var d1 = new Date(c, b - 1, a);
            if (!isNaN(d1.getTime())) return d1;
          }
          // MM/DD/YYYY (fallback)
          if (b >= 1 && b <= 31 && a >= 1 && a <= 12) {
            var d2 = new Date(c, a - 1, b);
            if (!isNaN(d2.getTime())) return d2;
          }
        }
        if (a >= 1990 && a <= 2100) {
          var d3 = new Date(a, b - 1, c);
          if (!isNaN(d3.getTime())) return d3;
        }
      }
    }

    if (datePart.indexOf("-") >= 0) {
      var d4 = new Date(datePart);
      if (!isNaN(d4.getTime())) return d4;
    }

    var d5 = new Date(s);
    if (!isNaN(d5.getTime())) return d5;
    return null;
  },

  dateKey(date) {
    if (!date) return null;
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  },

  keyToLabel(key) {
    var parts = key.split("-");
    var y = parts[0];
    var m = parseInt(parts[1], 10);
    var BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
    return BULAN[m - 1] + " " + y;
  },

  monthRange(startYear) {
    var keys = [];
    var now   = new Date();
    var endY  = now.getFullYear();
    var endM  = now.getMonth() + 1;
    for (var y = Number(startYear); y <= endY; y++) {
      var lastM = (y === endY) ? endM : 12;
      for (var m = 1; m <= lastM; m++) {
        keys.push(y + "-" + String(m).padStart(2, "0"));
      }
    }
    return keys;
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * RFC 4180-COMPLIANT CSV PARSER — THE REAL FIX
   * ═══════════════════════════════════════════════════════════
   * Masalah parser lama: split("\n") dulu kemudian parse per baris.
   * Ini RUSAK jika ada sel yang mengandung newline di dalam tanda kutip
   * (contoh: kolom "Permintaan Khusus" yang diisi teks multi-baris).
   * Satu baris data → terbaca sebagai 2–3 "baris", menggelembungkan total.
   *
   * Fix: scan seluruh teks satu karakter sekaligus.
   * Newline di dalam quoted field → bagian dari field, bukan pemisah baris.
   */
  parseCSV(text) {
    var rows   = [];
    var row    = [];
    var field  = "";
    var inQuote = false;
    var n = text.length;

    for (var i = 0; i < n; i++) {
      var c    = text[i];
      var next = (i + 1 < n) ? text[i + 1] : "";

      if (inQuote) {
        if (c === '"') {
          if (next === '"') {
            // Escaped double-quote "" → satu karakter "
            field += '"';
            i++;
          } else {
            // Penutup quote
            inQuote = false;
          }
        } else {
          // Karakter biasa di dalam quote — termasuk newline!
          field += c;
        }
      } else {
        if (c === '"') {
          inQuote = true;
        } else if (c === ',') {
          row.push(field.trim());
          field = "";
        } else if (c === '\r') {
          // Abaikan \r (akan ada \n setelahnya untuk Windows line endings)
        } else if (c === '\n') {
          // Akhir baris nyata
          row.push(field.trim());
          field = "";
          // Hanya tambah baris jika ada setidaknya satu field tidak kosong
          if (row.some(function(f) { return f !== ""; })) {
            rows.push(row);
          }
          row = [];
        } else {
          field += c;
        }
      }
    }

    // Tangani baris/field terakhir (file tanpa trailing newline)
    row.push(field.trim());
    if (row.some(function(f) { return f !== ""; })) {
      rows.push(row);
    }

    return rows;
  },

  num(n) { return new Intl.NumberFormat("id-ID").format(n || 0); },

  datetime(iso) {
    if (!iso) return "\u2014";
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

  /**
   * Temukan indeks kolom status dari baris header.
   *
   * Urutan prioritas:
   *   1. Cari nama header yang cocok (case-insensitive) dengan daftar
   *      nama umum: "Selesai", "Status", "Done", "Complete", dsb.
   *   2. Fallback ke huruf kolom yang dikonfigurasi (misal "O" → index 14)
   *
   * Ini menyelesaikan masalah alignment jika sheet punya kolom extra
   * atau jika nama header sedikit berbeda.
   */
  findStatusColIndex(headerRow, configuredColLetter) {
    var U = window.QueueApp.Utils;
    var fallback = U.colToIndex(configuredColLetter || "O");

    if (!headerRow || headerRow.length === 0) return fallback;

    var names = ["selesai", "status", "done", "complete", "finished",
                 "dikerjakan", "completed", "finish", "check", "hasil"];

    for (var i = 0; i < headerRow.length; i++) {
      var h = (headerRow[i] || "").trim().toLowerCase();
      if (names.indexOf(h) >= 0) {
        console.log("[DataService] Kolom status ditemukan via header nama: '" + headerRow[i] + "' di index " + i);
        return i;
      }
    }

    console.log("[DataService] Kolom status tidak ditemukan via header, pakai fallback index " + fallback + " (kolom " + (configuredColLetter || "O") + ")");
    return fallback;
  },

  /**
   * Temukan indeks kolom tanggal dari baris header.
   * Nama yang dicari: "Timestamp", "Tanggal", "Date", dsb.
   */
  findDateColIndex(headerRow, configuredColLetter) {
    var U = window.QueueApp.Utils;
    var fallback = U.colToIndex(configuredColLetter || "B");

    if (!headerRow || headerRow.length === 0) return fallback;

    var names = ["timestamp", "tanggal", "date", "tgl", "waktu", "time",
                 "tanggal request", "tanggal permintaan", "created"];

    for (var i = 0; i < headerRow.length; i++) {
      var h = (headerRow[i] || "").trim().toLowerCase();
      if (names.indexOf(h) >= 0) {
        return i;
      }
    }

    return fallback;
  },

  /**
   * Proses baris CSV → statistik antrean.
   *
   * Row validity (BUG 3 fix):
   *   Baris dianggap data nyata jika setidaknya SATU dari 5 kolom
   *   pertama (A-E) berisi nilai tidak kosong.
   *   Ini bekerja untuk semua tipe sheet, baik Google Forms maupun manual.
   */
  process(rows, statusCol, dateCol, startYear) {
    var U   = window.QueueApp.Utils;
    var ds  = window.QueueApp.DataService;

    if (!rows || rows.length < 2) {
      var emptyKeys = U.monthRange(startYear);
      var emptyMonthly = {};
      emptyKeys.forEach(function(k) { emptyMonthly[k] = { total: 0, done: 0 }; });
      return { total: 0, done: 0, inQueue: 0,
        monthly: emptyMonthly, keys: emptyKeys,
        labels: emptyKeys.map(function(k) { return U.keyToLabel(k); }) };
    }

    var headerRow = rows[0];

    // Cari indeks kolom berdasarkan nama header (dengan fallback ke huruf)
    var si = ds.findStatusColIndex(headerRow, statusCol);
    var di = ds.findDateColIndex(headerRow, dateCol);

    // Log header untuk debugging
    console.log("[DataService] Header row:", headerRow.slice(0, 18).join(" | "));
    console.log("[DataService] Status col index=" + si + " (" + (headerRow[si] || "?") + ")");
    console.log("[DataService] Date   col index=" + di + " (" + (headerRow[di] || "?") + ")");

    var keys = U.monthRange(startYear);
    var monthly = {};
    keys.forEach(function(k) { monthly[k] = { total: 0, done: 0 }; });

    var total = 0;
    var done  = 0;

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row || row.length === 0) continue;

      // ── Validasi baris: setidaknya satu dari 5 kolom pertama non-kosong ──
      var hasData = false;
      for (var c = 0; c < Math.min(5, row.length); c++) {
        if (row[c] && row[c].trim() !== "") { hasData = true; break; }
      }
      if (!hasData) continue;

      total++;

      // ── Status checkbox ──────────────────────────────────────────────────
      // Google Sheets export: TRUE = selesai, FALSE = belum selesai
      // Kita juga cek nilai tambahan untuk memastikan
      var sv = (row[si] || "").trim().toUpperCase();
      var isDone = (sv === "TRUE"    ||
                    sv === "1"       ||
                    sv === "YA"      ||
                    sv === "YES"     ||
                    sv === "SELESAI" ||
                    sv === "DONE"    ||
                    sv === "BENAR");  // "TRUE" dalam bahasa Indonesia Google Sheets
      if (isDone) done++;

      // Debug: log 3 baris pertama untuk verifikasi
      if (i <= 3) {
        console.log("[DataService] Row " + i + ": statusVal='" + sv + "' isDone=" + isDone +
          " anchorVal='" + (row[0] || "").substring(0, 20) + "'");
      }

      // ── Grafik bulanan ───────────────────────────────────────────────────
      var date = U.parseDate(row[di] || "");
      var key  = U.dateKey(date);
      if (key && monthly[key]) {
        monthly[key].total++;
        if (isDone) monthly[key].done++;
      }
    }

    return {
      total:   total,
      done:    done,
      inQueue: total - done,
      monthly: monthly,
      keys:    keys,
      labels:  keys.map(function(k) { return U.keyToLabel(k); }),
    };
  },

  async fetch(sheetKey, sheetCfg) {
    var U         = window.QueueApp.Utils;
    var exportUrl = U.toExportUrl(sheetCfg.editUrl || sheetCfg.url || "");

    if (navigator.onLine && exportUrl) {
      try {
        var res = await fetch(exportUrl, { cache: "no-cache", redirect: "follow" });
        if (!res.ok) throw new Error("HTTP " + res.status);

        var ct = res.headers.get("content-type") || "";
        if (ct.includes("text/html")) {
          throw new Error("Spreadsheet tidak publik — aktifkan 'Anyone with the link can view'");
        }

        var text = await res.text();
        var rows = U.parseCSV(text);

        console.log("[" + sheetKey + "] Baris setelah parse (incl. header): " + rows.length);

        var stats = window.QueueApp.DataService.process(
          rows,
          sheetCfg.statusColumn,
          sheetCfg.dateColumn,
          sheetCfg.startYear
        );

        console.log("[" + sheetKey + "] HASIL → Total=" + stats.total +
          " | Selesai=" + stats.done + " | Antrean=" + stats.inQueue);

        // Simpan ke IndexedDB dengan versi cache
        await window.QueueApp.DB.setCache(sheetKey, { stats: stats, version: CACHE_VERSION });

        return {
          total:     stats.total,
          done:      stats.done,
          inQueue:   stats.inQueue,
          monthly:   stats.monthly,
          keys:      stats.keys,
          labels:    stats.labels,
          fromCache: false,
          ts:        new Date().toISOString(),
          error:     null,
        };

      } catch (err) {
        console.warn("[" + sheetKey + "] Fetch gagal — coba cache:", err.message);
      }
    }

    // ── Fallback: IndexedDB ──────────────────────────────────────────────
    try {
      var cached = await window.QueueApp.DB.getCache(sheetKey);
      if (cached) {
        // Cek versi cache — jika berbeda, abaikan dan kembalikan error
        var cachedData = cached.stats || cached;
        var cachedVer  = (cachedData && cachedData.version) ? cachedData.version : 0;
        var actualStats = cachedData.stats || cachedData;

        if (cachedVer < CACHE_VERSION) {
          console.warn("[" + sheetKey + "] Cache versi lama (" + cachedVer + " < " + CACHE_VERSION + "), diabaikan.");
          // Hapus cache lama agar tidak dipakai lagi
          await window.QueueApp.DB.deleteCache(sheetKey);
        } else if (actualStats && typeof actualStats.total === "number") {
          console.log("[" + sheetKey + "] Menggunakan cache DB (ts=" + cached.ts + ")");
          return {
            total:     actualStats.total,
            done:      actualStats.done,
            inQueue:   actualStats.inQueue,
            monthly:   actualStats.monthly,
            keys:      actualStats.keys,
            labels:    actualStats.labels,
            fromCache: true,
            ts:        cached.ts,
            error:     null,
          };
        }
      }
    } catch (e) {
      console.warn("[" + sheetKey + "] DB read gagal:", e);
    }

    // ── Tidak ada data ───────────────────────────────────────────────────
    var emptyKeys = window.QueueApp.Utils.monthRange(sheetCfg.startYear);
    var emptyMonthly = {};
    emptyKeys.forEach(function(k) { emptyMonthly[k] = { total: 0, done: 0 }; });
    return {
      total: 0, done: 0, inQueue: 0,
      monthly: emptyMonthly,
      keys:    emptyKeys,
      labels:  emptyKeys.map(function(k) { return window.QueueApp.Utils.keyToLabel(k); }),
      fromCache: false,
      ts:    null,
      error: "Tidak ada data — pastikan sheet sudah diset publik dan ada koneksi internet",
    };
  },

  async fetchAll() {
    var cfg = await window.QueueApp.Config.load();
    var results = {};
    await Promise.all(
      Object.entries(cfg.sheets).map(async function(entry) {
        var key      = entry[0];
        var sheetCfg = entry[1];
        results[key] = await window.QueueApp.DataService.fetch(key, sheetCfg);
      })
    );
    return results;
  },

  async clearCache() {
    return window.QueueApp.DB.clearAllCache();
  },
};
