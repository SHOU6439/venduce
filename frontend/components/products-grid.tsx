import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, ShoppingCart } from "lucide-react"
import Link from "next/link"

const allProducts = [
  {
    id: 1,
    name: "ワイヤレスイヤホン Pro",
    price: 12800,
    image: "/wireless-earphones.png",
    category: "オーディオ",
    likes: 2340,
  },
  {
    id: 2,
    name: "スマートウォッチ X1",
    price: 24800,
    image: "/modern-smartwatch.png",
    category: "ウェアラブル",
    likes: 1890,
  },
  {
    id: 3,
    name: "ミニマルバックパック",
    price: 8900,
    image: "/minimal-backpack.jpg",
    category: "バッグ",
    likes: 1560,
  },
  {
    id: 4,
    name: "モバイルバッテリー 20000mAh",
    price: 4980,
    image: "/portable-power-bank.png",
    category: "アクセサリー",
    likes: 1450,
  },
  {
    id: 5,
    name: "ノイキャンヘッドホン",
    price: 19800,
    image: "/diverse-people-listening-headphones.png",
    category: "オーディオ",
    likes: 1340,
  },
  {
    id: 6,
    name: "スマホスタンド 折りたたみ式",
    price: 2980,
    image: "/phone-stand.jpg",
    category: "アクセサリー",
    likes: 1220,
  },
  {
    id: 7,
    name: "Bluetoothスピーカー",
    price: 7800,
    image: "/bluetooth-speaker.jpg",
    category: "オーディオ",
    likes: 980,
  },
  {
    id: 8,
    name: "ワイヤレスマウス",
    price: 5900,
    image: "/wireless-mouse.png",
    category: "PC周辺機器",
    likes: 890,
  },
]

export function ProductsGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {allProducts.map((product) => (
        <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
          <Link href={`/product/${product.id}`}>
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
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
  )
}
