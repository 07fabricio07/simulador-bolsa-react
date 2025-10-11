import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function RevisarPortafolioJugadores() {
  const [portafolio, setPortafolio] = useState([]);
  const [encabezados, setEncabezados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortafolio = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/portafolio-jugadores`);
        const data = await res.json();
        setEncabezados(data.encabezados || []);
        setPortafolio(data.filas || []);
      } catch (err) {
        setEncabezados([]);
        setPortafolio([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPortafolio();
  }, []);

  return (
    <div>
      <h2>Portafolio de Jugadores</h2>
      {loading ? <div>Cargando...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {encabezados.map((col, idx) => (
                <th key={idx} style={{ border: "1px solid #ccc", padding: 6 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {portafolio.map((fila, idx) => (
              <tr key={idx}>
                {encabezados.map((col, cidx) => (
                  <td key={cidx} style={{ border: "1px solid #ccc", padding: 6 }}>
                    {fila[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}