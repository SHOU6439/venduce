import { Header } from "@/components/header"
import { ProductDetails } from "@/components/product-details"

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ProductDetails productId={id} />
    </div>
  )
}
