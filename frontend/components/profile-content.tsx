'use client';

import { useState, useEffect } from 'react';
import { Grid3x3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usersApi } from '@/lib/api/users';
import { postsApi } from '@/lib/api/posts';
import { Post, UserProfile } from '@/types/api';
import { getImageUrl } from '@/lib/utils';

export function ProfileContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [user, postList] = await Promise.all([usersApi.getProfile(), postsApi.getPosts()]);
        setProfile(user);
        setPosts(postList.filter((post) => post.user_id === user.id));
        setError(null);
      } catch (err) {
        console.error('Failed to load profile', err);
        setError(err instanceof Error ? err.message : 'プロフィール情報を取得できませんでした');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="p-8 text-center">プロフィールを読み込み中です...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!profile) return <div className="p-8 text-center">プロフィール情報が見つかりません。</div>;

  const fullName = `${profile.last_name ?? ''} ${profile.first_name ?? ''}`.trim() || profile.username;
  const postCount = posts.length;
  const totalLikes = posts.reduce((sum, post) => sum + post.like_count, 0);
  const totalPurchases = posts.reduce((sum, post) => sum + post.purchase_count, 0);

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

            <div className="mt-6 flex gap-2">
              <Button className="flex-1 md:flex-none">プロフィールを編集</Button>
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
                  <img src={getImageUrl(post.assets?.[0]?.public_url ?? post.images?.[0]?.public_url ?? undefined)} className="h-full w-full object-cover" alt="ユーザー投稿" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
