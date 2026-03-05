import { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

// ── Paleta dark neon ────────────────────────────────────────────────
const C = {
  bg:        "#060B1A",
  card:      "#0E1628",
  cardAlt:   "#0A1120",
  border:    "#1C2942",
  borderHi:  "#2A3F65",
  pink:      "#E91E8C",
  blue:      "#00B4FF",
  textPri:   "#E8EEFF",
  textSec:   "#6B7FA8",
  textMuted: "#3D506E",
};

const BLOQUES_META = [
  { id: "contenido", nombre: "Contenido",   color: "#E91E8C" },
  { id: "paid",      nombre: "Mkt Digital", color: "#00B4FF" },
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
  "activo":      { label: "✅ Completado",  bg: "#0A2A18", color: "#00E57A" },
  "en-progreso": { label: "🔄 En progreso", bg: "#2A1E00", color: "#FFB800" },
  "pendiente":   { label: "⏳ Pendiente",   bg: "#2A0A10", color: "#FF4B6E" },
  "evaluando":   { label: "🔍 Evaluando",   bg: "#1A0A2E", color: "#B87FFF" },
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

// ── Componentes auxiliares ───────────────────────────────────────────
function AutoBar({ value, color }) {
  return (
    <div style={{ background: C.border, borderRadius: 6, height: 8, width: "100%", overflow: "hidden" }}>
      <div style={{
        width: `${value}%`, height: "100%", borderRadius: 6,
        background: color,
        boxShadow: `0 0 8px ${color}99`,
        transition: "width 0.4s ease"
      }} />
    </div>
  );
}

function EditableNumber({ value, onChange }) {
  return (
    <input type="number" min={0} max={100} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width: 56, border: `1px solid ${C.borderHi}`, borderRadius: 6,
        padding: "2px 4px", fontSize: 13, textAlign: "center",
        background: C.cardAlt, color: C.textPri, fontFamily: "inherit"
      }} />
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0E1628EE", border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: `0 8px 24px rgba(0,0,0,0.5)`
    }}>
      <div style={{ color: C.textSec, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.dataKey}: {p.value}%</div>
      ))}
    </div>
  );
}

// ── Dashboard principal ──────────────────────────────────────────────
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

  const [editMode, setEditMode]         = useState(false);
  const [activeBloque, setActiveBloque] = useState("contenido");
  const [tab, setTab]                   = useState("detalle");
  const [newIniForm, setNewIniForm]     = useState(null);
  // null = oculto; objeto = { nombre, herramientas, automatizacion, estado }

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
    const newWeek = { ...JSON.parse(JSON.stringify(last)), label: `Semana ${history.length + 1}`, fecha: "" };
    setHistory(h => [...h, newWeek]);
    setCurrentIdx(history.length);
    setEditMode(true);
  };

  const addIniciativa = (bloqueId, form) => {
    if (!form.nombre.trim()) return;
    const newIni = {
      id: `custom_${Date.now()}`,
      nombre: form.nombre.trim(),
      herramientas: form.herramientas.trim(),
      automatizacion: Math.min(100, Math.max(0, form.automatizacion)),
      estado: form.estado,
    };
    setHistory(h => h.map((w, i) => i !== currentIdx ? w : {
      ...w,
      bloques: w.bloques.map(b => b.id !== bloqueId ? b : {
        ...b,
        iniciativas: [...b.iniciativas, newIni],
      })
    }));
    setNewIniForm(null);
  };

  const bloque      = week.bloques.find(b => b.id === activeBloque);
  const allInis     = week.bloques.flatMap(b => b.iniciativas);
  const autoGlobal  = Math.round(allInis.reduce((s, i) => s + i.automatizacion, 0) / allInis.length);
  const completadas = allInis.filter(i => i.estado === "activo").length;

  const chartData = useMemo(() => history.map(w => {
    const row = { semana: w.label };
    w.bloques.forEach(b => {
      row[b.nombre] = Math.round(b.iniciativas.reduce((s, i) => s + i.automatizacion, 0) / b.iniciativas.length);
    });
    row["Global"] = Math.round(allInis.reduce((s, i) => s + i.automatizacion, 0) / allInis.length);
    return row;
  }), [history]);

  // ── Estilos reutilizables ──────────────────────────────────────────
  const cardStyle = {
    background: C.card,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  };

  const pillBtn = (active, color = C.pink) => ({
    padding: "8px 18px", borderRadius: 20, fontWeight: 600, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
    background: active ? color : "transparent",
    color: active ? "#fff" : C.textSec,
    border: active ? `1px solid ${color}` : `1px solid ${C.border}`,
    boxShadow: active ? `0 0 14px ${color}55` : "none",
  });

  const inputStyle = {
    border: `1px solid ${C.borderHi}`, borderRadius: 6, padding: "3px 8px",
    fontSize: 13, fontWeight: 600, background: C.cardAlt,
    color: C.textPri, fontFamily: "inherit",
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: C.bg, minHeight: "100vh", padding: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{
            fontSize: 11, color: C.pink, fontWeight: 700, letterSpacing: 3,
            textTransform: "uppercase", marginBottom: 4,
            textShadow: `0 0 12px ${C.pink}88`
          }}>
            Plan IA Marketing
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.textPri, letterSpacing: -0.5 }}>
            Dashboard Semanal 2026
          </div>
        </div>

        {/* Controles de semana */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            ...cardStyle, padding: "6px 14px"
          }}>
            <button onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setEditMode(false); }}
              disabled={currentIdx === 0}
              style={{ background: "none", border: "none", fontSize: 18, cursor: currentIdx === 0 ? "default" : "pointer",
                color: currentIdx === 0 ? C.textMuted : C.textSec, lineHeight: 1 }}>‹</button>
            {editMode ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={week.label} onChange={e => updateWeekMeta("label", e.target.value)}
                  style={{ ...inputStyle, width: 90 }} />
                <input type="date" value={week.fecha} onChange={e => updateWeekMeta("fecha", e.target.value)}
                  style={{ ...inputStyle }} />
              </div>
            ) : (
              <div style={{ textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{week.label}</div>
                {week.fecha && <div style={{ fontSize: 11, color: C.textSec }}>{week.fecha}</div>}
              </div>
            )}
            <button onClick={() => { setCurrentIdx(i => Math.min(history.length - 1, i + 1)); setEditMode(false); }}
              disabled={currentIdx === history.length - 1}
              style={{ background: "none", border: "none", fontSize: 18, cursor: currentIdx === history.length - 1 ? "default" : "pointer",
                color: currentIdx === history.length - 1 ? C.textMuted : C.textSec, lineHeight: 1 }}>›</button>
          </div>

          <button onClick={addWeek} style={{
            background: "transparent", color: C.blue,
            border: `1px solid ${C.blue}`, borderRadius: 8,
            padding: "7px 16px", fontWeight: 600, cursor: "pointer",
            fontSize: 13, fontFamily: "inherit",
            boxShadow: `0 0 10px ${C.blue}33`, transition: "all 0.2s",
          }}>
            + Nueva semana
          </button>

          <button onClick={() => { setEditMode(e => !e); setNewIniForm(null); }} style={{
            background: editMode ? C.pink : "transparent",
            color: editMode ? "#fff" : C.pink,
            border: `1px solid ${C.pink}`, borderRadius: 8,
            padding: "7px 16px", fontWeight: 600, cursor: "pointer",
            fontSize: 13, fontFamily: "inherit",
            boxShadow: editMode ? `0 0 14px ${C.pink}66` : `0 0 10px ${C.pink}22`,
            transition: "all 0.2s",
          }}>
            {editMode ? "💾 Guardar" : "✏️ Editar"}
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Iniciativas completadas", value: completadas, sub: `de ${allInis.length} iniciativas`, color: C.blue },
          { label: "% Automatización global", value: `${autoGlobal}%`, sub: "media sobre todas las iniciativas", color: C.pink },
        ].map((k, idx) => (
          <div key={idx} style={{
            ...cardStyle, padding: "18px 22px",
            borderTop: `3px solid ${k.color}`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 20px ${k.color}18`,
          }}>
            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 6, fontWeight: 500, letterSpacing: 0.5 }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: k.color, textShadow: `0 0 20px ${k.color}66` }}>{k.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs principales ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[
          { id: "detalle",   label: "📋 Detalle por área" },
          { id: "evolucion", label: "📈 Evolución semanal" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={pillBtn(tab === t.id, C.pink)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB DETALLE ── */}
      {tab === "detalle" && (
        <>
          {/* Sub-tabs de bloque */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {week.bloques.map(b => {
              const avg = Math.round(b.iniciativas.reduce((s, i) => s + i.automatizacion, 0) / b.iniciativas.length);
              const isActive = activeBloque === b.id;
              return (
                <button key={b.id} onClick={() => { setActiveBloque(b.id); setNewIniForm(null); }} style={pillBtn(isActive, b.color)}>
                  {b.nombre} · {avg}%
                </button>
              );
            })}
          </div>

          {/* Tabla */}
          {bloque && (
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.cardAlt, borderBottom: `1px solid ${C.border}` }}>
                      {["Iniciativa", "Herramientas", "% Automatización", "Estado"].map(h => (
                        <th key={h} style={{
                          textAlign: "left", padding: "12px 16px",
                          color: C.textSec, fontWeight: 600, fontSize: 11,
                          letterSpacing: 0.8, textTransform: "uppercase"
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bloque.iniciativas.map((ini, rowIdx) => {
                      const est = estadoConfig[ini.estado];
                      return (
                        <tr key={ini.id} style={{
                          borderBottom: `1px solid ${C.border}`,
                          background: rowIdx % 2 === 0 ? C.card : C.cardAlt,
                          transition: "background 0.15s",
                        }}>
                          <td style={{ padding: "12px 16px" }}>
                            {editMode ? (
                              <input
                                value={ini.nombre}
                                onChange={e => updateIniciativa(bloque.id, ini.id, "nombre", e.target.value)}
                                style={{
                                  width: "100%", border: `1px solid ${C.borderHi}`, borderRadius: 6,
                                  padding: "4px 8px", fontSize: 13, fontWeight: 600,
                                  background: C.cardAlt, color: C.textPri, fontFamily: "inherit", outline: "none",
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: C.textPri }}>{ini.nombre}</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {editMode ? (
                              <input
                                value={ini.herramientas}
                                onChange={e => updateIniciativa(bloque.id, ini.id, "herramientas", e.target.value)}
                                style={{
                                  width: "100%", border: `1px solid ${C.borderHi}`, borderRadius: 6,
                                  padding: "4px 8px", fontSize: 12,
                                  background: C.cardAlt, color: C.textSec, fontFamily: "inherit", outline: "none",
                                }}
                              />
                            ) : (
                              <span style={{ color: C.textSec, fontSize: 12 }}>{ini.herramientas}</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", minWidth: 170 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {editMode
                                ? <EditableNumber value={ini.automatizacion} onChange={v => updateIniciativa(bloque.id, ini.id, "automatizacion", v)} />
                                : <span style={{ fontWeight: 700, color: bloque.color, minWidth: 38, fontSize: 14 }}>{ini.automatizacion}%</span>
                              }
                              <div style={{ flex: 1 }}><AutoBar value={ini.automatizacion} color={bloque.color} /></div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {editMode ? (
                              <select value={ini.estado} onChange={e => updateIniciativa(bloque.id, ini.id, "estado", e.target.value)}
                                style={{
                                  border: `1px solid ${C.borderHi}`, borderRadius: 6, padding: "4px 8px",
                                  fontSize: 12, background: C.cardAlt, color: C.textPri, fontFamily: "inherit"
                                }}>
                                {Object.keys(estadoConfig).map(k => <option key={k} value={k}>{estadoConfig[k].label}</option>)}
                              </select>
                            ) : (
                              <span style={{
                                background: est.bg, color: est.color,
                                borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                                whiteSpace: "nowrap", border: `1px solid ${est.color}33`
                              }}>
                                {est.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* ── Fila formulario nueva iniciativa ── */}
                    {editMode && newIniForm !== null && (
                      <tr style={{
                        borderBottom: `1px solid ${bloque.color}44`,
                        background: `${bloque.color}0D`,
                      }}>
                        <td style={{ padding: "10px 16px" }}>
                          <input
                            autoFocus
                            placeholder="Nombre de la iniciativa"
                            value={newIniForm.nombre}
                            onChange={e => setNewIniForm(f => ({ ...f, nombre: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") addIniciativa(bloque.id, newIniForm); if (e.key === "Escape") setNewIniForm(null); }}
                            style={{
                              width: "100%", border: `1px solid ${bloque.color}66`, borderRadius: 6,
                              padding: "5px 8px", fontSize: 13, fontWeight: 600,
                              background: C.cardAlt, color: C.textPri, fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <input
                            placeholder="Herramientas utilizadas"
                            value={newIniForm.herramientas}
                            onChange={e => setNewIniForm(f => ({ ...f, herramientas: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") addIniciativa(bloque.id, newIniForm); if (e.key === "Escape") setNewIniForm(null); }}
                            style={{
                              width: "100%", border: `1px solid ${C.borderHi}`, borderRadius: 6,
                              padding: "5px 8px", fontSize: 12,
                              background: C.cardAlt, color: C.textSec, fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                        </td>
                        <td style={{ padding: "10px 16px", minWidth: 170 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="number" min={0} max={100}
                              value={newIniForm.automatizacion}
                              onChange={e => setNewIniForm(f => ({ ...f, automatizacion: Number(e.target.value) }))}
                              style={{
                                width: 56, border: `1px solid ${C.borderHi}`, borderRadius: 6,
                                padding: "4px 4px", fontSize: 13, textAlign: "center",
                                background: C.cardAlt, color: C.textPri, fontFamily: "inherit",
                                outline: "none",
                              }}
                            />
                            <div style={{ flex: 1 }}><AutoBar value={newIniForm.automatizacion} color={bloque.color} /></div>
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <select
                              value={newIniForm.estado}
                              onChange={e => setNewIniForm(f => ({ ...f, estado: e.target.value }))}
                              style={{
                                border: `1px solid ${C.borderHi}`, borderRadius: 6, padding: "4px 8px",
                                fontSize: 12, background: C.cardAlt, color: C.textPri, fontFamily: "inherit",
                                outline: "none",
                              }}
                            >
                              {Object.keys(estadoConfig).map(k => <option key={k} value={k}>{estadoConfig[k].label}</option>)}
                            </select>
                            <button
                              onClick={() => addIniciativa(bloque.id, newIniForm)}
                              title="Confirmar"
                              style={{
                                background: bloque.color, border: "none", borderRadius: 6,
                                color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                                padding: "4px 10px", lineHeight: 1, fontFamily: "inherit",
                                boxShadow: `0 0 8px ${bloque.color}66`,
                              }}>✓</button>
                            <button
                              onClick={() => setNewIniForm(null)}
                              title="Cancelar"
                              style={{
                                background: "transparent", border: `1px solid ${C.border}`,
                                borderRadius: 6, color: C.textSec, fontSize: 14, cursor: "pointer",
                                padding: "4px 10px", lineHeight: 1, fontFamily: "inherit",
                              }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* ── Botón + añadir iniciativa ── */}
                    {editMode && newIniForm === null && (
                      <tr>
                        <td colSpan={4} style={{ padding: "6px 12px" }}>
                          <button
                            onClick={() => setNewIniForm({ nombre: "", herramientas: "", automatizacion: 0, estado: "pendiente" })}
                            style={{
                              width: "100%", background: "transparent",
                              border: `1px dashed ${bloque.color}55`, borderRadius: 8,
                              color: bloque.color, fontWeight: 600, fontSize: 13,
                              padding: "8px 0", cursor: "pointer", fontFamily: "inherit",
                              transition: "all 0.2s", letterSpacing: 0.3,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${bloque.color}12`; e.currentTarget.style.borderColor = bloque.color; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${bloque.color}55`; }}
                          >
                            + Añadir iniciativa
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Leyenda estados */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {Object.entries(estadoConfig).map(([k, v]) => (
              <span key={k} style={{
                background: v.bg, color: v.color, borderRadius: 20,
                padding: "3px 12px", fontSize: 11, fontWeight: 600,
                border: `1px solid ${v.color}33`
              }}>{v.label}</span>
            ))}
          </div>
        </>
      )}

      {/* ── TAB EVOLUCIÓN ── */}
      {tab === "evolucion" && (
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.textPri, marginBottom: 20, letterSpacing: 0.3 }}>
            % Automatización por área — evolución semanal
          </div>
          {history.length < 2 ? (
            <div style={{ textAlign: "center", color: C.textSec, padding: 40, fontSize: 14 }}>
              Añade al menos 2 semanas para ver la evolución.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="semana" tick={{ fontSize: 12, fill: C.textSec, fontFamily: "Poppins" }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12, fill: C.textSec, fontFamily: "Poppins" }} axisLine={{ stroke: C.border }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: C.textSec, fontFamily: "Poppins" }} />
                <Line type="monotone" dataKey="Global" stroke="#ffffff44" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: "#ffffff44" }} />
                {BLOQUES_META.map(b => (
                  <Line key={b.id} type="monotone" dataKey={b.nombre} stroke={b.color} strokeWidth={2}
                    dot={{ r: 4, fill: b.color }}
                    activeDot={{ r: 6, boxShadow: `0 0 10px ${b.color}` }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
