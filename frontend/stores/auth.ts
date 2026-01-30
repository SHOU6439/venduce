import { useEffect, useState } from "react";
import { client } from "@/lib/api/client";
import { setCookie, getCookie, deleteCookie } from "@/lib/utils/cookies";
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
  accessToken: string | null;
  refreshToken: string | null;

  hasHydrated?: boolean;
  login: (payload: {
    email: string;
    password: string;
    remember?: boolean;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  refreshAccessToken: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setHasHydrated?: (hydrated: boolean) => void;
  initializeFromToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,
      login: async (payload) => {
        const response = await client.post<LoginResponse>(
          "/api/auth/login",
          payload,
        );
        if (typeof window !== "undefined") {
          // クッキーにトークンを保存（HttpOnly推奨だがクライアント側の実装）
          setCookie("access_token", response.access_token, {
            maxAge: 15 * 60, // 15分
            path: "/",
            sameSite: "Lax",
          });
          setCookie("refresh_token", response.refresh_token, {
            maxAge: 7 * 24 * 60 * 60, // 7日
            path: "/",
            sameSite: "Lax",
          });
        }
        set({
          isAuthenticated: true,
          user: response.user || null,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          deleteCookie("access_token", "/");
          deleteCookie("refresh_token", "/");
        }
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          setCookie("access_token", accessToken, {
            maxAge: 15 * 60,
            path: "/",
            sameSite: "Lax",
          });
          setCookie("refresh_token", refreshToken, {
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
            sameSite: "Lax",
          });
        }
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      refreshAccessToken: async () => {
        try {
          const refreshToken = getCookie("refresh_token");
          
          if (!refreshToken) {
            return false;
          }

          const response = await client.post<LoginResponse>(
            "/api/auth/refresh",
            { refresh_token: refreshToken },
          );

          if (typeof window !== "undefined") {
            setCookie("access_token", response.access_token, {
              maxAge: 15 * 60,
              path: "/",
              sameSite: "Lax",
            });
            setCookie("refresh_token", response.refresh_token, {
              maxAge: 7 * 24 * 60 * 60,
              path: "/",
              sameSite: "Lax",
            });
          }

          set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
          });

          return true;
        } catch (error) {
          console.error("Failed to refresh access token:", error);
          get().logout();
          return false;
        }
      },

      initializeFromToken: async () => {
        try {
          const token = getCookie("access_token");
          if (token) {
            // トークンが存在すればユーザー情報を取得
            const user = await client.get<User>("/api/users/me");
            const refreshToken = getCookie("refresh_token");
            set({
              user,
              isAuthenticated: true,
              accessToken: token,
              refreshToken: refreshToken,
            });
          } else {
            // トークンがない場合はクリア
            set({
              user: null,
              isAuthenticated: false,
              accessToken: null,
              refreshToken: null,
            });
          }
        } catch (err) {
          console.error('Failed to initialize from token:', err);
          // トークン無効な場合はクリア
          if (typeof window !== "undefined") {
            deleteCookie("access_token", "/");
            deleteCookie("refresh_token", "/");
          }
          set({
            user: null,
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
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
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
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


