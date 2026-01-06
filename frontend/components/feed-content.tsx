"use client"

import { useState } from "react"
import { Heart, MessageCircle, ShoppingBag } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const MOCK_POSTS = [
  {
    id: "1",
    user: {
      name: "田中 美咲",
      avatar: "/diverse-woman-portrait.png",
      username: "misaki_tanaka",
    },
    image: "/modern-sneakers.jpg",
    caption: "新しいスニーカーをゲット！めっちゃ履きやすい✨",
    likes: 234,
    comments: 12,
    products: [{ id: "p1", name: "エアフォース 1", brand: "Nike", price: 13200, x: 30, y: 70 }],
  },
  {
    id: "2",
    user: {
      name: "佐藤 健太",
      avatar: "/man.jpg",
      username: "kenta_sato",
    },
    image: "/luxury-watch.jpg",
    caption: "憧れの時計をついに購入！",
    likes: 567,
    comments: 34,
    products: [{ id: "p2", name: "サブマリーナー", brand: "Rolex", price: 1280000, x: 50, y: 50 }],
  },
  {
    id: "3",
    user: {
      name: "山田 さくら",
      avatar: "/diverse-woman-smiling.jpg",
      username: "sakura_yamada",
    },
    image: "/luxury-quilted-handbag.jpg",
    caption: "ずっと欲しかったバッグ♡",
    likes: 892,
    comments: 56,
    products: [{ id: "p3", name: "ジャッキー 1961", brand: "Gucci", price: 385000, x: 40, y: 60 }],
  },
  {
    id: "4",
    user: {
      name: "小林 太郎",
      avatar: "/young-man-contemplative.jpg",
      username: "taro_kobayashi",
    },
    image: "/gaming-headset.jpg",
    caption: "ゲーミングセットアップ完成！🎮",
    likes: 445,
    comments: 28,
    products: [{ id: "p4", name: "ワイヤレスヘッドセット", brand: "Sony", price: 24800, x: 35, y: 45 }],
  },
]

export function FeedContent() {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Feed */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-8">
          {MOCK_POSTS.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              {/* Post Header */}
              <div className="flex items-center gap-3 p-4">
                <Avatar>
                  <AvatarImage src={post.user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{post.user.name}</p>
                  <p className="text-xs text-muted-foreground">@{post.user.username}</p>
                </div>
              </div>

              {/* Post Image with Product Tags */}
              <div className="relative">
                <img
                  src={post.image || "/placeholder.svg"}
                  alt="投稿画像"
                  className="w-full aspect-square object-cover"
                />
                {post.products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="absolute group"
                    style={{ left: `${product.x}%`, top: `${product.y}%` }}
                  >
                    <div className="flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-card p-2 text-xs shadow-lg group-hover:block">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-muted-foreground">{product.brand}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Post Actions */}
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(post.id)}
                    className={likedPosts.has(post.id) ? "text-red-500" : ""}
                  >
                    <Heart className={`h-5 w-5 ${likedPosts.has(post.id) ? "fill-current" : ""}`} />
                    <span className="ml-1 text-sm">{likedPosts.has(post.id) ? post.likes + 1 : post.likes}</span>
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-5 w-5" />
                    <span className="ml-1 text-sm">{post.comments}</span>
                  </Button>
                </div>

                <p className="text-sm">
                  <span className="font-semibold">{post.user.name}</span> {post.caption}
                </p>

                {/* Product Tags */}
                <div className="flex flex-wrap gap-2">
                  {post.products.map((product) => (
                    <Link key={product.id} href={`/product/${product.id}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                        <ShoppingBag className="mr-1 h-3 w-3" />
                        {product.brand} - ¥{product.price.toLocaleString()}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
        <div className="flex justify-around py-2">
          <Button asChild variant="ghost" size="sm" className="flex-col h-auto py-2">
            <Link href="/feed">
              <svg className="h-6 w-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="text-xs">ホーム</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="flex-col h-auto py-2">
            <Link href="/create">
              <ShoppingBag className="h-6 w-6 mb-1" />
              <span className="text-xs">投稿</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="flex-col h-auto py-2">
            <Link href="/profile">
              <svg className="h-6 w-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-xs">プロフィール</span>
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  )
}
