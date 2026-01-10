import { Outlet, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";

export default function AppLayout() {
  const { isAuthenticated, user } = useAuth();

/*   if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
 */
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      <main className="pt-16 px-6">
        <Outlet />
      </main>
    </div>
  );
}
