'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import Link from 'next/link';

import { postsApi } from '@/lib/api/posts';
import { Post, Product } from '@/types/api';
import { formatCurrencyFromMinorUnit, getImageUrl } from '@/lib/utils';

interface RankedProduct {
  product: Product;
  likes: number;
}

export function LikedProducts() {
  const [items, setItems] = useState<RankedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const posts = await postsApi.getPosts();
        const map = new Map<string, RankedProduct>();

        posts.forEach((post: Post) => {
          post.products.forEach((product) => {
            const key = product.id;
            const entry = map.get(key);
            if (entry) {
              entry.likes += post.like_count;
            } else {
              map.set(key, {
                product,
                likes: post.like_count,
              });
            }
          });
        });

        const ranked = Array.from(map.values())
          .sort((a, b) => b.likes - a.likes)
          .slice(0, 5);

        setItems(ranked);
        setError(null);
      } catch (err) {
        console.error('Failed to load liked products', err);
        setError(err instanceof Error ? err.message : '人気商品を取得できませんでした');
      }
    };

    load();
  }, []);

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">いいねされた商品がまだありません。</div>;
  }

  return (
    <div className="space-y-3">
      {items.map(({ product, likes }, index) => (
        <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <Link href={`/product/${product.id}`}>
            <div className="flex gap-3 p-3">
              <div className="relative flex-shrink-0">
                {index < 3 && <Badge className="absolute -top-1 -left-1 bg-pink-500 text-white z-10 h-5 w-5 p-0 flex items-center justify-center text-xs">{index + 1}</Badge>}
                <div className="w-20 h-20 overflow-hidden bg-muted rounded">
                  <img src={getImageUrl(product.images?.[0])} alt={product.title} className="h-full w-full object-cover" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm hover:text-primary transition-colors line-clamp-2">{product.title}</h3>
                <p className="text-lg font-bold text-primary mt-1">{formatCurrencyFromMinorUnit(product.price_cents, product.currency ?? 'JPY')}</p>

                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                  <span className="font-semibold text-pink-500">{likes.toLocaleString()}</span>
                  <span>いいね</span>
                </div>
              </div>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
}
