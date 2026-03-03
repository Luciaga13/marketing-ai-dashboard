import { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

const BLOQUES_META = [
  { id: "contenido", nombre: "Contenido",   color: "#E91E8C" },
  { id: "paid",      nombre: "Mkt Digital", color: "#0066CC" },
  { id: "diseno",    nombre: "Diseño",      color: "#FF6B35" },
];

const INICIATIVAS_BASE = {
  contenido: [
    { id: "rrss",    nombre: "RRSS",       herramientas: "N8N + ChatGPT + Nano Banana" },
    { id: "blog",    nombre: "Blog",        herramientas: "N8N + ChatGPT + Gemini + Nano Banana" },
    { id: "video",   nombre: "Vídeos",      herramientas: "Seedream + Heygen + Dzine + ChatGPT" },
  ],
  paid: [
    { id: "informes",   nombre: "Informes y análisis",    herramientas: "Claude + Lovable + SF" },
    { id: "linkedin",   nombre: "Automatización LinkedIn", herramientas: "Claude Code + Nano Banana" },
    { id: "anuncios",   nombre: "Generación anuncios",     herramientas: "IA generativa" },
    { id: "email",      nombre: "Email mkt",               herramientas: "Brevo + Salesforce" },
    { id: "leads",      nombre: "Gestión de leads",        herramientas: "SF + Claude" },
  ],
  diseno: [
    { id: "materiales",  nombre: "Materiales / Marca", herramientas: "Archivo común estilo" },
    { id: "web",         nombre: "Web",                herramientas: "Figma Make" },
    { id: "maquetacion", nombre: "Maquetación",        herramientas: "Claude Code" },
    { id: "lovable",     nombre: "Valoración Lovable", herramientas: "Lovable" },
  ],
};

const estadoConfig = {
  "activo":      { label: "✅ Completado",  bg: "#d4edda", color: "#155724" },
  "en-progreso": { label: "🔄 En progreso", bg: "#fff3cd", color: "#856404" },
  "pendiente":   { label: "⏳ Pendiente",   bg: "#f8d7da", color: "#721c24" },
  "evaluando":   { label: "🔍 Evaluando",   bg: "#e2d9f3", color: "#4a235a" },
};

const makeWeekData = (label, fecha, overrides = {}) => ({
  label, fecha,
  bloques: BLOQUES_META.map(b => ({
    ...b,
    iniciativas: INICIATIVAS_BASE[b.id].map(i => ({
      ...i,
      automatizacion: overrides[i.id]?.automatizacion ?? 0,
      estado: overrides[i.id]?.estado ?? "pendiente",
    }))
  }))
});

const DEFAULT_HISTORY = [
  makeWeekData("Semana 1", "2026-03-06", {
    rrss:     { automatizacion: 30, estado: "en-progreso" },
    blog:     { automatizacion: 20, estado: "en-progreso" },
    informes: { automatizacion: 20, estado: "en-progreso" },
    anuncios: { automatizacion: 50, estado: "en-progreso" },
    email:    { automatizacion: 30, estado: "en-progreso" },
  }),
];

const STORAGE_KEY = "mkt-ai-dashboard-v1";

function AutoBar({ value, color }) {
  return (
    <div style={{ background: "#eee", borderRadius: 6, height: 10, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${value}%`, background: color, height: "100%", borderRadius: 6, transition: "width 0.4s" }} />
    </div>
  );
}

function EditableNumber({ value, onChange }) {
  return (
    <input type="number" min={0} max={100} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: 52, border: "1px solid #ddd", borderRadius: 4, padding: "2px 4px", fontSize: 13, textAlign: "center" }} />
  );
}

export default function Dashboard() {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_HISTORY;
    } catch { return DEFAULT_HISTORY; }
  });

  const [currentIdx, setCurrentIdx] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).length - 1 : 0;
    } catch { return 0; }
  });

  const [editMode, setEditMode]     = useState(false);
  const [activeBloque, setActiveBloque] = useState("contenido");
  const [tab, setTab]               = useState("detalle");

  // Guardar en localStorage cada vez que cambia el historial
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const week = history[currentIdx];

  const updateIniciativa = (bloqueId, iniId, field, val) => {
    setHistory(h => h.map((w, i) => i !== currentIdx ? w : {
      ...w,
      bloques: w.bloques.map(b => b.id !== bloqueId ? b : {
        ...b,
        iniciativas: b.iniciativas.map(ini => ini.id !== iniId ? ini : { ...ini, [field]: val })
      })
    }));
  };

  const updateWeekMeta = (field, val) => {
    setHistory(h => h.map((w, i) => i !== currentIdx ? w : { ...w, [field]: val }));
  };

  const addWeek = () => {
    const last = history[history.length - 1];
    const newWeek = {
      ...JSON.parse(JSON.stringify(last)),
      label: `Semana ${history.length + 1}`,
      fecha: "",
    };
    setHistory(h => [...h, newWeek]);
    setCurrentIdx(history.length);
    setEditMode(true);
  };

  const bloque     = week.bloques.find(b => b.id === activeBloque);
  const allInis    = week.bloques.flatMap(b => b.iniciativas);
  const autoGlobal = Math.round(allInis.reduce((s, i) => s + i.automatizacion, 0) / allInis.length);
  const completadas = allInis.filter(i => i.estado === "activo").length;

  const chartData = useMemo(() => history.map(w => {
    const row = { semana: w.label };
    w.bloques.forEach(b => {
      row[b.nombre] = Math.round(b.iniciativas.reduce((s, i) => s + i.automatizacion, 0) / b.iniciativas.length);
    });
    row["Global"] = Math.round(w.bloques.flatMap(b => b.iniciativas).reduce((s, i) => s + i.automatizacion, 0) / w.bloques.flatMap(b => b.iniciativas).length);
    return row;
  }), [history]);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#f5f6fa", minHeight: "100vh", padding: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#E91E8C", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Plan IA Marketing</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>Dashboard Semanal 2026</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 10, padding: "6px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
            <button onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setEditMode(false); }}
              disabled={currentIdx === 0}
              style={{ background: "none", border: "none", fontSize: 16, cursor: currentIdx === 0 ? "default" : "pointer", color: currentIdx === 0 ? "#ccc" : "#333" }}>‹</button>
            {editMode ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={week.label} onChange={e => updateWeekMeta("label", e.target.value)}
                  style={{ width: 90, border: "1px solid #ddd", borderRadius: 6, padding: "2px 6px", fontSize: 13, fontWeight: 700 }} />
                <input type="date" value={week.fecha} onChange={e => updateWeekMeta("fecha", e.target.value)}
                  style={{ border: "1px solid #ddd", borderRadius: 6, padding: "2px 6px", fontSize: 13 }} />
              </div>
            ) : (
              <div style={{ textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{week.label}</div>
                {week.fecha && <div style={{ fontSize: 11, color: "#999" }}>{week.fecha}</div>}
              </div>
            )}
            <button onClick={() => { setCurrentIdx(i => Math.min(history.length - 1, i + 1)); setEditMode(false); }}
              disabled={currentIdx === history.length - 1}
              style={{ background: "none", border: "none", fontSize: 16, cursor: currentIdx === history.length - 1 ? "default" : "pointer", color: currentIdx === history.length - 1 ? "#ccc" : "#333" }}>›</button>
          </div>
          <button onClick={addWeek}
            style={{ background: "#fff", color: "#0066CC", border: "2px solid #0066CC", borderRadius: 8, padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            + Nueva semana
          </button>
          <button onClick={() => setEditMode(e => !e)}
            style={{ background: editMode ? "#E91E8C" : "#fff", color: editMode ? "#fff" : "#E91E8C", border: "2px solid #E91E8C", borderRadius: 8, padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            {editMode ? "💾 Guardar" : "✏️ Editar"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Iniciativas completadas", value: completadas, sub: `de ${allInis.length} iniciativas`, color: "#0066CC" },
          { label: "% Automatización global", value: `${autoGlobal}%`, sub: "media sobre todas las iniciativas", color: "#E91E8C" },
        ].map((k, idx) => (
          <div key={idx} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs principales */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[{ id: "detalle", label: "📋 Detalle por área" }, { id: "evolucion", label: "📈 Evolución semanal" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", borderRadius: 20, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
              background: tab === t.id ? "#1a1a2e" : "#fff",
              color: tab === t.id ? "#fff" : "#555",
              boxShadow: tab === t.id ? "0 4px 12px rgba(26,26,46,0.25)" : "0 1px 4px rgba(0,0,0,0.1)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB DETALLE */}
      {tab === "detalle" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {week.bloques.map(b => {
              const avg = Math.round(b.iniciativas.reduce((s, i) => s + i.automatizacion, 0) / b.iniciativas.length);
              return (
                <button key={b.id} onClick={() => setActiveBloque(b.id)}
                  style={{ padding: "8px 18px", borderRadius: 20, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    background: activeBloque === b.id ? b.color : "#fff",
                    color: activeBloque === b.id ? "#fff" : "#555",
                    boxShadow: activeBloque === b.id ? `0 4px 12px ${b.color}44` : "0 1px 4px rgba(0,0,0,0.1)" }}>
                  {b.nombre} · {avg}%
                </button>
              );
            })}
          </div>
          {bloque && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                      {["Iniciativa", "Herramientas", "% Automatización", "Estado"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#888", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bloque.iniciativas.map(ini => {
                      const est = estadoConfig[ini.estado];
                      return (
                        <tr key={ini.id} style={{ borderBottom: "1px solid #f7f7f7" }}>
                          <td style={{ padding: "10px 10px", fontWeight: 600, color: "#222" }}>{ini.nombre}</td>
                          <td style={{ padding: "10px 10px", color: "#666" }}>{ini.herramientas}</td>
                          <td style={{ padding: "10px 10px", minWidth: 160 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {editMode
                                ? <EditableNumber value={ini.automatizacion} onChange={v => updateIniciativa(bloque.id, ini.id, "automatizacion", v)} />
                                : <span style={{ fontWeight: 700, color: bloque.color, minWidth: 36 }}>{ini.automatizacion}%</span>
                              }
                              <div style={{ flex: 1 }}><AutoBar value={ini.automatizacion} color={bloque.color} /></div>
                            </div>
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            {editMode ? (
                              <select value={ini.estado} onChange={e => updateIniciativa(bloque.id, ini.id, "estado", e.target.value)}
                                style={{ border: "1px solid #ddd", borderRadius: 6, padding: "3px 6px", fontSize: 12 }}>
                                {Object.keys(estadoConfig).map(k => <option key={k} value={k}>{estadoConfig[k].label}</option>)}
                              </select>
                            ) : (
                              <span style={{ background: est.bg, color: est.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                                {est.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {Object.entries(estadoConfig).map(([k, v]) => (
              <span key={k} style={{ background: v.bg, color: v.color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 600 }}>{v.label}</span>
            ))}
          </div>
        </>
      )}

      {/* TAB EVOLUCIÓN */}
      {tab === "evolucion" && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 20 }}>% Automatización por área — evolución semanal</div>
          {history.length < 2 ? (
            <div style={{ textAlign: "center", color: "#aaa", padding: 40 }}>Añade al menos 2 semanas para ver la evolución.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => `${v}%`} />
                <Legend />
                <Line type="monotone" dataKey="Global" stroke="#1a1a2e" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                {BLOQUES_META.map(b => (
                  <Line key={b.id} type="monotone" dataKey={b.nombre} stroke={b.color} strokeWidth={2} dot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
