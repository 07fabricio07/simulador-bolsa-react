import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

// Función para normalizar nombre a "Jugador N"
function obtenerNombreJugadorNormalizado(nombreJugador) {
  const match = nombreJugador.match(/\d+/);
  if (match) {
    return `Jugador ${match[0]}`;
  }
  const nombres = [
    "uno", "dos", "tres", "cuatro", "cinco",
    "seis", "siete", "ocho", "nueve", "diez",
    "once", "doce", "trece"
  ];
  const nombreMin = nombreJugador.toLowerCase();
  for (let i = 0; i < nombres.length; i++) {
    if (nombreMin.includes(nombres[i])) {
      return `Jugador ${i + 1}`;
    }
  }
  return nombreJugador;
}

export default function MiPortafolio({ nombreJugador }) {
  const [encabezados, setEncabezados] = useState([]);
  const [filas, setFilas] = useState([]);
  const [regulador, setRegulador] = useState({ encabezados: [], filas: [] });
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
      }
    };
    const fetchRegulador = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/regulador-acciones`);
        const data = await res.json();
        setRegulador(data || { encabezados: [], filas: [] });
      } catch (err) {
        setRegulador({ encabezados: [], filas: [] });
      }
    };
    Promise.all([fetchPortafolio(), fetchRegulador()]).finally(() =>
      setLoading(false)
    );
  }, []);

  // Normaliza el nombre del jugador
  const nombreJugadorNormalizado = obtenerNombreJugadorNormalizado(nombreJugador);

  // Filtra la fila que corresponde al jugador actual
  const filaJugador = filas.find(fila => fila.jugador === nombreJugadorNormalizado);
  const filaRegulador = (regulador.filas || []).find(
    fila => fila.jugador === nombreJugadorNormalizado
  );

  const tableStyle = {
    width: "350px",
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
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          Cargando portafolio...
        </div>
      ) : !filaJugador ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          No se encontró información para tu usuario.
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}> </th>
              <th style={thStyle}>Cantidad</th>
              <th style={thStyle}>Disponible para ofertar</th>
            </tr>
          </thead>
          <tbody>
            {encabezados.filter(col => col !== "jugador").map((col, idx) => (
              <tr key={idx}>
                <td style={thTdStyle}>{col}</td>
                <td style={thTdStyle}>{filaJugador[col]}</td>
                <td style={thTdStyle}>
                  {filaRegulador && filaRegulador[col] !== undefined
                    ? filaRegulador[col]
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}