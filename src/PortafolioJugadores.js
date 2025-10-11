import React, { useEffect, useState } from "react";
import socket from "./socket";

function PortafolioJugadores() {
  const [data, setData] = useState({ encabezados: [], filas: [] });

  useEffect(() => {
    socket.on("portafolio_jugadores", setData);
    return () => socket.off("portafolio_jugadores", setData);
  }, []);

  if (!data.encabezados.length) return <div>Cargando...</div>;

  return (
    <div>
      <h2>Portafolio de Jugadores</h2>
      <table>
        <thead>
          <tr>
            {data.encabezados.map((enc, i) => (
              <th key={i}>{enc}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.filas.map((fila, idx) => (
            <tr key={idx}>
              {data.encabezados.map((enc, i) => (
                <td key={i}>{fila[enc]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PortafolioJugadores;