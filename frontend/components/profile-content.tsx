'use client';

import { useState, useEffect } from 'react';
import { useProfileEdit } from '@/features/profile/hooks/useProfileEdit';
import { calcTotalLikes, calcTotalPurchases } from '@/features/profile/utils';
import { useRouter } from 'next/navigation';
import { Grid3x3, ShoppingBag, Heart } from 'lucide-react';
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

import { purchasesApi } from '@/lib/api/purchases';
import { ApiError } from '@/lib/api/client';
import { Post, UserProfile, Purchase, UserPostStats, FollowStatus, FollowUserItem, UserBadge } from '@/types/api';
import { BadgeList } from '@/components/badge-display';
import { getImageUrl } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { Loader2 } from 'lucide-react';

export function ProfileContent() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<UserPostStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [loadingLikedPosts, setLoadingLikedPosts] = useState(false);
  const [likedPostsLoaded, setLikedPostsLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

  // バッジ
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);

  // フォロー関連
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListType, setFollowListType] = useState<'followers' | 'following'>('followers');
  const [followListUsers, setFollowListUsers] = useState<FollowUserItem[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListCursor, setFollowListCursor] = useState<string | null>(null);
  const [followListHasMore, setFollowListHasMore] = useState(false);
  const [followListLoadingMore, setFollowListLoadingMore] = useState(false);

  const {
    form,
    error: editError,
    saving,
    handleChange,
    handleSubmit,
    setForm,
  } = useProfileEdit({
    username: '',
    first_name: '',
    last_name: '',
    bio: '',
    avatar: undefined,
  });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        // プロフィール・自分の投稿・統計・バッジを並列取得
        const [userData, postsData, statsData, badgesData] = await Promise.all([
          usersApi.getProfile(),
          usersApi.getUserPosts(user.username),
          usersApi.getMyStats(),
          badgesApi.getMyBadges(),
        ]);
        const mappedUser = {
          ...userData,
          avatar_url: (userData as any).avatar_asset?.public_url ?? userData.avatar_url ?? null,
        };
        setProfile(mappedUser);
        setPosts(postsData.items);
        setStats(statsData);
        setUserBadges(badgesData);
        setError(null);
        // フォロー状態はIDが確定してから fire-and-forget で取得（初期表示をブロックしない）
        followsApi.getFollowStatus(mappedUser.id).then(setFollowStatus).catch(() => {});
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login');
          return;
        }
        console.error('Failed to load profile', err);
        setError(err instanceof Error ? err.message : 'プロフィール情報を取得できませんでした');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, router]);

  const openFollowList = async (type: 'followers' | 'following') => {
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
  };

  const loadMoreFollowList = async () => {
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
  };

  if (loading) return <div className="p-8 text-center">プロフィールを読み込み中です...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!profile) return <div className="p-8 text-center">プロフィール情報が見つかりません。</div>;

  const fullName = `${profile.last_name ?? ''} ${profile.first_name ?? ''}`.trim() || profile.username;
  const postCount = stats?.post_count ?? posts.length;
  const totalLikes = stats?.total_likes ?? calcTotalLikes(posts);
  const totalPurchases = stats?.total_purchases ?? calcTotalPurchases(posts);

  const handleEditClick = () => {
    setForm({
      username: profile.username ?? '',
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      bio: profile.bio ?? '',
      avatar: undefined,
    });
    setEditAvatarPreview(profile.avatar_url ? getImageUrl(profile.avatar_url) : null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };


  return (
    <div className="mx-auto max-w-4xl pb-20">
      <div className="p-4">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center md:flex-row md:items-start md:gap-8 md:text-left">
          <Avatar className="h-24 w-24 md:h-32 md:w-32">
            <AvatarImage src={getImageUrl(profile.avatar_url ?? undefined)} />
            <AvatarFallback>{profile.username[0]}</AvatarFallback>
          </Avatar>

          <div className="mt-4 flex-1 md:mt-0">
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <p className="text-muted-foreground">@{profile.username}</p>

            <p className="mt-4 text-sm leading-relaxed">{profile.bio ?? '自己紹介文がまだ登録されていません。'}</p>
            <div className="mt-6 flex gap-2">
              <Button className="flex-1 md:flex-none" onClick={handleEditClick}>プロフィールを編集</Button>
            </div>

            {/* Edit Modal */}
            <Dialog open={editing} onOpenChange={(open) => { if (!open && !saving) setEditing(false); }}>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>プロフィールを編集</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* Avatar Upload */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Avatar className="h-20 w-20 shrink-0">
                      <AvatarImage src={editAvatarPreview ?? getImageUrl(profile.avatar_url ?? undefined)} />
                      <AvatarFallback>{form.username[0] || profile.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="w-full min-w-0">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={saving}
                        className="w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                        onChange={e => {
                          const file = e.target.files?.[0] || undefined;
                          handleChange('avatar', file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = ev => setEditAvatarPreview(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setEditAvatarPreview(profile.avatar_url ? getImageUrl(profile.avatar_url) : null);
                          }
                        }}
                      />
                      <div className="text-xs text-muted-foreground mt-1">画像は5MB以内・正方形推奨</div>
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium mb-1">ユーザー名</label>
                    <input
                      className="w-full rounded border border-input p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      type="text"
                      value={form.username}
                      onChange={e => handleChange('username', e.target.value)}
                      placeholder="ユーザー名"
                      maxLength={32}
                      disabled={saving}
                    />
                  </div>

                  {/* Name */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">姓</label>
                      <input
                        className="w-full rounded border border-input p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        type="text"
                        value={form.last_name}
                        onChange={e => handleChange('last_name', e.target.value)}
                        placeholder="姓"
                        maxLength={100}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">名</label>
                      <input
                        className="w-full rounded border border-input p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        type="text"
                        value={form.first_name}
                        onChange={e => handleChange('first_name', e.target.value)}
                        placeholder="名"
                        maxLength={100}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium mb-1">自己紹介</label>
                    <textarea
                      className="w-full rounded border border-input p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      maxLength={1000}
                      value={form.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      placeholder="自己紹介文を入力してください (1000文字以内)"
                      disabled={saving}
                    />
                  </div>

                  {editError && <div className="text-xs text-red-500">{editError}</div>}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={async () => {
                      const ok = await handleSubmit();
                      if (ok) {
                        const [userData, statsData] = await Promise.all([
                          usersApi.getProfile(),
                          usersApi.getMyStats(),
                        ]);
                        const mappedUser = {
                          ...userData,
                          avatar_url: (userData as any).avatar_asset?.public_url ?? userData.avatar_url ?? null,
                        };
                        setProfile(mappedUser);
                        setStats(statsData);
                        setEditing(false);

                        const currentUser = useAuthStore.getState().user;
                        if (currentUser) {
                          useAuthStore.getState().setUser({
                            ...currentUser,
                            username: userData.username,
                            first_name: userData.first_name ?? undefined,
                            last_name: userData.last_name ?? undefined,
                          });
                        }
                      }
                    }} disabled={saving} className="flex-1">
                      {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />保存中...</> : '保存'}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" disabled={saving} className="flex-1">キャンセル</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-5 md:gap-4 text-center md:w-4/5">
              <div>
                <p className="font-semibold text-lg">{postCount}</p>
                <p className="text-xs text-muted-foreground">投稿</p>
              </div>
              <div
                className="cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => openFollowList('following')}
              >
                <p className="font-semibold text-lg">{(followStatus?.following_count ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">フォロー中</p>
              </div>
              <div
                className="cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => openFollowList('followers')}
              >
                <p className="font-semibold text-lg">{(followStatus?.follower_count ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">フォロワー</p>
              </div>
              <div>
                <p className="font-semibold text-lg">{totalLikes.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">獲得いいね</p>
              </div>
              <div>
                <p className="font-semibold text-lg">{totalPurchases.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">推定購入</p>
              </div>
            </div>

            {/* バッジ */}
            <BadgeList badges={userBadges} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="posts" className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            <Grid3x3 className="h-4 w-4" /> <span>投稿</span>
          </TabsTrigger>
          <TabsTrigger
            value="liked"
            className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            onClick={async () => {
              if (!likedPostsLoaded && profile) {
                setLoadingLikedPosts(true);
                try {
                  const response = await usersApi.getUserLikedPosts(profile.username);
                  setLikedPosts(response.items);
                  setLikedPostsLoaded(true);
                } catch (err) {
                  console.error('Failed to load liked posts', err);
                } finally {
                  setLoadingLikedPosts(false);
                }
              }
            }}
          >
            <Heart className="h-4 w-4" /> <span>いいね</span>
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary" onClick={async () => { if (purchases.length === 0 && user) { setLoadingPurchases(true); try { const response = await purchasesApi.listUserPurchases(user.id, { limit: 20 }); setPurchases(response.items); } catch (err) { console.error('Failed to load purchases', err); } finally { setLoadingPurchases(false); } } }}>
            <ShoppingBag className="h-4 w-4" /> <span>購入履歴</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          {posts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">まだ投稿がありません。</div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <div key={post.id} className="relative aspect-square bg-muted cursor-pointer hover:opacity-75 transition" onClick={() => router.push(`/posts/${post.id}`)}>
                  <img src={getImageUrl(post.assets?.[0]?.public_url ?? post.images?.[0]?.public_url ?? post.assets?.[0]?.id)} className="h-full w-full object-cover" alt="ユーザー投稿" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="liked" className="mt-0">
          {loadingLikedPosts ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : likedPosts.length === 0 && likedPostsLoaded ? (
            <div className="py-10 text-center text-sm text-muted-foreground">いいねした投稿がありません。</div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {likedPosts.map((post) => (
                <div
                  key={post.id}
                  className="relative aspect-square bg-muted cursor-pointer hover:opacity-75 transition"
                  onClick={() => router.push(`/posts/${post.id}`)}
                >
                  <img
                    src={getImageUrl(post.assets?.[0]?.public_url ?? post.images?.[0]?.public_url ?? post.assets?.[0]?.id)}
                    className="h-full w-full object-cover"
                    alt="いいねした投稿"
                  />
                  <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/40 rounded px-1 py-0.5">
                    <Heart className="h-3 w-3 fill-red-400 text-red-400" />
                    <span className="text-xs text-white">{post.like_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="mt-0">
          {loadingPurchases ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">購入履歴がありません。</div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {purchases.map((purchase) => {
                // 商品画像のURLを取得
                const imageUrl = purchase.product?.images?.[0]
                  ? getImageUrl(purchase.product.images[0].public_url ?? purchase.product.images[0].id ?? purchase.product.images[0])
                  : null;
                
                return (
                  <div
                    key={purchase.id}
                    className="relative aspect-square bg-muted cursor-pointer hover:opacity-75 transition overflow-hidden"
                    onClick={() => router.push(`/purchases/${purchase.id}`)}
                  >
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          className="h-full w-full object-cover"
                          alt={purchase.product.title}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-xs text-white font-semibold line-clamp-2">{purchase.product.title}</p>
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <p className="text-xs text-muted-foreground text-center px-2">{purchase.product.title}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
