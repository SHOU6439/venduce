'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants, Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { postsApi } from '@/lib/api/posts';
import { followsApi } from '@/lib/api/follows';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Post, Product } from '@/types/api';
import { getImageUrl, cn } from '@/lib/utils';
import LikeAnimation from '@/components/animation/likeAnimation';
import { PurchaseForm } from '@/components/purchase-form';
import { PostMenu } from '@/components/post-menu';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import { useBadgeStore } from '@/stores/badge';
import { HashtagCaption } from '@/components/hashtag-caption';

interface PostItemProps {
  post: Post;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onPostUpdated: (updated: Post) => void;
  onPostDeleted: (postId: string) => void;
}

function PostItem({ post, onLikeToggle, onPostUpdated, onPostDeleted }: PostItemProps) {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const assets = post.assets && post.assets.length > 0 ? post.assets : post.images && post.images.length > 0 ? post.images : [];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, clientWidth } = e.currentTarget;
    if (clientWidth > 0) {
      const newIndex = Math.round(scrollLeft / clientWidth);
      setCurrentImageIndex(newIndex);
    }
  };

  const handlePostClick = () => {
    router.push(`/posts/${post.id}`);
  };

  return (
    <article className="w-full md:w-[50%] overflow-hidden border-b border-border bg-card pb-4 md:rounded-xl md:border">
      {/* Header */}
      <div className="flex items-center p-3 rounded-t-lg">
        <div
          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg px-2 py-1"
          onClick={(e) => {
            e.stopPropagation();
            if (post.user?.username) router.push(`/users/${post.user.username}`);
          }}
        >
          <Avatar>
            <AvatarImage src={getImageUrl(post.user?.avatar_url ?? undefined)} />
            <AvatarFallback>{post.user?.username?.[0] ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="font-semibold text-sm">{post.user?.username ?? '匿名ユーザー'}</p>
          </div>
        </div>
        <div
          className="ml-auto cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 min-h-9 min-w-9 flex items-center justify-center"
          onClick={handlePostClick}
          title="投稿を見る"
        >
          ›
        </div>
      </div>

      {/* Post Image(s) */}
      <div className="relative aspect-video w-full bg-muted cursor-pointer" onClick={handlePostClick}>
        {assets.length > 0 ? (
          <>
            <div className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} onScroll={handleScroll}>
              {assets.map((asset, index) => {
                const linkedProduct = post.asset_products?.find((ap) => ap.asset?.id === asset.id)?.product;
                
                return (
                  <div key={asset.id || index} className="w-full h-full flex-shrink-0 snap-center relative group">
                    <img src={getImageUrl(asset.public_url || asset.id)} alt={`投稿画像 ${index + 1}`} className="w-full h-full object-cover" />

                    {/* 画像に紐づいた商品へのボタン */}
                    {linkedProduct && (
                      <div className="absolute bottom-4 right-4 flex gap-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/product/${linkedProduct.id}?referringPostId=${post.id}`} className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 px-3 shadow-md bg-white/90 text-black hover:bg-white')}>
                          <ShoppingCart className="h-4 w-4" />
                          詳細
                        </Link>
                        <Button
                          size="sm"
                          className="gap-1.5 px-3 shadow-md bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(linkedProduct);
                            setPurchaseModalOpen(true);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          購入
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Dots */}
            {assets.length > 1 && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 z-10 pointer-events-none">
                {assets.map((_, index) => (
                  <div key={index} className={cn('h-1.5 w-1.5 rounded-full transition-all shadow-sm', index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/60')} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No Image</div>
        )}
      </div>

      {/* Actions & Caption */}
      <div className="px-3 pt-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={handlePostClick}>
        <div className="mb-2 flex items-center">
          <div className="-ml-3" onClick={(e) => e.stopPropagation()}>
            <LikeAnimation isLiked={post.liked_by_me ?? false} onToggle={(isLiked) => onLikeToggle(post.id, isLiked)} sizeClass="w-7 h-7" />
          </div>
          <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
            <PostMenu
              post={post}
              onUpdated={onPostUpdated}
              onDeleted={onPostDeleted}
            />
          </div>
        </div>

        <p className="mb-1 text-sm font-semibold">{post.like_count ?? 0}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span
              className="font-semibold mr-2 cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                if (post.user?.username) router.push(`/users/${post.user.username}`);
              }}
            >
              {post.user?.username ?? 'ユーザー'}
            </span>
            <HashtagCaption caption={post.caption} />
          </p>
        </div>
      </div>

      <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>商品を購入</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <PurchaseForm product={selectedProduct} referringPostId={post.id} />
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function FeedContent() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => !!state.user);
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');

  // fetchMore を useCallback で安定化。インラインで定義すると badge store 更新のたびに
  // 新しい関数参照が生まれ、IntersectionObserver が disconnect/reconnect を繰り返してしまう。
  const fetchDiscoverPosts = useCallback(async (cursor: any, limit: number) => {
    const response = await postsApi.getPostsInfinite({ cursor: cursor as string, limit });
    return {
      items: response.items,
      nextCursor: response.meta.next_cursor,
    };
  }, []);

  const fetchFollowingPosts = useCallback(async (cursor: any, limit: number) => {
    const response = await followsApi.getFollowFeed(cursor as string | undefined, limit);
    return {
      items: response.items,
      nextCursor: response.meta.next_cursor,
    };
  }, []);

  // おすすめフィード
  const {
    items: discoverPosts,
    setItems: setDiscoverPosts,
    isLoading: discoverLoading,
    isLoadingMore: discoverLoadingMore,
    hasMore: discoverHasMore,
    error: discoverError,
    sentinelRef: discoverSentinelRef,
  } = useInfiniteScroll<Post>({
    limit: 10,
    fetchMore: fetchDiscoverPosts,
  });

  // フォロー中フィード
  const {
    items: followingPosts,
    setItems: setFollowingPosts,
    isLoading: followingLoading,
    isLoadingMore: followingLoadingMore,
    hasMore: followingHasMore,
    error: followingError,
    sentinelRef: followingSentinelRef,
  } = useInfiniteScroll<Post>({
    limit: 10,
    fetchMore: fetchFollowingPosts,
  });

  const triggerOptimistic = useBadgeStore((state) => state.triggerOptimistic);
  const ownedSlugs = useBadgeStore((state) => state.ownedSlugs);
  const isOwnedSlugsLoaded = useBadgeStore((state) => state.isOwnedSlugsLoaded);
  const user = useAuthStore((state) => state.user);

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    const updatePosts = (setter: React.Dispatch<React.SetStateAction<Post[]>>) => {
      setter((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const newCount = isLiked ? (post.like_count || 0) + 1 : Math.max(0, (post.like_count || 0) - 1);
            return { ...post, liked_by_me: isLiked, like_count: newCount };
          }
          return post;
        })
      );
    };

    // 楽観的更新
    updatePosts(setDiscoverPosts);
    updatePosts(setFollowingPosts);

    // はじめてのいいねバッジを楽観的に即時表示
    // ログイン済み かつ ownedSlugs のロード完了後にのみ発火（未ログイン時の誤発火防止）
    if (isLiked && user && isOwnedSlugsLoaded && !ownedSlugs.has('first-like')) {
      triggerOptimistic('first-like');
    }

    try {
      if (isLiked) {
        await postsApi.likePost(postId);
      } else {
        await postsApi.unlikePost(postId);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push('/login');
        return;
      }
      console.error("いいねの更新に失敗しました", error);
      // ロールバック
      const revert = (setter: React.Dispatch<React.SetStateAction<Post[]>>) => {
        setter((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id === postId) {
              const revertedCount = isLiked
                ? Math.max(0, (post.like_count || 0) - 1)
                : (post.like_count || 0) + 1;
              return { ...post, liked_by_me: !isLiked, like_count: revertedCount };
            }
            return post;
          })
        );
      };
      revert(setDiscoverPosts);
      revert(setFollowingPosts);
    }
  };

  const handlePostUpdated = (updated: Post) => {
    const replacer = (setter: React.Dispatch<React.SetStateAction<Post[]>>) => {
      setter((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    };
    replacer(setDiscoverPosts);
    replacer(setFollowingPosts);
  };

  const handlePostDeleted = (postId: string) => {
    const remover = (setter: React.Dispatch<React.SetStateAction<Post[]>>) => {
      setter((prev) => prev.filter((p) => p.id !== postId));
    };
    remover(setDiscoverPosts);
    remover(setFollowingPosts);
  };

  const renderFeed = (
    posts: Post[],
    isLoading: boolean,
    isLoadingMore: boolean,
    hasMore: boolean,
    error: Error | null,
    sentinelRef: (el: HTMLDivElement | null) => void,
  ) => {
    if (isLoading) {
      return <div className="flex justify-center p-8">読み込み中...</div>;
    }
    if (error) {
      return <div className="flex justify-center p-8 text-sm text-destructive">{error.message}</div>;
    }
    return (
      <div className="space-y-4 md:space-y-6 flex flex-col items-center mt-6 mb-6">
        {posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            onLikeToggle={handleLikeToggle}
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
          />
        ))}
        <div ref={sentinelRef} className="w-full h-10 flex items-center justify-center">
          {isLoadingMore && <div className="text-sm text-muted-foreground">追加読み込み中...</div>}
          {!hasMore && posts.length > 0 && <div className="text-sm text-muted-foreground p-4">すべての投稿を表示しました</div>}
          {!hasMore && posts.length === 0 && <div className="text-sm text-muted-foreground p-4">投稿がありません</div>}
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    // 未ログインではおすすめのみ
    return renderFeed(discoverPosts, discoverLoading, discoverLoadingMore, discoverHasMore, discoverError, discoverSentinelRef);
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'discover' | 'following')} className="w-full">
      <TabsList className="w-full justify-center rounded-none border-b border-border bg-transparent p-0">
        <TabsTrigger
          value="discover"
          className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          おすすめ
        </TabsTrigger>
        <TabsTrigger
          value="following"
          className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          フォロー中
        </TabsTrigger>
      </TabsList>

      <TabsContent value="discover" className="mt-0">
        {renderFeed(discoverPosts, discoverLoading, discoverLoadingMore, discoverHasMore, discoverError, discoverSentinelRef)}
      </TabsContent>

      <TabsContent value="following" className="mt-0">
        {renderFeed(followingPosts, followingLoading, followingLoadingMore, followingHasMore, followingError, followingSentinelRef)}
      </TabsContent>
    </Tabs>
  );
}
