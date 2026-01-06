import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"
import Link from "next/link"

const trendingProducts = [
  {
    id: 1,
    name: "ワイヤレスイヤホン Pro",
    price: 12800,
    image: "/wireless-earphones.png",
    purchases: 456,
    trend: "+15%",
  },
  {
    id: 2,
    name: "スマートウォッチ X1",
    price: 24800,
    image: "/modern-smartwatch.png",
    purchases: 342,
    trend: "+22%",
  },
  {
    id: 3,
    name: "ミニマルバックパック",
    price: 8900,
    image: "/minimal-backpack.jpg",
    purchases: 289,
    trend: "+18%",
  },
  {
    id: 4,
    name: "モバイルバッテリー",
    price: 4980,
    image: "/portable-power-bank.png",
    purchases: 267,
    trend: "+28%",
  },
  {
    id: 5,
    name: "ノイキャンヘッドホン",
    price: 19800,
    image: "/diverse-people-listening-headphones.png",
    purchases: 234,
    trend: "+12%",
  },
]

export function TrendingProducts() {
  return (
    <div className="space-y-3">
      {trendingProducts.map((product, index) => (
        <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <Link href={`/product/${product.id}`}>
            <div className="flex gap-3 p-3">
              <div className="relative flex-shrink-0">
                {index < 3 && (
                  <Badge className="absolute -top-1 -left-1 bg-accent text-accent-foreground z-10 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {index + 1}
                  </Badge>
                )}
                <div className="w-20 h-20 overflow-hidden bg-muted rounded">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                <p className="text-lg font-bold text-primary mt-1">¥{product.price.toLocaleString()}</p>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShoppingCart className="h-3 w-3" />
                    <span>{product.purchases}個販売</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs"
                  >
                    {product.trend}
                  </Badge>
                </div>
              </div>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  )
}
