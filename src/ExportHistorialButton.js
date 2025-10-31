import React, { useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

function normalizePayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  // support common shapes
  if (payload.registros && Array.isArray(payload.registros)) return payload.registros;
  if (payload.filas && Array.isArray(payload.filas)) return payload.filas;
  if (payload.data && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.fila) return Array.isArray(payload.fila) ? payload.fila : [payload.fila];
  if (payload && typeof payload === "object" && payload.id != null) return [payload];
  // fallback: if any property of payload is an array, return the first such array
  for (const val of Object.values(payload)) {
    if (Array.isArray(val)) return val;
  }
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

async function tryFetchFirstWorking(endpoints) {
  // Try endpoints in sequence, return response.json() of first that returns ok
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BACKEND_URL}${ep}`, {
        headers: {
          "Accept": "application/json"
          // Si tu API necesita token, añade aquí la cabecera:
          // "Authorization": `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        // try to parse json safely
        const data = await res.json().catch(() => null);
        return { data, endpoint: ep };
      }
    } catch (err) {
      // ignore and try next
    }
  }
  return null;
}

export default function ExportHistorialButton({ endpoint = "/api/historial", filenamePrefix = "historial" }) {
  const [loadingHist, setLoadingHist] = useState(false);
  const [msgHist, setMsgHist] = useState("");

  const [loadingRegs, setLoadingRegs] = useState(false);
  const [msgRegs, setMsgRegs] = useState("");

  const handleExportGeneric = async (endpointsCandidates, prefix, setLoading, setMsg) => {
    setLoading(true);
    setMsg("");
    try {
      const attempt = await tryFetchFirstWorking(endpointsCandidates);
      if (!attempt || !attempt.data) {
        throw new Error("No se pudo obtener datos desde el servidor (probadas: " + endpointsCandidates.join(", ") + ")");
      }
      const rows = normalizePayload(attempt.data);
      if (!rows || rows.length === 0) {
        setMsg("No hay datos para exportar desde " + attempt.endpoint);
        setLoading(false);
        return;
      }
      const csv = jsonToCsv(rows);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const fname = `${prefix}_${ts}.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fname);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMsg(`Exportado ${rows.length} filas a ${fname} (endpoint: ${attempt.endpoint})`);
    } catch (err) {
      console.error("Export error:", err);
      setMsg(`Error exportando CSV: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportHistorial = async () => {
    const candidates = [endpoint, "/api/historial", "/api/historial-limpio"];
    await handleExportGeneric(candidates, filenamePrefix, setLoadingHist, setMsgHist);
  };

  const handleExportRegistros = async () => {
    // try a few possible route names for "RegistrosRegistrador"
    const candidates = [
      "/api/registros-registrador",
      "/api/registrosregistrador",
      "/api/registrosRegistrador",
      "/api/RegistrosRegistrador",
      "/api/registros_registrador",
      "/api/registros-registrador-limpio",
      "/api/registros"
    ];
    await handleExportGeneric(candidates, "registros_registrador", setLoadingRegs, setMsgRegs);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <button
            onClick={handleExportHistorial}
            disabled={loadingHist}
            style={{
              padding: "8px 14px",
              background: loadingHist ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: loadingHist ? "not-allowed" : "pointer"
            }}
          >
            {loadingHist ? "Obteniendo historial..." : "Exportar Historial (CSV)"}
          </button>
          {msgHist && <div style={{ marginTop: 8, color: msgHist.startsWith("Error") ? "#d32f2f" : "#2e7d32" }}>{msgHist}</div>}
        </div>

        <div>
          <button
            onClick={handleExportRegistros}
            disabled={loadingRegs}
            style={{
              padding: "8px 14px",
              background: loadingRegs ? "#ccc" : "#6a1b9a",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: loadingRegs ? "not-allowed" : "pointer"
            }}
          >
            {loadingRegs ? "Obteniendo registros..." : "Exportar Registros Registrador (CSV)"}
          </button>
          {msgRegs && <div style={{ marginTop: 8, color: msgRegs.startsWith("Error") ? "#d32f2f" : "#2e7d32" }}>{msgRegs}</div>}
        </div>
      </div>

      <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
        Nota: cada botón intenta obtener los datos desde el backend y descargar un archivo CSV. Si tu API requiere autenticación,
        añade la cabecera Authorization en la función tryFetchFirstWorking (línea comentada).
      </div>
    </div>
  );
}