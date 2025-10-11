import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import socket from "./socket"; // <-- CORRECTO para tu estructura

const accionesPorDefecto = ["INTC", "MSFT", "AAPL", "IPET", "IBM", "WMT", "MRK", "KO"];

export default function Graficos() {
  const [acciones, setAcciones] = useState(accionesPorDefecto);
  const [accionSeleccionada, setAccionSeleccionada] = useState(accionesPorDefecto[0]);
  const [datos, setDatos] = useState([]);
  const [momentoActual, setMomentoActual] = useState(null);
  const [preciosHistoricos, setPreciosHistoricos] = useState({ encabezados: [], filas: [] });

  useEffect(() => {
    socket.on("tabla_momentos", (tabla) => {
      if (tabla && tabla.filas && tabla.filas.length > 1) {
        setMomentoActual(tabla.filas[1].Momento);
      }
    });
    socket.on("precios_historicos", setPreciosHistoricos);
    socket.on("acciones_para_desplegable", (datosAcciones) => {
      if (datosAcciones && datosAcciones.datos) setAcciones(datosAcciones.datos);
    });
    return () => {
      socket.off("tabla_momentos");
      socket.off("precios_historicos");
      socket.off("acciones_para_desplegable");
    };
  }, []);

  useEffect(() => {
    const { encabezados, filas } = preciosHistoricos;
    if (!encabezados || !filas || !accionSeleccionada || momentoActual === null) {
      setDatos([]);
      return;
    }
    const nombreMomento = encabezados[0];
    const nombreAccion = accionSeleccionada;
    const datosFiltrados = filas
      .filter(fila => fila[nombreMomento] <= momentoActual)
      .map(fila => ({
        momento: fila[nombreMomento],
        precio: Number(fila[nombreAccion])
      }));
    setDatos(datosFiltrados);
  }, [accionSeleccionada, momentoActual, preciosHistoricos]);

  return (
    <div>
      <h2>Escoge la acción a graficar</h2>
      <select
        value={accionSeleccionada}
        onChange={e => setAccionSeleccionada(e.target.value)}
        style={{ fontSize: "1.2em", padding: "0.3em", marginBottom: "1em" }}
      >
        {acciones.map(acc => (
          <option key={acc} value={acc}>{acc}</option>
        ))}
      </select>
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="momento" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="precio" stroke="#007bff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}