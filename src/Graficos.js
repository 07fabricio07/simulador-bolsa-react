import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import socket from "./socket";

const API_PRECIOS = "https://simulador-bolsa-backend.onrender.com/api/precios-historicos";

export default function Graficos() {
  const [acciones, setAcciones] = useState([
    "INTC", "MSFT", "AAPL", "IPET", "IBM", "WMT", "MRK", "KO"
  ]);
  const [accionSeleccionada, setAccionSeleccionada] = useState("INTC");
  const [datos, setDatos] = useState([]);
  const [momentoActual, setMomentoActual] = useState(null);
  const [preciosHistoricos, setPreciosHistoricos] = useState({
    encabezados: [],
    filas: []
  });

  // 1. Carga datos históricos UNA SOLA VEZ
  useEffect(() => {
    fetch(API_PRECIOS)
      .then(res => res.json())
      .then(data => {
        setPreciosHistoricos(data);
        if (data.encabezados && data.encabezados.length > 1) {
          setAcciones(data.encabezados.slice(1));
          setAccionSeleccionada(data.encabezados[1]); // Default a la segunda columna
        }
      })
      .catch(err => {
        console.error("Error cargando precios históricos:", err);
        setPreciosHistoricos({ encabezados: [], filas: [] });
      });
  }, []);

  // 2. Escucha cambios de momentoActual por WebSocket
  useEffect(() => {
    function handleTablaMomentos(tabla) {
      if (tabla && tabla.filas && tabla.filas.length > 1) {
        setMomentoActual(tabla.filas[1].Momento);
      }
    }
    socket.on("tabla_momentos", handleTablaMomentos);
    return () => {
      socket.off("tabla_momentos", handleTablaMomentos);
    };
  }, []);

  // 3. Actualiza datos del gráfico cada vez que cambian acción, momento o precios
  useEffect(() => {
    const { encabezados, filas } = preciosHistoricos;
    if (!encabezados || !filas || !accionSeleccionada || momentoActual === null) {
      setDatos([]);
      return;
    }
    const nombreMomento = encabezados[0];
    const nombreAccion = accionSeleccionada;
    // Asegura que la comparación sea entre números
    const datosFiltrados = filas
      .filter(fila => Number(fila[nombreMomento]) <= Number(momentoActual))
      .map(fila => ({
        momento: Number(fila[nombreMomento]),
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