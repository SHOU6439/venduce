"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseInfiniteScrollOptions<T, C = any> {
  fetchMore: (
    cursor: C | undefined | null,
    limit: number,
  ) => Promise<{ items: T[]; nextCursor?: C | null; total?: number }>;
  limit?: number;
  initialCursor?: C;
  onLoad?: (items: T[]) => void;
  onError?: (error: Error) => void;
}

export interface UseInfiniteScrollResult<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  sentinelRef: (el: HTMLDivElement | null) => void;
  reset: () => void;
}

export function useInfiniteScroll<T, C = string | number>({
  fetchMore,
  limit = 20,
  initialCursor,
  onLoad,
  onError,
}: UseInfiniteScrollOptions<T, C>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const nextCursorRef = useRef<C | undefined | null>(initialCursor);
  const initialLoadDoneRef = useRef(false);
  const isLoadingRef = useRef(false);

  // refs 経由で最新値にアクセスし、不要な deps/closure 問題を回避する
  const hasMoreRef = useRef(true);
  const sentinelVisibleRef = useRef(false);
  const fetchMoreRef = useRef(fetchMore);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  useEffect(() => { fetchMoreRef.current = fetchMore; }, [fetchMore]);
  useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // hasMore state と ref を同期する
  const updateHasMore = useCallback((val: boolean) => {
    hasMoreRef.current = val;
    setHasMore(val);
  }, []);

  // 次ページロード。ロード完了後に sentinel がまだ見えていれば再トリガー。
  const loadNextRef = useRef<() => void>(() => {});
  const loadNext = useCallback(async () => {
    if (!hasMoreRef.current || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoadingMore(true);
    try {
      setError(null);
      const cursor = nextCursorRef.current;
      if (cursor === null) return;

      const response = await fetchMoreRef.current(cursor, limit);

      if (response.items.length > 0) {
        setItems((prev) => {
          const existingIds = new Set(prev.map((item: any) => item.id));
          const newItems = response.items.filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }

      nextCursorRef.current = response.nextCursor;
      if (response.nextCursor !== undefined) {
        updateHasMore(response.nextCursor !== null);
      } else {
        updateHasMore(response.items.length >= limit);
      }

      onLoadRef.current?.(response.items);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[useInfiniteScroll] Error:", error);
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setIsLoadingMore(false);
      isLoadingRef.current = false;
      // ロード完了後も sentinel がまだ視野内なら続けてロード
      if (sentinelVisibleRef.current && hasMoreRef.current) {
        loadNextRef.current();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, updateHasMore]);

  useEffect(() => { loadNextRef.current = loadNext; }, [loadNext]);

  // コールバック ref: sentinel が DOM に追加されたタイミングで observer をセットアップ。
  // useEffect([], []) では初回マウント時に sentinel が存在しない（isLoading=true 中）ため
  // callback ref で「DOM に mount された瞬間」に確実に observe する。
  const sentinelRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        sentinelVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          loadNextRef.current();
        }
      },
      { root: null, rootMargin: "100px", threshold: 0.1 },
    );
    observerRef.current.observe(el);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadNext は loadNextRef 経由なので deps 不要

  const loadInitial = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchMoreRef.current(initialCursor, limit);

      setItems(response.items);
      nextCursorRef.current = response.nextCursor;
      if (response.nextCursor !== undefined) {
        updateHasMore(response.nextCursor !== null);
      } else {
        updateHasMore(response.items.length >= limit);
      }

      onLoadRef.current?.(response.items);
      initialLoadDoneRef.current = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      // 初回ロード完了後も sentinel が視野内なら続けてロード
      if (sentinelVisibleRef.current && hasMoreRef.current) {
        loadNextRef.current();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCursor, limit, updateHasMore, loadNext]);

  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    loadInitial();
  }, [loadInitial]);

  const reset = useCallback(() => {
    setItems([]);
    setIsLoading(true);
    setIsLoadingMore(false);
    updateHasMore(true);
    setError(null);
    nextCursorRef.current = initialCursor;
    initialLoadDoneRef.current = false;
    loadInitial();
  }, [initialCursor, updateHasMore, loadInitial]);

  return {
    items,
    setItems,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
    reset,
  };
}
