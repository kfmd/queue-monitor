/**
 * admin.js — Panel Admin (React) v3
 * - Password default disembunyikan di form login
 * - Config/cache menggunakan IndexedDB via db.js
 * - Tab Spreadsheet: tambah field anchorColumn
 */

/* global React, ReactDOM, QueueApp */
const { useState, useEffect } = React;

// ─────────────────────────────────────────────────────────
// KOMPONEN: FORM LOGIN
// ─────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");
  const [show, setShow] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const cfg = window.QueueApp.Config.get(); // sinkronis untuk login
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
              placeholder="Masukkan username"
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
                placeholder="Masukkan password"
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

        {/* Password default TIDAK ditampilkan di sini untuk keamanan */}

        <a href="index.html" className="back-link">← Kembali ke Dashboard</a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB: UMUM
// ─────────────────────────────────────────────────────────
function TabGeneral({ config, setConfig }) {
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  function showMsg(text, type) {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  }

  async function clearCache() {
    setClearing(true);
    await window.QueueApp.DataService.clearCache();
    setClearing(false);
    showMsg("✅ Cache berhasil dihapus dari database lokal.", "ok");
  }

  async function resetAll() {
    if (confirm("⚠️ Reset semua pengaturan ke default?\n\nTindakan ini tidak dapat dibatalkan.")) {
      const def = await window.QueueApp.Config.reset();
      setConfig(def);
      showMsg("✅ Pengaturan berhasil direset ke default.", "ok");
    }
  }

  function downloadConfigJSON() {
    const json = window.QueueApp.Config.exportJSON(config);
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "config.json";
    a.click();
    URL.revokeObjectURL(url);
    showMsg("📥 config.json berhasil diunduh! Ganti file lama di folder server.", "ok");
  }

  return (
    <div className="tab-body">
      <section className="form-section">
        <h3 className="section-title">Informasi Aplikasi</h3>

        <div className="field">
          <label className="field-label">Judul Utama Dashboard</label>
          <input type="text" className="field-input"
            value={config.title}
            onChange={e => setConfig(p => ({ ...p, title: e.target.value }))} />
        </div>

        <div className="field">
          <label className="field-label">Subjudul <span className="optional">(opsional)</span></label>
          <input type="text" className="field-input"
            value={config.subtitle || ""}
            onChange={e => setConfig(p => ({ ...p, subtitle: e.target.value }))} />
        </div>

        <div className="field">
          <label className="field-label">Interval Refresh Otomatis (detik)</label>
          <input type="number" className="field-input field-input-sm"
            value={config.refreshInterval || 300}
            min={30} max={3600}
            onChange={e => setConfig(p => ({ ...p, refreshInterval: parseInt(e.target.value) || 300 }))} />
          <span className="field-hint">Minimal 30 detik · Default 300 detik (5 menit)</span>
        </div>
      </section>

      {/* ── Sinkronisasi Lintas Perangkat ─────────────────── */}
      <section className="form-section">
        <h3 className="section-title">🔄 Sinkronisasi Lintas Perangkat</h3>

        <div className="info-box" style={{ marginBottom: "1rem" }}>
          <p>
            <strong>Cara kerja:</strong> Aplikasi membaca <code>config.json</code> dari folder server saat halaman dibuka.
            Semua perangkat yang mengakses server yang sama akan mendapat konfigurasi yang sama.
          </p>
          <p style={{ marginTop: "0.4rem" }}>
            <strong>Langkah update:</strong>
          </p>
          <ol style={{ marginLeft: "1rem", lineHeight: "1.8" }}>
            <li>Ubah pengaturan di tab mana saja</li>
            <li>Klik <strong>Simpan Perubahan</strong> di bagian atas</li>
            <li>Klik <strong>Download config.json</strong> di bawah ini</li>
            <li>Ganti file <code>config.json</code> lama di folder server/hosting</li>
            <li>Semua perangkat otomatis pakai konfigurasi baru saat halaman di-refresh</li>
          </ol>
        </div>

        <button className="btn-download-cfg" onClick={downloadConfigJSON}>
          📥 Download config.json
        </button>
      </section>

      <section className="form-section">
        <h3 className="section-title">Utilitas Database</h3>

        <div className="info-box" style={{ marginBottom: "1rem" }}>
          <p>💾 Cache data sheet disimpan di <strong>IndexedDB</strong> browser lokal perangkat ini.</p>
          <p>Untuk melihat isi: DevTools (F12) → Application → IndexedDB → <code>QueueAppDB</code>.</p>
        </div>

        <div className="btn-group-stack">
          <button className="btn-util danger" onClick={clearCache} disabled={clearing}>
            {clearing ? "⏳ Menghapus…" : "🗑 Hapus Cache Data Lokal"}
          </button>
          <button className="btn-util warning" onClick={resetAll}>
            🔄 Reset Semua Pengaturan ke Default
          </button>
        </div>

        {msg.text && (
          <div className={"alert " + (msg.type === "ok" ? "alert-ok" : "alert-error")} style={{ marginTop: "0.75rem" }}>
            {msg.text}
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB: SPREADSHEET
// ─────────────────────────────────────────────────────────
function TabSheets({ config, setConfig }) {
  const SHEET_META = {
    design:   { label: "Design",            icon: "✏️"  },
    video:    { label: "Dokumentasi/Video", icon: "🎬" },
    printing: { label: "Cetak Kolektif",    icon: "🖨️" },
  };

  function updateSheet(key, field, value) {
    setConfig(p => ({
      ...p,
      sheets: { ...p.sheets, [key]: { ...p.sheets[key], [field]: value } },
    }));
    // Hapus cache sheet ini saat URL berubah agar data segar diambil
    if (field === "editUrl") {
      window.QueueApp.DB.deleteCache(key).catch(() => {});
    }
  }

  return (
    <div className="tab-body">
      <div className="info-box info-important">
        <strong>⚠️ Penting:</strong> Setiap Google Sheets HARUS diatur ke
        <strong> "Anyone with the link can view"</strong>.
        Buka spreadsheet → tombol <strong>Share</strong> → ubah "General access" → simpan.
      </div>

      {Object.entries(config.sheets).map(([key, sheet]) => {
        const meta = SHEET_META[key] || {};
        return (
          <section key={key} className="form-section sheet-section" style={{"--sc": sheet.color}}>
            <h3 className="section-title sheet-title" style={{color: sheet.color}}>
              {meta.icon} {meta.label}
            </h3>

            <div className="field">
              <label className="field-label">Nama Tampilan</label>
              <input type="text" className="field-input"
                value={sheet.name}
                onChange={e => updateSheet(key, "name", e.target.value)} />
            </div>

            <div className="field">
              <label className="field-label">URL Google Sheets</label>
              <textarea className="field-input field-textarea" rows={2}
                value={sheet.editUrl || ""}
                placeholder="Paste URL Google Sheets di sini..."
                onChange={e => updateSheet(key, "editUrl", e.target.value.trim())} />
              <span className="field-hint">Salin dari address bar atau tombol Share. Format edit/share URL keduanya diterima.</span>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Kolom Status Selesai</label>
                <input type="text" className="field-input field-input-xs"
                  value={sheet.statusColumn} maxLength={2} placeholder="O"
                  onChange={e => updateSheet(key, "statusColumn", e.target.value.toUpperCase())} />
                <span className="field-hint">Kolom checkbox TRUE/FALSE</span>
              </div>

              <div className="field">
                <label className="field-label">Kolom Tanggal</label>
                <input type="text" className="field-input field-input-xs"
                  value={sheet.dateColumn} maxLength={2} placeholder="B"
                  onChange={e => updateSheet(key, "dateColumn", e.target.value.toUpperCase())} />
                <span className="field-hint">Tanggal permintaan (untuk grafik)</span>
              </div>

              <div className="field">
                <label className="field-label">Kolom Anchor</label>
                <input type="text" className="field-input field-input-xs"
                  value={sheet.anchorColumn || "A"} maxLength={2} placeholder="A"
                  onChange={e => updateSheet(key, "anchorColumn", e.target.value.toUpperCase())} />
                <span className="field-hint">Kolom penanda baris nyata (biasanya A = Timestamp Google Forms)</span>
              </div>

              <div className="field">
                <label className="field-label">Tahun Awal Grafik</label>
                <input type="number" className="field-input field-input-xs"
                  value={sheet.startYear} min={2020} max={2030}
                  onChange={e => updateSheet(key, "startYear", parseInt(e.target.value) || 2023)} />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Warna Kartu</label>
              <div className="color-row">
                <input type="color" className="color-pick"
                  value={sheet.color}
                  onChange={e => updateSheet(key, "color", e.target.value)} />
                <span className="color-chip" style={{background: sheet.color}}>{sheet.color}</span>
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
    { key: "primary",   label: "Warna Header",        hint: "Latar belakang header utama" },
    { key: "secondary", label: "Warna Aksen Sekunder", hint: "Untuk elemen sekunder"       },
    { key: "tertiary",  label: "Warna Aksen Tersier",  hint: "Untuk elemen tersier"        },
    { key: "bg",        label: "Warna Latar Halaman",  hint: "Background keseluruhan"      },
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
                <input type="color" className="color-pick"
                  value={config.theme[key] || "#000000"}
                  onChange={e => updateTheme(key, e.target.value)} />
                <span className="color-chip" style={{background: config.theme[key]}}>
                  {config.theme[key]}
                </span>
              </div>
              <span className="field-hint">{hint}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">Pratinjau</h3>
        <div className="preview-box" style={{background: config.theme.bg}}>
          <div className="prev-header" style={{background: config.theme.primary}}>
            <span>🏥 {config.title || "Sistem Monitoring"}</span>
            <span style={{fontSize:"0.75rem", opacity:0.8}}>{config.subtitle}</span>
          </div>
          <div className="prev-cards">
            {Object.values(config.sheets).map((s, i) => (
              <div key={i} className="prev-card" style={{borderTopColor: s.color}}>
                <span>{s.icon}</span>
                <span style={{fontSize:"0.75rem"}}>{s.name}</span>
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
  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");
  const [err,    setErr]    = useState("");
  const [ok,     setOk]     = useState("");

  async function handleChange() {
    setErr(""); setOk("");

    // Verifikasi password lama
    if (curPw !== config.password) return setErr("Password saat ini salah.");
    if (!newPw)                   return setErr("Password baru tidak boleh kosong.");
    if (newPw.length < 6)         return setErr("Password baru minimal 6 karakter.");
    if (newPw !== confPw)         return setErr("Konfirmasi password tidak cocok.");

    const updated = { ...config, password: newPw };
    await window.QueueApp.Config.save(updated);
    setConfig(updated);
    setCurPw(""); setNewPw(""); setConfPw("");
    setOk("✅ Password berhasil diubah!");
  }

  return (
    <div className="tab-body">
      <section className="form-section">
        <h3 className="section-title">Ubah Password Admin</h3>
        <p className="section-desc">Username: <code>admin</code> (tidak dapat diubah)</p>

        <div className="field">
          <label className="field-label">Password Saat Ini</label>
          <input type="password" className="field-input"
            value={curPw}
            onChange={e => setCurPw(e.target.value)}
            placeholder="Masukkan password saat ini"
            autoComplete="current-password" />
        </div>

        <div className="field">
          <label className="field-label">Password Baru</label>
          <input type="password" className="field-input"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password" />
        </div>

        <div className="field">
          <label className="field-label">Konfirmasi Password Baru</label>
          <input type="password" className="field-input"
            value={confPw}
            onChange={e => setConfPw(e.target.value)}
            placeholder="Ulangi password baru"
            autoComplete="new-password" />
        </div>

        {err && <div className="alert alert-error">{err}</div>}
        {ok  && <div className="alert alert-ok">{ok}</div>}

        <button className="btn-login" onClick={handleChange}>🔒 Ubah Password</button>
      </section>

      <section className="form-section">
        <h3 className="section-title">Catatan Keamanan</h3>
        <div className="info-box">
          <p>⚠️ Konfigurasi dan password disimpan di <strong>IndexedDB</strong> lokal browser — cocok untuk penggunaan intranet.</p>
          <p>Password default awal adalah <code>humas2024</code> — segera ganti setelah login pertama kali.</p>
          <p>Untuk melihat seluruh isi database: DevTools (F12) → Application → IndexedDB → <strong>QueueAppDB</strong>.</p>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PANEL UTAMA ADMIN
// ─────────────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
  const [config,    setConfig]    = useState(() => window.QueueApp.Config.get());
  const [activeTab, setActiveTab] = useState("general");
  const [saved,     setSaved]     = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Muat config terbaru dari IndexedDB saat mount
  useEffect(() => {
    window.QueueApp.Config.load().then(cfg => setConfig(cfg));
  }, []);

  const TABS = [
    { id: "general",    icon: "⚙️",  label: "Umum"         },
    { id: "sheets",     icon: "📊",  label: "Spreadsheet"  },
    { id: "appearance", icon: "🎨",  label: "Tampilan"     },
    { id: "security",   icon: "🔒",  label: "Keamanan"     },
  ];

  async function handleSave() {
    setSaving(true);
    await window.QueueApp.Config.save(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="admin-layout">
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
            <button key={t.id}
              className={"nav-btn " + (activeTab === t.id ? "active" : "")}
              onClick={() => setActiveTab(t.id)}>
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

      <div className="admin-main">
        <div className="admin-topbar">
          <h2 className="topbar-title">
            {(TABS.find(t => t.id === activeTab) || {}).icon}{" "}
            {(TABS.find(t => t.id === activeTab) || {}).label}
          </h2>
          {activeTab !== "security" && (
            <button
              className={"btn-save " + (saved ? "saved" : "")}
              onClick={handleSave}
              disabled={saving}>
              {saving ? "⏳ Menyimpan…" : saved ? "✓ Tersimpan!" : "💾 Simpan Perubahan"}
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
