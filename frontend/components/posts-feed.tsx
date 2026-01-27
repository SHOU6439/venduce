'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import { postsApi } from '@/lib/api/posts';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { Post } from '@/types/api';
import { getImageUrl } from '@/lib/utils';

export default function PostsFeed() {
  const { items: posts, isLoading, isLoadingMore, hasMore, error, sentinelRef } = useInfiniteScroll({
    fetchMore: async (skip, limit) => {
      const response = await postsApi.getPostsInfinite({
        skip,
        limit,
      });
      return {
        items: response.items,
        total: response.meta.returned + skip + (response.meta.has_more ? limit : 0),
      };
    },
    limit: 20,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">投稿を読み込み中です...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">エラーが発生しました: {error.message}</div>;
  }

  if (posts.length === 0 && !isLoading) {
    return <div className="text-center py-8 text-muted-foreground">投稿がありません。</div>;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP');
  };

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-all">
            {/* ユーザー情報 */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {post.user?.username?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${post.user?.id}`}>
                    <p className="font-semibold hover:text-primary transition-colors truncate">
                      {post.user?.username ?? 'ユーザー'}
                    </p>
                  </Link>
                  <p className="text-sm text-muted-foreground">{formatDate(post.created_at)}</p>
                </div>
              </div>
            </div>

            {/* 投稿内容 */}
            <div className="p-4 space-y-3">
              <Link href={`/posts/${post.id}`}>
                <p className="text-foreground hover:text-primary transition-colors cursor-pointer">
                  {post.caption}
                </p>
              </Link>

              {/* 投稿画像 */}
              {post.assets && post.assets.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {post.assets.slice(0, 4).map((asset) => (
                    <Link key={asset.id} href={`/posts/${post.id}`}>
                      <div className="aspect-square overflow-hidden rounded-md bg-muted cursor-pointer hover:opacity-90 transition">
                        <img
                          src={getImageUrl(asset.public_url)}
                          alt="投稿画像"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* タグ */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <span key={tag.id} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* アクション */}
            <div className="px-4 py-3 border-t flex gap-4 text-muted-foreground">
              <button className="flex items-center gap-1 hover:text-red-600 transition-colors text-sm">
                <Heart className="h-4 w-4" />
                <span>いいね</span>
              </button>
              <button className="flex items-center gap-1 hover:text-blue-600 transition-colors text-sm">
                <MessageCircle className="h-4 w-4" />
                <span>コメント</span>
              </button>
              <button className="flex items-center gap-1 hover:text-blue-600 transition-colors text-sm">
                <Share2 className="h-4 w-4" />
                <span>シェア</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="mt-8 py-4 text-center">
        {isLoadingMore && (
          <div className="text-sm text-muted-foreground">投稿を読み込み中...</div>
        )}
        {!hasMore && posts.length > 0 && (
          <div className="text-sm text-muted-foreground">すべての投稿を表示しました。</div>
        )}
      </div>
    </>
  );
}
