import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Informacion() {
  const [acciones, setAcciones] = useState([]);

  useEffect(() => {
    const fetchAcciones = async () => {
      try {
        // CORREGIDO: Usa el endpoint con guion medio
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
        <table>
          <thead>
            <tr>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {acciones.map((accion, idx) => (
              <tr key={idx}>
                <td>{accion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}