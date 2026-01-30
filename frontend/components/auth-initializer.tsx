'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';

/**
 * ページ読み込み時にクッキーからトークンを復元する
 */
export function AuthInitializer() {
  const initializeFromToken = useAuthStore((state) => state.initializeFromToken);
  const setHasHydrated = useAuthStore((state) => state.setHasHydrated);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      try {
        await initializeFromToken();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setHasHydrated(true);
      }
    };

    initialize();
  }, []);

  return null;
}
