"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Bell,
    Heart,
    UserPlus,
    MessageCircle,
    ShoppingCart,
    Trophy,
    CheckCheck,
    Loader2,
} from "lucide-react";
import { Header } from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { notificationsApi } from "@/lib/api/notifications";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import { getImageUrl } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/api";

function notificationIcon(type: NotificationType) {
    switch (type) {
        case "like":
            return <Heart className="h-5 w-5 text-rose-500" />;
        case "follow":
            return <UserPlus className="h-5 w-5 text-blue-500" />;
        case "comment":
            return <MessageCircle className="h-5 w-5 text-green-500" />;
        case "purchase":
            return <ShoppingCart className="h-5 w-5 text-amber-500" />;
        case "ranking":
            return <Trophy className="h-5 w-5 text-yellow-500" />;
        default:
            return <Bell className="h-5 w-5" />;
    }
}

function notificationLink(n: AppNotification): string {
    switch (n.type) {
        case "like":
        case "comment":
        case "purchase":
            return n.entity_id ? `/posts/${n.entity_id}` : "#";
        case "follow":
            return n.actor?.username ? `/users/${n.actor.username}` : "#";
        case "ranking":
            return "/feed";
        default:
            return "#";
    }
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "たった今";
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;
    return date.toLocaleDateString("ja-JP");
}

export default function NotificationsPage() {
    const { isAuthenticated } = useAuthStore();
    const router = useRouter();

    const fetchMore = useCallback(
        async (cursor: string | null | undefined, limit: number) => {
            const res = await notificationsApi.getNotifications({
                cursor: cursor,
                limit,
            });
            return {
                items: res.items,
                nextCursor: res.meta.next_cursor ?? null,
            };
        },
        [],
    );

    const {
        items: notifications,
        setItems: setNotifications,
        isLoading,
        isLoadingMore,
        hasMore,
        sentinelRef,
    } = useInfiniteScroll<AppNotification, string>({
        fetchMore,
        limit: 20,
    });

    const handleMarkAllRead = async () => {
        try {
            await notificationsApi.markAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true })),
            );
        } catch {
            // ignore
        }
    };

    const handleNotificationClick = async (n: AppNotification) => {
        if (!n.is_read) {
            try {
                await notificationsApi.markAsRead([n.id]);
                setNotifications((prev) =>
                    prev.map((item) =>
                        item.id === n.id ? { ...item, is_read: true } : item,
                    ),
                );
            } catch {
                // ignore
            }
        }
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="container mx-auto px-4 py-16 text-center">
                    <p className="text-muted-foreground">
                        ログインして通知を確認しましょう
                    </p>
                    <Button className="mt-4" onClick={() => router.push("/login")}>
                        ログイン
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto max-w-2xl px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">通知</h1>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="gap-1.5"
                        >
                            <CheckCheck className="h-4 w-4" />
                            すべて既読にする
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="h-16 animate-pulse rounded-lg bg-muted"
                            />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Bell className="h-12 w-12 mb-4 opacity-30" />
                        <p>通知はまだありません</p>
                    </div>
                ) : (
                    <div className="space-y-1 rounded-lg border">
                        {notifications.map((n) => (
                            <Link
                                key={n.id}
                                href={notificationLink(n)}
                                onClick={() => handleNotificationClick(n)}
                                className={`flex items-start gap-4 px-4 py-4 hover:bg-muted/50 transition border-b last:border-b-0 ${
                                    !n.is_read
                                        ? "bg-primary/5"
                                        : ""
                                }`}
                            >
                                <div className="shrink-0 mt-0.5">
                                    {n.actor?.avatar_url ? (
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage
                                                src={getImageUrl(
                                                    n.actor.avatar_url,
                                                )}
                                            />
                                            <AvatarFallback>
                                                {n.actor.username?.[0] ?? "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                            {notificationIcon(n.type)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {notificationIcon(n.type)}
                                        <p className="text-sm">
                                            {n.message}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {timeAgo(n.created_at)}
                                    </p>
                                </div>
                                {!n.is_read && (
                                    <div className="shrink-0 mt-2">
                                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}

                {/* 無限スクロール用センチネル */}
                <div ref={sentinelRef} className="mt-4 py-4 text-center">
                    {isLoadingMore && (
                        <Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
                    )}
                    {!hasMore && notifications.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            すべての通知を表示しました
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
