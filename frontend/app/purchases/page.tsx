'use client';

import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { purchasesApi } from '@/lib/api/purchases';
import { useAuthStore } from '@/stores/auth';
import { PaginatedResponseCursor, Purchase } from '@/types/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function PurchasesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(
    async (cursor?: string | null) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return purchasesApi.listUserPurchases(user.id, {
        cursor: cursor ?? undefined,
        limit: 20,
      });
    },
    [user]
  );

  const {
    items: purchases,
    isLoading,
    hasMore,
    loadNextPage,
    error: hookError,
  } = useInfiniteScroll<Purchase, PaginatedResponseCursor<Purchase>>(
    loadMore,
    {
      pageSize: 20,
      skip: !user,
    }
  );

  useEffect(() => {
    if (hookError) {
      setError(
        hookError instanceof Error
          ? hookError.message
          : '購入履歴を取得できませんでした'
      );
    }
  }, [hookError]);

  // Intersection Observer で無限スクロール
  useEffect(() => {
    if (!sentinelRef.current || isLoading || !hasMore) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        loadNextPage();
      }
    });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isLoading, hasMore, loadNextPage]);

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
          <h1 className="text-2xl font-bold">購入履歴</h1>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 m-4 rounded-lg bg-red-50 text-red-700">
            {error}
          </div>
        )}

        {/* 購入一覧 */}
        {purchases.length === 0 && !isLoading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">購入履歴がありません</p>
            <Link href="/products">
              <Button>商品を探す</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="p-4 hover:bg-muted/50 transition cursor-pointer"
                onClick={() => router.push(`/purchases/${purchase.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">
                      {purchase.product.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      購入日: {new Date(purchase.created_at).toLocaleDateString('ja-JP')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      数量: {purchase.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      ¥{(purchase.total_amount_cents / 100).toLocaleString()}
                    </p>
                    <span className="inline-block px-2 py-1 mt-2 text-xs font-medium rounded bg-green-100 text-green-800">
                      {purchase.status === 'completed' ? '完了' : purchase.status}
                    </span>
                  </div>
                </div>

                {purchase.referring_post_id && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <p className="text-muted-foreground">
                      この投稿から購入:{' '}
                      <Link
                        href={`/posts/${purchase.referring_post_id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        投稿を見る
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* 無限スクロール用エレメント */}
            {hasMore && (
              <div ref={sentinelRef} className="h-4" />
            )}

            {/* ローディング */}
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
}
