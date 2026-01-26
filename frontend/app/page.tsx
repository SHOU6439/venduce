import { Header } from '@/components/header';
import { UserRanking } from '@/components/user-ranking';
import { TrendingProducts } from '@/components/trending-products';
import { LikedProducts } from '@/components/liked-products';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">ユーザーランキング</h2>
            <UserRanking />
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">売れている商品</h2>
            <TrendingProducts />
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">いいねが多い商品</h2>
            <LikedProducts />
          </section>
        </div>
      </main>
    </div>
  );
}
