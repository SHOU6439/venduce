"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseInfiniteScrollOptions<T> {
  fetchMore: (
    skip: number,
    limit: number,
  ) => Promise<{ items: T[]; total: number; meta?: any }>;
  limit?: number;
  onLoad?: (items: T[]) => void;
  onError?: (error: Error) => void;
}

export interface UseInfiniteScrollResult<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  sentinelRef: React.RefObject<HTMLDivElement>;
  reset: () => void;
}

export function useInfiniteScroll<T>({
  fetchMore,
  limit = 20,
  onLoad,
  onError,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initialLoadDoneRef = useRef(false);
  const isLoadingRef = useRef(false);
  const loadedCountRef = useRef(0);

  // Initial fetch
  useEffect(() => {
    if (initialLoadDoneRef.current) return;

    const loadInitial = async () => {
      try {
        isLoadingRef.current = true;
        setError(null);
        const response = await fetchMore(0, limit);
        setItems(response.items);
        loadedCountRef.current = response.items.length;
        const totalCount = response.total ?? response.items.length;
        setTotal(totalCount);
        setHasMore(
          response.items.length === limit && response.items.length < totalCount,
        );
        onLoad?.(response.items);
        initialLoadDoneRef.current = true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intersection Observer setup
  useEffect(() => {
    const currentSentinel = sentinelRef.current;

    const handleIntersection = async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
        isLoadingRef.current = true;
        setIsLoadingMore(true);

        try {
          setError(null);
          const skip = loadedCountRef.current;
          console.log(
            `[useInfiniteScroll] Requesting from skip=${skip}, limit=${limit}`,
          );
          const response = await fetchMore(skip, limit);

          console.log(
            `[useInfiniteScroll] Fetched from skip=${skip}, limit=${limit}`,
            {
              itemsReturned: response.items.length,
              total: response.total,
              currentLoadedCount: loadedCountRef.current,
            },
          );

          // Only update if items were actually returned
          if (response.items.length > 0) {
            setItems((prev) => {
              // Check for duplicates by comparing IDs
              const existingIds = new Set(prev.map((item: any) => item.id));
              const newItems = response.items.filter(
                (item: any) => !existingIds.has(item.id),
              );
              console.log(
                `[useInfiniteScroll] Adding ${newItems.length} new items (filtered ${response.items.length - newItems.length} duplicates)`,
              );
              return [...prev, ...newItems];
            });

            // Update loaded count immediately (don't wait for state update)
            loadedCountRef.current += response.items.length;
          }

          const totalCount =
            response.total ?? loadedCountRef.current + response.items.length;
          setTotal(totalCount);
          // hasMore should be true if total items is greater than current items count
          const shouldHasMore = loadedCountRef.current < totalCount;
          console.log(
            `[useInfiniteScroll] hasMore calculation: ${loadedCountRef.current} < ${totalCount} = ${shouldHasMore}`,
          );
          setHasMore(shouldHasMore);

          onLoad?.(response.items);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("[useInfiniteScroll] Error:", error);
          setError(error);
          onError?.(error);
        } finally {
          setIsLoadingMore(false);
          isLoadingRef.current = false;
        }
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (currentSentinel) {
      observerRef.current.observe(currentSentinel);
    }

    return () => {
      if (observerRef.current && currentSentinel) {
        observerRef.current.unobserve(currentSentinel);
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, limit, onLoad, onError, fetchMore]);

  const reset = useCallback(() => {
    setItems([]);
    setIsLoading(true);
    setIsLoadingMore(false);
    setHasMore(true);
    setError(null);
    setTotal(0);
    loadedCountRef.current = 0;
    initialLoadDoneRef.current = false;
  }, []);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
    reset,
  };
}
