import React, { useState } from "react";

export default function Parametros({
  momento, duracion, estado,
  setMomento, setDuracion, setEstado,
  iniciarSimulacion, pararSimulacion
}) {
  // Estados para la mini pestaña de edición
  const [editOpen, setEditOpen] = useState(false);
  const [momentoEdit, setMomentoEdit] = useState(momento);
  const [duracionEdit, setDuracionEdit] = useState(duracion);

  // Sincroniza valores editables al abrir
  const handleOpenEdit = () => {
    setMomentoEdit(momento);
    setDuracionEdit(duracion);
    setEditOpen(true);
  };

  const handleSendEdit = () => {
    setMomento(Number(momentoEdit));
    setDuracion(Number(duracionEdit));
    setEditOpen(false);
  };

  return (
    <div>
      <h2>Parámetros</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5em" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>momento</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Duración del momento</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "center" }}>{momento}</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "center" }}>{duracion}</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "center" }}>{estado}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", gap: "1em", marginBottom: "2em" }}>
        <button onClick={handleOpenEdit}>Modificar valores de la tabla</button>
        <button onClick={iniciarSimulacion} disabled={estado === "jugando" || duracion <= 0}>Iniciar simulación</button>
        <button onClick={pararSimulacion} disabled={estado === "en pausa"}>Parar simulación</button>
      </div>

      {editOpen && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          <div style={{
            background: "white",
            padding: "2em",
            borderRadius: "8px",
            minWidth: "320px",
            boxShadow: "0 0 16px #888",
            position: "relative"
          }}>
            <h3>Modificar valores</h3>
            <div style={{ marginBottom: "1em" }}>
              <label>
                Momento:&nbsp;
                <input
                  type="number"
                  value={momentoEdit}
                  onChange={e => setMomentoEdit(e.target.value)}
                  style={{ width: "80px" }}
                />
              </label>
            </div>
            <div style={{ marginBottom: "1em" }}>
              <label>
                Duración del momento:&nbsp;
                <input
                  type="number"
                  min={1}
                  value={duracionEdit}
                  onChange={e => setDuracionEdit(e.target.value)}
                  style={{ width: "80px" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSendEdit}>Enviar</button>
            </div>
            <button
              onClick={() => setEditOpen(false)}
              style={{
                position: "absolute",
                top: "8px",
                right: "10px",
                background: "none",
                border: "none",
                fontSize: "1.2em",
                color: "#888",
                cursor: "pointer"
              }}
              title="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}