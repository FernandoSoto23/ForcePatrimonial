export default function MetricCard({ title, subtitle, value, color, status, max }) {
  const percent =
    typeof value === "number" && max
      ? Math.min((value / max) * 100, 100)
      : 100;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mb-4">{subtitle}</p>

      <p
        className="text-3xl font-extrabold tracking-tight"
        style={{ color }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>

      {!status && (
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${percent}%`,
              backgroundColor: color,
            }}
          />
        </div>
      )}
    </div>
  );
}
