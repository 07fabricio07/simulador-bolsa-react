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

  const handleChange = (e) => {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
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
          <input type="number" name="cantidad" value={form.cantidad} placeholder="Cantidad" onChange={handleChange} required min={1} />
          <input type="number" name="precio" value={form.precio} placeholder="Precio" onChange={handleChange} required min={0.01} step="any" />
          <select name="comprador" value={form.comprador} onChange={handleChange} required>
            <option value="">Comprador</option>
            {JUGADORES.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
          <select name="vendedor" value={form.vendedor} onChange={handleChange} required>
            <option value="">Vendedor</option>
            {JUGADORES.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <button type="submit" style={{marginTop: 10}}>Registrar</button>
      </form>
      {msg && <div style={{marginTop:10, color:"#388E3C"}}>{msg}</div>}
    </div>
  );
}