'use client';

import { useState } from 'react';
import { paymentMethodsApi } from '@/lib/api/payment-methods';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';

interface PaymentMethodFormProps {
  editingId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentMethodForm({
  editingId,
  onSuccess,
  onCancel,
}: PaymentMethodFormProps) {
  const [name, setName] = useState('');
  const [paymentType, setPaymentType] = useState('credit_card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // クレジットカード情報
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  const validateCardNumber = (num: string): boolean => {
    const cleaned = num.replace(/\s+/g, '');
    return /^\d{13,19}$/.test(cleaned);
  };

  const validateExpiry = (): boolean => {
    if (!expiryMonth || !expiryYear) return false;
    const month = parseInt(expiryMonth);
    const year = parseInt(expiryYear);
    const now = new Date();
    const expiry = new Date(year, month - 1);
    return expiry > now && month >= 1 && month <= 12;
  };

  const validateCVV = (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('支払い方法の名前を入力してください');
      return;
    }

    if (paymentType === 'credit_card') {
      if (!cardNumber.trim()) {
        setError('カード番号を入力してください');
        return;
      }
      if (!validateCardNumber(cardNumber)) {
        setError('有効なカード番号を入力してください');
        return;
      }
      if (!cardholderName.trim()) {
        setError('カード所有者名を入力してください');
        return;
      }
      if (!validateExpiry()) {
        setError('有効期限を正しく入力してください（MM/YY形式）');
        return;
      }
      if (!cvv.trim()) {
        setError('CVVを入力してください');
        return;
      }
      if (!validateCVV(cvv)) {
        setError('CVVは3～4桁の数字で入力してください');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let details: Record<string, unknown> | undefined;

      if (paymentType === 'credit_card') {
        // クライアント側でトークン化（将来: Stripe.js に置き換え可能）
        const cardToken = createCardToken({
          card_number: cardNumber.replace(/\s+/g, ''),
          cardholder_name: cardholderName,
          expiry_month: parseInt(expiryMonth),
          expiry_year: parseInt(expiryYear),
          cvv: cvv,
        });

        details = {
          token: cardToken,
          last_four: cardNumber.replace(/\s+/g, '').slice(-4),
          payment_gateway: 'client_tokenized', // 将来: 'stripe', 'square' など
        };
      }

      if (editingId) {
        await paymentMethodsApi.updatePaymentMethod(editingId, {
          name,
        });
      } else {
        await paymentMethodsApi.createPaymentMethod({
          payment_type: paymentType,
          name,
          details,
        });
      }
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '保存に失敗しました');
      } else {
        setError(err instanceof Error ? err.message : '保存に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  // クライアント側トークン化（将来: Stripe.js に置き換え）
  const createCardToken = (cardData: {
    card_number: string;
    cardholder_name: string;
    expiry_month: number;
    expiry_year: number;
    cvv: string;
  }): string => {
    // ダミートークン生成（テスト用）
    // 実装: Stripe.js, Square Payment API などに置き換え可能
    const tokenPayload = {
      type: 'card',
      card: {
        number: cardData.card_number.slice(-4),
        exp_month: cardData.expiry_month,
        exp_year: cardData.expiry_year,
      },
      timestamp: new Date().toISOString(),
    };
    
    // Base64 エンコード（実際は Stripe などのサーバーから返されるトークン）
    return btoa(JSON.stringify(tokenPayload));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border p-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          支払い方法の種類
        </label>
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          disabled={loading || !!editingId}
          className="w-full rounded border p-2"
        >
          <option value="credit_card">クレジットカード</option>
          <option value="convenience_store">コンビニ払い</option>
          <option value="bank_transfer">銀行振込</option>
          <option value="digital_wallet">デジタルウォレット</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {editingId ? '編集時は変更できません' : '保存後は変更できません'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          支払い方法の名前
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：メインのクレジットカード"
          disabled={loading}
          maxLength={100}
          className="w-full rounded border p-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          わかりやすい名前をつけてください
        </p>
      </div>

      {/* クレジットカード情報 */}
      {paymentType === 'credit_card' && (
        <div className="rounded bg-blue-50 p-4 space-y-4 border border-blue-200">
          <div>
            <label className="block text-sm font-medium mb-2">
              カード番号
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
              placeholder="1234 5678 9012 3456"
              disabled={loading}
              maxLength={19}
              className="w-full rounded border p-2 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              13～19桁の数字を入力してください
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              カード所有者名
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="TARO YAMADA"
              disabled={loading}
              maxLength={100}
              className="w-full rounded border p-2 uppercase"
            />
            <p className="text-xs text-muted-foreground mt-1">
              カード面に記載されている名前を入力してください
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                有効期限（月）
              </label>
              <select
                value={expiryMonth}
                onChange={(e) => setExpiryMonth(e.target.value)}
                disabled={loading}
                className="w-full rounded border p-2"
              >
                <option value="">選択</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = String(i + 1).padStart(2, '0');
                  return (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                有効期限（年）
              </label>
              <select
                value={expiryYear}
                onChange={(e) => setExpiryYear(e.target.value)}
                disabled={loading}
                className="w-full rounded border p-2"
              >
                <option value="">選択</option>
                {Array.from({ length: 20 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              セキュリティコード（CVV）
            </label>
            <input
              type="password"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              disabled={loading}
              maxLength={4}
              className="w-full rounded border p-2 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              カード背面の3～4桁の数字を入力してください
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={onCancel}
          className="flex-1"
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
