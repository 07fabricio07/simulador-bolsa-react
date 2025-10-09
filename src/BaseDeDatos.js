import React, { useEffect, useState } from "react";

const LIMPIEZA_STORAGE_KEY = "limpiezaCompras";
const HISTORIAL_STORAGE_KEY = "historialTransacciones";

function extraerHoraDeFechaStr(fechaStr) {
  const match = fechaStr.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}:${match[3]}`;
  }
  return "";
}

function horaStrASegundos(horaStr) {
  const [hh, mm, ss] = horaStr.split(":").map(x => parseInt(x, 10));
  return hh * 3600 + mm * 60 + ss;
}

function guardarEnLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function cargarDeLocalStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export default function BaseDeDatos({ intencionesVenta, comprasEnProceso = [], parametros = {} }) {
  const [tick, setTick] = useState(0);

  // NUEVO: Intenciones de venta agrupadas por ID desde backend
  const [intencionesVentaBackend, setIntencionesVentaBackend] = useState([]);
  useEffect(() => {
    const obtenerIntencionesVenta = () => {
      // axios importado local/global
      (window.axios || require("axios"))
        .get(`${process.env.REACT_APP_BACKEND_URL}/api/intenciones-venta`)
        .then(res => setIntencionesVentaBackend(res.data))
        .catch(() => setIntencionesVentaBackend([]));
    };
    obtenerIntencionesVenta();
    const interval = setInterval(obtenerIntencionesVenta, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      // Puedes agregar otras consultas a backend aquí si lo necesitas
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Agrupación por ID (sumando cantidades) usando datos del backend SOLO para la tabla que te piden
  const agrupadasPorId = {};
  intencionesVentaBackend.forEach((item) => {
    const id = item._id || item.id;
    if (!agrupadasPorId[id]) {
      agrupadasPorId[id] = {
        ...item,
        cantidadTotal: item.cantidadTotal || item.cantidad || 0
      };
    } else {
      agrupadasPorId[id].cantidadTotal += item.cantidadTotal || item.cantidad || 0;
    }
  });
  const intencionesAgrupadas = Object.values(agrupadasPorId);

  // El resto de tu lógica original
  const [limpiezaCompras, setLimpiezaCompras] = useState(cargarDeLocalStorage(LIMPIEZA_STORAGE_KEY));
  const [historialTransacciones, setHistorialTransacciones] = useState(cargarDeLocalStorage(HISTORIAL_STORAGE_KEY));

  useEffect(() => {
    guardarEnLocalStorage(LIMPIEZA_STORAGE_KEY, limpiezaCompras);
  }, [limpiezaCompras]);
  useEffect(() => {
    guardarEnLocalStorage(HISTORIAL_STORAGE_KEY, historialTransacciones);
  }, [historialTransacciones]);

  comprasEnProceso.forEach((c, idx) => {
    if (!c._id) c._id = `${c.comprador}_${c.horaCreacion}_${c.precio}_${c.cantidad}_${idx}`;
    c.prioridad = idx + 1;
    if (c.momento === undefined || c.momento === null || c.momento === "") {
      c.momento = parametros.momento ?? "";
    }
  });

  // El resto de tu lógica de simulador, limpieza, historial, etc. NO CAMBIA

  const handleLimpiarTabla = () => {
    setLimpiezaCompras([]);
    guardarEnLocalStorage(LIMPIEZA_STORAGE_KEY, []);
  };

  const handleLimpiarHistorial = () => {
    setHistorialTransacciones([]);
    guardarEnLocalStorage(HISTORIAL_STORAGE_KEY, []);
  };

  const thStyle = { border: "1px solid #ccc", padding: "0.5em", textAlign: "left" };
  const tdStyle = { border: "1px solid #ccc", padding: "0.5em", textAlign: "left" };

  return (
    <div>
      <h2 style={{ marginBottom: "0.5em" }}>Intenciones de venta de todos los jugadores (agrupadas por ID)</h2>
      {/* SOLO esta tabla se conecta al backend */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2em" }}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Acción</th>
            <th style={thStyle}>Precio</th>
            <th style={thStyle}>Cantidad total</th>
            <th style={thStyle}>Ofertante</th>
            <th style={thStyle}>Hora de creación</th>
            <th style={thStyle}>Hora de actualización</th>
            <th style={thStyle}>Momento</th>
          </tr>
        </thead>
        <tbody>
          {intencionesAgrupadas.length === 0 ? (
            <tr>
              <td colSpan={8} style={tdStyle}>No hay intenciones de venta registradas.</td>
            </tr>
          ) : (
            intencionesAgrupadas.map(item => (
              <tr key={item._id || item.id}>
                <td style={tdStyle}>{item._id || item.id}</td>
                <td style={tdStyle}>{item.accion}</td>
                <td style={tdStyle}>{item.precio}</td>
                <td style={tdStyle}>{item.cantidadTotal}</td>
                <td style={tdStyle}>{item.ofertante}</td>
                <td style={tdStyle}>{item.horaCreacion}</td>
                <td style={tdStyle}>{item.horaActualizacion || item.actualizacion}</td>
                <td style={tdStyle}>{item.momento}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* El resto de las tablas y lógica original NO CAMBIA */}
      {/* Ejemplo: tabla de compras en proceso */}
      <h2 style={{ marginBottom: "0.5em" }}>En proceso de compra</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2em" }}>
        <thead>
          <tr>
            <th style={thStyle}>Prioridad</th>
            <th style={thStyle}>Acción</th>
            <th style={thStyle}>Cantidad</th>
            <th style={thStyle}>Precio</th>
            <th style={thStyle}>Comprador</th>
            <th style={thStyle}>Hora de creación</th>
            <th style={thStyle}>Ticket</th>
            <th style={thStyle}>Hora de ejecución</th>
            <th style={thStyle}>Momento</th>
          </tr>
        </thead>
        <tbody>
          {comprasEnProceso.length === 0 ? (
            <tr>
              <td colSpan={9} style={tdStyle}>No hay compras en proceso.</td>
            </tr>
          ) : (
            comprasEnProceso.map(item => (
              <tr key={item._id}>
                <td style={tdStyle}>{item.prioridad}</td>
                <td style={tdStyle}>{item.accion}</td>
                <td style={tdStyle}>{item.cantidad}</td>
                <td style={tdStyle}>{item.precio}</td>
                <td style={tdStyle}>{item.comprador}</td>
                <td style={tdStyle}>{item.horaCreacion}</td>
                <td style={tdStyle}>{item.ticket}</td>
                <td style={tdStyle}>{item.horaEjecucion}</td>
                <td style={tdStyle}>{item.momento}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Tabla de limpieza */}
      <h2 style={{ marginBottom: "0.5em" }}>Limpieza del proceso de compra</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1em" }}>
        <thead>
          <tr>
            <th style={thStyle}>Prioridad</th>
            <th style={thStyle}>Acción</th>
            <th style={thStyle}>Cantidad</th>
            <th style={thStyle}>Precio</th>
            <th style={thStyle}>Comprador</th>
            <th style={thStyle}>Hora de creación</th>
            <th style={thStyle}>Momento</th>
            <th style={thStyle}>Ticket</th>
          </tr>
        </thead>
        <tbody>
          {limpiezaCompras.length === 0 ? (
            <tr>
              <td colSpan={8} style={tdStyle}>No hay registros de limpieza.</td>
            </tr>
          ) : (
            limpiezaCompras.map(item => (
              <tr key={item._id}>
                <td style={tdStyle}>{item.prioridad}</td>
                <td style={tdStyle}>{item.accion}</td>
                <td style={tdStyle}>{item.cantidad}</td>
                <td style={tdStyle}>{item.precio}</td>
                <td style={tdStyle}>{item.comprador}</td>
                <td style={tdStyle}>{item.horaCreacion}</td>
                <td style={tdStyle}>{item.momento}</td>
                <td style={tdStyle}>{item.ticket}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <button
        style={{
          padding: "0.7em 1.4em",
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: limpiezaCompras.length === 0 ? "not-allowed" : "pointer",
          opacity: limpiezaCompras.length === 0 ? 0.6 : 1,
          marginBottom: "2em"
        }}
        onClick={handleLimpiarTabla}
        disabled={limpiezaCompras.length === 0}
      >
        Limpiar tabla
      </button>

      {/* Tabla de historial de transacciones */}
      <h2 style={{ marginBottom: "0.5em" }}>Historial de transacciones</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1em" }}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Prioridad</th>
            <th style={thStyle}>Acción</th>
            <th style={thStyle}>Cantidad</th>
            <th style={thStyle}>Precio</th>
            <th style={thStyle}>Ticket</th>
            <th style={thStyle}>Momento</th>
            <th style={thStyle}>Comprador</th>
            <th style={thStyle}>Ofertante</th>
            <th style={thStyle}>Hora</th>
            <th style={thStyle}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {historialTransacciones.length === 0 ? (
            <tr>
              <td colSpan={11} style={tdStyle}>No hay historial de transacciones.</td>
            </tr>
          ) : (
            historialTransacciones.map(item => (
              <tr key={item._id}>
                <td style={tdStyle}>{item.id || ""}</td>
                <td style={tdStyle}>{item.prioridad}</td>
                <td style={tdStyle}>{item.accion}</td>
                <td style={tdStyle}>{item.cantidad}</td>
                <td style={tdStyle}>{item.precio}</td>
                <td style={tdStyle}>{item.ticket}</td>
                <td style={tdStyle}>{item.momento}</td>
                <td style={tdStyle}>{item.comprador}</td>
                <td style={tdStyle}>{item.ofertante}</td>
                <td style={tdStyle}>{item.hora}</td>
                <td style={tdStyle}>{item.estado}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <button
        style={{
          padding: "0.7em 1.4em",
          background: "#e67e22",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: historialTransacciones.length === 0 ? "not-allowed" : "pointer",
          opacity: historialTransacciones.length === 0 ? 0.6 : 1,
          marginBottom: "2em"
        }}
        onClick={handleLimpiarHistorial}
        disabled={historialTransacciones.length === 0}
      >
        Limpiar historial
      </button>
    </div>
  );
}