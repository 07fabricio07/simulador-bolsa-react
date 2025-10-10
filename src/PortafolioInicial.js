import React, { useState, useEffect } from "react";
import axios from "axios";

export default function PortafolioInicial() {
  const [archivoCargando, setArchivoCargando] = useState(false);
  const [tabla, setTabla] = useState({ encabezados: [], filas: [] });

  // Cargar la tabla de PortafolioInicial al montar el componente
  useEffect(() => {
    cargarTabla();
  }, []);

  const cargarTabla = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/portafolio-inicial`
      );
      setTabla(res.data);
    } catch (err) {
      setTabla({ encabezados: [], filas: [] });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('archivo', file);

    setArchivoCargando(true);

    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/subir-excel-portafolio-inicial`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      alert("Archivo subido y procesado correctamente.");
      await cargarTabla(); // Recargar la tabla después de subir el archivo
    } catch (err) {
      alert("Error al subir el archivo.");
    } finally {
      setArchivoCargando(false);
    }
  };

  return (
    <div>
      <h2>Portafolio inicial</h2>
      <p>Sube el archivo Excel con el portafolio inicial de los jugadores:</p>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} disabled={archivoCargando} />
      <hr />
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", marginTop: "1em" }}>
          <thead>
            <tr>
              {tabla.encabezados.map((enc, idx) => (
                <th key={idx} style={{ border: "1px solid #ccc", padding: "0.5em" }}>{enc}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila, idxFila) => (
              <tr key={idxFila}>
                {tabla.encabezados.map((col, idxCol) => (
                  <td key={idxCol} style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                    {fila[col] !== null && fila[col] !== undefined ? fila[col] : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}