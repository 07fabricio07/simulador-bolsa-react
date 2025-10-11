import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function MiPortafolio({ nombreJugador }) {
  const [encabezados, setEncabezados] = useState([]);
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortafolio = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/portafolio-jugadores`);
        const data = await res.json();
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

  // Filtra la fila que corresponde al jugador actual
  const filaJugador = filas.find(fila => fila.jugador === nombreJugador);

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
      ) : !filaJugador ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          No se encontró información para tu usuario.
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              {encabezados.map((col, idx) => (
                <th key={idx} style={thStyle}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {encabezados.map((col, idx) => (
                <td key={idx} style={thTdStyle}>{filaJugador[col]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}