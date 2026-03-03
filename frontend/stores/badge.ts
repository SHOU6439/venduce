/**
 * バッジ所持状況 + 楽観的エフェクトキュー管理ストア。
 *
 * - `ownedSlugs` : 所持済みバッジのslugセット（楽観的発火の重複防止に使用）
 * - `triggerOptimistic(slug)` : FIRST_ACTIONバッジを即座に表示キューへ投入
 * - `BadgeNotificationManager` がこのストアを購読してエフェクトを描画する
 */
import { create } from 'zustand';
import { BadgeDefinition } from '@/types/api';
import { badgesApi } from '@/lib/api/badges';

// ------------------------------------------------------------------
// FIRST_ACTIONバッジの静的定義（バックエンドの DEFAULT_BADGES と同期）
// ------------------------------------------------------------------
export const FIRST_ACTION_DEFS: Record<string, BadgeDefinition> = {
    'first-like': {
        id: 'first-like',
        slug: 'first-like',
        name: 'はじめてのいいね',
        description: '初めていいねを押した',
        icon: 'sparkle',
        color: '#F48FB1',
        threshold: 1,
        sort_order: 61,
        category: 'first_action',
    },
    'first-post': {
        id: 'first-post',
        slug: 'first-post',
        name: 'デビュー投稿',
        description: '初めての投稿',
        icon: 'sparkle',
        color: '#4DD0E1',
        threshold: 1,
        sort_order: 60,
        category: 'first_action',
    },
    'first-follow': {
        id: 'first-follow',
        slug: 'first-follow',
        name: 'はじめてのフォロー',
        description: '初めてフォローした',
        icon: 'sparkle',
        color: '#AED581',
        threshold: 1,
        sort_order: 62,
        category: 'first_action',
    },
    'buyer-first': {
        id: 'buyer-first',
        slug: 'buyer-first',
        name: 'はじめてのお買い物',
        description: '初めての購入を達成',
        icon: 'shopping-bag',
        color: '#8BC34A',
        threshold: 1,
        sort_order: 50,
        category: 'purchases_made',
    },
};

// ------------------------------------------------------------------
// ストア型定義
// ------------------------------------------------------------------
interface BadgeStoreState {
    /** 所持済みバッジのslugセット（重複発火防止） */
    ownedSlugs: Set<string>;
    /** 楽観的エフェクト表示キュー（BadgeNotificationManagerが消費） */
    pendingOptimistic: BadgeDefinition[];

    /**
     * バッジ所持状況を API からロードし ownedSlugs を更新する。
     * ログイン・ユーザー切り替え時に BadgeNotificationManager から呼ぶ。
     */
    loadOwnedSlugs: () => Promise<void>;

    /** WS badge_awarded 受信時など、所持済みとして追加する */
    addOwnedSlug: (slug: string) => void;

    /**
     * 楽観的バッジエフェクトを発火する。
     * - 既に所持済み or キュー内に存在する場合はスキップ（重複防止）
     * - FIRST_ACTION_DEFS に定義がないslugは無視する
     */
    triggerOptimistic: (slug: string) => void;

    /**
     * BadgeNotificationManager がキューを引き取る際に呼ぶ。
     * 現在のキューを返しつつクリアする。
     */
    consumePendingOptimistic: () => BadgeDefinition[];

    /** ストアをリセット（ログアウト時） */
    reset: () => void;
}

// ------------------------------------------------------------------
// ストア実装
// ------------------------------------------------------------------
export const useBadgeStore = create<BadgeStoreState>((set, get) => ({
    ownedSlugs: new Set(),
    pendingOptimistic: [],

    loadOwnedSlugs: async () => {
        try {
            const badges = await badgesApi.getMyBadges();
            const slugs = new Set(badges.map((ub) => ub.badge.slug));
            set({ ownedSlugs: slugs });
        } catch {
            // 認証切れ等は無視
        }
    },

    addOwnedSlug: (slug: string) => {
        set((state) => ({
            ownedSlugs: new Set([...state.ownedSlugs, slug]),
        }));
    },

    triggerOptimistic: (slug: string) => {
        const { ownedSlugs, pendingOptimistic } = get();
        if (ownedSlugs.has(slug)) return;
        if (pendingOptimistic.some((b) => b.slug === slug)) return;

        const def = FIRST_ACTION_DEFS[slug];
        if (!def) return;

        // pendingOptimistic にのみ追加。ownedSlugs への追加は
        // 実際に setCurrent で表示される直前に markShown() で行う。
        set((state) => ({
            pendingOptimistic: [...state.pendingOptimistic, def],
        }));
    },

    consumePendingOptimistic: () => {
        const pending = get().pendingOptimistic;
        if (pending.length > 0) {
            set({ pendingOptimistic: [] });
        }
        return pending;
    },

    reset: () => {
        set({ ownedSlugs: new Set(), pendingOptimistic: [] });
    },
}));
