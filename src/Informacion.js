import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Informacion() {
  const [cantidadAcciones, setCantidadAcciones] = useState(1);
  const [editCantidadOpen, setEditCantidadOpen] = useState(false);
  const [cantidadEdit, setCantidadEdit] = useState(1);

  const [nombresAcciones, setNombresAcciones] = useState([]);
  const [editNombresOpen, setEditNombresOpen] = useState(false);
  const [nombresEdit, setNombresEdit] = useState([]);

  // Leer cantidad desde backend
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/cantidad-acciones`)
      .then(res => {
        setCantidadAcciones(res.data.cantidad || 1);
        setCantidadEdit(res.data.cantidad || 1);
      })
      .catch(() => setCantidadAcciones(1));
  }, []);

  // Leer nombres de acciones desde backend
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/acciones-juego`)
      .then(res => {
        const nombres = res.data.map(accion => accion.nombre);
        setNombresAcciones(nombres);
        setNombresEdit(nombres);
      }).catch(() => {
        setNombresAcciones([]);
        setNombresEdit([]);
      });
  }, [cantidadAcciones]);

  // Enviar nueva cantidad al backend
  const handleCantidadSend = () => {
    const nuevaCantidad = Math.max(1, Number(cantidadEdit));
    axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/cantidad-acciones`, { cantidad: nuevaCantidad })
      .then(() => setCantidadAcciones(nuevaCantidad));
    setEditCantidadOpen(false);
  };

  // Abrir edición de nombres
  const handleAbrirNombres = () => {
    setNombresEdit([...nombresAcciones]);
    setEditNombresOpen(true);
  };

  // Enviar nombres al backend
  const handleNombresSend = () => {
    const accionesArray = Array.from({ length: cantidadAcciones }).map((_, i) => ({
      numero: i + 1,
      nombre: nombresEdit[i] || "",
      columnaExtra1: "",
      columnaExtra2: "",
      columnaExtra3: ""
    }));
    axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/acciones-juego`, accionesArray)
      .then(() => setNombresAcciones(nombresEdit));
    setEditNombresOpen(false);
  };

  return (
    <div>
      <h2>Información</h2>
      <table style={{ width: "260px", borderCollapse: "collapse", marginBottom: "1em" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.7em" }}>Cantidad de acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "0.7em", textAlign: "center" }}>
              {cantidadAcciones}
            </td>
          </tr>
        </tbody>
      </table>
      <button onClick={() => {
        setCantidadEdit(cantidadAcciones);
        setEditCantidadOpen(true);
      }}>
        Cantidad de acciones
      </button>
      {editCantidadOpen && (
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
            maxHeight: "70vh",
            overflowY: "auto",
            boxShadow: "0 0 16px #888",
            position: "relative"
          }}>
            <h3>Modificar cantidad de acciones</h3>
            <input
              type="number"
              min={1}
              value={cantidadEdit}
              onChange={e => setCantidadEdit(e.target.value)}
              style={{ width: "100px", marginBottom: "1em" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleCantidadSend}>Enviar</button>
            </div>
            <button
              onClick={() => setEditCantidadOpen(false)}
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
      <hr style={{ margin: "2em 0 1em 0" }} />
      <h3>Acciones del juego</h3>
      <table style={{ borderCollapse: "collapse", marginBottom: "1em" }}>
        <thead>
          <tr>
            {Array.from({ length: cantidadAcciones }).map((_, idx) => (
              <th key={idx} style={{ border: "1px solid #ccc", padding: "0.7em", textAlign: "center" }}>
                {idx + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {Array.from({ length: cantidadAcciones }).map((_, idx) => (
              <td key={idx} style={{ border: "1px solid #ccc", padding: "0.7em", textAlign: "center" }}>
                {nombresAcciones[idx] || "-"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <button onClick={handleAbrirNombres}>Nombrar acciones</button>
      {editNombresOpen && (
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
            maxHeight: "70vh",
            overflowY: "auto",
            boxShadow: "0 0 16px #888",
            position: "relative"
          }}>
            <h3>Nombrar acciones</h3>
            <form onSubmit={e => { e.preventDefault(); handleNombresSend(); }}>
              {Array.from({ length: cantidadAcciones }).map((_, idx) => (
                <div key={idx} style={{ marginBottom: "1em" }}>
                  <label>
                    Acción {idx + 1}:&nbsp;
                    <input
                      type="text"
                      value={nombresEdit[idx] || ""}
                      onChange={e => {
                        const nuevos = [...nombresEdit];
                        nuevos[idx] = e.target.value;
                        setNombresEdit(nuevos);
                      }}
                      style={{ width: "180px" }}
                    />
                  </label>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit">Enviar</button>
              </div>
            </form>
            <button
              onClick={() => setEditNombresOpen(false)}
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