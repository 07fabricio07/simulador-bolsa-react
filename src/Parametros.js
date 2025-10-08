import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Parametros() {
  const [parametros, setParametros] = useState({ momento: 0, duracionMomento: 0, estado: 'en pausa' });
  const [editOpen, setEditOpen] = useState(false);
  const [momentoEdit, setMomentoEdit] = useState(0);
  const [duracionEdit, setDuracionEdit] = useState(0);

  // Cargar valores actuales desde el backend
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/parametros-simulacion`)
      .then(res => {
        setParametros(res.data);
        setMomentoEdit(res.data.momento);
        setDuracionEdit(res.data.duracionMomento);
      })
      .catch(() => setParametros({ momento: 0, duracionMomento: 0, estado: 'en pausa' }));
  }, [editOpen]);

  const handleOpenEdit = () => setEditOpen(true);
  const handleCloseEdit = () => setEditOpen(false);

  const handleSendEdit = (e) => {
    e.preventDefault();
    axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/parametros-simulacion`, {
      momento: Number(momentoEdit),
      duracionMomento: Number(duracionEdit),
      estado: parametros.estado
    }).then(res => {
      setParametros(res.data);
      setEditOpen(false);
    });
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
            <td style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "center" }}>{parametros.momento}</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "center" }}>{parametros.duracionMomento}</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "center" }}>{parametros.estado}</td>
          </tr>
        </tbody>
      </table>
      <button onClick={handleOpenEdit}>Modificar valores de la tabla</button>
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
            <form onSubmit={handleSendEdit}>
              <div style={{ marginBottom: "1em" }}>
                <label>Momento:&nbsp;
                  <input type="number" value={momentoEdit} onChange={e => setMomentoEdit(e.target.value)} style={{ width: "80px" }} />
                </label>
              </div>
              <div style={{ marginBottom: "1em" }}>
                <label>Duración del momento:&nbsp;
                  <input type="number" value={duracionEdit} onChange={e => setDuracionEdit(e.target.value)} style={{ width: "80px" }} />
                </label>
              </div>
              <button type="submit">Enviar</button>
              <button type="button" onClick={handleCloseEdit} style={{ marginLeft: "1em" }}>Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}