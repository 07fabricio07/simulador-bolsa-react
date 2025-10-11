import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function ComprarAcciones({ usuario, nombre }) {
  const [intenciones, setIntenciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cantidadComprar, setCantidadComprar] = useState("");
  const [error, setError] = useState("");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [momentoActual, setMomentoActual] = useState(null);

  // Extrae el número del jugador actual para comparar
  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugadorActual = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

  // Cargar intenciones de venta
  useEffect(() => {
    const fetchIntenciones = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
        const data = await res.json();
        setIntenciones(data.filas || []);
      } catch (err) {
        setIntenciones([]);
      } finally {
        setLoading(false);
      }
    };
    fetchIntenciones();
  }, []);

  // Cargar momento actual de la colección TablaMomentos
  useEffect(() => {
    const fetchMomento = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/tabla-momentos`);
        const data = await res.json();
        // fila 2, columna 1 (la segunda fila, primera columna)
        // data.filas[1] y data.filas[1].Momento
        setMomentoActual(data.filas?.[1]?.Momento ?? null);
      } catch (err) {
        setMomentoActual(null);
      }
    };
    fetchMomento();
  }, []);

  // Aplica los dos filtros: 
  // 1. Solo cantidad > 0
  // 2. Solo si el jugador NO es el jugador actual
  const intencionesFiltradas = intenciones.filter(fila =>
    fila.jugador !== jugadorActual && fila.cantidad > 0
  );

  // Abrir minipestaña para comprar
  const handleComprar = (fila) => {
    setFilaSeleccionada(fila);
    setCantidadComprar("");
    setError("");
    setModalOpen(true);
  };

  // Validación del campo cantidadComprar
  const cantidadInt = Number(cantidadComprar);
  const cantidadValida =
    /^\d+$/.test(cantidadComprar) &&
    cantidadInt > 0 &&
    Number.isInteger(cantidadInt);

  // Enviar compra al backend (colección "Historial")
  const handleEnviarCompra = async () => {
    if (!cantidadValida || !filaSeleccionada) return;
    setEnviando(true);
    setError("");
    try {
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
        efectivo
      };
      // Aquí se envía la compra a la colección "Historial" por HTTP POST
      const res = await fetch(`${BACKEND_URL}/api/historial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        setError("Error al registrar la compra.");
      } else {
        setModalOpen(false);
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
    setEnviando(false);
  };

  // Estilos para la tabla
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

  // Minipestaña/modal para comprar
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

  return (
    <div>
      <h2>Intenciones de venta de otros jugadores</h2>
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
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Acción</th>
              <th style={thStyle}>Cantidad</th>
              <th style={thStyle}>Precio</th>
              <th style={thStyle}>Jugador</th>
              <th style={thStyle}>Ejecución</th>
            </tr>
          </thead>
          <tbody>
            {intencionesFiltradas.map(fila => (
              <tr key={fila.id}>
                <td style={thTdStyle}>{fila.id}</td>
                <td style={thTdStyle}>{fila.accion}</td>
                <td style={thTdStyle}>{fila.cantidad}</td>
                <td style={thTdStyle}>{fila.precio}</td>
                <td style={thTdStyle}>{fila.jugador}</td>
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

      {/* Minipestaña/modal */}
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
    </div>
  );
}