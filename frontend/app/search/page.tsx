'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { productsApi } from '@/lib/api/products';
import { postsApi } from '@/lib/api/posts';
import { usersApi } from '@/lib/api/users';
import { Product, Post, PublicUserProfile } from '@/types/api';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { HashtagCaption } from '@/components/hashtag-caption';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'posts' | 'users'>('products');

  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      setPosts([]);
      setUsers([]);
      return;
    }

    const search = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productsData, postsData, usersData] = await Promise.all([
          productsApi.searchProducts(query).catch(() => []),
          postsApi.searchPosts(query).catch(() => []),
          usersApi.searchUsers(query).catch(() => []),
        ]);

        setProducts(productsData);
        setPosts(postsData);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [query]);

  const handleProductClick = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  const handlePostClick = (postId: string) => {
    router.push(`/posts/${postId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-2">検索結果</h1>
          {query && <p className="text-muted-foreground">"{query}" の検索結果</p>}
        </div>

        <div className="container mx-auto px-4 border-t">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'products' | 'posts' | 'users')}>
            <TabsList className="border-0 bg-transparent">
              <TabsTrigger value="products" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                商品
                {products.length > 0 && <span className="ml-2 text-xs">({products.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="posts" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                投稿
                {posts.length > 0 && <span className="ml-2 text-xs">({posts.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="users" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                ユーザー
                {users.length > 0 && <span className="ml-2 text-xs">({users.length})</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'products' && (
              <div>
                {products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {query ? '商品が見つかりません' : '検索してください'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="rounded-lg border p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <div className="aspect-square rounded-lg bg-muted mb-3 flex items-center justify-center overflow-hidden">
                          {product.assets && product.assets.length > 0 && (
                            <img
                              src={getImageUrl(product.assets[0].public_url || '')}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                          {product.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          ¥{(product.price_cents / 100).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'posts' && (
              <div>
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {query ? '投稿が見つかりません' : '検索してください'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handlePostClick(post.id)}
                        className="rounded-lg border p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <div className="aspect-square rounded-lg bg-muted mb-3 flex items-center justify-center overflow-hidden">
                          {post.assets && post.assets.length > 0 ? (
                            <img
                              src={getImageUrl(post.assets[0].public_url || '')}
                              alt="投稿画像"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">画像なし</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={getImageUrl(post.user?.avatar_url ?? undefined)} />
                            <AvatarFallback className="text-[10px]">{post.user?.username?.[0] ?? 'U'}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-muted-foreground truncate">
                            {post.user?.username ?? 'ユーザー'}
                          </p>
                        </div>
                        <p className="text-sm line-clamp-2">
                          <HashtagCaption caption={post.caption} />
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                {users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {query ? 'ユーザーが見つかりません' : '検索してください'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => router.push(`/users/${user.username}`)}
                        className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getImageUrl(user.avatar_asset?.public_url ?? undefined)} />
                          <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{user.username}</p>
                          {user.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{user.bio}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
