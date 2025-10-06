import React, { useState, useRef } from "react";
import CompraVentaAcciones from "./CompraVentaAcciones";
import Prestamos from "./Prestamos";
import MiPortafolio from "./MiPortafolio";
import Parametros from "./Parametros";
import BaseDeDatos from "./BaseDeDatos";
import Informacion from "./Informacion";

const usuarios = [
  { id: 1, usuario: "jugador1", nombre: "Jugador Uno", rol: "jugador" },
  { id: 2, usuario: "jugador2", nombre: "Jugador Dos", rol: "jugador" },
  { id: 3, usuario: "jugador3", nombre: "Jugador Tres", rol: "jugador" },
  { id: 4, usuario: "jugador4", nombre: "Jugador Cuatro", rol: "jugador" },
  { id: 5, usuario: "admin", nombre: "Administrador", rol: "admin" },
];

function Tab({ label, active, onClick }) {
  return (
    <button
      style={{
        padding: "1em",
        border: "none",
        borderBottom: active ? "2px solid #007bff" : "2px solid #ccc",
        background: "none",
        fontWeight: active ? "bold" : "normal",
        cursor: "pointer"
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function App() {
  const [usuarioActual, setUsuarioActual] = useState(usuarios[0]);
  const [activeTab, setActiveTab] = useState(0);

  // Estados globales para parámetros
  const [momento, setMomento] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [estado, setEstado] = useState("en pausa");
  const intervalRef = useRef(null);

  // Estados para acciones y nombres de acciones
  const [cantidadAcciones, setCantidadAcciones] = useState(4);
  const [nombresAcciones, setNombresAcciones] = useState(Array(4).fill(""));
  // Estados para intenciones de venta
  const [intencionesVenta, setIntencionesVenta] = useState([]);
  const idVentaRef = useRef(111111);

  // Estado para compras en proceso
  const [comprasEnProceso, setComprasEnProceso] = useState([]);

  // Funciones para simulación
  const iniciarSimulacion = () => {
    if (intervalRef.current) return;
    setEstado("jugando");
    intervalRef.current = setInterval(() => {
      setMomento(prev => prev + 1);
    }, duracion * 1000);
  };
  const pararSimulacion = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setEstado("en pausa");
  };
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Props para parámetros
  const parametrosProps = {
    momento, duracion, estado,
    setMomento, setDuracion, setEstado,
    iniciarSimulacion, pararSimulacion
  };

  // Props para Informacion
  const informacionProps = {
    cantidadAcciones,
    setCantidadAcciones,
    nombresAcciones,
    setNombresAcciones
  };

  // Función para agregar intención de venta
  const agregarIntencionVenta = (data) => {
    const nuevoId = typeof data.forzarId !== "undefined" ? data.forzarId : idVentaRef.current;
    setIntencionesVenta(prev => [
      ...prev,
      {
        id: nuevoId,
        ...data,
      }
    ]);
    if (!data.forzarId) idVentaRef.current += 1;
  };

  // Función para agregar compra en proceso
  const agregarCompraEnProceso = (data) => {
    setComprasEnProceso(prev => [...prev, data]);
  };

  // Tabs para jugador
  const jugadorTabs = [
    {
      label: "Compra y venta de acciones",
      content: <CompraVentaAcciones
        acciones={nombresAcciones.filter(n => n)}
        momento={momento}
        usuarioActual={usuarioActual}
        agregarIntencionVenta={agregarIntencionVenta}
        intencionesVenta={intencionesVenta}
        agregarCompraEnProceso={agregarCompraEnProceso}
      />
    },
    { label: "Préstamos", content: <Prestamos /> },
    { label: "Mi portafolio", content: <MiPortafolio /> },
  ];

  // Tabs para admin
  const adminTabs = [
    { label: "Parámetros", content: <Parametros {...parametrosProps} /> },
    { label: "Base de datos", content: <BaseDeDatos intencionesVenta={intencionesVenta} comprasEnProceso={comprasEnProceso}/> },
    { label: "Información", content: <Informacion {...informacionProps} /> }
  ];

  const esJugador = usuarioActual.rol === "jugador";
  const tabs = esJugador ? jugadorTabs : adminTabs;

  return (
    <div style={{ maxWidth: 800, margin: "auto" }}>
      <h1>Plataforma virtual</h1>
      <label>
        Usuario activo:&nbsp;
        <select
          value={usuarioActual.usuario}
          onChange={e => {
            const usuario = usuarios.find(u => u.usuario === e.target.value);
            setUsuarioActual(usuario);
            setActiveTab(0);
          }}
        >
          {usuarios.map(u => (
            <option key={u.usuario} value={u.usuario}>
              {u.nombre} ({u.rol})
            </option>
          ))}
        </select>
      </label>
      <hr />
      <div style={{ display: "flex", borderBottom: "2px solid #ccc", marginBottom: "1em" }}>
        {tabs.map((tab, idx) => (
          <Tab
            key={tab.label}
            label={tab.label}
            active={activeTab === idx}
            onClick={() => setActiveTab(idx)}
          />
        ))}
      </div>
      <div style={{ padding: "2em", background: "#f8f8f8", borderRadius: "6px" }}>
        {tabs[activeTab].content}
      </div>
    </div>
  );
}

export default App;