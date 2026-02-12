import { client } from "@/lib/api/client";
import { deleteCookie, getCookie, setCookie } from "@/lib/utils/cookies";
import { useEffect, useState } from "react";
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
  expires_in: number;
  user?: User;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: number | null; // Unix timestamp (ms)

  hasHydrated?: boolean;
  login: (payload: {
    email: string;
    password: string;
    remember?: boolean;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  refreshAccessToken: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string, expiresIn?: number) => void;
  setHasHydrated?: (hydrated: boolean) => void;
  initializeFromToken: () => Promise<void>;
  shouldRefreshToken: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
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
            maxAge: response.expires_in, // バックエンドから返される秒単位の有効期限を使用
            path: "/",
            sameSite: "Lax",
          });
        }
        set({
          isAuthenticated: true,
          user: response.user || null,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          refreshTokenExpiresAt: Date.now() + (response.expires_in * 1000), // バックエンドの値を使用
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
          refreshTokenExpiresAt: null,
        });
      },

      setTokens: (accessToken, refreshToken, expiresIn) => {
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
        set({ 
          accessToken, 
          refreshToken, 
          isAuthenticated: true,
          refreshTokenExpiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : Date.now() + (7 * 24 * 60 * 60 * 1000),
        });
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
              maxAge: response.expires_in,
              path: "/",
              sameSite: "Lax",
            });
          }

          set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            refreshTokenExpiresAt: Date.now() + (response.expires_in * 1000),
          });

          return true;
        } catch (error) {
          // ネットワークエラーの場合は静かに失敗（リトライはAPI層で処理）
          if (error instanceof TypeError && error.message === 'Failed to fetch') {
            // ネットワーク障害 - 何もしない（クライアント側では対応不可）
            return false;
          }
          // その他のエラー（認証失敗など）はログアウト
          console.error("Failed to refresh access token:", error);
          get().logout();
          return false;
        }
      },

      shouldRefreshToken: () => {
        const state = get();
        if (!state.refreshTokenExpiresAt) return false;
        
        // リフレッシュトークンの残り時間が1日以下の場合は true
        const remainingTime = state.refreshTokenExpiresAt - Date.now();
        const oneDayInMs = 24 * 60 * 60 * 1000;
        
        return remainingTime <= oneDayInMs && remainingTime > 0;
      },

      initializeFromToken: async () => {
        try {


          const token = getCookie("access_token");
          if (token) {
            const user = await client.get<User>("/api/users/me");
            const refreshToken = getCookie("refresh_token");
            set({
              user,
              isAuthenticated: true,
              accessToken: token,
              refreshToken: refreshToken,
              refreshTokenExpiresAt: refreshToken ? Date.now() + (7 * 24 * 60 * 60 * 1000) : null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              accessToken: null,
              refreshToken: null,
              refreshTokenExpiresAt: null,
            });
          }
        } catch (err) {
          console.error('Failed to initialize from token:', err);
          if (typeof window !== "undefined") {
            deleteCookie("access_token", "/");
            deleteCookie("refresh_token", "/");
          }
          set({
            user: null,
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
            refreshTokenExpiresAt: null,
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
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
      }),
    },
  )
);

export function useAuthHydrated() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    if (hasHydrated) {
      setHydrated(true);
    }
  }, [hasHydrated]);
  
  return hydrated;
}


