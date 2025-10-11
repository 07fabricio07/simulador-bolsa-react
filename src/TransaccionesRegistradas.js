import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function TransaccionesRegistradas() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/historial`);
        const data = await res.json();
        setHistorial(data.filas || []);
      } catch (err) {
        setHistorial([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, []);

  return (
    <div>
      <h2>Transacciones Registradas</h2>
      {loading ? <div>Cargando...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Acción</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Vendedor</th>
              <th>Comprador</th>
              <th>Hora</th>
              <th>Momento</th>
              <th>Efectivo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((fila, idx) => (
              <tr key={idx}>
                <td>{fila.accion}</td>
                <td>{fila.cantidad}</td>
                <td>{fila.precio}</td>
                <td>{fila.vendedor}</td>
                <td>{fila.comprador}</td>
                <td>{fila.hora ? new Date(fila.hora).toLocaleString() : ""}</td>
                <td>{fila.momento}</td>
                <td>{fila.efectivo}</td>
                <td>{fila.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}