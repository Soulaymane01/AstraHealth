import { Navigate, Outlet, useLocation } from "react-router-dom";

import { FullPageLoader } from "@/features/shared/FullPageLoader";

import { useSessionStore } from "./session-store";

export function RequireRole() {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return <FullPageLoader />;
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        to="/welcome"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
