import { Header } from "@/components/header"
import { FeedContent } from "@/components/feed-content"

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FeedContent />
    </div>
  )
}
