import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Informacion() {
  const [acciones, setAcciones] = useState([]);

  useEffect(() => {
    const fetchAcciones = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/acciones-para-desplegable`);
        setAcciones(res.data.datos || []);
      } catch (err) {
        setAcciones([]);
      }
    };
    fetchAcciones();
  }, []);

  return (
    <div>
      <h2>Lista de acciones para el desplegable:</h2>
      {acciones.length === 0 ? (
        <p>No hay acciones disponibles.</p>
      ) : (
        <table style={{
          borderCollapse: "collapse",
          marginTop: "1em",
          minWidth: "200px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)"
        }}>
          <thead>
            <tr>
              <th style={{
                border: "1px solid #bdbdbd",
                padding: "0.7em",
                background: "#f6f6f6",
                textAlign: "left"
              }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {acciones.map((accion, idx) => (
              <tr key={idx}>
                <td style={{
                  border: "1px solid #e0e0e0",
                  padding: "0.7em",
                  background: idx % 2 === 0 ? "#fff" : "#fafafa"
                }}>
                  {accion}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}