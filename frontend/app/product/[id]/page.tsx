import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Header } from "@/components/header"
import { ProductDetails } from "@/components/product-details"

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
        <ProductDetails productId={id} />
      </Suspense>
    </div>
  )
}
