'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Share2, ShoppingBag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

import { productsApi } from '@/lib/api/products';
import { postsApi } from '@/lib/api/posts';
import { Product, Post } from '@/types/api';
import { formatCurrencyFromMinorUnit, getImageUrl } from '@/lib/utils';
import { PurchaseForm } from '@/components/purchase-form';

export function ProductDetails({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prodData, postsData] = await Promise.all([productsApi.getProduct(productId), postsApi.getRelatedPosts(productId)]);
        setProduct(prodData);
        setRelatedPosts(postsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!product) return <div className="p-10 text-center">商品が見つかりません</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center gap-4 px-4">
          <Link href="/feed">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 font-semibold text-lg">商品詳細</h1>
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl">
        {/* Image Gallery */}
        <div className="space-y-4 p-4">
          <div className="relative aspect-square max-h-[360px] w-full overflow-hidden rounded-lg bg-muted mx-auto">
            <img src={getImageUrl(product.images[selectedImage])} alt={product.title} className="h-full w-full object-contain" />
          </div>
          <div className="flex gap-2 justify-center overflow-x-auto">
            {product.images.map((image, index) => (
              <button key={index} onClick={() => setSelectedImage(index)} className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${selectedImage === index ? 'border-primary' : 'border-transparent'}`}>
                <img src={getImageUrl(image)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6 p-4">
          <div>
            <p className="text-sm text-muted-foreground">{product.brand?.name ?? 'ブランド未登録'}</p>
            <h2 className="mt-1 text-2xl font-bold text-balance">{product.title}</h2>
            <p className="mt-2 text-3xl font-bold text-primary">{formatCurrencyFromMinorUnit(product.price_cents, product.currency ?? 'JPY')}</p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">商品説明</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description ?? '説明が登録されていません。'}</p>
          </div>

          {/* Purchase Form */}
          <PurchaseForm product={product} />

          {/* Related Posts */}
          <div>
            <h3 className="mb-4 font-semibold">この商品を購入した人の投稿</h3>
            <div className="grid grid-cols-2 gap-4">
              {relatedPosts.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`}>
                  <Card className="overflow-hidden transition-all hover:shadow-md">
                    <img src={getImageUrl(post.assets?.[0]?.public_url ?? post.images?.[0]?.public_url ?? post.assets?.[0]?.id)} alt="関連投稿" className="aspect-square w-full object-cover" />
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={getImageUrl(post.user?.avatar_url ?? undefined)} />
                          <AvatarFallback>{post.user?.username?.charAt(0) ?? '?'}</AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium">{post.user?.username ?? '匿名ユーザー'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
