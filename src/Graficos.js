import React, { useEffect, useState } from "react";
import socket from "./socket";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Graficos() {
  const [acciones, setAcciones] = useState([]);
  const [accionSeleccionada, setAccionSeleccionada] = useState("");
  const [datos, setDatos] = useState([]);
  const [encabezados, setEncabezados] = useState([]);
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    function handlePreciosFiltrados(data) {
      if (!data || !data.encabezados || !data.filas) return;
      setEncabezados(data.encabezados);
      setFilas(data.filas);
      const accionesLista = data.encabezados.slice(1); // Quita el campo de momento (field1)
      setAcciones(accionesLista);
      setAccionSeleccionada(accionesLista[0]);
    }
    socket.on("precios_filtrados", handlePreciosFiltrados);
    return () => socket.off("precios_filtrados", handlePreciosFiltrados);
  }, []);

  useEffect(() => {
    if (!accionSeleccionada || !filas.length || !encabezados.length) {
      setDatos([]);
      return;
    }
    // El eje X es 'field1' y el eje Y la acción seleccionada
    const datosAccion = filas
      .filter(fila => fila[accionSeleccionada] !== "" && !isNaN(Number(fila[accionSeleccionada])))
      .map(fila => ({
        momento: Number(fila[encabezados[0]]), // field1
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