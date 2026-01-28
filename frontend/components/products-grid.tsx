'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { productsApi } from '@/lib/api/products';
import { Product } from '@/types/api';
import { formatCurrencyFromMinorUnit, getImageUrl } from '@/lib/utils';

export function ProductsGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await productsApi.listProducts({ per_page: 8, sort: 'created_at:desc' });
        setProducts(list);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch products', err);
        setError(err instanceof Error ? err.message : '商品を取得できませんでした');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">商品を読み込み中です...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">{error}</div>;
  }

  if (products.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">表示できる商品がありません。</div>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
          <Link href={`/product/${product.id}`}>
            <div className="aspect-square overflow-hidden bg-muted">
              <img src={getImageUrl(product.images[0])} alt={product.title} className="h-full w-full object-cover transition-transform hover:scale-105" />
            </div>
          </Link>

          <div className="p-4 space-y-3">
            <div>
              <Badge variant="secondary" className="mb-2">
                {product.categories?.[0]?.name ?? '未分類'}
              </Badge>
              <Link href={`/product/${product.id}`}>
                <h3 className="font-bold hover:text-primary transition-colors line-clamp-2">{product.title}</h3>
              </Link>
              <p className="text-xl font-bold text-primary mt-1">{formatCurrencyFromMinorUnit(product.price_cents, product.currency ?? 'JPY')}</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Heart className="h-4 w-4" />
                {(product.like_count ?? 0).toLocaleString()}
              </span>
              <Link href={`/product/${product.id}`}>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  詳細
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
