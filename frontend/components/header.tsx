"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth";
import { useEffect, useState } from "react";
import { usersApi } from "@/lib/api/users";
import { getImageUrl } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isAuthenticated, user } = useAuthStore();
  const [profile, setProfile] = useState<{
    username: string;
    avatar_url?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
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
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    router.push("/login");
    router.refresh();
  };

  const isProfilePage = pathname?.startsWith("/profile");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
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
              {isAuthenticated && (
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

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="商品や投稿を検索"
                  className="pl-9 w-64"
                />
              </div>
            </div>

            {isAuthenticated ? (
              <>
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

                <Link href="/settings/payment-methods" title="設定">
                  <button className="p-2 hover:bg-muted rounded-lg transition">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </Link>

                {isProfilePage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    title="ログアウト"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                )}
              </>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm">
                  ログイン
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
