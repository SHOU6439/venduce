import { Header } from "@/components/header"
import { CreatePost } from "@/components/create-post"

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CreatePost />
    </div>
  )
}
