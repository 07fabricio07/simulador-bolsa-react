import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";
const ACCIONES = ["INTC", "MSFT", "AAPL", "IPET", "IBM"];

/* ---------- Helpers ---------- */
function normalizePayload(datos) {
  if (!datos) return [];
  if (Array.isArray(datos)) return datos;
  if (datos.filas && Array.isArray(datos.filas)) return datos.filas;
  if (datos.data && Array.isArray(datos.data)) return datos.data;
  if (datos && datos.fila) return Array.isArray(datos.fila) ? datos.fila : [datos.fila];
  if (datos && datos.id != null) return [datos];
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
export default function CompraVentaAcciones({ usuario, nombre }) {
  // Estados para inputs
  const [accion, setAccion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [intenciones, setIntenciones] = useState([]);
  const [error, setError] = useState("");
  const [anulandoId, setAnulandoId] = useState(null);

  // Modal "Anular todas"
  const [modalAnularTodas, setModalAnularTodas] = useState(false);
  const [anulandoTodas, setAnulandoTodas] = useState(false);

  // Historial limpio
  const [historialLimpio, setHistorialLimpio] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  // socket
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // refs para estado actual (evitar sobrescrituras)
  const intencionesRef = useRef([]);
  const historialRef = useRef([]);

  // jugador
  const jugadorNumero = usuario?.match(/\d+/)?.[0];
  const jugador = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

  // fetch intenciones
  const fetchIntenciones = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
      const data = await res.json();
      const arr = normalizePayload(data);
      setIntenciones(arr);
      intencionesRef.current = arr;
    } catch (err) {
      console.error("Error fetch intenciones:", err);
      setError("No se pudo consultar intenciones de venta.");
    }
  }, []);

  useEffect(() => {
    fetchIntenciones();
  }, [fetchIntenciones]);

  // fetch historial limpio
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

  useEffect(() => {
    fetchHistorialLimpio();
  }, [fetchHistorialLimpio]);

  // Validaciones
  const cantidadValida = /^\d+$/.test(cantidad) && Number(cantidad) > 0;
  const precioValido = (() => {
    if (!/^\d+(\.\d{1,2})?$/.test(precio)) return false;
    return Number(precio) > 0;
  })();
  const accionValida = ACCIONES.includes(accion);
  const puedeEnviar = cantidadValida && precioValido && accionValida;

  // Enviar intención
  const handleEnviar = async () => {
    setError("");
    if (!puedeEnviar) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          cantidad: Number(cantidad),
          precio: Number(precio),
          jugador
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar la intención de venta.");
        return;
      }
      setCantidad("");
      setPrecio("");
      setAccion("");
      // fallback immediate sync
      await fetchIntenciones();
    } catch (err) {
      console.error("Error handleEnviar:", err);
      setError("No se pudo conectar con el servidor.");
    }
  };

  // misIntenciones
  const misIntenciones = intenciones.filter(fila => fila && fila.jugador === jugador && fila.cantidad > 0);

  // Anular individual
  const handleAnular = async (id) => {
    setAnulandoId(id);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: 0 })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al anular la intención de venta.");
        setAnulandoId(null);
        return;
      }
      // fallback sync
      await fetchIntenciones();
    } catch (err) {
      console.error("Error handleAnular:", err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setAnulandoId(null);
    }
  };

  // Anular todas (funcionalidad reparada y robusta)
  const handleAnularTodas = async () => {
    if (!misIntenciones || misIntenciones.length === 0) {
      setModalAnularTodas(false);
      return;
    }
    setAnulandoTodas(true);
    setError("");
    try {
      // Ejecutar las actualizaciones en paralelo para mayor velocidad
      const promises = misIntenciones.map(fila =>
        fetch(`${BACKEND_URL}/api/intenciones-de-venta/${fila.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad: 0 })
        }).then(async res => {
          if (!res.ok) {
            // intenta leer cuerpo con mensaje de error si existe
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `Error al anular intención id=${fila.id}`);
          }
          return res.json();
        })
      );
      // await all (si alguno falla, lo capturamos)
      await Promise.all(promises);
      // Tras terminar, sincronizamos la lista (server emite intencion:update/delete; igual hacemos fetch fallback)
      await fetchIntenciones();
    } catch (err) {
      console.error("Error handleAnularTodas:", err);
      setError(err.message || "Error al anular todas las intenciones.");
    } finally {
      setAnulandoTodas(false);
      setModalAnularTodas(false);
    }
  };

  // Filtrar historial de ventas (vendedor = jugador actual)
  const filaCorrespondeAVendedor = (fila) => {
    if (!fila || Object.keys(fila).length === 0) return false;
    const jugadorNorm = jugador.toString().toLowerCase().trim();
    const jugadorNormNoSpace = jugadorNorm.replace(/\s+/g, "");
    const num = jugadorNumero ? jugadorNumero.toString() : "";

    const candidates = [];
    if (fila.vendedor) candidates.push(String(fila.vendedor));
    if (fila.Vendedor) candidates.push(String(fila.Vendedor));
    try {
      const other = Object.values(fila).filter(v => v !== null && v !== undefined).join(" ");
      candidates.push(other);
    } catch (_) {}

    const joined = candidates.join(" ").toLowerCase();
    if (joined.includes(jugadorNorm)) return true;
    if (joined.includes(jugadorNormNoSpace)) return true;
    if (num && joined.includes(num)) return true;
    return false;
  };
  const misVentasHistorial = historialLimpio.filter(filaCorrespondeAVendedor);

  // columnas historial (venta)
  const columnasMostrar = [
    { key: "accion", label: "Acción" },
    { key: "cantidad", label: "Cantidad" },
    { key: "precio", label: "Precio" },
    { key: "hora", label: "Hora" },
    { key: "efectivo", label: "Efectivo" }
  ];

  const NUM_FILAS_HISTORIAL = 9;
  const filasHistorialMostrar =
    misVentasHistorial.length < NUM_FILAS_HISTORIAL
      ? [...misVentasHistorial, ...Array(NUM_FILAS_HISTORIAL - misVentasHistorial.length).fill({})]
      : misVentasHistorial;

  /* ---------- Socket.io: listeners (incrementales + snapshots) ---------- */
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsSocketConnected(true);
      console.log("socket.io conectado (CompraVentaAcciones)", socket.id);
    });
    socket.on("disconnect", (reason) => {
      setIsSocketConnected(false);
      console.warn("socket.io desconectado (CompraVentaAcciones):", reason);
    });

    // Incrementales
    socket.on("intencion:create", (payload) => {
      const filas = normalizePayload(payload?.fila ?? payload);
      if (!filas || filas.length === 0) return;
      const merged = mergeIntenciones(intencionesRef.current || [], filas);
      setIntenciones(merged);
      intencionesRef.current = merged;
    });
    socket.on("intencion:update", (payload) => {
      const filas = normalizePayload(payload?.fila ?? payload);
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

    // Backwards-compatible snapshots
    socket.on("intenciones_de_venta", (payload) => {
      const arr = normalizePayload(payload);
      if (!arr) return;
      if (isAllEmptyObjects(arr)) return;
      if (Array.isArray(arr) && arr.length === 0 && intencionesRef.current?.length > 0) return;
      const merged = mergeIntenciones(intencionesRef.current || [], arr);
      setIntenciones(merged);
      intencionesRef.current = merged;
      setLoading(false);
    });
    socket.on("historial_limpio", (payload) => {
      const arr = normalizePayload(payload);
      if (!arr) return;
      if (isAllEmptyObjects(arr)) return;
      if (Array.isArray(arr) && arr.length === 0 && historialRef.current?.length > 0) return;
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

    socket.on("connect_error", (err) => {
      console.error("socket connect_error (CompraVentaAcciones):", err);
    });

    return () => {
      try { socket.disconnect(); } catch (_) {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Render UI ---------- */
  const tableStyle = { width: "100%", borderCollapse: "collapse", marginBottom: "24px" };
  const thTdStyle = { border: "1px solid #ddd", padding: "8px", textAlign: "center" };
  const thStyle = { ...thTdStyle, background: "#f4f4f4", fontWeight: "bold" };

  return (
    <div style={{ maxWidth: 700, margin: "auto" }}>
      <h2>Inserte la cantidad y precio de la acción que desea vender:</h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <select value={accion} onChange={e => setAccion(e.target.value)} style={{ width: 120, fontSize: 18, padding: 4 }}>
          <option value="">Acción</option>
          {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <input type="text" placeholder="Cantidad" value={cantidad} onChange={e => setCantidad(e.target.value)}
          style={{ width: 100, fontSize: 18, padding: 4, borderColor: cantidad && !cantidadValida ? "#d32f2f" : undefined }} />

        <input type="text" placeholder="Precio" value={precio} onChange={e => setPrecio(e.target.value)}
          style={{ width: 100, fontSize: 18, padding: 4, borderColor: precio && !precioValido ? "#d32f2f" : undefined }} />

        <button onClick={handleEnviar} disabled={!puedeEnviar}
          style={{
            fontSize: 18, padding: "4px 20px",
            background: puedeEnviar ? "#007bff" : "#ccc",
            color: "#fff", border: "none", borderRadius: 4,
            cursor: puedeEnviar ? "pointer" : "not-allowed"
          }}>
          Enviar
        </button>
      </div>

      <div style={{ color: "#d32f2f", minHeight: 20 }}>
        {precio && !precioValido && "El precio debe ser positivo, con máximo 2 decimales."}
      </div>

      {error && <div style={{ color: "#d32f2f", marginBottom: 16 }}>{error}</div>}

      <h3>Mis intenciones de venta registradas:</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Mostrar el botón siempre pero deshabilitado si no hay intenciones */}
        <button
          onClick={() => setModalAnularTodas(true)}
          disabled={misIntenciones.length === 0}
          style={{
            fontSize: 16,
            padding: "6px 24px",
            background: misIntenciones.length === 0 ? "#ccc" : "#444",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: misIntenciones.length === 0 ? "not-allowed" : "pointer"
          }}
        >
          Anular todas
        </button>
      </div>

      {/* Modal confirmación Anular todas */}
      {modalAnularTodas && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff", padding: "32px 24px", borderRadius: 10,
            boxShadow: "0 8px 24px #999", textAlign: "center", minWidth: 340
          }}>
            <div style={{ fontSize: 20, marginBottom: 24 }}>¿Deseas anular todas tus intenciones?</div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              <button onClick={() => setModalAnularTodas(false)} style={{
                fontSize: 18, padding: "8px 32px", background: "#19b837", color: "#fff",
                border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold"
              }}>No</button>
              <button onClick={handleAnularTodas} disabled={anulandoTodas} style={{
                fontSize: 18, padding: "8px 32px", background: "#d32f2f", color: "#fff",
                border: "none", borderRadius: 6, cursor: anulandoTodas ? "not-allowed" : "pointer", fontWeight: "bold"
              }}>{anulandoTodas ? "..." : "Sí"}</button>
            </div>
          </div>
        </div>
      )}

      {misIntenciones.length === 0 ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>No tienes intenciones de venta activas</div>
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
            {misIntenciones.map(fila => (
              <tr key={fila.id}>
                <td style={thTdStyle}>{fila.accion}</td>
                <td style={thTdStyle}>{fila.cantidad}</td>
                <td style={thTdStyle}>{fila.precio}</td>
                <td style={thTdStyle}>
                  <button onClick={() => handleAnular(fila.id)} disabled={anulandoId === fila.id} style={{
                    fontSize: 16, padding: "2px 12px", background: "#d32f2f", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer"
                  }}>{anulandoId === fila.id ? "..." : "Anular"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ marginTop: "32px" }}>Historial de mis venta de acciones:</h3>
      {loadingHistorial ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>Cargando historial...</div>
      ) : (
        <div style={{ maxHeight: "360px", overflowY: "auto", borderRadius: "8px", border: "1px solid #eee" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{columnasMostrar.map(col => <th key={col.key} style={thStyle}>{col.label}</th>)}</tr>
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