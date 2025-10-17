import React, { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

/* ---------- Helpers ---------- */
function normalizePayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.filas && Array.isArray(payload.filas)) return payload.filas;
  if (payload.data && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.fila) return Array.isArray(payload.fila) ? payload.fila : [payload.fila];
  if (payload && typeof payload === "object" && payload.id != null) return [payload];
  return [];
}

function isAllEmptyObjects(arr) {
  if (!Array.isArray(arr)) return false;
  if (arr.length === 0) return false;
  return arr.every(item => {
    if (!item || typeof item !== "object") return false;
    return Object.keys(item).length === 0;
  });
}

function mergeIntenciones(currentArr = [], incomingArr = []) {
  if (!Array.isArray(incomingArr) || incomingArr.length === 0) return currentArr.slice();
  if (!Array.isArray(currentArr) || currentArr.length === 0 || incomingArr.length >= currentArr.length) {
    return incomingArr.slice().sort((a, b) => (a.id || 0) - (b.id || 0));
  }
  const map = new Map();
  currentArr.forEach(item => {
    if (item && item.id != null) map.set(item.id, { ...item });
  });
  incomingArr.forEach(item => {
    if (item && item.id != null) {
      const existing = map.get(item.id);
      map.set(item.id, existing ? { ...existing, ...item } : item);
    }
  });
  return Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
}

/* ---------- Component ---------- */
export default function ComprarAcciones({ usuario, nombre }) {
  const [intenciones, setIntenciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cantidadComprar, setCantidadComprar] = useState("");
  const [error, setError] = useState("");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [momentoActual, setMomentoActual] = useState(null);

  const [historialLimpio, setHistorialLimpio] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // refs para comparar/retener estado actual entre handlers
  const historialRef = useRef([]);
  const intencionesRef = useRef([]);

  const jugadorNumero = usuario?.match(/\d+/)?.[0];
  const jugadorActual = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

  // fetch initial intenciones
  const fetchIntenciones = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
      const data = await res.json();
      const arr = normalizePayload(data);
      setIntenciones(arr);
      intencionesRef.current = arr;
    } catch (err) {
      console.error("Error fetch intenciones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // fetch initial historial limpio
  const fetchHistorialLimpio = useCallback(async () => {
    try {
      setLoadingHistorial(true);
      const res = await fetch(`${BACKEND_URL}/api/historial-limpio`);
      const data = await res.json();
      const arr = normalizePayload(data);
      setHistorialLimpio(arr);
      historialRef.current = arr;
    } catch (err) {
      console.error("Error fetch historial limpio:", err);
      setHistorialLimpio([]);
      historialRef.current = [];
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  // fetch momento
  useEffect(() => {
    const fetchMomento = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/tabla-momentos`);
        const data = await res.json();
        setMomentoActual(data.filas?.[1]?.Momento ?? null);
      } catch (err) {
        setMomentoActual(null);
      }
    };
    fetchMomento();
  }, []);

  // initial loads
  useEffect(() => {
    fetchIntenciones();
    fetchHistorialLimpio();
  }, [fetchIntenciones, fetchHistorialLimpio]);

  // socket.io: listeners incrementales + compatibility snapshots
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("socket.io conectado", socket.id);
      setIsSocketConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.warn("socket.io desconectado", reason);
      setIsSocketConnected(false);
    });

    // Incremental events
    socket.on("intencion:create", (payload) => {
      const filas = normalizePayload(payload?.fila ? payload.fila : payload);
      if (!filas || filas.length === 0) return;
      const merged = mergeIntenciones(intencionesRef.current || [], filas);
      setIntenciones(merged);
      intencionesRef.current = merged;
    });

    socket.on("intencion:update", (payload) => {
      const filas = normalizePayload(payload?.fila ? payload.fila : payload);
      if (!filas || filas.length === 0) return;
      const merged = mergeIntenciones(intencionesRef.current || [], filas);
      setIntenciones(merged);
      intencionesRef.current = merged;
    });

    socket.on("intencion:delete", (payload) => {
      const id = payload?.id ?? (payload?.fila?.id);
      if (id == null) return;
      const next = (intencionesRef.current || []).filter(i => i.id !== id);
      setIntenciones(next);
      intencionesRef.current = next;
    });

    socket.on("historial:create", (payload) => {
      const fila = payload?.fila ?? payload;
      if (!fila) return;
      const next = [fila, ...(historialRef.current || [])];
      setHistorialLimpio(next);
      historialRef.current = next;
    });

    // Backwards-compatible snapshots (server may still emit)
    socket.on("intenciones_de_venta", (payload) => {
      const arr = normalizePayload(payload);
      if (!arr) return;
      if (isAllEmptyObjects(arr)) {
        console.log("Ignorado intenciones_de_venta: payload solo objetos vacíos");
        return;
      }
      if (Array.isArray(arr) && arr.length === 0 && intencionesRef.current && intencionesRef.current.length > 0) {
        console.log("Ignorado intenciones_de_venta vacío (cliente ya tiene datos).");
        return;
      }
      const merged = mergeIntenciones(intencionesRef.current || [], arr);
      setIntenciones(merged);
      intencionesRef.current = merged;
      setLoading(false);
    });

    socket.on("historial_limpio", (payload) => {
      const arr = normalizePayload(payload);
      if (!arr) return;
      if (isAllEmptyObjects(arr)) {
        console.log("Ignorado historial_limpio: payload solo objetos vacíos");
        return;
      }
      if (Array.isArray(arr) && arr.length === 0 && historialRef.current && historialRef.current.length > 0) {
        console.log("Ignorado historial_limpio vacío (cliente ya tiene datos).");
        return;
      }
      if (Array.isArray(arr) && arr.length > 0) {
        const sorted = arr.slice().sort((a, b) => {
          const da = a.hora ? new Date(a.hora).getTime() : 0;
          const db = b.hora ? new Date(b.hora).getTime() : 0;
          return db - da;
        });
        setHistorialLimpio(sorted);
        historialRef.current = sorted;
      } else {
        setHistorialLimpio(arr);
        historialRef.current = arr;
      }
      setLoadingHistorial(false);
    });

    socket.on("connect_error", (err) => console.error("socket connect_error:", err));

    return () => {
      try { socket.disconnect(); } catch (_) {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- util: comprador match (FIXED) ---------- */
  function normalizeNameForCompare(v) {
    if (!v || typeof v !== "string") return null;
    return v.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function matchesJugadorExact(v) {
    const name = normalizeNameForCompare(v);
    if (!name) return false;
    const jugadorNorm = jugadorActual.toLowerCase().trim();
    const jugadorNormNoSpace = jugadorNorm.replace(/\s+/g, "");
    if (name === jugadorNorm) return true;
    if (name.replace(/\s+/g, "") === jugadorNormNoSpace) return true;
    if (jugadorNumero) {
      if (name.includes(`jugador ${jugadorNumero}`)) return true;
      if (name.includes(`jugador${jugadorNumero}`)) return true;
    }
    return false;
  }

  // Comprueba campos específicos (comprador/Comprador/etc.) sin falsos positivos por números sueltos.
  function filaCorrespondeACompradorFallback(fila) {
    if (!fila || typeof fila !== "object") return false;
    const candidateFields = ["comprador", "Comprador", "buyer", "Buyer"];
    for (const key of candidateFields) {
      if (fila[key] && matchesJugadorExact(String(fila[key]))) return true;
    }
    // fallback: check all string fields for exact player token (avoid raw numeric matches)
    for (const value of Object.values(fila)) {
      if (typeof value === "string" && matchesJugadorExact(value)) return true;
    }
    return false;
  }

  /**
   * NEW RULE: The "Historial de mis compras de acciones" MUST show only rows where the
   * column "Comprador" (if present) equals the current player.
   *
   * Behavior:
   * - If the row contains an explicit "Comprador" or "comprador" field, require it to match the current player.
   * - Otherwise (no explicit Comprador column), fall back to legacy heuristic that checks common buyer fields.
   */
  function filaEsCompraDelJugador(fila) {
    if (!fila || typeof fila !== "object") return false;

    if (Object.prototype.hasOwnProperty.call(fila, "Comprador") || Object.prototype.hasOwnProperty.call(fila, "comprador")) {
      const compradorVal = (fila.Comprador ?? fila.comprador);
      return compradorVal ? matchesJugadorExact(String(compradorVal)) : false;
    }

    // fallback
    return filaCorrespondeACompradorFallback(fila);
  }

  const misComprasHistorial = historialLimpio.filter(filaEsCompraDelJugador);

  /* ---------- UI helpers (kept simple and consistent) ---------- */
  const columnasMostrar = [
    { key: "accion", label: "Acción" },
    { key: "cantidad", label: "Cantidad" },
    { key: "precio", label: "Precio" },
    { key: "hora", label: "Hora" },
    { key: "efectivo", label: "Efectivo" }
  ];

  const NUM_FILAS_HISTORIAL = 9;
  const filasHistorialMostrar =
    misComprasHistorial.length < NUM_FILAS_HISTORIAL
      ? [...misComprasHistorial, ...Array(NUM_FILAS_HISTORIAL - misComprasHistorial.length).fill({})]
      : misComprasHistorial;

  const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: "24px" };
  const thTdStyle = { border: "1px solid #ddd", padding: "8px", textAlign: "center" };
  const thStyle = { ...thTdStyle, background: "#f4f4f4", fontWeight: "bold" };
  const modalStyle = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.22)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 };
  const cardStyle = { background: "#fff", padding: "2em", borderRadius: "10px", minWidth: "320px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "relative" };

  return (
    <div>
      <h2>Intenciones de venta de otros jugadores</h2>

      <div style={{ marginBottom: 8, color: isSocketConnected ? "#1b5e20" : "#666", fontSize: 13 }}>
        {isSocketConnected ? "Conectado (tiempo real)" : "Desconectado (intentando reconnect)"}
      </div>

      {loading ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>Cargando intenciones de venta...</div>
      ) : intenciones.filter(f => f && f.jugador !== jugadorActual && f.cantidad > 0).length === 0 ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>No hay intenciones de venta disponibles.</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Acción</th>
              <th style={thStyle}>Cantidad</th>
              <th style={thStyle}>Precio</th>
              <th style={thStyle}>Ejecución</th>
            </tr>
          </thead>
          <tbody>
            {intenciones.filter(f => f && f.jugador !== jugadorActual && f.cantidad > 0).map(fila => (
              <tr key={fila.id}>
                <td style={thTdStyle}>{fila.accion}</td>
                <td style={thTdStyle}>{fila.cantidad}</td>
                <td style={thTdStyle}>{fila.precio}</td>
                <td style={thTdStyle}>
                  <button onClick={() => { setFilaSeleccionada(fila); setCantidadComprar(""); setModalOpen(true); }} style={{ fontSize: 16, padding: "2px 12px", background: "#388E3C", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Comprar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal de compra */}
      {modalOpen && (
        <div style={modalStyle}>
          <div style={cardStyle}>
            <button onClick={() => setModalOpen(false)} style={{ position: "absolute", top: 8, right: 8, fontSize: "1.2em", background: "none", border: "none", cursor: "pointer" }} aria-label="Cerrar">✖</button>
            <div style={{ marginBottom: "14px", fontSize: "17px" }}>Ingrese la cantidad que desea comprar</div>
            <input type="text" placeholder="Cantidad" value={cantidadComprar} onChange={e => setCantidadComprar(e.target.value)} style={{ width: "100%", fontSize: "18px", padding: "8px", marginBottom: "12px", border: "1px solid #bbb", borderRadius: "4px" }} />
            {error && <div style={{ color: "#d32f2f", marginBottom: "12px" }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={async () => {
                // re-use existing handler logic
                if (!(/^\d+$/.test(cantidadComprar) && Number(cantidadComprar) > 0)) return;
                await (async function () {
                  setEnviando(true);
                  try {
                    const resIntent = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
                    const dataIntent = await resIntent.json();
                    const filaIntent = (dataIntent.filas || []).find(f => f.id === filaSeleccionada.id);
                    const cantidadDisponible = filaIntent ? filaIntent.cantidad : 0;
                    const cantidadInt = Number(cantidadComprar);
                    let estado = "desaprobada";
                    if (cantidadDisponible >= cantidadInt) estado = "aprobada";
                    const efectivo = cantidadInt * filaSeleccionada.precio;
                    const body = {
                      id: filaSeleccionada.id,
                      accion: filaSeleccionada.accion,
                      cantidad: cantidadInt,
                      precio: filaSeleccionada.precio,
                      vendedor: filaSeleccionada.jugador,
                      comprador: jugadorActual,
                      hora: new Date().toISOString(),
                      momento: Number(momentoActual),
                      efectivo,
                      estado
                    };
                    const res = await fetch(`${BACKEND_URL}/api/historial`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body)
                    });
                    if (!res.ok) {
                      const errData = await res.json().catch(() => ({}));
                      setError(errData.error || "Error al registrar la compra.");
                    } else {
                      setModalOpen(false);
                      await fetchIntenciones();
                      await fetchHistorialLimpio();
                    }
                  } catch (err) {
                    console.error("Error en compra:", err);
                    setError("No se pudo conectar con el servidor.");
                  } finally {
                    setEnviando(false);
                  }
                })();
              }} disabled={enviando} style={{ fontSize: 16, padding: "7px 22px", background: "#007bff", color: "#fff", border: "none", borderRadius: 4 }}>
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: "32px" }}>Historial de mis compras de acciones:</h3>
      {loadingHistorial ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>Cargando historial...</div>
      ) : (
        <div style={{ maxHeight: "360px", overflowY: "auto", borderRadius: "8px", border: "1px solid #eee" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "24px" }}>
            <thead>
              <tr>
                {columnasMostrar.map(col => <th key={col.key} style={thStyle}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filasHistorialMostrar.map((fila, idx) => (
                <tr key={idx}>
                  {columnasMostrar.map(col => (
                    <td key={col.key} style={thTdStyle}>
                      {fila && fila[col.key] ? (col.key === "hora" ? new Date(fila.hora).toLocaleString() : fila[col.key]) : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}