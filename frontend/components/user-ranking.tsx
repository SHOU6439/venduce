import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ShoppingBag } from "lucide-react"

const topUsers = [
  {
    id: 1,
    name: "田中さくら",
    username: "@sakura_t",
    avatar: "/diverse-woman-portrait.png",
    contribution: 2340000, // 貢献金額
    sales: 456, // 販売数
    rank: 1,
  },
  {
    id: 2,
    name: "佐藤ケン",
    username: "@ken_sato",
    avatar: "/man.jpg",
    contribution: 1890000,
    sales: 342,
    rank: 2,
  },
  {
    id: 3,
    name: "鈴木ユイ",
    username: "@yui_style",
    avatar: "/woman-style.jpg",
    contribution: 1560000,
    sales: 289,
    rank: 3,
  },
  {
    id: 4,
    name: "高橋タクヤ",
    username: "@takuya_h",
    avatar: "/stylish-man.png",
    contribution: 1250000,
    sales: 234,
    rank: 4,
  },
  {
    id: 5,
    name: "伊藤マイ",
    username: "@mai_ito",
    avatar: "/woman-shopping.jpg",
    contribution: 980000,
    sales: 189,
    rank: 5,
  },
]

export function UserRanking() {
  return (
    <div className="space-y-3">
      {topUsers.map((user) => (
        <Card key={user.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {user.rank}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold truncate">{user.name}</h3>
                {user.rank <= 3 && (
                  <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">
                    <TrendingUp className="h-3 w-3" />
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{user.username}</p>

              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3 text-primary" />
                  <span className="font-semibold text-primary">{user.sales}</span>
                  <span className="text-muted-foreground">販売</span>
                </div>
                <div>
                  <span className="font-semibold text-primary">¥{(user.contribution / 10000).toFixed(1)}万</span>
                  <span className="text-muted-foreground ml-1">貢献</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
