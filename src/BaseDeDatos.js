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
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      // Si tienes endpoint, descomenta y ajusta aquí la consulta al backend
      // const token = localStorage.getItem("token");
      // axios.get("http://localhost:10000/api/intenciones-venta", { headers: { Authorization: "Bearer " + token } })
      //   .then(res => actualizarIntencionesVenta(res.data));
      // axios.get("http://localhost:10000/api/compras-en-proceso", { headers: { Authorization: "Bearer " + token } })
      //   .then(res => actualizarComprasEnProceso(res.data));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Agrupación por ID (sumando cantidades)
  const agrupadasPorId = {};
  intencionesVenta.forEach((item) => {
    if (!agrupadasPorId[item.id]) {
      agrupadasPorId[item.id] = { ...item };
    } else {
      agrupadasPorId[item.id].cantidad += item.cantidad;
    }
  });
  const intencionesAgrupadas = Object.values(agrupadasPorId);

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

  // --- TRASLADO A LIMPIEZA (cada segundo, como antes) ---
  useEffect(() => {
    const ahora = new Date();
    const horaActualStr = ahora.toLocaleTimeString("en-GB");
    const horaActualSoloHora = extraerHoraDeFechaStr(horaActualStr);
    const horaActualSegundos = horaStrASegundos(horaActualSoloHora);

    // Buscar compras en proceso que deben trasladarse y NO estén ya en limpieza
    const nuevosTraslados = comprasEnProceso.filter(compra => {
      const compraHoraEjecucionSoloHora = extraerHoraDeFechaStr(compra.horaEjecucion);
      const compraHoraEjecucionSegundos = horaStrASegundos(compraHoraEjecucionSoloHora);
      const yaEsta = limpiezaCompras.some(l => l._id === compra._id);
      return (
        compraHoraEjecucionSoloHora &&
        horaActualSegundos >= compraHoraEjecucionSegundos &&
        !yaEsta
      );
    });

    if (nuevosTraslados.length > 0) {
      const nuevosLimpieza = [
        ...limpiezaCompras,
        ...nuevosTraslados
          .filter(nueva => !limpiezaCompras.some(l => l._id === nueva._id))
          .map(compra => ({
            _id: compra._id,
            prioridad: compra.prioridad,
            accion: compra.accion,
            cantidad: compra.cantidad,
            precio: compra.precio,
            comprador: compra.comprador,
            horaCreacion: compra.horaEjecucion,
            momento: compra.momento,
            ticket: compra.ticket
          }))
      ];
      const limpiezaSinDuplicados = nuevosLimpieza.filter(
        (item, idx, arr) => arr.findIndex(e => e._id === item._id) === idx
      );
      setLimpiezaCompras(limpiezaSinDuplicados);
      guardarEnLocalStorage(LIMPIEZA_STORAGE_KEY, limpiezaSinDuplicados);
    }
    // eslint-disable-next-line
  }, [tick, comprasEnProceso, limpiezaCompras]);

  // --- PROCESO DE HISTORIAL (cada 3 segundos, solo historial) ---
  useEffect(() => {
    if (tick % 3 !== 0) return;

    // 1. Agrupación_oferta_1: Oferta agrupada por Accion y Precio (sumar cantidadTotal)
    const ofertaAgrupada = {};
    intencionesAgrupadas.forEach(oferta => {
      const key = `${oferta.accion}-${oferta.precio}`;
      ofertaAgrupada[key] = (ofertaAgrupada[key] || 0) + (oferta.cantidad > 0 ? oferta.cantidad : 0);
    });

    // 2. Filtrado y matching inicial de demanda
    const prioridadesHistorial = new Set(historialTransacciones.map(f => f.prioridad));
    const demandaFiltrada = []; // filas de limpieza no procesadas (no en historial)
    const nuevasDesaprobadas = []; // para agregar al historial de inmediato

    limpiezaCompras.forEach(fila => {
      if (!prioridadesHistorial.has(fila.prioridad)) {
        const key = `${fila.accion}-${fila.precio}`;
        if (ofertaAgrupada[key] > 0) {
          // Se marca como Aprobada (pero no se copia aún al historial)
          demandaFiltrada.push({ ...fila, estado: "Aprobada" });
        } else {
          // Si no hay oferta, se copia de inmediato como Desaprobada
          nuevasDesaprobadas.push({
            _id: fila._id,
            id: "", // ID vacío si viene de limpieza
            prioridad: fila.prioridad,
            accion: fila.accion,
            cantidad: fila.cantidad,
            precio: fila.precio,
            ticket: fila.ticket,
            momento: fila.momento,
            comprador: fila.comprador,
            ofertante: "",
            hora: fila.horaCreacion,
            estado: "Desaprobada"
          });
        }
      }
    });

    // Si no hay ninguna demanda aprobada ni desaprobada, terminar ciclo
    if (demandaFiltrada.length === 0 && nuevasDesaprobadas.length === 0) {
      return;
    }

    // 3. Agrupación de demanda aprobada por Accion y Precio, sumar cantidad
    const demandaAprobadaAgrupada = {};
    demandaFiltrada.forEach(fila => {
      const key = `${fila.accion}-${fila.precio}`;
      demandaAprobadaAgrupada[key] = (demandaAprobadaAgrupada[key] || 0) + fila.cantidad;
    });

    // 4. Matching y consideraciones (tabla "Apoyo")
    const tablaApoyo = [];
    Object.entries(demandaAprobadaAgrupada).forEach(([key, demandaCantidad]) => {
      const ofertaCantidad = ofertaAgrupada[key] || 0;
      const [accion, precio] = key.split("-");
      if (demandaCantidad < ofertaCantidad) {
        tablaApoyo.push({
          consideracion: "Demanda completa",
          accion,
          precio,
          suma: demandaCantidad
        });
      } else if (demandaCantidad > ofertaCantidad) {
        tablaApoyo.push({
          consideracion: "Oferta completa",
          accion,
          precio,
          suma: ofertaCantidad
        });
      } else {
        tablaApoyo.push({
          consideracion: "Completo",
          accion,
          precio,
          suma: 0
        });
      }
    });

    // 5. Procesamiento final y copiado al historial
    const nuevasAprobadas = [];
    tablaApoyo.forEach(apoyo => {
      // Buscar filas de demanda y oferta que coincidan con apoyo (por accion y precio)
      const key = `${apoyo.accion}-${apoyo.precio}`;
      // Filas de demanda aprobada (filtradas) que coinciden
      const demandaCoincidente = demandaFiltrada.filter(df => `${df.accion}-${df.precio}` === key);
      // Oferta agrupada, buscar en intencionesAgrupadas la fila que coincide
      const ofertaCoincidente = intencionesAgrupadas.filter(of => `${of.accion}-${of.precio}` === key && of.cantidad > 0);

      if (apoyo.consideracion === "Oferta completa") {
        // Copiar oferta al historial (menos hora de creación)
        ofertaCoincidente.forEach(oferta => {
          nuevasAprobadas.push({
            _id: oferta.id,
            id: oferta.id, // Solo si viene de intenciones de venta
            prioridad: "", // No hay prioridad en oferta
            accion: oferta.accion,
            cantidad: oferta.cantidad,
            precio: oferta.precio,
            ticket: "", // No hay ticket en oferta
            momento: oferta.momento,
            comprador: "", // No hay comprador en oferta
            ofertante: oferta.ofertante,
            hora: oferta.actualizacion,
            estado: "Aprobada"
          });
        });
        // Llamado a función pendiente: transaccionJustaDemanda(apoyo)
      } else if (apoyo.consideracion === "Demanda completa") {
        // Copiar demanda al historial (menos hora de creación, hora de actualización, momento)
        demandaCoincidente.forEach(demanda => {
          nuevasAprobadas.push({
            _id: demanda._id,
            id: "", // ID vacío si viene de limpieza
            prioridad: demanda.prioridad,
            accion: demanda.accion,
            cantidad: demanda.cantidad,
            precio: demanda.precio,
            ticket: demanda.ticket,
            momento: demanda.momento,
            comprador: demanda.comprador,
            ofertante: "", // No ofertante en demanda
            hora: demanda.horaEjecucion || demanda.horaCreacion,
            estado: "Aprobada"
          });
        });
        // Llamado a función pendiente: transaccionJustaOferta(apoyo)
      } else if (apoyo.consideracion === "Completo") {
        // Copiar demanda y oferta al historial
        demandaCoincidente.forEach(demanda => {
          nuevasAprobadas.push({
            _id: demanda._id,
            id: "", // ID vacío si viene de limpieza
            prioridad: demanda.prioridad,
            accion: demanda.accion,
            cantidad: demanda.cantidad,
            precio: demanda.precio,
            ticket: demanda.ticket,
            momento: demanda.momento,
            comprador: demanda.comprador,
            ofertante: "", // No ofertante en demanda
            hora: demanda.horaEjecucion || demanda.horaCreacion,
            estado: "Aprobada"
          });
        });
        ofertaCoincidente.forEach(oferta => {
          nuevasAprobadas.push({
            _id: oferta.id,
            id: oferta.id, // Solo si viene de intenciones de venta
            prioridad: "", // No hay prioridad en oferta
            accion: oferta.accion,
            cantidad: oferta.cantidad,
            precio: oferta.precio,
            ticket: "", // No hay ticket en oferta
            momento: oferta.momento,
            comprador: "", // No hay comprador en oferta
            ofertante: oferta.ofertante,
            hora: oferta.actualizacion,
            estado: "Aprobada"
          });
        });
      }
    });

    // 6. Actualizar historial: agregar desaprobadas y luego aprobadas
    const historialActualizado = [
      ...historialTransacciones,
      ...nuevasDesaprobadas,
      ...nuevasAprobadas
    ];
    setHistorialTransacciones(historialActualizado);
    guardarEnLocalStorage(HISTORIAL_STORAGE_KEY, historialActualizado);

    // 7. Limpiar tabla "Apoyo" (implementada como variable temporal)

    // eslint-disable-next-line
  }, [tick, limpiezaCompras, intencionesAgrupadas, historialTransacciones]);

  const handleLimpiarTabla = () => {
    setLimpiezaCompras([]);
    guardarEnLocalStorage(LIMPIEZA_STORAGE_KEY, []);
  };

  const handleLimpiarHistorial = () => {
    setHistorialTransacciones([]);
    guardarEnLocalStorage(HISTORIAL_STORAGE_KEY, []);
  };

  // --- Renderizado con formato clásico ---
  const thStyle = { border: "1px solid #ccc", padding: "0.5em", textAlign: "left" };
  const tdStyle = { border: "1px solid #ccc", padding: "0.5em", textAlign: "left" };

  return (
    <div>
      <h2 style={{ marginBottom: "0.5em" }}>Intenciones de venta de todos los jugadores (agrupadas por ID)</h2>
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
              <tr key={item.id}>
                <td style={tdStyle}>{item.id}</td>
                <td style={tdStyle}>{item.accion}</td>
                <td style={tdStyle}>{item.precio}</td>
                <td style={tdStyle}>{item.cantidad}</td>
                <td style={tdStyle}>{item.ofertante}</td>
                <td style={tdStyle}>{item.horaCreacion}</td>
                <td style={tdStyle}>{item.actualizacion}</td>
                <td style={tdStyle}>{item.momento}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

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