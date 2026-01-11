import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import Link from 'next/link';

const LIKED_PRODUCTS: any[] = [];

export function LikedProducts() {
  return (
    <div className="space-y-3">
      {LIKED_PRODUCTS.map((product, index) => (
        <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <Link href={`/product/${product.id}`}>
            <div className="flex gap-3 p-3">
              <div className="relative flex-shrink-0">
                {index < 3 && <Badge className="absolute -top-1 -left-1 bg-pink-500 text-white z-10 h-5 w-5 p-0 flex items-center justify-center text-xs">{index + 1}</Badge>}
                <div className="w-20 h-20 overflow-hidden bg-muted rounded">
                  <img src={product.image || '/placeholder.svg'} alt={product.name} className="h-full w-full object-cover" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                <p className="text-lg font-bold text-primary mt-1">¥{product.price.toLocaleString()}</p>

                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
                  <span className="font-semibold text-pink-500">{product.likes.toLocaleString()}</span>
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
