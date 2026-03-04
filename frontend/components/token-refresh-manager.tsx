'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { getCookie } from '@/lib/utils/cookies';

/**
 * アクセストークン期限切れの監視と、リフレッシュトークン期限切れ前の自動更新を行う
 * - アクセストークンクッキーがなくなったら即座にリフレッシュ
 * - リフレッシュトークンの残り1日以下でもリフレッシュ
 *
 * NOTE: useAuthStore.getState() を直接参照することで、ストア更新のたびに
 * インターバルがリセットされる問題を防ぐ（依存配列は空）。
 */
export function TokenRefreshManager() {
  // isAuthenticated の変化を監視するためだけに購読する（マウント/アンマウント判定用）
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const checkAndRefresh = async () => {
      // getState() で最新値を取得（リアクティブ依存なし）
      const { isAuthenticated: auth, refreshAccessToken, shouldRefreshToken } =
        useAuthStore.getState();

      if (!auth) return;

      // アクセストークンクッキーが期限切れ（存在しない）場合は即座にリフレッシュ
      const accessToken = getCookie('access_token');
      if (!accessToken) {
        await refreshAccessToken();
        return;
      }

      // リフレッシュトークン自体が残り1日以下の場合もリフレッシュ
      if (shouldRefreshToken()) {
        await refreshAccessToken();
      }
    };

    // マウント時に即座にチェック
    checkAndRefresh();

    // タブがアクティブに戻ったときにも即座にチェック（タブ離脱中にトークンが切れるケース対応）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 1分ごとにチェック（アクセストークン15分期限に対応）
    // インターバルは isAuthenticated が変わるたびにリセットする
    const interval = setInterval(checkAndRefresh, 60 * 1000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]); // isAuthenticated が変わったときだけリセット（認証状態変化への追従）

  return null;
}
