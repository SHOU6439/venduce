'use client';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/ui/button';
import { purchasesApi } from '@/lib/api/purchases';
import { getImageUrl } from '@/lib/utils';
import { useAuthHydrated, useAuthStore } from '@/stores/auth';
import { Purchase } from '@/types/api';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const purchaseId = params.id as string;
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthHydrated();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // リダイレクト
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push('/login');
    }
  }, [user, router, hydrated]);

  // 購入詳細取得
  useEffect(() => {
    if (!user || !purchaseId) return;

    const fetchPurchase = async () => {
      try {
        setIsLoading(true);
        const data = await purchasesApi.getPurchase(purchaseId);
        console.log('Purchase data:', data);
        console.log('Product data:', data.product);
        console.log('Main asset:', data.product?.main_asset);
        console.log('Assets:', data.product?.assets);
        setPurchase(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '購入詳細を取得できませんでした'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchase();
  }, [user, purchaseId]);

  if (!hydrated || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-4">
          <BackButton className="mb-4" />
          <div className="p-4 rounded-lg bg-red-50 text-red-700">
            {error || '購入詳細が見つかりません'}
          </div>
          <div className="mt-4">
            <Link href="/purchases">
              <Button>購入履歴に戻る</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const purchaseDate = new Date(purchase.created_at).toLocaleDateString(
    'ja-JP',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
  const totalPrice = (purchase.total_amount_cents / 100).toLocaleString();
  const unitPrice = (purchase.price_cents / 100).toLocaleString();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 p-4 border-b">
          <BackButton />
          <h1 className="text-2xl font-bold">購入詳細</h1>
        </div>

        {/* メインコンテンツ */}
        <div className="p-4 space-y-6">
          {/* 商品情報 */}
          <div className="rounded-lg border overflow-hidden">
            <div className="flex gap-4 p-4">
              {/* 商品画像 */}
              <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {purchase.product.assets && purchase.product.assets.length > 0 && purchase.product.assets[0].public_url ? (
                  <Image
                    src={getImageUrl(purchase.product.assets[0].public_url)}
                    alt={purchase.product.title}
                    width={96}
                    height={96}
                    unoptimized
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image load error:', e);
                      console.error('Image URL:', getImageUrl(purchase.product.assets[0].public_url));
                    }}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground text-center p-2">
                    画像なし
                  </div>
                )}
              </div>

              {/* 商品詳細 */}
              <div className="flex-1">
                <Link href={`/products/${purchase.product_id}`}>
                  <h2 className="text-lg font-semibold hover:text-primary transition cursor-pointer">
                    {purchase.product.title}
                  </h2>
                </Link>
                {purchase.product.brand && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ブランド: {purchase.product.brand.name}
                  </p>
                )}
                {purchase.product.category && (
                  <p className="text-sm text-muted-foreground">
                    カテゴリ: {purchase.product.category.name}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  商品ID: {purchase.product_id}
                </p>
              </div>
            </div>
          </div>

          {/* 購入情報 */}
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold text-lg">購入情報</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">購入日時</p>
                <p className="font-medium">{purchaseDate}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">ステータス</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                    {purchase.status === 'completed' ? '完了' : purchase.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">単価</p>
                <p className="font-medium">¥{unitPrice}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">数量</p>
                <p className="font-medium">{purchase.quantity}個</p>
              </div>
            </div>

            {/* 支払い方法 */}
            {purchase.payment_method && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">支払い方法</p>
                <p className="font-medium">{purchase.payment_method.payment_type}</p>
              </div>
            )}

            {/* 通貨 */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">通貨</p>
              <p className="font-medium">{purchase.currency}</p>
            </div>
          </div>

          {/* 合計金額 */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">合計金額</span>
              <span className="text-2xl font-bold text-primary">
                ¥{totalPrice}
              </span>
            </div>
          </div>

          {/* 参照元投稿 */}
          {purchase.referring_post_id && (
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">参照元情報</h3>
              <p className="text-sm text-muted-foreground mb-3">
                この商品は以下の投稿から購入されました
              </p>
              <Link href={`/posts/${purchase.referring_post_id}`}>
                <Button variant="outline" className="w-full">
                  投稿を見る
                </Button>
              </Link>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3">
            <Link href={`/products/${purchase.product_id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                商品ページを見る
              </Button>
            </Link>
            <Link href="/purchases" className="flex-1">
              <Button variant="secondary" className="w-full">
                購入履歴に戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
