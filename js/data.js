/**
 * data.js — Lapisan Data & Konfigurasi (v3)
 * Sistem Monitoring Antrean Humas RSU Islam Klaten
 *
 * Perubahan v3:
 * - Perbaikan parsing tanggal DD/MM/YYYY HH:MM:SS (ada komponen waktu)
 * - Perbaikan penghitungan baris: hanya baris yang kolom-A nya berisi data
 * - Semua persistensi data dipindah dari localStorage ke IndexedDB (db.js)
 */

window.QueueApp = window.QueueApp || {};

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
      anchorColumn: "A",
      startYear:    2023,
      color:        "#1a56db",
    },
    video: {
      name:         "Antrean Dokumentasi/Video",
      icon:         "\ud83c\udfa6",
      editUrl:      "https://docs.google.com/spreadsheets/d/1e9P8Sirx5rKjCWXGWUpTnzNMCICBlDbXmcQFIX85gxc/edit?gid=1623853028#gid=1623853028",
      statusColumn: "O",
      dateColumn:   "B",
      anchorColumn: "A",
      startYear:    2023,
      color:        "#7e3af2",
    },
    printing: {
      name:         "Antrean Cetak Kolektif",
      icon:         "\ud83d\udda8\ufe0f",
      editUrl:      "https://docs.google.com/spreadsheets/d/14bs2cmZeGFHFgWIAuQTCKgVqEK46CioihqjztVaHNzo/edit?gid=563013469#gid=563013469",
      statusColumn: "O",
      dateColumn:   "B",
      anchorColumn: "A",
      startYear:    2025,
      color:        "#057a55",
    },
  },
};

// ============================================================
// MANAJEMEN KONFIGURASI
// ============================================================
window.QueueApp.Config = {
  LS_KEY: "queueapp_config_sync_v3",

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
    const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return url;
    const sheetId = idMatch[1];
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    return "https://docs.google.com/spreadsheets/d/" + sheetId + "/export?format=csv&gid=" + gid;
  },

  colToIndex(letter) {
    if (!letter) return 0;
    const l = String(letter).trim().toUpperCase();
    if (l.length === 1) return l.charCodeAt(0) - 65;
    if (l.length === 2) return (l.charCodeAt(0) - 64) * 26 + (l.charCodeAt(1) - 65);
    return 0;
  },

  /**
   * Parse tanggal dari format Google Sheets Indonesia.
   * Contoh input: "26/02/2026 8:56:21"
   * Langkah: (1) ambil bagian tanggal saja, (2) parse sebagai DD/MM/YYYY
   */
  parseDate(raw) {
    if (!raw || typeof raw !== "string") return null;
    const s = raw.trim();
    if (!s) return null;

    // Ambil hanya bagian tanggal — buang " 8:56:21" dst
    const datePart = s.split(/\s+/)[0];

    if (datePart.includes("/")) {
      const parts = datePart.split("/");
      if (parts.length === 3) {
        const a = parseInt(parts[0], 10);
        const b = parseInt(parts[1], 10);
        const c = parseInt(parts[2], 10);

        if (c >= 1990 && c <= 2100) {
          // Prioritas: DD/MM/YYYY (format Indonesia)
          if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
            const d = new Date(c, b - 1, a);
            if (!isNaN(d.getTime())) return d;
          }
          // Fallback: MM/DD/YYYY
          if (b >= 1 && b <= 31 && a >= 1 && a <= 12) {
            const d = new Date(c, a - 1, b);
            if (!isNaN(d.getTime())) return d;
          }
        }
        // YYYY/MM/DD
        if (a >= 1990 && a <= 2100) {
          const d = new Date(a, b - 1, c);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }

    if (datePart.includes("-")) {
      const d = new Date(datePart);
      if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    return null;
  },

  dateKey(date) {
    if (!date) return null;
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  },

  keyToLabel(key) {
    const parts = key.split("-");
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
    return BULAN[m - 1] + " " + y;
  },

  monthRange(startYear) {
    const keys = [];
    const now  = new Date();
    const endY = now.getFullYear();
    const endM = now.getMonth() + 1;
    for (let y = Number(startYear); y <= endY; y++) {
      const lastM = y === endY ? endM : 12;
      for (let m = 1; m <= lastM; m++) {
        keys.push(y + "-" + String(m).padStart(2, "0"));
      }
    }
    return keys;
  },

  parseCSV(text) {
    const rows = [];
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
   * Proses baris CSV menjadi statistik.
   * PERBAIKAN: baris hanya dihitung jika kolom anchor (biasanya A = Timestamp)
   * berisi nilai — mencegah baris kosong/template ikut terhitung.
   */
  process(rows, statusCol, dateCol, anchorCol, startYear) {
    const U  = window.QueueApp.Utils;
    const si = U.colToIndex(statusCol  || "O");
    const di = U.colToIndex(dateCol    || "B");
    const ai = U.colToIndex(anchorCol  || "A");

    const keys = U.monthRange(startYear);
    const monthly = {};
    keys.forEach(function(k) { monthly[k] = { total: 0, done: 0 }; });

    let total = 0, done = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // Baris nyata = kolom anchor tidak kosong
      const anchorVal = (row[ai] || "").trim();
      if (!anchorVal) continue;

      total++;

      const sv = (row[si] || "").trim().toUpperCase();
      const isDone = sv === "TRUE" || sv === "1" || sv === "YA" || sv === "YES" || sv === "SELESAI";
      if (isDone) done++;

      const date = U.parseDate(row[di] || "");
      const key  = U.dateKey(date);
      if (key && monthly[key]) {
        monthly[key].total++;
        if (isDone) monthly[key].done++;
      }
    }

    return {
      total: total,
      done: done,
      inQueue: total - done,
      monthly: monthly,
      keys: keys,
      labels: keys.map(function(k) { return U.keyToLabel(k); }),
    };
  },

  async fetch(sheetKey, sheetCfg) {
    const U         = window.QueueApp.Utils;
    const exportUrl = U.toExportUrl(sheetCfg.editUrl || sheetCfg.url || "");

    if (navigator.onLine && exportUrl) {
      try {
        const res = await fetch(exportUrl, { cache: "no-cache", redirect: "follow" });
        if (!res.ok) throw new Error("HTTP " + res.status);

        const ct = res.headers.get("content-type") || "";
        if (ct.includes("text/html")) {
          throw new Error("Spreadsheet tidak publik");
        }

        const text  = await res.text();
        const rows  = U.parseCSV(text);

        console.log("[" + sheetKey + "] Baris CSV (incl. header): " + rows.length);

        const stats = this.process(
          rows,
          sheetCfg.statusColumn,
          sheetCfg.dateColumn,
          sheetCfg.anchorColumn || "A",
          sheetCfg.startYear
        );

        console.log("[" + sheetKey + "] Total=" + stats.total + " Selesai=" + stats.done + " Antrean=" + stats.inQueue);

        await window.QueueApp.DB.setCache(sheetKey, stats);

        return { total: stats.total, done: stats.done, inQueue: stats.inQueue,
          monthly: stats.monthly, keys: stats.keys, labels: stats.labels,
          fromCache: false, ts: new Date().toISOString(), error: null };

      } catch (err) {
        console.warn("[" + sheetKey + "] Fetch gagal:", err.message);
      }
    }

    try {
      const cached = await window.QueueApp.DB.getCache(sheetKey);
      if (cached && cached.stats) {
        return { ...cached.stats, fromCache: true, ts: cached.ts, error: null };
      }
    } catch (e) {
      console.warn("[" + sheetKey + "] DB read gagal:", e);
    }

    const keys    = window.QueueApp.Utils.monthRange(sheetCfg.startYear);
    const monthly = {};
    keys.forEach(function(k) { monthly[k] = { total: 0, done: 0 }; });
    return {
      total: 0, done: 0, inQueue: 0,
      monthly: monthly, keys: keys,
      labels: keys.map(function(k) { return window.QueueApp.Utils.keyToLabel(k); }),
      fromCache: false, ts: null,
      error: "Tidak ada data — pastikan sheet sudah diset publik",
    };
  },

  async fetchAll() {
    const cfg = await window.QueueApp.Config.load();
    const results = {};
    await Promise.all(
      Object.entries(cfg.sheets).map(async function(entry) {
        const key = entry[0];
        const sheetCfg = entry[1];
        results[key] = await window.QueueApp.DataService.fetch(key, sheetCfg);
      })
    );
    return results;
  },

  async clearCache() {
    return window.QueueApp.DB.clearAllCache();
  },
};
