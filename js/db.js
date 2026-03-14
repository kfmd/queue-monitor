/**
 * db.js — Database Lokal (IndexedDB)
 * Sistem Monitoring Antrean Humas RSU Islam Klaten
 *
 * Menggunakan IndexedDB sebagai database lokal yang sesungguhnya —
 * bukan browser cache / localStorage.
 *
 * Object stores:
 *   "cache"  — Data hasil fetch dari Google Sheets (per sheet key)
 *   "config" — Konfigurasi aplikasi
 *
 * API:
 *   await QueueApp.DB.getCache(key)         → object | null
 *   await QueueApp.DB.setCache(key, data)
 *   await QueueApp.DB.deleteCache(key)
 *   await QueueApp.DB.clearAllCache()
 *   await QueueApp.DB.getConfig()           → object | null
 *   await QueueApp.DB.saveConfig(obj)
 */

window.QueueApp = window.QueueApp || {};

window.QueueApp.DB = (() => {
  const DB_NAME    = "QueueAppDB";
  const DB_VERSION = 2;
  const STORE_CACHE  = "cache";
  const STORE_CONFIG = "config";

  let _db = null; // Koneksi database yang sudah terbuka

  // ── Buka / Inisialisasi Database ─────────────────────────
  function open() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      // Dipanggil saat database dibuat pertama kali atau versi naik
      req.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Buat store "cache" jika belum ada
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          const cacheStore = db.createObjectStore(STORE_CACHE, { keyPath: "key" });
          cacheStore.createIndex("ts", "ts", { unique: false });
        }

        // Buat store "config" jika belum ada
        if (!db.objectStoreNames.contains(STORE_CONFIG)) {
          db.createObjectStore(STORE_CONFIG, { keyPath: "key" });
        }
      };

      req.onsuccess = (event) => {
        _db = event.target.result;

        // Tangani koneksi yang ditutup paksa
        _db.onversionchange = () => { _db.close(); _db = null; };

        resolve(_db);
      };

      req.onerror = (event) => {
        console.error("[DB] Gagal membuka IndexedDB:", event.target.error);
        reject(event.target.error);
      };

      req.onblocked = () => {
        console.warn("[DB] Pembukaan database diblokir — tutup tab lain yang menggunakan aplikasi ini.");
      };
    });
  }

  // ── Utilitas transaksi generik ───────────────────────────
  async function tx(storeName, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const req = fn(store);

      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  // ── API Cache ────────────────────────────────────────────

  /** Ambil cache untuk satu sheet key. Mengembalikan { key, ts, stats } atau null */
  async function getCache(key) {
    try {
      const result = await tx(STORE_CACHE, "readonly", store => store.get(key));
      return result || null;
    } catch (e) {
      console.warn("[DB] getCache gagal:", e);
      return null;
    }
  }

  /** Simpan cache untuk satu sheet key */
  async function setCache(key, stats) {
    try {
      const record = { key, ts: new Date().toISOString(), stats };
      await tx(STORE_CACHE, "readwrite", store => store.put(record));
      return true;
    } catch (e) {
      console.warn("[DB] setCache gagal:", e);
      return false;
    }
  }

  /** Hapus cache satu sheet */
  async function deleteCache(key) {
    try {
      await tx(STORE_CACHE, "readwrite", store => store.delete(key));
      return true;
    } catch (e) {
      console.warn("[DB] deleteCache gagal:", e);
      return false;
    }
  }

  /** Hapus semua cache */
  async function clearAllCache() {
    try {
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_CACHE, "readwrite");
        const req = transaction.objectStore(STORE_CACHE).clear();
        req.onsuccess = () => resolve(true);
        req.onerror   = () => reject(req.error);
      });
    } catch (e) {
      console.warn("[DB] clearAllCache gagal:", e);
      return false;
    }
  }

  // ── API Konfigurasi ──────────────────────────────────────

  /** Ambil konfigurasi tersimpan. Mengembalikan object value atau null */
  async function getConfig() {
    try {
      const result = await tx(STORE_CONFIG, "readonly", store => store.get("main"));
      return result ? result.value : null;
    } catch (e) {
      console.warn("[DB] getConfig gagal:", e);
      return null;
    }
  }

  /** Simpan konfigurasi */
  async function saveConfig(configObj) {
    try {
      await tx(STORE_CONFIG, "readwrite", store =>
        store.put({ key: "main", value: configObj, ts: new Date().toISOString() })
      );
      return true;
    } catch (e) {
      console.warn("[DB] saveConfig gagal:", e);
      return false;
    }
  }

  // ── Debug helper (bisa dipanggil dari console browser) ───
  async function debugDump() {
    const db = await open();
    console.group("[DB] IndexedDB Dump");
    for (const storeName of [STORE_CACHE, STORE_CONFIG]) {
      const all = await new Promise((res, rej) => {
        const t = db.transaction(storeName, "readonly");
        const req = t.objectStore(storeName).getAll();
        req.onsuccess = () => res(req.result);
        req.onerror   = () => rej(req.error);
      });
      console.log(`Store "${storeName}":`, all);
    }
    console.groupEnd();
  }

  // Expose ke window untuk debugging jika perlu
  window.__queueAppDBDebug = debugDump;

  return { open, getCache, setCache, deleteCache, clearAllCache, getConfig, saveConfig };
})();
