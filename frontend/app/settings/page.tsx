'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentMethodsManager } from '@/components/payment-methods-manager';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 p-4 border-b">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition"
            aria-label="戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">設定</h1>
        </div>

        {/* タブ */}
        <Tabs defaultValue="payment-methods" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="payment-methods"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              支払い方法
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment-methods" className="mt-0">
            <div className="p-4">
              <PaymentMethodsManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
