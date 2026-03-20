'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentMethodsManager } from '@/components/payment-methods-manager';
import { ProfileSettings } from '@/components/profile-settings';
import { AccountSettings } from '@/components/account-settings';
import { PrivacySettings } from '@/components/privacy-settings';
import { BackButton } from '@/components/back-button';
import AuthGuard from '@/components/auth-guard';

export default function SettingsPage() {
  return (
    <AuthGuard>
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 p-4 border-b">
          <BackButton />
          <h1 className="text-2xl font-bold">設定</h1>
        </div>

        {/* タブ */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 overflow-x-auto">
            <TabsTrigger
              value="profile"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              プロフィール
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              プライバシー
            </TabsTrigger>
            <TabsTrigger
              value="payment-methods"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              支払い方法
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              アカウント
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            <div className="p-4">
              <ProfileSettings />
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0">
            <div className="p-4">
              <PrivacySettings />
            </div>
          </TabsContent>

          <TabsContent value="payment-methods" className="mt-0">
            <div className="p-4">
              <PaymentMethodsManager />
            </div>
          </TabsContent>

          <TabsContent value="account" className="mt-0">
            <div className="p-4">
              <AccountSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </AuthGuard>
  );
}
