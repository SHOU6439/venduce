"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth";
import { useEffect, useState } from "react";
import { usersApi } from "@/lib/api/users";
import { getImageUrl } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<{
    username: string;
    avatar_url?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Hydration mismatch を防ぐためにマウント後のみクライアント固有UIを表示
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // hasHydrated が true になるまで待つ（initializeFromToken 完了後）
    // 初期化中のリフレッシュと getProfile の競合を防ぐ
    if (isAuthenticated && hasHydrated) {
      const loadProfile = async () => {
        try {
          setLoading(true);
          const userProfile = await usersApi.getProfile();
          setProfile({
            username: userProfile.username,
            avatar_url: userProfile.avatar_url,
          });
        } catch (err) {
          console.error("Failed to load profile", err);
        } finally {
          setLoading(false);
        }
      };
      loadProfile();
    }
  }, [isAuthenticated, hasHydrated]);

  // ルート遷移時にモバイルメニューを閉じる
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setMobileSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            {/* モバイル用ハンバーガーメニューボタン */}
            <button
              className="md:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/title.webp"
                alt="Venduce Title"
                width={110}
                height={341}
                className="rounded-lg"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/feed"
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                投稿一覧
              </Link>
              <Link
                href="/products"
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                商品一覧
              </Link>
              {mounted && isAuthenticated && (
                <>
                  <Link
                    href="/create"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    投稿する
                  </Link>
                  <Link
                    href="/purchases"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    購入履歴
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* モバイル用検索ボタン */}
            <button
              className="md:hidden p-2 hover:bg-muted rounded-lg transition"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="検索"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* デスクトップ用検索バー */}
            <div className="hidden md:flex items-center">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="商品や投稿を検索"
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            {mounted && isAuthenticated ? (
              <>
                <NotificationBell />
                <Link
                  href="/profile"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={getImageUrl(profile?.avatar_url ?? undefined)}
                    />
                    <AvatarFallback>
                      {profile?.username?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-foreground">
                    {profile?.username}
                  </span>
                </Link>

                <Link href="/settings" title="設定" className="hidden md:block">
                  <button className="p-2 hover:bg-muted rounded-lg transition">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </Link>
              </>
            ) : mounted ? (
              <Link href="/login">
                <Button variant="default" size="sm">
                  ログイン
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        {/* モバイル用検索バー（トグル表示） */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="商品や投稿を検索"
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </form>
          </div>
        )}
      </div>

      {/* モバイル用サイドメニュー（Sheet） */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>
              <Image
                src="/title.webp"
                alt="Venduce"
                width={90}
                height={280}
                className="rounded-lg"
              />
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col py-2">
            <Link
              href="/feed"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              投稿一覧
            </Link>
            <Link
              href="/products"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              商品一覧
            </Link>
            {mounted && isAuthenticated && (
              <>
                <Link
                  href="/create"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  投稿する
                </Link>
                <Link
                  href="/purchases"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  購入履歴
                </Link>

                <div className="border-t my-2" />

                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getImageUrl(profile?.avatar_url ?? undefined)} />
                    <AvatarFallback>{profile?.username?.[0] ?? "U"}</AvatarFallback>
                  </Avatar>
                  マイページ
                </Link>
                <Link
                  href="/notifications"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  通知
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  設定
                </Link>
              </>
            )}

            {mounted && !isAuthenticated && (
              <>
                <div className="border-t my-2" />
                <div className="px-4 py-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="default" size="sm" className="w-full">
                      ログイン
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
