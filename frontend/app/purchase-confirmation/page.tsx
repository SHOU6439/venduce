'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Product, PaymentMethod } from '@/types/api';
import { productsApi } from '@/lib/api/products';
import { paymentMethodsApi } from '@/lib/api/payment-methods';
import { purchasesApi } from '@/lib/api/purchases';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { getImageUrl, formatCurrencyFromMinorUnit } from '@/lib/utils';

export default function PurchaseConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const productId = searchParams.get('productId');
  const quantity = parseInt(searchParams.get('quantity') || '1');
  const paymentMethodId = searchParams.get('paymentMethodId');
  const referringPostId = searchParams.get('referringPostId');

  const [product, setProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        if (!productId || !paymentMethodId) {
          setError('必須パラメータが不足しています');
          return;
        }

        const [prod, method] = await Promise.all([
          productsApi.getProduct(productId),
          paymentMethodsApi.getPaymentMethod(paymentMethodId),
        ]);

        setProduct(prod);
        setPaymentMethod(method);
        setError(null);
      } catch (err) {
        console.error('Failed to load confirmation data', err);
        setError(err instanceof Error ? err.message : '確認情報を取得できませんでした');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [productId, paymentMethodId]);

  const handleConfirm = async () => {
    if (!product || !paymentMethod) return;

    setSubmitting(true);
    setError(null);

    try {
      const purchase = await purchasesApi.createPurchase({
        product_id: product.id,
        quantity,
        price_cents: product.price_cents,
        total_amount_cents: product.price_cents * quantity,
        currency: product.currency,
        payment_method_id: paymentMethod.id,
        referring_post_id: referringPostId || null,
      });

      // 注文完了ページにクエリパラメータで情報を渡す
      const params = new URLSearchParams({
        productId: product.id,
        productTitle: product.title,
        productImage: product.images?.[0]?.id || product.images?.[0] || '',
        quantity: String(quantity),
        totalAmount: String(product.price_cents * quantity),
      });
      
      router.push(`/orders/${purchase.id}?${params.toString()}`);
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : '購入に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  if (!product || !paymentMethod) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="rounded border border-red-200 bg-red-50 p-4">
            <p className="text-red-700">{error || '購入情報が見つかりません'}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = product.price_cents * quantity;

  return (
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
          <h1 className="text-2xl font-bold">購入確認</h1>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-6">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* 商品情報 */}
          <div className="rounded border p-4">
            <h2 className="font-semibold mb-4">商品</h2>
            <div className="flex gap-4">
              <div className="h-24 w-24 rounded bg-muted flex-shrink-0">
                <img
                  src={getImageUrl(product.images[0])}
                  alt={product.title}
                  className="h-full w-full object-cover rounded"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{product.brand?.name}</p>
                <h3 className="font-semibold text-lg">{product.title}</h3>
                <p className="text-primary font-semibold mt-2">
                  {formatCurrencyFromMinorUnit(product.price_cents, product.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* 購入詳細 */}
          <div className="rounded border p-4">
            <h2 className="font-semibold mb-4">購入詳細</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">単価</span>
                <span>{formatCurrencyFromMinorUnit(product.price_cents, product.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">数量</span>
                <span>{quantity}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                <span>合計</span>
                <span className="text-lg">
                  {formatCurrencyFromMinorUnit(totalAmount, product.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* 支払い方法 */}
          <div className="rounded border p-4">
            <h2 className="font-semibold mb-4">支払い方法</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{paymentMethod.name}</p>
                <p className="text-sm text-muted-foreground">{paymentMethod.type}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
              >
                変更
              </Button>
            </div>
          </div>

          {/* アクション */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? '処理中...' : '購入を確定'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
