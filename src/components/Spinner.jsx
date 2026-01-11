export default function Spinner({ text = "Cargando información..." }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">{text}</p>
      </div>
    </div>
  );
}
