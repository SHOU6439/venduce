import { Header } from "@/components/header"
import { ProfileContent } from "@/components/profile-content"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ProfileContent />
    </div>
  )
}
