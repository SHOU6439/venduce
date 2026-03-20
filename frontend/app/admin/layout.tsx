'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminGuard from '@/components/admin-guard';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    Package,
    FolderTree,
    Tag,
    FileText,
    ShoppingCart,
    ArrowLeft,
} from 'lucide-react';

const navItems = [
    { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/admin/users', label: 'ユーザー', icon: Users },
    { href: '/admin/products', label: '商品', icon: Package },
    { href: '/admin/posts', label: '投稿', icon: FileText },
    { href: '/admin/purchases', label: '購入', icon: ShoppingCart },
    { href: '/admin/categories', label: 'カテゴリー', icon: FolderTree },
    { href: '/admin/brands', label: 'ブランド', icon: Tag },
];

function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-60 shrink-0 border-r border-border bg-card min-h-screen">
            <div className="p-4 border-b border-border">
                <h1 className="text-lg font-bold text-foreground">管理パネル</h1>
            </div>
            <nav className="p-2 flex flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-2 mt-auto border-t border-border">
                <Link
                    href="/"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    サイトに戻る
                </Link>
            </div>
        </aside>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-background">
                <AdminSidebar />
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </AdminGuard>
    );
}
