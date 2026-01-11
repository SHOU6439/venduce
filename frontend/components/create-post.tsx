'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Search, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { uploadsApi } from '@/lib/api/uploads';
import { postsApi } from '@/lib/api/posts';
import { productsApi } from '@/lib/api/products';
import { formatCurrencyFromMinorUnit, getImageUrl } from '@/lib/utils';
import { Product, Asset } from '@/types/api';

export function CreatePost() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [uploadedAsset, setUploadedAsset] = useState<Asset | null>(null);
  const [caption, setCaption] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const asset = await uploadsApi.uploadImage(file, 'post_image');
        setUploadedAsset(asset);
        setStep(2);
      } catch (error) {
        console.error('Upload failed:', error);
        alert('画像のアップロードに失敗しました');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await productsApi.searchProducts(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const toggleProduct = (product: Product) => {
    if (selectedProducts.find((p) => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleSubmit = async () => {
    if (!uploadedAsset) return;

    try {
      setIsSubmitting(true);
      await postsApi.createPost({
        caption,
        asset_ids: [uploadedAsset.id],
        product_ids: selectedProducts.map((p) => p.id),
      });
      router.push('/feed');
      router.refresh();
    } catch (error) {
      console.error('Post creation failed:', error);
      alert('投稿の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-card p-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold">{step === 1 ? '写真を選択' : '投稿を作成'}</h1>
          {step === 2 && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              シェアする
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {/* Step 1: Upload Image */}
        {step === 1 && (
          <Card>
            <CardContent className="flex min-h-[400px] flex-col items-center justify-center p-8">
              {isUploading ? (
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              ) : (
                <>
                  <Upload className="mb-4 h-16 w-16 text-muted-foreground" />
                  <h2 className="mb-2 text-xl font-semibold">写真をアップロード</h2>
                  <p className="mb-6 text-center text-sm text-muted-foreground">購入した商品の写真を選択してください</p>
                  <label htmlFor="image-upload">
                    <Button asChild>
                      <span className="cursor-pointer">写真を選択</span>
                    </Button>
                  </label>
                  <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Tag Products & Caption */}
        {step === 2 && uploadedAsset && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="h-[400px] w-full bg-muted">
                <img src={getImageUrl(uploadedAsset.public_url || uploadedAsset.id)} alt="アップロード画像" className="h-full w-full object-cover" />
              </div>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Textarea placeholder="購入した商品について説明してください..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className="mb-4" />

                <h2 className="mb-4 font-semibold">商品をタグ付け</h2>

                {/* Selected Products Badges */}
                {selectedProducts.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedProducts.map((product) => (
                      <Badge key={product.id} variant="secondary" className="gap-1">
                        {product.title}
                        <button onClick={() => toggleProduct(product)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Search Box */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="商品を検索..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1" onClick={handleSearch}>
                    検索
                  </Button>
                </div>

                {/* Search Results */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-lg border p-2" onClick={() => toggleProduct(product)}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                          <img src={getImageUrl(product.images?.[0])} alt={product.title} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{product.title}</p>
                          <p className="text-xs text-muted-foreground">{product.brand?.name ?? 'ブランド未登録'}</p>
                          <p className="text-xs text-primary">{formatCurrencyFromMinorUnit(product.price_cents, product.currency ?? 'JPY')}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" disabled={selectedProducts.some((p) => p.id === product.id)}>
                        <ShoppingBag className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {searchQuery && searchResults.length === 0 && <p className="text-sm text-center text-gray-500 py-2">商品が見つかりません</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
