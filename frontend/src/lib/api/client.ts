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

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (response.status === 401 || response.status === 403) {
        clearTokens();
        return false;
      }
      if (!response.ok) return false;

      const data = (await response.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!data.access_token || !data.refresh_token) return false;

      setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      // A network failure is not proof that the session is invalid. Keep the
      // tokens so the next request can try again.
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.use({
  onRequest({ request }) {
    const token = getAccessToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  async onResponse({ request, response }) {
    if (response.status !== 401 || request.url.includes("/auth/")) {
      return response;
    }

    const sent = request.headers.get("Authorization");
    const current = getAccessToken();
    const usedCurrentToken = current !== null && sent === `Bearer ${current}`;
    if (!usedCurrentToken) return response;

    const refreshed = await refreshSession();
    if (!refreshed) {
      // Only a rejected refresh means the session is gone. A network error
      // keeps the tokens for a later attempt.
      if (!getRefreshToken()) {
        window.dispatchEvent(new Event("astra:unauthorized"));
      }
      return response;
    }

    const token = getAccessToken();
    if (!token) return response;

    // Retry the original request once with the rotated access token.
    const retry = request.clone();
    const headers = new Headers(retry.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(new Request(retry, { headers }));
  },
});
