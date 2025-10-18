import React, { useState } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

const ACCIONES = ["MRK", "WMT", "KO"];
// Extendido a 14 jugadores (ahora incluye Jugador 13 y Jugador 14)
const JUGADORES = Array.from({ length: 14 }, (_, i) => `Jugador ${i + 1}`);

export default function RegistrarTransacciones() {
  const [form, setForm] = useState({
    accion: "",
    cantidad: "",
    precio: "",
    comprador: "",
    vendedor: ""
  });
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState(null); // 'success' | 'error' | null
  const [submitting, setSubmitting] = useState(false);

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
    vendedorValido &&
    !submitting;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]: value
    }));
    // limpiar mensajes al cambiar campos para mejor UX
    if (msg) {
      setMsg("");
      setMsgType(null);
    }
  };

  const resetForm = () => {
    setForm({
      accion: "",
      cantidad: "",
      precio: "",
      comprador: "",
      vendedor: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setMsgType(null);
    if (!puedeRegistrar) return;
    setSubmitting(true);

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

      // leer body con tolerancia: primero texto y luego intentar parsear JSON
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { text };
      }

      // Determinar si la operación creó un documento (varios formatos posibles):
      const createdId = data && (data._id || data.id || data.insertedId || data.inserted_id);
      const okFlag = res.ok || (data && data.ok === true) || !!createdId;

      if (okFlag) {
        // Éxito (incluso si el servidor devolvió un status no-2xx pero incluyó id/ok)
        setMsg("Transacción registrada correctamente.");
        setMsgType("success");
        resetForm();
      } else {
        // Si el servidor devolvió texto útil en data.text o data.error lo mostramos
        const errMsg =
          (data && (data.error || data.message || data.text)) ||
          `Error al registrar la transacción (status ${res.status}).`;
        setMsg(errMsg);
        setMsgType("error");

        // Si por alguna razón el servidor devolvió id en body pero no fue res.ok,
        // igualmente consideramos éxito en cuanto a limpiar el formulario (fallback)
        if (createdId) {
          console.warn("Servidor devolvió id pero status no-2xx; limpiando formulario por consistencia.");
          setForm({
            accion: "",
            cantidad: "",
            precio: "",
            comprador: "",
            vendedor: ""
          });
          // mantener msg de aviso/error pero prefijarlo
          setMsg("Transacción registrada (respuesta del servidor irregular).");
          setMsgType("success");
        }
      }
    } catch (err) {
      console.error("Error de red registrando transacción:", err);
      setMsg("Error de red al registrar.");
      setMsgType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const successColor = "#388E3C";
  const errorColor = "#d32f2f";

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
        {/* Mensaje de validación */}
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
            cursor: puedeRegistrar ? "pointer" : "not-allowed",
            opacity: submitting ? 0.9 : 1
          }}
          disabled={!puedeRegistrar}
        >
          {submitting ? "Registrando..." : "Registrar"}
        </button>
      </form>
      {msg && (
        <div style={{marginTop:10, color: msgType === "success" ? successColor : errorColor}}>
          {msg}
        </div>
      )}
    </div>
  );
}