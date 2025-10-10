import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Informacion() {
  const [tabla, setTabla] = useState({ columnas: [], datos: [] });

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/acciones-para-desplegable`)
      .then(res => setTabla(res.data))
      .catch(() => setTabla({ columnas: [], datos: [] }));
  }, []);

  return (
    <div>
      <h2>Lista de acciones para el desplegable:</h2>
      <table style={{ borderCollapse: "collapse", marginTop: "1em" }}>
        <thead>
          <tr>
            {tabla.columnas.map((col, idx) => (
              <th key={idx} style={{ border: "1px solid #ccc", padding: "0.5em" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {tabla.datos.map((dato, idx) => (
              <td key={idx} style={{ border: "1px solid #ccc", padding: "0.5em" }}>{dato}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}