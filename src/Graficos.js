import React, { useEffect, useState } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const acciones = ["INTC", "MSFT", "AAPL", "IPET", "IBM", "WMT", "MRK", "KO"];

export default function Graficos() {
  const [accionSeleccionada, setAccionSeleccionada] = useState(acciones[0]);
  const [datos, setDatos] = useState([]);
  const [momentoActual, setMomentoActual] = useState(null);

  // Cargar momento actual cada 5 segundos
  useEffect(() => {
    const cargarMomento = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/tabla-momentos`);
        // Asume que el valor está en la segunda fila, primera columna (según tu instrucción)
        if (res.data.filas && res.data.filas.length > 1) {
          setMomentoActual(res.data.filas[1][res.data.encabezados[0]]);
        }
      } catch (err) {
        setMomentoActual(null);
      }
    };

    cargarMomento();
    const intervalo = setInterval(cargarMomento, 5000);
    return () => clearInterval(intervalo);
  }, []);

  // Cargar datos históricos cada vez que cambia la acción o el momento actual
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/precios-historicos`);
        const { encabezados, filas } = res.data;
        if (!encabezados || !filas || !accionSeleccionada || momentoActual === null) {
          setDatos([]);
          return;
        }
        // Filtra filas hasta el momento actual
        const nombreMomento = encabezados[0];
        const nombreAccion = accionSeleccionada;
        const datosFiltrados = filas
          .filter(fila => fila[nombreMomento] <= momentoActual)
          .map(fila => ({
            momento: fila[nombreMomento],
            precio: Number(fila[nombreAccion])
          }));

        setDatos(datosFiltrados);
      } catch (err) {
        setDatos([]);
      }
    };
    cargarDatos();
    const intervalo = setInterval(cargarDatos, 5000);
    return () => clearInterval(intervalo);
  }, [accionSeleccionada, momentoActual]);

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