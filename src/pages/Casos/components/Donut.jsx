export default function Donut({
  size = 160,
  segments,
  caption = false,
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;

  let acc = 0;
  const stops = segments.map((s) => {
    const start = (acc / total) * 100;
    acc += s.value;
    const end = (acc / total) * 100;
    return `${s.color} ${start}% ${end}%`;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${stops.join(",")})`,
        }}
      >
        <div
          className="absolute inset-0 m-auto rounded-full bg-surface"
          style={{
            width: size * 0.66,
            height: size * 0.66,
          }}
        />
      </div>

      {caption && (
        <div className="text-sm space-y-1">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ background: s.color }}
              />
              <span>{s.label}</span>
              <span className="text-gray-400">({s.value})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
