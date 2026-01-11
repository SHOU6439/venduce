'use client';

import type React from 'react';

import { useState } from 'react';
import { ArrowLeft, Upload, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MOCK_PRODUCTS: any[] = [];

export function CreatePost() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<typeof MOCK_PRODUCTS>([]);

  const filteredProducts = MOCK_PRODUCTS.filter((product) => product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.brand.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setStep(2);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleProduct = (product: (typeof MOCK_PRODUCTS)[0]) => {
    setSelectedProducts((prev) => (prev.find((p) => p.id === product.id) ? prev.filter((p) => p.id !== product.id) : [...prev, product]));
  };

  const handlePublish = () => {
    // Mock publish action
    router.push('/feed');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center gap-4 px-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/feed">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="flex-1 font-semibold text-lg">新規投稿</h1>
          {step === 3 && (
            <Button onClick={handlePublish} size="sm">
              投稿する
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {/* Step 1: Upload Image */}
        {step === 1 && (
          <Card>
            <CardContent className="flex min-h-[400px] flex-col items-center justify-center p-8">
              <Upload className="mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">写真をアップロード</h2>
              <p className="mb-6 text-center text-sm text-muted-foreground">購入した商品の写真を選択してください</p>
              <label htmlFor="image-upload">
                <Button asChild>
                  <span className="cursor-pointer">写真を選択</span>
                </Button>
              </label>
              <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Tag Products */}
        {step === 2 && (
          <div className="space-y-4">
            {image && (
              <Card className="overflow-hidden">
                <img src={image || '/placeholder.svg'} alt="アップロード画像" className="aspect-square w-full object-cover" />
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <h2 className="mb-4 font-semibold">商品をタグ付け</h2>

                {/* Selected Products */}
                {selectedProducts.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedProducts.map((product) => (
                      <Badge key={product.id} variant="secondary" className="gap-1">
                        {product.brand} - {product.name}
                        <button onClick={() => toggleProduct(product)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Search Products */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="商品やブランドを検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>

                {/* Product List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button key={product.id} onClick={() => toggleProduct(product)} className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedProducts.find((p) => p.id === product.id) ? 'border-primary bg-accent' : 'border-border'}`}>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.brand}</p>
                      </div>
                      <p className="font-semibold text-sm">¥{product.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>

                <Button className="mt-4 w-full" onClick={() => setStep(3)} disabled={selectedProducts.length === 0}>
                  次へ
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Add Caption */}
        {step === 3 && (
          <div className="space-y-4">
            {image && (
              <Card className="overflow-hidden">
                <img src={image || '/placeholder.svg'} alt="アップロード画像" className="aspect-square w-full object-cover" />
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <h2 className="mb-4 font-semibold">キャプションを追加</h2>

                <Textarea placeholder="購入した商品について説明してください..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} className="mb-4" />

                {selectedProducts.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm font-medium">タグ付けされた商品</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProducts.map((product) => (
                        <Badge key={product.id} variant="secondary">
                          {product.brand} - {product.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
