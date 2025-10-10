import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PortafolioInicial() {
  const [tabla, setTabla] = useState({ encabezados: [], filas: [] });

  useEffect(() => {
    const cargarPortafolio = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/portafolio-inicial`
        );
        setTabla(res.data);
      } catch (err) {
        setTabla({ encabezados: [], filas: [] });
      }
    };
    cargarPortafolio();
  }, []);

  return (
    <div>
      <h2>Portafolio inicial</h2>
      <hr />
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", marginTop: "1em", minWidth: "600px" }}>
          <thead>
            <tr>
              {tabla.encabezados.map((enc, idx) => (
                <th
                  key={idx}
                  style={{
                    border: "1px solid #bbb",
                    padding: "0.7em",
                    background: "#f6f6f6",
                    textAlign: "center",
                    fontWeight: "bold"
                  }}
                >
                  {enc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila, idxFila) => (
              <tr key={idxFila}>
                {tabla.encabezados.map((col, idxCol) => (
                  <td
                    key={idxCol}
                    style={{
                      border: "1px solid #e0e0e0",
                      padding: "0.7em",
                      textAlign: "center"
                    }}
                  >
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