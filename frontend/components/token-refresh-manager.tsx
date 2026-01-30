'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

/**
 * リフレッシュトークンの期限が1日以下になったら自動リフレッシュする
 */
export function TokenRefreshManager() {
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);
  const shouldRefreshToken = useAuthStore((state) => state.shouldRefreshToken);

  useEffect(() => {
    if (shouldRefreshToken()) {
      refreshAccessToken();
    }

    const interval = setInterval(() => {
      if (shouldRefreshToken()) {
        console.log('リフレッシュトークンの期限が近いため、自動更新します');
        refreshAccessToken();
      }
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [shouldRefreshToken, refreshAccessToken]);

  return null;
}
