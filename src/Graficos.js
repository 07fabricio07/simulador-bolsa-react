import React, { useEffect, useState } from "react";
import socket from "./socket";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Graficos() {
  const [acciones, setAcciones] = useState([]);
  const [accionSeleccionada, setAccionSeleccionada] = useState("");
  const [datos, setDatos] = useState([]);
  const [filas, setFilas] = useState([]);
  const [encabezados, setEncabezados] = useState([]);

  useEffect(() => {
    function handlePreciosFiltrados(data) {
      if (!data || !data.encabezados || !data.filas) return;
      setEncabezados(data.encabezados);
      setFilas(data.filas);
      setAcciones(data.encabezados.slice(1));
      setAccionSeleccionada(data.encabezados[1]);
    }
    socket.on("precios_filtrados", handlePreciosFiltrados);
    return () => socket.off("precios_filtrados", handlePreciosFiltrados);
  }, []);

  useEffect(() => {
    if (!accionSeleccionada || !filas.length || !encabezados.length) {
      setDatos([]);
      return;
    }
    const nombreMomento = encabezados[0];
    // Construye los datos solo para la acción seleccionada
    const datosAccion = filas.map(fila => ({
      momento: Number(fila[nombreMomento]),
      precio: Number(fila[accionSeleccionada])
    }));
    setDatos(datosAccion);
  }, [accionSeleccionada, filas, encabezados]);

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