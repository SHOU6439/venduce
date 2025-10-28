// 商品一覧ページ

import Link from 'next/link';

export default function Products() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションヘッダー */}
      <header className="sticky top-0 bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">商品</h1>
            <input type="search" placeholder="商品を検索..." className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* 商品カード（ここで繰り返し） */}
          <Link href="/products/1">
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden cursor-pointer">
              {/* 商品画像 */}
              <div className="w-full h-48 bg-gray-300" />

              {/* 商品情報 */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-2">商品名</h3>
                <p className="text-sm text-gray-600 mb-3">商品説明</p>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold text-blue-600">¥5,000</span>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">ブランド名</span>
                </div>

                {/* カテゴリ */}
                <p className="text-xs text-gray-500 mb-4">カテゴリ: ファッション</p>

                {/* アクションボタン */}
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold">詳細を見る</button>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
