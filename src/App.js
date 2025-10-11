import React, { useState, useRef } from "react";
import CompraVentaAcciones from "./CompraVentaAcciones";
import Prestamos from "./Prestamos";
import MiPortafolio from "./MiPortafolio";
import Parametros from "./Parametros";
import BaseDeDatos from "./BaseDeDatos";
import Informacion from "./Informacion";
import Login from "./components/Login";
import PortafolioInicial from "./PortafolioInicial";
import PortafolioJugadores from "./PortafolioJugadores";
import Graficos from "./Graficos";
import ComprarAcciones from "./ComprarAcciones";

// NUEVOS COMPONENTES PARA REGISTRADOR
import RevisarPortafolioJugadores from "./RevisarPortafolioJugadores";
import RegistrarTransacciones from "./RegistrarTransacciones";
import TransaccionesRegistradas from "./TransaccionesRegistradas";

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
  const [usuarioActual, setUsuarioActual] = useState(null);
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

  // Solo muestra la app si hay usuario logueado, si no, muestra Login
  if (!usuarioActual) {
    return (
      <Login onLogin={setUsuarioActual} />
    );
  }

  // Define tabs después de que usuarioActual existe
  // Cambia el nombre de la pestaña y agrega la nueva pestaña "Comprar acciones" antes de "Préstamos"
  const jugadorTabs = [
    {
      label: "Vender mis acciones",
      content: <CompraVentaAcciones usuario={usuarioActual.usuario} nombre={usuarioActual.nombre} />
    },
    {
      label: "Comprar acciones",
      content: <ComprarAcciones usuario={usuarioActual.usuario} nombre={usuarioActual.nombre} />
    },
    { label: "Préstamos", content: <Prestamos /> },
    { label: "Mi portafolio", content: <MiPortafolio nombreJugador={usuarioActual.nombre} /> },
    { label: "Gráficos", content: <Graficos /> },
  ];

  const adminTabs = [
    { label: "Parámetros", content: <Parametros {...parametrosProps} /> },
    { label: "Base de datos", content: <BaseDeDatos intencionesVenta={intencionesVenta} comprasEnProceso={comprasEnProceso}/> },
    { label: "Información", content: <Informacion {...informacionProps} /> },
    { label: "Portafolio inicial", content: <PortafolioInicial /> },
    { label: "Portafolio de Jugadores", content: <PortafolioJugadores /> },
  ];

  // NUEVAS PESTAÑAS PARA REGISTRADOR
  const registradorTabs = [
    { label: "Revisar portafolio de jugadores", content: <RevisarPortafolioJugadores /> },
    { label: "Registrar transacciones", content: <RegistrarTransacciones /> },
    { label: "Transacciones registradas", content: <TransaccionesRegistradas /> },
  ];

  // LOGOUT FUNCTION
  function handleLogout() {
    localStorage.removeItem("token");
    setUsuarioActual(null);
    setActiveTab(0);
  }

  const esJugador = usuarioActual.rol === "jugador";
  const esAdmin = usuarioActual.rol === "admin";
  const esRegistrador = usuarioActual.rol === "registrador";

  let tabs = [];
  if (esJugador) tabs = jugadorTabs;
  else if (esAdmin) tabs = adminTabs;
  else if (esRegistrador) tabs = registradorTabs;

  return (
    <div style={{ maxWidth: 800, margin: "auto" }}>
      <h1>Plataforma virtual</h1>
      <p>
        Usuario activo: <b>{usuarioActual.nombre} ({usuarioActual.usuario})</b> &nbsp; | Rol: <b>{usuarioActual.rol}</b>
        &nbsp; 
        <button onClick={handleLogout} style={{ marginLeft: "1em", padding: "0.3em 0.6em", cursor: "pointer" }}>
          Cerrar sesión
        </button>
      </p>
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