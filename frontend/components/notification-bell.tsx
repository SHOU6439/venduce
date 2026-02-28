"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Heart, UserPlus, MessageCircle, ShoppingCart, Trophy } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/hooks/use-notifications";
import { notificationsApi } from "@/lib/api/notifications";
import { getImageUrl } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/api";

function notificationIcon(type: NotificationType) {
    switch (type) {
        case "like":
            return <Heart className="h-4 w-4 text-rose-500" />;
        case "follow":
            return <UserPlus className="h-4 w-4 text-blue-500" />;
        case "comment":
            return <MessageCircle className="h-4 w-4 text-green-500" />;
        case "purchase":
            return <ShoppingCart className="h-4 w-4 text-amber-500" />;
        case "ranking":
            return <Trophy className="h-4 w-4 text-yellow-500" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
}

function notificationLink(n: AppNotification): string {
    switch (n.type) {
        case "like":
        case "comment":
        case "purchase":
            return n.entity_id ? `/posts/${n.entity_id}` : "/notifications";
        case "follow":
            return n.actor?.username ? `/users/${n.actor.username}` : "/notifications";
        case "ranking":
            return "/feed";
        default:
            return "/notifications";
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

export function NotificationBell() {
    const { unreadCount, markAllAsRead, refreshUnreadCount } = useNotifications();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchLatest = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationsApi.getNotifications({ limit: 10 });
            setNotifications(res.items);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    // ポップオーバーを開いたときに最新通知を取得
    useEffect(() => {
        if (open) {
            fetchLatest();
        }
    }, [open, fetchLatest]);

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    const handleNotificationClick = async (n: AppNotification) => {
        setOpen(false);
        if (!n.is_read) {
            try {
                await notificationsApi.markAsRead([n.id]);
                setNotifications((prev) =>
                    prev.map((item) =>
                        item.id === n.id ? { ...item, is_read: true } : item,
                    ),
                );
                refreshUnreadCount();
            } catch {
                // ignore
            }
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="relative p-2 hover:bg-muted rounded-lg transition"
                    aria-label="通知"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-80 p-0"
                sideOffset={8}
            >
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">通知</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-1"
                            onClick={handleMarkAllRead}
                        >
                            すべて既読にする
                        </Button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            読み込み中...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            通知はありません
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <Link
                                key={n.id}
                                href={notificationLink(n)}
                                onClick={() => handleNotificationClick(n)}
                                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition ${
                                    !n.is_read ? "bg-primary/5" : ""
                                }`}
                            >
                                <div className="shrink-0 mt-0.5">
                                    {n.actor?.avatar_url ? (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage
                                                src={getImageUrl(n.actor.avatar_url)}
                                            />
                                            <AvatarFallback>
                                                {n.actor.username?.[0] ?? "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                            {notificationIcon(n.type)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        {notificationIcon(n.type)}
                                        <p className="text-sm leading-tight truncate">
                                            {n.message}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {timeAgo(n.created_at)}
                                    </p>
                                </div>
                                {!n.is_read && (
                                    <div className="shrink-0 mt-2">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                    </div>
                                )}
                            </Link>
                        ))
                    )}
                </div>

                <div className="border-t px-4 py-2">
                    <Link
                        href="/notifications"
                        onClick={() => setOpen(false)}
                        className="text-xs text-primary hover:underline"
                    >
                        すべての通知を見る
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
