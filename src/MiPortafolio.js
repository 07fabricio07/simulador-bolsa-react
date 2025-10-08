import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MiPortafolio({ usuarioActual }) {
  const [portafolio, setPortafolio] = useState([
    { accion: "CC", cantidad: "" },
    { accion: "AA", cantidad: "" },
    { accion: "EE", cantidad: "" },
    { accion: "QQ", cantidad: "" },
    { accion: "ZZ", cantidad: "" },
    { accion: "BB", cantidad: "" }
  ]);

  useEffect(() => {
    const fetchPortafolio = () => {
      // Si tienes endpoint real, descomenta y ajusta la URL:
      // const token = localStorage.getItem("token");
      // axios.get(`http://localhost:10000/api/portafolio/${usuarioActual.usuario}`, { headers: { Authorization: "Bearer " + token } })
      //   .then(res => setPortafolio(res.data))
      //   .catch(err => console.error(err));
      // Si no, el portafolio seguirá usando el estado local
    };
    fetchPortafolio();
    const interval = setInterval(fetchPortafolio, 1000);
    return () => clearInterval(interval);
  }, [usuarioActual]);

  return (
    <div>
      <h2>Mi portafolio</h2>
      <table style={{ width: "300px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "left" }}>Acción</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "left" }}>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {portafolio.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>{item.accion}</td>
              <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>{item.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}