'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Purchase } from '@/types/api';
import { purchasesApi } from '@/lib/api/purchases';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { CheckCircle } from 'lucide-react';

export default function PurchaseCompletePage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Note: We need to add a GET endpoint for single purchase
        // For now, using the purchase from the redirect
        // In real implementation, fetch from API
        setError(null);
      } catch (err) {
        console.error('Failed to load purchase', err);
        setError(
          err instanceof Error ? err.message : '購入情報を取得できませんでした'
        );
      } finally {
        setLoading(false);
      }
    };

    if (purchaseId) {
      load();
    }
  }, [purchaseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">処理中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Header />
      <div className="flex items-center justify-center py-20">
      <div className="max-w-md w-full mx-auto p-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />

        <h1 className="text-3xl font-bold mb-2">購入完了</h1>
        <p className="text-muted-foreground mb-6">
          ご購入ありがとうございました！
        </p>

        <div className="rounded-lg bg-muted p-6 mb-6 text-left">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">購入ID</p>
              <p className="font-mono text-sm break-all">{purchaseId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ステータス</p>
              <p className="font-medium">完了</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button onClick={() => router.push('/purchases')} className="w-full">
            購入履歴を表示
          </Button>
          <Button
            onClick={() => router.push('/products')}
            variant="outline"
            className="w-full"
          >
            買い物を続ける
          </Button>
          <Button
            onClick={() => router.push('/feed')}
            variant="outline"
            className="w-full"
          >
            フィードに戻る
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
