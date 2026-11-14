import createClient from "openapi-fetch";

import type { paths } from "./schema";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const ACCESS_KEY = "astra.access_token";
const REFRESH_KEY = "astra.refresh_token";

function storage(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function getAccessToken(): string | null {
  return storage()?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return storage()?.getItem(REFRESH_KEY) ?? null;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  const store = storage();
  if (!store) return;
  store.setItem(ACCESS_KEY, accessToken);
  store.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(ACCESS_KEY);
  store.removeItem(REFRESH_KEY);
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
    const token = getAccessToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ request, response }) {
    if (response.status === 401 && !request.url.includes("/auth/")) {
      const sent = request.headers.get("Authorization");
      const current = getAccessToken();
      const usedCurrentToken = current !== null && sent === `Bearer ${current}`;
      if (usedCurrentToken) {
        window.dispatchEvent(new Event("astra:unauthorized"));
      }
    }
    return response;
  },
});
