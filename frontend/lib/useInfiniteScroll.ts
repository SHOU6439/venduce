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
  sentinelRef: React.RefObject<HTMLDivElement | null>;
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

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nextCursorRef = useRef<C | undefined | null>(initialCursor);
  const initialLoadDoneRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadInitial = useCallback(async () => {
    if (isLoadingRef.current) return;
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      const cursor = initialCursor;
      const response = await fetchMore(cursor, limit);
      
      setItems(response.items);
      nextCursorRef.current = response.nextCursor;
      
      if (response.nextCursor !== undefined) {
         setHasMore(response.nextCursor !== null);
      } else {
         setHasMore(response.items.length >= limit);
      }

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
  }, [fetchMore, limit, initialCursor, onLoad, onError]);

  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const currentSentinel = sentinelRef.current;

    const handleIntersection = async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
        isLoadingRef.current = true;
        setIsLoadingMore(true);

        try {
          setError(null);
          const cursor = nextCursorRef.current;
          
          if (cursor === null && hasMore) {
             isLoadingRef.current = false;
             setIsLoadingMore(false);
             return; 
          }

          const response = await fetchMore(cursor, limit);

          if (response.items.length > 0) {
            setItems((prev) => {
              const existingIds = new Set(prev.map((item: any) => item.id));
              const newItems = response.items.filter(
                (item: any) => !existingIds.has(item.id),
              );
              return [...prev, ...newItems];
            });
          }

          nextCursorRef.current = response.nextCursor;

          if (response.nextCursor !== undefined) {
             setHasMore(response.nextCursor !== null);
          } else {
             setHasMore(response.items.length >= limit);
          }
           
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
    nextCursorRef.current = initialCursor;
    initialLoadDoneRef.current = false;
    loadInitial();
  }, [initialCursor, loadInitial]);

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
