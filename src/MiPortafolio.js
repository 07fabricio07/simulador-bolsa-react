import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function MiPortafolio({ usuario }) {
  const [encabezados, setEncabezados] = useState([]);
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Extrae el número del jugador actual (Ej: "Jugador 5")
  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugadorActual = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

  useEffect(() => {
    const fetchPortafolio = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/portafolio-jugadores`);
        const data = await res.json();
        // Asegúrate que data.encabezados y data.filas existen
        setEncabezados(data.encabezados || []);
        setFilas(data.filas || []);
      } catch (err) {
        setEncabezados([]);
        setFilas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPortafolio();
  }, []);

  // Filtrar solo la fila de encabezados y la fila del jugador actual
  let filasFiltradas = [];
  if (filas.length > 0) {
    const filaJugador = filas.find(fila => fila.jugador === jugadorActual);
    if (filaJugador) {
      filasFiltradas = [filas[0], filaJugador]; // filas[0] es encabezados
    }
  }

  // Transponer: filas a columnas
  let datosTranspuestos = [];
  if (filasFiltradas.length === 2 && encabezados.length > 0) {
    datosTranspuestos = encabezados.map(col => ({
      nombre: col,
      valor: filasFiltradas[1][col]
    }));
  }

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
      <h2>Mi Portafolio</h2>
      {loading ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>Cargando portafolio...</div>
      ) : datosTranspuestos.length === 0 ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          No se encontró información para tu usuario.
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Concepto</th>
              <th style={thStyle}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {datosTranspuestos.map((fila, idx) => (
              <tr key={idx}>
                <td style={thTdStyle}>{fila.nombre}</td>
                <td style={thTdStyle}>{fila.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}