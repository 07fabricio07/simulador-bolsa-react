import React, { useState } from 'react';

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

export default function BaseDeDatos() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const limpiar = async (coleccion) => {
    setLoading(true);
    setMsg("");
    let endpoint = "";
    if (coleccion === "intenciones") endpoint = "/intenciones-de-venta";
    if (coleccion === "historial") endpoint = "/historial";
    if (coleccion === "historialLimpio") endpoint = "/historial-limpio";
    try {
      const res = await fetch(BACKEND_URL + "/api/admin-limpieza" + endpoint, {
        method: "DELETE"
      });
      const data = await res.json();
      setMsg(data.msg || "Limpieza realizada.");
    } catch (err) {
      setMsg("Error al limpiar la base de datos.");
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth: 500, margin: "auto"}}>
      <h2>Base de datos</h2>
      <button
        style={{margin: "10px 0", padding: "10px 20px"}}
        onClick={() => limpiar("intenciones")}
        disabled={loading}
      >
        Limpieza de Intenciones de Venta BD
      </button>
      <br />
      <button
        style={{margin: "10px 0", padding: "10px 20px"}}
        onClick={() => limpiar("historial")}
        disabled={loading}
      >
        Limpieza de Historial BD
      </button>
      <br />
      <button
        style={{margin: "10px 0", padding: "10px 20px"}}
        onClick={() => limpiar("historialLimpio")}
        disabled={loading}
      >
        Limpieza de Historial Limpio BD
      </button>
      <br />
      {loading && <div style={{color:"#888"}}>Procesando...</div>}
      {msg && <div style={{color:"#388E3C", margin:"10px 0"}}>{msg}</div>}
    </div>
  );
}