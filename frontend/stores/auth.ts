import { useEffect, useState } from "react";
import { client } from "@/lib/api/client";
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
  user?: User;
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
  initializeFromToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: async (payload) => {
        const response = await client.post<LoginResponse>(
          "/api/auth/login",
          payload,
        );
        if (typeof window !== "undefined") {
          window.localStorage.setItem("token", response.access_token);
        }
        set({
          isAuthenticated: true,
          user: response.user || null,
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

      initializeFromToken: async () => {
        try {
          const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
          if (token) {
            // トークンが存在すればユーザー情報を取得
            const user = await client.get<User>("/api/users/me");
            set({
              user,
              isAuthenticated: true,
            });
          } else {
            // トークンがない場合はクリア
            set({
              user: null,
              isAuthenticated: false,
            });
          }
        } catch (err) {
          console.error('Failed to initialize from token:', err);
          // トークン無効な場合はクリア
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("token");
          }
          set({
            user: null,
            isAuthenticated: false,
          });
        }
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
  const initializeFromToken = useAuthStore((state) => state.initializeFromToken);
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    if (hasHydrated) {
      setHydrated(true);
      // Hydration完了後にトークンから情報を復元
      initializeFromToken();
    }
  }, [hasHydrated, initializeFromToken]);
  
  return hydrated;
}


