'use client';

import { useState, useEffect } from 'react';
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

  const [uploadedAssets, setUploadedAssets] = useState<Asset[]>([]);
  const [caption, setCaption] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (step !== 2) return;

    const timer = setTimeout(async () => {
      try {
        if (searchQuery.trim()) {
          const results = await productsApi.searchProducts(searchQuery);
          setSearchResults(results);
        } else {
          const results = await productsApi.listProducts({ per_page: 10 });
          setSearchResults(results.sort(() => Math.random() - 0.5));
        }
      } catch (error) {
        console.error('Product fetch failed:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, step]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        setIsUploading(true);
        const uploadPromises = Array.from(files).map((file) => uploadsApi.uploadImage(file, 'post_image'));
        const newAssets = await Promise.all(uploadPromises);

        setUploadedAssets((prev) => [...prev, ...newAssets]);
        setStep(2);
      } catch (error) {
        console.error('Upload failed:', error);
        alert('画像のアップロードに失敗しました');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveAsset = (indexToRemove: number) => {
    setUploadedAssets((prev) => {
      const newAssets = prev.filter((_, index) => index !== indexToRemove);
      if (newAssets.length === 0) {
        setStep(1);
      }
      return newAssets;
    });
  };

  const toggleProduct = (product: Product) => {
    if (selectedProducts.find((p) => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleSubmit = async () => {
    if (uploadedAssets.length === 0) return;

    try {
      setIsSubmitting(true);

      const tags = caption.match(/#[^\s#]+/g)?.map((tag) => tag.slice(1)) || [];

      await postsApi.createPost({
        caption,
        asset_ids: uploadedAssets.map((asset) => asset.id),
        product_ids: selectedProducts.map((p) => p.id),
        tags: tags,
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
                      <span className="cursor-pointer">写真を選択（複数可）</span>
                    </Button>
                  </label>
                  <input id="image-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Tag Products & Caption */}
        {step === 2 && uploadedAssets.length > 0 && (
          <div className="space-y-4">
            {/* 複数画像のプレビュー表示 */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {uploadedAssets.map((asset, index) => (
                <div key={asset.id} className="relative h-[300px] w-auto flex-shrink-0">
                  <Card className="h-full overflow-hidden">
                    <img src={getImageUrl(asset.public_url || asset.id)} alt={`アップロード画像 ${index + 1}`} className="h-full w-auto object-cover min-w-[200px]" />
                    <button onClick={() => handleRemoveAsset(index)} className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </Card>
                </div>
              ))}
              {/* 追加アップロードボタン */}
              <label htmlFor="add-more-images" className="flex h-[300px] w-[100px] flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="text-center text-sm text-muted-foreground">
                  <span className="text-2xl">+</span>
                  <br />
                  追加
                </div>
                <input id="add-more-images" type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            <Card>
              <CardContent className="p-4">
                <Textarea placeholder="購入した商品について説明してください..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className="mb-4" />

                <h2 className="mb-4 font-semibold">商品をタグ付け</h2>

                {/* 選択済み商品のバッジ表示 */}
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

                {/* 商品検索ボックス */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="商品を検索..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                {/* 検索結果リスト */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div key={product.id} className="cursor-pointer flex items-center justify-between rounded-lg border p-2 hover:bg-accent" onClick={() => toggleProduct(product)}>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-sm">{product.title}</p>
                          <p className="text-xs text-muted-foreground">{product.brand?.name ?? 'ブランド未登録'}</p>
                          <p className="text-xs text-primary">{formatCurrencyFromMinorUnit(product.price_cents, product.currency ?? 'JPY')}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" disabled={selectedProducts.some((p) => p.id === product.id)} className="shrink-0">
                        <ShoppingBag className={`h-4 w-4 ${selectedProducts.some((p) => p.id === product.id) ? 'text-primary fill-primary' : ''}`} />
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
