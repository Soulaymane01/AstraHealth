import { create } from "zustand";

import { queryClient } from "@/app/query-client";
import { clearClinicalCache } from "@/features/offline/clinical-cache";
import {
  api,
  clearRole,
  getRole,
  isNetworkError,
  setRole as persistRole,
  type DemoRole,
} from "@/lib/api/client";
import type { UserRead } from "@/lib/api/types";

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

type SessionStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface SessionState {
  user: UserRead | null;
  status: SessionStatus;
  setRole: (role: DemoRole) => Promise<void>;
  updateUser: (patch: Partial<UserRead>) => void;
  logout: () => void;
  bootstrap: () => Promise<void>;
}

const initialRole = getRole();
const initialCachedUser = initialRole ? readCachedUser() : null;

let sessionRevalidating = initialCachedUser !== null;

export function isSessionRevalidating(): boolean {
  return sessionRevalidating;
}

export const useAuthStore = create<SessionState>((set) => ({
  user: initialCachedUser,
  status: initialCachedUser ? "authenticated" : "idle",

  setRole: async (role) => {
    persistRole(role);
    set({ status: "loading" });
    try {
      const { data, response } = await api.GET("/me");
      if (!data) {
        throw new Error(
          response.status === 503
            ? "Demo data is not ready. Run make reset-demo and try again."
            : "Unable to open this view.",
        );
      }
      writeCachedUser(data);
      queryClient.clear();
      set({ user: data, status: "authenticated" });
    } catch (error) {
      clearRole();
      clearCachedUser();
      set({ user: null, status: "unauthenticated" });
      throw error;
    }
  },

  updateUser: (patch) => {
    set((state) => {
      if (!state.user) return state;
      const user = { ...state.user, ...patch };
      writeCachedUser(user);
      return { user };
    });
  },

  logout: () => {
    clearRole();
    clearCachedUser();
    clearClinicalCache();
    queryClient.clear();
    set({ user: null, status: "unauthenticated" });
  },

  bootstrap: async () => {
    const role = getRole();
    if (!role) {
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

      clearRole();
      clearCachedUser();
      clearClinicalCache();
      set({ user: null, status: "unauthenticated" });
    } finally {
      sessionRevalidating = false;
    }
  },
}));
