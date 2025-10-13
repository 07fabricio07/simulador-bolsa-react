import React, { useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

const ACCIONES = ["MRK", "WMT", "KO"];
const JUGADORES = Array.from({ length: 12 }, (_, i) => `Jugador ${i + 1}`);

export default function RegistrarTransacciones() {
  const [form, setForm] = useState({
    accion: "",
    cantidad: "",
    precio: "",
    comprador: "",
    vendedor: ""
  });
  const [msg, setMsg] = useState("");

  // Validaciones
  const cantidadValida =
    /^\d+$/.test(form.cantidad) && Number(form.cantidad) > 0;
  const precioValido = (() => {
    // Debe ser número positivo mayor a 0 y máximo 2 decimales
    const val = form.precio;
    if (!/^\d+(\.\d{1,2})?$/.test(val)) return false;
    return Number(val) > 0;
  })();
  const accionValida = ACCIONES.includes(form.accion);
  const compradorValido = JUGADORES.includes(form.comprador);
  const vendedorValido = JUGADORES.includes(form.vendedor);

  const puedeRegistrar =
    cantidadValida &&
    precioValido &&
    accionValida &&
    compradorValido &&
    vendedorValido;

  const handleChange = (e) => {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!puedeRegistrar) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/registros-registrador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cantidad: Number(form.cantidad),
          precio: Number(form.precio)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Transacción registrada correctamente.");
        setForm({
          accion: "",
          cantidad: "",
          precio: "",
          comprador: "",
          vendedor: ""
        });
      } else {
        setMsg(data.error || "Error al registrar.");
      }
    } catch (err) {
      setMsg("Error de red al registrar.");
    }
  };

  return (
    <div>
      <h2>Registrar Transacción</h2>
      <form onSubmit={handleSubmit}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <select name="accion" value={form.accion} onChange={handleChange} required>
            <option value="">Acción</option>
            {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            type="number"
            name="cantidad"
            value={form.cantidad}
            placeholder="Cantidad"
            onChange={handleChange}
            required
            min={1}
            step={1}
            style={{
              borderColor: form.cantidad && !cantidadValida ? "#d32f2f" : undefined
            }}
          />
          <input
            type="number"
            name="precio"
            value={form.precio}
            placeholder="Precio"
            onChange={handleChange}
            required
            min={0.01}
            step="0.01"
            style={{
              borderColor: form.precio && !precioValido ? "#d32f2f" : undefined
            }}
          />
          <select name="comprador" value={form.comprador} onChange={handleChange} required>
            <option value="">Comprador</option>
            {JUGADORES.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
          <select name="vendedor" value={form.vendedor} onChange={handleChange} required>
            <option value="">Vendedor</option>
            {JUGADORES.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        {/* Mensaje de error si hay campos inválidos */}
        <div style={{ color: "#d32f2f", marginTop: 7 }}>
          {!cantidadValida && form.cantidad && "La cantidad debe ser un número entero positivo."}
          {!precioValido && form.precio && "El precio debe ser un número positivo con máximo 2 decimales."}
        </div>
        <button
          type="submit"
          style={{
            marginTop: 10,
            background: puedeRegistrar ? "#007bff" : "#ccc",
            color: "#fff",
            border: "none",
            padding: "8px 24px",
            borderRadius: 4,
            fontSize: 16,
            cursor: puedeRegistrar ? "pointer" : "not-allowed"
          }}
          disabled={!puedeRegistrar}
        >
          Registrar
        </button>
      </form>
      {msg && <div style={{marginTop:10, color:"#388E3C"}}>{msg}</div>}
    </div>
  );
}