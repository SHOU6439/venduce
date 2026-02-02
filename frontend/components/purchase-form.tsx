'use client';

import { useState, useEffect } from 'react';
import { Product, PaymentMethod, Purchase } from '@/types/api';
import { purchasesApi } from '@/lib/api/purchases';
import { paymentMethodsApi } from '@/lib/api/payment-methods';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PurchaseFormProps {
  product: Product;
  referringPostId?: string | null;
}

export function PurchaseForm({ product, referringPostId }: PurchaseFormProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const methods = await paymentMethodsApi.listPaymentMethods();
        setPaymentMethods(methods);
        const defaultMethod = methods.find((m) => m.is_default);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        } else if (methods.length > 0) {
          setSelectedMethodId(methods[0].id);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load payment methods', err);
        setError(err instanceof Error ? err.message : '支払い方法を取得できませんでした');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totalAmount = product.price_cents * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMethodId) {
      setError('支払い方法を選択してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 購入確認ページへリダイレクト
      const params = new URLSearchParams({
        productId: product.id,
        quantity: quantity.toString(),
        paymentMethodId: selectedMethodId,
        ...(referringPostId ? { referringPostId } : {}),
      });

      router.push(`/purchase-confirmation?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '処理に失敗しました');
      console.error('Navigation error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">読み込み中...</div>;
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="p-4 rounded border border-yellow-200 bg-yellow-50">
        <p className="text-sm text-yellow-800 mb-3">
          購入するには支払い方法を登録してください
        </p>
        <Link href="/settings/payment-methods">
          <Button variant="outline" size="sm" className="w-full">
            支払い方法を登録
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded border">
      <div>
        <label className="block text-sm font-medium mb-2">
          数量
        </label>
        <input
          type="number"
          min="1"
          max={product.stock_quantity}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          disabled={submitting}
          className="w-full rounded border p-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          在庫: {product.stock_quantity}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          支払い方法
        </label>
        <select
          value={selectedMethodId}
          onChange={(e) => setSelectedMethodId(e.target.value)}
          disabled={submitting}
          className="w-full rounded border p-2"
        >
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
              {method.is_default ? ' (デフォルト)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded bg-muted p-3">
        <div className="text-sm mb-2">
          <span className="text-muted-foreground">単価:</span>
          <span className="ml-2">¥{(product.price_cents / 100).toLocaleString()}</span>
        </div>
        <div className="text-sm mb-2">
          <span className="text-muted-foreground">数量:</span>
          <span className="ml-2">{quantity}</span>
        </div>
        <div className="text-lg font-semibold">
          <span className="text-muted-foreground">合計:</span>
          <span className="ml-2">¥{(totalAmount / 100).toLocaleString()}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting || !selectedMethodId}
        className="w-full"
      >
        {submitting ? '購入中...' : '購入する'}
      </Button>
    </form>
  );
}
