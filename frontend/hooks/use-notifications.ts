"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useWsEvents } from "@/components/ws-provider";
import { notificationsApi } from "@/lib/api/notifications";
import type { AppNotification } from "@/types/api";

/**
 * 通知の未読数とリアルタイム受信を管理するフック。
 *
 * - 初回マウント時に未読数を取得
 * - WebSocket の `notification` イベントで未読数をインクリメント
 * - markAllAsRead() / markAsRead(ids) で既読処理
 */
export function useNotifications() {
    const { isAuthenticated } = useAuthStore();
    const bus = useWsEvents();
    const [unreadCount, setUnreadCount] = useState(0);
    const [latestNotification, setLatestNotification] =
        useState<AppNotification | null>(null);
    const mountedRef = useRef(true);

    // 未読数を API から取得
    const refreshUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const count = await notificationsApi.getUnreadCount();
            if (mountedRef.current) setUnreadCount(count);
        } catch {
            // ignore
        }
    }, [isAuthenticated]);

    // 初回＋認証変化時に未読数をフェッチ
    useEffect(() => {
        mountedRef.current = true;
        refreshUnreadCount();
        return () => {
            mountedRef.current = false;
        };
    }, [refreshUnreadCount]);

    // WebSocket: リアルタイム通知受信
    useEffect(() => {
        if (!bus) return;

        const handler = (e: CustomEvent) => {
            const data = e.detail as AppNotification;
            if (mountedRef.current) {
                setUnreadCount((prev) => prev + 1);
                setLatestNotification(data);
            }
        };
        bus.addEventListener("notification", handler as EventListener);
        return () => {
            bus.removeEventListener("notification", handler as EventListener);
        };
    }, [bus]);

    // 全件既読
    const markAllAsRead = useCallback(async () => {
        try {
            await notificationsApi.markAsRead();
            setUnreadCount(0);
        } catch {
            // ignore
        }
    }, []);

    // 個別既読
    const markAsRead = useCallback(async (ids: string[]) => {
        try {
            await notificationsApi.markAsRead(ids);
            setUnreadCount((prev) => Math.max(0, prev - ids.length));
        } catch {
            // ignore
        }
    }, []);

    return {
        unreadCount,
        latestNotification,
        refreshUnreadCount,
        markAllAsRead,
        markAsRead,
    };
}
