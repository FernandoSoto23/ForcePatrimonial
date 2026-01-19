import { Link } from "react-router-dom";
export default function Shortcut({ icon, label, to }) {
  return (
    <Link
      to={to}
      className="group bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2 transition hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="text-3xl text-gray-500 group-hover:text-blue-600 transition">
        {icon}
      </div>

      <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition">
        {label}
      </p>
    </Link>
  );
}