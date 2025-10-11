import React, { useEffect, useState } from "react";
import socket from "./socket";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

// Paleta de colores para las 8 acciones
const colors = [
  "#007bff", // Intel
  "#d32f2f", // Microsoft
  "#FFD600", // Apple
  "#388E3C", // IBM
  "#FF9800", // Walmart
  "#0097A7", // Merck
  "#1976D2", // Coca Cola
  "#8e24aa"  // Acción 8 (si tienes otra, ejemplo: IPET)
];

// Puedes mapear los nombres cortos a bonitos si lo deseas
const nombresBonitos = {
  "INTC": "Intel",
  "MSFT": "Microsoft",
  "AAPL": "Apple",
  "IBM": "IBM",
  "WMT": "Walmart",
  "MRK": "Merck",
  "KO": "Coca Cola",
  "IPET": "IPET"
};

export default function Graficos() {
  const [encabezados, setEncabezados] = useState([]);
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    function handlePreciosFiltrados(data) {
      if (!data || !data.encabezados || !data.filas) return;
      setEncabezados(data.encabezados);
      setFilas(data.filas);
    }
    socket.on("precios_filtrados", handlePreciosFiltrados);
    return () => socket.off("precios_filtrados", handlePreciosFiltrados);
  }, []);

  if (!encabezados.length || !filas.length) {
    return <div>Cargando datos...</div>;
  }

  // El eje X será la primera columna
  const columnaX = encabezados[0];
  // El resto de columnas son las acciones a graficar
  const acciones = encabezados.slice(1);

  // Prepara los datos: convierte los valores a número si es posible, sino los omite
  const datosGraficar = filas.map(fila => {
    const punto = {[columnaX]: Number(fila[columnaX])};
    acciones.forEach(acc => {
      const val = fila[acc];
      punto[acc] = val === "" || isNaN(Number(val)) ? null : Number(val);
    });
    return punto;
  });

  return (
    <div>
      <h2>Gráfico de precios de todas las acciones</h2>
      <div style={{ width: "100%", height: 500 }}>
        <ResponsiveContainer>
          <LineChart data={datosGraficar}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={columnaX} />
            <YAxis />
            <Tooltip />
            <Legend />
            {acciones.map((accion, idx) => (
              <Line
                key={accion}
                type="monotone"
                dataKey={accion}
                stroke={colors[idx % colors.length]}
                dot={false}
                name={nombresBonitos[accion] || accion}
                isAnimationActive={false}
                connectNulls={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}