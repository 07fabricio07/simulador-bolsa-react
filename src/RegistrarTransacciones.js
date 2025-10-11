import React, { useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function RegistrarTransacciones() {
  const [form, setForm] = useState({
    accion: "",
    cantidad: "",
    precio: "",
    vendedor: "",
    comprador: "",
    hora: "",
    momento: "",
    efectivo: "",
    estado: ""
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
      const res = await fetch(`${BACKEND_URL}/api/historial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Transacción registrada correctamente.");
        setForm({
          accion: "",
          cantidad: "",
          precio: "",
          vendedor: "",
          comprador: "",
          hora: "",
          momento: "",
          efectivo: "",
          estado: ""
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
        <div>
          <input type="text" name="accion" value={form.accion} placeholder="Acción" onChange={handleChange} required />
          <input type="number" name="cantidad" value={form.cantidad} placeholder="Cantidad" onChange={handleChange} required />
          <input type="number" name="precio" value={form.precio} placeholder="Precio" onChange={handleChange} required />
          <input type="text" name="vendedor" value={form.vendedor} placeholder="Vendedor" onChange={handleChange} required />
          <input type="text" name="comprador" value={form.comprador} placeholder="Comprador" onChange={handleChange} required />
          <input type="datetime-local" name="hora" value={form.hora} placeholder="Fecha y hora" onChange={handleChange} required />
          <input type="number" name="momento" value={form.momento} placeholder="Momento" onChange={handleChange} required />
          <input type="number" name="efectivo" value={form.efectivo} placeholder="Efectivo" onChange={handleChange} required />
          <select name="estado" value={form.estado} onChange={handleChange} required>
            <option value="">Estado</option>
            <option value="aprobada">Aprobada</option>
            <option value="desaprobada">Desaprobada</option>
          </select>
        </div>
        <button type="submit" style={{marginTop: 10}}>Registrar</button>
      </form>
      {msg && <div style={{marginTop:10, color:"#388E3C"}}>{msg}</div>}
    </div>
  );
}