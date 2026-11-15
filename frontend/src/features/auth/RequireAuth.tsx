import { Navigate, Outlet, useLocation } from "react-router-dom";

import { FullPageLoader } from "@/features/shared/FullPageLoader";

import { useAuthStore } from "./auth-store";

export function RequireAuth() {
  const status = useAuthStore((state) => state.status);
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
