export default function ResumenCargaAlertas({
  totalAlertas,
  alertasFiltradas,
  alertasProcesadas,
  cargaTerminada,
}) {
  return (
    <div className="mb-3 p-3 rounded-md bg-gray-200 text-xs text-gray-800">
      <div>
        Total recibidas: <strong>{totalAlertas}</strong>
      </div>

      <div>
        Del usuario: <strong>{alertasFiltradas}</strong>
      </div>

      <div>
        Procesadas:{" "}
        <strong>
          {alertasProcesadas} / {alertasFiltradas}
        </strong>
      </div>

      {!cargaTerminada ? (
        <div className="mt-1 text-yellow-700 font-semibold">
          ⏳ Cargando alertas…
        </div>
      ) : (
        <div className="mt-1 text-green-700 font-semibold">
          ✅ Alertas listas
        </div>
      )}
    </div>
  );
}
