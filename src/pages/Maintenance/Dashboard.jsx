import { useEffect, useState, useMemo } from "react";
import axios from "axios";

import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  ChartBarIcon,
  PowerIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

const ITEMS_PER_PAGE = 10;

function Dashboard() {
  const [vehiculos, setVehiculos] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [paginaActual, setPaginaActual] = useState(1);

  /* ========================= */
  /* CARGAR VEHICULOS           */
  /* ========================= */
  useEffect(() => {
    axios
      .get("http://localhost:4000/mantenimiento/unidades")
      .then((res) => setVehiculos(res.data))
      .catch((err) => console.error("Error cargando vehículos:", err));
  }, []);

  /* ========================= */
  /* DETECTAR IMAGEN POR MODELO */
  /* ========================= */
  const getTruckImage = (v) => {
    const make = v.make?.toUpperCase() ?? "";
    const model = v.model?.toUpperCase() ?? "";

    if (model.includes("CASCADIA")) return "/image.png";

    if (
      make.includes("INTERNATIONAL") ||
      model.includes("INTERNATIONAL") ||
      model.includes("LT625") ||
      model.includes("LT")
    ) {
      return "/International.png";
    }

    return null;
  };

  /* ========================= */
  /* FILTRO + BÚSQUEDA          */
  /* ========================= */
  const vehiculosFiltrados = useMemo(() => {
    return vehiculos.filter((v) => {
      const texto = search.toLowerCase();
      const estado = v.engineState ?? "Desconocido";

      const coincideBusqueda =
        (v.name ?? "").toLowerCase().includes(texto) ||
        (v.licensePlate ?? "").toLowerCase().includes(texto) ||
        (v.make ?? "").toLowerCase().includes(texto) ||
        (v.model ?? "").toLowerCase().includes(texto) ||
        (v.location ?? "").toLowerCase().includes(texto);

      const coincideEstado =
        filtroEstado === "Todos" || estado === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [vehiculos, search, filtroEstado]);

  /* ========================= */
  /* PAGINACIÓN                 */
  /* ========================= */
  const totalPaginas = Math.ceil(vehiculosFiltrados.length / ITEMS_PER_PAGE);

  const vehiculosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_PER_PAGE;
    return vehiculosFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [vehiculosFiltrados, paginaActual]);

  useEffect(() => {
    setPaginaActual(1);
  }, [search, filtroEstado]);

  /* ========================= */
  /* ESTADO → CLASE CSS         */
  /* ========================= */
  const getStatusClass = (estado) => {
    switch (estado) {
      case "Encendido":   return "status-encendido";
      case "Apagado":     return "status-apagado";
      case "En movimiento": return "status-movimiento";
      default:            return "status-desconocido";
    }
  };

  /* ========================= */
  /* RENDER                     */
  /* ========================= */
  return (
    <div style={styles.page}>
      {/* TÍTULO */}
      <h1 style={styles.title}>🔧 Mantenimiento General</h1>

      {/* BUSCADOR */}
      <div style={styles.searchWrapper}>
        <MagnifyingGlassIcon style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar unidad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>


      {/* FILTROS */}
      <div style={styles.filterRow}>
        {["Todos", "En movimiento", "Encendido", "Apagado", "Desconocido"].map(
          (estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              style={{
                ...styles.filterBtn,
                ...(filtroEstado === estado ? styles.filterBtnActive : {}),
              }}
            >
              {estado}
            </button>
          )
        )}
      </div>

      {/* CARDS */}
      <div style={styles.grid}>
        {vehiculosPagina.map((v) => {
          const estado = v.engineState ?? "Desconocido";
          const imageSrc = getTruckImage(v);

          const badgeColor =
            estado === "En movimiento"
              ? "#16a34a"
              : estado === "Encendido"
              ? "#ca8a04"
              : estado === "Apagado"
              ? "#dc2626"
              : "#6b7280";

          return (
            <div key={v.id} style={styles.card}>
              {/* IMAGEN */}
              {imageSrc && (
                <div style={styles.cardImageWrapper}>
                  <img
                    src={imageSrc}
                    alt=""
                    style={styles.cardImage}
                    onError={(e) => {
                      e.currentTarget.parentElement.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* HEADER */}
              <div style={styles.cardHeader}>
                <div style={styles.vehicleName}>
                  <TruckIcon style={styles.iconSm} />
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e40af" }}>
                    {v.name}
                  </span>
                </div>
                <div
                  style={{
                    ...styles.badge,
                    backgroundColor: badgeColor,
                  }}
                >
                  <PowerIcon style={{ width: 12, height: 12 }} />
                  {estado}
                </div>
              </div>

              {/* MÉTRICAS */}
              <div style={styles.metricsGrid}>
                <div style={styles.metric}>
                  <ChartBarIcon style={styles.iconXs} />
                  <span>{Math.round(Number(v.odometroKm ?? 0)).toLocaleString()} km</span>
                </div>

                <div style={styles.metric}>
                  <ChartBarIcon style={styles.iconXs} />
                  <span>Vel: {Math.round(v.speed ?? 0)} km/h</span>
                </div>

                <div style={styles.metric}>
                  <span style={{ fontSize: 13 }}>⛽</span>
                  <span>
                    {v.fuelPercent != null && v.fuelPercent > 0
                      ? `${v.fuelPercent}%`
                      : "—"}
                  </span>
                </div>

                <div style={styles.metric}>
                  <span style={{ fontSize: 13 }}>🌡</span>
                  <span>
                    {v.engineCoolantTempC != null && v.engineCoolantTempC !== 0
                      ? `${v.engineCoolantTempC}°C`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* UBICACIÓN + TIEMPO */}
              <div style={styles.metricFull}>
                <MapPinIcon style={styles.iconXs} />
                <span style={{ color: "#9ca3af", fontSize: "11px" }}>{v.location}</span>
              </div>

              <div style={styles.metricFull}>
                <ClockIcon style={styles.iconXs} />
                <span style={{ color: "#9ca3af", fontSize: "11px" }}>{v.odometroTime}</span>
              </div>

              {/* PLACA */}
              <div style={styles.plate}>
                {v.licensePlate} • {v.make} {v.model}
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINACIÓN */}
      {totalPaginas > 1 && (
        <div style={styles.pagination}>
          <button
            disabled={paginaActual === 1}
            onClick={() => setPaginaActual((p) => p - 1)}
            style={{
              ...styles.pageBtn,
              opacity: paginaActual === 1 ? 0.4 : 1,
            }}
          >
            ◀ Anterior
          </button>
          <span style={{ color: "#9ca3af", fontSize: "13px" }}>
            Página {paginaActual} de {totalPaginas}
          </span>
          <button
            disabled={paginaActual === totalPaginas}
            onClick={() => setPaginaActual((p) => p + 1)}
            style={{
              ...styles.pageBtn,
              opacity: paginaActual === totalPaginas ? 0.4 : 1,
            }}
          >
            Siguiente ▶
          </button>
        </div>
      )}
    </div>
  );
}

/* ========================= */
/* ESTILOS INLINE             */
/* ========================= */
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "80px 24px 40px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1e293b",
  },
  title: {
    fontSize: "26px",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  searchWrapper: {
    position: "relative",
    width: "400px",
    maxWidth: "100%",
    margin: "0 auto 16px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "16px",
    height: "16px",
    color: "#94a3b8",
  },
  searchInput: {
    width: "100%",
    padding: "9px 12px 9px 36px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    color: "#1e293b",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "24px",
    justifyContent: "center",
  },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: "999px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    color: "#64748b",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.15s",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  filterBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
    color: "#fff",
    boxShadow: "0 2px 6px rgba(37,99,235,0.35)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
    transition: "transform 0.15s, box-shadow 0.15s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  cardImageWrapper: {
    backgroundColor: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
  },
  cardImage: {
    maxHeight: "130px",
    objectFit: "contain",
    width: "100%",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px 8px",
  },
  vehicleName: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 10px",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "11px",
    fontWeight: 600,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px",
    padding: "4px 14px 8px",
  },
  metric: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    color: "#475569",
  },
  metricFull: {
    display: "flex",
    alignItems: "flex-start",
    gap: "5px",
    padding: "2px 14px",
    fontSize: "12px",
    color: "#64748b",
  },
  plate: {
    padding: "8px 14px 12px",
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: 600,
    letterSpacing: "0.03em",
  },
  iconSm: {
    width: "16px",
    height: "16px",
    color: "#2563eb",
    flexShrink: 0,
  },
  iconXs: {
    width: "13px",
    height: "13px",
    color: "#2563eb",
    flexShrink: 0,
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    marginTop: "32px",
  },
  pageBtn: {
    padding: "7px 16px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    color: "#1e293b",
    fontSize: "12px",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
};

export default Dashboard;
