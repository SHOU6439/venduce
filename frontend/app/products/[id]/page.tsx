// 商品詳細ページ

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetail({ params }: ProductDetailPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">商品詳細</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 画像 */}
          <div className="bg-white rounded-lg shadow p-8">
            <div className="w-full h-96 bg-gray-300 rounded-lg" />
          </div>

          {/* 商品情報 */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">商品名</h1>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-blue-600">¥5,000</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded">ブランド名</span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">説明</h2>
              <p className="text-gray-700">商品の詳細説明がここに表示されます</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">カテゴリ</h2>
              <p className="text-gray-700">ファッション</p>
            </div>

            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">購入する</button>

            <button className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition">投稿に追加</button>
          </div>
        </div>
      </main>
    </div>
  );
}
