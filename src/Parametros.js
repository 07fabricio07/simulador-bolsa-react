import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function Parametros() {
  const [tablaMomentos, setTablaMomentos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [momento, setMomento] = useState("");
  const [duracion, setDuracion] = useState("");
  const [simulacionActiva, setSimulacionActiva] = useState(false);
  const intervalRef = useRef();

  useEffect(() => {
    fetchTabla();
    if (simulacionActiva) {
      const interval = setInterval(fetchTabla, 1000);
      intervalRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [simulacionActiva]);

  const fetchTabla = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/tabla-momentos`);
      setTablaMomentos(res.data.filas || []);
    } catch (err) {
      setTablaMomentos([]);
    }
  };

  // Obtenemos las columnas desde la primera fila
  const columnas = tablaMomentos.length > 0
    ? Object.keys(tablaMomentos[0]).filter((col) => col !== "_id")
    : [];

  const handleOpenModal = () => {
    setMomento(tablaMomentos[1]?.Momento ?? "");
    setDuracion(tablaMomentos[1]?.DuracionDelMomento ?? "");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleEnviar = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/tabla-momentos/modificar`, {
        Momento: momento,
        DuracionDelMomento: duracion
      });
      setShowModal(false);
      fetchTabla();
    } catch (err) {
      alert("Error al modificar los datos");
    }
  };

  const handleIniciar = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/tabla-momentos/iniciar`);
      setSimulacionActiva(true);
      fetchTabla();
    } catch (err) {
      alert("Error al iniciar la simulación");
    }
  };

  const handlePausar = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/tabla-momentos/pausar`);
      setSimulacionActiva(false);
      fetchTabla();
    } catch (err) {
      alert("Error al pausar la simulación");
    }
  };

  return (
    <div>
      <h2>Tabla de momentos del juego</h2>
      <table style={{ borderCollapse: "collapse", marginTop: "1em" }}>
        <thead>
          <tr>
            {columnas.map((col, idx) => (
              <th key={idx} style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                {tablaMomentos[0] ? tablaMomentos[0][col] : col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Solo mostramos las filas desde la segunda en adelante */}
          {tablaMomentos.slice(1).map((fila, idxFila) => (
            <tr key={idxFila}>
              {columnas.map((col, idxCol) => (
                <td key={idxCol} style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                  {fila[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "2em", display: "flex", gap: "1em" }}>
        <button onClick={handleOpenModal}>Modificar datos</button>
        <button onClick={handleIniciar} disabled={simulacionActiva}>Iniciar simulación</button>
        <button onClick={handlePausar} disabled={!simulacionActiva}>Pausar simulación</button>
      </div>

      {showModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.2)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 999
        }}>
          <div style={{
            background: "white", padding: "2em", borderRadius: "10px",
            minWidth: "300px", position: "relative"
          }}>
            <button onClick={handleCloseModal} style={{
              position: "absolute", top: "8px", right: "8px", fontSize: "1.2em",
              background: "none", border: "none", cursor: "pointer"
            }}>✖</button>
            <div>
              <label>Inserte el momento:</label>
              <input
                type="number"
                value={momento}
                onChange={e => setMomento(e.target.value)}
                style={{ width: "100%", marginBottom: "1em" }}
              />
            </div>
            <div>
              <label>Inserte duración del momento:</label>
              <input
                type="number"
                value={duracion}
                onChange={e => setDuracion(e.target.value)}
                style={{ width: "100%", marginBottom: "2em" }}
              />
            </div>
            <div style={{ textAlign: "right" }}>
              <button onClick={handleEnviar}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}