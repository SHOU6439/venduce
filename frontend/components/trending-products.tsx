'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';

import { productsApi } from '@/lib/api/products';
import { TrendingProductItem } from '@/types/api';
import { formatCurrencyFromMinorUnit, getImageUrl } from '@/lib/utils';
import { useWsEvents } from '@/components/ws-provider';

const PAGE_SIZE = 10;

export function TrendingProducts({ isActive = false }: { isActive?: boolean }) {
    const ws = useWsEvents();

    const [items, setItems] = useState<TrendingProductItem[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelNodeRef = useRef<HTMLDivElement | null>(null);
    const offsetRef = useRef(0);
    const isLoadingRef = useRef(false);
    const hasMoreRef = useRef(true);

    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    // ------------------------------------------------------------------
    // データ取得
    // ------------------------------------------------------------------

    const loadInitial = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await productsApi.getTrendingProductsRanking(PAGE_SIZE, 0);
            setItems(data.items);
            setHasMore(data.has_more);
            offsetRef.current = data.items.length;
            setError(null);
        } catch (err) {
            console.error('Failed to load trending products', err);
            setError(err instanceof Error ? err.message : 'ランキングを取得できませんでした');
        } finally {
            setIsLoading(false);
            setIsInitialLoad(false);
        }
    }, []);

    const loadMore = useCallback(async () => {
        if (isLoadingRef.current || !hasMoreRef.current) return;
        isLoadingRef.current = true;
        setIsLoading(true);
        try {
            const data = await productsApi.getTrendingProductsRanking(PAGE_SIZE, offsetRef.current);
            setItems((prev) => {
                const existingIds = new Set(prev.map((i) => i.product.id));
                const newItems = data.items.filter((i) => !existingIds.has(i.product.id));
                return [...prev, ...newItems];
            });
            setHasMore(data.has_more);
            offsetRef.current += data.items.length;
        } catch (err) {
            console.error('Failed to load more trending products', err);
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, []);

    // ------------------------------------------------------------------
    // WebSocket: ランキング変動イベントでリフレッシュ
    // ------------------------------------------------------------------

    const refreshRanking = useCallback(async () => {
        const currentOffset = offsetRef.current;
        if (currentOffset === 0) return;
        try {
            const data = await productsApi.getTrendingProductsRanking(currentOffset, 0);
            setItems(data.items);
            setHasMore(currentOffset < data.total);
        } catch {
            // refresh 失敗はスルー
        }
    }, []);

    useEffect(() => {
        const handler = () => { refreshRanking(); };
        ws.addEventListener('ranking_updated', handler as any);
        return () => ws.removeEventListener('ranking_updated', handler as any);
    }, [ws, refreshRanking]);

    // ------------------------------------------------------------------
    // 初回ロード
    // ------------------------------------------------------------------

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    // ------------------------------------------------------------------
    // タブがアクティブになったとき、sentinel がビューポート内に入るまでページをロードし続ける
    // ------------------------------------------------------------------

    const fillToViewport = useCallback(async () => {
        while (hasMoreRef.current) {
            const sentinel = sentinelNodeRef.current;
            if (sentinel) {
                const rect = sentinel.getBoundingClientRect();
                if (rect.top > window.innerHeight) break;
            }
            if (isLoadingRef.current) break;
            await loadMore();
            await new Promise<void>((r) => setTimeout(r, 50));
        }
    }, [loadMore]);

    useEffect(() => {
        if (isActive && !isInitialLoad) {
            fillToViewport();
        }
    }, [isActive, isInitialLoad, fillToViewport]);

    // ------------------------------------------------------------------
    // 無限スクロール: callback ref パターン
    // ------------------------------------------------------------------

    const sentinelCallbackRef = useCallback(
        (node: HTMLDivElement | null) => {
            sentinelNodeRef.current = node;
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (!node) return;

            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0]?.isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
                        loadMore();
                    }
                },
                { threshold: 0.1 },
            );
            observerRef.current.observe(node);
        },
        [loadMore],
    );

    // ------------------------------------------------------------------
    // レンダリング
    // ------------------------------------------------------------------

    if (isInitialLoad) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return <div className="text-sm text-destructive">{error}</div>;
    }

    if (items.length === 0) {
        return <div className="text-sm text-muted-foreground">表示できる商品がありません。</div>;
    }

    return (
        <LayoutGroup>
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {items.map(({ product, total_purchases, rank }) => (
                        <motion.div
                            key={product.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{
                                layout: { type: 'spring', stiffness: 300, damping: 30 },
                                opacity: { duration: 0.25 },
                                scale: { duration: 0.25 },
                            }}
                        >
                            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                <Link href={`/product/${product.id}`}>
                                    <div className="flex gap-3 p-2.75">
                                        <div className="relative flex-shrink-0">
                                            {rank <= 3 && (
                                                <Badge className="absolute -top-1 -left-1 bg-accent text-accent-foreground z-10 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                                    {rank}
                                                </Badge>
                                            )}
                                            <div className="w-20 h-20 overflow-hidden bg-muted rounded flex items-center justify-center">
                                                <img
                                                    src={getImageUrl(product.images?.[0])}
                                                    alt={product.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h3 className="font-bold text-sm hover:text-primary transition-colors line-clamp-2">
                                                {product.title}
                                            </h3>
                                            <p className="text-lg font-bold text-primary mt-1">
                                                {formatCurrencyFromMinorUnit(product.price_cents, product.currency ?? 'JPY')}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs mt-2 text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <ShoppingCart className="h-3 w-3" />
                                                    <motion.span
                                                        key={total_purchases}
                                                        initial={{ opacity: 0, y: -6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="font-semibold"
                                                    >
                                                        {total_purchases}
                                                    </motion.span>
                                                    <span>回購入</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* sentinel */}
                {hasMore && (
                    <div ref={sentinelCallbackRef} className="flex justify-center py-4">
                        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    </div>
                )}
            </div>
        </LayoutGroup>
    );
}
