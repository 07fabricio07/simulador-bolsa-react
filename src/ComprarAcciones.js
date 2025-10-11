import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function ComprarAcciones({ usuario, nombre }) {
  const [intenciones, setIntenciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Extrae el número del jugador actual para comparar
  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugadorActual = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

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

  // Aplica los dos filtros: 
  // 1. Solo cantidad > 0
  // 2. Solo si el jugador NO es el jugador actual
  const intencionesFiltradas = intenciones.filter(fila =>
    fila.jugador !== jugadorActual && fila.cantidad > 0
  );

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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}