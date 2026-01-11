'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ShoppingBag } from 'lucide-react';

import { postsApi } from '@/lib/api/posts';
import { Post } from '@/types/api';
import { getImageUrl } from '@/lib/utils';

interface RankedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  totalLikes: number;
  totalPurchases: number;
  rank: number;
}

export function UserRanking() {
  const [users, setUsers] = useState<RankedUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const posts = await postsApi.getPosts();
        const map = new Map<string, RankedUser>();

        posts.forEach((post: Post) => {
          if (!post.user) return;

          const key = post.user.id;
          const entry = map.get(key);
          if (entry) {
            entry.totalLikes += post.like_count;
            entry.totalPurchases += post.purchase_count;
          } else {
            map.set(key, {
              id: key,
              username: post.user.username,
              displayName: `${post.user.last_name ?? ''} ${post.user.first_name ?? ''}`.trim() || post.user.username,
              avatarUrl: post.user.avatar_url,
              totalLikes: post.like_count,
              totalPurchases: post.purchase_count,
              rank: 0,
            });
          }
        });

        const ranked = Array.from(map.values())
          .sort((a, b) => {
            if (b.totalLikes === a.totalLikes) {
              return b.totalPurchases - a.totalPurchases;
            }
            return b.totalLikes - a.totalLikes;
          })
          .map((user, index) => ({ ...user, rank: index + 1 }))
          .slice(0, 5);

        setUsers(ranked);
        setError(null);
      } catch (err) {
        console.error('Failed to load ranking', err);
        setError(err instanceof Error ? err.message : 'ランキングを取得できませんでした');
      }
    };

    load();
  }, []);

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (users.length === 0) {
    return <div className="text-sm text-muted-foreground">ランキングを表示できません。</div>;
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <Card key={user.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={getImageUrl(user.avatarUrl ?? undefined)} alt={user.displayName} />
                <AvatarFallback>{user.displayName?.[0] ?? user.username[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{user.rank}</div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold truncate">{user.displayName}</h3>
                {user.rank <= 3 && (
                  <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">
                    <TrendingUp className="h-3 w-3" />
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">@{user.username}</p>

              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3 text-primary" />
                  <span className="font-semibold text-primary">{user.totalPurchases.toLocaleString()}</span>
                  <span className="text-muted-foreground">購入</span>
                </div>
                <div>
                  <span className="font-semibold text-primary">{user.totalLikes.toLocaleString()} いいね</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
