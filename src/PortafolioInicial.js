import React, { useState, useEffect } from "react";
import axios from "axios";

export default function PortafolioInicial() {
  const [tabla, setTabla] = useState({ encabezados: [], filas: [] });

  useEffect(() => {
    cargarTabla();
  }, []);

  const cargarTabla = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/portafolio-inicial`
      );
      setTabla(res.data);
    } catch (err) {
      setTabla({ encabezados: [], filas: [] });
    }
  };

  return (
    <div>
      <h2>Portafolio inicial</h2>
      <hr />
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", marginTop: "1em" }}>
          <thead>
            <tr>
              {tabla.encabezados.map((enc, idx) => (
                <th key={idx} style={{ border: "1px solid #ccc", padding: "0.5em" }}>{enc}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila, idxFila) => (
              <tr key={idxFila}>
                {tabla.encabezados.map((col, idxCol) => (
                  <td key={idxCol} style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                    {fila[col] !== null && fila[col] !== undefined ? fila[col] : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}