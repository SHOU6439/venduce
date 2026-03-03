import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  pageSize?: number;
  skip?: boolean;
}

export interface UseInfiniteScrollResult<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: Error | null;
  loadNextPage: () => Promise<void>;
}

export function useInfiniteScroll<T, R extends { items: T[]; meta: { next_cursor?: string | null; has_more: boolean } }>(
  loadMore: (cursor?: string | null) => Promise<R>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const prevSkipRef = useRef(options.skip ?? false);

  // 初回ロード
  useEffect(() => {
    // skip が true → false に変化したら初期化フラグをリセット（auth 確定後の再ロードに対応）
    if (prevSkipRef.current && !options.skip) {
      hasInitialized.current = false;
    }
    prevSkipRef.current = options.skip ?? false;

    if (options.skip || hasInitialized.current) return;

    hasInitialized.current = true;
    const initialLoad = async () => {
      setIsLoading(true);
      try {
        const result = await loadMore(null);
        setItems(result.items);
        setNextCursor(result.meta.next_cursor ?? null);
        setHasMore(result.meta.has_more);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load'));
      } finally {
        setIsLoading(false);
      }
    };

    initialLoad();
  }, [loadMore, options.skip]);

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore || !nextCursor) return;

    setIsLoading(true);
    try {
      const result = await loadMore(nextCursor);
      setItems((prev) => [...prev, ...result.items]);
      setNextCursor(result.meta.next_cursor ?? null);
      setHasMore(result.meta.has_more);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'));
    } finally {
      setIsLoading(false);
    }
  }, [loadMore, isLoading, hasMore, nextCursor]);

  return {
    items,
    isLoading,
    hasMore,
    error,
    loadNextPage,
  };
}
