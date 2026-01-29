'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { productsApi } from '@/lib/api/products';
import { postsApi } from '@/lib/api/posts';
import { Product, Post } from '@/types/api';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'posts'>('products');

  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      setPosts([]);
      return;
    }

    const search = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productsData, postsData] = await Promise.all([
          productsApi.searchProducts(query).catch(() => []),
          postsApi.searchPosts(query).catch(() => []),
        ]);

        setProducts(productsData);
        setPosts(postsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-2">検索結果</h1>
          {query && <p className="text-muted-foreground">"{query}" の検索結果</p>}
        </div>

        <div className="container mx-auto px-4 border-t">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'products' | 'posts')}>
            <TabsList className="border-0 bg-transparent">
              <TabsTrigger value="products" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                商品
                {products.length > 0 && <span className="ml-2 text-xs">({products.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="posts" className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                投稿
                {posts.length > 0 && <span className="ml-2 text-xs">({posts.length})</span>}
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
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="rounded-lg border p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-bold text-xs">
                            {post.user?.username?.[0]?.toUpperCase() ?? 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {post.user?.username ?? 'ユーザー'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm mb-3 line-clamp-3">
                          {post.caption}
                        </p>
                        {post.assets && post.assets.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {post.assets.slice(0, 4).map((asset) => (
                              <div key={asset.id} className="aspect-square rounded overflow-hidden bg-muted">
                                <img
                                  src={getImageUrl(asset.public_url || '')}
                                  alt="投稿画像"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
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
