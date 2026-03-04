import { ApiError, client } from "@/lib/api/client";
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
  is_admin: boolean;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
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
        const refreshExpiresAt = Date.now() + (response.refresh_expires_in * 1000);
        if (typeof window !== "undefined") {
          // クッキーにトークンを保存（HttpOnly推奨だがクライアント側の実装）
          setCookie("access_token", response.access_token, {
            maxAge: response.expires_in,
            path: "/",
            sameSite: "Lax",
          });
          setCookie("refresh_token", response.refresh_token, {
            maxAge: response.refresh_expires_in,
            path: "/",
            sameSite: "Lax",
          });
        }
        set({
          isAuthenticated: true,
          user: response.user || null,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          refreshTokenExpiresAt: refreshExpiresAt,
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
            maxAge: expiresIn ?? 15 * 60,
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

          const refreshExpiresAt = Date.now() + (response.refresh_expires_in * 1000);

          if (typeof window !== "undefined") {
            setCookie("access_token", response.access_token, {
              maxAge: response.expires_in,
              path: "/",
              sameSite: "Lax",
            });
            setCookie("refresh_token", response.refresh_token, {
              maxAge: response.refresh_expires_in,
              path: "/",
              sameSite: "Lax",
            });
          }

          set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            refreshTokenExpiresAt: refreshExpiresAt,
          });

          return true;
        } catch (error) {
          // ネットワーク障害 / サーバー一時停止（5xx）はセッションを維持したまま失敗
          if (error instanceof TypeError && error.message === 'Failed to fetch') {
            return false;
          }
          if (error instanceof ApiError && error.status >= 500) {
            // 5xx はサーバー側の一時エラー。クッキーを消さず静かに失敗
            return false;
          }
          // 401/403 などの認証エラーのみログアウト
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
        const result = remainingTime <= oneDayInMs && remainingTime > 0;

        return result;
      },

      initializeFromToken: async () => {
        try {
          let token = getCookie("access_token");
          const existingRefreshCookie = getCookie("refresh_token");

          // access_token がない場合、refresh_token でリフレッシュを試みる
          if (!token) {
            if (existingRefreshCookie) {
              const refreshed = await get().refreshAccessToken();
              if (refreshed) {
                token = getCookie("access_token");
              } else {
                // リフレッシュ失敗。サーバー一時停止の可能性があるため
                // クッキーが残っていれば認証済み状態を維持して終了
                const stillHasRefresh = getCookie("refresh_token");
                if (stillHasRefresh) {
                  // クッキーは生きている→次回リロード時に再試行
                  // Zustand に persist 済みの状態があれば isAuthenticated はそのまま
                  return;
                }
              }
            }
          }

          if (token) {
            const user = await client.get<User>("/api/users/me");
            const refreshToken = getCookie("refresh_token");
            // refreshTokenExpiresAt は前回のログイン/リフレッシュで persist された値を保持する。
            // ここでハードコードすると remember=true（60日）でも7日になってしまう。
            const existingRefreshTokenExpiresAt = get().refreshTokenExpiresAt;
            set({
              user,
              isAuthenticated: true,
              accessToken: token,
              refreshToken: refreshToken,
              refreshTokenExpiresAt: refreshToken ? existingRefreshTokenExpiresAt : null,
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
          // 5xx・ネットワーク障害はサーバー一時停止とみなし、クッキーを保持したまま終了
          const isTransient =
            (err instanceof TypeError && err.message === 'Failed to fetch') ||
            (err instanceof ApiError && err.status >= 500);

          if (isTransient) {
            // クッキーが残っていれば次回リロード時に再試行
            console.warn('Server temporarily unavailable during auth init. Retaining session.');
            return;
          }

          // 401 などの認証エラーのみセッションをクリア
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


