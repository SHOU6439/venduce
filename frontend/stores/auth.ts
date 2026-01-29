import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser: boolean;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;

  hasHydrated?: boolean;
  login: (payload: {
    email: string;
    password: string;
    remember?: boolean;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setHasHydrated?: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: async (payload) => {
        const response = await apiClient.post<LoginResponse>(
          "/api/auth/login",
          payload,
        );
        if (typeof window !== "undefined") {
          window.localStorage.setItem("token", response.access_token);
        }
        set({
          isAuthenticated: true,
        });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("token");
        }
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },



      setUser: (user) => {
        set({ user });
      },
      setHasHydrated: (hydrated: boolean) => {
        set({ hasHydrated: hydrated });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),

      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated?.(true);
      },
    },
  )
);

export function useAuthHydrated() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (hasHydrated) setHydrated(true);
  }, [hasHydrated]);
  return hydrated;
}
