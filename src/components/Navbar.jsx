import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { FiUser, FiLogOut, FiChevronDown } from "react-icons/fi";
import { IoNotifications } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenu, setOpenMenu] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  /* ===============================
     MENÚS
  =============================== */
  const categories = {
    Monitoreo: [
      { href: "/", label: "Dashboard" },
      { href: "/globaltrack", label: "GlobalTrack" },
      { href: "/dispositivos", label: "Dispositivos" },
      { href: "/casos", label: "Casos" },
      { href: "/monitoreopro", label: "MonitoreoPro" },
      /* { href: "/casosv2", label: "Casosv2" }, */
    ],
  };

  /* ===============================
     CLICK FUERA
  =============================== */
  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /* ===============================
     NAVEGACIÓN
  =============================== */
  const handleNav = (path) => {
    if (location.pathname === path) return;
    setOpenMenu(null);
    setUserMenuOpen(false);
    navigate(path);
  };

  /* ===============================
     LOGOUT
  =============================== */
  const handleLogout = () => {
    setLoggingOut(true);

    localStorage.removeItem("auth_token");
    localStorage.removeItem("wialon_units");
    localStorage.removeItem("wialon_units_count");

    setTimeout(() => {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }, 300);
  };

  return (
    <>
      {/* LOADER LOGOUT */}
      <AnimatePresence>
        {loggingOut && (
          <motion.div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-white text-sm">Cerrando sesión…</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-[999] flex items-center justify-between px-6 py-3 bg-black/85 backdrop-blur-xl border-b border-white/10">
        {/* IZQUIERDA */}
        <div className="flex items-center gap-8" ref={dropdownRef}>
          <button onClick={() => handleNav("/")}>
            <img src="/logo.png" alt="Logo" className="w-10" />
          </button>

          {Object.entries(categories).map(([category, links]) => (
            <div key={category} className="relative">
              <button
                onClick={() =>
                  setOpenMenu(openMenu === category ? null : category)
                }
                className="flex items-center gap-1 text-sm text-gray-200 hover:text-green-400 transition"
              >
                {category}
                <FiChevronDown
                  className={`transition ${
                    openMenu === category ? "rotate-180 text-green-400" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {openMenu === category && (
                  <motion.div
                    className="absolute left-0 mt-2 w-56 bg-black/95 border border-white/10 rounded-xl shadow-xl overflow-hidden"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    {links.map(({ href, label }) => (
                      <button
                        key={label}
                        onClick={() => handleNav(href)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 hover:text-green-400 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* DERECHA */}
        <div className="flex items-center gap-4">
          <IoNotifications className="text-yellow-400 text-xl cursor-pointer" />

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
            >
              <FiUser className="text-green-400" />
              <span className="max-w-[160px] truncate">
                {user?.name ?? "Usuario"}
              </span>
              <FiChevronDown
                className={`transition ${
                  userMenuOpen ? "rotate-180 text-green-400" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  className="absolute right-0 mt-2 w-56 bg-black/95 border border-white/10 rounded-xl shadow-xl"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-300 hover:bg-white/10 hover:text-red-200 transition flex items-center gap-2"
                  >
                    <FiLogOut /> Cerrar sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </>
  );
}
