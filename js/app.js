/**
 * app.js — Dashboard Utama (React + Chart.js)
 * Diproses oleh Babel Standalone (JSX → JavaScript)
 *
 * Komponen:
 * - App          : Root aplikasi
 * - Header       : Judul + tombol refresh
 * - QueueSection : Satu bagian antrean (Design / Video / Cetak)
 * - StatCard     : Badge angka statistik
 * - MonthChart   : Grafik bar Chart.js per bulan
 */

/* global React, ReactDOM, Chart, QueueApp */
const { useState, useEffect, useRef, useCallback } = React;

// ─────────────────────────────────────────────────────────
// KOMPONEN: GRAFIK BULANAN (dengan year toggle)
// ─────────────────────────────────────────────────────────
function MonthChart({ data, color, sheetKey, startYear }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // Kumpulkan semua tahun yang tersedia dari data.keys
  const availableYears = React.useMemo(() => {
    if (!data || !data.keys) return [];
    const ySet = new Set();
    data.keys.forEach(k => ySet.add(parseInt(k.split("-")[0], 10)));
    return Array.from(ySet).sort((a, b) => a - b);
  }, [data]);

  // Default: tahun sekarang; jika tidak ada data → tahun terakhir
  const currentYear = new Date().getFullYear();
  const defaultYear = availableYears.includes(currentYear)
    ? currentYear
    : (availableYears[availableYears.length - 1] || currentYear);

  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Reset ke tahun sekarang setiap kali data baru masuk
  useEffect(() => {
    setSelectedYear(
      availableYears.includes(currentYear)
        ? currentYear
        : (availableYears[availableYears.length - 1] || currentYear)
    );
  }, [sheetKey]);

  // Filter keys & labels hanya untuk tahun yang dipilih
  const filteredKeys = React.useMemo(() => {
    if (!data || !data.keys) return [];
    return data.keys.filter(k => k.startsWith(String(selectedYear) + "-"));
  }, [data, selectedYear]);

  const filteredLabels = React.useMemo(() => {
    const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return filteredKeys.map(k => BULAN[parseInt(k.split("-")[1], 10) - 1]);
  }, [filteredKeys]);

  // Hitung total per tahun untuk badge di tombol toggle
  const yearTotals = React.useMemo(() => {
    if (!data || !data.monthly) return {};
    const totals = {};
    availableYears.forEach(y => {
      let t = 0;
      data.keys
        .filter(k => k.startsWith(String(y) + "-"))
        .forEach(k => { t += (data.monthly[k] || {}).total || 0; });
      totals[y] = t;
    });
    return totals;
  }, [data, availableYears]);

  const hex2rgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // Buat / update chart setiap kali filtered data berubah
  useEffect(() => {
    if (!canvasRef.current || filteredKeys.length === 0) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const totals = filteredKeys.map(k => (data.monthly[k] || {}).total || 0);
    const dones = filteredKeys.map(k => (data.monthly[k] || {}).done || 0);

    chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type: "bar",
      data: {
        labels: filteredLabels,
        datasets: [
          {
            label: "Total Request",
            data: totals,
            backgroundColor: hex2rgba(color, 0.75),
            borderColor: color,
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Selesai",
            data: dones,
            backgroundColor: "rgba(5, 150, 105, 0.75)",
            borderColor: "#059669",
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
              padding: 14, boxWidth: 12, boxHeight: 12,
            },
          },
          tooltip: {
            backgroundColor: "#1e293b",
            titleFont: { size: 12 },
            bodyFont: { size: 11 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0].dataIndex;
                const total = totals[idx] || 0;
                const done = dones[idx] || 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return [`Progres: ${pct}%`];
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: "600" }, color: "#475569" },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: {
              stepSize: 1,
              font: { size: 10 },
              callback: v => Number.isInteger(v) ? v : null,
            },
          },
        },
        animation: { duration: 350, easing: "easeOutQuart" },
      },
    });

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [filteredKeys, filteredLabels, color, data]);

  if (!data || !data.keys || availableYears.length === 0) return null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>

      {/* ── Year Toggle Buttons — inline styles guarantee correct render on all devices ── */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", alignItems:"center" }}>
        {availableYears.map(y => {
          const isActive = selectedYear === y;
          return (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "5px",
                padding:        "4px 14px",
                borderRadius:   "999px",
                border:         isActive ? "1.5px solid transparent" : "1.5px solid #d1d5db",
                background:     isActive ? color : "#f8fafc",
                color:          isActive ? "#fff" : "#475569",
                fontFamily:     "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize:       "0.8rem",
                fontWeight:     "700",
                cursor:         "pointer",
                boxShadow:      isActive ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                transition:     "all 0.18s ease",
                letterSpacing:  "0.02em",
                lineHeight:     "1.5",
                whiteSpace:     "nowrap",
              }}
            >
              {y}
              {yearTotals[y] > 0 && (
                <span style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  justifyContent:"center",
                  background:    isActive ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                  color:         isActive ? "#fff" : "#64748b",
                  fontSize:      "0.65rem",
                  fontWeight:    "800",
                  padding:       "1px 6px",
                  borderRadius:  "999px",
                  minWidth:      "20px",
                  lineHeight:    "1.5",
                }}>
                  {yearTotals[y]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Chart Canvas ── */}
      <div style={{ position:"relative", width:"100%", height:"230px" }}>
        {filteredKeys.length > 0 ? (
          <canvas ref={canvasRef} style={{ width:"100%", height:"100%" }} />
        ) : (
          <p style={{ textAlign:"center", color:"#94a3b8", fontSize:"0.85rem", paddingTop:"3rem" }}>
            Tidak ada data untuk tahun {selectedYear}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KOMPONEN: BADGE STATISTIK
// ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon, variant }) {
  const variants = {
    blue: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
    green: { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
    amber: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  };
  const v = variants[variant] || variants.blue;
  return (
    <div className="stat-card" style={{ background: v.bg, borderColor: v.border }}>
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-value" style={{ color: v.text }}>
          {window.QueueApp.Utils.num(value)}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KOMPONEN: SKELETON LOADING
// ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="skeleton-wrap">
      <div className="skel skel-stats" />
      <div className="skel skel-chart" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KOMPONEN: SEKSI ANTREAN (satu kartu besar)
// ─────────────────────────────────────────────────────────
function QueueSection({ sheetKey, sheetCfg, data, loading }) {
  const [open, setOpen] = useState(true);
  const U = window.QueueApp.Utils;

  return (
    <section className="queue-section">
      {/* Header kartu dengan warna kustom */}
      <div className="qs-header" style={{ "--card-color": sheetCfg.color }}>
        <div className="qs-header-left">
          <span className="qs-icon">{sheetCfg.icon}</span>
          <h2 className="qs-title">{sheetCfg.name}</h2>
        </div>
        <div className="qs-header-right">
          {data && data.fromCache && (
            <span className="cache-badge">📦 Cache</span>
          )}
          {data && data.ts && (
            <span className="ts-badge">🕐 {U.datetime(data.ts)}</span>
          )}
          <button className="toggle-btn" onClick={() => setOpen(o => !o)} title="Tampilkan/Sembunyikan">
            <span className={`chevron ${open ? "up" : "down"}`}>›</span>
          </button>
        </div>
      </div>

      {/* Isi kartu */}
      {open && (
        <div className="qs-body">
          {loading ? (
            <Skeleton />
          ) : data && data.error ? (
            <div className="error-box">
              <span>⚠️</span>
              <div>
                <strong>Gagal memuat data</strong>
                <p>Pastikan spreadsheet sudah diset "Anyone with the link can view" dan link sudah benar di Admin Panel.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Statistik angka */}
              <div className="stat-row">
                <StatCard label="Total Request" value={data?.total} icon="📋" variant="blue" />
                <StatCard label="Selesai" value={data?.done} icon="✅" variant="green" />
                <StatCard label="Dalam Antrean" value={data?.inQueue} icon="⏳" variant="amber" />
              </div>

              {/* Progress bar visual */}
              {data && data.total > 0 && (
                <div className="progress-wrap">
                  <div className="progress-bar" title={`${data.done} dari ${data.total} selesai`}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.round((data.done / data.total) * 100)}%`,
                        background: sheetCfg.color,
                      }}
                    />
                  </div>
                  <span className="progress-label">
                    {Math.round((data.done / data.total) * 100)}% selesai
                  </span>
                </div>
              )}

              {/* Grafik bulanan */}
              <div className="chart-section">
                <h3 className="chart-heading">📊 Statistik Bulanan</h3>
                {data && data.keys && data.keys.length > 0 ? (
                  <MonthChart data={data} color={sheetCfg.color} sheetKey={sheetKey} startYear={sheetCfg.startYear} />
                ) : (
                  <p className="no-data">Tidak ada data grafik</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// KOMPONEN: HEADER
// ─────────────────────────────────────────────────────────
function AppHeader({ config, onRefresh, refreshing, lastUpdated }) {
  return (
    <header className="app-header" style={{ "--primary": config.theme.primary }}>
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">🏥</div>
          <div>
            <h1 className="header-title">{config.title}</h1>
            {config.subtitle && <p className="header-sub">{config.subtitle}</p>}
          </div>
        </div>
        <div className="header-actions">
          {lastUpdated && (
            <span className="last-update">
              Diperbarui: {window.QueueApp.Utils.datetime(lastUpdated)}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`btn-refresh ${refreshing ? "loading" : ""}`}
          >
            <span className={refreshing ? "spin" : ""}>↻</span>
            {refreshing ? "Memuat…" : "Perbarui"}
          </button>
          <a href="admin.html" className="btn-admin">⚙ Admin</a>
        </div>
      </div>

      {/* Banner offline */}
      {!navigator.onLine && (
        <div className="offline-bar">
          📵 Mode Offline — menampilkan data tersimpan terakhir
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────
// ROOT APLIKASI
// ─────────────────────────────────────────────────────────
function App() {
  const [config, setConfig] = useState(() => window.QueueApp.Config.get());
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({ design: true, video: true, printing: true });
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    const cfg = await window.QueueApp.Config.load();
    setConfig(cfg);

    // Mulai fetch semua sheet secara paralel
    await Promise.all(
      Object.entries(cfg.sheets).map(async ([key, sheetCfg]) => {
        setLoading(prev => ({ ...prev, [key]: true }));
        const result = await window.QueueApp.DataService.fetch(key, sheetCfg);
        setData(prev => ({ ...prev, [key]: result }));
        setLoading(prev => ({ ...prev, [key]: false }));
      })
    );

    setLastUpdated(new Date().toISOString());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadAll();

    // Auto-refresh sesuai konfigurasi
    const interval = setInterval(loadAll, (config.refreshInterval || 300) * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-root" style={{ background: config.theme.bg }}>
      <AppHeader
        config={config}
        onRefresh={loadAll}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      <main className="main-grid">
        {Object.entries(config.sheets).map(([key, sheetCfg]) => (
          <QueueSection
            key={key}
            sheetKey={key}
            sheetCfg={sheetCfg}
            data={data[key]}
            loading={loading[key]}
          />
        ))}
      </main>

      <footer className="app-footer">
        <p>Sistem Monitoring Antrean · Humas RSU Islam Klaten</p>
        <p>Dikembangkan oleh dr. Khariz Fahrurrozi · <a href="https://kfmd.notion.site" target="_blank">kfmd.notion.site</a></p>
        <p style={{ fontSize: "0.75rem", opacity: 0.6 }}>
          Data bersumber dari Google Sheets · Refresh otomatis setiap {config.refreshInterval || 300} detik
        </p>
      </footer>
    </div>
  );
}

// Render ke DOM
const rootEl = document.getElementById("root");
const reactRoot = ReactDOM.createRoot(rootEl);
reactRoot.render(<App />);
