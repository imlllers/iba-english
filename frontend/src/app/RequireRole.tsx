import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "@/entities/user/types";
import { useSession } from "@/features/auth/useSession";
import { Loading } from "@/shared/ui/Loading";
import { Shell } from "./layout/Shell";

export function RequireRole({ role, bare = false }: { role: Role; bare?: boolean }) {
  const session = useSession();
  const location = useLocation();
  if (session.data === undefined) {
    return <Loading fullPage text={session.failureCount > 0 ? "Подключение к серверу…" : undefined} />;
  }
  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (session.data.role !== role) {
    return <Navigate to="/forbidden" replace />;
  }
  return bare ? <Outlet /> : <Shell role={role} />;
}
