'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants, Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { postsApi } from '@/lib/api/posts';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Post, Product } from '@/types/api';
import { getImageUrl, cn } from '@/lib/utils';
import LikeAnimation from '@/components/animation/likeAnimation';
import { PurchaseForm } from '@/components/purchase-form';

interface PostItemProps {
  post: Post;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
}

function PostItem({ post, onLikeToggle }: PostItemProps) {
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

  return (
    <article className="w-[50%] overflow-hidden border-b border-border bg-card pb-4 md:rounded-xl md:border">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={getImageUrl(post.user?.avatar_url ?? undefined)} />
            <AvatarFallback>{post.user?.username?.[0] ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="font-semibold text-sm">{post.user?.username ?? '匿名ユーザー'}</p>
          </div>
        </div>
      </div>

      {/* Post Image(s) */}
      <div className="relative aspect-video w-full bg-muted">
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
                      <div className="absolute bottom-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/product/${linkedProduct.id}`} className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 px-3 shadow-md bg-white/90 text-black hover:bg-white')}>
                          <ShoppingCart className="h-4 w-4" />
                          詳細
                        </Link>
                        <Button
                          size="sm"
                          className="gap-1.5 px-3 shadow-md bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => {
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
      <div className="px-3 pt-3">
        <div className="mb-2 flex gap-4 items-center">
          <div className="-ml-3">
            <LikeAnimation isLiked={post.liked_by_me ?? false} onToggle={(isLiked) => onLikeToggle(post.id, isLiked)} sizeClass="w-7 h-7" />
          </div>
          {/* 他のアクションボタンが必要な場合はここに追加 */}
        </div>

        <p className="mb-1 text-sm font-semibold">{post.like_count ?? 0} likes</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-semibold mr-2">{post.user?.username ?? 'ユーザー'}</span>
            {post.caption?.split(/(\s+|#[^\s#]+)/g).map((part, i) => {
              if (part.startsWith('#')) {
                return (
                  <span key={i} className="text-blue-500 font-medium mr-0.5">
                    {part}
                  </span>
                );
              }
              return part;
            })}
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
  const {
    items: posts,
    setItems: setPosts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
  } = useInfiniteScroll<Post>({
    limit: 10,
    fetchMore: async (cursor, limit) => {
      const response = await postsApi.getPostsInfinite({ cursor: cursor as string, limit });
      
      return {
        items: response.items,
        nextCursor: response.meta.next_cursor,
      };
    },
  });

  const handleLikeToggle = (postId: string, isLiked: boolean) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const newCount = isLiked ? (post.like_count || 0) + 1 : Math.max(0, (post.like_count || 0) - 1);
          return {
            ...post,
            liked_by_me: isLiked,
            like_count: newCount,
          };
        }
        return post;
      })
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">読み込み中...</div>;
  }

  if (error) {
    return <div className="flex justify-center p-8 text-sm text-destructive">{error.message}</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 flex flex-col items-center mt-6 mb-6">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} onLikeToggle={handleLikeToggle} />
      ))}
      
      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="w-full h-10 flex items-center justify-center">
        {isLoadingMore && <div className="text-sm text-muted-foreground">追加読み込み中...</div>}
        {!hasMore && posts.length > 0 && <div className="text-sm text-muted-foreground p-4">すべての投稿を表示しました</div>}
        {!hasMore && posts.length === 0 && <div className="text-sm text-muted-foreground p-4">投稿がありません</div>}
      </div>
    </div>
  );
}
