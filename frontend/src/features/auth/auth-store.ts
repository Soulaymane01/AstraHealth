import { create } from "zustand";

import { queryClient } from "@/app/query-client";
import {
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isNetworkError,
  setTokens,
} from "@/lib/api/client";
import type { TokenResponse, UserRead } from "@/lib/api/types";

const USER_KEY = "astra.user";

function readCachedUser(): UserRead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserRead;
    return typeof parsed?.id === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: UserRead): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // A full or blocked localStorage must not break the session.
  }
}

function clearCachedUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
}

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: UserRead | null;
  status: AuthStatus;
  setSession: (session: TokenResponse) => void;
  updateUser: (patch: Partial<UserRead>) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
}

const initialCachedUser =
  typeof window !== "undefined" && getAccessToken() ? readCachedUser() : null;

let sessionRevalidating = initialCachedUser !== null;

export function isSessionRevalidating(): boolean {
  return sessionRevalidating;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialCachedUser,
  status: initialCachedUser ? "authenticated" : "idle",

  setSession: (session) => {
    setTokens(session.access_token, session.refresh_token);
    writeCachedUser(session.user);
    queryClient.clear();
    set({ user: session.user, status: "authenticated" });
  },

  updateUser: (patch) => {
    set((state) => {
      if (!state.user) return state;
      const user = { ...state.user, ...patch };
      writeCachedUser(user);
      return { user };
    });
  },

  login: async (email, password) => {
    const { data, response } = await api.POST("/auth/login", {
      body: { email, password },
    });
    if (!data) {
      if (response.status === 401) throw new Error("Invalid email or password.");
      throw new Error("Unable to sign in right now. Try again.");
    }
    get().setSession(data);
  },

  register: async (fullName, email, password) => {
    const { data, response } = await api.POST("/auth/register", {
      body: { email, password, full_name: fullName },
    });
    if (!data) {
      if (response.status === 409) throw new Error("That email is already registered.");
      if (response.status === 422) throw new Error("Check the form and try again.");
      throw new Error("Unable to create the account right now.");
    }
    get().setSession(data);
  },

  logout: () => {
    clearTokens();
    clearCachedUser();
    queryClient.clear();
    set({ user: null, status: "unauthenticated" });
  },

  bootstrap: async () => {
    const access = getAccessToken();
    if (!access) {
      set({ status: "unauthenticated" });
      return;
    }

    const cached = readCachedUser();
    const restoreCached = () => {
      if (!cached) return false;
      set({ user: cached, status: "authenticated" });
      return true;
    };

    sessionRevalidating = true;
    try {
      if (!cached) set({ status: "loading" });
      try {
        const me = await api.GET("/me");
        if (me.data) {
          writeCachedUser(me.data);
          set({ user: me.data, status: "authenticated" });
          return;
        }
        if (me.response.status !== 401 && restoreCached()) return;
      } catch (error) {
        if (isNetworkError(error) && restoreCached()) return;
      }

      const refresh = getRefreshToken();
      if (!refresh) {
        clearTokens();
        clearCachedUser();
        set({ user: null, status: "unauthenticated" });
        return;
      }

      let refreshRejected = false;
      try {
        const refreshed = await api.POST("/auth/refresh", {
          body: { refresh_token: refresh },
        });
        if (refreshed.data) {
          get().setSession(refreshed.data);
          return;
        }
        refreshRejected = refreshed.response.status === 401;
      } catch (error) {
        if (isNetworkError(error) && restoreCached()) return;
      }

      if (!refreshRejected && restoreCached()) return;

      clearTokens();
      clearCachedUser();
      set({ user: null, status: "unauthenticated" });
    } finally {
      sessionRevalidating = false;
    }
  },
}));
