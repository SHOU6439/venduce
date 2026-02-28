'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentMethodsManager } from '@/components/payment-methods-manager';
import AuthGuard from '@/components/auth-guard';

export default function PaymentMethodsPage() {
  const router = useRouter();

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 p-4 border-b">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition"
            aria-label="戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">支払い方法管理</h1>
        </div>

        {/* コンテンツ */}
        <div className="p-4">
          <div className="mb-6">
            <p className="text-muted-foreground text-sm mb-4">
              購入時に使用する支払い方法を管理します
            </p>
          </div>

          <PaymentMethodsManager />
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
