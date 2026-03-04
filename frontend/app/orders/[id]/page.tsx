'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Purchase } from '@/types/api';
import { purchasesApi } from '@/lib/api/purchases';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';

function OrderDetailContent() {
  const params = useParams();
  const searchParamsHook = useSearchParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // URLに購入情報が含まれているかチェック
        const productId = searchParamsHook.get('productId');
        const quantity = searchParamsHook.get('quantity');
        const totalAmount = searchParamsHook.get('totalAmount');
        
        if (productId && quantity && totalAmount) {
          // クエリパラメータから情報を構築
          // TODO: 実際にはバックエンドから取得すべき
          setError(null);
        } else {
          // バックエンドから取得を試みる
          const purchase = await purchasesApi.getPurchase(orderId);
          setOrder(purchase);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load order', err);
        setError(
          err instanceof Error ? err.message : '注文情報を取得できませんでした'
        );
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      load();
    }
  }, [orderId, searchParamsHook]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'cancelled':
      case 'refunded':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Clock className="h-6 w-6" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: '完了',
      pending: '処理中',
      cancelled: 'キャンセル',
      refunded: '返金済み',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const productId = searchParamsHook.get('productId');
  const quantity = Number(searchParamsHook.get('quantity') || 1);
  const totalAmount = Number(searchParamsHook.get('totalAmount') || 0);
  const productTitle = searchParamsHook.get('productTitle') || '商品';
  const productImage = searchParamsHook.get('productImage');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto">
        {/* ページヘッダー */}
        <div className="flex items-center gap-4 p-4 border-b">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition"
            aria-label="戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">注文詳細</h1>
        </div>

        {error ? (
          <div className="p-4">
            <div className="rounded border border-red-200 bg-red-50 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* ステータス */}
            <div className="rounded-lg bg-gradient-to-br from-green-50 to-blue-50 p-6 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">注文完了</h2>
              <p className="text-muted-foreground">
                ご注文ありがとうございました
              </p>
            </div>

            {/* 注文情報 */}
            <div className="rounded border p-4">
              <h3 className="font-semibold mb-4">注文情報</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">注文番号</span>
                  <span className="font-mono">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">注文日時</span>
                  <span>{new Date().toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ステータス</span>
                  <span className="font-medium">完了</span>
                </div>
              </div>
            </div>

            {/* 商品情報 */}
            <div className="rounded border p-4">
              <h3 className="font-semibold mb-4">商品</h3>
              <div className="space-y-4">
                {productImage && (
                  <div className="overflow-hidden rounded bg-muted">
                    <img
                      src={getImageUrl(productImage)}
                      alt={productTitle}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">商品名</span>
                    <span className="font-medium text-right">{productTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">数量</span>
                    <span className="font-medium">{quantity}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2 text-base">
                    <span>合計金額</span>
                    <span>¥{(totalAmount / 100).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 支払い情報 */}
            <div className="rounded border p-4">
              <h3 className="font-semibold mb-4">支払い方法</h3>
              <div className="text-sm">
                <p className="text-muted-foreground">登録済み支払い方法</p>
              </div>
            </div>

            {/* アクション */}
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/purchases')}
                className="w-full"
              >
                購入履歴を表示
              </Button>
              <Button
                onClick={() => router.push('/products')}
                variant="outline"
                className="w-full"
              >
                他の商品を見る
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
        )}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  );
}
