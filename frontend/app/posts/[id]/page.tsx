'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BackButton } from '@/components/back-button';
import { Post, Product } from '@/types/api';
import { postsApi } from '@/lib/api/posts';
import { getImageUrl } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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
          <div className="flex items-center gap-4 mb-4">
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

          {/* 関連商品 */}
          {post.asset_products && post.asset_products.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">関連商品</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from(
                  new Map(
                    post.asset_products.map((ap: any) => [
                      ap.product?.id,
                      ap.product,
                    ])
                  ).values()
                ).map((product: Product) => (
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

        {/* 戻るボタン */}
        <BackButton showLabel label="戻る" />
      </main>
    </div>
  );
}
