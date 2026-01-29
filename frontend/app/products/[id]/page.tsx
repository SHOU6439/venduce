'use client';

import { useParams } from 'next/navigation';
import { ProductDetails } from '@/components/product-details';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  return <ProductDetails productId={productId} />;
}
