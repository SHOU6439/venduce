'use client';

import { useEffect, useState } from 'react';
import { adminApi, DashboardStats } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, FileText, FolderTree, Tag, ShoppingCart } from 'lucide-react';

const statCards = [
    { key: 'total_users' as const, label: 'ユーザー', icon: Users, color: 'text-blue-600' },
    { key: 'total_products' as const, label: '商品', icon: Package, color: 'text-green-600' },
    { key: 'total_posts' as const, label: '投稿', icon: FileText, color: 'text-purple-600' },
    { key: 'total_categories' as const, label: 'カテゴリー', icon: FolderTree, color: 'text-orange-600' },
    { key: 'total_brands' as const, label: 'ブランド', icon: Tag, color: 'text-pink-600' },
    { key: 'total_purchases' as const, label: '購入', icon: ShoppingCart, color: 'text-teal-600' },
];

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.getDashboard()
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="h-16 animate-pulse bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statCards.map(({ key, label, icon: Icon, color }) => (
                        <Card key={key}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {label}
                                </CardTitle>
                                <Icon className={`h-5 w-5 ${color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {stats[key].toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground">データの取得に失敗しました。</p>
            )}
        </div>
    );
}
