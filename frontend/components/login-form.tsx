'use client';

import type React from 'react';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/lib/api/client';
import { AlertCircle } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const formatApiErrorMessage = (payload: Record<string, unknown> | null | undefined, fallback?: string): string | null => {
    if (!payload) {
      return fallback ?? null;
    }

    if (payload.detail) {
      const detail = payload.detail as unknown;
      if (typeof detail === 'string') {
        return detail;
      }
      if (Array.isArray(detail)) {
        return detail
          .map((item) => (item && (item as Record<string, unknown>).msg) || JSON.stringify(item))
          .join(', ');
      }
      if (typeof detail === 'object' && detail !== null) {
        const detailObj = detail as Record<string, unknown>;
        if (detailObj.message) {
          return String(detailObj.message);
        }
        if (detailObj.code) {
          return String(detailObj.code);
        }
      }
    }

    if (payload.message) {
      return String(payload.message);
    }

    return fallback ?? null;
  };
  const getApiErrorPayload = (err: unknown): { status: number; payload?: Record<string, unknown>; fallback?: string } | null => {
    if (err instanceof ApiError) {
      return { status: err.status, payload: err.data as Record<string, unknown> | undefined, fallback: err.message };
    }

    if (typeof err === 'object' && err !== null) {
      const candidate = err as Record<string, unknown>;
      if (typeof candidate.status === 'number') {
        return { status: candidate.status, payload: candidate.data as Record<string, unknown> | undefined, fallback: candidate.message as string | undefined };
      }
    }

    return null;
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      router.push('/feed');
    } catch (err) {
      console.error('Login error caught:', err);

      const apiError = getApiErrorPayload(err);
      if (apiError) {
        const { status, payload, fallback } = apiError;
        const apiMessage = formatApiErrorMessage(payload ?? null, fallback);
        if (status === 401 || status === 400) {
          setError(apiMessage || 'メールアドレスまたはパスワードが間違っています');
        } else if (status === 403) {
          setError(apiMessage || 'アカウントが確認されていません。メールアドレスを確認してください。');
        } else {
          setError(apiMessage || 'ログインに失敗しました');
        }
      } else if (err instanceof Error) {
        console.error('General Error:', err.message);
        setError(err.message);
      } else {
        console.error('Unknown error:', err);
        setError('予期しないエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Venduce</CardTitle>
          <CardDescription>購入した商品を自慢する場所</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
              パスワードをお忘れですか？
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちでない方は{' '}
              <Link href="/signup" className="font-semibold text-foreground hover:underline">
                新規登録
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
