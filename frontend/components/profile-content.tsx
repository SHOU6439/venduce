'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Grid3x3, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usersApi } from '@/lib/api/users';
import { postsApi } from '@/lib/api/posts';
import { ApiError } from '@/lib/api/client';
import { Post, UserProfile } from '@/types/api';
import { getImageUrl } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

export function ProfileContent() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // 編集UI用 state
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [user, postList] = await Promise.all([usersApi.getProfile(), postsApi.getPosts()]);
        const mappedUser = {
          ...user,
          avatar_url: (user as any).avatar_asset?.public_url ?? user.avatar_url ?? null,
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
  const totalLikes = posts.reduce((sum, post) => sum + post.like_count, 0);
  const totalPurchases = posts.reduce((sum, post) => sum + post.purchase_count, 0);

  // 編集開始時に現在の値をセット
  const handleEditClick = () => {
    setEditBio(profile.bio ?? '');
    setEditUsername(profile.username ?? '');
    setEditFirstName(profile.first_name ?? '');
    setEditLastName(profile.last_name ?? '');
    setEditAvatarFile(null);
    setEditAvatarPreview(profile.avatar_url ? getImageUrl(profile.avatar_url) : null);
    setEditError(null);
    setEditing(true);
  };

  // 編集キャンセル
  const handleCancel = () => {
    setEditing(false);
    setEditError(null);
  };

  // 保存（API呼び出し実装）
  const handleSave = async () => {
    // バリデーション例: 空文字禁止、最大長
    // ユーザー名: 英数字・6-32文字
    if (!editUsername.trim()) {
      setEditError('ユーザー名は必須です');
      return;
    }
    if (!/^[a-zA-Z0-9_]{6,32}$/.test(editUsername)) {
      setEditError('ユーザー名は英数字・6～32文字で入力してください');
      return;
    }
    // 氏名: 1-100文字
    if (!editLastName.trim() || editLastName.length > 100) {
      setEditError('姓は1～100文字で入力してください');
      return;
    }
    if (!editFirstName.trim() || editFirstName.length > 100) {
      setEditError('名は1～100文字で入力してください');
      return;
    }
    // 画像: 1MB以下・画像種別
    if (editAvatarFile) {
      if (!editAvatarFile.type.startsWith('image/')) {
        setEditError('画像ファイルのみアップロード可能です');
        return;
      }
      if (editAvatarFile.size > 1024 * 1024) {
        setEditError('画像サイズは1MB以内にしてください');
        return;
      }
    }
    // 自己紹介: 1-1000文字
    if (!editBio.trim()) {
      setEditError('自己紹介文は必須です');
      return;
    }
    if (editBio.length > 1000) {
      setEditError('自己紹介文は1000文字以内で入力してください');
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      let avatar_asset_id: string | undefined = undefined;
      if (editAvatarFile) {
        // 画像アップロードAPI呼び出し
        const { uploadsApi } = await import('@/lib/api/uploads');
        const asset = await uploadsApi.uploadImage(editAvatarFile, 'avatar');
        avatar_asset_id = asset.id;
      }
      // PATCH /api/users/me
      const updated = await usersApi.updateProfile({
        username: editUsername,
        first_name: editFirstName,
        last_name: editLastName,
        bio: editBio,
        ...(avatar_asset_id ? { avatar_asset_id } : {}),
      });
      // avatar_asset.public_url → avatar_url へマッピング
      const mappedUser = {
        ...updated,
        avatar_url: (updated as any).avatar_asset?.public_url ?? updated.avatar_url ?? null,
      };
      setProfile(mappedUser);
      // 投稿一覧も再取得して反映
        let allPosts = await postsApi.getPosts();
        // postsApi.getPosts()が配列でなければ.itemsを参照
        if (!Array.isArray(allPosts) && allPosts && typeof allPosts === 'object' && 'items' in allPosts && Array.isArray((allPosts as any).items)) {
          allPosts = (allPosts as { items: Post[] }).items;
        }
        setPosts((allPosts as Post[]).filter((post) => post.user_id === mappedUser.id));
      setEditing(false);
    } catch (err) {
      // APIエラー内容を日本語で分かりやすく
      let msg = 'プロフィール更新に失敗しました';
      if (err instanceof Error) {
        if (err.message.includes('already exists') || err.message.includes('unique')) {
          msg = 'そのユーザー名は既に使われています';
        } else if (err.message.includes('min_length') || err.message.includes('max_length')) {
          msg = '入力値が制限を超えています';
        } else {
          msg = err.message;
        }
      }
      setEditError(msg);
    } finally {
      setSaving(false);
    }
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
                      <AvatarFallback>{editUsername[0] || profile.username[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={saving}
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        setEditAvatarFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => setEditAvatarPreview(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        } else {
                          setEditAvatarPreview(profile.avatar_url ? getImageUrl(profile.avatar_url) : null);
                        }
                      }}
                    />
                    <div className="text-xs text-muted-foreground mt-1">画像は1MB以内・正方形推奨</div>
                  </div>
                </div>

                {/* ユーザー名・氏名欄 */}
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    className="w-full rounded border p-2 text-sm"
                    type="text"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    placeholder="ユーザー名"
                    maxLength={32}
                    disabled={saving}
                  />
                  <input
                    className="w-full rounded border p-2 text-sm"
                    type="text"
                    value={editLastName}
                    onChange={e => setEditLastName(e.target.value)}
                    placeholder="姓"
                    maxLength={100}
                    disabled={saving}
                  />
                  <input
                    className="w-full rounded border p-2 text-sm"
                    type="text"
                    value={editFirstName}
                    onChange={e => setEditFirstName(e.target.value)}
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
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="自己紹介文を入力してください (1000文字以内)"
                  disabled={saving}
                />
                {editError && <div className="mt-1 text-xs text-red-500">{editError}</div>}
                <div className="mt-2 flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1 md:flex-none">{saving ? '保存中...' : '保存'}</Button>
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
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          {posts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">まだ投稿がありません。</div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <div key={post.id} className="relative aspect-square bg-muted">
                  <img src={getImageUrl(post.assets?.[0]?.public_url ?? post.images?.[0]?.public_url ?? post.assets?.[0]?.id)} className="h-full w-full object-cover" alt="ユーザー投稿" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
