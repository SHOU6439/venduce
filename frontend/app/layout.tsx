import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { TokenRefreshManager } from '@/components/token-refresh-manager';
import { AuthInitializer } from '@/components/auth-initializer';
import { BadgeNotificationManager } from '@/components/animation/badgeNotification';
import { WebSocketProvider } from '@/components/ws-provider';
import './globals.css';

// Next.js 16.0.10 Turbopack の /_global-error プリレンダリングバグを回避するため
// アプリ全体を動的レンダリングにする。静的生成は行わない。
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'venduce',
  description: 'Made by HEW Group1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${geistSans.className} ${geistMono.className} antialiased`} suppressHydrationWarning>
        <AuthInitializer />
        <TokenRefreshManager />
        <WebSocketProvider>
          <BadgeNotificationManager />
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
