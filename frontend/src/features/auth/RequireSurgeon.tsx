import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "@/features/auth/auth-store";

export function RequireSurgeon() {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== "flight_surgeon") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
