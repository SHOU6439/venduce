'use client';

import { useState, useEffect } from 'react';
import { PaymentMethod } from '@/types/api';
import { paymentMethodsApi } from '@/lib/api/payment-methods';
import { Button } from '@/components/ui/button';
import { Trash2, Check } from 'lucide-react';
import { PaymentMethodForm } from './payment-method-form';

export function PaymentMethodsManager() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentMethodsApi.listPaymentMethods();
      setPaymentMethods(methods);
      setError(null);
    } catch (err) {
      console.error('Failed to load payment methods', err);
      setError(err instanceof Error ? err.message : '支払い方法を取得できませんでした');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('この支払い方法を削除しますか？')) {
      return;
    }

    setDeleting(id);
    try {
      await paymentMethodsApi.deletePaymentMethod(id);
      setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await paymentMethodsApi.updatePaymentMethod(id, { is_default: true });
      setPaymentMethods((prev) =>
        prev.map((m) => ({
          ...m,
          is_default: m.id === id,
        }))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'デフォルト設定に失敗しました');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingId(null);
    loadPaymentMethods();
  };

  if (loading) {
    return <div className="p-4 text-center">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm ? (
        <PaymentMethodForm
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          editingId={editingId}
        />
      ) : (
        <>
          {paymentMethods.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-center">
              <p className="text-muted-foreground mb-4">支払い方法が登録されていません</p>
              <Button onClick={() => setShowForm(true)}>支払い方法を追加</Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between rounded border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{method.name}</p>
                        {method.is_default && (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            デフォルト
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{method.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          デフォルトにする
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(method.id)}
                        disabled={deleting === method.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
                className="w-full"
              >
                支払い方法を追加
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
