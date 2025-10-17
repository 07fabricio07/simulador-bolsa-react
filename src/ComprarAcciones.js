import React, { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

// Normaliza distintas formas de payload que puede emitir el servidor
function normalizePayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  // payload puede venir como { filas: [...] } o { data: [...] }
  if (payload.filas && Array.isArray(payload.filas)) return payload.filas;
  if (payload.data && Array.isArray(payload.data)) return payload.data;
  // payload puede ser un objeto único (una fila)
  if (payload && typeof payload === "object" && payload.id != null) return [payload];
  // payload tipado { type: 'intencion:update', fila: {...} }
  if (payload && payload.fila) return Array.isArray(payload.fila) ? payload.fila : [payload.fila];
  return [];
}

// Devuelve true solo si es un array con objetos y todos están vacíos (payload "relleno")
function isAllEmptyObjects(arr) {
  if (!Array.isArray(arr)) return false;
  if (arr.length === 0) return false;
  return arr.every(item => {
    if (!item || typeof item !== "object") return false;
    return Object.keys(item).length === 0;
  });
}

// Merge inteligente de intenciones: si incoming >= current treat as snapshot (reemplazar).
// Si incoming es más pequeño se asume parcial y se actualiza por id.
function mergeIntenciones(currentArr = [], incomingArr = []) {
  if (!Array.isArray(incomingArr) || incomingArr.length === 0) return currentArr.slice();

  if (!Array.isArray(currentArr) || currentArr.length === 0 || incomingArr.length >= currentArr.length) {
    // snapshot: ordenar por id para determinismo
    return incomingArr.slice().sort((a, b) => (a.id || 0) - (b.id || 0));
  }

  // parcial: actualizar solo por id
  const map = new Map();
  currentArr.forEach(item => {
    if (item && item.id != null) map.set(item.id, { ...item });
  });
  incomingArr.forEach(item => {
    if (item && item.id != null) {
      const existing = map.get(item.id);
      if (existing) map.set(item.id, { ...existing, ...item });
      else map.set(item.id, item);
    }
  });
  return Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
}

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

  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugadorActual = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

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

  // carga inicial
  useEffect(() => {
    fetchIntenciones();
    fetchHistorialLimpio();
  }, [fetchIntenciones, fetchHistorialLimpio]);

  // socket.io: conectar y escuchar eventos con tolerancia a payloads vacíos y merge parcial
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("socket.io conectado", socket.id);
      setIsSocketConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.warn("socket.io desconectado:", reason);
      setIsSocketConnected(false);
    });

    // Maneja varias formas de notificación:
    // 1) snapshot array o { filas: [...] }
    // 2) tipos finos: { type: 'intencion:update', fila: {...} }
    // 3) single object { id, ... } -> tratado como fila única
    socket.on("intenciones_de_venta", (payload) => {
      // payload puede ser { type, fila } o array o { filas: [...] } o objeto único
      if (!payload) return;
      // caso tipado
      if (payload.type && payload.fila) {
        const tipo = payload.type;
        const fila = payload.fila;
        const curr = intencionesRef.current || [];
        if (tipo === "intencion:update") {
          // actualizar por id
          const merged = mergeIntenciones(curr, [fila]);
          setIntenciones(merged);
          intencionesRef.current = merged;
          return;
        }
        if (tipo === "intencion:create") {
          const merged = mergeIntenciones(curr, [fila]);
          setIntenciones(merged);
          intencionesRef.current = merged;
          return;
        }
        if (tipo === "intencion:delete") {
          const filtered = curr.filter(i => i.id !== fila.id);
          setIntenciones(filtered);
          intencionesRef.current = filtered;
          return;
        }
      }

      // payload como objeto con 'id' -> tratar como fila única
      if (payload && typeof payload === "object" && payload.id != null && !Array.isArray(payload)) {
        const merged = mergeIntenciones(intencionesRef.current || [], [payload]);
        setIntenciones(merged);
        intencionesRef.current = merged;
        return;
      }

      // payload como array / filas
      const arr = normalizePayload(payload);
      console.log("evento intenciones_de_venta recibido:", arr);

      // si son objetos vacíos (relleno) ignorar
      if (isAllEmptyObjects(arr)) {
        console.log("Ignorado intenciones_de_venta: payload contiene solo objetos vacíos");
        return;
      }
      // si array vacío pero ya hay datos en cliente -> ignorar para no borrar UI
      if (Array.isArray(arr) && arr.length === 0 && intencionesRef.current && intencionesRef.current.length > 0) {
        console.log("Ignorado intenciones_de_venta vacío (cliente ya tiene datos).");
        return;
      }

      // merge inteligente
      const merged = mergeIntenciones(intencionesRef.current || [], arr);
      setIntenciones(merged);
      intencionesRef.current = merged;
      setLoading(false);
    });

    // historial_limpio debe soportar snapshots y mensajes tipo create
    socket.on("historial_limpio", (payload) => {
      if (!payload) return;

      if (payload.type && payload.fila) {
        const tipo = payload.type;
        const fila = payload.fila;
        const curr = historialRef.current || [];
        if (tipo === "historial:create") {
          const next = [fila, ...curr]; // añadir al inicio
          setHistorialLimpio(next);
          historialRef.current = next;
          return;
        }
        // otros tipos (no es común) pueden implementarse aquí
      }

      const arr = normalizePayload(payload);
      console.log("evento historial_limpio recibido:", arr);

      if (isAllEmptyObjects(arr)) {
        console.log("Ignorado historial_limpio: payload contiene solo objetos vacíos");
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

    socket.on("connect_error", (err) => {
      console.error("socket connect_error:", err);
    });

    return () => {
      try { socket.disconnect(); } catch (_) {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchIntenciones, fetchHistorialLimpio]);

  // detección si una fila corresponde al jugador actual (para historial)
  const filaCorrespondeAComprador = (fila) => {
    if (!fila || Object.keys(fila).length === 0) return false;
    const jugadorNorm = jugadorActual.toString().toLowerCase().trim();
    const jugadorNormNoSpace = jugadorNorm.replace(/\s+/g, "");
    const num = jugadorNumero ? jugadorNumero.toString() : "";

    const candidates = [];
    if (fila.comprador) candidates.push(String(fila.comprador));
    if (fila.Comprador) candidates.push(String(fila.Comprador));
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

  // filtro y UI helpers
  const misComprasHistorial = historialLimpio.filter(filaCorrespondeAComprador);

  const intencionesFiltradas = intenciones.filter(
    fila => fila && fila.jugador !== jugadorActual && fila.cantidad > 0
  );

  const handleComprar = (fila) => {
    setFilaSeleccionada(fila);
    setCantidadComprar("");
    setError("");
    setModalOpen(true);
  };

  const cantidadInt = Number(cantidadComprar);
  const cantidadValida =
    /^\d+$/.test(cantidadComprar) &&
    cantidadInt > 0 &&
    Number.isInteger(cantidadInt);

  const handleEnviarCompra = async () => {
    if (!cantidadValida || !filaSeleccionada) return;
    setEnviando(true);
    setError("");
    try {
      const resIntent = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
      const dataIntent = await resIntent.json();
      const filaIntent = (dataIntent.filas || []).find(
        f => f.id === filaSeleccionada.id
      );
      const cantidadDisponible = filaIntent ? filaIntent.cantidad : 0;

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
        setError("Error al registrar la compra.");
      } else {
        setModalOpen(false);
        // si el servidor emite, el socket actualizará; si tarda, hacemos un fetch inmediato
        fetchIntenciones();
        fetchHistorialLimpio();
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
    setEnviando(false);
  };

  // JSX: tu UI habitual (tabla de intenciones, modal y historial)
  // Aquí dejo la UI completa equivalente a la que ya tenías, sin cambios funcionales,
  // sólo enlazada a la lógica de datos corregida arriba.

  return (
    <div>
      <h2>Intenciones de venta de otros jugadores</h2>

      <div style={{ marginBottom: 8, color: isSocketConnected ? "#1b5e20" : "#666", fontSize: 13 }}>
        {isSocketConnected ? "Conectado (tiempo real)" : "Desconectado (intentando reconnect)"}
      </div>

      {loading ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>Cargando intenciones de venta...</div>
      ) : intencionesFiltradas.length === 0 ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>No hay intenciones de venta disponibles.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "24px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Acción</th>
              <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Cantidad</th>
              <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Precio</th>
              <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Ejecución</th>
            </tr>
          </thead>
          <tbody>
            {intencionesFiltradas.map(fila => (
              <tr key={fila.id}>
                <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>{fila.accion}</td>
                <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>{fila.cantidad}</td>
                <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>{fila.precio}</td>
                <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>
                  <button onClick={() => handleComprar(fila)} style={{ fontSize: 16, padding: "2px 12px", background: "#388E3C", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Comprar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal de compra */}
      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.22)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }}>
          <div style={{ background: "#fff", padding: "2em", borderRadius: "10px", minWidth: "320px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "relative" }}>
            <button onClick={() => setModalOpen(false)} style={{ position: "absolute", top: 8, right: 8, fontSize: "1.2em", background: "none", border: "none", cursor: "pointer" }} aria-label="Cerrar">✖</button>
            <div style={{ marginBottom: "14px", fontSize: "17px" }}>Ingrese la cantidad que desea comprar</div>
            <input type="text" placeholder="Cantidad" value={cantidadComprar} onChange={e => setCantidadComprar(e.target.value)} style={{ width: "100%", fontSize: "18px", padding: "8px", marginBottom: "12px", border: "1px solid #bbb", borderRadius: "4px" }} />
            {error && <div style={{ color: "#d32f2f", marginBottom: "12px" }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleEnviarCompra} disabled={!cantidadValida || enviando} style={{ fontSize: 16, padding: "7px 22px", background: cantidadValida ? "#007bff" : "#bbb", color: "#fff", border: "none", borderRadius: 4, cursor: cantidadValida ? "pointer" : "not-allowed" }}>
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
                <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Acción</th>
                <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Cantidad</th>
                <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Precio</th>
                <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Hora</th>
                <th style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", background: "#f4f4f4", fontWeight: "bold" }}>Efectivo</th>
              </tr>
            </thead>
            <tbody>
              {misComprasHistorial.map((fila, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>{fila.accion || ""}</td>
                  <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>{fila.cantidad || ""}</td>
                  <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>{fila.precio || ""}</td>
                  <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>{fila.hora ? new Date(fila.hora).toLocaleString() : ""}</td>
                  <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>{fila.efectivo || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}