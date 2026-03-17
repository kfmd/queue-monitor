/**
 * data.js — Lapisan Data & Konfigurasi (v5)
 *
 * SISTEM KONFIGURASI 3 TINGKAT — untuk sinkronisasi lintas perangkat:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Tingkat 1 (terendah) : DEFAULT_CONFIG hardcoded             │
 * │ Tingkat 2            : config.json  — baseline dari server  │
 * │ Tingkat 3 (tertinggi): IndexedDB   — perubahan admin MENANG │
 * │                                                             │
 * │ IndexedDB selalu menimpa config.json. Untuk menyebarkan     │
 * │ perubahan ke perangkat lain: Admin → Download config.json   │
 * │ → ganti file di server → semua perangkat refresh.           │
 * └─────────────────────────────────────────────────────────────┘
 */

window.QueueApp = window.QueueApp || {};

const CACHE_VERSION = 5;

// ============================================================
// KONFIGURASI DEFAULT (hardcoded fallback terakhir)
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
  LS_KEY: "queueapp_config_sync_v5",

  /** Sinkronis — dipakai untuk render pertama (startup cepat) */
  get() {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (raw) return this._merge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), JSON.parse(raw));
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  },

  /**
   * Muat konfigurasi async dengan prioritas:
   *   1. config.json (file server, shared semua perangkat)
   *   2. IndexedDB   (override lokal perangkat ini)
   *   3. DEFAULT_CONFIG
   *
   * PRIORITAS (dari terendah ke tertinggi):
   *   1. DEFAULT_CONFIG  — fallback hardcoded
   *   2. config.json     — baseline bersama di server
   *   3. IndexedDB       — perubahan admin (SELALU MENANG)
   *
   * IndexedDB menang atas config.json agar perubahan warna/URL/judul
   * yang disimpan via admin panel langsung berlaku.
   * Untuk sinkronisasi lintas perangkat: Download config.json dari admin
   * → ganti file di server → perangkat lain baca config.json baru.
   */
  async load() {
    let base = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    // ── Tingkat 2: config.json (baseline bersama dari server) ──────
    try {
      const res = await fetch("./config.json?v=" + Date.now(), { cache: "no-cache" });
      if (res.ok) {
        const fileJson = JSON.parse(await res.text());
        delete fileJson._comment;
        base = this._merge(base, fileJson);
        console.log("[Config] Baseline dari config.json");
      }
    } catch (e) {
      console.info("[Config] config.json tidak ditemukan:", e.message);
    }

    // ── Tingkat 3: IndexedDB menimpa segalanya ─────────────────────
    // Perubahan yang disimpan admin (warna, URL, judul, password, dll)
    // selalu menimpa config.json sehingga langsung berlaku di halaman ini.
    // Gunakan Download config.json untuk menyebarkan ke perangkat lain.
    try {
      const stored = await window.QueueApp.DB.getConfig();
      if (stored) {
        base = this._merge(base, stored);
        console.log("[Config] Override dari IndexedDB diterapkan");
      }
    } catch (e) {
      console.warn("[Config] Gagal baca IndexedDB:", e);
    }

    // Sync ke localStorage untuk startup sinkronis yang cepat
    try { localStorage.setItem(this.LS_KEY, JSON.stringify(base)); } catch (_) {}
    return base;
  },

  /**
   * Simpan ke IndexedDB + localStorage.
   * Untuk sinkronisasi lintas perangkat: gunakan exportJSON() → ganti config.json di server.
   */
  async save(cfg) {
    try { localStorage.setItem(this.LS_KEY, JSON.stringify(cfg)); } catch (_) {}
    return window.QueueApp.DB.saveConfig(cfg);
  },

  /**
   * Generate konten config.json dari konfigurasi saat ini.
   * Dipanggil oleh tombol "Download config.json" di admin panel.
   */
  exportJSON(cfg) {
    const exportObj = JSON.parse(JSON.stringify(cfg));
    exportObj._comment = "File ini adalah konfigurasi bersama. Edit melalui Admin Panel lalu download dan ganti file ini di server.";
    // Urutan kunci yang rapi
    const ordered = {
      _comment:        exportObj._comment,
      title:           exportObj.title,
      subtitle:        exportObj.subtitle,
      theme:           exportObj.theme,
      password:        exportObj.password,
      refreshInterval: exportObj.refreshInterval,
      sheets:          exportObj.sheets,
    };
    return JSON.stringify(ordered, null, 2);
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

  parseDate(raw) {
    if (!raw || typeof raw !== "string") return null;
    var s = raw.trim();
    if (!s) return null;
    var datePart = s.split(/\s+/)[0];
    if (datePart.indexOf("/") >= 0) {
      var parts = datePart.split("/");
      if (parts.length === 3) {
        var a = parseInt(parts[0], 10);
        var b = parseInt(parts[1], 10);
        var c = parseInt(parts[2], 10);
        if (c >= 1990 && c <= 2100) {
          if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
            var d1 = new Date(c, b - 1, a);
            if (!isNaN(d1.getTime())) return d1;
          }
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

  // RFC 4180-compliant CSV parser (handles multiline quoted cells)
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
          if (next === '"') { field += '"'; i++; }
          else inQuote = false;
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQuote = true;
        } else if (c === ',') {
          row.push(field.trim());
          field = "";
        } else if (c === '\r') {
          // skip
        } else if (c === '\n') {
          row.push(field.trim());
          field = "";
          if (row.some(function(f) { return f !== ""; })) rows.push(row);
          row = [];
        } else {
          field += c;
        }
      }
    }
    row.push(field.trim());
    if (row.some(function(f) { return f !== ""; })) rows.push(row);
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

  findStatusColIndex(headerRow, configuredColLetter) {
    var U = window.QueueApp.Utils;
    var fallback = U.colToIndex(configuredColLetter || "O");
    if (!headerRow || headerRow.length === 0) return fallback;
    var names = ["selesai","status","done","complete","finished","dikerjakan","completed","finish","check","hasil"];
    for (var i = 0; i < headerRow.length; i++) {
      var h = (headerRow[i] || "").trim().toLowerCase();
      if (names.indexOf(h) >= 0) {
        console.log("[DataService] Kolom status ditemukan via header: '" + headerRow[i] + "' index=" + i);
        return i;
      }
    }
    return fallback;
  },

  findDateColIndex(headerRow, configuredColLetter) {
    var U = window.QueueApp.Utils;
    var fallback = U.colToIndex(configuredColLetter || "B");
    if (!headerRow || headerRow.length === 0) return fallback;
    var names = ["timestamp","tanggal","date","tgl","waktu","time","tanggal request","tanggal permintaan","created"];
    for (var i = 0; i < headerRow.length; i++) {
      var h = (headerRow[i] || "").trim().toLowerCase();
      if (names.indexOf(h) >= 0) return i;
    }
    return fallback;
  },

  process(rows, statusCol, dateCol, startYear) {
    var U  = window.QueueApp.Utils;
    var ds = window.QueueApp.DataService;
    if (!rows || rows.length < 2) {
      var ek = U.monthRange(startYear);
      var em = {};
      ek.forEach(function(k) { em[k] = { total:0, done:0 }; });
      return { total:0, done:0, inQueue:0, monthly:em, keys:ek, labels:ek.map(function(k){return U.keyToLabel(k);}) };
    }
    var headerRow = rows[0];
    var si = ds.findStatusColIndex(headerRow, statusCol);
    var di = ds.findDateColIndex(headerRow, dateCol);
    console.log("[DataService] Header:", headerRow.slice(0,18).join(" | "));
    console.log("[DataService] Status col index=" + si + " date col index=" + di);
    var keys = U.monthRange(startYear);
    var monthly = {};
    keys.forEach(function(k) { monthly[k] = { total:0, done:0 }; });
    var total = 0, done = 0;
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row || row.length === 0) continue;
      var hasData = false;
      for (var c = 0; c < Math.min(5, row.length); c++) {
        if (row[c] && row[c].trim() !== "") { hasData = true; break; }
      }
      if (!hasData) continue;
      total++;
      var sv = (row[si] || "").trim().toUpperCase();
      var isDone = (sv==="TRUE"||sv==="1"||sv==="YA"||sv==="YES"||sv==="SELESAI"||sv==="DONE"||sv==="BENAR");
      if (isDone) done++;
      var date = U.parseDate(row[di] || "");
      var key  = U.dateKey(date);
      if (key && monthly[key]) {
        monthly[key].total++;
        if (isDone) monthly[key].done++;
      }
    }
    return { total:total, done:done, inQueue:total-done, monthly:monthly, keys:keys,
      labels:keys.map(function(k){return U.keyToLabel(k);}) };
  },

  async fetch(sheetKey, sheetCfg) {
    var U = window.QueueApp.Utils;
    var exportUrl = U.toExportUrl(sheetCfg.editUrl || sheetCfg.url || "");
    if (navigator.onLine && exportUrl) {
      try {
        var res = await fetch(exportUrl, { cache:"no-cache", redirect:"follow" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var ct = res.headers.get("content-type") || "";
        if (ct.includes("text/html")) throw new Error("Spreadsheet tidak publik");
        var text = await res.text();
        var rows = U.parseCSV(text);
        console.log("[" + sheetKey + "] Baris CSV (incl. header): " + rows.length);
        var stats = window.QueueApp.DataService.process(rows, sheetCfg.statusColumn, sheetCfg.dateColumn, sheetCfg.startYear);
        console.log("[" + sheetKey + "] Total=" + stats.total + " Selesai=" + stats.done + " Antrean=" + stats.inQueue);
        await window.QueueApp.DB.setCache(sheetKey, { stats:stats, version:CACHE_VERSION });
        return { total:stats.total, done:stats.done, inQueue:stats.inQueue,
          monthly:stats.monthly, keys:stats.keys, labels:stats.labels,
          fromCache:false, ts:new Date().toISOString(), error:null };
      } catch (err) {
        console.warn("[" + sheetKey + "] Fetch gagal:", err.message);
      }
    }
    try {
      var cached = await window.QueueApp.DB.getCache(sheetKey);
      if (cached) {
        var cachedData = cached.stats || cached;
        var cachedVer  = (cachedData && cachedData.version) ? cachedData.version : 0;
        var actualStats = cachedData.stats || cachedData;
        if (cachedVer < CACHE_VERSION) {
          console.warn("[" + sheetKey + "] Cache lama diabaikan");
          await window.QueueApp.DB.deleteCache(sheetKey);
        } else if (actualStats && typeof actualStats.total === "number") {
          return { total:actualStats.total, done:actualStats.done, inQueue:actualStats.inQueue,
            monthly:actualStats.monthly, keys:actualStats.keys, labels:actualStats.labels,
            fromCache:true, ts:cached.ts, error:null };
        }
      }
    } catch (e) {
      console.warn("[" + sheetKey + "] DB read gagal:", e);
    }
    var ek = window.QueueApp.Utils.monthRange(sheetCfg.startYear);
    var em = {};
    ek.forEach(function(k) { em[k] = { total:0, done:0 }; });
    return { total:0, done:0, inQueue:0, monthly:em, keys:ek,
      labels:ek.map(function(k){return window.QueueApp.Utils.keyToLabel(k);}),
      fromCache:false, ts:null, error:"Tidak ada data — pastikan sheet sudah diset publik" };
  },

  async fetchAll() {
    var cfg = await window.QueueApp.Config.load();
    var results = {};
    await Promise.all(
      Object.entries(cfg.sheets).map(async function(entry) {
        var key = entry[0]; var sheetCfg = entry[1];
        results[key] = await window.QueueApp.DataService.fetch(key, sheetCfg);
      })
    );
    return results;
  },

  async clearCache() { return window.QueueApp.DB.clearAllCache(); },
};
