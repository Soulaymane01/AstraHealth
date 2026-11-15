import { Navigate, Outlet } from "react-router-dom";

import { useSessionStore } from "@/features/session/session-store";

export function RequireSurgeon() {
  const user = useSessionStore((state) => state.user);

  if (user?.role !== "flight_surgeon") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
