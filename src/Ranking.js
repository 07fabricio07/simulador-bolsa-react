import React, { useState, useCallback } from "react";

const BACKEND_URL = "https://simulador-bolsa-backend.onrender.com";

/**
 * Ranking component
 * - tabla 2 columnas (jugador / Utilidades) con 13 filas (encabezado + Jugador 1..12)
 * - botón "Obtener ranking actual" calcula una vez y muestra las utilidades
 * - utilidades = sum(cantidad_accion * precio_último) + Efectivo
 */
export default function Ranking() {
  const NUM_PLAYERS = 12;
  const [utilities, setUtilities] = useState(Array(NUM_PLAYERS).fill("")); // empty until computed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const obtenerRanking = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [resPort, resPrices] = await Promise.all([
        fetch(`${BACKEND_URL}/api/portafolio-jugadores`),
        fetch(`${BACKEND_URL}/api/precios-filtrados`)
      ]);

      if (!resPort.ok) throw new Error(`Error obteniendo PortafolioJugadores (status ${resPort.status})`);
      if (!resPrices.ok) throw new Error(`Error obteniendo PreciosFiltrados (status ${resPrices.status})`);

      const portData = await resPort.json();
      const pricesData = await resPrices.json();

      const portRows = portData?.filas || [];
      const priceEncabezados = pricesData?.encabezados || [];
      const priceFilas = Array.isArray(pricesData?.filas) ? pricesData.filas : [];

      const latestPriceRow = priceFilas.length > 0 ? priceFilas[priceFilas.length - 1] : null;

      const getPriceForAction = (action) => {
        if (!latestPriceRow) return 0;
        // if price row is object (header -> value)
        if (latestPriceRow && typeof latestPriceRow === "object" && !Array.isArray(latestPriceRow)) {
          const candidates = [action, action.toUpperCase(), action.toLowerCase()];
          for (const c of candidates) {
            if (Object.prototype.hasOwnProperty.call(latestPriceRow, c)) {
              const v = Number(latestPriceRow[c]);
              return Number.isFinite(v) ? v : 0;
            }
          }
          return 0;
        }
        // if price row is array and we have encabezados
        if (Array.isArray(latestPriceRow) && Array.isArray(priceEncabezados) && priceEncabezados.length > 0) {
          const idx = priceEncabezados.indexOf(action);
          if (idx >= 0 && latestPriceRow.length > idx) {
            const v = Number(latestPriceRow[idx]);
            return Number.isFinite(v) ? v : 0;
          }
        }
        return 0;
      };

      const DEFAULT_ACCIONES = ["INTC", "MSFT", "AAPL", "IPET", "IBM", "WMT", "MRK", "KO"];
      const players = Array.from({ length: NUM_PLAYERS }, (_, i) => `Jugador ${i + 1}`);

      const results = players.map(playerName => {
        const filaPort = portRows.find(r => {
          if (!r || !r.jugador) return false;
          return String(r.jugador).toLowerCase().replace(/\s+/g, " ").trim() === playerName.toLowerCase().trim();
        });

        const efectivo = filaPort ? Number(filaPort.Efectivo ?? filaPort.efectivo ?? 0) || 0 : 0;

        let accionKeys = [];
        if (filaPort) {
          accionKeys = Object.keys(filaPort).filter(k => {
            const lower = k.toLowerCase();
            return !["jugador", "efectivo", "préstamo", "prestamo"].includes(lower);
          });
          if (accionKeys.length === 0) {
            accionKeys = Array.isArray(priceEncabezados) && priceEncabezados.length > 0
              ? priceEncabezados.slice()
              : DEFAULT_ACCIONES.slice();
          }
        } else if (Array.isArray(priceEncabezados) && priceEncabezados.length > 0) {
          accionKeys = priceEncabezados.slice();
        } else {
          accionKeys = DEFAULT_ACCIONES.slice();
        }

        let sumAcciones = 0;
        accionKeys.forEach(acc => {
          if (!acc) return;
          const rawQty = filaPort ? (filaPort[acc] ?? filaPort[acc.toUpperCase()] ?? filaPort[acc.toLowerCase()]) : undefined;
          const qty = (rawQty === "" || rawQty == null) ? 0 : Number(rawQty) || 0;
          if (!qty) return;
          const price = getPriceForAction(acc);
          sumAcciones += qty * price;
        });

        return sumAcciones + efectivo;
      });

      setUtilities(results.map(v => (typeof v === "number" ? v.toFixed(2) : "")));
    } catch (err) {
      console.error("Error obteniendo ranking:", err);
      setError("Error al obtener ranking: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <h2>Ranking</h2>
      <div style={{ maxWidth: 480, marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 8, background: "#f4f4f4", textAlign: "left" }}>jugador</th>
              <th style={{ border: "1px solid #ddd", padding: 8, background: "#f4f4f4", textAlign: "right" }}>Utilidades</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: NUM_PLAYERS }, (_, i) => {
              const jugador = `Jugador ${i + 1}`;
              const utilidad = utilities[i];
              return (
                <tr key={jugador}>
                  <td style={{ border: "1px solid #ddd", padding: 8 }}>{jugador}</td>
                  <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "right" }}>{utilidad || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={obtenerRanking}
            disabled={loading}
            style={{
              padding: "8px 16px",
              background: loading ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Obteniendo..." : "Obtener ranking actual"}
          </button>
          {error && <div style={{ color: "#d32f2f" }}>{error}</div>}
        </div>
        <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
          Nota: las utilidades se calculan en el momento en que se presiona el botón y no se actualizan automáticamente.
        </div>
      </div>
    </div>
  );
}