import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import useWialonKeepAlive from "../hooks/useWialonKeepAlive";
export default function AppLayout() {
  const { isAuthenticated, user } = useAuth();
  useWialonKeepAlive();
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      <main className="pt-16 w-full">
        <Outlet />
      </main>
    </div>
  );
}
