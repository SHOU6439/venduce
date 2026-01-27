'use client';

import { Header } from '@/components/header';
import { ProfileContent } from '@/components/profile-content';
import AuthGuard from '@/components/auth-guard';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <ProfileContent />
      </div>
    </AuthGuard>
  );
}
