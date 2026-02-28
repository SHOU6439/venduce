import { client } from "./client";
import {
    AppNotification,
    PaginatedResponseCursor,
    UnreadCountResponse,
} from "@/types/api";

export const notificationsApi = {
    /**
     * 通知一覧を取得（カーソルページネーション）
     */
    getNotifications: async (params: {
        cursor?: string | null;
        limit?: number;
        unread_only?: boolean;
    } = {}): Promise<PaginatedResponseCursor<AppNotification>> => {
        const searchParams = new URLSearchParams();
        if (params.cursor) searchParams.set("cursor", params.cursor);
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.unread_only) searchParams.set("unread_only", "true");

        const qs = searchParams.toString();
        const endpoint = qs
            ? `/api/notifications?${qs}`
            : "/api/notifications";
        return client.get<PaginatedResponseCursor<AppNotification>>(endpoint);
    },

    /**
     * 未読通知数を取得
     */
    getUnreadCount: async (): Promise<number> => {
        const res = await client.get<UnreadCountResponse>(
            "/api/notifications/unread-count",
        );
        return res.count;
    },

    /**
     * 通知を既読にする
     * @param notificationIds 省略で全件既読
     */
    markAsRead: async (notificationIds?: string[]): Promise<void> => {
        await client.post("/api/notifications/read", {
            notification_ids: notificationIds ?? null,
        });
    },
};
