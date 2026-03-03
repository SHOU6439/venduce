'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Grid3x3, Heart, ShoppingBag, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { usersApi } from '@/lib/api/users';
import { followsApi } from '@/lib/api/follows';
import { badgesApi } from '@/lib/api/badges';
import { getImageUrl } from '@/lib/utils';
import { PublicUserProfile, Post, Purchase, UserPostStats, FollowStatus, FollowUserItem, UserBadge } from '@/types/api';
import { Header } from '@/components/header';
import { BackButton } from '@/components/back-button';
import { useAuthStore } from '@/stores/auth';
import { BadgeList } from '@/components/badge-display';
import { useBadgeStore } from '@/stores/badge';

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username as string;
    const currentUser = useAuthStore((state) => state.user);
    const triggerOptimistic = useBadgeStore((state) => state.triggerOptimistic);

    const [profile, setProfile] = useState<PublicUserProfile | null>(null);
    const [stats, setStats] = useState<UserPostStats | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingLikedPosts, setLoadingLikedPosts] = useState(false);
    const [likedPostsLoaded, setLikedPostsLoaded] = useState(false);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [purchasesLoaded, setPurchasesLoaded] = useState(false);

    // フォロー関連
    const isAuthenticated = useAuthStore((state) => !!state.user);
    const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
    const [followLoading, setFollowLoading] = useState(false);

    // フォロワー/フォロー中リストモーダル
    const [followListOpen, setFollowListOpen] = useState(false);
    const [followListType, setFollowListType] = useState<'followers' | 'following'>('followers');
    const [followListUsers, setFollowListUsers] = useState<FollowUserItem[]>([]);
    const [followListLoading, setFollowListLoading] = useState(false);
    const [followListCursor, setFollowListCursor] = useState<string | null>(null);
    const [followListHasMore, setFollowListHasMore] = useState(false);
    const [followListLoadingMore, setFollowListLoadingMore] = useState(false);

    // バッジ
    const [userBadges, setUserBadges] = useState<UserBadge[]>([]);

    // 自分自身のプロフィールならリダイレクト
    useEffect(() => {
        if (currentUser && currentUser.username === username) {
            router.replace('/profile');
        }
    }, [currentUser, username, router]);

    useEffect(() => {
        if (!username) return;

        const load = async () => {
            setLoading(true);
            try {
                const [profileData, statsData, postsData] = await Promise.all([
                    usersApi.getUserByUsername(username),
                    usersApi.getUserStats(username),
                    usersApi.getUserPosts(username),
                ]);
                setProfile(profileData);
                setStats(statsData);
                setPosts(postsData.items);
                setError(null);
            } catch (err: any) {
                if (err?.status === 404) {
                    setError('ユーザーが見つかりません。');
                } else {
                    setError('プロフィールの取得に失敗しました。');
                }
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [username]);

    // フォロー状態とバッジを取得（認証状態が確定してからフェッチ）
    useEffect(() => {
        if (!profile?.id) return;
        if (isAuthenticated) {
            followsApi.getFollowStatus(profile.id).then(setFollowStatus).catch(() => {});
        }
        badgesApi.getUserBadges(profile.id).then(setUserBadges).catch(() => {});
    }, [profile?.id, isAuthenticated]);

    const handleFollowToggle = useCallback(async () => {
        if (!profile?.id || followLoading) return;
        setFollowLoading(true);
        try {
            if (followStatus?.is_following) {
                await followsApi.unfollowUser(profile.id);
                setFollowStatus((prev) =>
                    prev
                        ? { ...prev, is_following: false, follower_count: Math.max(0, prev.follower_count - 1) }
                        : prev,
                );
            } else {
                await followsApi.followUser(profile.id);
                // はじめてのフォローバッジを楽観的に即時表示
                triggerOptimistic('first-follow');
                setFollowStatus((prev) =>
                    prev
                        ? { ...prev, is_following: true, follower_count: prev.follower_count + 1 }
                        : prev,
                );
            }
        } catch (err) {
            console.error('Follow toggle failed', err);
        } finally {
            setFollowLoading(false);
        }
    }, [profile?.id, followStatus?.is_following, followLoading]);

    const openFollowList = useCallback(
        async (type: 'followers' | 'following') => {
            if (!profile?.id) return;
            setFollowListType(type);
            setFollowListOpen(true);
            setFollowListLoading(true);
            setFollowListUsers([]);
            setFollowListCursor(null);
            setFollowListHasMore(false);
            setFollowListLoadingMore(false);
            try {
                const res =
                    type === 'followers'
                        ? await followsApi.getFollowers(profile.id)
                        : await followsApi.getFollowing(profile.id);
                setFollowListUsers(res.items);
                setFollowListCursor(res.meta.next_cursor ?? null);
                setFollowListHasMore(res.meta.has_more);
            } catch (err) {
                console.error(`Failed to load ${type}`, err);
            } finally {
                setFollowListLoading(false);
            }
        },
        [profile?.id],
    );

    const loadMoreFollowList = useCallback(async () => {
        if (!profile?.id || !followListHasMore || followListLoadingMore || !followListCursor) return;
        setFollowListLoadingMore(true);
        try {
            const res =
                followListType === 'followers'
                    ? await followsApi.getFollowers(profile.id, followListCursor)
                    : await followsApi.getFollowing(profile.id, followListCursor);
            setFollowListUsers((prev) => [...prev, ...res.items]);
            setFollowListCursor(res.meta.next_cursor ?? null);
            setFollowListHasMore(res.meta.has_more);
        } catch (err) {
            console.error(`Failed to load more ${followListType}`, err);
        } finally {
            setFollowListLoadingMore(false);
        }
    }, [profile?.id, followListType, followListHasMore, followListLoadingMore, followListCursor]);

    const handleLoadLikedPosts = async () => {
        if (likedPostsLoaded) return;
        setLoadingLikedPosts(true);
        try {
            const response = await usersApi.getUserLikedPosts(username);
            setLikedPosts(response.items);
            setLikedPostsLoaded(true);
        } catch (err) {
            console.error('Failed to load liked posts', err);
        } finally {
            setLoadingLikedPosts(false);
        }
    };

    const handleLoadPurchases = async () => {
        if (purchasesLoaded) return;
        setLoadingPurchases(true);
        try {
            const response = await usersApi.getUserPurchases(username);
            setPurchases(response.items);
            setPurchasesLoaded(true);
        } catch (err: any) {
            if (err?.status === 403) {
                setPurchasesLoaded(true);
                setPurchases([]);
            } else {
                console.error('Failed to load purchases', err);
            }
        } finally {
            setLoadingPurchases(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-4xl p-4">
                    <BackButton showLabel label="戻る" />
                    <div className="mt-8 text-center">
                        <p className="text-muted-foreground">{error ?? 'プロフィール情報が見つかりません。'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const avatarUrl = profile.avatar_asset?.public_url ?? null;
    const showPurchaseTab = profile.is_purchase_history_public;

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="mx-auto max-w-4xl pb-20">
                <div className="p-4">
                    {/* プロフィールヘッダー */}
                    <div className="flex flex-col items-center text-center md:flex-row md:items-start md:gap-8 md:text-left">
                        <Avatar className="h-24 w-24 md:h-32 md:w-32">
                            <AvatarImage src={getImageUrl(avatarUrl ?? undefined)} />
                            <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="mt-4 flex-1 md:mt-0">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold">{profile.username}</h2>
                                {isAuthenticated && (
                                    <Button
                                        size="sm"
                                        variant={followStatus?.is_following ? 'outline' : 'default'}
                                        disabled={followLoading}
                                        onClick={handleFollowToggle}
                                        className="gap-1.5"
                                    >
                                        {followLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : followStatus?.is_following ? (
                                            <>
                                                <UserMinus className="h-4 w-4" />
                                                フォロー中
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="h-4 w-4" />
                                                フォロー
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                            <p className="mt-4 text-sm leading-relaxed">
                                {profile.bio ?? '自己紹介文がまだ登録されていません。'}
                            </p>

                            {/* 統計 */}
                            <div className="mt-6 grid grid-cols-5 gap-4 text-center md:w-4/5">
                                <div>
                                    <p className="text-lg font-semibold">
                                        {stats?.post_count ?? 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">投稿</p>
                                </div>
                                <div
                                    className="cursor-pointer hover:opacity-70 transition-opacity"
                                    onClick={() => openFollowList('following')}
                                >
                                    <p className="text-lg font-semibold">
                                        {(followStatus?.following_count ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">フォロー中</p>
                                </div>
                                <div
                                    className="cursor-pointer hover:opacity-70 transition-opacity"
                                    onClick={() => openFollowList('followers')}
                                >
                                    <p className="text-lg font-semibold">
                                        {(followStatus?.follower_count ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">フォロワー</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold">
                                        {(stats?.total_likes ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">獲得いいね</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold">
                                        {(stats?.total_purchases ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">推定購入</p>
                                </div>
                            </div>

                            {/* バッジ */}
                            <BadgeList badges={userBadges} />
                        </div>
                    </div>
                </div>

                {/* タブ */}
                <Tabs defaultValue="posts" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
                        <TabsTrigger
                            value="posts"
                            className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                            <Grid3x3 className="h-4 w-4" /> <span>投稿</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="liked"
                            className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                            onClick={handleLoadLikedPosts}
                        >
                            <Heart className="h-4 w-4" /> <span>いいね</span>
                        </TabsTrigger>
                        {showPurchaseTab && (
                            <TabsTrigger
                                value="purchases"
                                className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                                onClick={handleLoadPurchases}
                            >
                                <ShoppingBag className="h-4 w-4" /> <span>購入履歴</span>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* 投稿タブ */}
                    <TabsContent value="posts" className="mt-0">
                        {posts.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                まだ投稿がありません。
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1">
                                {posts.map((post) => {
                                    const imgSrc =
                                        (post as any).assets?.[0]?.public_url ??
                                        (post as any).images?.[0]?.public_url ??
                                        (post as any).assets?.[0]?.id;
                                    return (
                                        <div
                                            key={post.id}
                                            className="relative aspect-square cursor-pointer bg-muted transition hover:opacity-75"
                                            onClick={() => router.push(`/posts/${post.id}`)}
                                        >
                                            {imgSrc ? (
                                                <img
                                                    src={getImageUrl(imgSrc)}
                                                    className="h-full w-full object-cover"
                                                    alt="ユーザー投稿"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <span className="text-xs text-muted-foreground">画像なし</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/40 px-1 py-0.5">
                                                <Heart className="h-3 w-3 fill-red-400 text-red-400" />
                                                <span className="text-xs text-white">
                                                    {(post as any).like_count ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* いいねタブ */}
                    <TabsContent value="liked" className="mt-0">
                        {loadingLikedPosts ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : likedPosts.length === 0 && likedPostsLoaded ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                いいねした投稿がありません。
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1">
                                {likedPosts.map((post) => {
                                    const imgSrc =
                                        (post as any).assets?.[0]?.public_url ??
                                        (post as any).images?.[0]?.public_url ??
                                        (post as any).assets?.[0]?.id;
                                    return (
                                        <div
                                            key={post.id}
                                            className="relative aspect-square cursor-pointer bg-muted transition hover:opacity-75"
                                            onClick={() => router.push(`/posts/${post.id}`)}
                                        >
                                            {imgSrc ? (
                                                <img
                                                    src={getImageUrl(imgSrc)}
                                                    className="h-full w-full object-cover"
                                                    alt="いいねした投稿"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <span className="text-xs text-muted-foreground">画像なし</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/40 px-1 py-0.5">
                                                <Heart className="h-3 w-3 fill-red-400 text-red-400" />
                                                <span className="text-xs text-white">
                                                    {(post as any).like_count ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* 購入履歴タブ */}
                    {showPurchaseTab && (
                        <TabsContent value="purchases" className="mt-0">
                            {loadingPurchases ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            ) : purchases.length === 0 && purchasesLoaded ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">
                                    購入履歴がありません。
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-1">
                                    {purchases.map((purchase) => {
                                        const imageUrl = purchase.product?.images?.[0]
                                            ? getImageUrl(
                                                  (purchase.product.images[0] as any).public_url ??
                                                      (purchase.product.images[0] as any).id ??
                                                      purchase.product.images[0]
                                              )
                                            : purchase.product?.assets?.[0]
                                              ? getImageUrl(
                                                    purchase.product.assets[0].public_url ??
                                                        purchase.product.assets[0].id
                                                )
                                              : null;
                                        return (
                                            <div
                                                key={purchase.id}
                                                className="relative aspect-square cursor-pointer overflow-hidden bg-muted transition hover:opacity-75"
                                                onClick={() => router.push(`/products/${purchase.product_id}`)}
                                            >
                                                {imageUrl ? (
                                                    <>
                                                        <img
                                                            src={imageUrl}
                                                            className="h-full w-full object-cover"
                                                            alt={purchase.product?.title ?? '商品'}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-2">
                                                            <p className="line-clamp-2 text-xs font-semibold text-white">
                                                                {purchase.product?.title}
                                                            </p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center">
                                                        <p className="px-2 text-center text-xs text-muted-foreground">
                                                            {purchase.product?.title}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </div>

            {/* フォロワー/フォロー中リストモーダル */}
            <Dialog open={followListOpen} onOpenChange={setFollowListOpen}>
                <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {followListType === 'followers' ? 'フォロワー' : 'フォロー中'}
                        </DialogTitle>
                    </DialogHeader>
                    {followListLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : followListUsers.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {followListType === 'followers' ? 'フォロワーはいません' : 'フォロー中のユーザーはいません'}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {followListUsers.map((u) => (
                                <div
                                    key={u.id}
                                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        setFollowListOpen(false);
                                        router.push(`/users/${u.username}`);
                                    }}
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={getImageUrl(u.avatar_url ?? undefined)} />
                                        <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{u.username}</p>
                                        {u.bio && (
                                            <p className="text-xs text-muted-foreground truncate">{u.bio}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {followListHasMore && (
                                <div className="pt-2 text-center">
                                    {followListLoadingMore ? (
                                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <button
                                            onClick={loadMoreFollowList}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            もっと見る
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
