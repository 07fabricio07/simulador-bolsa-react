import React, { useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

function normalizePayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.filas && Array.isArray(payload.filas)) return payload.filas;
  if (payload.data && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.fila) return Array.isArray(payload.fila) ? payload.fila : [payload.fila];
  if (payload && typeof payload === "object" && payload.id != null) return [payload];
  return [];
}

function jsonToCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";

  const keySet = new Set();
  rows.forEach(r => {
    if (r && typeof r === "object") {
      Object.keys(r).forEach(k => keySet.add(k));
    }
  });
  const keys = Array.from(keySet);

  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    const needsQuote = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuote ? `"${escaped}"` : escaped;
  };

  const header = keys.map(k => escape(k)).join(",");
  const lines = rows.map(row => {
    return keys.map(k => {
      const v = row[k];
      if (v && typeof v === "object") return escape(JSON.stringify(v));
      return escape(v);
    }).join(",");
  });

  return [header, ...lines].join("\r\n");
}

export default function ExportHistorialButton({ endpoint = "/api/historial", filenamePrefix = "historial" }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleExport = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        headers: {
          "Accept": "application/json"
          // Si tu API necesita token, añade la cabecera aquí:
          // "Authorization": `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Error ${res.status} al obtener datos: ${txt}`);
      }
      const data = await res.json();
      const rows = normalizePayload(data);
      if (!rows || rows.length === 0) {
        setMsg("No hay datos para exportar.");
        setLoading(false);
        return;
      }
      const csv = jsonToCsv(rows);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const fname = `${filenamePrefix}_${ts}.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fname);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMsg(`Exportado ${rows.length} filas a ${fname}`);
    } catch (err) {
      console.error("Export error:", err);
      setMsg(`Error exportando CSV: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          padding: "8px 14px",
          background: loading ? "#ccc" : "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Obteniendo..." : "Exportar Historial (CSV)"}
      </button>
      {msg && <div style={{ marginTop: 8, color: msg.startsWith("Error") ? "#d32f2f" : "#2e7d32" }}>{msg}</div>}
      <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
        Nota: descarga los datos actuales de la colección Historial en formato CSV.
      </div>
    </div>
  );
}