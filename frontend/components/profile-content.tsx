'use client';

import { useState, useEffect } from 'react';
import { useProfileEdit } from '@/features/profile/hooks/useProfileEdit';
import { calcTotalLikes, calcTotalPurchases } from '@/features/profile/utils';
import { useRouter } from 'next/navigation';
import { Grid3x3, LogOut, ShoppingBag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usersApi } from '@/lib/api/users';
import { postsApi } from '@/lib/api/posts';
import { purchasesApi } from '@/lib/api/purchases';
import { ApiError } from '@/lib/api/client';
import { Post, UserProfile, Purchase } from '@/types/api';
import { getImageUrl } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { Loader2 } from 'lucide-react';

export function ProfileContent() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

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
    const load = async () => {
      try {
        const [userData, postList] = await Promise.all([usersApi.getProfile(), postsApi.getPosts()]);
        const mappedUser = {
          ...userData,
          avatar_url: (userData as any).avatar_asset?.public_url ?? userData.avatar_url ?? null,
        };
        setProfile(mappedUser);
        setPosts(postList.filter((post) => post.user_id === mappedUser.id));
        setError(null);
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
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
    router.refresh();
  };

  if (loading) return <div className="p-8 text-center">プロフィールを読み込み中です...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!profile) return <div className="p-8 text-center">プロフィール情報が見つかりません。</div>;

  const fullName = `${profile.last_name ?? ''} ${profile.first_name ?? ''}`.trim() || profile.username;
  const postCount = posts.length;
  const totalLikes = calcTotalLikes(posts);
  const totalPurchases = calcTotalPurchases(posts);

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
            {/* 編集フォーム or 通常表示 */}

            {editing ? (
              <div className="mt-4 space-y-4">
                {/* 画像アップロード欄 */}
                <div className="flex items-center gap-4">
                  <div>
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={editAvatarPreview ?? getImageUrl(profile.avatar_url ?? undefined)} />
                      <AvatarFallback>{form.username[0] || profile.username[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={saving}
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

                {/* ユーザー名・氏名欄 */}
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    className="w-full rounded border p-2 text-sm"
                    type="text"
                    value={form.username}
                    onChange={e => handleChange('username', e.target.value)}
                    placeholder="ユーザー名"
                    maxLength={32}
                    disabled={saving}
                  />
                  <input
                    className="w-full rounded border p-2 text-sm"
                    type="text"
                    value={form.last_name}
                    onChange={e => handleChange('last_name', e.target.value)}
                    placeholder="姓"
                    maxLength={100}
                    disabled={saving}
                  />
                  <input
                    className="w-full rounded border p-2 text-sm"
                    type="text"
                    value={form.first_name}
                    onChange={e => handleChange('first_name', e.target.value)}
                    placeholder="名"
                    maxLength={100}
                    disabled={saving}
                  />
                </div>

                {/* 自己紹介欄 */}
                <textarea
                  className="w-full rounded border p-2 text-sm"
                  rows={4}
                  maxLength={1000}
                  value={form.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="自己紹介文を入力してください (1000文字以内)"
                  disabled={saving}
                />
                {editError && <div className="mt-1 text-xs text-red-500">{editError}</div>}
                <div className="mt-2 flex gap-2">
                  <Button onClick={async () => { const ok = await handleSubmit(); if (ok) setEditing(false); }} disabled={saving} className="flex-1 md:flex-none">{saving ? '保存中...' : '保存'}</Button>
                  <Button onClick={handleCancel} variant="secondary" disabled={saving} className="flex-1 md:flex-none">キャンセル</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-4 text-sm leading-relaxed">{profile.bio ?? '自己紹介文がまだ登録されていません。'}</p>
                <div className="mt-6 flex gap-2">
                  <Button className="flex-1 md:flex-none" onClick={handleEditClick}>プロフィールを編集</Button>
                </div>
              </>
            )}

            <div className="mt-4 grid grid-cols-3 gap-6 text-center md:w-2/3">
              <div>
                <p className="font-semibold text-lg">{postCount}</p>
                <p className="text-xs text-muted-foreground">投稿</p>
              </div>
              <div>
                <p className="font-semibold text-lg">{totalLikes.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">累計いいね</p>
              </div>
              <div>
                <p className="font-semibold text-lg">{totalPurchases.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">推定購入</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="posts" className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            <Grid3x3 className="h-4 w-4" /> <span>投稿</span>
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
                    onClick={() => router.push(`/products/${purchase.product_id}`)}
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
    </div>
  );
}
