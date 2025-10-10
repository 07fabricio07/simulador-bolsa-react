import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PortafolioInicial() {
  const [tabla, setTabla] = useState({ encabezados: [], filas: [] });
  const [editFilas, setEditFilas] = useState([]);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarPortafolio();
  }, []);

  const cargarPortafolio = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/portafolio-inicial`
      );
      setTabla(res.data);
      setEditFilas(res.data.filas);
    } catch (err) {
      setTabla({ encabezados: [], filas: [] });
      setEditFilas([]);
    }
  };

  const handleEditCell = (filaIdx, col) => (e) => {
    const value = e.target.value;
    setEditFilas((prev) =>
      prev.map((fila, idx) =>
        idx === filaIdx ? { ...fila, [col]: value } : fila
      )
    );
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/portafolio-inicial`,
        {
          encabezados: tabla.encabezados,
          filas: editFilas,
        }
      );
      await cargarPortafolio();
      setEditando(false);
      alert("¡Datos guardados correctamente!");
    } catch (err) {
      alert("Error al guardar los datos.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <h2>Portafolio inicial</h2>
      <hr />
      {!editando && (
        <button onClick={() => setEditando(true)}>Editar tabla</button>
      )}
      {editando && (
        <button onClick={handleGuardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      )}
      <div style={{ overflowX: "auto", marginTop: "1em" }}>
        <table style={{ borderCollapse: "collapse", minWidth: "600px" }}>
          <thead>
            <tr>
              {tabla.encabezados.map((enc, idx) => (
                <th
                  key={idx}
                  style={{
                    border: "1px solid #bbb",
                    padding: "0.7em",
                    background: "#f6f6f6",
                    textAlign: "center",
                    fontWeight: "bold"
                  }}
                >
                  {enc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(editando ? editFilas : tabla.filas).map((fila, idxFila) => (
              <tr key={idxFila}>
                {tabla.encabezados.map((col, idxCol) => (
                  <td
                    key={idxCol}
                    style={{
                      border: "1px solid #e0e0e0",
                      padding: "0.7em",
                      textAlign: "center"
                    }}
                  >
                    {editando ? (
                      <input
                        value={fila[col] ?? ""}
                        onChange={handleEditCell(idxFila, col)}
                        style={{ width: "60px", textAlign: "center" }}
                      />
                    ) : (
                      fila[col] ?? ""
                    )}
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