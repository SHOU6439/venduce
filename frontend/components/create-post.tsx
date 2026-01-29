'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Search, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { uploadsApi } from '@/lib/api/uploads';
import { postsApi } from '@/lib/api/posts';
import { productsApi } from '@/lib/api/products';
import { formatCurrencyFromMinorUnit, getImageUrl } from '@/lib/utils';
import { Product, Asset, AssetProductPair } from '@/types/api';

export function CreatePost() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [uploadedAssets, setUploadedAssets] = useState<Asset[]>([]);
  const [caption, setCaption] = useState('');
  
  const [assetProductMap, setAssetProductMap] = useState<Record<string, string | null>>({});
  
  const [selectedProductDetails, setSelectedProductDetails] = useState<Record<string, Product | null>>({});
  
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);

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
        console.error("Product fetch failed:", error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, step]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        setIsUploading(true);
        const uploadPromises = Array.from(files).map((file) =>
          uploadsApi.uploadImage(file, "post_image"),
        );
        const newAssets = await Promise.all(uploadPromises);

        setUploadedAssets((prev) => [...prev, ...newAssets]);
        
        newAssets.forEach((asset) => {
          setAssetProductMap((prev) => ({
            ...prev,
            [asset.id]: null,
          }));
        });
        
        if (selectedAssetId === null && newAssets.length > 0) {
          setSelectedAssetId(newAssets[0].id);
        }
        
        setStep(2);
      } catch (error) {
        console.error("Upload failed:", error);
        alert("画像のアップロードに失敗しました");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveAsset = (indexToRemove: number) => {
    setUploadedAssets((prev) => {
      const removedAsset = prev[indexToRemove];
      const newAssets = prev.filter((_, index) => index !== indexToRemove);
      
      setAssetProductMap((map) => {
        const newMap = { ...map };
        delete newMap[removedAsset.id];
        return newMap;
      });

      setSelectedProductDetails((details) => {
        const newDetails = { ...details };
        delete newDetails[removedAsset.id];
        return newDetails;
      });
      
      if (selectedAssetId === removedAsset.id) {
        setSelectedAssetId(newAssets.length > 0 ? newAssets[0].id : null);
      }
      
      if (newAssets.length === 0) {
        setStep(1);
      }
      return newAssets;
    });
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setSearchQuery('');
  };

  const handleSelectProduct = (product: Product) => {
    if (!selectedAssetId) return;
    
    setAssetProductMap((prev) => ({
      ...prev,
      [selectedAssetId]: product.id,
    }));
    setSelectedProductDetails((prev) => ({
      ...prev,
      [selectedAssetId]: product,
    }));
  };

  const handleRemoveProduct = (assetId: string) => {
    setAssetProductMap((prev) => ({
      ...prev,
      [assetId]: null,
    }));
    setSelectedProductDetails((prev) => ({
      ...prev,
      [assetId]: null,
    }));
    // If the removed product belonged to the currently selected asset, clear selection
    if (selectedAssetId === assetId) {
      setSelectedAssetId(null);
    }
  };

  const getSelectedProduct = (assetId: string) => {
    const productId = assetProductMap[assetId];
    if (!productId) return null;
    return searchResults.find((p) => p.id === productId);
  };

  const handleSubmit = async () => {
    if (uploadedAssets.length === 0) return;

    try {
      setIsSubmitting(true);

      const tags = caption.match(/#[^\s#]+/g)?.map((tag) => tag.slice(1)) || [];
      
      const assetProductPairs: AssetProductPair[] = uploadedAssets.map((asset) => ({
        asset_id: asset.id,
        product_id: assetProductMap[asset.id] || null,
      }));

      await postsApi.createPost({
        caption,
        asset_product_pairs: assetProductPairs,
        tags: tags,
      });
      router.push("/feed");
      router.refresh();
    } catch (error) {
      console.error("Post creation failed:", error);
      alert("投稿の作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-card p-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold">
            {step === 1 ? "写真を選択" : "投稿を作成"}
          </h1>
          {step === 2 && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
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
                  <h2 className="mb-2 text-xl font-semibold">
                    写真をアップロード
                  </h2>
                  <p className="mb-6 text-center text-sm text-muted-foreground">
                    購入した商品の写真を選択してください
                  </p>
                  <label htmlFor="image-upload">
                    <Button asChild>
                      <span className="cursor-pointer">
                        写真を選択（複数可）
                      </span>
                    </Button>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Tag Products & Caption */}
        {step === 2 && uploadedAssets.length > 0 && (
          <div className="space-y-4">
            {/* キャプション入力 */}
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-2 font-semibold">投稿のキャプション</h2>
                <Textarea placeholder="購入した商品について説明してください..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} className="mb-2" />
                <p className="text-xs text-muted-foreground">#ハッシュタグはそのまま使用できます</p>
              </CardContent>
            </Card>

            {/* 複数画像のプレビュー + 商品紐付け */}
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-4 font-semibold">各画像で紹介する商品を選択</h2>
                
                <div className="space-y-4">
                  {uploadedAssets.map((asset, index) => (
                    <div key={asset.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex gap-4">
                        {/* 画像プレビュー */}
                        <div className="flex-shrink-0 relative">
                          <button
                            onClick={() => handleSelectAsset(asset.id)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                              selectedAssetId === asset.id ? 'border-primary' : 'border-border'
                            }`}
                          >
                            <img
                              src={getImageUrl(asset.public_url || asset.id)}
                              alt={`アップロード画像 ${index + 1}`}
                              className="h-20 w-20 object-cover"
                            />
                          </button>
                          <button
                            onClick={() => handleRemoveAsset(index)}
                            className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white hover:bg-destructive/90 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>

                        {/* 紐付け情報 */}
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">画像 {index + 1}</p>
                          
                          {assetProductMap[asset.id] ? (
                            <div className="flex items-center justify-between bg-primary/10 rounded p-2">
                              <span className="text-sm">{selectedProductDetails[asset.id]?.title || assetProductMap[asset.id]}</span>
                              <button
                                onClick={() => handleRemoveProduct(asset.id)}
                                className="text-xs text-destructive hover:underline"
                              >
                                削除
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSelectAsset(asset.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {selectedAssetId === asset.id ? '下から商品を選択してください →' : 'クリックして商品を選択'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 追加アップロードボタン */}
                <label htmlFor="add-more-images" className="flex mt-4 p-3 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:bg-accent dark:hover:bg-gray-800">
                  <div className="text-center text-sm text-muted-foreground">
                    <span className="text-lg">+</span> 画像を追加
                  </div>
                  <input id="add-more-images" type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              </CardContent>
            </Card>

            {/* 商品検索 & 選択 */}
            {selectedAssetId && !assetProductMap[selectedAssetId] && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="mb-4 font-semibold">商品を選択</h2>

                  {/* 商品検索ボックス */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="商品を検索..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* 検索結果リスト */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left flex items-center justify-between rounded-lg border p-2 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-sm">{product.title}</p>
                            <p className="text-xs text-muted-foreground">{product.brand?.name ?? 'ブランド未登録'}</p>
                            <p className="text-xs text-primary">{formatCurrencyFromMinorUnit(product.price_cents, product.currency ?? 'JPY')}</p>
                          </div>
                        </div>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                    {searchQuery && searchResults.length === 0 && (
                      <p className="text-sm text-center text-gray-500 py-2">商品が見つかりません</p>
                    )}
                    {!searchQuery && searchResults.length === 0 && (
                      <p className="text-sm text-center text-gray-500 py-2">商品を検索してください</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
