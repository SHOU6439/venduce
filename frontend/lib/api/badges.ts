import { client } from './client';
import { BadgeDefinition, UserBadge, BadgeNotification } from '@/types/api';

export const badgesApi = {
    /** 全バッジ定義一覧 */
    getDefinitions: async (): Promise<BadgeDefinition[]> => {
        return client.get<BadgeDefinition[]>('/api/badges/definitions');
    },

    /** デフォルトバッジを初期化（冪等） */
    seedBadges: async (): Promise<BadgeDefinition[]> => {
        return client.post<BadgeDefinition[]>('/api/badges/seed', {});
    },

    /** 指定ユーザーのバッジ一覧 */
    getUserBadges: async (userId: string): Promise<UserBadge[]> => {
        return client.get<UserBadge[]>(`/api/badges/users/${userId}`);
    },

    /** 自分のバッジ一覧 */
    getMyBadges: async (): Promise<UserBadge[]> => {
        return client.get<UserBadge[]>('/api/badges/me');
    },

    /** 未通知バッジ取得（取得後に通知済みマーク） */
    getNotifications: async (): Promise<BadgeNotification> => {
        return client.get<BadgeNotification>('/api/badges/me/notifications');
    },

    /** 手動バッジ判定（デバッグ用） */
    evaluateMyBadges: async (): Promise<UserBadge[]> => {
        return client.post<UserBadge[]>('/api/badges/me/evaluate', {});
    },
};
