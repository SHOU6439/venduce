'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';

/**
 * リフレッシュトークンの期限が1日以下になったら自動リフレッシュする
 */
export function TokenRefreshManager() {
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);
  const shouldRefreshToken = useAuthStore((state) => state.shouldRefreshToken);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAndRefresh = useCallback(() => {
    if (shouldRefreshToken()) {
      refreshAccessToken();
    }
  }, [shouldRefreshToken, refreshAccessToken]);

  useEffect(() => {
    checkAndRefresh();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const checkInterval = process.env.NODE_ENV === 'development' ? 60 * 1000 : 60 * 60 * 1000;

    intervalRef.current = setInterval(checkAndRefresh, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAndRefresh]);

  return null;
}
