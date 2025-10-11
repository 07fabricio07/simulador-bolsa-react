import React, { useState, useEffect } from "react";
import socket from "./socket";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const ACCIONES = ["INTC", "MSFT", "AAPL", "IPET", "IBM"];

export default function CompraVentaAcciones({ usuario, nombre }) {
  // Estados para los inputs
  const [accion, setAccion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [intenciones, setIntenciones] = useState([]);
  const [error, setError] = useState("");

  // Escucha las intenciones de venta en tiempo real
  useEffect(() => {
    function handleIntenciones(data) {
      setIntenciones(data);
    }
    socket.on("intenciones_de_venta", handleIntenciones);
    return () => socket.off("intenciones_de_venta", handleIntenciones);
  }, []);

  // Validación de inputs
  const cantidadValida = /^\d+$/.test(cantidad) && Number(cantidad) > 0;
  const precioValido = /^\d+(\.\d+)?$/.test(precio) && Number(precio) > 0;
  const accionValida = ACCIONES.includes(accion);
  const puedeEnviar = cantidadValida && precioValido && accionValida;

  // Extrae el número del usuario y arma el formato "Jugador N"
  const jugadorNumero = usuario.match(/\d+/)?.[0];
  const jugador = jugadorNumero ? `Jugador ${jugadorNumero}` : "Jugador";

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
          jugador // <-- ahora en formato correcto
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
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    }
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
      <h3>Intenciones de venta registradas:</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Acción</th><th>Cantidad</th><th>Precio</th><th>Jugador</th><th>Hora</th><th>ID</th>
          </tr>
        </thead>
        <tbody>
          {intenciones.map(fila => (
            <tr key={fila.id}>
              <td>{fila.accion}</td>
              <td>{fila.cantidad}</td>
              <td>{fila.precio}</td>
              <td>{fila.jugador}</td>
              <td>{new Date(fila.hora).toLocaleString()}</td>
              <td>{fila.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}