/**
 * admin.js — Panel Admin (React)
 * Login → Panel manajemen konfigurasi
 *
 * Komponen:
 * - AdminApp     : Root (router login ↔ panel)
 * - LoginForm    : Form username + password
 * - AdminPanel   : Panel utama dengan sidebar + tab
 *   - TabGeneral     : Judul, interval refresh, utilitas
 *   - TabSheets      : Konfigurasi tiap Google Sheet
 *   - TabAppearance  : Warna tema + pratinjau
 *   - TabSecurity    : Ubah password
 */

/* global React, ReactDOM, QueueApp */
const { useState, useEffect } = React;

// ─────────────────────────────────────────────────────────
// KOMPONEN: FORM LOGIN
// ─────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const [user, setUser]   = useState("");
  const [pass, setPass]   = useState("");
  const [err,  setErr]    = useState("");
  const [show, setShow]   = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const cfg = window.QueueApp.Config.get();
    if (user === "admin" && pass === cfg.password) {
      setErr("");
      onLogin();
    } else {
      setErr("Username atau password salah!");
      setPass("");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🏥</div>
        <h1 className="login-title">Panel Admin</h1>
        <p className="login-sub">Sistem Monitoring Antrean<br/>Humas RSU Islam Klaten</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label className="field-label">Username</label>
            <input
              type="text"
              className="field-input"
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <div className="input-eye-wrap">
              <input
                type={show ? "text" : "password"}
                className="field-input"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShow(s => !s)}>
                {show ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {err && <div className="alert alert-error">{err}</div>}

          <button type="submit" className="btn-login">Masuk</button>
        </form>

        <div className="login-hint">
          Password default: <code>humas2024</code>
        </div>

        <a href="index.html" className="back-link">← Kembali ke Dashboard</a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB: UMUM
// ─────────────────────────────────────────────────────────
function TabGeneral({ config, setConfig }) {
  function clearCache() {
    window.QueueApp.DataService.clearCache();
    alert("✅ Cache berhasil dihapus. Data akan diperbarui saat dashboard dibuka.");
  }

  function resetAll() {
    if (confirm("⚠️ Reset semua pengaturan ke default?\n\nTindakan ini tidak dapat dibatalkan.")) {
      const def = window.QueueApp.Config.reset();
      setConfig(def);
      alert("Pengaturan berhasil direset.");
    }
  }

  return (
    <div className="tab-body">
      <section className="form-section">
        <h3 className="section-title">Informasi Aplikasi</h3>

        <div className="field">
          <label className="field-label">Judul Utama Dashboard</label>
          <input
            type="text"
            className="field-input"
            value={config.title}
            onChange={e => setConfig(p => ({ ...p, title: e.target.value }))}
            placeholder="Contoh: Monitoring Antrean RSU Islam Klaten"
          />
        </div>

        <div className="field">
          <label className="field-label">Subjudul <span className="optional">(opsional)</span></label>
          <input
            type="text"
            className="field-input"
            value={config.subtitle || ""}
            onChange={e => setConfig(p => ({ ...p, subtitle: e.target.value }))}
            placeholder="Contoh: Humas RSU Islam Klaten"
          />
        </div>

        <div className="field">
          <label className="field-label">Interval Refresh Otomatis (detik)</label>
          <input
            type="number"
            className="field-input field-input-sm"
            value={config.refreshInterval || 300}
            min={30} max={3600}
            onChange={e => setConfig(p => ({ ...p, refreshInterval: parseInt(e.target.value) || 300 }))}
          />
          <span className="field-hint">Minimal 30 detik · Default 300 detik (5 menit)</span>
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">Utilitas</h3>
        <div className="btn-group-stack">
          <button className="btn-util danger" onClick={clearCache}>
            🗑 Hapus Cache Data Lokal
          </button>
          <button className="btn-util warning" onClick={resetAll}>
            🔄 Reset Semua Pengaturan ke Default
          </button>
        </div>
        <div className="info-box">
          <p>💡 <strong>Cache</strong> disimpan di browser Anda sehingga data tetap tampil saat offline.</p>
          <p>Cache dihapus otomatis saat Anda mengubah URL spreadsheet.</p>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB: SPREADSHEET
// ─────────────────────────────────────────────────────────
function TabSheets({ config, setConfig }) {
  const SHEET_META = {
    design:   { label: "Design",         icon: "✏️" },
    video:    { label: "Dokumentasi/Video", icon: "🎬" },
    printing: { label: "Cetak Kolektif", icon: "🖨️" },
  };

  function updateSheet(key, field, value) {
    setConfig(p => ({
      ...p,
      sheets: {
        ...p.sheets,
        [key]: { ...p.sheets[key], [field]: value },
      },
    }));
  }

  return (
    <div className="tab-body">
      <div className="info-box info-important">
        <strong>⚠️ Penting:</strong> Agar data dapat diambil, setiap Google Sheets HARUS diatur ke
        <strong> "Anyone with the link can view"</strong> (siapa saja dengan link bisa melihat).
        Buka spreadsheet → Share → ubah akses.
      </div>

      {Object.entries(config.sheets).map(([key, sheet]) => {
        const meta = SHEET_META[key] || {};
        return (
          <section key={key} className="form-section sheet-section" style={{ "--sc": sheet.color }}>
            <h3 className="section-title sheet-title" style={{ color: sheet.color }}>
              {meta.icon} {meta.label}
            </h3>

            <div className="field">
              <label className="field-label">Nama Tampilan</label>
              <input
                type="text"
                className="field-input"
                value={sheet.name}
                onChange={e => updateSheet(key, "name", e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">URL Google Sheets</label>
              <textarea
                className="field-input field-textarea"
                value={sheet.editUrl || ""}
                rows={2}
                placeholder="Paste URL Google Sheets di sini..."
                onChange={e => {
                  const url = e.target.value.trim();
                  updateSheet(key, "editUrl", url);
                  // Bersihkan cache untuk sheet ini saat URL berubah
                  try { localStorage.removeItem("queueapp_cache_" + key); } catch (_) {}
                }}
              />
              <span className="field-hint">
                Salin dari address bar saat membuka spreadsheet, atau dari tombol Share.
                Format edit atau share URL keduanya diterima.
              </span>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Kolom Status (Selesai)</label>
                <input
                  type="text"
                  className="field-input field-input-xs"
                  value={sheet.statusColumn}
                  maxLength={2}
                  placeholder="O"
                  onChange={e => updateSheet(key, "statusColumn", e.target.value.toUpperCase())}
                />
                <span className="field-hint">Kolom dengan checkbox TRUE/FALSE</span>
              </div>

              <div className="field">
                <label className="field-label">Kolom Tanggal</label>
                <input
                  type="text"
                  className="field-input field-input-xs"
                  value={sheet.dateColumn}
                  maxLength={2}
                  placeholder="B"
                  onChange={e => updateSheet(key, "dateColumn", e.target.value.toUpperCase())}
                />
                <span className="field-hint">Kolom berisi tanggal permintaan</span>
              </div>

              <div className="field">
                <label className="field-label">Tahun Awal Grafik</label>
                <input
                  type="number"
                  className="field-input field-input-xs"
                  value={sheet.startYear}
                  min={2020} max={2030}
                  onChange={e => updateSheet(key, "startYear", parseInt(e.target.value) || 2023)}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Warna Kartu</label>
              <div className="color-row">
                <input
                  type="color"
                  className="color-pick"
                  value={sheet.color}
                  onChange={e => updateSheet(key, "color", e.target.value)}
                />
                <span className="color-chip" style={{ background: sheet.color }}>{sheet.color}</span>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB: TAMPILAN
// ─────────────────────────────────────────────────────────
function TabAppearance({ config, setConfig }) {
  const colors = [
    { key: "primary",   label: "Warna Header",           hint: "Latar belakang header utama" },
    { key: "secondary", label: "Warna Aksen Sekunder",   hint: "Untuk elemen sekunder" },
    { key: "tertiary",  label: "Warna Aksen Tersier",    hint: "Untuk elemen tersier" },
    { key: "bg",        label: "Warna Latar Halaman",    hint: "Background keseluruhan halaman" },
  ];

  function updateTheme(k, v) {
    setConfig(p => ({ ...p, theme: { ...p.theme, [k]: v } }));
  }

  return (
    <div className="tab-body">
      <section className="form-section">
        <h3 className="section-title">Warna Tema</h3>

        <div className="color-grid">
          {colors.map(({ key, label, hint }) => (
            <div key={key} className="field">
              <label className="field-label">{label}</label>
              <div className="color-row">
                <input
                  type="color"
                  className="color-pick"
                  value={config.theme[key] || "#000000"}
                  onChange={e => updateTheme(key, e.target.value)}
                />
                <span className="color-chip" style={{ background: config.theme[key] }}>
                  {config.theme[key]}
                </span>
              </div>
              <span className="field-hint">{hint}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pratinjau langsung */}
      <section className="form-section">
        <h3 className="section-title">Pratinjau</h3>
        <div className="preview-box" style={{ background: config.theme.bg }}>
          <div className="prev-header" style={{ background: config.theme.primary }}>
            <span>🏥 {config.title || "Sistem Monitoring"}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{config.subtitle}</span>
          </div>
          <div className="prev-cards">
            {Object.values(config.sheets).map((s, i) => (
              <div key={i} className="prev-card" style={{ borderTopColor: s.color }}>
                <span>{s.icon}</span>
                <span style={{ fontSize: "0.75rem" }}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB: KEAMANAN
// ─────────────────────────────────────────────────────────
function TabSecurity({ config, setConfig }) {
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");
  const [err,    setErr]    = useState("");
  const [ok,     setOk]     = useState("");

  function handleChange() {
    setErr(""); setOk("");
    if (!newPw)             return setErr("Password baru tidak boleh kosong.");
    if (newPw.length < 6)   return setErr("Password minimal 6 karakter.");
    if (newPw !== confPw)   return setErr("Konfirmasi password tidak cocok.");

    const updated = { ...config, password: newPw };
    setConfig(updated);
    window.QueueApp.Config.save(updated);
    setNewPw(""); setConfPw("");
    setOk("✅ Password berhasil diubah!");
  }

  return (
    <div className="tab-body">
      <section className="form-section">
        <h3 className="section-title">Ubah Password Admin</h3>
        <p className="section-desc">Username: <code>admin</code> (tidak dapat diubah)</p>

        <div className="field">
          <label className="field-label">Password Baru</label>
          <input
            type="password"
            className="field-input"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
          />
        </div>

        <div className="field">
          <label className="field-label">Konfirmasi Password Baru</label>
          <input
            type="password"
            className="field-input"
            value={confPw}
            onChange={e => setConfPw(e.target.value)}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
          />
        </div>

        {err && <div className="alert alert-error">{err}</div>}
        {ok  && <div className="alert alert-ok">{ok}</div>}

        <button className="btn-login" onClick={handleChange}>🔒 Ubah Password</button>
      </section>

      <section className="form-section">
        <h3 className="section-title">Catatan Keamanan</h3>
        <div className="info-box">
          <p>⚠️ Konfigurasi dan password disimpan di <strong>localStorage</strong> browser — cocok untuk penggunaan intranet.</p>
          <p>Jangan gunakan password yang sama dengan akun penting lainnya.</p>
          <p>Untuk keamanan tingkat tinggi, pertimbangkan menggunakan server backend dengan autentikasi yang lebih kuat.</p>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KOMPONEN UTAMA: PANEL ADMIN
// ─────────────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
  const [config,    setConfig]    = useState(() => window.QueueApp.Config.get());
  const [activeTab, setActiveTab] = useState("general");
  const [saved,     setSaved]     = useState(false);

  const TABS = [
    { id: "general",    icon: "⚙️",  label: "Umum"         },
    { id: "sheets",     icon: "📊",  label: "Spreadsheet"  },
    { id: "appearance", icon: "🎨",  label: "Tampilan"     },
    { id: "security",   icon: "🔒",  label: "Keamanan"     },
  ];

  function handleSave() {
    window.QueueApp.Config.save(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">📋</span>
          <div>
            <div className="brand-title">Admin Panel</div>
            <div className="brand-sub">RSU Islam Klaten</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <a href="index.html" className="foot-link">← Dashboard</a>
          <button className="btn-logout" onClick={onLogout}>Keluar</button>
        </div>
      </aside>

      {/* ── Konten Utama ── */}
      <div className="admin-main">
        <div className="admin-topbar">
          <h2 className="topbar-title">
            {TABS.find(t => t.id === activeTab)?.icon}{" "}
            {TABS.find(t => t.id === activeTab)?.label}
          </h2>

          {activeTab !== "security" && (
            <button
              className={`btn-save ${saved ? "saved" : ""}`}
              onClick={handleSave}
            >
              {saved ? "✓ Tersimpan!" : "💾 Simpan Perubahan"}
            </button>
          )}
        </div>

        <div className="admin-content">
          {activeTab === "general"    && <TabGeneral    config={config} setConfig={setConfig} />}
          {activeTab === "sheets"     && <TabSheets     config={config} setConfig={setConfig} />}
          {activeTab === "appearance" && <TabAppearance config={config} setConfig={setConfig} />}
          {activeTab === "security"   && <TabSecurity   config={config} setConfig={setConfig} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────
function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Cek sesi aktif
    if (sessionStorage.getItem("queueapp_admin") === "yes") {
      setLoggedIn(true);
    }
  }, []);

  function login() {
    sessionStorage.setItem("queueapp_admin", "yes");
    setLoggedIn(true);
  }

  function logout() {
    sessionStorage.removeItem("queueapp_admin");
    setLoggedIn(false);
  }

  return loggedIn
    ? <AdminPanel onLogout={logout} />
    : <LoginForm  onLogin={login}  />;
}

const rootEl = document.getElementById("root");
const reactRoot = ReactDOM.createRoot(rootEl);
reactRoot.render(<AdminApp />);
