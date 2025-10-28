// 投稿一覧ページ

import Link from 'next/link';

export default function Posts() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションヘッダー */}
      <header className="sticky top-0 bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">投稿</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="grid gap-4">
          {/* 投稿カード */}
          <Link href="/posts/1">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                {/* ユーザー情報 */}
                <div className="w-12 h-12 bg-gray-300 rounded-full" />
                <div>
                  <p className="font-semibold">ユーザー名</p>
                  <p className="text-sm text-gray-500">2時間前</p>
                </div>
              </div>

              {/* 投稿コンテンツ */}
              <p className="text-gray-800 mb-4">投稿内容がここに表示されます</p>

              {/* 投稿画像 */}
              <div className="mb-4 bg-gray-200 rounded-lg h-64" />

              {/* アクション */}
              <div className="flex gap-6 text-gray-600">
                <button className="hover:text-red-600">❤️ いいね</button>
                <button className="hover:text-blue-600">💬 コメント</button>
                <button className="hover:text-blue-600">🔗 シェア</button>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
