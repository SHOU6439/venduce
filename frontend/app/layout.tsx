import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { TokenRefreshManager } from '@/components/token-refresh-manager';
import { AuthInitializer } from '@/components/auth-initializer';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
