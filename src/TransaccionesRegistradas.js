import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function TransaccionesRegistradas() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegistros = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/registros-registrador`);
        const data = await res.json();
        setRegistros(data.registros || []);
      } catch (err) {
        setRegistros([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistros();
  }, []);

  return (
    <div>
      <h2>Transacciones generadas</h2>
      {loading ? <div>Cargando...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Acción</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Comprador</th>
              <th>Vendedor</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((fila, idx) => (
              <tr key={idx}>
                <td>{fila.accion}</td>
                <td>{fila.cantidad}</td>
                <td>{fila.precio}</td>
                <td>{fila.comprador}</td>
                <td>{fila.vendedor}</td>
                <td>{fila.hora ? new Date(fila.hora).toLocaleString() : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}