import { Header } from '@/components/header';
import { RankingCarousel } from '@/components/ranking-carousel';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <RankingCarousel />
      </main>
    </div>
  );
}
