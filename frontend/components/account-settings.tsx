'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export function AccountSettings() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">ログインユーザー</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {user?.username || 'ユーザー'}
        </p>
      </div>

      <div className="border-t pt-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">ログアウト</p>
              <p className="text-sm text-red-700 mb-3">
                このデバイスからログアウトします
              </p>
              <Button
                onClick={handleLogout}
                variant="destructive"
                size="sm"
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
