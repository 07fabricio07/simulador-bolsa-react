import React, { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

function normalizePayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.filas && Array.isArray(payload.filas)) return payload.filas;
  return [];
}

function isAllEmptyObjects(arr) {
  if (!Array.isArray(arr)) return true;
  return arr.every(item => {
    if (!item || typeof item !== "object") return false;
    return Object.keys(item).length === 0;
  });
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

  // historial limpio
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

  // socket.io: conectar y escuchar eventos con tolerancia a payloads vacíos
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

    // intenciones_de_venta handler
    socket.on("intenciones_de_venta", (payload) => {
      const arr = normalizePayload(payload);
      console.log("evento intenciones_de_venta recibido:", arr);

      // si el servidor manda "relleno" (objetos vacíos), ignorar
      if (isAllEmptyObjects(arr)) {
        console.log("Ignorado intenciones_de_venta: payload contiene solo objetos vacíos");
        return;
      }

      // evitar que un emit vacío borre datos existentes en el cliente
      if (Array.isArray(arr) && arr.length === 0 && intencionesRef.current.length > 0) {
        console.log("Ignorado intenciones_de_venta vacío (cliente ya tiene datos).");
        return;
      }

      setIntenciones(arr);
      intencionesRef.current = arr;
      setLoading(false);
    });

    // historial_limpio handler
    socket.on("historial_limpio", (payload) => {
      const arr = normalizePayload(payload);
      console.log("evento historial_limpio recibido:", arr);

      // si payload son solo objetos vacíos, ignorar
      if (isAllEmptyObjects(arr)) {
        console.log("Ignorado historial_limpio: payload contiene solo objetos vacíos");
        return;
      }

      // si server envía array vacío pero cliente ya tiene datos, IGNORA para no borrar sin motivo
      if (Array.isArray(arr) && arr.length === 0 && historialRef.current.length > 0) {
        console.log("Ignorado historial_limpio vacío (cliente ya tiene datos).");
        return;
      }

      // Si hay datos entrantes, reemplazamos (mantén simple y coherente)
      if (Array.isArray(arr) && arr.length > 0) {
        // ordenar por hora descendente si existe el campo hora
        const sorted = arr.slice().sort((a, b) => {
          const da = a.hora ? new Date(a.hora).getTime() : 0;
          const db = b.hora ? new Date(b.hora).getTime() : 0;
          return db - da;
        });
        setHistorialLimpio(sorted);
        historialRef.current = sorted;
      } else {
        // si no hay datos y el cliente está vacío, actualizar (caso real de lista vacía)
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
  }, [fetchIntenciones, fetchHistorialLimpio]);

  // función robusta para detectar si una fila corresponde al jugador actual
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
        // conservar fetch inmediato por si la emisión tarda
        fetchIntenciones();
        fetchHistorialLimpio();
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
    setEnviando(false);
  };

  const columnasMostrar = [
    { key: "accion", label: "Acción" },
    { key: "cantidad", label: "Cantidad" },
    { key: "precio", label: "Precio" },
    { key: "hora", label: "Hora" },
    { key: "efectivo", label: "Efectivo" }
  ];

  const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: "24px" };
  const thTdStyle = { border: "1px solid #ddd", padding: "8px", textAlign: "center" };
  const thStyle = { ...thTdStyle, background: "#f4f4f4", fontWeight: "bold" };

  const modalStyle = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.22)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 };
  const cardStyle = { background: "#fff", padding: "2em", borderRadius: "10px", minWidth: "320px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "relative" };

  const NUM_FILAS_HISTORIAL = 9;
  const filasHistorialMostrar =
    misComprasHistorial.length < NUM_FILAS_HISTORIAL
      ? [...misComprasHistorial, ...Array(NUM_FILAS_HISTORIAL - misComprasHistorial.length).fill({})]
      : misComprasHistorial;

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
            {intencionesFiltradas.map(fila => (
              <tr key={fila.id}>
                <td style={thTdStyle}>{fila.accion}</td>
                <td style={thTdStyle}>{fila.cantidad}</td>
                <td style={thTdStyle}>{fila.precio}</td>
                <td style={thTdStyle}>
                  <button onClick={() => handleComprar(fila)} style={{ fontSize: 16, padding: "2px 12px", background: "#388E3C", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                    Comprar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div style={modalStyle}>
          <div style={cardStyle}>
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