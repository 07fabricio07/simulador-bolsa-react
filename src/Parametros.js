import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Parametros() {
  const [tablaMomentos, setTablaMomentos] = useState([]);

  useEffect(() => {
    const fetchTabla = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/tabla-momentos`);
        setTablaMomentos(res.data.filas || []);
      } catch (err) {
        setTablaMomentos([]);
      }
    };
    fetchTabla();
  }, []);

  return (
    <div>
      <h2>Tabla de momentos del juego</h2>
      <table style={{ borderCollapse: "collapse", marginTop: "1em" }}>
        <thead>
          <tr>
            {tablaMomentos.length > 0 && Object.keys(tablaMomentos[0]).map((col, idx) => (
              <th key={idx} style={{ border: "1px solid #ccc", padding: "0.5em" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tablaMomentos.slice(1).map((fila, idxFila) => (
            <tr key={idxFila}>
              {Object.keys(tablaMomentos[0]).map((col, idxCol) => (
                <td key={idxCol} style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                  {fila[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}