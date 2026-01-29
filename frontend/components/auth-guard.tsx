'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAuthHydrated } from '@/stores/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useAuthHydrated();


  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, hydrated, router]);


  if (!hydrated) {
    return null;
  }
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
