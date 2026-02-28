'use client';

import { BackButton } from '@/components/back-button';
import { Header } from '@/components/header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { postsApi } from '@/lib/api/posts';
import { getImageUrl } from '@/lib/utils';
import { Post, Product } from '@/types/api';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LikeAnimation from '@/components/animation/likeAnimation';
import { ApiError } from '@/lib/api/client';

import { CommentList } from '@/features/comments/components/CommentList';

interface PostDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PostDetail({ params }: PostDetailPageProps) {
  const router = useRouter();
  const [paramId, setParamId] = useState<string>('');
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setParamId(id);
    })();
  }, [params]);

  useEffect(() => {
    if (!paramId) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await postsApi.getPost(paramId);
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '投稿の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [paramId]);

  const handleProductClick = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  const handleLikeToggle = async (isLiked: boolean) => {
    if (!post) return;
    // 楽観的更新
    setPost((prev) =>
      prev
        ? {
            ...prev,
            liked_by_me: isLiked,
            like_count: isLiked
              ? (prev.like_count || 0) + 1
              : Math.max(0, (prev.like_count || 0) - 1),
          }
        : prev
    );
    try {
      if (isLiked) {
        await postsApi.likePost(post.id);
      } else {
        await postsApi.unlikePost(post.id);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }
      console.error('いいねの更新に失敗しました', err);
      // ロールバック
      setPost((prev) =>
        prev
          ? {
              ...prev,
              liked_by_me: !isLiked,
              like_count: isLiked
                ? Math.max(0, (prev.like_count || 0) - 1)
                : (prev.like_count || 0) + 1,
            }
          : prev
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="rounded-lg bg-red-50 p-4 text-red-700 mb-4">
            {error || '投稿が見つかりません'}
          </div>
          <BackButton showLabel label="戻る" />
        </main>
      </div>
    );
  }

  const createdAt = new Date(post.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 投稿 */}
        <div className="bg-card rounded-lg border p-6 mb-6">
          <div
            className="flex items-center gap-4 mb-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg px-2 py-1 -mx-2"
            onClick={() => {
              if (post.user?.username) router.push(`/users/${post.user.username}`);
            }}
          >
            <Avatar>
              <AvatarImage src={getImageUrl(post.user?.avatar_url ?? undefined)} />
              <AvatarFallback>{post.user?.username?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{post.user?.username ?? 'ユーザー'}</p>
              <p className="text-sm text-muted-foreground">{createdAt}</p>
            </div>
          </div>

          <p className="text-foreground mb-4 whitespace-pre-wrap">{post.caption}</p>

          {post.assets && post.assets.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {post.assets.map((asset) => (
                <div key={asset.id} className="rounded-lg overflow-hidden bg-muted aspect-square">
                  <img
                    src={getImageUrl(asset.public_url || '')}
                    alt="投稿画像"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* いいねボタン */}
          <div className="flex items-center gap-2 mb-4">
            <LikeAnimation
              isLiked={post.liked_by_me ?? false}
              onToggle={handleLikeToggle}
              sizeClass="w-7 h-7"
            />
            <span className="text-sm font-semibold">{post.like_count ?? 0} likes</span>
          </div>

          {/* 関連商品 */}
          {post.asset_products && post.asset_products.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">関連商品</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {post.asset_products
                  .filter((ap: any) => ap.product)
                  .map((ap: any) => ap.product)
                  .reduce((acc: Product[], current: Product) => {
                     if (!acc.find(p => p.id === current.id)) {
                       acc.push(current);
                     }
                     return acc;
                  }, [])
                  .map((product: Product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    className="rounded-lg border p-2 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square rounded bg-muted mb-2 overflow-hidden flex items-center justify-center">
                      {product.assets && product.assets.length > 0 && (
                        <img
                          src={getImageUrl(product.assets[0].public_url || '')}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{product.title}</p>
                    <p className="text-xs text-muted-foreground">¥{(product.price_cents / 100).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* コメント */}
        <div className="bg-card rounded-lg border p-6 mb-6">
          <CommentList postId={post.id} />
        </div>

        {/* 戻るボタン */}
        <BackButton showLabel label="戻る" />
      </main>
    </div>
  );
}
