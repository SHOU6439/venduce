import { Header } from '@/components/header';
import { CreatePost } from '@/components/create-post';
import AuthGuard from '@/components/auth-guard';

export default function CreatePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <CreatePost />
      </div>
    </AuthGuard>
  );
}
