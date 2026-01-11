'use client';

import { useState } from 'react';
import { ArrowLeft, Heart, Share2, ShoppingBag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

const MOCK_PRODUCTS: Record<
  string,
  {
    id: string;
    name: string;
    brand: string;
    price: number;
    description: string;
    images: string[];
    category: string;
    relatedPosts: any[];
  }
> = {};

export function ProductDetails({ productId }: { productId: string }) {
  const product = MOCK_PRODUCTS[productId];
  const [selectedImage, setSelectedImage] = useState(0);
  const [liked, setLiked] = useState(false);

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">商品が見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center gap-4 px-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/feed">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="flex-1 font-semibold text-lg">商品詳細</h1>
          <Button variant="ghost" size="icon" onClick={() => setLiked(!liked)}>
            <Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl">
        {/* Image Gallery */}
        <div className="space-y-4 p-4">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            <img src={product.images[selectedImage] || '/placeholder.svg'} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((image, index) => (
              <button key={index} onClick={() => setSelectedImage(index)} className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${selectedImage === index ? 'border-primary' : 'border-transparent'}`}>
                <img src={image || '/placeholder.svg'} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6 p-4">
          <div>
            <p className="text-sm text-muted-foreground">{product.brand}</p>
            <h2 className="mt-1 text-2xl font-bold text-balance">{product.name}</h2>
            <p className="mt-2 text-3xl font-bold text-primary">¥{product.price.toLocaleString()}</p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">商品説明</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">カテゴリー: {product.category}</p>
          </div>

          {/* Related Posts */}
          <div>
            <h3 className="mb-4 font-semibold">この商品を購入した人の投稿</h3>
            <div className="grid grid-cols-2 gap-4">
              {product.relatedPosts.map((post) => (
                <Link key={post.id} href="/feed">
                  <Card className="overflow-hidden transition-all hover:shadow-md">
                    <img src={post.image || '/placeholder.svg'} alt="関連投稿" className="aspect-square w-full object-cover" />
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={post.user.avatar || '/placeholder.svg'} />
                          <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium">{post.user.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Buy Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <Button className="w-full" size="lg">
          <ShoppingBag className="mr-2 h-5 w-5" />
          購入する
        </Button>
      </div>
    </div>
  );
}
