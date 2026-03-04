'use client';

import type React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, ApiError } from '@/lib/api/client';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await apiClient.post('/auth/forgot-password', { email });
            setSuccess(true);
        } catch (err) {
            if (err instanceof ApiError) {
                const data = err.data as Record<string, unknown> | null;
                const detail = data?.detail;
                if (typeof detail === 'string') {
                    setError(detail);
                } else if (typeof detail === 'object' && detail !== null) {
                    setError((detail as Record<string, unknown>).message as string || 'エラーが発生しました。');
                } else {
                    setError('エラーが発生しました。しばらくしてから再度お試しください。');
                }
            } else {
                setError('ネットワークエラーが発生しました。');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
                <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-xl border border-white/20">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold">メールを送信しました</CardTitle>
                        <CardDescription className="mt-2">
                            パスワードリセット用のリンクをメールで送信しました。
                            メールに記載されたリンクから新しいパスワードを設定してください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-muted-foreground mb-6">
                            メールが届かない場合は、迷惑メールフォルダをご確認ください。
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            ログインページに戻る
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
            <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-xl border border-white/20">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">パスワードをお忘れですか？</CardTitle>
                    <CardDescription className="mt-2">
                        登録済みのメールアドレスを入力してください。
                        パスワードリセット用のリンクをお送りします。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '送信中...' : 'リセットリンクを送信'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm text-muted-foreground hover:underline"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            ログインページに戻る
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
