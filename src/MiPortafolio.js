import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

// Función para normalizar nombre a "Jugador N"
function obtenerNombreJugadorNormalizado(nombreJugador) {
  const match = nombreJugador.match(/\d+/);
  if (match) {
    return `Jugador ${match[0]}`;
  }
  const nombres = [
    "uno", "dos", "tres", "cuatro", "cinco",
    "seis", "siete", "ocho", "nueve", "diez",
    "once", "doce", "trece"
  ];
  const nombreMin = nombreJugador.toLowerCase();
  for (let i = 0; i < nombres.length; i++) {
    if (nombreMin.includes(nombres[i])) {
      return `Jugador ${i + 1}`;
    }
  }
  return nombreJugador;
}

export default function MiPortafolio({ nombreJugador }) {
  const [encabezados, setEncabezados] = useState([]);
  const [filas, setFilas] = useState([]);
  const [regulador, setRegulador] = useState({ encabezados: [], filas: [] });
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const fetchPortafolio = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/portafolio-jugadores`);
        const data = await res.json();
        if (!mounted) return;
        setEncabezados(data.encabezados || []);
        setFilas(data.filas || []);
      } catch (err) {
        if (!mounted) return;
        setEncabezados([]);
        setFilas([]);
      }
    };
    const fetchRegulador = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/regulador-acciones`);
        const data = await res.json();
        if (!mounted) return;
        setRegulador(data || { encabezados: [], filas: [] });
      } catch (err) {
        if (!mounted) return;
        setRegulador({ encabezados: [], filas: [] });
      }
    };

    // Fetch inicial (fallback)
    Promise.all([fetchPortafolio(), fetchRegulador()]).finally(() => {
      if (!mounted) return;
      setLoading(false);
    });

    // Conectar socket.io
    try {
      const socket = io(BACKEND_URL, { transports: ["websocket"] });
      socketRef.current = socket;

      // Snapshots desde backend
      socket.on("portafolio_jugadores", (payload) => {
        if (!mounted) return;
        if (!payload) return;
        // payload puede venir como documento con encabezados y filas
        if (payload.encabezados) setEncabezados(payload.encabezados || []);
        if (payload.filas) setFilas(payload.filas || []);
      });

      socket.on("regulador_acciones", (payload) => {
        if (!mounted) return;
        if (!payload) return;
        setRegulador(payload || { encabezados: [], filas: [] });
      });

      // Incremental: aplicamos cambios puntuales al regulador si vienen
      socket.on("regulador:update", (payload) => {
        if (!mounted) return;
        // payload esperado: { jugador, accion, delta, nuevo }
        if (!payload || !payload.jugador || !payload.accion) return;
        setRegulador(prev => {
          const doc = prev && prev.filas ? { ...prev, filas: [...prev.filas] } : { encabezados: ["jugador"], filas: [] };
          const idx = doc.filas.findIndex(f => f.jugador === payload.jugador);
          if (idx === -1) {
            // crear fila nueva si no existe
            const nueva = { jugador: payload.jugador };
            // Inicializar con 0 para encabezados conocidos
            (doc.encabezados || ["jugador"]).forEach(h => {
              if (h !== "jugador") nueva[h] = 0;
            });
            nueva[payload.accion] = payload.nuevo ?? (payload.delta || 0);
            doc.filas.push(nueva);
          } else {
            doc.filas[idx] = { ...doc.filas[idx], [payload.accion]: payload.nuevo ?? ( (doc.filas[idx][payload.accion]||0) + (payload.delta||0) ) };
          }
          return doc;
        });
      });

      socket.on("connect", () => {
        // console.log("MiPortafolio socket connected", socket.id);
      });
      socket.on("disconnect", () => {
        // console.log("MiPortafolio socket disconnected");
      });

    } catch (e) {
      console.error("No se pudo conectar socket en MiPortafolio:", e);
    }

    return () => {
      mounted = false;
      try { if (socketRef.current) socketRef.current.disconnect(); } catch (_) {}
      socketRef.current = null;
    };
  }, []);

  // Normaliza el nombre del jugador
  const nombreJugadorNormalizado = obtenerNombreJugadorNormalizado(nombreJugador);

  // Filtra la fila que corresponde al jugador actual
  const filaJugador = filas.find(fila => fila.jugador === nombreJugadorNormalizado);
  const filaRegulador = (regulador.filas || []).find(
    fila => fila.jugador === nombreJugadorNormalizado
  );

  const tableStyle = {
    width: "520px",
    borderCollapse: "collapse",
    marginTop: "24px"
  };

  const thTdStyle = {
    border: "1px solid #ddd",
    padding: "8px",
    textAlign: "center"
  };

  const thStyle = {
    ...thTdStyle,
    background: "#f4f4f4",
    fontWeight: "bold"
  };

  // Excluir columnas no deseadas (ej. "jugador", "Préstamo")
  const columnasMostrar = (encabezados || []).filter(col => col !== "jugador" && col !== "Préstamo");

  return (
    <div>
      <h2>Mi Portafolio</h2>
      {loading ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          Cargando portafolio...
        </div>
      ) : !filaJugador ? (
        <div style={{ color: "#888", fontSize: "18px", margin: "16px 0" }}>
          No se encontró información para tu usuario.
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}> </th>
              <th style={thStyle}>Cantidad</th>
              <th style={thStyle}>Cantidad que estás ofertando</th>
              <th style={thStyle}>Cantidad disponible para ofertar</th>
            </tr>
          </thead>
          <tbody>
            {columnasMostrar.map((col, idx) => {
              const totalRaw = filaJugador[col];
              const total = typeof totalRaw === "number" ? totalRaw : Number(totalRaw || 0);

              const ofertandoRaw = filaRegulador && filaRegulador[col] !== undefined ? filaRegulador[col] : null;
              const ofertando = ofertandoRaw === null ? null : Number(ofertandoRaw || 0);

              const isAccion = typeof total === "number" && !["Efectivo"].includes(col);

              const disponible = isAccion && ofertando !== null ? Math.max(0, total - ofertando) : "";

              return (
                <tr key={idx}>
                  <td style={thTdStyle}>{col}</td>
                  <td style={thTdStyle}>{Number.isFinite(total) ? total : ""}</td>
                  <td style={thTdStyle}>{ofertando !== null ? ofertando : ""}</td>
                  <td style={thTdStyle}>{disponible !== "" ? disponible : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}