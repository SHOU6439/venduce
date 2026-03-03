'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ShoppingBag, Loader2 } from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';

import { usersApi } from '@/lib/api/users';
import { UserRankingItem } from '@/types/api';
import { getImageUrl } from '@/lib/utils';
import { useWsEvents } from '@/components/ws-provider';

const PAGE_SIZE = 10;

export function UserRanking({ isActive = false }: { isActive?: boolean }) {
    const router = useRouter();
    const ws = useWsEvents();

    const [users, setUsers] = useState<UserRankingItem[]>([]);
    const [prevRanks, setPrevRanks] = useState<Map<string, number>>(new Map());
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelNodeRef = useRef<HTMLDivElement | null>(null);
    const offsetRef = useRef(0);
    const isLoadingRef = useRef(false);
    const hasMoreRef = useRef(true);

    // hasMore の ref を同期
    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    // ------------------------------------------------------------------
    // データ取得
    // ------------------------------------------------------------------

    const loadInitial = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await usersApi.getUserRanking(PAGE_SIZE, 0);
            setUsers(data.items);
            setTotal(data.total);
            setHasMore(data.has_more);
            offsetRef.current = data.items.length;
            setError(null);
        } catch (err) {
            console.error('Failed to load ranking', err);
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
            const data = await usersApi.getUserRanking(PAGE_SIZE, offsetRef.current);
            setUsers((prev) => {
                const existingIds = new Set(prev.map((u) => u.user_id));
                const newItems = data.items.filter((u) => !existingIds.has(u.user_id));
                return [...prev, ...newItems];
            });
            setTotal(data.total);
            setHasMore(data.has_more);
            offsetRef.current += data.items.length;
            setError(null);
        } catch (err) {
            console.error('Failed to load more ranking', err);
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, []);

    // ------------------------------------------------------------------
    // WebSocket: ランキング変動イベントで表示中データをリフレッシュ
    // ------------------------------------------------------------------

    const refreshRanking = useCallback(async () => {
        const currentOffset = offsetRef.current;
        if (currentOffset === 0) return;
        try {
            const data = await usersApi.getUserRanking(currentOffset, 0);

            setUsers((prev) => {
                // 前回のランクをスナップショット
                setPrevRanks(() => {
                    const next = new Map<string, number>();
                    prev.forEach((u) => next.set(u.user_id, u.rank));
                    return next;
                });

                const refreshedIds = new Set(data.items.map((u) => u.user_id));
                const remaining = prev.filter((u) => !refreshedIds.has(u.user_id));
                return [...data.items, ...remaining];
            });
            setTotal(data.total);
            setHasMore(currentOffset < data.total);
        } catch {
            // refresh 失敗はスルー
        }
    }, []);

    useEffect(() => {
        const handler = () => {
            refreshRanking();
        };
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
                if (rect.top > window.innerHeight) break; // sentinel が画面下に出たら終了
            }
            if (isLoadingRef.current) break;
            await loadMore();
            // state 反映を待つ
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
    // sentinel 要素がマウントされた瞬間に observer を接続する
    // ------------------------------------------------------------------

    const sentinelCallbackRef = useCallback(
        (node: HTMLDivElement | null) => {
            sentinelNodeRef.current = node;
            // 前の observer を切断
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
    // UI ヘルパー
    // ------------------------------------------------------------------

    function RankChange({ userId, currentRank }: { userId: string; currentRank: number }) {
        const prev = prevRanks.get(userId);
        if (prev === undefined || prev === currentRank) {
            return <Minus className="h-3 w-3 text-muted-foreground" />;
        }
        if (currentRank < prev) {
            return (
                <div className="flex items-center gap-0.5 text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-[10px] font-bold">+{prev - currentRank}</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-0.5 text-red-500">
                <TrendingDown className="h-3 w-3" />
                <span className="text-[10px] font-bold">-{currentRank - prev}</span>
            </div>
        );
    }

    function getRankStyle(rank: number) {
        if (rank === 1) return 'ring-2 ring-yellow-400 shadow-yellow-400/30 shadow-lg';
        if (rank === 2) return 'ring-2 ring-gray-300 shadow-gray-300/30 shadow-md';
        if (rank === 3) return 'ring-2 ring-amber-600 shadow-amber-600/20 shadow-md';
        return '';
    }

    function getRankBadgeColor(rank: number) {
        if (rank === 1) return 'bg-yellow-400 text-yellow-900';
        if (rank === 2) return 'bg-gray-300 text-gray-700';
        if (rank === 3) return 'bg-amber-600 text-white';
        return 'bg-muted text-muted-foreground';
    }

    // ------------------------------------------------------------------
    // レンダリング
    // ------------------------------------------------------------------

    if (error && users.length === 0) {
        return <div className="text-sm text-destructive">{error}</div>;
    }

    if (isInitialLoad) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (users.length === 0) {
        return <div className="text-sm text-muted-foreground">ランキングを表示できません。</div>;
    }

    return (
        <LayoutGroup>
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {users.map((user) => (
                        <motion.div
                            key={user.user_id}
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
                            <Card
                                className={`overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer ${getRankStyle(user.rank)}`}
                                onClick={() => router.push(`/users/${user.username}`)}
                            >
                                <div className="flex gap-3 p-3">
                                    <div className="relative shrink-0">
                                        <Badge
                                            className={`absolute -top-1 -left-1 z-10 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold ${getRankBadgeColor(user.rank)}`}
                                        >
                                            {user.rank}
                                        </Badge>
                                        <div className={`w-20 h-20 overflow-hidden bg-muted rounded flex items-center justify-center border-2 ${user.rank <= 3 ? 'border-primary/40' : 'border-primary/20'}`}>
                                            {user.avatar_url ? (
                                                <img
                                                    src={getImageUrl(user.avatar_url)}
                                                    alt={user.display_name}
                                                    className="h-full w-full object-cover rounded"
                                                />
                                            ) : (
                                                <span className="text-2xl font-bold text-muted-foreground">
                                                    {user.display_name?.[0] ?? user.username[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm hover:text-primary transition-colors truncate">
                                                {user.username}
                                            </h3>
                                            <RankChange userId={user.user_id} currentRank={user.rank} />
                                        </div>
                                        <div className="flex items-center gap-3 text-xs mt-2">
                                            <div className="flex items-center gap-1">
                                                <ShoppingBag className="h-3 w-3 text-primary" />
                                                <motion.span
                                                    key={user.total_purchases}
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="font-semibold text-primary"
                                                >
                                                    {user.total_purchases.toLocaleString()}
                                                </motion.span>
                                                <span className="text-muted-foreground">購入</span>
                                            </div>
                                            <div>
                                                <motion.span
                                                    key={user.total_likes}
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="font-semibold text-primary"
                                                >
                                                    {user.total_likes.toLocaleString()} いいね
                                                </motion.span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* 無限スクロール用センチネル (callback ref で確実に observer を接続) */}
                {hasMore && <div ref={sentinelCallbackRef} className="h-4" />}

                {isLoading && (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!hasMore && users.length > 0 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                        全 {total} 人中 {users.length} 人を表示中
                    </p>
                )}
            </div>
        </LayoutGroup>
    );
}
