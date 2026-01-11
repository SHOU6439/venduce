interface PostDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PostDetail({ params }: PostDetailPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">投稿詳細</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 投稿 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-300 rounded-full" />
            <div>
              <p className="font-semibold">ユーザー名</p>
              <p className="text-sm text-gray-500">2024年1月1日</p>
            </div>
          </div>

          <p className="text-gray-800 mb-4">投稿内容がここに表示されます</p>
          <div className="mb-4 bg-gray-200 rounded-lg h-96" />

          <div className="flex gap-6 text-gray-600 mb-6">
            <button className="hover:text-red-600">❤️ 123 いいね</button>
            <button className="hover:text-blue-600">💬 45 コメント</button>
            <button className="hover:text-blue-600">🔗 シェア</button>
          </div>

          {/* 関連商品 */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">関連商品</h3>
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-300 rounded cursor-pointer hover:opacity-80" />
            </div>
          </div>
        </div>

        {/* コメント */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">コメント</h2>

          {/* コメント入力 */}
          <div className="mb-6">
            <textarea placeholder="コメントを入力..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
            <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">投稿</button>
          </div>

          {/* コメント一覧 */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0" />
              <div>
                <p className="font-semibold">コメントユーザー</p>
                <p className="text-sm text-gray-500">1時間前</p>
                <p className="text-gray-700 mt-1">コメント内容</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
