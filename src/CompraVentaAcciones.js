import React, { useState, useEffect } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";
const ACCIONES = ["INTC", "MSFT", "AAPL", "IPET", "IBM"];

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

  // Extrae el número del usuario y arma el formato "Jugador N"
  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugador = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

  // Consulta las intenciones de venta al montar el componente o tras enviar/anular
  const fetchIntenciones = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
      const data = await res.json();
      setIntenciones(data.filas || []);
    } catch (err) {
      setError("No se pudo consultar intenciones de venta.");
    }
  };

  useEffect(() => {
    fetchIntenciones();
  }, []);

  // Consulta historial limpio al montar y cada vez que cambia
  useEffect(() => {
    const fetchHistorialLimpio = async () => {
      try {
        setLoadingHistorial(true);
        const res = await fetch(`${BACKEND_URL}/api/historial-limpio`);
        const data = await res.json();
        setHistorialLimpio(data.filas || []);
      } catch (err) {
        setHistorialLimpio([]);
      } finally {
        setLoadingHistorial(false);
      }
    };
    fetchHistorialLimpio();
  }, []);

  // Validación de inputs
  const cantidadValida = /^\d+$/.test(cantidad) && Number(cantidad) > 0;
  const precioValido = (() => {
    // Debe ser positivo, número, máximo 2 decimales
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
      fetchIntenciones();
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
  };

  // FILTRO: solo muestra las intenciones del jugador actual Y cantidad > 0
  const misIntenciones = intenciones.filter(
    fila => fila.jugador === jugador && fila.cantidad > 0
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
      fetchIntenciones();
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
      // Ejecuta la lógica de handleAnular en todas las filas
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
  const misVentasHistorial = historialLimpio.filter(
    fila => fila.vendedor === jugador
  );

  // Columnas a mostrar
  const columnasMostrar = [
    { key: "accion", label: "Acción" },
    { key: "cantidad", label: "Cantidad" },
    { key: "precio", label: "Precio" },
    { key: "comprador", label: "Comprador" },
    { key: "hora", label: "Hora" },
    { key: "efectivo", label: "Efectivo" }
    // Ocultas: id, momento, estado
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
      {/* Mensaje de error si precio tiene más de 2 decimales */}
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
      {/* Modal de confirmación para "Anular todas" */}
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