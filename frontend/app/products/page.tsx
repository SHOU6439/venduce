import { Header } from "@/components/header"
import { ProductsGrid } from "@/components/products-grid"

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-primary">商品一覧</h1>
        <ProductsGrid />
      </main>
    </div>
  )
}
