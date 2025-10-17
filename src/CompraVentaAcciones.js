import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";
const ACCIONES = ["INTC", "MSFT", "AAPL", "IPET", "IBM"];

// Helpers para normalizar y detectar payloads "vacíos"
function normalizePayload(datos) {
  if (!datos) return [];
  if (Array.isArray(datos)) return datos;
  if (datos.filas && Array.isArray(datos.filas)) return datos.filas;
  return datos;
}
function isAllEmptyObjects(arr) {
  if (!Array.isArray(arr)) return false;
  return arr.length > 0 && arr.every(item => {
    if (!item || typeof item !== "object") return false;
    return Object.keys(item).length === 0;
  });
}

export default function CompraVentaAcciones({ usuario, nombre }) {
  // Estados para los inputs
  const [accion, setAccion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [intenciones, setIntenciones] = useState([]);
  const [error, setError] = useState("");
  const [anulandoId, setAnulandoId] = useState(null);

  // Estados para el modal de "Anular todas"
  const [modalAnularTodas, setModalAnularTodas] = useState(false);
  const [anulandoTodas, setAnulandoTodas] = useState(false);

  // Estados para historial limpio
  const [historialLimpio, setHistorialLimpio] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  // indicador de socket
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // Refs para evitar sobrescrituras por emisiones "vacías"
  const intencionesRef = useRef([]);
  const historialRef = useRef([]);

  // Extrae el número del usuario y arma el formato "Jugador N"
  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugador = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

  // Consulta las intenciones de venta (fetch inicial y fallback)
  const fetchIntenciones = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
      const data = await res.json();
      const arr = normalizePayload(data);
      setIntenciones(arr);
      intencionesRef.current = arr;
    } catch (err) {
      setError("No se pudo consultar intenciones de venta.");
    }
  }, []);

  useEffect(() => {
    fetchIntenciones();
  }, [fetchIntenciones]);

  // Consulta historial limpio al montar y cada vez que cambie (fetch inicial / fallback)
  const fetchHistorialLimpio = useCallback(async () => {
    try {
      setLoadingHistorial(true);
      const res = await fetch(`${BACKEND_URL}/api/historial-limpio`);
      const data = await res.json();
      const arr = normalizePayload(data);
      setHistorialLimpio(arr);
      historialRef.current = arr;
    } catch (err) {
      setHistorialLimpio([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  useEffect(() => {
    fetchHistorialLimpio();
  }, [fetchHistorialLimpio]);

  // Validación de inputs
  const cantidadValida = /^\d+$/.test(cantidad) && Number(cantidad) > 0;
  const precioValido = (() => {
    if (!/^\d+(\.\d{1,2})?$/.test(precio)) return false;
    return Number(precio) > 0;
  })();
  const accionValida = ACCIONES.includes(accion);
  const puedeEnviar = cantidadValida && precioValido && accionValida;

  // Envía al backend
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
      // refresco inmediato; servidor emitirá también por socket
      await fetchIntenciones();
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
  };

  // FILTRO: solo muestra las intenciones del jugador actual Y cantidad > 0
  const misIntenciones = intenciones.filter(
    fila => fila && fila.jugador === jugador && fila.cantidad > 0
  );

  // Anular intención de venta (poner cantidad en 0)
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
      // refresco inmediato; servidor emitirá también por socket
      await fetchIntenciones();
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
    setAnulandoId(null);
  };

  // NUEVA: Anular todas las intenciones (aplica la lógica de handleAnular a todas)
  const handleAnularTodas = async () => {
    setAnulandoTodas(true);
    setError("");
    try {
      for (const fila of misIntenciones) {
        await fetch(`${BACKEND_URL}/api/intenciones-de-venta/${fila.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad: 0 })
        });
      }
      await fetchIntenciones();
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
    setAnulandoTodas(false);
    setModalAnularTodas(false);
  };

  // FILTRO: historial limpio para mis ventas (donde ofertante = jugador actual)
  // Usamos una comparación tolerante similar a la que usamos en comprar
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

  // Columnas a mostrar (se quitó "comprador")
  const columnasMostrar = [
    { key: "accion", label: "Acción" },
    { key: "cantidad", label: "Cantidad" },
    { key: "precio", label: "Precio" },
    { key: "hora", label: "Hora" },
    { key: "efectivo", label: "Efectivo" }
  ];

  // Estilos para la tabla
  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "24px"
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

  // Mejoras: mostrar hasta 9 filas en historial, con scroll y filas vacías si faltan
  const NUM_FILAS_HISTORIAL = 9;
  const filasHistorialMostrar =
    misVentasHistorial.length < NUM_FILAS_HISTORIAL
      ? [...misVentasHistorial, ...Array(NUM_FILAS_HISTORIAL - misVentasHistorial.length).fill({})]
      : misVentasHistorial;

  // SOCKET.IO: conectar y actualizar intenciones + historial en tiempo real
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("socket.io conectado (CompraVentaAcciones)", socket.id);
      setIsSocketConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.warn("socket.io desconectado (CompraVentaAcciones):", reason);
      setIsSocketConnected(false);
    });

    socket.on("intenciones_de_venta", (payload) => {
      const arr = normalizePayload(payload);
      console.log("evento intenciones_de_venta (CompraVentaAcciones) recibido:", arr);

      // Ignorar payloads compuestos sólo por objetos vacíos
      if (isAllEmptyObjects(arr)) {
        console.log("Ignorado intenciones_de_venta (solo objetos vacíos)");
        return;
      }
      // Si servidor envía array vacío pero cliente ya tiene datos, ignorar para no borrar UI
      if (Array.isArray(arr) && arr.length === 0 && intencionesRef.current && intencionesRef.current.length > 0) {
        console.log("Ignorado intenciones_de_venta vacío (cliente ya tiene datos).");
        return;
      }

      setIntenciones(arr);
      intencionesRef.current = arr;
    });

    socket.on("historial_limpio", (payload) => {
      const arr = normalizePayload(payload);
      console.log("evento historial_limpio (CompraVentaAcciones) recibido:", arr);

      if (isAllEmptyObjects(arr)) {
        console.log("Ignorado historial_limpio (solo objetos vacíos)");
        return;
      }
      if (Array.isArray(arr) && arr.length === 0 && historialRef.current && historialRef.current.length > 0) {
        console.log("Ignorado historial_limpio vacío (cliente ya tiene datos).");
        return;
      }

      // Si llegan datos, ordeno por hora descendente y actualizo
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
      try { socket.disconnect(); } catch (e) { /* ignore */ }
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "auto" }}>
      <h2>Inserte la cantidad y precio de la acción que desea vender:</h2>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <select
          value={accion}
          onChange={e => setAccion(e.target.value)}
          style={{ width: 120, fontSize: 18, padding: 4 }}
        >
          <option value="">Acción</option>
          {ACCIONES.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Cantidad"
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
          style={{
            width: 100,
            fontSize: 18,
            padding: 4,
            borderColor: cantidad && !cantidadValida ? "#d32f2f" : undefined
          }}
        />
        <input
          type="text"
          placeholder="Precio"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          style={{
            width: 100,
            fontSize: 18,
            padding: 4,
            borderColor: precio && !precioValido ? "#d32f2f" : undefined
          }}
        />
        <button
          onClick={handleEnviar}
          disabled={!puedeEnviar}
          style={{
            fontSize: 18,
            padding: "4px 20px",
            background: puedeEnviar ? "#007bff" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: puedeEnviar ? "pointer" : "not-allowed"
          }}
        >
          Enviar
        </button>
      </div>

      <div style={{ color: "#d32f2f", minHeight: 20 }}>
        {precio && !precioValido && "El precio debe ser positivo, con máximo 2 decimales."}
      </div>
      {error && (
        <div style={{ color: "#d32f2f", marginBottom: 16 }}>
          {error}
        </div>
      )}

      <h3>Mis intenciones de venta registradas:</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {misIntenciones.length !== 0 && (
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
        )}
      </div>

      {modalAnularTodas && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div style={{
            background: "#fff",
            padding: "32px 24px",
            borderRadius: 10,
            boxShadow: "0 8px 24px #999",
            textAlign: "center",
            minWidth: 340
          }}>
            <div style={{ fontSize: 20, marginBottom: 24 }}>
              ¿Deseas anular todas tus intenciones?
            </div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              <button
                onClick={() => setModalAnularTodas(false)}
                style={{
                  fontSize: 18,
                  padding: "8px 32px",
                  background: "#19b837",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                No
              </button>
              <button
                onClick={handleAnularTodas}
                disabled={anulandoTodas}
                style={{
                  fontSize: 18,
                  padding: "8px 32px",
                  background: "#d32f2f",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: anulandoTodas ? "not-allowed" : "pointer",
                  fontWeight: "bold"
                }}
              >
                {anulandoTodas ? "..." : "Sí"}
              </button>
            </div>
          </div>
        </div>
      )}

      {misIntenciones.length === 0 ? (
        <div style={{color: "#888", fontSize: "18px", margin: "16px 0"}}>No tienes intenciones de venta activas</div>
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
                  <button
                    onClick={() => handleAnular(fila.id)}
                    disabled={anulandoId === fila.id}
                    style={{
                      fontSize: 16,
                      padding: "2px 12px",
                      background: "#d32f2f",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
                    {anulandoId === fila.id ? "..." : "Anular"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* NUEVA SECCIÓN: HISTORIAL DE VENTA DE ACCIONES */}
      <h3 style={{ marginTop: "32px" }}>Historial de mis venta de acciones:</h3>
      {loadingHistorial ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          Cargando historial...
        </div>
      ) : (
        <div
          style={{
            maxHeight: "360px", // 9 filas * 40px aprox
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