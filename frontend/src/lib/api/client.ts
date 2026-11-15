import createClient from "openapi-fetch";

import type { paths } from "./schema";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const ROLE_KEY = "astra.role";

export type DemoRole = "astronaut" | "surgeon";

function storage(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function getRole(): DemoRole | null {
  const value = storage()?.getItem(ROLE_KEY);
  return value === "astronaut" || value === "surgeon" ? value : null;
}

export function setRole(role: DemoRole): void {
  storage()?.setItem(ROLE_KEY, role);
}

export function clearRole(): void {
  storage()?.removeItem(ROLE_KEY);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  return (
    error instanceof DOMException && (error.name === "AbortError" || error.name === "NetworkError")
  );
}

export const api = createClient<paths>({ baseUrl });

api.use({
  onRequest({ request }) {
    const role = getRole();
    if (role) request.headers.set("X-Astra-Role", role);
    return request;
  },
});
