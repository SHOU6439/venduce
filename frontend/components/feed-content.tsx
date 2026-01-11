'use client';

import { useState, useEffect } from 'react';
import { Heart, ShoppingBag, ShoppingCart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';

import { postsApi } from '@/lib/api/posts';
import { Post } from '@/types/api';
import { getImageUrl, cn } from '@/lib/utils';

export function FeedContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await postsApi.getPosts();
        setPosts(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setError(err instanceof Error ? err.message : '投稿を取得できませんでした');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">読み込み中...</div>;
  }

  if (error) {
    return <div className="flex justify-center p-8 text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 flex flex-col items-center mt-6 mb-6">
      {posts.map((post) => (
        <article key={post.id} className="w-[50%] overflow-hidden border-b border-border bg-card pb-4 md:rounded-xl md:border">
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

          {/* Post Image */}
          <div className="relative">
            <img src={getImageUrl(post.assets?.[0]?.public_url ?? post.images?.[0]?.public_url ?? post.assets?.[0]?.id)} alt="投稿画像" className="w-full aspect-video object-cover" />

            {/* Tagged Products Overlay */}
            {post.products && post.products.length > 0 && (
              <Link href={`/product/${post.products[0].id}`} className={cn(buttonVariants({ size: 'sm' }), 'absolute bottom-4 right-4 gap-1.5 px-3 z-10 shadow-md')}>
                <ShoppingCart className="h-4 w-4 mr-1" />
                詳細
              </Link>
            )}
          </div>

          {/* Actions & Caption */}
          <div className="px-3 pt-3">
            <div className="mb-2 flex gap-4">
              <Button variant="ghost" size="icon" className="-ml-2">
                <Heart className="h-6 w-6" />
              </Button>
            </div>

            <p className="mb-1 text-sm font-semibold">{post.like_count} likes</p>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-semibold mr-2">{post.user?.username ?? '匿名ユーザー'}</span>
                {post.caption ?? ''}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
