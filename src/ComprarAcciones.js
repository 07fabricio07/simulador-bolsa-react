import React, { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";
// socket.io-client por defecto usará path "/socket.io" que coincide con tu servidor socket.io

export default function ComprarAcciones({ usuario, nombre }) {
  const [intenciones, setIntenciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cantidadComprar, setCantidadComprar] = useState("");
  const [error, setError] = useState("");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [momentoActual, setMomentoActual] = useState(null);

  // Para historial limpio
  const [historialLimpio, setHistorialLimpio] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef(null);

  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugadorActual = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

  const fetchIntenciones = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
      const data = await res.json();
      setIntenciones(data.filas || []);
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
      setHistorialLimpio(data.filas || []);
    } catch (err) {
      console.error("Error fetch historial limpio:", err);
      setHistorialLimpio([]);
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

  // socket.io: conectar y escuchar eventos
  useEffect(() => {
    // crea conexión socket.io (usará /socket.io por defecto)
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      // si necesitas opciones CORS/headers/auth agregar aquí
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("socket.io conectado", socket.id);
      setIsSocketConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.warn("socket.io desconectado:", reason);
      setIsSocketConnected(false);
    });

    // eventos que tu servidor emite (según server.js)
    socket.on("intenciones_de_venta", (payload) => {
      // payload es array de intenciones
      console.log("evento intenciones_de_venta recibido", payload);
      setIntenciones(payload || []);
      setLoading(false);
    });

    socket.on("historial_limpio", (payload) => {
      console.log("evento historial_limpio recibido", payload);
      setHistorialLimpio(payload || []);
      setLoadingHistorial(false);
    });

    // También puedes escuchar otros eventos si te interesan:
    // socket.on('tabla_momentos', …), socket.on('regulador_acciones', …), etc.

    // cleanup al desmontar
    return () => {
      try { socket.disconnect(); } catch (e) { /* ignore */ }
      socketRef.current = null;
    };
  }, [fetchIntenciones, fetchHistorialLimpio]);

  const intencionesFiltradas = intenciones.filter(
    fila => fila.jugador !== jugadorActual && fila.cantidad > 0
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
      if (cantidadDisponible >= cantidadInt) {
        estado = "aprobada";
      }

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
        // el socket.io server emitirá historial e intenciones; si tarda, hacemos refresh inmediato
        fetchIntenciones();
        fetchHistorialLimpio();
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
    setEnviando(false);
  };

  // Historial de compras: solo las filas donde el jugador actual es el comprador
  const misComprasHistorial = historialLimpio.filter(
    fila => fila.comprador === jugadorActual
  );

  // Columnas a mostrar en historial: quitada la columna "Ofertante" (vendedor)
  const columnasMostrar = [
    { key: "accion", label: "Acción" },
    { key: "cantidad", label: "Cantidad" },
    { key: "precio", label: "Precio" },
    { key: "hora", label: "Hora" },
    { key: "efectivo", label: "Efectivo" }
  ];

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "24px"
  };

  const thTdStyle = {
    border: "1px solid #ddd",
    padding: "8px",
    textAlign: "center"
  };

  const thStyle = {
    ...thTdStyle,
    background: "#f4f4f4",
    fontWeight: "bold"
  };

  const modalStyle = {
    position: "fixed",
    top: 0, left: 0,
    width: "100vw", height: "100vh",
    background: "rgba(0,0,0,0.22)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999
  };

  const cardStyle = {
    background: "#fff",
    padding: "2em",
    borderRadius: "10px",
    minWidth: "320px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    position: "relative"
  };

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
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          Cargando intenciones de venta...
        </div>
      ) : intencionesFiltradas.length === 0 ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          No hay intenciones de venta disponibles.
        </div>
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
                  <button
                    onClick={() => handleComprar(fila)}
                    style={{
                      fontSize: 16,
                      padding: "2px 12px",
                      background: "#388E3C",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
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
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                fontSize: "1.2em",
                background: "none",
                border: "none",
                cursor: "pointer"
              }}
              aria-label="Cerrar"
            >
              ✖
            </button>

            <div style={{ marginBottom: "14px", fontSize: "17px" }}>
              Ingrese la cantidad que desea comprar
            </div>
            <input
              type="text"
              placeholder="Cantidad"
              value={cantidadComprar}
              onChange={e => setCantidadComprar(e.target.value)}
              style={{
                width: "100%",
                fontSize: "18px",
                padding: "8px",
                marginBottom: "12px",
                border: "1px solid #bbb",
                borderRadius: "4px"
              }}
            />
            {error && (
              <div style={{ color: "#d32f2f", marginBottom: "12px" }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleEnviarCompra}
                disabled={!cantidadValida || enviando}
                style={{
                  fontSize: 16,
                  padding: "7px 22px",
                  background: cantidadValida ? "#007bff" : "#bbb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: cantidadValida ? "pointer" : "not-allowed"
                }}
              >
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: "32px" }}>Historial de mis compras de acciones:</h3>
      {loadingHistorial ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          Cargando historial...
        </div>
      ) : (
        <div
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            borderRadius: "8px",
            border: "1px solid #eee"
          }}
        >
          <table style={tableStyle}>
            <thead>
              <tr>
                {columnasMostrar.map(col => (
                  <th key={col.key} style={thStyle}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasHistorialMostrar.map((fila, idx) => (
                <tr key={idx}>
                  {columnasMostrar.map(col => (
                    <td key={col.key} style={thTdStyle}>
                      {fila[col.key]
                        ? col.key === "hora"
                          ? new Date(fila.hora).toLocaleString()
                          : fila[col.key]
                        : ""}
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