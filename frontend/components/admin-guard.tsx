'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useAuthHydrated } from '@/stores/auth';
import { notFound } from 'next/navigation';

/**
 * 管理者ガード: is_admin=false のユーザーには 404 を表示する。
 * ユーザー要件: 「is_admin以外のユーザはアクセスした時に存在しないページとして表示させる」
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuthStore();
    const hydrated = useAuthHydrated();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (hydrated) {
            setChecked(true);
        }
    }, [hydrated]);

    if (!checked) {
        return null;
    }

    // 未認証 or 管理者でない → 404
    if (!isAuthenticated || !user?.is_admin) {
        notFound();
    }

    return <>{children}</>;
}
