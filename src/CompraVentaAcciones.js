import React, { useState, useEffect } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";
const ACCIONES = ["INTC", "MSFT", "AAPL", "IPET", "IBM"];

export default function CompraVentaAcciones({ usuario, nombre }) {
  // Estados para los inputs
  const [accion, setAccion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [intenciones, setIntenciones] = useState([]);
  const [error, setError] = useState("");
  const [anulandoId, setAnulandoId] = useState(null);

  // Extrae el número del usuario y arma el formato "Jugador N"
  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugador = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

  // Consulta las intenciones de venta al montar el componente o tras enviar/anular
  const fetchIntenciones = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`);
      const data = await res.json();
      setIntenciones(data.filas || []);
    } catch (err) {
      setError("No se pudo consultar intenciones de venta.");
    }
  };

  useEffect(() => {
    fetchIntenciones();
  }, []);

  // Validación de inputs
  const cantidadValida = /^\d+$/.test(cantidad) && Number(cantidad) > 0;
  const precioValido = /^\d+(\.\d+)?$/.test(precio) && Number(precio) > 0;
  const accionValida = ACCIONES.includes(accion);
  const puedeEnviar = cantidadValida && precioValido && accionValida;

  // Envía al backend
  const handleEnviar = async () => {
    setError("");
    if (!puedeEnviar) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          cantidad: Number(cantidad),
          precio: Number(precio),
          jugador
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar la intención de venta.");
        return;
      }
      setCantidad("");
      setPrecio("");
      setAccion("");
      fetchIntenciones();
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
  };

  // FILTRO: solo muestra las intenciones del jugador actual
  const misIntenciones = intenciones.filter(fila => fila.jugador === jugador);

  // Anular intención de venta (poner cantidad en 0)
  const handleAnular = async (id) => {
    setAnulandoId(id);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/intenciones-de-venta/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: 0 })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al anular la intención de venta.");
        setAnulandoId(null);
        return;
      }
      fetchIntenciones();
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
    setAnulandoId(null);
  };

  // Estilos para la tabla
  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "24px"
  };

  const thTdStyle = {
    border: "1px solid #ddd",
    padding: "8px",
    textAlign: "center"
  };

  const thStyle = {
    ...thTdStyle,
    background: "#f4f4f4",
    fontWeight: "bold"
  };

  return (
    <div style={{ maxWidth: 700, margin: "auto" }}>
      <h2>Inserte la cantidad y precio de la acción que desea vender:</h2>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <select
          value={accion}
          onChange={e => setAccion(e.target.value)}
          style={{ width: 120, fontSize: 18, padding: 4 }}
        >
          <option value="">Acción</option>
          {ACCIONES.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Cantidad"
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
          style={{ width: 100, fontSize: 18, padding: 4 }}
        />
        <input
          type="text"
          placeholder="Precio"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          style={{ width: 100, fontSize: 18, padding: 4 }}
        />
        <button
          onClick={handleEnviar}
          disabled={!puedeEnviar}
          style={{
            fontSize: 18,
            padding: "4px 20px",
            background: puedeEnviar ? "#007bff" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: puedeEnviar ? "pointer" : "not-allowed"
          }}
        >
          Enviar
        </button>
      </div>
      {error && (
        <div style={{ color: "#d32f2f", marginBottom: 16 }}>
          {error}
        </div>
      )}
      <h3>Mis intenciones de venta registradas:</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Acción</th>
            <th style={thStyle}>Cantidad</th>
            <th style={thStyle}>Precio</th>
            <th style={thStyle}>Ejecución</th>
          </tr>
        </thead>
        <tbody>
          {misIntenciones.map(fila => (
            <tr key={fila.id}>
              <td style={thTdStyle}>{fila.accion}</td>
              <td style={thTdStyle}>{fila.cantidad}</td>
              <td style={thTdStyle}>{fila.precio}</td>
              <td style={thTdStyle}>
                <button
                  onClick={() => handleAnular(fila.id)}
                  disabled={anulandoId === fila.id}
                  style={{
                    fontSize: 16,
                    padding: "2px 12px",
                    background: "#d32f2f",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer"
                  }}
                >
                  {anulandoId === fila.id ? "..." : "Anular"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}