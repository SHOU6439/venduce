'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { productsApi } from '@/lib/api/products';
import { Product } from '@/types/api';
import { formatCurrencyFromMinorUnit, getImageUrl } from '@/lib/utils';

export function TrendingProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await productsApi.getTrendingProducts(5);
        setItems(list);
        setError(null);
      } catch (err) {
        console.error('Failed to load trending products', err);
        setError(err instanceof Error ? err.message : 'ランキングを取得できませんでした');
      }
    };

    load();
  }, []);

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">表示できる商品がありません。</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((product, index) => (
        <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <Link href={`/product/${product.id}`}>
            <div className="flex gap-3 p-2.75">
              <div className="relative flex-shrink-0">
                {index < 3 && <Badge className="absolute -top-1 -left-1 bg-accent text-accent-foreground z-10 h-5 w-5 p-0 flex items-center justify-center text-xs">{index + 1}</Badge>}
                <div className="w-20 h-20 overflow-hidden bg-muted rounded flex items-center justify-center">
                  <img src={getImageUrl(product.images?.[0])} alt={product.title} className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-bold text-sm hover:text-primary transition-colors line-clamp-2">{product.title}</h3>
                <p className="text-lg font-bold text-primary mt-1">{formatCurrencyFromMinorUnit(product.price_cents, product.currency ?? 'JPY')}</p>
                <div className="flex items-center gap-3 text-xs mt-2 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    <span>{Math.max(product.stock_quantity, 0)}点在庫</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                    在庫: {product.stock_quantity}
                  </Badge>
                </div>
              </div>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
}
