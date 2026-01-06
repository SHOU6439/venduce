import Link from 'next/link';
import { Search, ShoppingBag, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/title.webp" alt="Venduce Title" width={110} height={341} className="rounded-lg" />
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/feed" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                投稿一覧
              </Link>
              <Link href="/products" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                商品一覧
              </Link>
              <Link href="/create" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                投稿する
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="商品や投稿を検索" className="pl-9 w-64" />
              </div>
            </div>

            <Link href="/profile">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
