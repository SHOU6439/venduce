import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

const allProducts: any[] = [];

export function ProductsGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {allProducts.map((product) => (
        <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
          <Link href={`/product/${product.id}`}>
            <div className="aspect-square overflow-hidden bg-muted">
              <img src={product.image || '/placeholder.svg'} alt={product.name} className="h-full w-full object-cover transition-transform hover:scale-105" />
            </div>
          </Link>

          <div className="p-4 space-y-3">
            <div>
              <Badge variant="secondary" className="mb-2">
                {product.category}
              </Badge>
              <Link href={`/product/${product.id}`}>
                <h3 className="font-bold hover:text-primary transition-colors">{product.name}</h3>
              </Link>
              <p className="text-xl font-bold text-primary mt-1">¥{product.price.toLocaleString()}</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Heart className="h-4 w-4" />
                {product.likes.toLocaleString()}
              </span>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <ShoppingCart className="h-4 w-4 mr-1" />
                見る
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
