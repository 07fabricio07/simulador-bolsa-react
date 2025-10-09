import React, { useState, useEffect } from "react";
import axios from "axios";

// Calcula el ticket como Math.floor(segundosDesdeMedianoche / 3) + 1
function calcularTicket(horaCreacionStr) {
  let horaStr = horaCreacionStr.split(" ")[1] || horaCreacionStr; // por si viene con fecha
  let [hh, mm, ss] = horaStr.split(":").map(v => parseInt(v, 10));
  if (isNaN(hh)) hh = 0;
  if (isNaN(mm)) mm = 0;
  if (isNaN(ss)) ss = 0;
  const totalSegundos = hh * 3600 + mm * 60 + ss;
  return Math.floor(totalSegundos / 3) + 1;
}

// Hora de ejecución: 00:00:00 + ticket*3 segundos
function calcularHoraEjecucion(ticket) {
  const segundos = ticket * 3;
  const hh = Math.floor(segundos / 3600);
  const mm = Math.floor((segundos % 3600) / 60);
  const ss = segundos % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

export default function CompraVentaAcciones({
  acciones,
  momento,
  usuarioActual,
  agregarIntencionVenta,
  intencionesVenta,
  agregarCompraEnProceso
}) {
  const [accionSeleccionada, setAccionSeleccionada] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState("");

  // Modal de compra
  const [compraModal, setCompraModal] = useState(null);
  const [cantidadComprar, setCantidadComprar] = useState("");
  const [errorComprar, setErrorComprar] = useState("");

  // Estado para sincronizar intenciones de venta del backend
  const [intencionesVentaBackend, setIntencionesVentaBackend] = useState([]);

  // POLLING: Actualiza intencionesVenta desde backend cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      axios
        .get(`${process.env.REACT_APP_BACKEND_URL}/api/intenciones-venta`)
        .then(res => setIntencionesVentaBackend(res.data))
        .catch(() => setIntencionesVentaBackend([]));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setError(""); }, [accionSeleccionada, cantidad, precio]);

  const esCantidadValida = cantidad !== "" && Number(cantidad) > 0 && !isNaN(Number(cantidad));
  const esPrecioValido = precio !== "" && Number(precio) > 0 && !isNaN(Number(precio));
  const esAccionValida = accionSeleccionada !== "";

  // Publicar intención de venta: guarda en el backend
  const handlePublicar = async () => {
    if (!esAccionValida || !esCantidadValida || !esPrecioValido) {
      setError("Completa todos los campos con datos válidos.");
      return;
    }
    const ahora = new Date();
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/intenciones-venta`,
        {
          accion: accionSeleccionada,
          cantidadTotal: Number(cantidad),
          precio: Number(precio),
          ofertante: usuarioActual.nombre,
          horaCreacion: ahora.toLocaleTimeString(),
          horaActualizacion: ahora.toLocaleTimeString(),
          momento: momento,
        }
      );
      setAccionSeleccionada("");
      setCantidad("");
      setPrecio("");
      setError("");
      // Se actualiza la lista en el siguiente polling
    } catch (e) {
      setError("Error al publicar la intención de venta.");
    }
  };

  // Intenciones de venta del jugador actual agrupadas por ID
  const misIntencionesRaw = intencionesVentaBackend.filter(
    item => item.ofertante === usuarioActual.nombre
  );
  const agrupacionMis = {};
  misIntencionesRaw.forEach(item => {
    if (!agrupacionMis[item._id]) {
      agrupacionMis[item._id] = {
        accion: item.accion,
        precio: item.precio,
        cantidadTotal: item.cantidadTotal,
        id: item._id
      };
    } else {
      agrupacionMis[item._id].cantidadTotal += item.cantidadTotal;
    }
  });
  const misIntencionesAgrupadas = Object.values(agrupacionMis).filter(item => item.cantidadTotal !== 0);

  // Función para anular una intención agrupada (original, sigue igual)
  const handleAnular = (item) => {
    const ahora = new Date();
    agregarIntencionVenta({
      accion: item.accion,
      cantidad: -item.cantidad,
      precio: item.precio,
      ofertante: usuarioActual.nombre,
      horaCreacion: ahora.toLocaleString(),
      actualizacion: ahora.toLocaleString(),
      momento: momento,
      forzarId: item.id
    });
  };

  // Función para anular todas las intenciones disponibles (original, sigue igual)
  const handleAnularTodas = () => {
    const ahora = new Date();
    misIntencionesAgrupadas.forEach(item => {
      agregarIntencionVenta({
        accion: item.accion,
        cantidad: -item.cantidad,
        precio: item.precio,
        ofertante: usuarioActual.nombre,
        horaCreacion: ahora.toLocaleString(),
        actualizacion: ahora.toLocaleString(),
        momento: momento,
        forzarId: item.id
      });
    });
  };

  // Intenciones de venta disponibles para comprar (de otros jugadores)
  const idAgrupacion = {};
  intencionesVentaBackend.forEach((item) => {
    if (!idAgrupacion[item._id]) {
      idAgrupacion[item._id] = {
        accion: item.accion,
        precio: item.precio,
        cantidad: item.cantidadTotal,
        id: item._id,
        ofertante: item.ofertante
      };
    } else {
      idAgrupacion[item._id].cantidad += item.cantidadTotal;
    }
  });
  const intencionesPorId = Object.values(idAgrupacion).filter(item => item.cantidad !== 0);

  const intencionesOtros = intencionesPorId.filter(
    item => item.ofertante !== usuarioActual.nombre
  );

  // Agrupar por acción y precio
  const agrupacionAccionPrecio = {};
  intencionesOtros.forEach((item) => {
    const key = item.accion + "|" + item.precio;
    if (!agrupacionAccionPrecio[key]) {
      agrupacionAccionPrecio[key] = {
        accion: item.accion,
        precio: item.precio,
        cantidad: item.cantidad
      };
    } else {
      agrupacionAccionPrecio[key].cantidad += item.cantidad;
    }
  });

  // Ordenar por acción (A-Z), luego por precio (menor-mayor)
  const intencionesDisponiblesComprar = Object.values(agrupacionAccionPrecio)
    .sort((a, b) => {
      const accionCmp = a.accion.localeCompare(b.accion);
      if (accionCmp !== 0) {
        return accionCmp;
      } else {
        return a.precio - b.precio;
      }
    });

  // Abrir modal de compra
  const abrirCompraModal = (item) => {
    setCompraModal(item);
    setCantidadComprar("");
    setErrorComprar("");
  };

  const cerrarCompraModal = () => {
    setCompraModal(null);
    setCantidadComprar("");
    setErrorComprar("");
  };

  // Validación cantidad a comprar
  const esCantidadComprarValida = cantidadComprar !== "" && Number(cantidadComprar) > 0 &&
    Number(cantidadComprar) <= (compraModal ? compraModal.cantidad : 0) && !isNaN(Number(cantidadComprar));

  // Confirmar compra
  const handleConfirmarCompra = () => {
    if (!esCantidadComprarValida) {
      setErrorComprar("Ingresa una cantidad válida (positiva y no mayor a la disponible).");
      return;
    }
    const ahora = new Date();
    const horaCreacionStr = ahora.toLocaleTimeString("en-GB");
    const ticket = calcularTicket(horaCreacionStr);
    const horaEjecucionStr = calcularHoraEjecucion(ticket);
    agregarCompraEnProceso({
      accion: compraModal.accion,
      cantidad: Number(cantidadComprar),
      precio: compraModal.precio,
      comprador: usuarioActual.nombre,
      horaCreacion: horaCreacionStr,
      ticket: ticket,
      horaEjecucion: horaEjecucionStr,
      estado: "pendiente",
      momento: momento
    });
    cerrarCompraModal();
  };

  return (
    <div>
      <h2>Publicar intención de venta</h2>
      <div style={{ display: "flex", gap: "1em", marginBottom: "1em", alignItems: "center" }}>
        <select
          value={accionSeleccionada}
          onChange={e => setAccionSeleccionada(e.target.value)}
          style={{ padding: "0.5em", width: 140 }}
        >
          <option value="">Acción</option>
          {acciones.map((a, idx) => (
            <option key={idx} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          placeholder="Cantidad"
          value={cantidad}
          onChange={e => {
            const val = e.target.value;
            if (/^\d*$/.test(val)) setCantidad(val);
          }}
          style={{ padding: "0.5em", width: 100 }}
        />
        <input
          type="number"
          min={1}
          placeholder="Precio"
          value={precio}
          onChange={e => {
            const val = e.target.value;
            if (/^\d*$/.test(val)) setPrecio(val);
          }}
          style={{ padding: "0.5em", width: 100 }}
        />
        <button
          style={{ padding: "0.6em 1.2em" }}
          onClick={handlePublicar}
          disabled={!esAccionValida || !esCantidadValida || !esPrecioValido}
        >
          Publicar
        </button>
      </div>
      {error && <div style={{ color: "red", marginBottom: "1em" }}>{error}</div>}

      <h3>Mis intenciones de venta disponibles</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5em" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Acción</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Precio</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Cantidad</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Anular</th>
          </tr>
        </thead>
        <tbody>
          {misIntencionesAgrupadas.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "1em" }}>No tienes intenciones de venta disponibles.</td>
            </tr>
          ) : (
            misIntencionesAgrupadas.map((item) => (
              <tr key={item.id}>
                <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>{item.accion}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>{item.precio}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>{item.cantidadTotal}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                  <button
                    style={{ padding: "0.3em 1em" }}
                    onClick={() => handleAnular(item)}
                  >
                    Anular
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <button
        style={{
          marginTop: "0.5em",
          padding: "0.6em 1.2em",
          background: "#e74c3c",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: misIntencionesAgrupadas.length === 0 ? "not-allowed" : "pointer",
          opacity: misIntencionesAgrupadas.length === 0 ? 0.6 : 1
        }}
        disabled={misIntencionesAgrupadas.length === 0}
        onClick={handleAnularTodas}
      >
        Anular todas mis intenciones de venta
      </button>

      <h3 style={{ marginTop: "2em" }}>Intenciones de venta disponibles para comprar</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1em" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Acción</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Precio</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Cantidad</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>Comprar</th>
          </tr>
        </thead>
        <tbody>
          {intencionesDisponiblesComprar.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "1em" }}>
                No hay intenciones de venta disponibles para comprar.
              </td>
            </tr>
          ) : (
            intencionesDisponiblesComprar.map((item, idx) => (
              <tr key={item.accion + "|" + item.precio}>
                <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>{item.accion}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>{item.precio}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>{item.cantidad}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                  <button
                    style={{ padding: "0.3em 1em" }}
                    onClick={() => abrirCompraModal(item)}
                  >
                    Comprar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal de compra */}
      {compraModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={cerrarCompraModal}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "2em",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              minWidth: "320px",
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4>Detalles de la compra</h4>
            <div>Acción: <b>{compraModal.accion}</b></div>
            <div>Cantidad disponible: <b>{compraModal.cantidad}</b></div>
            <div>Precio: <b>{compraModal.precio}</b></div>
            <div style={{ marginTop: "1em" }}>
              <label>
                Cantidad a comprar:&nbsp;
                <input
                  type="number"
                  min={1}
                  max={compraModal.cantidad}
                  value={cantidadComprar}
                  onChange={e => setCantidadComprar(e.target.value)}
                  style={{ padding: "0.5em", width: 100 }}
                />
              </label>
            </div>
            {errorComprar && <div style={{ color: "red", marginTop: "0.5em" }}>{errorComprar}</div>}
            <div style={{ marginTop: "1.5em", display: "flex", gap: "1em", justifyContent: "flex-end" }}>
              <button
                style={{ padding: "0.5em 1.3em", background: "#007bff", color: "#fff", border: "none", borderRadius: "4px" }}
                onClick={handleConfirmarCompra}
                disabled={!esCantidadComprarValida}
              >
                Enviar compra
              </button>
              <button
                style={{ padding: "0.5em 1.3em", background: "#ccc", color: "#333", border: "none", borderRadius: "4px" }}
                onClick={cerrarCompraModal}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}