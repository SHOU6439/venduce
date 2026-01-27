import { Header } from "@/components/header"
import PostsFeed from "@/components/posts-feed"

export default function Posts() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8 text-primary">投稿</h1>
        <PostsFeed />
      </main>
    </div>
  );
}

