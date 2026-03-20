'use client';

import { BackButton } from '@/components/back-button';
import { Header } from '@/components/header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostMenu } from '@/components/post-menu';
import { postsApi } from '@/lib/api/posts';
import { getImageUrl } from '@/lib/utils';
import { Post, Product } from '@/types/api';
import { Loader2, ShoppingCart, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LikeAnimation from '@/components/animation/likeAnimation';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PurchaseForm } from '@/components/purchase-form';
import { useAuthStore } from '@/stores/auth';

import { CommentList } from '@/features/comments/components/CommentList';
import { HashtagCaption } from '@/components/hashtag-caption';

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
    router.push(`/product/${productId}?referringPostId=${paramId}`);
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
        <main className="container mx-auto px-4 py-8 max-w-2xl flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
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
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg px-2 py-1 -mx-2"
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

            <PostMenu
              post={post}
              onUpdated={setPost}
              redirectAfterDelete="/feed"
            />
          </div>

          <p className="text-foreground mb-4 whitespace-pre-wrap">
            <HashtagCaption caption={post.caption} />
          </p>

          {post.assets && post.assets.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {post.assets.map((asset) => {
                const linkedProduct = post.asset_products?.find(
                  (ap) => ap.asset?.id === asset.id
                )?.product ?? null;
                return (
                  <div key={asset.id} className="relative rounded-lg overflow-hidden bg-muted aspect-square">
                    <img
                      src={getImageUrl(asset.public_url || '')}
                      alt="投稿画像"
                      className="w-full h-full object-cover"
                    />
                    {linkedProduct && (
                      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-2 py-2">
                        <p className="text-white text-xs font-medium truncate flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3 shrink-0" />
                          {linkedProduct.title}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* いいねボタン */}
          <div className="flex items-center gap-2 mb-4">
            <LikeAnimation
              isLiked={post.liked_by_me ?? false}
              onToggle={handleLikeToggle}
              sizeClass="w-7 h-7"
            />
            <span className="text-sm font-semibold">{post.like_count ?? 0}</span>
          </div>

          {/* 関連商品 */}
          {post.asset_products && post.asset_products.some((ap: any) => ap.product) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">関連商品</h3>
              <div className="space-y-3">
                {post.asset_products
                  .filter((ap: any) => ap.product)
                  .reduce((acc: any[], ap: any) => {
                    if (!acc.find((x) => x.product?.id === ap.product?.id)) acc.push(ap);
                    return acc;
                  }, [])
                  .map((ap: any) => (
                  <div
                    key={ap.product.id}
                    className="flex gap-3 items-center rounded-lg border p-2"
                  >
                    {/* 紐付いた投稿画像のサムネイル */}
                    <div className="h-16 w-16 shrink-0 rounded overflow-hidden bg-muted">
                      <img
                        src={getImageUrl(ap.asset?.public_url || '')}
                        alt={ap.product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* 商品情報 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{ap.product.title}</p>
                      <p className="text-sm font-semibold text-primary mt-0.5">
                        ¥{(ap.product.price_cents / 100).toLocaleString()}
                      </p>
                    </div>
                    {/* アクションボタン */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        onClick={() => handleProductClick(ap.product.id)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        詳細
                      </Button>
                      {isAuthenticated && (
                        <Button
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => {
                            setSelectedProduct(ap.product);
                            setPurchaseModalOpen(true);
                          }}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          購入
                        </Button>
                      )}
                    </div>
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

      {/* 購入モーダル */}
      <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>商品を購入</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <PurchaseForm product={selectedProduct} referringPostId={paramId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
